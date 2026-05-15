import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class UpsertSettingsDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsObject()
  userSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  companySettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  themeSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  printTemplates?: Record<string, unknown>;
}
