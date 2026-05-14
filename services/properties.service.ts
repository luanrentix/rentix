import { apiFetch } from './api';

export type PropertyStatus = 'Available' | 'Rented';

export type PropertyType =
  | 'Apartment'
  | 'House'
  | 'Cabin'
  | 'Farm'
  | 'Commercial'
  | 'Land'
  | 'Other';

export type Property = {
  id: string;
  companyId: string;
  ownerId?: string | null;

  title: string;
  code?: string | null;

  type?: string | null;
  purpose?: string | null;

  rentalValue?: number | null;

  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  district?: string | null;
  number?: string | null;
  complement?: string | null;

  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;

  description?: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;

  owner?: {
    id: string;
    name: string;
    document: string;
  } | null;
};

export type CreatePropertyDto = {
  companyId: string;
  ownerId?: string | null;

  title: string;
  code?: string;

  type?: string;
  purpose?: string;

  rentalValue?: number;

  zipCode?: string;
  city?: string;
  state?: string;
  address?: string;
  district?: string;
  number?: string;
  complement?: string;

  bedrooms?: number;
  bathrooms?: number;
  garages?: number;

  description?: string;

  isActive?: boolean;
};

export type UpdatePropertyDto = Partial<CreatePropertyDto>;

export async function getProperties(companyId: string) {
  return apiFetch<Property[]>(
    `/imoveis?companyId=${companyId}`,
  );
}

export async function getPropertyById(id: string) {
  return apiFetch<Property>(`/imoveis/${id}`);
}

export async function createProperty(data: CreatePropertyDto) {
  return apiFetch<Property>('/imoveis', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProperty(
  id: string,
  data: UpdatePropertyDto,
) {
  return apiFetch<Property>(`/imoveis/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProperty(id: string) {
  return apiFetch<{ message: string }>(`/imoveis/${id}`, {
    method: 'DELETE',
  });
}
