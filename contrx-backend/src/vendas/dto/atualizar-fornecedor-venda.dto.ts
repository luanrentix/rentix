import { PartialType } from '@nestjs/mapped-types';
import { CriarFornecedorVendaDto } from './criar-fornecedor-venda.dto';

export class AtualizarFornecedorVendaDto extends PartialType(
  CriarFornecedorVendaDto,
) {}
