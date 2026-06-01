import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type ApiPersonType = 'INDIVIDUAL' | 'COMPANY';
export type ApiPersonStatus = 'ACTIVE' | 'INACTIVE';

export type Person = {
  id: string;
  companyId: string;
  type: ApiPersonType;
  status: ApiPersonStatus;
  name: string;
  document: string;
  stateRegistration?: string | null;
  identityNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  isTenant?: boolean | null;
  createdAt: string;
  updatedAt?: string;
};

export type CreatePersonDto = {
  type: ApiPersonType;
  name: string;
  document: string;
  stateRegistration?: string;
  identityNumber?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  address?: string;
  isTenant?: boolean;
  status?: ApiPersonStatus;
};

export type UpdatePersonDto = Partial<CreatePersonDto>;

export async function getPeople(companyId: string) {
  void companyId;
  return apiFetch<Person[]>('/pessoas');
}

export async function createPerson(data: CreatePersonDto) {
  return apiFetch<Person>('/pessoas', {
    method: 'POST',
    body: JSON.stringify(normalizePersonPayload(data)),
  });
}

export async function updatePerson(id: string, data: UpdatePersonDto) {
  return apiFetch<Person>(`/pessoas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizePersonPayload(data)),
  });
}

export async function deletePerson(id: string) {
  return apiFetch<Person>(`/pessoas/${id}`, {
    method: 'DELETE',
  });
}

function normalizePersonPayload<TData extends CreatePersonDto | UpdatePersonDto>(
  data: TData,
) {
  return uppercaseFields(data, [
    'name',
    'stateRegistration',
    'identityNumber',
    'city',
    'state',
    'address',
  ]);
}
