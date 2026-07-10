import { IsNotEmpty, IsString } from 'class-validator';

export class CriarChamadoDto {
  @IsNotEmpty({ message: 'O assunto é obrigatório' })
  @IsString({ message: 'O assunto deve ser uma string' })
  subject: string;

  @IsNotEmpty({ message: 'A mensagem é obrigatória' })
  @IsString({ message: 'A mensagem deve ser uma string' })
  message: string;
}
