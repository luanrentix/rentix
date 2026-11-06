import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarClassificacaoProdutoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
