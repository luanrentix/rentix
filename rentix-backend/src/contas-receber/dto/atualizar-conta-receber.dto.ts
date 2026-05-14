import { CriarContaReceberDto } from './criar-conta-receber.dto';

export class AtualizarContaReceberDto implements Partial<CriarContaReceberDto> {
  companyId?: string;
  contractId?: string | null;
  tenantId?: string | null;

  property?: string;
  tenant?: string;

  issueDate?: string | null;
  dueDate?: string;
  amount?: number;
  status?: CriarContaReceberDto['status'];
  manual?: boolean;

  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  isDownPayment?: boolean;
}
