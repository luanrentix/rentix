import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CriarClienteVendaDto {
  @IsOptional()
  @IsBoolean()
  referenceOnly?: boolean;
  @IsIn(['INDIVIDUAL', 'COMPANY'])
  personType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  alias?: string;

  @ValidateIf(
    (customer, value) =>
      !customer.referenceOnly || (value != null && value !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  identityNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  issuingAuthority?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(['MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO'])
  sex?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  zipCode?: string;

  @ValidateIf(
    (customer, value) =>
      !customer.referenceOnly || (value != null && value !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditDays?: number;

  @IsOptional()
  @IsIn([true, false])
  creditBlocked?: boolean;
}
