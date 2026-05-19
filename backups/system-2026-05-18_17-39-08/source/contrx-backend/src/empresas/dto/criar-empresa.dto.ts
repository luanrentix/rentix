import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CriarEmpresaDto {
  @IsString()
  @MinLength(2)
  tradeName: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
