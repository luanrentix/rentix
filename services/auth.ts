import { apiFetch } from './api';

export type LoginRequest = {
  email: string;
  password: string;
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
