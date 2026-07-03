import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export const resetTestDataModules = [
  'properties',
  'people',
  'contracts',
  'accountsReceivable',
  'accountsPayable',
  'schedule',
  'masterPanel',
] as const;

export type ResetTestDataModule = (typeof resetTestDataModules)[number];

export class ResetTestDataDto {
  @IsArray()
  @IsIn(resetTestDataModules, { each: true })
  modules!: ResetTestDataModule[];

  @IsOptional()
  @IsString()
  targetCompanyId?: string;
}
