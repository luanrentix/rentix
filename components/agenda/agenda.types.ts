import type { ScheduleItem as ApiScheduleItem } from "@/services/schedule.service";
import type { Person as ApiPerson } from "@/services/people.service";
import type { Property as ApiProperty } from "@/services/properties.service";

export type ScheduleStatus = "scheduled" | "completed" | "canceled";
export type SchedulePriority = "low" | "medium" | "high";
export type CalendarViewMode = "month" | "week" | "day";
export type ThemeMode = "light" | "black" | "graphite";

export type ScheduleItem = {
  id: string;
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
  notes: string;
  person?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
};

export type ScheduleFormData = Omit<ScheduleItem, "id" | "person">;

export type AgendaPerson = {
  id: string;
  name: string;
  document: string;
  phone?: string | null;
};

export type AgendaProperty = {
  id: string;
  name: string;
  address: string;
};

export type ActionMenuPosition = {
  top: number;
  left: number;
};

export const typeOptions = [
  "Vistoria",
  "Contrato",
  "Financeiro",
  "Entrega",
  "Manutenção",
  "Reunião",
  "Cobrança",
  "Outros",
];

export const responsibleOptions = [
  "Equipe Operacional",
  "Comercial",
  "Financeiro",
  "Atendimento",
  "Manutenção",
  "Administrativo",
];

export const reminderOptions = [
  "Sem lembrete",
  "No início do dia",
  "15 minutos antes",
  "30 minutos antes",
  "1 hora antes",
  "1 dia antes",
];

export const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const statusLabels: Record<ScheduleStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  canceled: "Cancelado",
};

export const priorityLabels: Record<SchedulePriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export function formatDateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createDateFromInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToInputValue(value: string, amount: number) {
  const date = createDateFromInputValue(value);
  date.setDate(date.getDate() + amount);
  return formatDateToInputValue(date);
}

export function getReadableDate(value: string) {
  return createDateFromInputValue(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getShortDate(value: string) {
  return createDateFromInputValue(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getWeekRangeLabel(days: Date[]) {
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  if (!firstDay || !lastDay) return "";

  return `${getShortDate(formatDateToInputValue(firstDay))} - ${getShortDate(
    formatDateToInputValue(lastDay),
  )}`;
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function mapApiScheduleItemToScheduleItem(item: ApiScheduleItem): ScheduleItem {
  return {
    id: item.id,
    title: item.title,
    personId: item.personId || undefined,
    propertyId: item.propertyId || undefined,
    customerName: item.customerName || "",
    propertyName: item.propertyName || "",
    date: item.date.slice(0, 10),
    time: item.time,
    type: item.type,
    status: item.status,
    priority: item.priority,
    responsibleName: item.responsibleName,
    reminder: item.reminder,
    notes: item.notes || "",
    person: item.person || null,
  };
}

export function mapApiPersonToAgendaPerson(person: ApiPerson): AgendaPerson {
  return {
    id: person.id,
    name: person.name,
    document: person.document || "",
    phone: person.phone || null,
  };
}

export function mapApiPropertyToAgendaProperty(property: ApiProperty): AgendaProperty {
  const address = [
    property.address,
    property.number,
    property.district,
    property.city,
    property.state,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: property.id,
    name: property.title,
    address,
  };
}

export function getStatusBadgeClass(status: ScheduleStatus, isBlackTheme: boolean) {
  if (status === "completed") {
    return isBlackTheme
      ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "canceled") {
    return isBlackTheme
      ? "border-red-900/60 bg-red-950/40 text-red-300"
      : "border-red-200 bg-red-50 text-red-700";
  }

  return isBlackTheme
    ? "border-orange-900/60 bg-orange-950/40 text-orange-300"
    : "border-orange-200 bg-orange-50 text-orange-700";
}

export function getPriorityBadgeClass(priority: SchedulePriority, isBlackTheme: boolean) {
  if (priority === "high") {
    return isBlackTheme
      ? "border-red-900/60 bg-red-950/40 text-red-300"
      : "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "low") {
    return isBlackTheme
      ? "border-sky-900/60 bg-sky-950/40 text-sky-300"
      : "border-sky-200 bg-sky-50 text-sky-700";
  }

  return isBlackTheme
    ? "border-amber-900/60 bg-amber-950/40 text-amber-300"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export function getTypeAccentClass(type: string, isBlackTheme: boolean) {
  const normalizedType = normalizeText(type);

  if (normalizedType.includes("financeiro") || normalizedType.includes("cobranca")) {
    return isBlackTheme
      ? "border-l-emerald-400 bg-emerald-950/20"
      : "border-l-emerald-500 bg-emerald-50/70";
  }

  if (normalizedType.includes("contrato")) {
    return isBlackTheme
      ? "border-l-violet-400 bg-violet-950/20"
      : "border-l-violet-500 bg-violet-50/70";
  }

  if (normalizedType.includes("manutencao")) {
    return isBlackTheme
      ? "border-l-sky-400 bg-sky-950/20"
      : "border-l-sky-500 bg-sky-50/70";
  }

  if (normalizedType.includes("entrega")) {
    return isBlackTheme
      ? "border-l-amber-400 bg-amber-950/20"
      : "border-l-amber-500 bg-amber-50/70";
  }

  return isBlackTheme
    ? "border-l-orange-400 bg-orange-950/20"
    : "border-l-orange-500 bg-orange-50/70";
}
