import { PartialType } from '@nestjs/mapped-types';
import { CriarPessoaDto } from './criar-pessoa.dto';

import { PersonStatus, PersonType } from './criar-pessoa.dto';

export class AtualizarPessoaDto extends PartialType(CriarPessoaDto) {
  type?: PersonType;
  status?: PersonStatus;
}
