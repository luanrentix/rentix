import { PartialType } from '@nestjs/mapped-types';
import { CriarClienteVendaDto } from './criar-cliente-venda.dto';

export class AtualizarClienteVendaDto extends PartialType(
  CriarClienteVendaDto,
) {}
