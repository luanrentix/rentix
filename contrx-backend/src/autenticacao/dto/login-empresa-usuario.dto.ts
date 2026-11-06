import { IsString, Length } from 'class-validator';
export class LoginEmpresaUsuarioDto {
  @IsString() @Length(3, 64) companyCode!: string;
  @IsString() @Length(2, 254) username!: string;
  @IsString() @Length(1, 1024) password!: string;
}
