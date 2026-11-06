import { PartialType } from '@nestjs/mapped-types';
import { CriarVendedorVendaDto } from './criar-vendedor-venda.dto';

export class AtualizarVendedorVendaDto extends PartialType(
  CriarVendedorVendaDto,
) {}
