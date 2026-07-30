import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type FinancialAccountStatus = 'PENDING' | 'PAID';

export type PaymentMethod =
  | 'CASH'
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_SLIP'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type PaymentRecord = {
  id: string;
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: unknown;
  interest: number | string;
  discount: number | string;
  amountPaid: number | string;
  note?: string | null;
};

export type ReceivableAccount = {
  id: string;
  companyId: string;
  contractId?: string | null;
  tenantId?: string | null;
  propertyName: string;
  tenantName: string;
  issueDate?: string | null;
  dueDate: string;
  amount: number | string;
  status: FinancialAccountStatus;
  manual: boolean;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  isDownPayment: boolean;
  payments?: PaymentRecord[];
};

export type CreateReceivableAccountDto = {
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
};

export type UpdateReceivableAccountDto = Partial<CreateReceivableAccountDto>;

export type PayableAccount = {
  id: string;
  companyId: string;
  personId?: string | null;
  propertyId?: string | null;
  personName?: string | null;
  description: string;
  category?: string | null;
  note?: string | null;
  amount: number | string;
  issueDate?: string | null;
  dueDate: string;
  status: FinancialAccountStatus;
  manual: boolean;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  payments?: PaymentRecord[];
  property?: {
    id: string;
    title: string;
  } | null;
};

export type CreatePayableAccountDto = {
  personId?: string | null;
  propertyId?: string | null;
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
};

export type UpdatePayableAccountDto = Partial<CreatePayableAccountDto>;

export type RegisterPaymentDto = {
  paidAt?: string;
  method: PaymentMethod;
  paymentItems?: unknown;
  interest?: number;
  discount?: number;
  amountPaid: number;
  note?: string;
};

export async function getReceivableAccounts(companyId: string) {
  void companyId;
  return apiFetch<ReceivableAccount[]>('/contas-receber');
}

export async function getContractReceivableAccounts(companyId: string) {
  void companyId;
  return apiFetch<ReceivableAccount[]>('/contas-receber/contratos/resumo');
}

export async function createReceivableAccount(data: CreateReceivableAccountDto) {
  return apiFetch<ReceivableAccount>('/contas-receber', {
    method: 'POST',
    body: JSON.stringify(normalizeReceivablePayload(data)),
  });
}

export async function updateReceivableAccount(
  id: string,
  data: UpdateReceivableAccountDto,
) {
  return apiFetch<ReceivableAccount>(`/contas-receber/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeReceivablePayload(data)),
  });
}

export async function deleteReceivableAccount(id: string) {
  return apiFetch<ReceivableAccount>(`/contas-receber/${id}`, {
    method: 'DELETE',
  });
}

export async function receiveAccount(id: string, data: RegisterPaymentDto) {
  return apiFetch<ReceivableAccount>(`/contas-receber/${id}/receber`, {
    method: 'POST',
    body: JSON.stringify(normalizePaymentPayload(data)),
  });
}

export async function receiveAccountsBatch(
  payments: Array<RegisterPaymentDto & { chargeId: string }>,
) {
  return apiFetch<ReceivableAccount[]>('/contas-receber/receber-lote', {
    method: 'POST',
    body: JSON.stringify({
      payments: payments.map((payment) => normalizePaymentPayload(payment)),
    }),
  });
}

export async function replaceReceivedAccountPayment(
  id: string,
  data: RegisterPaymentDto,
) {
  return apiFetch<ReceivableAccount>(`/contas-receber/${id}/receber/substituir`, {
    method: 'POST',
    body: JSON.stringify(normalizePaymentPayload(data)),
  });
}

export async function reverseReceivedAccount(id: string) {
  return apiFetch<ReceivableAccount>(`/contas-receber/${id}/estornar`, {
    method: 'POST',
  });
}

export async function shareReceivableReport(data: {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  dueFilter?: string;
}) {
  return apiFetch<{ id: string }>('/contas-receber/relatorio-compartilhado', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSharedReceivableReport(id: string) {
  return apiFetch<{
    company: {
      id: string;
      tradeName: string;
      corporateName: string;
      cnpj: string | null;
      phone: string | null;
      email: string | null;
      logoUrl: string | null;
      address: string | null;
    };
    filterStartDate: string | null;
    filterEndDate: string | null;
    filterStatus: string | null;
    filterDue: string | null;
    tenantId: string | null;
    expiresAt: string;
    accounts: ReceivableAccount[];
  }>(`/relatorios-receber-publicos/${id}`);
}

export async function getPayableAccounts(companyId: string) {
  void companyId;
  return apiFetch<PayableAccount[]>('/contas-pagar');
}

export async function createPayableAccount(data: CreatePayableAccountDto) {
  return apiFetch<PayableAccount>('/contas-pagar', {
    method: 'POST',
    body: JSON.stringify(normalizePayablePayload(data)),
  });
}

export async function updatePayableAccount(
  id: string,
  data: UpdatePayableAccountDto,
) {
  return apiFetch<PayableAccount>(`/contas-pagar/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizePayablePayload(data)),
  });
}

export async function deletePayableAccount(id: string) {
  return apiFetch<PayableAccount>(`/contas-pagar/${id}`, {
    method: 'DELETE',
  });
}

export async function payAccount(id: string, data: RegisterPaymentDto) {
  return apiFetch<PayableAccount>(`/contas-pagar/${id}/pagar`, {
    method: 'POST',
    body: JSON.stringify(normalizePaymentPayload(data)),
  });
}

export async function replacePaidAccountPayment(
  id: string,
  data: RegisterPaymentDto,
) {
  return apiFetch<PayableAccount>(`/contas-pagar/${id}/pagar/substituir`, {
    method: 'POST',
    body: JSON.stringify(normalizePaymentPayload(data)),
  });
}

export async function reversePaidAccount(id: string) {
  return apiFetch<PayableAccount>(`/contas-pagar/${id}/estornar`, {
    method: 'POST',
  });
}

function normalizeReceivablePayload<
  TData extends CreateReceivableAccountDto | UpdateReceivableAccountDto,
>(data: TData) {
  return uppercaseFields(data, ['property', 'tenant']);
}

function normalizePayablePayload<
  TData extends CreatePayableAccountDto | UpdatePayableAccountDto,
>(data: TData) {
  return uppercaseFields(data, [
    'personName',
    'description',
    'category',
    'note',
  ]);
}

function normalizePaymentPayload<TData extends RegisterPaymentDto>(data: TData) {
  return uppercaseFields(data, ['note']);
}
