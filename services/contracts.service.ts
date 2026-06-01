import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type ContractStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'CANCELED'
  | 'FINISHED'
  | 'DELETED';

export type ContractStatusReasonType = 'CANCELED' | 'DELETED';

export type ContractRenewalRecord = {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  previousRentValue: number;
  newRentValue: number;
  notes?: string;
};

export type Contract = {
  id: string;
  companyId: string;
  propertyId: string;
  tenantId: string;

  propertyName?: string | null;
  tenantName?: string | null;

  startDate: string;
  endDate: string;
  rentValue: number | string;

  status: ContractStatus;

  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: ContractStatusReasonType | null;
  statusReasonAt?: string | null;

  isTemporaryRental: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;

  renewedAt?: string | null;
  renewalHistory?: ContractRenewalRecord[] | null;

  finishedAt?: string | null;
  finishReason?: string | null;

  createdAt: string;
  updatedAt: string;

  property?: {
    id: string;
    title: string;
    rentalValue?: number | string | null;
  };

  tenant?: {
    id: string;
    name: string;
    document: string;
  };
};

export type CreateContractDto = {
  propertyId: string;
  tenantId: string;

  propertyName?: string;
  tenantName?: string;

  startDate: string;
  endDate: string;
  rentValue: number;

  status?: ContractStatus;

  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: ContractStatusReasonType | null;
  statusReasonAt?: string | null;

  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;

  renewedAt?: string | null;
  renewalHistory?: ContractRenewalRecord[];

  finishedAt?: string | null;
  finishReason?: string | null;
};

export type UpdateContractDto = Partial<CreateContractDto>;

export async function getContracts(companyId: string) {
  void companyId;
  return apiFetch<Contract[]>('/contratos');
}

export async function getContractById(id: string) {
  return apiFetch<Contract>(`/contratos/${id}`);
}

export async function createContract(data: CreateContractDto) {
  return apiFetch<Contract>('/contratos', {
    method: 'POST',
    body: JSON.stringify(normalizeContractPayload(data)),
  });
}

export async function updateContract(id: string, data: UpdateContractDto) {
  return apiFetch<Contract>(`/contratos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeContractPayload(data)),
  });
}

export async function cancelContract(id: string, reason: string) {
  return apiFetch<Contract>(`/contratos/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason.toLocaleUpperCase('pt-BR').trim() }),
  });
}

export async function softDeleteContract(id: string, reason: string) {
  return apiFetch<Contract>(`/contratos/${id}/excluir`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason.toLocaleUpperCase('pt-BR').trim() }),
  });
}

export async function finishContract(id: string, reason: string) {
  return apiFetch<Contract>(`/contratos/${id}/finalizar`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason.toLocaleUpperCase('pt-BR').trim() }),
  });
}

export async function renewContract(
  id: string,
  data: {
    endDate: string;
    rentValue: number;
    notes?: string;
  },
) {
  return apiFetch<Contract>(`/contratos/${id}/renovar`, {
    method: 'POST',
    body: JSON.stringify(uppercaseFields(data, ['notes'])),
  });
}

export async function deleteContract(id: string) {
  return apiFetch<Contract>(`/contratos/${id}`, {
    method: 'DELETE',
  });
}

function normalizeContractPayload<
  TData extends CreateContractDto | UpdateContractDto,
>(data: TData) {
  return uppercaseFields(data, [
    'propertyName',
    'tenantName',
    'statusReason',
    'finishReason',
  ]);
}
