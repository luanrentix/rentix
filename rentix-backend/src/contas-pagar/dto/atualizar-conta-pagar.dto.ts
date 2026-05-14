import { PartialType } from '@nestjs/mapped-types';
import { CriarContaPagarDto } from './criar-conta-pagar.dto';

export class AtualizarContaPagarDto extends PartialType(CriarContaPagarDto) {}
