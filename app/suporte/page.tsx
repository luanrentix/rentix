"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getChamados,
  clienteAcaoChamado,
  type SupportTicket,
} from "@/services/chamados.service";
import { SuporteKpis } from "@/components/suporte/suporte-kpis";
import { SuporteFilters } from "@/components/suporte/suporte-filters";
import { SuporteCards } from "@/components/suporte/suporte-cards";
import { SuporteTable } from "@/components/suporte/suporte-table";
import { SuporteDetailModal } from "@/components/suporte/suporte-detail-modal";
import { SuporteCreateModal } from "@/components/suporte/suporte-create-modal";
import type {
  TicketStatusFilter,
  TicketSortOption,
} from "@/components/suporte/suporte-types";

export default function SuportePage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Estados de Dados
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Estados de Filtros e Visualização
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("ALL");
  const [sortOption, setSortOption] = useState<TicketSortOption>("recent");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  // Modais
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setErrorMessage("");
      const data = await getChamados();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar chamados:", error);
      const msg = error instanceof Error ? error.message : "Não foi possível carregar os chamados.";
      setErrorMessage(msg);
      setTickets([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    loadData();
  }, [isAuthLoading, loadData]);

  // Limpeza de filtros
  function handleResetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setSortOption("recent");
  }

  const hasActiveFilters =
    Boolean(search) || statusFilter !== "ALL" || sortOption !== "recent";

  // Filtragem e Ordenação em Memória
  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = tickets.filter((ticket) => {
      // Filtro de Status
      if (statusFilter !== "ALL" && ticket.status !== statusFilter) {
        return false;
      }

      // Busca Textual
      if (query) {
        const subject = (ticket.subject || "").toLowerCase();
        const message = (ticket.message || "").toLowerCase();
        const response = (ticket.response || "").toLowerCase();

        const matches =
          subject.includes(query) ||
          message.includes(query) ||
          response.includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // Ordenação
    result.sort((a, b) => {
      if (sortOption === "waiting_first") {
        if (a.status === "RESPONDIDO" && b.status !== "RESPONDIDO") return -1;
        if (a.status !== "RESPONDIDO" && b.status === "RESPONDIDO") return 1;
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
  }, [tickets, search, statusFilter, sortOption]);

  // Ações do Usuário
  function handleOpenTicketDetail(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  }

  async function handleSendReply(ticketId: string, replyText: string) {
    try {
      await clienteAcaoChamado(ticketId, "reply", replyText);
      setSuccessMessage("Réplica enviada com sucesso para a equipe de suporte!");
      await loadData();
    } catch (err) {
      console.error("Erro ao enviar réplica:", err);
      throw err;
    }
  }

  async function handleCloseTicket(ticketId: string) {
    if (!confirm("Deseja realmente confirmar que seu chamado foi atendido e encerrá-lo?")) return;
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

  function handleCreateSuccess() {
    setSuccessMessage("Chamado enviado com sucesso! Nossa equipe técnica já foi notificada.");
    loadData();
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-500">
          Carregando seus chamados de suporte...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <LifeBuoy className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Suporte & Chamados
              </h1>
              <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
                Atendimento Técnico
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Acompanhe o andamento de suas solicitações e envie novas mensagens diretamente para os desenvolvedores da plataforma.
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
            <span>Novo Chamado</span>
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

      {/* KPIs Horizontais no Topo */}
      <SuporteKpis
        tickets={tickets}
        statusFilter={statusFilter}
        onSelectStatus={(status) => setStatusFilter(status)}
      />

      {/* Barra de Filtros e Busca Rápida */}
      <SuporteFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        totalFiltered={filteredTickets.length}
        totalAll={tickets.length}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Exibição em Tabela ou Cards */}
      {viewMode === "table" ? (
        <>
          <div className="hidden sm:block">
            <SuporteTable
              tickets={filteredTickets}
              onOpenTicket={handleOpenTicketDetail}
              onCloseTicket={handleCloseTicket}
            />
          </div>
          <div className="block sm:hidden">
            <SuporteCards
              tickets={filteredTickets}
              onOpenTicket={handleOpenTicketDetail}
              onCloseTicket={handleCloseTicket}
              onResetFilters={handleResetFilters}
              onNewTicket={() => setIsCreateModalOpen(true)}
            />
          </div>
        </>
      ) : (
        <SuporteCards
          tickets={filteredTickets}
          onOpenTicket={handleOpenTicketDetail}
          onCloseTicket={handleCloseTicket}
          onResetFilters={handleResetFilters}
          onNewTicket={() => setIsCreateModalOpen(true)}
        />
      )}

      {/* Modal de Detalhes e Conversa com o Suporte (Draggable, Maximizável, Redimensionável) */}
      <SuporteDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onSendReply={handleSendReply}
        onCloseTicket={handleCloseTicket}
      />

      {/* Modal de Criação de Novo Chamado (Draggable, Maximizável, Redimensionável) */}
      <SuporteCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
