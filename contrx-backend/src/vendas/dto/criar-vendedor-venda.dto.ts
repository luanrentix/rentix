import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  IsNotEmpty,
  IsDateString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CriarVendedorVendaDto {
  @IsOptional() @IsIn(['INDIVIDUAL', 'COMPANY']) personType?: string;
  @IsOptional() @IsString() @MaxLength(160) alias?: string;
  @IsOptional() @IsString() @MaxLength(30) identityNumber?: string;
  @IsOptional() @IsString() @MaxLength(30) issuingAuthority?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsIn(['F', 'M', 'OUTRO', 'NAO_INFORMADO']) sex?: string;
  @IsOptional() @IsString() @MaxLength(30) phone2?: string;
  @IsOptional() @IsString() @MaxLength(10) zipCode?: string;
  @IsOptional() @IsString() @MaxLength(160) address?: string;
  @IsOptional() @IsString() @MaxLength(20) number?: string;
  @IsOptional() @IsString() @MaxLength(100) complement?: string;
  @IsOptional() @IsString() @MaxLength(100) neighborhood?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commission?: number;
}
