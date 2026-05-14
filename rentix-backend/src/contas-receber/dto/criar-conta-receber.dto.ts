import { FinancialAccountStatus, PaymentMethod, Prisma } from '@prisma/client';

export class CriarContaReceberDto {
  companyId: string;
  contractId?: string | null;
  tenantId?: string | null;

  property: string;
  tenant: string;

  issueDate?: string | null;
  dueDate: string;
  amount: number;
  status?: FinancialAccountStatus;
  manual?: boolean;

  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  isDownPayment?: boolean;
}

export class ReceberPagamentoDto {
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: Prisma.InputJsonValue;
  interest?: number;
  discount?: number;
  amountPaid: number;
  note?: string | null;
}
