import { FinancialAccountStatus, PaymentMethod, Prisma } from '@prisma/client';

export class CriarContaPagarDto {
  companyId: string;
  personId?: string | null;
  personName?: string | null;

  description: string;
  category?: string | null;
  note?: string | null;
  amount: number;
  issueDate?: string | null;
  dueDate: string;
  status?: FinancialAccountStatus;
  manual?: boolean;

  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
}

export class PagarContaDto {
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: Prisma.InputJsonValue;
  interest?: number;
  discount?: number;
  amountPaid: number;
  note?: string | null;
}
