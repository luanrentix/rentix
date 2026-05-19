import { IsArray, IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export const userToolPermissions = [
  'dashboard',
  'properties',
  'people',
  'contracts',
  'financial',
  'accountsReceivable',
  'accountsPayable',
  'schedule',
] as const;

export type UserToolPermission = (typeof userToolPermissions)[number];

export const companyUserRoles = ['OWNER', 'ADMIN', 'MANAGER', 'USER'] as const;

export type CompanyUserRole = (typeof companyUserRoles)[number];

export class CriarUsuarioEmpresaDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsIn(companyUserRoles)
  role!: CompanyUserRole;

  @IsArray()
  @IsIn(userToolPermissions, { each: true })
  permissions!: UserToolPermission[];
}
