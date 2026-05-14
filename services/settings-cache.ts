import type { AppSettingsResponse } from './settings.service';

type CachedSettings = Pick<
  AppSettingsResponse,
  'userSettings' | 'companySettings' | 'themeSettings' | 'printTemplates'
>;

let cachedSettings: CachedSettings = {};

export function setCachedAppSettings(settings: CachedSettings) {
  cachedSettings = {
    ...cachedSettings,
    ...settings,
  };
}

export function getCachedCompanySettings() {
  return cachedSettings.companySettings || null;
}

export function getCachedPrintTemplates() {
  return cachedSettings.printTemplates || null;
}

export function getCachedThemeSettings() {
  return cachedSettings.themeSettings || null;
}

export function getCachedUserSettings() {
  return cachedSettings.userSettings || null;
}
