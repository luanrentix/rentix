"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  X,
  Building,
  User,
  Clock,
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSystemOwnerRole(role?: string | null) {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}

export default function AdminChamadosPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [respondingTicketId, setRespondingTicketId] = useState<string | null>(null);
  const [ticketResponse, setTicketResponse] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  // States for new ticket creation (Admin-initiated)
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [isSubmittingNewTicket, setIsSubmittingNewTicket] = useState(false);

  const isSystemOwner = isSystemOwnerRole(user?.role);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSystemOwner) {
      router.replace("/dashboard");
      return;
    }
    loadTickets();
    loadCompaniesAndUsers();
  }, [isAuthLoading, isSystemOwner, router]);

  async function loadTickets() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const nextTickets = await getChamados();
      setTickets(nextTickets || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível carregar os chamados.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCompaniesAndUsers() {
    try {
      const [compList, userList] = await Promise.all([
        getAdminCompanies(),
        getAdminUsers(),
      ]);
      setCompanies(compList || []);
      setUsers(userList || []);
    } catch (err) {
      console.error("Erro ao carregar dados auxiliares do admin:", err);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!selectedCompanyId) return [];
    return users.filter((u) => u.company.id === selectedCompanyId);
  }, [selectedCompanyId, users]);

  // When selectedCompanyId changes, auto-select first user if exists
  useEffect(() => {
    if (filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    } else {
      setSelectedUserId("");
    }
  }, [selectedCompanyId, filteredUsers]);

  async function handleResponderChamado(ticketId: string) {
    if (!ticketResponse.trim()) {
      setErrorMessage("Por favor, digite uma resposta antes de enviar.");
      return;
    }

    try {
      setIsReplying(true);
      setErrorMessage("");
      setSuccessMessage("");
      await responderChamado(ticketId, ticketResponse);
      setSuccessMessage("Chamado respondido com sucesso.");
      setRespondingTicketId(null);
      setTicketResponse("");
      const nextTickets = await getChamados();
      setTickets(nextTickets || []);
    } catch (error) {
      console.error("Erro ao responder chamado:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível responder ao chamado.",
      );
    } finally {
      setIsReplying(false);
    }
  }

  async function handleCloseTicket(ticketId: string) {
    if (!confirm("Deseja realmente encerrar este chamado?")) return;
    try {
      setIsReplying(true);
      setErrorMessage("");
      setSuccessMessage("");
      await clienteAcaoChamado(ticketId, "close");
      setSuccessMessage("Chamado encerrado com sucesso.");
      const nextTickets = await getChamados();
      setTickets(nextTickets || []);
    } catch (error) {
      console.error("Erro ao encerrar chamado:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível encerrar o chamado.",
      );
    } finally {
      setIsReplying(false);
    }
  }

  async function handleCreateNewTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId || !selectedUserId || !newTicketSubject.trim() || !newTicketMessage.trim()) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setIsSubmittingNewTicket(true);
      setErrorMessage("");
      setSuccessMessage("");
      await criarChamado({
        subject: newTicketSubject,
        message: newTicketMessage,
        targetUserId: selectedUserId,
        targetCompanyId: selectedCompanyId,
      });
      setSuccessMessage("Novo chamado criado e iniciado com sucesso!");
      setIsNewTicketModalOpen(false);
      setNewTicketSubject("");
      setNewTicketMessage("");
      setSelectedCompanyId("");
      setSelectedUserId("");
      const nextTickets = await getChamados();
      setTickets(nextTickets || []);
    } catch (error) {
      console.error("Erro ao criar novo chamado:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível iniciar a conversa/chamado.",
      );
    } finally {
      setIsSubmittingNewTicket(false);
    }
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-orange-500" />
          <p className="mt-2 text-sm font-semibold text-slate-500">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            title="Voltar ao Painel Admin"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-950 lg:text-3xl">
              Gerenciar Chamados
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Visualize e responda os chamados de suporte técnico enviados pelos usuários
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsNewTicketModalOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-white shadow-sm transition hover:bg-orange-650"
          >
            <Plus className="h-4 w-4" />
            Iniciar Conversa
          </button>
          <button
            onClick={loadTickets}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-250 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Metric Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Total de Chamados</h3>
            <p className="mt-2 text-3xl font-black text-slate-900">{tickets.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-orange-500">Em Aberto</h3>
            <p className="mt-2 text-3xl font-black text-orange-650">
              {tickets.filter((t) => t.status === "ABERTO").length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-500">Respondidos</h3>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {tickets.filter((t) => t.status === "RESPONDIDO").length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-500">Fechados</h3>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {tickets.filter((t) => t.status === "FECHADO").length}
            </p>
          </div>
        </div>

        {/* Tickets List */}
        <div className="lg:col-span-3 space-y-4">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              Nenhum chamado de suporte encontrado.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      ticket.status === "ABERTO"
                        ? "bg-orange-50 text-orange-700"
                        : ticket.status === "RESPONDIDO"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {ticket.status === "ABERTO" ? "Aberto" : ticket.status === "RESPONDIDO" ? "Respondido" : "Fechado"}
                  </span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(ticket.createdAt)}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-base font-black text-slate-900 uppercase">
                    {ticket.subject}
                  </h4>
                  <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-650 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {ticket.message}
                  </p>
                </div>

                {ticket.response && (
                  <div className="mt-4 rounded-xl bg-orange-50/50 border border-orange-100 p-4">
                    <p className="text-xs font-black uppercase text-orange-600">Sua Resposta Anterior</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {ticket.response}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      Empresa: <strong className="text-slate-600">{ticket.company?.tradeName || "Não informada"}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Usuário: <strong className="text-slate-600">{ticket.user?.name} ({ticket.user?.email})</strong>
                    </span>
                  </div>

                  {ticket.status !== "FECHADO" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingTicketId(respondingTicketId === ticket.id ? null : ticket.id);
                          setTicketResponse(ticket.response || "");
                        }}
                        className="rounded-xl px-4 py-2 text-xs font-black text-white hover:opacity-90 transition bg-orange-500"
                      >
                        {respondingTicketId === ticket.id ? "Cancelar" : ticket.status === "RESPONDIDO" ? "Editar Resposta" : "Responder"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCloseTicket(ticket.id)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                      >
                        Encerrar
                      </button>
                    </div>
                  )}
                </div>

                {respondingTicketId === ticket.id && (
                  <div className="mt-5 border-t border-dashed border-slate-200 pt-5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                      Sua resposta (será enviada por e-mail para o cliente)
                    </label>
                    <textarea
                      value={ticketResponse}
                      onChange={(e) => setTicketResponse(e.target.value)}
                      placeholder="Descreva a solução ou resposta do suporte..."
                      className="w-full min-h-[120px] rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleResponderChamado(ticket.id)}
                        disabled={isReplying || !ticketResponse.trim()}
                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                      >
                        {isReplying ? "Enviando..." : "Enviar Resposta"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: INICIAR NOVA CONVERSA (NOVO CHAMADO PELO ADMIN) */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Iniciar Novo Chamado</h3>
              <button
                onClick={() => setIsNewTicketModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTicket} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Empresa de Destino *
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-orange-500"
                  required
                >
                  <option value="">Selecione a empresa...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCompanyId && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Usuário Destinatário *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">Selecione o usuário...</option>
                    {filteredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Assunto *
                </label>
                <input
                  type="text"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Ex: Atualização de módulo bancário"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Mensagem Inicial *
                </label>
                <textarea
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Escreva a mensagem ou notificação..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewTicket || !selectedUserId || !newTicketSubject.trim() || !newTicketMessage.trim()}
                  className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-605"
                >
                  {isSubmittingNewTicket ? "Enviando..." : "Criar Chamado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
