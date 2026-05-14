import { apiFetch } from './api';

export type ScheduleStatus = 'scheduled' | 'completed' | 'canceled';
export type SchedulePriority = 'low' | 'medium' | 'high';

export type ScheduleItem = {
  id: string;
  companyId: string;
  title: string;
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
};

export type CreateScheduleItemDto = {
  companyId: string;
  title: string;
  customerName: string;
  propertyName: string;
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

export async function getScheduleItems(companyId: string) {
  return apiFetch<ScheduleItem[]>(`/agenda?companyId=${encodeURIComponent(companyId)}`);
}

export async function createScheduleItem(data: CreateScheduleItemDto) {
  return apiFetch<ScheduleItem>('/agenda', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateScheduleItem(id: string, data: UpdateScheduleItemDto) {
  return apiFetch<ScheduleItem>(`/agenda/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteScheduleItem(id: string) {
  return apiFetch<ScheduleItem>(`/agenda/${id}`, {
    method: 'DELETE',
  });
}
