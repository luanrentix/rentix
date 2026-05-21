import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type FinancialStatus = 'Pending' | 'Paid' | 'Overdue';

type FinancialReceivable = {
  id: string;
  tenantName: string;
  propertyName: string;
  dueDate: string;
  amount: number;
  status: FinancialStatus;
  paymentDate: string | null;
  paidAmount: number;
  discountAmount: number;
  interestAmount: number;
  remainingAmount: number;
};

type FinancialPayable = {
  id: string;
  personName: string;
  description: string;
  category: string;
  dueDate: string;
  amount: number;
  status: FinancialStatus;
  paymentDate: string | null;
  paidAmount: number;
  discountAmount: number;
  interestAmount: number;
  remainingAmount: number;
};

type FinancialPayment = {
  paidAt: Date;
  amountPaid: unknown;
  discount?: unknown;
  interest?: unknown;
};

type FinancialSummaryFilters = {
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo(companyId: string, filters: FinancialSummaryFilters = {}) {
    await this.validateCompany(companyId);

    const dateRange = this.getDateRange(filters);

    const [receivables, payables] = await Promise.all([
      this.prisma.contaReceber.findMany({
        where: this.buildReceivableWhere(companyId, dateRange),
        orderBy: { dueDate: 'asc' },
        include: { payments: { orderBy: { paidAt: 'desc' } } },
      }),
      this.prisma.contaPagar.findMany({
        where: this.buildPayableWhere(companyId, dateRange),
        orderBy: { dueDate: 'asc' },
        include: { payments: { orderBy: { paidAt: 'desc' } } },
      }),
    ]);

    return {
      receivables: receivables.map<FinancialReceivable>((account) => {
        const amount = Number(account.amount);
        const paymentSummary = this.getPaymentSummary(
          account.payments,
          amount,
          account.status,
          dateRange,
        );

        return {
          id: account.id,
          tenantName: account.tenantName || 'Pessoa nao informada',
          propertyName: account.propertyName || 'Sem imovel vinculado',
          dueDate: this.toDateOnly(account.dueDate),
          amount,
          status: this.getStatus(
            account.status,
            account.dueDate,
            paymentSummary.settlementAmount,
            amount,
          ),
          paymentDate: paymentSummary.paymentDate,
          paidAmount: paymentSummary.paidAmount,
          discountAmount: paymentSummary.discountAmount,
          interestAmount: paymentSummary.interestAmount,
          remainingAmount: paymentSummary.remainingAmount,
        };
      }),
      payables: payables.map<FinancialPayable>((account) => {
        const amount = Number(account.amount);
        const paymentSummary = this.getPaymentSummary(
          account.payments,
          amount,
          account.status,
          dateRange,
        );

        return {
          id: account.id,
          personName: account.personName || 'Pessoa nao informada',
          description: account.description || 'Conta a pagar',
          category: account.category || 'Outros',
          dueDate: this.toDateOnly(account.dueDate),
          amount,
          status: this.getStatus(
            account.status,
            account.dueDate,
            paymentSummary.settlementAmount,
            amount,
          ),
          paymentDate: paymentSummary.paymentDate,
          paidAmount: paymentSummary.paidAmount,
          discountAmount: paymentSummary.discountAmount,
          interestAmount: paymentSummary.interestAmount,
          remainingAmount: paymentSummary.remainingAmount,
        };
      }),
    };
  }

  private getDateRange(filters: FinancialSummaryFilters) {
    return {
      startDate: this.parseOptionalDate(
        filters.startDate,
        'Data inicial invalida.',
      ),
      endDate: this.parseOptionalDate(
        filters.endDate,
        'Data final invalida.',
        'end',
      ),
    };
  }

  private buildReceivableWhere(
    companyId: string,
    dateRange: { startDate: Date | null; endDate: Date | null },
  ): Prisma.ContaReceberWhereInput {
    const periodFilter = this.buildPeriodFilter(dateRange, 'payments');

    return periodFilter
      ? {
          companyId,
          OR: periodFilter,
        }
      : { companyId };
  }

  private buildPayableWhere(
    companyId: string,
    dateRange: { startDate: Date | null; endDate: Date | null },
  ): Prisma.ContaPagarWhereInput {
    const periodFilter = this.buildPeriodFilter(dateRange, 'payments');

    return periodFilter
      ? {
          companyId,
          OR: periodFilter,
        }
      : { companyId };
  }

  private buildPeriodFilter(
    dateRange: { startDate: Date | null; endDate: Date | null },
    paymentRelation: 'payments',
  ) {
    const range = this.buildPrismaDateRange(dateRange);

    if (!range) return null;

    return [
      { dueDate: range },
      {
        [paymentRelation]: {
          some: {
            paidAt: range,
          },
        },
      },
    ];
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

  private getStatus(
    status: FinancialAccountStatus,
    dueDate: Date,
    paidAmount: number,
    accountAmount: number,
  ): FinancialStatus {
    if (paidAmount >= accountAmount) return 'Paid';
    if (status === FinancialAccountStatus.PAID && paidAmount === 0)
      return 'Paid';

    return this.toDateOnly(dueDate) < this.getTodayDate()
      ? 'Overdue'
      : 'Pending';
  }

  private getPaymentSummary(
    payments: FinancialPayment[],
    accountAmount: number,
    accountStatus: FinancialAccountStatus,
    dateRange?: { startDate: Date | null; endDate: Date | null },
  ) {
    if (payments.length === 0) {
      const paidAmount =
        accountStatus === FinancialAccountStatus.PAID ? accountAmount : 0;

      return {
        paymentDate: null,
        paidAmount,
        discountAmount: 0,
        interestAmount: 0,
        settlementAmount: paidAmount,
        remainingAmount: Math.max(accountAmount - paidAmount, 0),
      };
    }

    const paidAmount = payments.reduce((total, payment) => {
      const amount = Number(payment.amountPaid || 0);

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const settlementAmount = payments.reduce((total, payment) => {
      const amountPaid = Number(payment.amountPaid || 0);
      const discount = Number(payment.discount || 0);
      const interest = Number(payment.interest || 0);
      const amount = amountPaid + discount - interest;

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const paymentsInRange = dateRange
      ? payments.filter((payment) => this.isDateInRange(payment.paidAt, dateRange))
      : payments;
    const paidAmountInRange = paymentsInRange.reduce((total, payment) => {
      const amount = Number(payment.amountPaid || 0);

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const discountAmountInRange = paymentsInRange.reduce((total, payment) => {
      const amount = Number(payment.discount || 0);

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const interestAmountInRange = paymentsInRange.reduce((total, payment) => {
      const amount = Number(payment.interest || 0);

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    return {
      paymentDate: paymentsInRange[0]
        ? this.toDateOnly(paymentsInRange[0].paidAt)
        : this.toDateOnly(payments[0].paidAt),
      paidAmount: dateRange ? paidAmountInRange : paidAmount,
      discountAmount: dateRange
        ? discountAmountInRange
        : payments.reduce((total, payment) => {
            const amount = Number(payment.discount || 0);

            return total + (Number.isFinite(amount) ? amount : 0);
          }, 0),
      interestAmount: dateRange
        ? interestAmountInRange
        : payments.reduce((total, payment) => {
            const amount = Number(payment.interest || 0);

            return total + (Number.isFinite(amount) ? amount : 0);
          }, 0),
      settlementAmount,
      remainingAmount: Math.max(accountAmount - settlementAmount, 0),
    };
  }

  private parseOptionalDate(
    value: string | undefined,
    errorMessage: string,
    boundary: 'start' | 'end' = 'start',
  ) {
    if (!value) return null;

    const parsedDate = value.includes('T')
      ? new Date(value)
      : new Date(`${value}T${boundary === 'end' ? '23:59:59.999' : '00:00:00'}`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return parsedDate;
  }

  private buildPrismaDateRange(dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  }) {
    if (!dateRange.startDate && !dateRange.endDate) return null;

    return {
      gte: dateRange.startDate ?? undefined,
      lte: dateRange.endDate ?? undefined,
    };
  }

  private toDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  private isDateInRange(
    value: Date,
    dateRange: { startDate: Date | null; endDate: Date | null },
  ) {
    if (dateRange.startDate && value < dateRange.startDate) return false;
    if (dateRange.endDate && value > dateRange.endDate) return false;

    return true;
  }
}
