"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  CheckCircle2,
  CircleOff,
  Clock3,
  Database,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminCompanies,
  getAdminCompanyCommercialHistory,
  getAdminSummary,
  getAdminUsers,
  reprocessAdminCommercialExpirations,
  updateAdminCompany,
  updateAdminUser,
  type AdminCommercialHistory,
  type AdminCompany,
  type AdminSummary,
  type AdminUser,
  type AdminUserRole,
  type SubscriptionStatus,
} from "@/services/admin.service";
import { getWhatsAppUrl } from "@/services/whatsapp.service";
import Link from "next/link";

const roleLabels: Record<string, string> = {
  SYSTEM_OWNER: "Dono do sistema",
  OWNER: "Dono da empresa",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Usuário",
};

function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const adminRoleOptions: AdminUserRole[] = [
  "SYSTEM_OWNER",
  "OWNER",
  "ADMIN",
  "MANAGER",
  "USER",
];

type StatusFilter = "all" | "active" | "inactive";
type CommercialFilter = "all" | SubscriptionStatus;
type DueFilter = "all" | "today" | "threeDays" | "sevenDays" | "expired" | "noDueDate";
type QuickCommercialAction = "extend7" | "extend15" | "active30" | "active365" | "suspend";
type ConfirmationDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

const commercialStatusOptions: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELED",
];

