"use client";

import React, { useState } from "react";
import {
  Clock,
  MessageCircle,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Eye,
  Sparkles,
  Inbox,
  Send,
} from "lucide-react";
import type { SupportTicket } from "@/services/chamados.service";
import {
  formatDateTime,
  formatRelativeTime,
  parseMessageWithAttachment,
} from "./suporte-types";

interface SuporteTableProps {
  tickets: SupportTicket[];
  onOpenTicket: (ticket: SupportTicket) => void;
  onCloseTicket: (ticketId: string) => void;
}

export function SuporteTable({
  tickets,
  onOpenTicket,
  onCloseTicket,
}: SuporteTableProps) {
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  if (tickets.length === 0) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="py-4 pl-6 pr-3">Status</th>
                <th className="py-4 px-3">Assunto & Solicitação</th>
                <th className="py-4 px-3">Abertura</th>
                <th className="py-4 px-3">Retorno da Equipe</th>
                <th className="py-4 pl-3 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {tickets.map((ticket) => {
                const { cleanMessage, attachment } = parseMessageWithAttachment(ticket.message);
                const isAberto = ticket.status === "ABERTO";
                const isRespondido = ticket.status === "RESPONDIDO";
                const isFechado = ticket.status === "FECHADO";

                return (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Status */}
                    <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                      {isAberto && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                          </span>
                          Em Análise
                        </span>
                      )}

                      {isRespondido && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                          <Sparkles className="h-3 w-3 text-blue-600" />
                          Respondido
                        </span>
                      )}

                      {isFechado && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <CheckCheck className="h-3 w-3 text-emerald-500" />
                          Resolvido
                        </span>
                      )}
                    </td>

                    {/* Assunto & Solicitação */}
                    <td className="py-4 px-3 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white uppercase truncate">
                          {ticket.subject}
                        </span>
                        {attachment && (
                          <span
                            title={`Anexo: ${attachment.name}`}
                            className="inline-flex items-center text-indigo-500"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                        {cleanMessage}
                      </p>
                    </td>

                    {/* Data de Abertura */}
                    <td className="py-4 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span title={formatDateTime(ticket.createdAt)}>
                          {formatRelativeTime(ticket.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Retorno do Suporte */}
                    <td className="py-4 px-3 max-w-xs">
                      {ticket.response ? (
                        <div className="truncate text-slate-700 dark:text-slate-200 font-medium">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mr-1">
                            Retorno:
                          </span>
                          {ticket.response}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">
                          Aguardando análise da equipe...
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isFechado && (
                          <button
                            type="button"
                            onClick={() => onCloseTicket(ticket.id)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                          >
                            Encerrar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenTicket(ticket)}
                          className={`rounded-xl px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition active:scale-95 ${
                            isRespondido
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          {isRespondido ? "Ver Resposta" : isAberto ? "Detalhes" : "Histórico"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
