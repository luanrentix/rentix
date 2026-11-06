import { apiFetch } from './api';
export type DashboardCity = { id: number; name: string; state: string; latitude: number; longitude: number; timeZone: string };
export type ConfectionsOverview = {
  date: string; timeZone: string; defaultCity: DashboardCity | null; selectedCity: DashboardCity | null; companyName: string;
  daily: { revenue: number; sales: number; items: number; average: number; revenueChange: number | null };
  monthly: { revenue: number; sales: number };
  pending: { conditionals: number; orders: number; overdue: number; lowStock: number };
};
export type DashboardWeather = { city: DashboardCity; temperature: number; feelsLike: number | null; humidity: number | null; symbol: string; precipitation: number | null; precipitationHours: number; probability: number | null; forecastAt: string; updatedAt: string };
export function getConfectionsOverview(cityId?: number | null) {
  const query = new URLSearchParams({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (cityId) query.set('cityId', String(cityId));
  return apiFetch<ConfectionsOverview>(`/vendas/inicio/resumo?${query}`, { skipCache: true });
}
export const searchDashboardCities = (query: string) => apiFetch<DashboardCity[]>(`/vendas/inicio/cidades?q=${encodeURIComponent(query)}`);
export const getDashboardWeather = (cityId: number) => apiFetch<DashboardWeather>(`/vendas/inicio/clima?cityId=${cityId}`, { skipCache: true });