type TrialCompany = {
  subscriptionStatus?: AdminCompany["subscriptionStatus"];
  trialEndsAt?: string | null;
  trialExtendedUntil?: string | null;
  subscriptionEndsAt?: string | null;
  accessState?: AdminCompany["accessState"];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTrialAccessEndsAt(company: TrialCompany) {
  if (company.accessState) {
    return company.accessState.endsAt;
  }

  if (company.subscriptionStatus === "ACTIVE") {
    return company.subscriptionEndsAt || null;
  }

  if (company.subscriptionStatus === "TRIAL") {
    return company.trialExtendedUntil || company.trialEndsAt || null;
  }

  return company.subscriptionEndsAt || company.trialExtendedUntil || company.trialEndsAt || null;
}

function getTrialDaysRemaining(company: TrialCompany) {
  if (company.accessState) {
    return company.accessState.daysRemaining;
  }

  const trialAccessEndsAt = getTrialAccessEndsAt(company);

  if (!trialAccessEndsAt) return null;

  const remainingMilliseconds =
    new Date(trialAccessEndsAt).getTime() - new Date().getTime();

  return Math.ceil(remainingMilliseconds / 86_400_000);
}

function getTrialDateInputValue(company: TrialCompany) {
  const trialAccessEndsAt = getTrialAccessEndsAt(company);

  if (!trialAccessEndsAt) return "";

  return toDateInputValue(new Date(trialAccessEndsAt));
}

function getTrialDaysLabel(company: TrialCompany) {
  const daysRemaining = getTrialDaysRemaining(company);

  if (daysRemaining === null) return "Sem vencimento";
  if (daysRemaining < 0) return `Vencido há ${Math.abs(daysRemaining)} dia${Math.abs(daysRemaining) === 1 ? "" : "s"}`;
  if (daysRemaining === 0) return "Vence hoje";
  if (daysRemaining === 1) return "1 dia restante";

  return `${daysRemaining} dias restantes`;
}

function matchesDueFilter(company: TrialCompany, dueFilter: DueFilter) {
  if (dueFilter === "all") return true;

  const daysRemaining = getTrialDaysRemaining(company);

  if (dueFilter === "noDueDate") return daysRemaining === null;
  if (daysRemaining === null) return false;
  if (dueFilter === "expired") return daysRemaining <= 0;
  if (dueFilter === "today") return daysRemaining === 0;
  if (dueFilter === "threeDays") return daysRemaining <= 3;
  if (dueFilter === "sevenDays") return daysRemaining <= 7;

  return true;
}

function getSubscriptionLabel(company: { subscriptionStatus?: SubscriptionStatus }) {
  const labels: Record<SubscriptionStatus, string> = {
    TRIAL: "Teste",
    ACTIVE: "Ativo",
    EXPIRED: "Vencido",
    SUSPENDED: "Suspenso",
    CANCELED: "Cancelado",
  };

  return company.subscriptionStatus
    ? labels[company.subscriptionStatus] || company.subscriptionStatus
    : "Sem status";
}

function getCompanyName(company: AdminCompany | AdminUser["company"]) {
  return company.tradeName || company.companyName || "Empresa sem nome";
}

function getWhatsappUrl(company: AdminCompany | AdminUser["company"], messageType: "welcome" | "due" | "expired") {
  const phoneDigits = (company.phone || "").replace(/\D/g, "");

  if (!phoneDigits) return "";

  const companyName = getCompanyName(company);
  const messages = {
    welcome: `Olá, ${companyName}! Seja bem-vindo ao Contrx. Seu acesso profissional já está disponível para configuração e uso.`,
    due: `Olá, ${companyName}! Passando para lembrar sobre o vencimento do seu acesso ao Contrx. Podemos ajudar com a renovação ou prorrogação.`,
    expired: `Olá, ${companyName}! Identificamos que seu acesso ao Contrx está vencido. Fale conosco para regularizar e continuar usando o sistema.`,
  };

  return getWhatsAppUrl({
    phone: phoneDigits,
    message: messages[messageType],
  });
}

function getOperationalCompanyRecords(company: AdminCompany) {
  return (
    company._count.people +
    company._count.properties +
    company._count.contracts
  );
}

function isSystemOwnerRole(role?: string | null) {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("empresas");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [updatingCompanyId, setUpdatingCompanyId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [commercialFilter, setCommercialFilter] = useState<CommercialFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [hideEmptyCompanies, setHideEmptyCompanies] = useState(true);
  const [historyCompany, setHistoryCompany] = useState<AdminCompany | null>(null);
  const [commercialHistory, setCommercialHistory] = useState<AdminCommercialHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [openUserActionsId, setOpenUserActionsId] = useState("");
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null);
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null,
  );

  const isSystemOwner = isSystemOwnerRole(user?.role);
  const normalizedSearchTerm = normalizeText(searchTerm);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isSystemOwner) {
      setIsLoading(false);
      router.replace("/dashboard");
      return;
    }

    loadAdminData();
  }, [isAuthLoading, isSystemOwner, router]);

  async function loadAdminData() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [nextSummary, nextUsers, nextCompanies] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(),
        getAdminCompanies(),
      ]);

      setSummary(nextSummary);
      setUsers(nextUsers);
      setCompanies(nextCompanies);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o painel administrativo.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAdminDataAfterChange(message: string) {
    setSuccessMessage(message);
    await loadAdminData();
  }

  function requestConfirmation(options: ConfirmationDialogState) {
    setConfirmationDialog(options);

    return new Promise<boolean>((resolve) => {
      confirmationResolverRef.current = resolve;
    });
  }

  function resolveConfirmation(confirmed: boolean) {
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
    setConfirmationDialog(null);
  }

  async function handleUpdateUserRole(userId: string, role: AdminUserRole) {
    const confirmed = await requestConfirmation({
      title: "Alterar perfil de usuário",
      message: `Deseja realmente alterar o perfil deste usuário para ${roleLabels[role] || role}?`,
      confirmLabel: "Alterar",
    });

    if (!confirmed) return;

    try {
      setUpdatingUserId(userId);
      setErrorMessage("");
      const updatedUser = await updateAdminUser(userId, { role });
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === userId ? updatedUser : item)),
      );
      await refreshAdminDataAfterChange("Perfil do usuário atualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o perfil do usuário.",
      );
    } finally {
      setUpdatingUserId("");
    }
  }

  async function handleToggleUserStatus(userToUpdate: AdminUser) {
    const confirmed = await requestConfirmation({
      title: userToUpdate.isActive ? "Inativar usuário" : "Ativar usuário",
      message: `Deseja realmente ${userToUpdate.isActive ? "inativar" : "ativar"} o usuário "${userToUpdate.name}"?`,
      confirmLabel: userToUpdate.isActive ? "Inativar" : "Ativar",
      tone: userToUpdate.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      setUpdatingUserId(userToUpdate.id);
      setErrorMessage("");
      const updatedUser = await updateAdminUser(userToUpdate.id, {
        isActive: !userToUpdate.isActive,
      });
      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === userToUpdate.id ? updatedUser : item,
        ),
      );
      await refreshAdminDataAfterChange(
        updatedUser.isActive ? "Usuário ativado." : "Usuário inativado.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do usuário.",
      );
    } finally {
      setUpdatingUserId("");
    }
  }

  async function handleToggleCompanyStatus(companyToUpdate: AdminCompany) {
    const confirmed = await requestConfirmation({
      title: companyToUpdate.isActive ? "Inativar empresa" : "Ativar empresa",
      message: `Deseja realmente ${companyToUpdate.isActive ? "inativar" : "ativar"} a empresa "${companyToUpdate.tradeName}"?`,
      confirmLabel: companyToUpdate.isActive ? "Inativar" : "Ativar",
      tone: companyToUpdate.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      setUpdatingCompanyId(companyToUpdate.id);
      setErrorMessage("");
      const updatedCompany = await updateAdminCompany(companyToUpdate.id, {
        isActive: !companyToUpdate.isActive,
      });
      setCompanies((currentCompanies) =>
        currentCompanies.map((company) =>
          company.id === companyToUpdate.id ? updatedCompany : company,
        ),
      );
      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.company.id === updatedCompany.id
            ? {
                ...item,
                company: {
                  ...item.company,
                  isActive: updatedCompany.isActive,
                },
              }
            : item,
        ),
      );
      await refreshAdminDataAfterChange(
        updatedCompany.isActive ? "Empresa ativada." : "Empresa inativada.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status da empresa.",
      );
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleExtendCompanyTrial(companyToUpdate: AdminCompany) {
    const confirmed = await requestConfirmation({
      title: "Prorrogar teste",
      message: "Prorrogar o teste desta empresa por 7 dias?",
      confirmLabel: "Prorrogar",
    });

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingCompanyId(companyToUpdate.id);
      setErrorMessage("");
      const updatedCompany = await updateAdminCompany(companyToUpdate.id, {
        trialExtensionDays: 7,
      });
      setCompanies((currentCompanies) =>
        currentCompanies.map((company) =>
          company.id === companyToUpdate.id ? updatedCompany : company,
        ),
      );
      await refreshAdminDataAfterChange("Teste prorrogado por 7 dias.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel prorrogar o teste da empresa.",
      );
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleUpdateCompanyAccessEndDate(
    company: TrialCompany & { id: string },
    accessEndsAt: string,
  ) {
    if (!accessEndsAt) return;

    const statusLabel = getSubscriptionLabel(company);

    const confirmed = await requestConfirmation({
      title: "Alterar vencimento",
      message: `Alterar o vencimento comercial de ${statusLabel} para ${formatDate(accessEndsAt)}?`,
      confirmLabel: "Alterar",
    });

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingCompanyId(company.id);
      setErrorMessage("");

      const updatedCompany = await updateAdminCompany(
        company.id,
        company.subscriptionStatus === "ACTIVE"
          ? {
              subscriptionStatus: "ACTIVE",
              subscriptionEndsAt: accessEndsAt,
            }
          : {
              trialEndsAt: accessEndsAt,
            },
      );

      syncUpdatedCompany(updatedCompany);

      await refreshAdminDataAfterChange("Vencimento da empresa atualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o vencimento da empresa.",
      );
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleUpdateCompanyCommercialStatus(
    company: TrialCompany & { id: string },
    subscriptionStatus: SubscriptionStatus,
  ) {
    if (company.subscriptionStatus === subscriptionStatus) return;

    const confirmed = await requestConfirmation({
      title: "Alterar status comercial",
      message: `Alterar o status comercial para ${getSubscriptionLabel({ subscriptionStatus })}?`,
      confirmLabel: "Alterar",
      tone:
        subscriptionStatus === "SUSPENDED" || subscriptionStatus === "CANCELED"
          ? "danger"
          : "default",
    });

    if (!confirmed) {
      return;
    }

    const payload =
      subscriptionStatus === "ACTIVE"
        ? {
            subscriptionStatus,
            subscriptionEndsAt:
              company.subscriptionEndsAt || toDateInputValue(addDays(new Date(), 30)),
          }
        : subscriptionStatus === "TRIAL"
          ? {
              subscriptionStatus,
              trialEndsAt:
                company.trialExtendedUntil ||
                company.trialEndsAt ||
                toDateInputValue(addDays(new Date(), 30)),
            }
          : subscriptionStatus === "SUSPENDED" || subscriptionStatus === "CANCELED"
            ? {
                subscriptionStatus,
                isActive: false,
              }
            : {
                subscriptionStatus,
              };

    try {
      setUpdatingCompanyId(company.id);
      setErrorMessage("");
      const updatedCompany = await updateAdminCompany(company.id, payload);

      syncUpdatedCompany(updatedCompany);
      await refreshAdminDataAfterChange("Status comercial atualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status comercial.",
      );
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleQuickCommercialAction(
    company: TrialCompany & { id: string },
    action: QuickCommercialAction,
  ) {
    const actionLabels: Record<QuickCommercialAction, string> = {
      extend7: "prorrogar o teste por 7 dias",
      extend15: "prorrogar o teste por 15 dias",
      active30: "ativar o plano por 30 dias",
      active365: "ativar o plano por 1 ano",
      suspend: "suspender a empresa",
    };

    const confirmed = await requestConfirmation({
      title: "Confirmar ação comercial",
      message: `Confirmar ação comercial: ${actionLabels[action]}?`,
      confirmLabel: "Confirmar",
      tone: action === "suspend" ? "danger" : "default",
    });

    if (!confirmed) {
      return;
    }

    const payload =
      action === "extend7"
        ? { trialExtensionDays: 7, note: "Teste prorrogado por 7 dias." }
        : action === "extend15"
          ? { trialExtensionDays: 15, note: "Teste prorrogado por 15 dias." }
          : action === "active30"
            ? {
                subscriptionStatus: "ACTIVE" as SubscriptionStatus,
                subscriptionEndsAt: toDateInputValue(addDays(new Date(), 30)),
                note: "Plano ativado por 30 dias.",
              }
            : action === "active365"
              ? {
                  subscriptionStatus: "ACTIVE" as SubscriptionStatus,
                  subscriptionEndsAt: toDateInputValue(addDays(new Date(), 365)),
                  note: "Plano ativado por 1 ano.",
                }
              : {
                  subscriptionStatus: "SUSPENDED" as SubscriptionStatus,
                  isActive: false,
                  note: "Empresa suspensa pelo painel master.",
                };

    try {
      setUpdatingCompanyId(company.id);
      setErrorMessage("");
      const updatedCompany = await updateAdminCompany(company.id, payload);
      syncUpdatedCompany(updatedCompany);
      await refreshAdminDataAfterChange("Ação comercial aplicada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar a ação comercial.",
      );
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleOpenCommercialHistory(company: AdminCompany) {
    try {
      setHistoryCompany(company);
      setIsHistoryLoading(true);
      setCommercialHistory([]);
      const history = await getAdminCompanyCommercialHistory(company.id);
      setCommercialHistory(history);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o histórico comercial.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleReprocessCommercialExpirations() {
    const confirmed = await requestConfirmation({
      title: "Reprocessar vencimentos",
      message:
        "Reprocessar vencimentos agora? Empresas vencidas podem ser marcadas como vencidas automaticamente.",
      confirmLabel: "Reprocessar",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      const result = await reprocessAdminCommercialExpirations();
      await refreshAdminDataAfterChange(
        `${result.expired} empresa(s) vencida(s) em ${result.processed} processada(s).`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível reprocessar os vencimentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function syncUpdatedCompany(updatedCompany: AdminCompany) {
    setCompanies((currentCompanies) =>
      currentCompanies.map((company) =>
        company.id === updatedCompany.id ? updatedCompany : company,
      ),
    );
    setUsers((currentUsers) =>
      currentUsers.map((item) =>
        item.company.id === updatedCompany.id
          ? {
              ...item,
              company: {
                ...item.company,
                isActive: updatedCompany.isActive,
                subscriptionStatus: updatedCompany.subscriptionStatus,
                trialStartsAt: updatedCompany.trialStartsAt,
                trialEndsAt: updatedCompany.trialEndsAt,
                trialExtendedUntil: updatedCompany.trialExtendedUntil,
                subscriptionEndsAt: updatedCompany.subscriptionEndsAt,
              },
            }
          : item,
      ),
    );
  }

  const roleOptions = useMemo(() => {
    const roles = new Set<string>(adminRoleOptions);

    summary?.usersByRole.forEach((item) => roles.add(item.role));
    users.forEach((item) => roles.add(item.role));

    return Array.from(roles);
  }, [summary, users]);

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      if (roleFilter !== "all" && item.role !== roleFilter) return false;
      if (
        commercialFilter !== "all" &&
        item.company.subscriptionStatus !== commercialFilter
      ) {
        return false;
      }
      if (!matchesDueFilter(item.company, dueFilter)) return false;
      if (!normalizedSearchTerm) return true;

      return [
        item.name,
        item.email,
        item.role,
        getCompanyName(item.company),
        item.company.email || "",
      ].some((value) => normalizeText(value).includes(normalizedSearchTerm));
    });
  }, [commercialFilter, dueFilter, normalizedSearchTerm, roleFilter, statusFilter, users]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (statusFilter === "active" && !company.isActive) return false;
      if (statusFilter === "inactive" && company.isActive) return false;
      if (
        commercialFilter !== "all" &&
        company.subscriptionStatus !== commercialFilter
      ) {
        return false;
      }
      if (!matchesDueFilter(company, dueFilter)) return false;
      if (!normalizedSearchTerm) return true;

      return [
        company.tradeName,
        company.companyName || "",
        company.email || "",
        company.document || "",
        company.phone || "",
      ].some((value) => normalizeText(value).includes(normalizedSearchTerm));
    });
  }, [commercialFilter, companies, dueFilter, normalizedSearchTerm, statusFilter]);

  const topCompanies = useMemo(() => {
    const visibleCompanies = hideEmptyCompanies
      ? filteredCompanies.filter(
          (company) => getOperationalCompanyRecords(company) > 0,
        )
      : filteredCompanies;

    return [...visibleCompanies].sort(
      (firstCompany, secondCompany) =>
        getOperationalCompanyRecords(secondCompany) -
        getOperationalCompanyRecords(firstCompany),
    );
  }, [filteredCompanies, hideEmptyCompanies]);

  const inactiveTotal =
    (summary?.inactiveUsers ?? 0) + (summary?.inactiveCompanies ?? 0);
  const totalOperationalRecords = companies.reduce(
    (total, company) => total + getOperationalCompanyRecords(company),
    0,
  );
  const operationalCompanies = companies.filter(
    (company) => getOperationalCompanyRecords(company) > 0,
  );
  const operationalCompaniesTotal = operationalCompanies.length;
  const activeOperationalCompanies = operationalCompanies.filter(
    (company) => company.isActive,
  ).length;
  const inactiveOperationalCompanies =
    operationalCompaniesTotal - activeOperationalCompanies;
  const emptyCompaniesTotal = filteredCompanies.filter(
    (company) => getOperationalCompanyRecords(company) === 0,
  ).length;

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setCommercialFilter("all");
    setDueFilter("all");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7fb] px-3 py-4 text-slate-950 lg:px-5">
      {confirmationDialog && (
        <ConfirmationModal
          dialog={confirmationDialog}
          onCancel={() => resolveConfirmation(false)}
          onConfirm={() => resolveConfirmation(true)}
        />
      )}

      <div className="mx-auto w-full max-w-[1200px] space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 border-b border-slate-100 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Painel master
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {activeOperationalCompanies} empresa ativa
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Painel administrativo
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Visão organizada de empresas, usuários e dados operacionais ativos
                na plataforma.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200 transition shadow-sm"
              >
                ⬅️ Voltar ao sistema
              </Link>
              <Link
                href="/admin/chamados"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                💬 Chamados
              </Link>
              <button
                type="button"
                onClick={loadAdminData}
                disabled={!isSystemOwner || isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar dados
              </button>
              <button
                type="button"
                onClick={handleReprocessCommercialExpirations}
                disabled={!isSystemOwner || isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reprocessar vencimentos
              </button>
            </div>
          </div>
        </section>

        {!isSystemOwner ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-xl font-black">Acesso restrito</h2>
                <p className="mt-2 text-sm font-bold">
                  Apenas usuários com perfil Dono do sistema podem acessar esta visão.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-6">
              <MetricCard
                icon={<UsersRound className="h-5 w-5" />}
                label="Usuários"
                value={summary?.totalUsers ?? 0}
                detail={`${summary?.activeUsers ?? 0} ativos no sistema`}
                tone="sky"
              />
              <MetricCard
                icon={<Building2 className="h-5 w-5" />}
                label="Empresas"
                value={operationalCompaniesTotal}
                detail={`${activeOperationalCompanies} ativa com dados reais`}
                tone="orange"
              />
              <MetricCard
                icon={<Settings2 className="h-5 w-5" />}
                label="Dados operacionais"
                value={totalOperationalRecords}
                detail="Pessoas, bens/ativos e contratos"
                tone="emerald"
              />
              <MetricCard
                icon={<XCircle className="h-5 w-5" />}
                label="Inativos"
                value={inactiveTotal}
                detail="Usuários e empresas"
                tone="red"
              />
            </section>
            {errorMessage && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {errorMessage}
              </section>
            )}

            {successMessage && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {successMessage}
              </section>
            )}

            {/* Navegação por Abas do Painel Administrativo */}
            <div className="flex border-b border-slate-100 bg-white gap-2 overflow-x-auto shrink-0 mb-6 p-1 rounded-2xl shadow-sm">
              {[
                { id: "empresas", label: "Empresas", icon: "🏢" },
                { id: "usuarios", label: "Usuários", icon: "👥" },
                { id: "avancado", label: "Avançado & Diagnóstico", icon: "⚙️" }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm("");
                  }}
                  className={`py-3 px-6 font-black text-sm flex items-center gap-2 rounded-xl transition shrink-0 ${
                    activeTab === tab.id
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {(activeTab === "empresas" || activeTab === "usuarios") && (
              <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm mb-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-700 xl:w-40">
                    <SlidersHorizontal className="h-4 w-4 text-orange-600" />
                    Filtros
                  </div>

                  <label className="relative block min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar empresa, usuário, e-mail, documento ou telefone"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-11 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 xl:w-48"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Somente ativos</option>
                    <option value="inactive">Somente inativos</option>
                  </select>

                  <select
                    value={commercialFilter}
                    onChange={(event) =>
                      setCommercialFilter(event.target.value as CommercialFilter)
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 xl:w-48"
                  >
                    <option value="all">Todos comerciais</option>
                    {commercialStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getSubscriptionLabel({ subscriptionStatus: status })}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dueFilter}
                    onChange={(event) => setDueFilter(event.target.value as DueFilter)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 xl:w-52"
                  >
                    <option value="all">Todos vencimentos</option>
                    <option value="today">Vencem hoje</option>
                    <option value="threeDays">Até 3 dias</option>
                    <option value="sevenDays">Até 7 dias</option>
                    <option value="expired">Vencidos</option>
                    <option value="noDueDate">Sem vencimento</option>
                  </select>

                  <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={hideEmptyCompanies}
                      onChange={(event) => setHideEmptyCompanies(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    Ocultar sem dados
                  </label>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                    Limpar
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                  <Pill>{activeTab === "empresas" ? topCompanies.length : filteredUsers.length} registros exibidos</Pill>
                  {hideEmptyCompanies && emptyCompaniesTotal > 0 && activeTab === "empresas" && (
                    <Pill>{emptyCompaniesTotal} sem dados ocultas</Pill>
                  )}
                </div>
              </section>
            )}

            {activeTab === "empresas" && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <PanelHeader
                  title="Empresas"
                  subtitle={
                    hideEmptyCompanies
                      ? "Exibindo empresas com pessoas, bens/ativos ou contratos cadastrados"
                      : "Exibindo todas as empresas cadastradas"
                  }
                  action={<StatusSummary active={activeOperationalCompanies} inactive={inactiveOperationalCompanies} />}
                />

                <div className="grid max-h-[430px] gap-3 overflow-y-auto p-3 md:grid-cols-2">
                  {isLoading ? (
                    <EmptyPanel message="Carregando empresas..." />
                  ) : topCompanies.length === 0 ? (
                    <EmptyPanel
                      message={
                        hideEmptyCompanies && filteredCompanies.length > 0
                          ? "As empresas encontradas não possuem dados operacionais cadastrados."
                          : "Nenhuma empresa encontrada."
                      }
                    />
                  ) : (
                    topCompanies.map((company) => (
                      <CompanyCard
                        key={company.id}
                        company={company}
                        isUpdating={updatingCompanyId === company.id}
                        onExtendTrial={handleExtendCompanyTrial}
                        onToggleStatus={handleToggleCompanyStatus}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {activeTab === "usuarios" && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <PanelHeader
                  title="Usuários cadastrados"
                  subtitle={`Total atual: ${users.length}`}
                  action={<StatusSummary active={summary?.activeUsers ?? 0} inactive={summary?.inactiveUsers ?? 0} />}
                />

                <div className="max-w-full overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[960px] table-fixed text-left text-[13px]">
                    <colgroup>
                      <col className="w-[16%]" />
                      <col className="w-[13%]" />
                      <col className="w-[16%]" />
                      <col className="w-[9%]" />
                      <col className="w-[10%]" />
                      <col className="w-[11%]" />
                      <col className="w-[18%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-4">Empresa</th>
                        <th className="px-4 py-4">Usuário</th>
                        <th className="px-4 py-4">E-mail</th>
                        <th className="px-4 py-4">Perfil</th>
                        <th className="px-4 py-4">Cadastrado em</th>
                        <th className="px-4 py-4">Último acesso</th>
                        <th className="px-4 py-4">Vencimento comercial</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="sticky right-0 bg-white px-3 py-4 text-right shadow-[-10px_0_16px_rgba(248,250,252,0.88)]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                       {isLoading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8">
                            <EmptyPanel message="Carregando usuários..." />
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8">
                            <EmptyPanel message="Nenhum usuário encontrado." />
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-4">
                              <span className="block font-black text-slate-900">
                                {getCompanyName(item.company).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="block font-bold text-slate-900">
                                {item.name.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4 truncate font-bold text-slate-700">
                              {item.email}
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={item.role}
                                onChange={(event) =>
                                  handleUpdateUserRole(
                                    item.id,
                                    event.target.value as AdminUserRole,
                                  )
                                }
                                disabled={updatingUserId === item.id}
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {adminRoleOptions.map((role) => (
                                  <option key={role} value={role}>
                                    {roleLabels[role] || role}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-500">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-500">
                              {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : "Nunca"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="grid gap-1.5">
                                <input
                                  type="date"
                                  value={getTrialDateInputValue(item.company)}
                                  onChange={(event) =>
                                    handleUpdateCompanyAccessEndDate(
                                      item.company,
                                      event.target.value,
                                    )
                                  }
                                  disabled={updatingCompanyId === item.company.id}
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <TrialDaysBadge company={item.company} />
                                <select
                                  value={item.company.subscriptionStatus || "TRIAL"}
                                  onChange={(event) =>
                                    handleUpdateCompanyCommercialStatus(
                                      item.company,
                                      event.target.value as SubscriptionStatus,
                                    )
                                  }
                                  disabled={updatingCompanyId === item.company.id}
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {commercialStatusOptions.map((status) => (
                                    <option key={status} value={status}>
                                      {getSubscriptionLabel({ subscriptionStatus: status })}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge active={item.isActive} />
                            </td>
                            <td className="sticky right-0 bg-white px-3 py-4 text-right shadow-[-10px_0_16px_rgba(248,250,252,0.88)]">
                              <AdminUserActionsMenu
                                isOpen={openUserActionsId === item.id}
                                isUpdatingCompany={updatingCompanyId === item.company.id}
                                isUpdatingUser={updatingUserId === item.id}
                                item={item}
                                onClose={() => setOpenUserActionsId("")}
                                onOpenChange={(isOpen) =>
                                  setOpenUserActionsId(isOpen ? item.id : "")
                                }
                                onOpenHistory={(company) => {
                                  setOpenUserActionsId("");
                                  void handleOpenCommercialHistory(company);
                                }}
                                onQuickAction={(company, action) => {
                                  setOpenUserActionsId("");
                                  void handleQuickCommercialAction(company, action);
                                }}
                                onToggleUserStatus={(userItem) => {
                                  setOpenUserActionsId("");
                                  void handleToggleUserStatus(userItem);
                                }}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "avancado" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-2">Configurações Avançadas e Diagnóstico</h3>
                <p className="text-sm text-slate-500 mb-6">Operações críticas e métricas do sistema.</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                    <h4 className="font-bold text-slate-800 mb-1">Status da API e Banco de Dados</h4>
                    <p className="text-xs text-slate-500 font-semibold mb-3">Conexão ativa com o banco PostgreSQL local.</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Conectado & Operacional
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                    <h4 className="font-bold text-slate-800 mb-1">Recarga Forçada do Painel</h4>
                    <p className="text-xs text-slate-500 font-semibold mb-3">Sincroniza novamente todos os usuários e empresas do servidor.</p>
                    <button
                      type="button"
                      onClick={loadAdminData}
                      disabled={isLoading}
                      className="rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-black text-white transition disabled:opacity-50"
                    >
                      {isLoading ? "Recarregando..." : "Sincronizar Agora"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {historyCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                  Histórico comercial
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {getCompanyName(historyCompany)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryCompany(null);
                  setCommercialHistory([]);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Fechar histórico"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {isHistoryLoading ? (
                <EmptyPanel message="Carregando histórico..." />
              ) : commercialHistory.length === 0 ? (
                <EmptyPanel message="Nenhum histórico comercial registrado." />
              ) : (
                <div className="space-y-3">
                  {commercialHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900">
                          {item.description}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-orange-600">
                        {item.action}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

type MetricTone = "orange" | "sky" | "emerald" | "red";

type MetricCardProps = {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: MetricTone;
  value: number;
};

function MetricCard({ detail, icon, label, tone, value }: MetricCardProps) {
  const toneClassNames: Record<MetricTone, string> = {
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClassNames[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-500">{detail}</p>
    </div>
  );
}

function HeaderSignal({
  icon,
  label,
  tone = "default",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "default" | "red";
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            tone === "red" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <strong className="text-lg font-black text-slate-950">{value}</strong>
    </div>
  );
}

function PanelHeader({
  action,
  subtitle,
  title,
}: {
  action?: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function StatusSummary({ active, inactive }: { active: number; inactive: number }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-black">
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {active} ativos
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-red-100">
        <XCircle className="h-3.5 w-3.5" />
        {inactive} inativos
      </span>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-red-50 text-red-700 ring-red-100"
      }`}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function AdminUserActionsMenu({
  isOpen,
  isUpdatingCompany,
  isUpdatingUser,
  item,
  onClose,
  onOpenChange,
  onOpenHistory,
  onQuickAction,
  onToggleUserStatus,
}: {
  isOpen: boolean;
  isUpdatingCompany: boolean;
  isUpdatingUser: boolean;
  item: AdminUser;
  onClose: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onOpenHistory: (company: AdminCompany) => void;
  onQuickAction: (company: TrialCompany & { id: string }, action: QuickCommercialAction) => void;
  onToggleUserStatus: (item: AdminUser) => void;
}) {
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: 288,
  });
  const whatsappLinks = [
    { href: getWhatsappUrl(item.company, "welcome"), label: "WhatsApp boas-vindas" },
    { href: getWhatsappUrl(item.company, "due"), label: "WhatsApp vencimento" },
    { href: getWhatsappUrl(item.company, "expired"), label: "WhatsApp vencido" },
  ];
  const hasWhatsapp = whatsappLinks.some((link) => Boolean(link.href));
  const historyCompany = {
    ...item.company,
    document: null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    _count: {
      users: 0,
      people: 0,
      properties: 0,
      contracts: 0,
    },
  } as AdminCompany;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const triggerButton = triggerButtonRef.current;
    const menuElement = menuRef.current;

    if (!triggerButton || !menuElement) return;

    const triggerRect = triggerButton.getBoundingClientRect();
    const viewportPadding = 16;
    const menuGap = 8;
    const menuWidth = 256;
    const menuHeight = menuElement.offsetHeight;
    const maxHeight = Math.max(window.innerHeight - viewportPadding * 2, 160);
    const topBelowTrigger = triggerRect.bottom + menuGap;
    const topAboveTrigger = triggerRect.top - menuHeight - menuGap;
    const wouldOverflowBelow =
      topBelowTrigger + menuHeight > window.innerHeight - viewportPadding;
    const hasSpaceAbove = topAboveTrigger >= viewportPadding;
    const nextTop =
      wouldOverflowBelow && hasSpaceAbove
        ? topAboveTrigger
        : Math.min(
            Math.max(viewportPadding, topBelowTrigger),
            window.innerHeight - Math.min(menuHeight, maxHeight) - viewportPadding,
          );
    const nextLeft = Math.min(
      Math.max(viewportPadding, triggerRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setMenuPosition({
      top: nextTop,
      left: nextLeft,
      maxHeight,
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);

    return () => {
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [isOpen, onClose]);

  return (
    <div className={`relative inline-flex justify-end ${isOpen ? "z-50" : "z-10"}`}>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default"
          aria-label="Fechar ações"
          onClick={onClose}
        />
      )}

      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className={`relative inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-200 ${
          isOpen ? "z-[70] ring-2 ring-slate-900" : "z-10"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        Ações
        <ChevronDown
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-[70] w-64 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 text-left shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            maxHeight: menuPosition.maxHeight,
          }}
          role="menu"
        >
          <AdminActionMenuButton
            disabled={isUpdatingUser}
            label={isUpdatingUser ? "Salvando..." : item.isActive ? "Inativar usuário" : "Ativar usuário"}
            tone={item.isActive ? "danger" : "success"}
            onClick={() => onToggleUserStatus(item)}
          />
          <MenuSeparator />
          <AdminActionMenuButton
            disabled={isUpdatingCompany}
            label="Prorrogar +7 dias"
            onClick={() => onQuickAction(item.company, "extend7")}
          />
          <AdminActionMenuButton
            disabled={isUpdatingCompany}
            label="Prorrogar +15 dias"
            onClick={() => onQuickAction(item.company, "extend15")}
          />
          <AdminActionMenuButton
            disabled={isUpdatingCompany}
            label="Ativar por 30 dias"
            onClick={() => onQuickAction(item.company, "active30")}
          />
          <AdminActionMenuButton
            disabled={isUpdatingCompany}
            label="Ativar por 1 ano"
            onClick={() => onQuickAction(item.company, "active365")}
          />
          <AdminActionMenuButton
            disabled={isUpdatingCompany}
            label="Suspender empresa"
            tone="danger"
            onClick={() => onQuickAction(item.company, "suspend")}
          />
          <AdminActionMenuButton
            label="Histórico comercial"
            onClick={() => onOpenHistory(historyCompany)}
          />
          <MenuSeparator />
          {hasWhatsapp ? (
            whatsappLinks.map((link) =>
              link.href ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2 text-xs font-black leading-5 text-emerald-700 transition hover:bg-emerald-50"
                  role="menuitem"
                  onClick={onClose}
                >
                  {link.label}
                </a>
              ) : null,
            )
          ) : (
            <span className="block px-3 py-2 text-xs font-black leading-5 text-slate-400">
              WhatsApp indisponível: sem telefone
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AdminActionMenuButton({
  disabled,
  label,
  onClick,
  tone = "default",
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "success";
}) {
  const toneClassName =
    tone === "danger"
      ? "text-red-700 hover:bg-red-50"
      : tone === "success"
        ? "text-emerald-700 hover:bg-emerald-50"
        : "text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left text-xs font-black leading-5 transition disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white ${toneClassName}`}
      role="menuitem"
    >
      {label}
    </button>
  );
}

function MenuSeparator() {
  return <div className="my-1 h-px bg-slate-100" />;
}

function TrialDaysBadge({ company }: { company: TrialCompany }) {
  const daysRemaining = getTrialDaysRemaining(company);
  const toneClassName =
    daysRemaining === null
      ? "bg-slate-50 text-slate-600 ring-slate-200"
      : daysRemaining <= 3
        ? "bg-red-50 text-red-700 ring-red-100"
        : daysRemaining <= 7
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-black ring-1 ${toneClassName}`}>
      {getTrialDaysLabel(company)}
    </span>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function TableState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
        {message}
      </td>
    </tr>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {message}
    </div>
  );
}

function ConfirmationModal({
  dialog,
  onCancel,
  onConfirm,
}: {
  dialog: ConfirmationDialogState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDanger = dialog.tone === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              isDanger
                ? "bg-red-50 text-red-600 ring-1 ring-red-100"
                : "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-slate-950">{dialog.title}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              {dialog.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fechar confirmação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            {dialog.cancelLabel || "Cancelar"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-black text-white shadow-sm transition ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {dialog.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  isUpdating,
  onExtendTrial,
  onToggleStatus,
}: {
  company: AdminCompany;
  isUpdating: boolean;
  onExtendTrial: (company: AdminCompany) => void;
  onToggleStatus: (company: AdminCompany) => void;
}) {
  const totalRecords = getOperationalCompanyRecords(company);
  const trialAccessEndsAt = getTrialAccessEndsAt(company);
  const trialDaysRemaining = getTrialDaysRemaining(company);
  const accessLabel =
    company.subscriptionStatus === "ACTIVE"
      ? "Plano ativo até"
      : company.subscriptionStatus === "TRIAL"
        ? "Teste até"
        : "Acesso até";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">
            {getCompanyName(company)}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {company.companyName || "Razão social não informada"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge active={company.isActive} />
          <SubscriptionBadge company={company} />
          <button
            type="button"
            onClick={() => onToggleStatus(company)}
            disabled={isUpdating}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
              company.isActive
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {isUpdating ? "Salvando..." : company.isActive ? "Inativar" : "Ativar"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 ring-1 ring-orange-100">
        <p className="font-black">Plano: {getSubscriptionLabel(company)}</p>
        <p className="mt-1 text-orange-700">
          {trialAccessEndsAt
            ? `${accessLabel} ${formatDate(trialAccessEndsAt)}${
                trialDaysRemaining !== null ? `, ${trialDaysRemaining} dias restantes` : ""
              }`
            : "Vencimento comercial ainda nao definido"}
        </p>
        {company.subscriptionStatus === "TRIAL" && (
          <button
            type="button"
            onClick={() => onExtendTrial(company)}
            disabled={isUpdating}
            className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-[11px] font-black text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Prorrogar 7 dias
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
        <InfoLine icon={<Mail className="h-3.5 w-3.5" />} value={company.email || "Sem e-mail"} />
        <InfoLine icon={<Phone className="h-3.5 w-3.5" />} value={company.phone || "Sem telefone"} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-black text-slate-600">
        <SmallCount label="Usuários" value={company._count.users} />
        <SmallCount label="Pessoas" value={company._count.people} />
        <SmallCount label="Bens/Ativos" value={company._count.properties} />
        <SmallCount label="Contratos" value={company._count.contracts} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-orange-600" />
          Criada em {formatDate(company.createdAt)}
        </span>
        <strong className="shrink-0 text-slate-800">{totalRecords} dados</strong>
      </div>
    </article>
  );
}

function SubscriptionBadge({ company }: { company: AdminCompany }) {
  const toneClassName =
    company.subscriptionStatus === "TRIAL"
      ? "bg-orange-50 text-orange-700 ring-orange-100"
      : company.subscriptionStatus === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : "bg-red-50 text-red-700 ring-red-100";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClassName}`}>
      {getSubscriptionLabel(company)}
    </span>
  );
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2 py-2">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-black text-slate-400">{label}</p>
    </div>
  );
}
