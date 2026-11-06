import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type UserToolPermission =
  | 'dashboard'
  | 'properties'
  | 'people'
  | 'contracts'
  | 'financial'
  | 'accountsReceivable'
  | 'accountsPayable'
  | 'schedule'
  | 'settings'
  | 'bank'
  | 'sales';

export type CompanyUserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';

export type CompanyUser = {
  emailLoginEnabled?: boolean;
  userLoginEnabled?: boolean;
  username?: string | null;
  maxConcurrentSessions?: number;
  actionPermissions?: string[] | null;
  id: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
  permissions?: UserToolPermission[] | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompanyUserRequest = {
  emailLoginEnabled?: boolean;
  userLoginEnabled?: boolean;
  username?: string | null;
  maxConcurrentSessions?: number;
  actionPermissions?: string[] | null;
  name: string;
  email?: string | null;
  password: string;
  role: CompanyUserRole;
  permissions: UserToolPermission[];
};

export type UpdateCompanyUserRequest = {
  emailLoginEnabled?: boolean;
  userLoginEnabled?: boolean;
  email?: string | null;
  username?: string | null;
  maxConcurrentSessions?: number;
  actionPermissions?: string[] | null;
  name: string;
  password?: string;
  role: CompanyUserRole;
  isActive: boolean;
  permissions: UserToolPermission[];
};

export async function getCompanyUsers() {
  return apiFetch<CompanyUser[]>('/autenticacao/usuarios', { skipCache: true });
}

export async function createCompanyUser(data: CreateCompanyUserRequest) {
  return apiFetch<CompanyUser>('/autenticacao/usuarios', {
    method: 'POST',
    body: JSON.stringify(uppercaseFields(data, ['name'])),
  });
}

export async function updateCompanyUser(userId: string, data: UpdateCompanyUserRequest) {
  return apiFetch<CompanyUser>(`/autenticacao/usuarios/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(uppercaseFields(data, ['name'])),
  });
}
