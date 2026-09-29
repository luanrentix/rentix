"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  UsersRound,
  RefreshCw,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminCompanies,
  getAdminCompanyCommercialHistory,
  getAdminSummary,
  getAdminUsers,
  impersonateAdminUser,
  reprocessAdminCommercialExpirations,
  updateAdminCompany,
  updateAdminUser,
} from "@/services/admin.service";
import {
  getAdminSystemErrorLogs,
  purgeAdminNoiseErrorLogs,
  purgeAdminSystemErrorLogs,
} from "@/services/system-logs.service";

import type {
  AdminCommercialHistory,
  AdminCompany,
  AdminSummary,
  AdminTab,
  AdminUser,
  AdminUserRole,
  CommercialFilter,
  ConfirmationDialogState,
  DueFilter,
  QuickCommercialAction,
  StatusFilter,
  SubscriptionStatus,
  SystemErrorLog,
  SystemErrorLogSummary,
  TrialCompany,
} from "@/components/admin/admin-types";
import {
  addDays,
  adminRoleOptions,
  formatDate,
  getCompanyName,
  getOperationalCompanyRecords,
  getSubscriptionLabel,
  isSystemOwnerRole,
  matchesDueFilter,
  normalizeText,
  roleLabels,
  toDateInputValue,
} from "@/components/admin/admin-types";

import { AdminKpis } from "@/components/admin/admin-kpis";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminFilters } from "@/components/admin/admin-filters";
import { AdminCompaniesTable } from "@/components/admin/admin-companies-table";
import { AdminCompaniesCards } from "@/components/admin/admin-companies-cards";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminUsersCards } from "@/components/admin/admin-users-cards";
import { AdminLogsTab } from "@/components/admin/admin-logs-tab";
import { AdminAdvancedTab } from "@/components/admin/admin-advanced-tab";

