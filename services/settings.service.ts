import { apiFetch } from './api';

export type AppSettingsPayload = {
  companyId: string;
  userSettings?: Record<string, unknown>;
  companySettings?: Record<string, unknown>;
  themeSettings?: Record<string, unknown>;
  printTemplates?: Record<string, unknown>;
};

export type AppSettingsResponse = AppSettingsPayload & {
  id: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getAppSettings(companyId: string) {
  return apiFetch<AppSettingsResponse>(
    `/settings?companyId=${encodeURIComponent(companyId)}`,
  );
}

export async function saveAppSettings(data: AppSettingsPayload) {
  return apiFetch<AppSettingsResponse>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
