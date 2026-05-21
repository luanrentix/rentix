import { apiFetch } from './api';

export type FinancialStatus = 'Pending' | 'Paid' | 'Overdue';
export type PeriodShortcut =
  | 'CurrentMonth'
  | 'CurrentQuarter'
  | 'CurrentYear'
  | 'All'
  | 'Custom';

export type FinancialReceivable = {
  id: string;
  tenantName: string;
  propertyName: string;
  tenant?: string;
  property?: string;
  dueDate: string;
  amount: number;
  status: FinancialStatus;
  paymentDate: string | null;
  paidAmount: number;
  discountAmount?: number;
  interestAmount?: number;
  remainingAmount: number;
};

export type FinancialPayable = {
  id: string;
  personName: string;
  supplier?: string;
  creditor?: string;
  description: string;
  category: string;
  dueDate: string;
  amount: number;
  value?: number;
  status: FinancialStatus;
  paymentDate: string | null;
  paidAmount: number;
  discountAmount?: number;
  interestAmount?: number;
  remainingAmount: number;
};

export type FinancialSummaryResponse = {
  receivables: FinancialReceivable[];
  payables: FinancialPayable[];
};

export type FinancialSummaryFilters = {
  startDate?: string;
  endDate?: string;
};

export async function getFinancialSummary(
  _companyId?: string,
  filters: FinancialSummaryFilters = {},
) {
  const searchParams = new URLSearchParams();

  if (filters.startDate) searchParams.set('startDate', filters.startDate);
  if (filters.endDate) searchParams.set('endDate', filters.endDate);

  const queryString = searchParams.toString();

  return apiFetch<FinancialSummaryResponse>(
    `/financeiro/resumo${queryString ? `?${queryString}` : ''}`,
  );
}
