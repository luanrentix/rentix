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
};

export type FinancialSummaryResponse = {
  receivables: FinancialReceivable[];
  payables: FinancialPayable[];
};

export async function getFinancialSummary(companyId: string) {
  return apiFetch<FinancialSummaryResponse>(
    `/financeiro/resumo?companyId=${encodeURIComponent(companyId)}`,
  );
}
