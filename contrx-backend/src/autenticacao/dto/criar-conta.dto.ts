import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CriarContaDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @MinLength(2)
  companyName: string;

  @IsString()
  @MinLength(10)
  phone: string;
}