import { AdminHistoryModal } from "@/components/admin/modals/admin-history-modal";
import { AdminErrorModal } from "@/components/admin/modals/admin-error-modal";
import { AdminConfirmModal } from "@/components/admin/modals/admin-confirm-modal";
import { AdminImpersonateModal } from "@/components/admin/modals/admin-impersonate-modal";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Estados principais de dados
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("empresas");

  // Feedback e Toasts
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estados de atualização em andamento
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [updatingCompanyId, setUpdatingCompanyId] = useState("");

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [commercialFilter, setCommercialFilter] = useState<CommercialFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [hideEmptyCompanies, setHideEmptyCompanies] = useState(true);

  // Estados do Modal de Histórico Comercial
  const [historyCompany, setHistoryCompany] = useState<AdminCompany | null>(null);
  const [commercialHistory, setCommercialHistory] = useState<AdminCommercialHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Estados do Modal de Confirmação
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null);
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null,
  );

  // Estados do Modal de Personificação (Impersonate)
  const [impersonatingUser, setImpersonatingUser] = useState<AdminUser | null>(null);
  const [isImpersonatingLoading, setIsImpersonatingLoading] = useState(false);

  // Estados da Aba de Logs de Erro
  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [logSummary, setLogSummary] = useState<SystemErrorLogSummary>({
    total24h: 0,
    totalCritical: 0,
    affectedModulesCount: 0,
    topAffectedModule: null,
  });
  const [logTotal, setLogTotal] = useState(0);
  const [logPages, setLogPages] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isPurgingLogs, setIsPurgingLogs] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState("all");
  const [logModuleFilter, setLogModuleFilter] = useState("all");
  const [logPeriodFilter, setLogPeriodFilter] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [logSearch, setLogSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<SystemErrorLog | null>(null);

  const isSystemOwner = isSystemOwnerRole(user?.role);
  const normalizedSearch = normalizeText(search);

  // Toast temporário auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Carregar dados principais
  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [nextSummary, nextUsers, nextCompanies] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(),
        getAdminCompanies(),
      ]);

      setSummary(nextSummary);
      setUsers(nextUsers || []);
      setCompanies(nextCompanies || []);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados administrativos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar logs
  const loadSystemLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await getAdminSystemErrorLogs({
        level: logLevelFilter,
        module: logModuleFilter,
        period: logPeriodFilter,
        search: logSearch,
        page: logPage,
        limit: 15,
      });

      setLogs(res.logs || []);
      setLogTotal(res.total || 0);
      setLogPages(res.pages || 1);
      setLogSummary(
        res.summary || {
          total24h: 0,
          totalCritical: 0,
          affectedModulesCount: 0,
          topAffectedModule: null,
        },
      );
    } catch {
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logLevelFilter, logModuleFilter, logPeriodFilter, logSearch, logPage]);

  // Proteção de rota e carregamento inicial
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSystemOwner) {
      router.replace("/dashboard");
      return;
    }
    loadAdminData();
  }, [isAuthLoading, isSystemOwner, router, loadAdminData]);

  // Carregar logs quando mudar para a aba de logs
  useEffect(() => {
    if (activeTab === "logs") {
      loadSystemLogs();
    }
  }, [activeTab, loadSystemLogs]);

  // Utilitário de confirmação com promise
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

  // Filtragem de Usuários
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
      if (!normalizedSearch) return true;

      return [
        item.name,
        item.email,
        item.role,
        getCompanyName(item.company),
        item.company.email || "",
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    });
  }, [commercialFilter, dueFilter, normalizedSearch, roleFilter, statusFilter, users]);

  // Filtragem de Empresas
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
      if (!normalizedSearch) return true;

      return [
        company.tradeName,
        company.companyName || "",
        company.email || "",
        company.document || "",
        company.phone || "",
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    });
  }, [commercialFilter, companies, dueFilter, normalizedSearch, statusFilter]);

  // Empresas ordenadas por registros operacionais
  const visibleCompanies = useMemo(() => {
    const list = hideEmptyCompanies
      ? filteredCompanies.filter(
          (company) => getOperationalCompanyRecords(company) > 0,
        )
      : filteredCompanies;

    return [...list].sort(
      (first, second) =>
        getOperationalCompanyRecords(second) - getOperationalCompanyRecords(first),
    );
  }, [filteredCompanies, hideEmptyCompanies]);

  const emptyCompaniesCount = filteredCompanies.filter(
    (company) => getOperationalCompanyRecords(company) === 0,
  ).length;

  const roleOptions = useMemo(() => {
    const roles = new Set<string>(adminRoleOptions);
    summary?.usersByRole.forEach((item) => roles.add(item.role));
    users.forEach((item) => roles.add(item.role));
    return Array.from(roles);
  }, [summary, users]);

  // Limpar filtros
  function handleClearFilters() {
    setSearch("");
    setStatusFilter("all");
    setRoleFilter("all");
    setCommercialFilter("all");
    setDueFilter("all");
  }

  // Seleção de Métrica via KPI
  function handleSelectMetric(tab: AdminTab, commercial?: CommercialFilter, due?: DueFilter) {
    setActiveTab(tab);
    if (commercial) setCommercialFilter(commercial);
    if (due) setDueFilter(due);
  }

  // Sincronizar empresa alterada no estado local
  function syncUpdatedCompany(updatedCompany: AdminCompany) {
    setCompanies((prev) =>
      prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)),
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.company.id === updatedCompany.id
          ? {
              ...u,
              company: {
                ...u.company,
                isActive: updatedCompany.isActive,
                subscriptionStatus: updatedCompany.subscriptionStatus,
                trialStartsAt: updatedCompany.trialStartsAt,
                trialEndsAt: updatedCompany.trialEndsAt,
                trialExtendedUntil: updatedCompany.trialExtendedUntil,
                subscriptionEndsAt: updatedCompany.subscriptionEndsAt,
                accessState: updatedCompany.accessState,
              },
            }
          : u,
      ),
    );
  }

  // Ações de Usuário
  async function handleUpdateUserRole(userId: string, role: AdminUserRole) {
    const confirmed = await requestConfirmation({
      title: "Alterar perfil de usuário",
      message: `Deseja realmente alterar o perfil deste usuário para ${roleLabels[role] || role}?`,
      confirmLabel: "Alterar",
    });

    if (!confirmed) return;

    try {
      setUpdatingUserId(userId);
      const updatedUser = await updateAdminUser(userId, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      setToast({ type: "success", message: "Perfil do usuário atualizado." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o perfil do usuário.",
      });
    } finally {
      setUpdatingUserId("");
    }
  }

  async function handleToggleUserStatus(targetUser: AdminUser) {
    const confirmed = await requestConfirmation({
      title: targetUser.isActive ? "Inativar usuário" : "Ativar usuário",
      message: `Deseja realmente ${targetUser.isActive ? "inativar" : "ativar"} o usuário "${targetUser.name}"?`,
      confirmLabel: targetUser.isActive ? "Inativar" : "Ativar",
      tone: targetUser.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      setUpdatingUserId(targetUser.id);
      const updatedUser = await updateAdminUser(targetUser.id, {
        isActive: !targetUser.isActive,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? updatedUser : u)),
      );
      setToast({
        type: "success",
        message: updatedUser.isActive ? "Usuário ativado com sucesso." : "Usuário inativado.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o status do usuário.",
      });
    } finally {
      setUpdatingUserId("");
    }
  }

  // Ações Comerciais e de Empresa
  async function handleToggleCompanyStatus(company: AdminCompany) {
    const confirmed = await requestConfirmation({
      title: company.isActive ? "Inativar empresa" : "Ativar empresa",
      message: `Deseja realmente ${company.isActive ? "inativar" : "ativar"} a empresa "${getCompanyName(company)}"?`,
      confirmLabel: company.isActive ? "Inativar" : "Ativar",
      tone: company.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      setUpdatingCompanyId(company.id);
      const updatedCompany = await updateAdminCompany(company.id, {
        isActive: !company.isActive,
      });
      syncUpdatedCompany(updatedCompany);
      setToast({
        type: "success",
        message: updatedCompany.isActive ? "Empresa ativada com sucesso." : "Empresa inativada.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o status da empresa.",
      });
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleExtendCompanyTrial(company: AdminCompany) {
    const confirmed = await requestConfirmation({
      title: "Prorrogar teste",
      message: "Deseja prorrogar o teste desta empresa por mais 7 dias?",
      confirmLabel: "Prorrogar",
    });

    if (!confirmed) return;

    try {
      setUpdatingCompanyId(company.id);
      const updatedCompany = await updateAdminCompany(company.id, {
        trialExtensionDays: 7,
      });
      syncUpdatedCompany(updatedCompany);
      setToast({ type: "success", message: "Teste prorrogado por 7 dias." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível prorrogar o teste.",
      });
    } finally {
      setUpdatingCompanyId("");
    }
  }

  async function handleUpdateCompanyDueDate(
    company: TrialCompany & { id: string },
    newDate: string,
  ) {
    if (!newDate) return;

    const confirmed = await requestConfirmation({
      title: "Alterar vencimento",
      message: `Alterar o vencimento comercial desta empresa para ${formatDate(newDate)}?`,
      confirmLabel: "Confirmar",
    });

    if (!confirmed) return;

    try {
      setUpdatingCompanyId(company.id);
      const updatedCompany = await updateAdminCompany(
        company.id,
        company.subscriptionStatus === "ACTIVE"
          ? {
              subscriptionStatus: "ACTIVE",
              subscriptionEndsAt: newDate,
            }
          : {
              trialEndsAt: newDate,
            },
      );
      syncUpdatedCompany(updatedCompany);
      setToast({ type: "success", message: "Vencimento atualizado com sucesso." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o vencimento.",
      });
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
      title: "Alterar situação comercial",
      message: `Alterar a situação comercial para ${getSubscriptionLabel({ subscriptionStatus })}?`,
      confirmLabel: "Alterar",
      tone:
        subscriptionStatus === "SUSPENDED" || subscriptionStatus === "CANCELED"
          ? "danger"
          : "default",
    });

    if (!confirmed) return;

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
      const updatedCompany = await updateAdminCompany(company.id, payload);
      syncUpdatedCompany(updatedCompany);
      setToast({ type: "success", message: "Situação comercial atualizada." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar a situação comercial.",
      });
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
      message: `Confirmar ação: ${actionLabels[action]}?`,
      confirmLabel: "Confirmar",
      tone: action === "suspend" ? "danger" : "default",
    });

    if (!confirmed) return;

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
      const updatedCompany = await updateAdminCompany(company.id, payload);
      syncUpdatedCompany(updatedCompany);
      setToast({ type: "success", message: "Ação comercial aplicada com sucesso." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível aplicar a ação comercial.",
      });
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
      setCommercialHistory(history || []);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o histórico comercial.",
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleReprocessCommercialExpirations() {
    const confirmed = await requestConfirmation({
      title: "Reprocessar vencimentos",
      message:
        "Deseja reprocessar os vencimentos agora? As empresas cujo prazo expirou serão marcadas como vencidas automaticamente.",
      confirmLabel: "Reprocessar",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      const result = await reprocessAdminCommercialExpirations();
      await loadAdminData();
      setToast({
        type: "success",
        message: `${result.expired} empresa(s) vencida(s) em ${result.processed} processada(s).`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível reprocessar os vencimentos.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Ação de Impersonação Segura ("Logar como Usuário")
  async function handleExecuteImpersonation() {
    if (!impersonatingUser) return;

    try {
      setIsImpersonatingLoading(true);
      const res = await impersonateAdminUser(impersonatingUser.id);

      // Salvar token e dados do master para restauração posterior
      const currentToken = localStorage.getItem("contrx_token");
      const currentUser = localStorage.getItem("contrx_user");
      if (currentToken) localStorage.setItem("contrx_impersonator_token", currentToken);
      if (currentUser) localStorage.setItem("contrx_impersonator_user", currentUser);

      // Definir novo token de impersonação
      localStorage.setItem("contrx_token", res.accessToken);
      localStorage.setItem("contrx_user", JSON.stringify(res.user));
      localStorage.setItem("contrx_company_id", res.user.companyId);

      setToast({
        type: "success",
        message: `Sessão iniciada como ${res.user.name}. Redirecionando...`,
      });

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 700);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o acesso como este usuário.",
      });
      setIsImpersonatingLoading(false);
      setImpersonatingUser(null);
    }
  }

  // Ações de Expurgo de Logs
  async function handlePurgeNoiseLogs() {
    const confirmed = await requestConfirmation({
      title: "Limpar 404 e Sondagens de Bots",
      message:
        "Deseja remover do histórico todas as tentativas de bots (.env, .git, wp-login, etc.) e 404?",
      confirmLabel: "Limpar Ruídos",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setIsPurgingLogs(true);
      const res = await purgeAdminNoiseErrorLogs();
      setToast({
        type: "success",
        message: `${res.count || 0} registros de ruído removidos com sucesso.`,
      });
      await loadSystemLogs();
    } catch {
      setToast({ type: "error", message: "Não foi possível limpar os ruídos." });
    } finally {
      setIsPurgingLogs(false);
    }
  }

  async function handlePurgeOldLogs() {
    const confirmed = await requestConfirmation({
      title: "Expurgar logs com mais de 30 dias",
      message:
        "Deseja excluir permanentemente todos os logs de erro gravados há mais de 30 dias?",
      confirmLabel: "Expurgar",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setIsPurgingLogs(true);
      await purgeAdminSystemErrorLogs(30);
      setToast({ type: "success", message: "Logs antigos expurgados com sucesso." });
      await loadSystemLogs();
    } catch {
      setToast({ type: "error", message: "Não foi possível expurgar os logs." });
    } finally {
      setIsPurgingLogs(false);
    }
  }

  async function handlePurgeAllLogs() {
    const confirmed = await requestConfirmation({
      title: "Zerar Histórico de Logs",
      message:
        "Deseja realmente excluir TODOS os registros de erro do sistema (zerar histórico completo)?",
      confirmLabel: "Zerar Todos",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setIsPurgingLogs(true);
      await purgeAdminSystemErrorLogs(0);
      setToast({ type: "success", message: "Todos os logs foram excluídos." });
      await loadSystemLogs();
    } catch {
      setToast({ type: "error", message: "Não foi possível zerar os logs." });
    } finally {
      setIsPurgingLogs(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifier */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl transition-all duration-300 animate-in slide-in-from-top-3 ${
            toast.type === "success"
              ? "bg-emerald-600 shadow-emerald-500/20"
              : "bg-red-600 shadow-red-500/20"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Top Header - Padrão Bens/Ativos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl tracking-tight">
              Painel Administrativo
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Master
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Governança da plataforma, controle de assinaturas, usuários e observabilidade técnica
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <Link
            href="/admin/chamados"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-xs font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-700 active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            Chamados
          </Link>

          <button
            type="button"
            onClick={loadAdminData}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Recarregar dados do painel"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Cards de Métricas / KPIs */}
      <AdminKpis
        summary={summary}
        companies={companies}
        totalCriticalErrors24h={logSummary.totalCritical}
        activeTab={activeTab}
        commercialFilter={commercialFilter}
        dueFilter={dueFilter}
        onSelectMetric={handleSelectMetric}
      />

      {/* Navegador por Abas */}
      <AdminTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearch("");
        }}
        companiesCount={visibleCompanies.length}
        usersCount={filteredUsers.length}
        criticalErrorsCount={logSummary.totalCritical}
      />

      {/* Filtros Integrados (para Empresas e Usuários) */}
      <AdminFilters
        activeTab={activeTab}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        commercialFilter={commercialFilter}
        onCommercialFilterChange={setCommercialFilter}
        dueFilter={dueFilter}
        onDueFilterChange={setDueFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roleOptions={roleOptions}
        hideEmptyCompanies={hideEmptyCompanies}
        onHideEmptyCompaniesChange={setHideEmptyCompanies}
        emptyCompaniesCount={emptyCompaniesCount}
        totalFilteredRecords={
          activeTab === "empresas"
            ? visibleCompanies.length
            : filteredUsers.length
        }
        onClearFilters={handleClearFilters}
      />

      {/* Conteúdo Dinâmico por Aba */}
      {activeTab === "empresas" && (
        <>
          <AdminCompaniesTable
            companies={visibleCompanies}
            isLoading={isLoading}
            updatingCompanyId={updatingCompanyId}
            onToggleStatus={handleToggleCompanyStatus}
            onExtendTrial={handleExtendCompanyTrial}
            onUpdateDueDate={handleUpdateCompanyDueDate}
            onUpdateCommercialStatus={handleUpdateCompanyCommercialStatus}
            onQuickAction={handleQuickCommercialAction}
            onOpenHistory={handleOpenCommercialHistory}
          />

          <AdminCompaniesCards
            companies={visibleCompanies}
            updatingCompanyId={updatingCompanyId}
            onToggleStatus={handleToggleCompanyStatus}
            onExtendTrial={handleExtendCompanyTrial}
            onUpdateDueDate={handleUpdateCompanyDueDate}
            onUpdateCommercialStatus={handleUpdateCompanyCommercialStatus}
            onQuickAction={handleQuickCommercialAction}
            onOpenHistory={handleOpenCommercialHistory}
          />
        </>
      )}

      {activeTab === "usuarios" && (
        <>
          <AdminUsersTable
            users={filteredUsers}
            isLoading={isLoading}
            updatingUserId={updatingUserId}
            updatingCompanyId={updatingCompanyId}
            onUpdateRole={handleUpdateUserRole}
            onToggleStatus={handleToggleUserStatus}
            onImpersonate={(target) => setImpersonatingUser(target)}
            onUpdateCompanyDueDate={handleUpdateCompanyDueDate}
            onUpdateCompanyCommercialStatus={handleUpdateCompanyCommercialStatus}
            onOpenHistory={handleOpenCommercialHistory}
          />

          <AdminUsersCards
            users={filteredUsers}
            updatingUserId={updatingUserId}
            updatingCompanyId={updatingCompanyId}
            onUpdateRole={handleUpdateUserRole}
            onToggleStatus={handleToggleUserStatus}
            onImpersonate={(target) => setImpersonatingUser(target)}
            onUpdateCompanyDueDate={handleUpdateCompanyDueDate}
            onUpdateCompanyCommercialStatus={handleUpdateCompanyCommercialStatus}
            onOpenHistory={handleOpenCommercialHistory}
          />
        </>
      )}

      {activeTab === "logs" && (
        <AdminLogsTab
          logs={logs}
          logSummary={logSummary}
          logTotal={logTotal}
          logPages={logPages}
          logPage={logPage}
          isLoadingLogs={isLoadingLogs}
          isPurgingLogs={isPurgingLogs}
          logLevelFilter={logLevelFilter}
          onLogLevelFilterChange={(val) => {
            setLogLevelFilter(val);
            setLogPage(1);
          }}
          logModuleFilter={logModuleFilter}
          onLogModuleFilterChange={(val) => {
            setLogModuleFilter(val);
            setLogPage(1);
          }}
          logPeriodFilter={logPeriodFilter}
          onLogPeriodFilterChange={(val) => {
            setLogPeriodFilter(val);
            setLogPage(1);
          }}
          logSearch={logSearch}
          onLogSearchChange={(val) => {
            setLogSearch(val);
            setLogPage(1);
          }}
          onSelectLog={(log) => setSelectedLog(log)}
          onReloadLogs={() => loadSystemLogs()}
          onPageChange={(page) => setLogPage(page)}
          onPurgeNoiseLogs={handlePurgeNoiseLogs}
          onPurgeOldLogs={handlePurgeOldLogs}
          onPurgeAllLogs={handlePurgeAllLogs}
        />
      )}

      {activeTab === "avancado" && (
        <AdminAdvancedTab
          isLoading={isLoading}
          onForceReload={loadAdminData}
          onReprocessCommercialExpirations={handleReprocessCommercialExpirations}
        />
      )}

      {/* Modais Desacoplados */}
      <AdminHistoryModal
        company={historyCompany}
        history={commercialHistory}
        isLoading={isHistoryLoading}
        onClose={() => setHistoryCompany(null)}
      />

      <AdminErrorModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />

      <AdminConfirmModal
        dialog={confirmationDialog}
        onConfirm={() => resolveConfirmation(true)}
        onCancel={() => resolveConfirmation(false)}
      />

      <AdminImpersonateModal
        user={impersonatingUser}
        isLoading={isImpersonatingLoading}
        onConfirm={handleExecuteImpersonation}
        onCancel={() => setImpersonatingUser(null)}
      />
    </div>
  );
}
