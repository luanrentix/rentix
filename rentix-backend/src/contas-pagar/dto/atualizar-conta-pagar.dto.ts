import { CriarContaPagarDto } from './criar-conta-pagar.dto';

export class AtualizarContaPagarDto implements Partial<CriarContaPagarDto> {
  companyId?: string;
  personId?: string | null;
  personName?: string | null;

  description?: string;
  category?: string | null;
  note?: string | null;
  amount?: number;
  issueDate?: string | null;
  dueDate?: string;
  status?: CriarContaPagarDto['status'];
  manual?: boolean;

  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
}
