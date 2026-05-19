import { apiFetch } from './api';

export type UserToolPermission =
  | 'dashboard'
  | 'properties'
  | 'people'
  | 'contracts'
  | 'financial'
  | 'accountsReceivable'
  | 'accountsPayable'
  | 'schedule'
  | 'settings';

export type CompanyUserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';

export type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions?: UserToolPermission[] | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompanyUserRequest = {
  name: string;
  email: string;
  password: string;
  role: CompanyUserRole;
  permissions: UserToolPermission[];
};

export type UpdateCompanyUserRequest = {
  name: string;
  password?: string;
  role: CompanyUserRole;
  isActive: boolean;
  permissions: UserToolPermission[];
};

export async function getCompanyUsers() {
  return apiFetch<CompanyUser[]>('/autenticacao/usuarios');
}

export async function createCompanyUser(data: CreateCompanyUserRequest) {
  return apiFetch<CompanyUser>('/autenticacao/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompanyUser(userId: string, data: UpdateCompanyUserRequest) {
  return apiFetch<CompanyUser>(`/autenticacao/usuarios/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
