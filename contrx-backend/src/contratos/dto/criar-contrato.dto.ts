import {
  ContractStatus,
  ContractStatusReasonType,
  Prisma,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export type ContractRenewalRecord = {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  previousRentValue: number;
  newRentValue: number;
  notes?: string;
};

export class CriarContratoDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  propertyId: string;

  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsString()
  propertyName?: string;

  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsNumber()
  rentValue: number;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsString()
  deletedAt?: string | null;

  @IsOptional()
  @IsString()
  statusReason?: string | null;

  @IsOptional()
  @IsEnum(ContractStatusReasonType)
  statusReasonType?: ContractStatusReasonType | null;

  @IsOptional()
  @IsString()
  statusReasonAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isTemporaryRental?: boolean;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  renewedAt?: string | null;

  @IsOptional()
  renewalHistory?: ContractRenewalRecord[] | Prisma.InputJsonValue;

  @IsOptional()
  @IsString()
  finishedAt?: string | null;

  @IsOptional()
  @IsString()
  finishReason?: string | null;
}
