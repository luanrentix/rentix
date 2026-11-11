import { IsObject } from 'class-validator';

export class SalvarComposicaoPrecoProdutoDto {
  @IsObject()
  composition!: Record<string, unknown>;
}
