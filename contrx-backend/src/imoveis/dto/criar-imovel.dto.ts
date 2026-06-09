import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MinLength,
  Min,
} from 'class-validator';

export class CriarImovelDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  assetCategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsNumber()
  manufactureYear?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  patrimonyCode?: string;

  @IsOptional()
  @IsNumber()
  rentalValue?: number;

  @IsOptional()
  @IsString()
  managementMode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  administrationFeePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  ownerPayoutDay?: number;

  @IsOptional()
  @IsBoolean()
  autoCreateOwnerPayable?: boolean;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  garages?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
