import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BankTransactionType, BankTransactionStatus } from '@prisma/client';

export class CriarMovimentacaoDto {
  @IsEnum(BankTransactionType)
  type: BankTransactionType;

  @IsEnum(BankTransactionStatus)
  @IsOptional()
  status?: BankTransactionStatus;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  competenceDate: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
