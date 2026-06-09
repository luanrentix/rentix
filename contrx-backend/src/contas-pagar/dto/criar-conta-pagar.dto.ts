import { FinancialAccountStatus, PaymentMethod, Prisma } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CriarContaPagarDto {
  @IsOptional()
  @IsUUID()
  personId?: string | null;

  @IsOptional()
  @IsUUID()
  propertyId?: string | null;

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
  @Min(0.01)
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
  @Min(1)
  installmentNumber?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
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
  @Min(0)
  interest?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsNumber()
  @Min(0.01)
  amountPaid: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}
