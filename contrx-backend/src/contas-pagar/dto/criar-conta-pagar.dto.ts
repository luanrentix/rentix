import { FinancialAccountStatus, PaymentMethod, Prisma } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CriarContaPagarDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  personId?: string | null;

  @IsOptional()
  @IsString()
  personName?: string | null;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  issueDate?: string | null;

  @IsString()
  dueDate: string;

  @IsOptional()
  @IsEnum(FinancialAccountStatus)
  status?: FinancialAccountStatus;

  @IsOptional()
  @IsBoolean()
  manual?: boolean;

  @IsOptional()
  @IsNumber()
  installmentNumber?: number | null;

  @IsOptional()
  @IsNumber()
  installmentTotal?: number | null;

  @IsOptional()
  @IsString()
  installmentGroupId?: string | null;
}

export class PagarContaDto {
  @IsString()
  paidAt: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  paymentItems?: Prisma.InputJsonValue;

  @IsOptional()
  @IsNumber()
  interest?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsNumber()
  amountPaid: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}
