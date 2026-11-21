import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CriarLinkCadastroClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
