"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Headphones,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getChamados,
  responderChamado,
  criarChamado,
  clienteAcaoChamado,
  type SupportTicket,
} from "@/services/chamados.service";
import {
  getAdminCompanies,
  getAdminUsers,
  type AdminCompany,
  type AdminUser,
} from "@/services/admin.service";
import { ChamadosKpis } from "@/components/admin/chamados/chamados-kpis";
import { ChamadosFilters } from "@/components/admin/chamados/chamados-filters";
import { ChamadosCards } from "@/components/admin/chamados/chamados-cards";
import { ChamadoDetailModal } from "@/components/admin/chamados/chamado-detail-modal";
import { ChamadoCreateModal } from "@/components/admin/chamados/chamado-create-modal";
import type { TicketStatusFilter, TicketSortOption } from "@/components/admin/chamados/chamados-types";

function isSystemOwnerRole(role?: string | null) {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}

export default function AdminChamadosPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Estados de Dados
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Estados de Filtros e Busca
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("ALL");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortOption, setSortOption] = useState<TicketSortOption>("recent");

  // Modais
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isSystemOwner = isSystemOwnerRole(user?.role);

  const loadData = useCallback(async () => {
    try {
      setErrorMessage("");
      const [nextTickets, compList, userList] = await Promise.all([
        getChamados(),
        getAdminCompanies().catch(() => []),
        getAdminUsers().catch(() => []),
      ]);

      setTickets(Array.isArray(nextTickets) ? nextTickets : []);
      setCompanies(compList || []);
      setUsers(userList || []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível carregar os chamados.";
      if (
        msg.includes("Internal server error") ||
        msg.includes("500") ||
        msg.includes("conectar") ||
        msg.includes("indisponivel") ||
        msg.includes("Request failed")
      ) {
        setErrorMessage(
          "O serviço de chamados está temporariamente indisponível no servidor. Verifique a conexão com a VPS e PostgreSQL.",
        );
      } else {
        setErrorMessage(msg);
      }
      setTickets([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSystemOwner) {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, [isAuthLoading, isSystemOwner, router, loadData]);

  // Limpeza de filtros
  function handleResetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setCompanyFilter("all");
    setSortOption("recent");
  }

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "ALL" ||
    companyFilter !== "all" ||
    sortOption !== "recent";

  // Filtragem e Ordenação em Memória
  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = tickets.filter((ticket) => {
      // Filtro de Status
      if (statusFilter !== "ALL" && ticket.status !== statusFilter) {
        return false;
      }

      // Filtro de Empresa
      if (companyFilter !== "all" && ticket.companyId !== companyFilter) {
        return false;
      }

      // Busca Textual
      if (query) {
        const subject = (ticket.subject || "").toLowerCase();
        const message = (ticket.message || "").toLowerCase();
        const userName = (ticket.user?.name || "").toLowerCase();
        const userEmail = (ticket.user?.email || "").toLowerCase();
        const companyName = (ticket.company?.tradeName || "").toLowerCase();

        const matches =
          subject.includes(query) ||
          message.includes(query) ||
          userName.includes(query) ||
          userEmail.includes(query) ||
          companyName.includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // Ordenação
    result.sort((a, b) => {
      if (sortOption === "waiting_first") {
        if (a.status === "ABERTO" && b.status !== "ABERTO") return -1;
        if (a.status !== "ABERTO" && b.status === "ABERTO") return 1;
      }

      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      if (sortOption === "oldest") {
        return dateA - dateB;
      }

      // Default: recent
      return dateB - dateA;
    });

    return result;
  }, [tickets, search, statusFilter, companyFilter, sortOption]);

  // Ações de Chamado
  async function handleOpenTicketDetail(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  }

  async function handleSendResponse(ticketId: string, responseText: string, closeAfter: boolean = false) {
    try {
      await responderChamado(ticketId, responseText);
      if (closeAfter) {
        await clienteAcaoChamado(ticketId, "close");
      }
      setSuccessMessage(
        closeAfter
          ? "Chamado respondido e concluído com sucesso!"
          : "Resposta enviada com sucesso ao cliente!",
      );
      await loadData();
    } catch (err) {
      console.error("Erro ao responder chamado:", err);
      throw err;
    }
  }

  async function handleCloseTicket(ticketId: string) {
    if (!confirm("Deseja realmente encerrar este chamado de suporte?")) return;
    try {
      await clienteAcaoChamado(ticketId, "close");
      setSuccessMessage("Chamado encerrado com sucesso.");
      await loadData();
    } catch (err) {
      console.error("Erro ao encerrar chamado:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível encerrar o chamado.",
      );
    }
  }

  async function handleCreateTicket(payload: {
    targetCompanyId: string;
    targetUserId: string;
    subject: string;
    message: string;
  }) {
    try {
      await criarChamado(payload);
      setSuccessMessage("Novo chamado criado e enviado com sucesso!");
      await loadData();
    } catch (err) {
      console.error("Erro ao criar chamado:", err);
      throw err;
    }
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-500">
          Carregando central de chamados...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Voltar ao Painel Geral de Administração"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Gerenciar Chamados
              </h1>
              <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
                <Headphones className="h-3.5 w-3.5" />
                Helpdesk Admin
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Visualize, responda e acompanhe todas as solicitações de suporte dos clientes do sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              loadData();
            }}
            disabled={isRefreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Sincronizar chamados"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-600" : "text-slate-400"}`}
            />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Iniciar Conversa</span>
          </button>
        </div>
      </div>

      {/* Alertas de Erro ou Sucesso */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="rounded-lg p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPIs Horizontais no Topo (Padrão Contrx Bens/Ativos) */}
      <ChamadosKpis
        tickets={tickets}
        statusFilter={statusFilter}
        onSelectStatus={(status) => setStatusFilter(status)}
      />

      {/* Barra de Filtros e Busca Rápida */}
      <ChamadosFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedCompanyId={companyFilter}
        onCompanyChange={setCompanyFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        companies={companies}
        totalFiltered={filteredTickets.length}
        totalAll={tickets.length}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Lista de Chamados em Cards Ricos */}
      <ChamadosCards
        tickets={filteredTickets}
        onOpenTicket={handleOpenTicketDetail}
        onCloseTicket={handleCloseTicket}
        onResetFilters={handleResetFilters}
      />

      {/* Modal de Detalhes e Atendimento do Chamado */}
      <ChamadoDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onSendResponse={handleSendResponse}
        onCloseTicket={handleCloseTicket}
      />

      {/* Modal de Criação de Novo Chamado pelo Admin */}
      <ChamadoCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={companies}
        users={users}
        onCreateTicket={handleCreateTicket}
      />
    </div>
  );
}
