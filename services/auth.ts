import { apiFetch } from './api';

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

export type AuthUser = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
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
    body: JSON.stringify(data),
  });
}
