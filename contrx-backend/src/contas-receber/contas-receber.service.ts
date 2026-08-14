import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import {
  exceedsFinancialSettlementLimit,
  getFinancialSettlementAmount,
  getFinancialStatusAfterSettlement,
} from '../common/financial-settlement';
import { toUpperText, uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';
import {
  CriarContaReceberDto,
  ReceberPagamentoLoteDto,
  ReceberPagamentoDto,
} from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';

type CriarContaReceberDataWithCompany = CriarContaReceberDto & {
  companyId: string;
};

type AtualizarContaReceberDataWithCompany = AtualizarContaReceberDto & {
  companyId: string;
};

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

  async findContractSummary(companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId e obrigatorio.');
    }

    return this.prisma.contaReceber.findMany({
      where: {
        companyId,
        contractId: { not: null },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        companyId: true,
        contractId: true,
        tenantId: true,
        propertyName: true,
        tenantName: true,
        issueDate: true,
        dueDate: true,
        amount: true,
        status: true,
        manual: true,
        installmentNumber: true,
        installmentTotal: true,
        installmentGroupId: true,
        isDownPayment: true,
      },
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

    return this.prisma.$transaction(async (tx) => {
      await this.deleteOwnerPayoutForReceivable(tx, id, companyId);

      await tx.pagamentoRecebido.deleteMany({
        where: { chargeId: id },
      });

      return tx.contaReceber.delete({
        where: { id },
      });
    });
  }

  async receivePayment(
    id: string,
    data: ReceberPagamentoDto,
    companyId: string,
  ) {
    this.validatePaymentInput(
      data,
      'O valor recebido deve ser maior que zero.',
    );

    const account = await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const currentPaymentSummary = await tx.pagamentoRecebido.aggregate({
        where: { chargeId: id },
        _sum: { amountPaid: true, discount: true, interest: true },
      });
      const currentSettlementAmount = getFinancialSettlementAmount(
        currentPaymentSummary._sum.amountPaid,
        currentPaymentSummary._sum.discount,
        currentPaymentSummary._sum.interest,
      );

      if (currentSettlementAmount >= Number(account.amount)) {
        throw new BadRequestException('Esta conta a receber ja esta quitada.');
      }

      const nextSettlementAmount =
        currentSettlementAmount +
        getFinancialSettlementAmount(
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
            data.paymentItems === undefined || data.paymentItems === null
              ? Prisma.JsonNull
              : (data.paymentItems as any),
          interest: new Prisma.Decimal(data.interest || 0),
          discount: new Prisma.Decimal(data.discount || 0),
          amountPaid: new Prisma.Decimal(data.amountPaid),
          note: data.note ? toUpperText(data.note) : null,
        },
      });

      await this.syncOwnerPayoutFromReceivable(tx, id, companyId);

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
    this.validatePaymentInput(
      data,
      'O valor recebido deve ser maior que zero.',
    );
    const account = await this.ensureExists(id, companyId);
    const nextSettlementAmount = getFinancialSettlementAmount(
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
            data.paymentItems === undefined || data.paymentItems === null
              ? Prisma.JsonNull
              : (data.paymentItems as any),
          interest: new Prisma.Decimal(data.interest || 0),
          discount: new Prisma.Decimal(data.discount || 0),
          amountPaid: new Prisma.Decimal(data.amountPaid),
          note: data.note ? toUpperText(data.note) : null,
        },
      });

      await this.syncOwnerPayoutFromReceivable(tx, id, companyId);

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

    return this.prisma.$transaction(
      async (tx) => {
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
          const currentSettlementAmount = getFinancialSettlementAmount(
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
            getFinancialSettlementAmount(
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
                payment.paymentItems === undefined ||
                payment.paymentItems === null
                  ? Prisma.JsonNull
                  : (payment.paymentItems as any),
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

          await this.syncOwnerPayoutFromReceivable(
            tx,
            payment.chargeId,
            companyId,
          );

          updatedAccounts.push(updatedAccount);
        }

        return updatedAccounts;
      },
      { maxWait: 10000, timeout: 20000 },
    );
  }

  async reversePayment(id: string, companyId: string) {
    await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await this.deleteOwnerPayoutForReceivable(tx, id, companyId);

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
    data: CriarContaReceberDataWithCompany,
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
    data: AtualizarContaReceberDataWithCompany,
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
    TData extends
      | CriarContaReceberDataWithCompany
      | AtualizarContaReceberDataWithCompany,
  >(data: TData) {
    return uppercaseFields(data, ['property', 'tenant']);
  }

  private parseDate(value: string, errorMessage: string) {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(errorMessage);
    }

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
    return getFinancialStatusAfterSettlement(accountAmount, amountPaid);
  }

  private validatePaymentInput(
    data: ReceberPagamentoDto,
    amountMessage: string,
  ) {
    if (
      !data.amountPaid ||
      Number.isNaN(Number(data.amountPaid)) ||
      Number(data.amountPaid) <= 0
    ) {
      throw new BadRequestException(amountMessage);
    }

    if ((data.interest || 0) < 0 || (data.discount || 0) < 0) {
      throw new BadRequestException(
        'Juros e desconto nao podem ser negativos.',
      );
    }
  }

  private validateSettlementLimit(
    accountAmount: number,
    settlementAmount: number,
    message: string,
  ) {
    if (exceedsFinancialSettlementLimit(accountAmount, settlementAmount)) {
      throw new BadRequestException(message);
    }
  }

  private async syncOwnerPayoutFromReceivable(
    tx: Prisma.TransactionClient,
    chargeId: string,
    companyId: string,
  ) {
    const account = await this.findReceivableWithProperty(
      tx,
      chargeId,
      companyId,
    );

    if (!account) {
      throw new NotFoundException('Conta a receber nao encontrada.');
    }

    const property = account.contract?.property;
    const ownerPayoutGroupId = this.getOwnerPayoutGroupId(account.id);
    const existingPayout = await tx.contaPagar.findFirst({
      where: {
        companyId,
        installmentGroupId: ownerPayoutGroupId,
      },
      include: {
        payments: true,
      },
    });

    const isManagedProperty =
      property?.managementMode === 'MANAGED' &&
      property.autoCreateOwnerPayable &&
      !!property.ownerId &&
      !!property.owner;

    if (!isManagedProperty) {
      if (existingPayout) {
        this.assertPayoutCanBeUpdated(
          existingPayout.status,
          existingPayout.payments.length,
        );
        await tx.contaPagar.delete({
          where: { id: existingPayout.id },
        });
      }

      return null;
    }

    const ownerId = property.ownerId;
    const owner = property.owner;

    if (!ownerId || !owner) {
      return null;
    }

    const totalReceived = account.payments.reduce(
      (sum, payment) => sum + Number(payment.amountPaid || 0),
      0,
    );

    if (totalReceived <= 0) {
      if (existingPayout) {
        this.assertPayoutCanBeUpdated(
          existingPayout.status,
          existingPayout.payments.length,
        );
        await tx.contaPagar.delete({
          where: { id: existingPayout.id },
        });
      }

      return null;
    }

    const feePercent = Number(property.administrationFeePercentage || 0);
    const feeAmount = this.roundMoney((totalReceived * feePercent) / 100);
    const ownerAmount = this.roundMoney(totalReceived - feeAmount);

    if (ownerAmount <= 0) {
      if (existingPayout) {
        this.assertPayoutCanBeUpdated(
          existingPayout.status,
          existingPayout.payments.length,
        );
        await tx.contaPagar.delete({
          where: { id: existingPayout.id },
        });
      }

      return null;
    }

    const referenceDate = account.payments[0]?.paidAt || new Date();
    const dueDate = this.buildOwnerPayoutDueDate(
      referenceDate,
      property.ownerPayoutDay,
    );
    const issueDate = referenceDate;
    const ownerName = owner.name || '';
    const propertyName = property.title || account.propertyName || '';
    const tenantName = account.tenantName || '';
    const note =
      `REPASSE AUTOMATICO DA LOCACAO DE ${toUpperText(propertyName)}. ` +
      `INQUILINO: ${toUpperText(tenantName || 'NAO INFORMADO')}. ` +
      `RECEBIDO: ${this.formatMoney(totalReceived)}. ` +
      `TAXA: ${this.formatMoney(feeAmount)}. ` +
      `REPASSE: ${this.formatMoney(ownerAmount)}.`;

    if (existingPayout) {
      this.assertPayoutCanBeUpdated(
        existingPayout.status,
        existingPayout.payments.length,
      );

      return tx.contaPagar.update({
        where: { id: existingPayout.id },
        data: {
          personId: ownerId,
          propertyId: property.id,
          personName: ownerName,
          description: `REPASSE ALUGUEL - ${toUpperText(propertyName)}`,
          category: 'REPASSE PROPRIETARIO',
          note,
          amount: new Prisma.Decimal(ownerAmount),
          issueDate,
          dueDate,
          status: FinancialAccountStatus.PENDING,
          manual: false,
          installmentGroupId: ownerPayoutGroupId,
        },
      });
    }

    return tx.contaPagar.create({
      data: {
        company: { connect: { id: companyId } },
        person: { connect: { id: ownerId } },
        property: { connect: { id: property.id } },
        personName: ownerName,
        description: `REPASSE ALUGUEL - ${toUpperText(propertyName)}`,
        category: 'REPASSE PROPRIETARIO',
        note,
        amount: new Prisma.Decimal(ownerAmount),
        issueDate,
        dueDate,
        status: FinancialAccountStatus.PENDING,
        manual: false,
        installmentGroupId: ownerPayoutGroupId,
      },
    });
  }

  private async deleteOwnerPayoutForReceivable(
    tx: Prisma.TransactionClient,
    chargeId: string,
    companyId: string,
  ) {
    const ownerPayoutGroupId = this.getOwnerPayoutGroupId(chargeId);
    const payout = await tx.contaPagar.findFirst({
      where: {
        companyId,
        installmentGroupId: ownerPayoutGroupId,
      },
      include: {
        payments: true,
      },
    });

    if (!payout) {
      return;
    }

    this.assertPayoutCanBeUpdated(payout.status, payout.payments.length);

    await tx.contaPagar.delete({
      where: { id: payout.id },
    });
  }

  private async findReceivableWithProperty(
    tx: Prisma.TransactionClient,
    chargeId: string,
    companyId: string,
  ) {
    return tx.contaReceber.findFirst({
      where: { id: chargeId, companyId },
      include: {
        payments: {
          orderBy: { paidAt: 'desc' as const },
        },
        contract: {
          include: {
            property: {
              include: {
                owner: true,
              },
            },
            tenant: true,
          },
        },
      },
    });
  }

  private assertPayoutCanBeUpdated(
    status: FinancialAccountStatus,
    paymentCount: number,
  ) {
    if (status === FinancialAccountStatus.PAID || paymentCount > 0) {
      throw new BadRequestException(
        'O repasse do proprietario ja possui pagamentos e nao pode ser alterado automaticamente.',
      );
    }
  }

  private getOwnerPayoutGroupId(chargeId: string) {
    return `owner-payout:${chargeId}`;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.roundMoney(value));
  }

  private buildOwnerPayoutDueDate(
    referenceDate: Date,
    payoutDay?: number | null,
  ) {
    const dueDate = new Date(referenceDate);
    const comparisonDate = new Date(referenceDate);
    const desiredDay =
      payoutDay && payoutDay >= 1 && payoutDay <= 31
        ? payoutDay
        : dueDate.getDate();

    comparisonDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    dueDate.setDate(1);
    dueDate.setMonth(referenceDate.getMonth());
    dueDate.setFullYear(referenceDate.getFullYear());
    dueDate.setDate(
      Math.min(
        desiredDay,
        new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate(),
      ),
    );

    if (dueDate < comparisonDate) {
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(1);
      dueDate.setDate(
        Math.min(
          desiredDay,
          new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate(),
        ),
      );
    }

    return dueDate;
  }

  async shareReceivableReport(dto: any, companyId: string) {
    await this.prisma.sharedBankStatement
      .deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })
      .catch(() => {});

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.sharedBankStatement.create({
      data: {
        companyId,
        documentType: 'RELATORIO_CONTAS_RECEBER',
        tenantId: dto.tenantId || null,
        filterStartDate: dto.startDate || null,
        filterEndDate: dto.endDate || null,
        filterStatus: dto.status || null,
        filterDue: dto.dueFilter || null,
        expiresAt,
      },
    });
  }

  async findSharedReceivableReport(id: string) {
    await this.prisma.sharedBankStatement
      .deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })
      .catch(() => {});

    const shared = await this.prisma.sharedBankStatement.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!shared) {
      throw new NotFoundException(
        'Relatório compartilhado não encontrado ou expirado.',
      );
    }

    if (new Date() > shared.expiresAt) {
      await this.prisma.sharedBankStatement
        .delete({ where: { id } })
        .catch(() => {});

      throw new BadRequestException(
        'Este link de relatório compartilhado já expirou (limite de 7 dias).',
      );
    }

    const accounts = await this.findAll(shared.companyId);

    return {
      company: {
        id: shared.company.id,
        tradeName: shared.company.tradeName,
        companyName: shared.company.companyName,
        document: shared.company.document,
        phone: shared.company.phone,
        email: shared.company.email,
      },
      filterStartDate: shared.filterStartDate,
      filterEndDate: shared.filterEndDate,
      filterStatus: shared.filterStatus,
      filterDue: shared.filterDue,
      tenantId: shared.tenantId,
      expiresAt: shared.expiresAt,
      accounts,
    };
  }
}
