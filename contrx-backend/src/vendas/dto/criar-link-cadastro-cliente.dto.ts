import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarLinkCadastroClienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;
}
