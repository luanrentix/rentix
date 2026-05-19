import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CriarContaReceberDto,
  ReceberPagamentoDto,
} from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';

@Injectable()
export class ContasReceberService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarContaReceberDto, companyId: string) {
    await this.validateCompany(companyId);
    await this.validateRelations(companyId, data.contractId, data.tenantId);

    return this.prisma.contaReceber.create({
      data: this.buildCreateData({
        ...data,
        companyId,
      }),
      include: this.defaultInclude,
    });
  }

  async findAll(companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId e obrigatorio.');
    }

    return this.prisma.contaReceber.findMany({
      where: { companyId },
      orderBy: { dueDate: 'asc' },
      include: this.defaultInclude,
    });
  }

  async findOne(id: string, companyId: string) {
    const account = await this.prisma.contaReceber.findFirst({
      where: { id, companyId },
      include: this.defaultInclude,
    });

    if (!account) {
      throw new NotFoundException('Conta a receber nao encontrada.');
    }

    return account;
  }

  async update(id: string, data: AtualizarContaReceberDto, companyId: string) {
    await this.ensureExists(id, companyId);

    await this.validateCompany(companyId);
    await this.validateRelations(companyId, data.contractId, data.tenantId);

    return this.prisma.contaReceber.update({
      where: { id },
      data: this.buildUpdateData({
        ...data,
        companyId,
      }),
      include: this.defaultInclude,
    });
  }

  async remove(id: string, companyId: string) {
    await this.ensureExists(id, companyId);

    await this.prisma.pagamentoRecebido.deleteMany({
      where: { chargeId: id },
    });

    return this.prisma.contaReceber.delete({
      where: { id },
    });
  }

  async receivePayment(
    id: string,
    data: ReceberPagamentoDto,
    companyId: string,
  ) {
    if (data.amountPaid <= 0) {
      throw new BadRequestException(
        'O valor recebido deve ser maior que zero.',
      );
    }

    const account = await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const currentPaymentSummary = await tx.pagamentoRecebido.aggregate({
        where: { chargeId: id },
        _sum: { amountPaid: true, discount: true, interest: true },
      });
      const currentSettlementAmount = this.getSettlementAmount(
        currentPaymentSummary._sum.amountPaid,
        currentPaymentSummary._sum.discount,
        currentPaymentSummary._sum.interest,
      );

      if (currentSettlementAmount >= Number(account.amount)) {
        throw new BadRequestException('Esta conta a receber ja esta quitada.');
      }

      const nextSettlementAmount =
        currentSettlementAmount +
        this.getSettlementAmount(
          data.amountPaid,
          data.discount || 0,
          data.interest || 0,
        );

      await tx.pagamentoRecebido.create({
        data: {
          charge: { connect: { id } },
          paidAt: this.parseDate(data.paidAt, 'Data de pagamento invalida.'),
          method: data.method,
          paymentItems:
            data.paymentItems === undefined
              ? Prisma.JsonNull
              : data.paymentItems,
          interest: new Prisma.Decimal(data.interest || 0),
          discount: new Prisma.Decimal(data.discount || 0),
          amountPaid: new Prisma.Decimal(data.amountPaid),
          note: data.note || null,
        },
      });

      return tx.contaReceber.update({
        where: { id },
        data: {
          status: this.getStatusAfterPayment(
            Number(account.amount),
            nextSettlementAmount,
          ),
        },
        include: this.defaultInclude,
      });
    });
  }

  async reversePayment(id: string, companyId: string) {
    await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.pagamentoRecebido.deleteMany({
        where: { chargeId: id },
      });

      return tx.contaReceber.update({
        where: { id },
        data: { status: FinancialAccountStatus.PENDING },
        include: this.defaultInclude,
      });
    });
  }

  private get defaultInclude() {
    return {
      payments: { orderBy: { paidAt: 'desc' as const } },
      contract: true,
      tenant: true,
    };
  }

  private async ensureExists(id: string, companyId: string) {
    const account = await this.prisma.contaReceber.findFirst({
      where: { id, companyId },
      select: { id: true, amount: true },
    });

    if (!account) {
      throw new NotFoundException('Conta a receber nao encontrada.');
    }

    return account;
  }

  private async validateCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new BadRequestException('Empresa nao encontrada.');
    }
  }

  private async validateRelations(
    companyId: string,
    contractId?: string | null,
    tenantId?: string | null,
  ) {
    if (contractId) {
      const contract = await this.prisma.contract.findFirst({
        where: {
          id: contractId,
          companyId,
        },
        select: {
          id: true,
        },
      });

      if (!contract) {
        throw new BadRequestException(
          'Contrato nao encontrado para esta empresa.',
        );
      }
    }

    if (tenantId) {
      const tenant = await this.prisma.person.findFirst({
        where: {
          id: tenantId,
          companyId,
        },
        select: {
          id: true,
        },
      });

      if (!tenant) {
        throw new BadRequestException(
          'Pessoa nao encontrada para esta empresa.',
        );
      }
    }
  }

  private buildCreateData(
    data: CriarContaReceberDto,
  ): Prisma.ContaReceberCreateInput {
    return {
      company: { connect: { id: data.companyId } },
      contract: data.contractId
        ? { connect: { id: data.contractId } }
        : undefined,
      tenant: data.tenantId ? { connect: { id: data.tenantId } } : undefined,
      propertyName: data.property,
      tenantName: data.tenant,
      issueDate: this.parseOptionalDate(data.issueDate),
      dueDate: this.parseDate(data.dueDate, 'Data de vencimento invalida.'),
      amount: new Prisma.Decimal(data.amount),
      status: data.status ?? FinancialAccountStatus.PENDING,
      manual: data.manual ?? true,
      installmentNumber: data.installmentNumber ?? null,
      installmentTotal: data.installmentTotal ?? null,
      installmentGroupId: data.installmentGroupId || null,
      isDownPayment: data.isDownPayment ?? false,
    };
  }

  private buildUpdateData(
    data: AtualizarContaReceberDto,
  ): Prisma.ContaReceberUpdateInput {
    return {
      company: data.companyId ? { connect: { id: data.companyId } } : undefined,
      contract:
        data.contractId !== undefined
          ? data.contractId
            ? { connect: { id: data.contractId } }
            : { disconnect: true }
          : undefined,
      tenant:
        data.tenantId !== undefined
          ? data.tenantId
            ? { connect: { id: data.tenantId } }
            : { disconnect: true }
          : undefined,
      propertyName: data.property,
      tenantName: data.tenant,
      issueDate:
        data.issueDate !== undefined
          ? this.parseOptionalDate(data.issueDate)
          : undefined,
      dueDate:
        data.dueDate !== undefined
          ? this.parseDate(data.dueDate, 'Data de vencimento invalida.')
          : undefined,
      amount:
        data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
      status: data.status,
      manual: data.manual,
      installmentNumber: data.installmentNumber,
      installmentTotal: data.installmentTotal,
      installmentGroupId:
        data.installmentGroupId !== undefined
          ? data.installmentGroupId || null
          : undefined,
      isDownPayment: data.isDownPayment,
    };
  }

  private parseDate(value: string, errorMessage: string) {
    const parsedDate = value.includes('T')
      ? new Date(value)
      : new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return parsedDate;
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) return null;

    return this.parseDate(value, 'Data invalida.');
  }

  private getStatusAfterPayment(accountAmount: number, amountPaid: number) {
    return amountPaid >= accountAmount
      ? FinancialAccountStatus.PAID
      : FinancialAccountStatus.PENDING;
  }

  private getSettlementAmount(
    amountPaid: unknown,
    discount: unknown,
    interest: unknown,
  ) {
    return (
      Number(amountPaid || 0) + Number(discount || 0) - Number(interest || 0)
    );
  }
}
