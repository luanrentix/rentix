import { PartialType } from '@nestjs/mapped-types';
import { CriarProdutoVendaDto } from './criar-produto-venda.dto';

export class AtualizarProdutoVendaDto extends PartialType(
  CriarProdutoVendaDto,
) {}
