import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialAccountStatus } from '@prisma/client';
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
};

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo(companyId: string) {
    await this.validateCompany(companyId);

    const [receivables, payables] = await Promise.all([
      this.prisma.contaReceber.findMany({
        where: { companyId },
        orderBy: { dueDate: 'asc' },
        include: { payments: true },
      }),
      this.prisma.contaPagar.findMany({
        where: { companyId },
        orderBy: { dueDate: 'asc' },
        include: { payments: true },
      }),
    ]);

    return {
      receivables: receivables.map<FinancialReceivable>((account) => {
        const payment = account.payments[0];

        return {
          id: account.id,
          tenantName: account.tenantName || 'Pessoa nao informada',
          propertyName: account.propertyName || 'Sem imovel vinculado',
          dueDate: this.toDateOnly(account.dueDate),
          amount: Number(account.amount),
          status: this.getStatus(account.status, account.dueDate),
          paymentDate: payment ? this.toDateOnly(payment.paidAt) : null,
          paidAmount: payment ? Number(payment.amountPaid) : Number(account.amount),
        };
      }),
      payables: payables.map<FinancialPayable>((account) => {
        const payment = account.payments[0];

        return {
          id: account.id,
          personName: account.personName || 'Pessoa nao informada',
          description: account.description || 'Conta a pagar',
          category: account.category || 'Outros',
          dueDate: this.toDateOnly(account.dueDate),
          amount: Number(account.amount),
          status: this.getStatus(account.status, account.dueDate),
          paymentDate: payment ? this.toDateOnly(payment.paidAt) : null,
          paidAmount: payment ? Number(payment.amountPaid) : Number(account.amount),
        };
      }),
    };
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
  ): FinancialStatus {
    if (status === FinancialAccountStatus.PAID) return 'Paid';

    return this.toDateOnly(dueDate) < this.getTodayDate() ? 'Overdue' : 'Pending';
  }

  private toDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }
}
