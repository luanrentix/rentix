import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class EnviarCadastroClientePublicoDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;

  @IsIn(['INDIVIDUAL', 'COMPANY'])
  personType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  document!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @ValidateIf((_customer, value) => value != null && value !== '')
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  zipCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsBoolean()
  consented!: boolean;
}
