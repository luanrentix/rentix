import { apiFetch } from './api';

export type ApiPersonType = 'INDIVIDUAL' | 'COMPANY';
export type ApiPersonStatus = 'ACTIVE' | 'INACTIVE';

export type Person = {
  id: string;
  companyId: string;
  type: ApiPersonType;
  status: ApiPersonStatus;
  name: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CreatePersonDto = {
  companyId: string;
  type: ApiPersonType;
  name: string;
  document: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
  status?: ApiPersonStatus;
};

export async function getPeople(companyId: string) {
  return apiFetch<Person[]>(`/pessoas?companyId=${encodeURIComponent(companyId)}`);
}

export async function createPerson(data: CreatePersonDto) {
  return apiFetch<Person>('/pessoas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
