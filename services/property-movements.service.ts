import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type PropertyMovement = {
  id: string;
  companyId: string;
  propertyId: string;
  propertyName: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePropertyMovementDto = {
  companyId: string;
  propertyId: string;
  propertyName: string;
  type: string;
  description: string;
};

export async function getPropertyMovements(companyId: string, propertyId?: string) {
  const query = new URLSearchParams({ companyId });

  if (propertyId) {
    query.set('propertyId', propertyId);
  }

  return apiFetch<PropertyMovement[]>(`/property-movements?${query.toString()}`);
}

export async function createPropertyMovement(data: CreatePropertyMovementDto) {
  return apiFetch<PropertyMovement>('/property-movements', {
    method: 'POST',
    body: JSON.stringify(
      uppercaseFields(data, ['propertyName', 'type', 'description']),
    ),
  });
}
