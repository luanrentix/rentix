import { FinancialAccountStatus, PaymentMethod, Prisma } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CriarContaReceberDto {
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
  @Min(0.01)
  amount: number;

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
