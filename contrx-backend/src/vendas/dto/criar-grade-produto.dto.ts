import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarGradeProdutoDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) values!: string;
}
