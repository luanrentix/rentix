import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type LoginRequest = {
  email: string;
  password: string;
};

export type CreateAccountRequest = {
  name: string;
  email: string;
  password: string;
  companyName: string;
  phone: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetResponse = {
  success: boolean;
  message: string;
  expiresAt?: string;
  resetToken?: string;
  resetUrl?: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type AuthUser = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[] | null;
  companyIsActive?: boolean;
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELED';
  trialStartsAt?: string | null;
  trialEndsAt?: string | null;
  trialExtendedUntil?: string | null;
  trialAccessEndsAt?: string | null;
  trialDaysRemaining?: number | null;
  subscriptionEndsAt?: string | null;
  accessState?: CompanyAccessState | null;
};

export type CompanyAccessState = {
  canAccess: boolean;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELED';
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

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export async function loginRequest(data: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/autenticacao/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(data),
  });
}

export async function createAccountRequest(
  data: CreateAccountRequest,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/autenticacao/criar-conta', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(uppercaseFields(data, ['name', 'companyName'])),
  });
}

export async function changePasswordRequest(
  data: ChangePasswordRequest,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/autenticacao/me/senha', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function requestPasswordResetRequest(
  data: PasswordResetRequest,
): Promise<PasswordResetResponse> {
  return apiFetch<PasswordResetResponse>('/autenticacao/recuperar-senha', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(data),
  });
}

export async function resetPasswordRequest(
  data: ResetPasswordRequest,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/autenticacao/redefinir-senha', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(data),
  });
}

export async function verifySessionRequest(): Promise<{ active: boolean }> {
  return apiFetch<{ active: boolean }>('/autenticacao/sessao');
}
