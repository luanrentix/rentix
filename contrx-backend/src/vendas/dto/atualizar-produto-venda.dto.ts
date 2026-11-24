import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CriarProdutoVendaDto } from './criar-produto-venda.dto';

export class AtualizarProdutoVendaDto extends PartialType(
  CriarProdutoVendaDto,
) {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  adjustmentReason?: string;
}
