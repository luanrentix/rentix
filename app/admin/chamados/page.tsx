"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getChamados, responderChamado, type SupportTicket } from "@/services/chamados.service";

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

  const isSystemOwner = isSystemOwnerRole(user?.role);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSystemOwner) {
      router.replace("/dashboard");
      return;
    }
    loadTickets();
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
            onClick={loadTickets}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar chamados
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Metric Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Total de Chamados</h3>
            <p className="mt-2 text-3xl font-black text-slate-900">{tickets.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-orange-500">Chamados em Aberto</h3>
            <p className="mt-2 text-3xl font-black text-orange-600">
              {tickets.filter((t) => t.status === "ABERTO").length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Chamados Respondidos</h3>
            <p className="mt-2 text-3xl font-black text-slate-600">
              {tickets.filter((t) => t.status === "FECHADO").length}
            </p>
          </div>
        </div>

        {/* Tickets List */}
        <div className="lg:col-span-2 space-y-4">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              Nenhum chamado de suporte encontrado.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-250"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      ticket.status === "ABERTO"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {ticket.status === "ABERTO" ? "Aberto" : "Respondido"}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {formatDateTime(ticket.createdAt)}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-base font-black text-slate-900 uppercase">
                    {ticket.subject}
                  </h4>
                  <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-600 whitespace-pre-wrap">
                    {ticket.message}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      🏢 Empresa: <strong className="text-slate-600">{ticket.company?.tradeName || "Não informada"}</strong>
                    </span>
                    <span>
                      👤 Usuário: <strong className="text-slate-600">{ticket.user?.name} ({ticket.user?.email})</strong>
                    </span>
                  </div>

                  {ticket.status === "ABERTO" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRespondingTicketId(respondingTicketId === ticket.id ? null : ticket.id);
                        setTicketResponse("");
                      }}
                      className="rounded-xl px-4 py-2 text-xs font-black text-white hover:opacity-90 transition"
                      style={{ backgroundColor: "var(--primary-color)" }}
                    >
                      {respondingTicketId === ticket.id ? "Cancelar" : "Responder"}
                    </button>
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
                        className="rounded-xl px-4 py-2.5 text-xs font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: "var(--primary-color)" }}
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
    </div>
  );
}
