import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateAdminCompanyDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  trialExtensionDays?: number;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @IsOptional()
  @IsIn(['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELED'])
  subscriptionStatus?:
    | 'TRIAL'
    | 'ACTIVE'
    | 'EXPIRED'
    | 'SUSPENDED'
    | 'CANCELED';

  @IsOptional()
  @IsDateString()
  subscriptionEndsAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
