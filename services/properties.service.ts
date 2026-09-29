import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type PropertyStatus = 'Available' | 'Rented';

export type AssetOperationalStatus =
  | 'AVAILABLE'
  | 'RENTED'
  | 'MAINTENANCE'
  | 'RESERVED'
  | 'INACTIVE';

export type AssetCategory =
  | 'PROPERTY'
  | 'EQUIPMENT'
  | 'MACHINE'
  | 'VEHICLE'
  | 'TOOL'
  | 'OTHER';

export type PropertyType =
  | 'Apartment'
  | 'House'
  | 'Cabin'
  | 'Farm'
  | 'Commercial'
  | 'Land'
  | 'Other'
  | string;

export type PropertyManagementMode = 'OWNED' | 'MANAGED';

export type Property = {
  id: string;
  companyId: string;
  ownerId?: string | null;

  title: string;
  code?: string | null;

  type?: string | null;
  purpose?: string | null;
  assetCategory?: AssetCategory | string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  licensePlate?: string | null;
  manufactureYear?: number | null;
  condition?: string | null;
  patrimonyCode?: string | null;

  rentalValue?: number | null;
  operationalStatus?: AssetOperationalStatus | string | null;
  managementMode?: PropertyManagementMode | string | null;
  administrationFeePercentage?: number | null;
  ownerPayoutDay?: number | null;
  autoCreateOwnerPayable?: boolean | null;

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
  photos?: string | null;

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
  ownerId?: string | null;

  title: string;
  code?: string;

  type?: string;
  purpose?: string;
  assetCategory?: AssetCategory | string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  licensePlate?: string;
  manufactureYear?: number;
  condition?: string;
  patrimonyCode?: string;

  rentalValue?: number;
  operationalStatus?: AssetOperationalStatus | string;
  managementMode?: PropertyManagementMode | string;
  administrationFeePercentage?: number | null;
  ownerPayoutDay?: number | null;
  autoCreateOwnerPayable?: boolean;

  zipCode?: string;
  city?: string;
  state?: string;
  address?: string;
  district?: string;
  street?: string;
  neighborhood?: string;
  number?: string;
  complement?: string;

  bedrooms?: number;
  bathrooms?: number;
  garages?: number;

  description?: string;
  photos?: string;

  isActive?: boolean;
};

export type UpdatePropertyDto = Partial<CreatePropertyDto>;

export async function getProperties(companyId: string) {
  void companyId;
  return apiFetch<Property[]>('/imoveis');
}

export async function getPropertyById(id: string) {
  return apiFetch<Property>(`/imoveis/${id}`);
}

export async function createProperty(data: CreatePropertyDto) {
  return apiFetch<Property>('/imoveis', {
    method: 'POST',
    body: JSON.stringify(normalizePropertyPayload(data)),
  });
}

export async function updateProperty(
  id: string,
  data: UpdatePropertyDto,
) {
  return apiFetch<Property>(`/imoveis/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizePropertyPayload(data)),
  });
}

export async function deleteProperty(id: string) {
  return apiFetch<Property>(`/imoveis/${id}`, {
    method: 'DELETE',
  });
}

export async function setAssetOperationalStatus(
  id: string,
  operationalStatus: AssetOperationalStatus,
) {
  return updateProperty(id, { operationalStatus });
}

function normalizePropertyPayload<
  TData extends CreatePropertyDto | UpdatePropertyDto,
>(data: TData) {
  const cloned = { ...data } as any;

  if (cloned.street && !cloned.address) {
    cloned.address = cloned.street;
  }
  if (cloned.neighborhood && !cloned.district) {
    cloned.district = cloned.neighborhood;
  }
  delete cloned.street;
  delete cloned.neighborhood;

  return uppercaseFields(cloned, [
    'title',
    'code',
    'type',
    'purpose',
    'assetCategory',
    'brand',
    'model',
    'serialNumber',
    'licensePlate',
    'condition',
    'patrimonyCode',
    'city',
    'state',
    'address',
    'district',
    'number',
    'complement',
    'description',
  ]);
}
