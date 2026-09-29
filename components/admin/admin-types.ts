import type { ReactNode } from "react";
import type {
  AdminCommercialHistory,
  AdminCompany,
  AdminSummary,
  AdminUser,
  AdminUserRole,
  CompanyAccessState,
  SubscriptionStatus,
} from "@/services/admin.service";
import type {
  SystemErrorLog,
  SystemErrorLogSummary,
} from "@/services/system-logs.service";
import { getWhatsAppUrl } from "@/services/whatsapp.service";

export type {
  AdminCommercialHistory,
  AdminCompany,
  AdminSummary,
  AdminUser,
  AdminUserRole,
  CompanyAccessState,
  SubscriptionStatus,
  SystemErrorLog,
  SystemErrorLogSummary,
};

export type AdminTab = "empresas" | "usuarios" | "logs" | "avancado";
export type StatusFilter = "all" | "active" | "inactive";
export type CommercialFilter = "all" | SubscriptionStatus;
export type DueFilter = "all" | "today" | "threeDays" | "sevenDays" | "expired" | "noDueDate";
export type QuickCommercialAction = "extend7" | "extend15" | "active30" | "active365" | "suspend";

export type ConfirmationDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

export type TrialCompany = {
  subscriptionStatus?: AdminCompany["subscriptionStatus"];
  trialEndsAt?: string | null;
  trialExtendedUntil?: string | null;
  subscriptionEndsAt?: string | null;
  accessState?: AdminCompany["accessState"];
};

export const roleLabels: Record<string, string> = {
  SYSTEM_OWNER: "Dono do sistema",
  OWNER: "Dono da empresa",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Usuário",
};

export const adminRoleOptions: AdminUserRole[] = [
  "SYSTEM_OWNER",
  "OWNER",
  "ADMIN",
  "MANAGER",
  "USER",
];

export const commercialStatusOptions: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELED",
];

export function isSystemOwnerRole(role?: string | null): boolean {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}

export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCompanyName(
  company?: { tradeName?: string | null; companyName?: string | null } | null,
): string {
  return company?.tradeName || company?.companyName || "Empresa não informada";
}

export function getSubscriptionLabel(company?: TrialCompany | null): string {
  const status = company?.subscriptionStatus;
  if (status === "ACTIVE") return "Plano ativo";
  if (status === "TRIAL") return "Teste (Trial)";
  if (status === "EXPIRED") return "Vencido";
  if (status === "SUSPENDED") return "Suspenso";
  if (status === "CANCELED") return "Cancelado";
  return "Não definido";
}

export function getTrialAccessEndsAt(company: TrialCompany): string | null {
  return (
    company.accessState?.endsAt ||
    company.trialExtendedUntil ||
    company.subscriptionEndsAt ||
    company.trialEndsAt ||
    null
  );
}

export function getTrialDaysRemaining(company: TrialCompany): number | null {
  if (company.accessState?.daysRemaining !== undefined) {
    return company.accessState.daysRemaining;
  }
  const endsAt = getTrialAccessEndsAt(company);
  if (!endsAt) return null;
  const targetDate = new Date(endsAt);
  if (Number.isNaN(targetDate.getTime())) return null;
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getTrialDaysLabel(company: TrialCompany): string {
  const days = getTrialDaysRemaining(company);
  if (days === null) return "Sem data limite";
  if (days < 0) return `Vencido há ${Math.abs(days)} dia(s)`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `${days} dia(s) restantes`;
}

export function getTrialDateInputValue(company: TrialCompany): string {
  const endsAt = getTrialAccessEndsAt(company);
  if (!endsAt) return "";
  return endsAt.slice(0, 10);
}

export function getOperationalCompanyRecords(company: AdminCompany): number {
  return (
    (company._count?.people ?? 0) +
    (company._count?.properties ?? 0) +
    (company._count?.contracts ?? 0)
  );
}

export function matchesDueFilter(company: TrialCompany, filter: DueFilter): boolean {
  if (filter === "all") return true;
  const days = getTrialDaysRemaining(company);
  if (filter === "noDueDate") return days === null;
  if (days === null) return false;
  if (filter === "today") return days === 0;
  if (filter === "threeDays") return days >= 0 && days <= 3;
  if (filter === "sevenDays") return days >= 0 && days <= 7;
  if (filter === "expired") return days < 0;
  return true;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function getWhatsappMessageUrl(
  company: {
    tradeName?: string | null;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
  } & TrialCompany,
  type: "welcome" | "due" | "expired",
): string | null {
  const phone = company.phone;
  if (!phone) return null;
  const name = company.tradeName || company.companyName || "Cliente Contrx";
  const days = getTrialDaysRemaining(company);
  const endsAt = getTrialAccessEndsAt(company);
  const formattedEndsAt = endsAt ? formatDate(endsAt) : "em breve";

  let message = "";
  if (type === "welcome") {
    message = `Olá! Tudo bem? Passando para dar as boas-vindas ao Contrx para a equipe da ${name}! Se precisar de qualquer auxílio com o sistema de locações, contratos ou financeiro, estou à disposição por aqui.`;
  } else if (type === "due") {
    message = `Olá! Notamos que o acesso da ${name} ao Contrx tem vencimento previsto para ${formattedEndsAt}${days !== null ? ` (aproximadamente ${days} dias restantes)` : ""}. Gostaria de renovar seu plano para manter todas as rotinas em dia?`;
  } else if (type === "expired") {
    message = `Olá! Verificamos que o período de acesso da ${name} no Contrx expirou. Podemos emitir a ativação para que você continue usando sem nenhuma interrupção?`;
  }

  return getWhatsAppUrl({ phone, message });
}
