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
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type AuthUser = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[] | null;
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

export async function verifySessionRequest(): Promise<{ active: boolean }> {
  return apiFetch<{ active: boolean }>('/autenticacao/sessao');
}
