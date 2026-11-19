import { IsString, Matches } from 'class-validator';

export class ConsultarCadastroClientePublicoDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;
}
