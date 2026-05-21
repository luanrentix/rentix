import { FinancialAccountStatus, PaymentMethod, Prisma } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CriarContaReceberDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  contractId?: string | null;

  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @IsString()
  @MinLength(1)
  property: string;

  @IsString()
  @MinLength(1)
  tenant: string;

  @IsOptional()
  @IsString()
  issueDate?: string | null;

  @IsString()
  dueDate: string;

  @IsNumber()
  amount: number;

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

  @IsOptional()
  @IsBoolean()
  isDownPayment?: boolean;
}

export class ReceberPagamentoDto {
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

export class ReceberPagamentoLoteItemDto extends ReceberPagamentoDto {
  @IsUUID()
  chargeId: string;
}

export class ReceberPagamentoLoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceberPagamentoLoteItemDto)
  payments: ReceberPagamentoLoteItemDto[];
}
