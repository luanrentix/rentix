import { apiFetch } from './api';

export type BankAccountType = 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CASH';
export type BankTransactionType = 'INFLOW' | 'OUTFLOW';
export type BankTransactionStatus = 'PENDING' | 'CONFIRMED';

export type BankAccount = {
  id: string;
  companyId: string;
  name: string;
  type: BankAccountType;
  agency?: string | null;
  accountNumber?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  initialBalance: number;
  currentBalance: number;
  limit: number;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BankTransaction = {
  id: string;
  bankAccountId: string;
  type: BankTransactionType;
  status: BankTransactionStatus;
  amount: number;
  fee: number;
  description: string;
  competenceDate: string;
  paymentDate?: string | null;
  category?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  transferGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccount?: {
    name: string;
    type: BankAccountType;
    currency: string;
  };
};

export type CreateBankAccountDto = {
  name: string;
  type: BankAccountType;
  agency?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  initialBalance?: number;
  limit?: number;
  currency?: string;
  active?: boolean;
};

export type CreateBankTransactionDto = {
  type: BankTransactionType;
  status?: BankTransactionStatus;
  amount: number;
  description: string;
  competenceDate: string;
  paymentDate?: string;
  category?: string;
};

export type TransferBalanceDto = {
  originBankAccountId: string;
  destinationBankAccountId: string;
  amount: number;
  fee?: number;
  description: string;
  date: string;
};

export async function getBankAccounts() {
  return apiFetch<BankAccount[]>('/bancos/contas');
}

export async function createBankAccount(data: CreateBankAccountDto) {
  return apiFetch<BankAccount>('/bancos/contas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBankAccount(id: string, data: Partial<CreateBankAccountDto>) {
  return apiFetch<BankAccount>(`/bancos/contas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteBankAccount(id: string) {
  return apiFetch<BankAccount>(`/bancos/contas/${id}`, {
    method: 'DELETE',
  });
}

export async function getBankTransactions(filters?: {
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  category?: string;
  description?: string;
  skip?: number;
  take?: number;
}) {
  const searchParams = new URLSearchParams();
  if (filters?.bankAccountId) searchParams.set('bankAccountId', filters.bankAccountId);
  if (filters?.startDate) searchParams.set('startDate', filters.startDate);
  if (filters?.endDate) searchParams.set('endDate', filters.endDate);
  if (filters?.type) searchParams.set('type', filters.type);
  if (filters?.status) searchParams.set('status', filters.status);
  if (filters?.category) searchParams.set('category', filters.category);
  if (filters?.description) searchParams.set('description', filters.description);
  if (filters?.skip !== undefined) searchParams.set('skip', filters.skip.toString());
  if (filters?.take !== undefined) searchParams.set('take', filters.take.toString());

  const queryString = searchParams.toString();
  return apiFetch<BankTransaction[]>(`/bancos/movimentacoes${queryString ? `?${queryString}` : ''}`);
}

export async function createBankTransaction(bankAccountId: string, data: CreateBankTransactionDto) {
  return apiFetch<BankTransaction>(`/bancos/contas/${bankAccountId}/movimentacoes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBankTransaction(id: string) {
  return apiFetch<BankTransaction>(`/bancos/movimentacoes/${id}`, {
    method: 'DELETE',
  });
}

export async function reconcileBankTransaction(id: string, paymentDate: string) {
  return apiFetch<void>(`/bancos/movimentacoes/${id}/conciliar`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentDate }),
  });
}

export async function transferBalance(data: TransferBalanceDto) {
  return apiFetch<{ outflowTx: BankTransaction; inflowTx: BankTransaction }>('/bancos/transferir', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export type SharedBankStatementResponse = {
  companyName: string;
  filterStartDate?: string | null;
  filterEndDate?: string | null;
  filterAccount?: string | null;
  transactions: BankTransaction[];
  accounts: BankAccount[];
};

export async function shareBankStatement(data: {
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  category?: string;
  description?: string;
}) {
  return apiFetch<{ id: string }>('/bancos/compartilhar', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSharedBankStatement(id: string) {
  return apiFetch<SharedBankStatementResponse>(`/extratos-publicos/${id}`);
}
