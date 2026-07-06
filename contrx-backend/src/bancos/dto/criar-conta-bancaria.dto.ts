import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { BankAccountType } from '@prisma/client';

export class CriarContaBancariaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BankAccountType)
  type: BankAccountType;

  @IsString()
  @IsOptional()
  agency?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
