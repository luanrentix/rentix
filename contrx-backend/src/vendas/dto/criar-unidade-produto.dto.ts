import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarUnidadeProdutoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  name!: string;
}
