export type PersonType = 'INDIVIDUAL' | 'COMPANY';

export type PersonStatus = 'ACTIVE' | 'INACTIVE';

export class CriarPessoaDto {
  companyId: string;
  type: PersonType;
  name: string;
  document: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
  status?: PersonStatus;
}
