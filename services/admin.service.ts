import { apiFetch } from './api';

export type AdminSummary = {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalSettings: number;
  usersByRole: {
    role: string;
    total: number;
  }[];
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    tradeName: string;
    companyName?: string | null;
    email?: string | null;
    isActive: boolean;
  };
};

export type AdminCompany = {
  id: string;
  tradeName: string;
  companyName?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    people: number;
    properties: number;
    contracts: number;
  };
};

export type AdminUserRole = 'SYSTEM_OWNER' | 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';

export type ResetTestDataModule =
  | 'properties'
  | 'people'
  | 'contracts'
  | 'accountsReceivable'
  | 'accountsPayable'
  | 'schedule'
  | 'masterPanel';

export async function getAdminSummary() {
  return apiFetch<AdminSummary>('/admin/resumo');
}

export async function getAdminUsers() {
  return apiFetch<AdminUser[]>('/admin/usuarios');
}

export async function getAdminCompanies() {
  return apiFetch<AdminCompany[]>('/admin/empresas');
}

export async function updateAdminUser(
  userId: string,
  data: { role?: AdminUserRole; isActive?: boolean },
) {
  return apiFetch<AdminUser>(`/admin/usuarios/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateAdminCompany(
  companyId: string,
  data: { isActive: boolean },
) {
  return apiFetch<AdminCompany>(`/admin/empresas/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetTestData(modules: ResetTestDataModule[]) {
  return apiFetch<{ success: boolean; modules: ResetTestDataModule[] }>(
    '/admin/reset-test-data',
    {
      method: 'POST',
      body: JSON.stringify({ modules }),
    },
  );
}
