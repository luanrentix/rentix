import { apiFetch } from './api';
import type {
  DashboardFinancialPeriod,
  DashboardOverviewResponse,
} from '@/types/dashboard.types';

export type DashboardOverviewFilters = {
  period?: DashboardFinancialPeriod;
  startDate?: string;
  endDate?: string;
};

export async function getDashboardOverview(
  filters: DashboardOverviewFilters = {},
  refresh = false,
): Promise<DashboardOverviewResponse> {
  const searchParams = new URLSearchParams();

  if (filters.period) searchParams.set('period', filters.period);
  if (filters.startDate) searchParams.set('startDate', filters.startDate);
  if (filters.endDate) searchParams.set('endDate', filters.endDate);
  if (refresh) searchParams.set('refresh', 'true');

  const queryString = searchParams.toString();

  return apiFetch<DashboardOverviewResponse>(
    `/dashboard/overview${queryString ? `?${queryString}` : ''}`,
  );
}
