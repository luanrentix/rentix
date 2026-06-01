import {
  IsEmail,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export type PersonType = 'INDIVIDUAL' | 'COMPANY';

export type PersonStatus = 'ACTIVE' | 'INACTIVE';

export class CriarPessoaDto {
  @IsIn(['INDIVIDUAL', 'COMPANY'])
  type: PersonType;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(3)
  document: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isTenant?: boolean;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: PersonStatus;
}
