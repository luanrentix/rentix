import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CriarPessoaDto } from './criar-pessoa.dto';

import { PersonStatus, PersonType } from './criar-pessoa.dto';

export class AtualizarPessoaDto extends PartialType(
  OmitType(CriarPessoaDto, ['companyId'] as const),
) {
  type?: PersonType;
  status?: PersonStatus;
}
