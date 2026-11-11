import { apiFetch } from './api';
import { uppercaseRecordFields } from './text-normalization';

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

export async function getAppRuntimeSettings(companyId: string) {
  // O backend determina a empresa pela sessão, nunca pelo parâmetro do cliente.
  const settings = await apiFetch<Pick<AppSettingsResponse, 'companyId' | 'companySettings' | 'themeSettings'>>('/settings/runtime');
  if (settings.companyId !== companyId) throw new Error('A sessão pertence a outra empresa. Entre novamente.');
  return { ...settings, id: null, createdAt: null, updatedAt: null, userSettings: undefined, printTemplates: undefined } satisfies AppSettingsResponse;
}

export async function saveAppSettings(data: AppSettingsPayload) {
  return apiFetch<AppSettingsResponse>('/settings', {
    method: 'PUT',
    body: JSON.stringify(normalizeSettingsPayload(data)),
  });
}

function normalizeSettingsPayload(data: AppSettingsPayload): AppSettingsPayload {
  return {
    ...data,
    userSettings: uppercaseRecordFields(data.userSettings, ['name']),
    companySettings: uppercaseRecordFields(data.companySettings, [
      'companyName',
      'tradeName',
      'document',
      'stateRegistration',
      'municipalRegistration',
      'zipCode',
      'address',
      'number',
      'neighborhood',
      'city',
      'state',
    ]),
  };
}
