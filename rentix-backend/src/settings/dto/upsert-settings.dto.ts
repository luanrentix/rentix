export class UpsertSettingsDto {
  companyId: string;
  userSettings?: Record<string, unknown>;
  companySettings?: Record<string, unknown>;
  themeSettings?: Record<string, unknown>;
  printTemplates?: Record<string, unknown>;
}
