import { apiFetch } from './api';
import { uppercaseFields } from './text-normalization';

export type ScheduleStatus = 'scheduled' | 'completed' | 'canceled';
export type SchedulePriority = 'low' | 'medium' | 'high';

export type ScheduleItem = {
  id: string;
  companyId: string;
  title: string;
  personId?: string | null;
  propertyId?: string | null;
  customerName: string;
  propertyName: string;
  date: string;
  time: string;
  type: string;
  status: ScheduleStatus;
  priority: SchedulePriority;
  responsibleName: string;
  reminder: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  person?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
};

export type CreateScheduleItemDto = {
  title: string;
  personId?: string | null;
  propertyId?: string | null;
  customerName?: string;
  propertyName?: string;
  date: string;
  time: string;
  type: string;
  status?: ScheduleStatus;
  priority?: SchedulePriority;
  responsibleName: string;
  reminder: string;
  notes?: string;
};

export type UpdateScheduleItemDto = Partial<CreateScheduleItemDto>;

export async function getScheduleItems(inicio?: string, fim?: string) {
  const params = new URLSearchParams();
  params.set('_t', String(Date.now()));
  if (inicio) params.set('inicio', inicio);
  if (fim) params.set('fim', fim);

  return apiFetch<ScheduleItem[]>(`/agenda?${params.toString()}`);
}

export async function getPendingScheduleReminders() {
  return apiFetch<ScheduleItem[]>(`/agenda/lembretes-pendentes?_t=${Date.now()}`);
}

export async function createScheduleItem(data: CreateScheduleItemDto) {
  return apiFetch<ScheduleItem>('/agenda', {
    method: 'POST',
    body: JSON.stringify(normalizeSchedulePayload(data)),
  });
}

export async function updateScheduleItem(id: string, data: UpdateScheduleItemDto) {
  return apiFetch<ScheduleItem>(`/agenda/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeSchedulePayload(data)),
  });
}

export async function deleteScheduleItem(id: string) {
  return apiFetch<ScheduleItem>(`/agenda/${id}`, {
    method: 'DELETE',
  });
}

function normalizeSchedulePayload<
  TData extends CreateScheduleItemDto | UpdateScheduleItemDto,
>(data: TData) {
  return uppercaseFields(data, [
    'title',
    'customerName',
    'propertyName',
    'type',
    'responsibleName',
    'reminder',
    'notes',
  ]);
}
