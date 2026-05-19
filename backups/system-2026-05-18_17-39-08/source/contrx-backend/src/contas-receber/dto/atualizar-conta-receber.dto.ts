import { PartialType } from '@nestjs/mapped-types';
import { CriarContaReceberDto } from './criar-conta-receber.dto';

export class AtualizarContaReceberDto extends PartialType(
  CriarContaReceberDto,
) {}
