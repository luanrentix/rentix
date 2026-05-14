import { CriarContratoDto } from './criar-contrato.dto';

export class AtualizarContratoDto implements Partial<CriarContratoDto> {
  companyId?: string;
  propertyId?: string;
  tenantId?: string;

  propertyName?: string;
  tenantName?: string;

  startDate?: string;
  endDate?: string;
  rentValue?: number;

  status?: CriarContratoDto['status'];

  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: CriarContratoDto['statusReasonType'];
  statusReasonAt?: string | null;

  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;

  renewedAt?: string | null;
  renewalHistory?: CriarContratoDto['renewalHistory'];

  finishedAt?: string | null;
  finishReason?: string | null;
}
