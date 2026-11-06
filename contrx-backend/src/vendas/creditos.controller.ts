import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { customerCreditBalance } from './credit-ledger';

class CreditAdjustmentDto {
  @IsUUID() requestId!: string;
  @IsUUID() customerId!: string;
  @IsIn(['ADD', 'DEDUCT']) direction!: 'ADD' | 'DEDUCT';
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  amount!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
class RefundSettlementDto {
  @IsUUID() requestId!: string;
  @IsIn(['REFUND', 'CREDIT']) disposition!: 'REFUND' | 'CREDIT';
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  amount!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

@Injectable()
export class SalesCreditsService {
  constructor(private readonly prisma: PrismaService) {}
  private async access(user: UsuarioAutenticado, write = false) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { companyId: user.companyId },
    });
    if (
      (settings?.companySettings as Prisma.JsonObject | null)?.ramoAtividade !==
      'CONFECCOES'
    )
      throw new ForbiddenException('Recurso exclusivo de Confecções.');
    if (
      write &&
      !['OWNER', 'ADMIN', 'SYSTEM_OWNER', 'DONO_SISTEMA'].includes(user.role)
    )
      throw new ForbiddenException(
        'Somente proprietário ou administrador pode conceder, ajustar créditos e confirmar devoluções.',
      );
  }
  async list(user: UsuarioAutenticado) {
    await this.access(user);
    return this.prisma.$transaction(
      async (tx) => {
        const where = { companyId: user.companyId };
        const [customers, entries, adjustments] = await Promise.all([
          tx.salesCustomer.findMany({
            where: { ...where, isSystem: false },
            select: { id: true, name: true, active: true },
            orderBy: { name: 'asc' },
          }),
          tx.salesCustomerCredit.findMany({
            where,
            orderBy: { createdAt: 'desc' },
          }),
          tx.salesCreditAdjustment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { actor: { select: { name: true } } },
          }),
        ]);
        const groups = new Map(
          customers.map((customer) => [
            customer.id,
            {
              ...customer,
              balance: new Prisma.Decimal(0),
              entries: [] as typeof entries,
              adjustments: [] as typeof adjustments,
            },
          ]),
        );
        for (const entry of entries) {
          const group = groups.get(entry.customerId);
          if (group) {
            group.entries.push(entry);
            if (!entry.reversedAt)
              group.balance = group.balance.add(entry.amount);
          }
        }
        for (const entry of adjustments) {
          const group = groups.get(entry.customerId);
          if (group) {
            group.adjustments.push(entry);
            group.balance = group.balance.add(entry.amount);
          }
        }
        return [...groups.values()];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 30000,
      },
    );
  }
  async adjust(user: UsuarioAutenticado, data: CreditAdjustmentDto) {
    await this.access(user, true);
    if (data.reason.trim().length < 3)
      throw new BadRequestException(
        'Informe uma justificativa de pelo menos 3 caracteres.',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id = ${user.companyId} FOR UPDATE`;
      const amount = new Prisma.Decimal(data.amount).mul(
        data.direction === 'ADD' ? 1 : -1,
      );
      const existing = await tx.salesCreditAdjustment.findUnique({
        where: {
          companyId_requestId: {
            companyId: user.companyId,
            requestId: data.requestId,
          },
        },
      });
      if (existing) {
        if (
          existing.customerId !== data.customerId ||
          !existing.amount.eq(amount) ||
          existing.reason !== data.reason.trim()
        )
          throw new BadRequestException(
            'Chave já utilizada para outra operação.',
          );
        return existing;
      }
      const customer = await tx.salesCustomer.findFirst({
        where: {
          id: data.customerId,
          companyId: user.companyId,
          active: true,
          isSystem: false,
        },
      });
      if (!customer)
        throw new BadRequestException(
          'Cliente identificado e ativo não encontrado.',
        );
      const newBalance = (
        await customerCreditBalance(tx, user.companyId, customer.id)
      ).add(amount);
      if (newBalance.lt(0))
        throw new BadRequestException(
          'O ajuste não pode gerar saldo negativo.',
        );
      const adjustment = await tx.salesCreditAdjustment.create({
        data: {
          companyId: user.companyId,
          customerId: customer.id,
          amount,
          actorId: user.id,
          reason: data.reason.trim(),
          requestId: data.requestId,
        },
      });
      if (amount.lt(0)) {
        const payables = await tx.contaPagar.findMany({
          where: {
            companyId: user.companyId,
            cancelledAt: null,
            salesReturn: {
              customerId: customer.id,
              returnDisposition: 'CREDIT',
              status: 'CONCLUIDA',
            },
          },
          include: { payments: true },
          orderBy: { createdAt: 'asc' },
        });
        const outstanding = payables.map((payable) => ({
          payable,
          due: Prisma.Decimal.max(
            0,
            payable.amount.sub(
              payable.payments.reduce(
                (sum, payment) => sum.add(payment.amountPaid),
                new Prisma.Decimal(0),
              ),
            ),
          ),
        }));
        let excess = Prisma.Decimal.max(
          0,
          outstanding
            .reduce((sum, item) => sum.add(item.due), new Prisma.Decimal(0))
            .sub(newBalance),
        );
        for (const { payable, due } of outstanding) {
          const used = Prisma.Decimal.min(due, excess);
          if (used.lte(0)) continue;
          await tx.pagamentoRealizado.create({
            data: {
              expenseId: payable.id,
              paidAt: new Date(),
              method: 'OTHER',
              amountPaid: used,
              note: `AJUSTE NÃO MONETÁRIO DE CRÉDITO ${adjustment.id} · ${data.reason.trim()}`,
            },
          });
          await tx.contaPagar.update({
            where: { id: payable.id },
            data: { status: used.eq(due) ? 'PAID' : 'PENDING' },
          });
          excess = excess.sub(used);
        }
      }
      return adjustment;
    });
  }
  async refunds(user: UsuarioAutenticado) {
    await this.access(user);
    return this.prisma.salesRefund.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { number: true, customerName: true, paymentMethod: true },
        },
        transaction: {
          select: { type: true, bankAccount: { select: { name: true } } },
        },
        settlements: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { name: true } } },
        },
      },
    });
  }
  async settle(
    user: UsuarioAutenticado,
    id: string,
    data: RefundSettlementDto,
  ) {
    await this.access(user, true);
    if (data.reason.trim().length < 3)
      throw new BadRequestException(
        'Informe uma justificativa de pelo menos 3 caracteres.',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id = ${user.companyId} FOR UPDATE`;
      const existing = await tx.salesRefundSettlement.findUnique({
        where: {
          companyId_requestId: {
            companyId: user.companyId,
            requestId: data.requestId,
          },
        },
      });
      if (existing) {
        if (
          existing.refundId !== id ||
          !existing.amount.eq(data.amount) ||
          existing.disposition !== data.disposition ||
          existing.reason !== data.reason.trim()
        )
          throw new BadRequestException(
            'Chave já utilizada para outra operação.',
          );
        return existing;
      }
      const refund = await tx.salesRefund.findFirst({
        where: { id, companyId: user.companyId },
      });
      if (!refund || refund.amount.sub(refund.settledAmount).lt(data.amount))
        throw new BadRequestException('Valor superior ao reembolso pendente.');
      const original = await tx.bankTransaction.findFirst({
        where: {
          id: refund.transactionId,
          bankAccount: { companyId: user.companyId },
        },
      });
      const order = await tx.salesOrder.findFirst({
        where: { id: refund.orderId, companyId: user.companyId },
      });
      if (!original || !order)
        throw new BadRequestException('Origem financeira não encontrada.');
      if (data.disposition === 'CREDIT') {
        const customer = await tx.salesCustomer.findFirst({
          where: {
            id: order.customerId ?? '',
            companyId: user.companyId,
            isSystem: false,
          },
        });
        if (!customer || original.type !== 'INFLOW')
          throw new BadRequestException(
            'Crédito exige cliente identificado e recebimento original.',
          );
        await tx.salesCreditAdjustment.create({
          data: {
            companyId: user.companyId,
            customerId: customer.id,
            orderId: order.id,
            amount: data.amount,
            reason: data.reason.trim(),
            actorId: user.id,
            requestId: `refund:${data.requestId}`,
          },
        });
      } else {
        await tx.bankTransaction.create({
          data: {
            bankAccountId: original.bankAccountId,
            type: original.type === 'INFLOW' ? 'OUTFLOW' : 'INFLOW',
            status: 'CONFIRMED',
            amount: data.amount,
            description: `DEVOLUÇÃO CONFIRMADA · ${data.reason.trim()}`,
            competenceDate: new Date(),
            paymentDate: new Date(),
            category: 'ESTORNOS DE VENDAS',
            referenceType: 'SALES_REVERSAL',
            referenceId: original.id,
          },
        });
        await tx.bankAccount.update({
          where: { id: original.bankAccountId },
          data: {
            currentBalance:
              original.type === 'INFLOW'
                ? { decrement: data.amount }
                : { increment: data.amount },
          },
        });
      }
      await tx.salesRefund.update({
        where: { id: refund.id },
        data: { settledAmount: { increment: data.amount } },
      });
      return tx.salesRefundSettlement.create({
        data: {
          companyId: user.companyId,
          refundId: refund.id,
          amount: data.amount,
          disposition: data.disposition,
          reason: data.reason.trim(),
          actorId: user.id,
          requestId: data.requestId,
        },
      });
    });
  }
}

@Controller('vendas')
@RequireToolPermission('sales')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class SalesCreditsController {
  constructor(private readonly service: SalesCreditsService) {}
  @RequireToolAction('view')
  @Get('creditos')
  list(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.list(user);
  }
  @RequireToolAction('special')
  @Post('creditos')
  adjust(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() data: CreditAdjustmentDto,
  ) {
    return this.service.adjust(user, data);
  }
  @RequireToolAction('view')
  @Get('reembolsos')
  refunds(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.refunds(user);
  }
  @RequireToolAction('special')
  @Post('reembolsos/:id/confirmar')
  settle(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() data: RefundSettlementDto,
  ) {
    return this.service.settle(user, id, data);
  }
}
