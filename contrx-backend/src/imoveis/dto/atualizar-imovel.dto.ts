import { PartialType } from '@nestjs/mapped-types';
import { CriarImovelDto } from './criar-imovel.dto';

export class AtualizarImovelDto extends PartialType(CriarImovelDto) {}
