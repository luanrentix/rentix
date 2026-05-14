import {
  ContractStatus,
  ContractStatusReasonType,
  Prisma,
} from '@prisma/client';

export type ContractRenewalRecord = {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  previousRentValue: number;
  newRentValue: number;
  notes?: string;
};

export class CriarContratoDto {
  companyId: string;
  propertyId: string;
  tenantId: string;

  propertyName?: string;
  tenantName?: string;

  startDate: string;
  endDate: string;
  rentValue: number;

  status?: ContractStatus;

  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: ContractStatusReasonType | null;
  statusReasonAt?: string | null;

  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;

  renewedAt?: string | null;
  renewalHistory?: ContractRenewalRecord[] | Prisma.InputJsonValue;

  finishedAt?: string | null;
  finishReason?: string | null;
}
