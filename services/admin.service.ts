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

export type CompanyAccessState = {
  canAccess: boolean;
  status: SubscriptionStatus;
  reason: string;
  blockReason:
    | 'COMPANY_INACTIVE'
    | 'TRIAL_EXPIRED'
    | 'SUBSCRIPTION_EXPIRED'
    | 'SUBSCRIPTION_SUSPENDED'
    | 'SUBSCRIPTION_CANCELED'
    | null;
  endsAt: string | null;
  daysRemaining: number | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  company: {
    id: string;
    tradeName: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
    subscriptionStatus?: SubscriptionStatus;
    trialStartsAt?: string | null;
    trialEndsAt?: string | null;
    trialExtendedUntil?: string | null;
    subscriptionEndsAt?: string | null;
    accessState?: CompanyAccessState;
  };
};

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELED';

export type AdminCompany = {
  id: string;
  tradeName: string;
  companyName?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  trialStartsAt?: string | null;
  trialEndsAt?: string | null;
  trialExtendedUntil?: string | null;
  subscriptionEndsAt?: string | null;
  accessState?: CompanyAccessState;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    people: number;
    properties: number;
    contracts: number;
  };
};

export type AdminCommercialHistory = {
  id: string;
  companyId: string;
  userId?: string | null;
  action: string;
  description: string;
  metadata?: unknown;
  createdAt: string;
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
  data: {
    isActive?: boolean;
    trialExtensionDays?: number;
    trialEndsAt?: string;
    subscriptionStatus?: SubscriptionStatus;
    subscriptionEndsAt?: string;
    note?: string;
  },
) {
  return apiFetch<AdminCompany>(`/admin/empresas/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getAdminCompanyCommercialHistory(companyId: string) {
  return apiFetch<AdminCommercialHistory[]>(
    `/admin/empresas/${companyId}/historico-comercial`,
  );
}

export async function reprocessAdminCommercialExpirations() {
  return apiFetch<{ processed: number; expired: number }>(
    '/admin/comercial/reprocessar-vencimentos',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function resetTestData(modules: ResetTestDataModule[]) {
  return apiFetch<{
    success: boolean;
    modules: ResetTestDataModule[];
    deletedRecords?: Partial<Record<ResetTestDataModule, number>>;
  }>(
    '/admin/reset-test-data',
    {
      method: 'POST',
      body: JSON.stringify({ modules }),
    },
  );
}
