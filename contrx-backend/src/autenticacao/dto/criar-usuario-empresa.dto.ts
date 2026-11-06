import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const userToolPermissions = [
  'dashboard',
  'properties',
  'people',
  'contracts',
  'financial',
  'accountsReceivable',
  'accountsPayable',
  'schedule',
  'settings',
  'bank',
  'sales',
] as const;

export type UserToolPermission = (typeof userToolPermissions)[number];

export const companyUserRoles = ['OWNER', 'ADMIN', 'MANAGER', 'USER'] as const;

export type CompanyUserRole = (typeof companyUserRoles)[number];

export class CriarUsuarioEmpresaDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  emailLoginEnabled?: boolean;
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  userLoginEnabled?: boolean;
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,59}$/)
  username?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  maxConcurrentSessions?: number;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  actionPermissions?: string[] | null;
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsIn(companyUserRoles)
  role!: CompanyUserRole;

  @IsArray()
  @IsIn(userToolPermissions, { each: true })
  permissions!: UserToolPermission[];
}

export class AtualizarUsuarioEmpresaDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  emailLoginEnabled?: boolean;
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  userLoginEnabled?: boolean;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,59}$/)
  username?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  maxConcurrentSessions?: number;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  actionPermissions?: string[] | null;
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsIn(companyUserRoles)
  role!: CompanyUserRole;

  @IsBoolean()
  isActive!: boolean;

  @IsArray()
  @IsIn(userToolPermissions, { each: true })
  permissions!: UserToolPermission[];
}
