import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { toUpperText, uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';
import {
  CriarContaReceberDto,
  ReceberPagamentoLoteDto,
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
    this.validatePaymentInput(data, 'O valor recebido deve ser maior que zero.');

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

      this.validateSettlementLimit(
        Number(account.amount),
        nextSettlementAmount,
        'O valor recebido excede o saldo em aberto da conta.',
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
          note: data.note ? toUpperText(data.note) : null,
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

  async replacePayment(
    id: string,
    data: ReceberPagamentoDto,
    companyId: string,
  ) {
    this.validatePaymentInput(data, 'O valor recebido deve ser maior que zero.');
    const account = await this.ensureExists(id, companyId);
    const nextSettlementAmount = this.getSettlementAmount(
      data.amountPaid,
      data.discount || 0,
      data.interest || 0,
    );

    this.validateSettlementLimit(
      Number(account.amount),
      nextSettlementAmount,
      'O valor recebido excede o saldo da conta.',
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.pagamentoRecebido.deleteMany({
        where: { chargeId: id },
      });

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
          note: data.note ? toUpperText(data.note) : null,
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

  async receiveBatch(data: ReceberPagamentoLoteDto, companyId: string) {
    if (!data.payments?.length) {
      throw new BadRequestException('Informe ao menos uma conta para receber.');
    }

    data.payments.forEach((payment) =>
      this.validatePaymentInput(
        payment,
        'O valor recebido deve ser maior que zero.',
      ),
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedAccounts: Array<
        Prisma.ContaReceberGetPayload<{
          include: { payments: true; contract: true; tenant: true };
        }>
      > = [];

      for (const payment of data.payments) {
        const account = await tx.contaReceber.findFirst({
          where: { id: payment.chargeId, companyId },
          select: { id: true, amount: true },
        });

        if (!account) {
          throw new NotFoundException('Conta a receber nao encontrada.');
        }

        const currentPaymentSummary = await tx.pagamentoRecebido.aggregate({
          where: { chargeId: payment.chargeId },
          _sum: { amountPaid: true, discount: true, interest: true },
        });
        const currentSettlementAmount = this.getSettlementAmount(
          currentPaymentSummary._sum.amountPaid,
          currentPaymentSummary._sum.discount,
          currentPaymentSummary._sum.interest,
        );

        if (currentSettlementAmount >= Number(account.amount)) {
          throw new BadRequestException(
            'Uma das contas selecionadas ja esta quitada.',
          );
        }

        const nextSettlementAmount =
          currentSettlementAmount +
          this.getSettlementAmount(
            payment.amountPaid,
            payment.discount || 0,
            payment.interest || 0,
          );

        this.validateSettlementLimit(
          Number(account.amount),
          nextSettlementAmount,
          'Um dos recebimentos excede o saldo em aberto da conta.',
        );

        await tx.pagamentoRecebido.create({
          data: {
            charge: { connect: { id: payment.chargeId } },
            paidAt: this.parseDate(
              payment.paidAt,
              'Data de pagamento invalida.',
            ),
            method: payment.method,
            paymentItems:
              payment.paymentItems === undefined
                ? Prisma.JsonNull
                : payment.paymentItems,
            interest: new Prisma.Decimal(payment.interest || 0),
            discount: new Prisma.Decimal(payment.discount || 0),
            amountPaid: new Prisma.Decimal(payment.amountPaid),
            note: payment.note ? toUpperText(payment.note) : null,
          },
        });

        const updatedAccount = await tx.contaReceber.update({
          where: { id: payment.chargeId },
          data: {
            status: this.getStatusAfterPayment(
              Number(account.amount),
              nextSettlementAmount,
            ),
          },
          include: this.defaultInclude,
        });

        updatedAccounts.push(updatedAccount);
      }

      return updatedAccounts;
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
    const normalizedData = this.normalizeAccountData(data);

    return {
      company: { connect: { id: normalizedData.companyId } },
      contract: normalizedData.contractId
        ? { connect: { id: normalizedData.contractId } }
        : undefined,
      tenant: normalizedData.tenantId
        ? { connect: { id: normalizedData.tenantId } }
        : undefined,
      propertyName: normalizedData.property,
      tenantName: normalizedData.tenant,
      issueDate: this.parseOptionalDate(normalizedData.issueDate),
      dueDate: this.parseDate(
        normalizedData.dueDate,
        'Data de vencimento invalida.',
      ),
      amount: new Prisma.Decimal(normalizedData.amount),
      status: normalizedData.status ?? FinancialAccountStatus.PENDING,
      manual: normalizedData.manual ?? true,
      installmentNumber: normalizedData.installmentNumber ?? null,
      installmentTotal: normalizedData.installmentTotal ?? null,
      installmentGroupId: normalizedData.installmentGroupId || null,
      isDownPayment: normalizedData.isDownPayment ?? false,
    };
  }

  private buildUpdateData(
    data: AtualizarContaReceberDto,
  ): Prisma.ContaReceberUpdateInput {
    const normalizedData = this.normalizeAccountData(data);

    return {
      company: normalizedData.companyId
        ? { connect: { id: normalizedData.companyId } }
        : undefined,
      contract:
        normalizedData.contractId !== undefined
          ? normalizedData.contractId
            ? { connect: { id: normalizedData.contractId } }
            : { disconnect: true }
          : undefined,
      tenant:
        normalizedData.tenantId !== undefined
          ? normalizedData.tenantId
            ? { connect: { id: normalizedData.tenantId } }
            : { disconnect: true }
          : undefined,
      propertyName: normalizedData.property,
      tenantName: normalizedData.tenant,
      issueDate:
        normalizedData.issueDate !== undefined
          ? this.parseOptionalDate(normalizedData.issueDate)
          : undefined,
      dueDate:
        normalizedData.dueDate !== undefined
          ? this.parseDate(
              normalizedData.dueDate,
              'Data de vencimento invalida.',
            )
          : undefined,
      amount:
        normalizedData.amount !== undefined
          ? new Prisma.Decimal(normalizedData.amount)
          : undefined,
      status: normalizedData.status,
      manual: normalizedData.manual,
      installmentNumber: normalizedData.installmentNumber,
      installmentTotal: normalizedData.installmentTotal,
      installmentGroupId:
        normalizedData.installmentGroupId !== undefined
          ? normalizedData.installmentGroupId || null
          : undefined,
      isDownPayment: normalizedData.isDownPayment,
    };
  }

  private normalizeAccountData<
    TData extends CriarContaReceberDto | AtualizarContaReceberDto,
  >(data: TData) {
    return uppercaseFields(data, ['property', 'tenant']);
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

  private validatePaymentInput(data: ReceberPagamentoDto, amountMessage: string) {
    if (data.amountPaid <= 0) {
      throw new BadRequestException(amountMessage);
    }

    if ((data.interest || 0) < 0 || (data.discount || 0) < 0) {
      throw new BadRequestException('Juros e desconto nao podem ser negativos.');
    }
  }

  private validateSettlementLimit(
    accountAmount: number,
    settlementAmount: number,
    message: string,
  ) {
    if (settlementAmount - accountAmount > 0.01) {
      throw new BadRequestException(message);
    }
  }
}
