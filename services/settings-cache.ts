import type { AppSettingsResponse } from "./settings.service";

type CachedSettings = { companyId?: string } & Pick<
  AppSettingsResponse,
  "userSettings" | "companySettings" | "themeSettings" | "printTemplates"
>;

let cachedSettings: CachedSettings = {};

export function setCachedAppSettings(settings: CachedSettings) {
  cachedSettings = {
    ...(settings.companyId && settings.companyId !== cachedSettings.companyId
      ? {}
      : cachedSettings),
    ...settings,
  };
}

export function getCachedCompanySettings(companyId?: string) {
  if (companyId && cachedSettings.companyId !== companyId) return null;
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
