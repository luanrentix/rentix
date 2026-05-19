import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CriarContratoDto } from './criar-contrato.dto';

export class AtualizarContratoDto extends PartialType(
  OmitType(CriarContratoDto, ['companyId'] as const),
) {}
