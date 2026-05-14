import { PersonStatus, PersonType } from './criar-pessoa.dto';

export class AtualizarPessoaDto {
  type?: PersonType;
  name?: string;
  document?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
  status?: PersonStatus;
}
