import { IsNotEmpty, IsString } from 'class-validator';

export class AlterarSenhaDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
