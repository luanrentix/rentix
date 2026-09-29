"use client";

import React, { useState } from "react";
import {
  Clock,
  Building2,
  User,
  MessageCircle,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Send,
  Eye,
  CornerDownRight,
  Inbox,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import type { SupportTicket } from "@/services/chamados.service";
import {
  formatDateTime,
  formatRelativeTime,
  parseMessageWithAttachment,
} from "./chamados-types";

interface ChamadosCardsProps {
  tickets: SupportTicket[];
  onOpenTicket: (ticket: SupportTicket) => void;
  onCloseTicket: (ticketId: string) => void;
  onResetFilters?: () => void;
}

export function ChamadosCards({
  tickets,
  onOpenTicket,
  onCloseTicket,
  onResetFilters,
}: ChamadosCardsProps) {
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <Inbox className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-base font-black text-slate-800 dark:text-white">
          Nenhum chamado de suporte encontrado
        </h3>
        <p className="mt-1 max-w-sm text-xs font-semibold text-slate-400 dark:text-slate-500">
          Não há registros correspondentes aos critérios de busca ou filtros aplicados.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 rounded-2xl bg-slate-100 px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition"
          >
            Limpar Filtros de Busca
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tickets.map((ticket) => {
          const { cleanMessage, attachment } = parseMessageWithAttachment(ticket.message);
          const isAberto = ticket.status === "ABERTO";
          const isRespondido = ticket.status === "RESPONDIDO";
          const isFechado = ticket.status === "FECHADO";

          const initials = (ticket.user?.name || "U")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase())
            .join("");

          return (
            <div
              key={ticket.id}
              className={`group relative rounded-3xl border bg-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-slate-900 ${
                isAberto
                  ? "border-amber-200/80 hover:border-amber-300 dark:border-amber-900/40"
                  : isRespondido
                  ? "border-blue-200/80 hover:border-blue-300 dark:border-blue-900/40"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
              }`}
            >
              {/* Topo do Card: Status Badge + Data + Empresa */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Badge */}
                  {isAberto && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      Em Aberto
                    </span>
                  )}

                  {isRespondido && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                      <Send className="h-3 w-3" />
                      Respondido
                    </span>
                  )}

                  {isFechado && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Concluído
                    </span>
                  )}

                  {/* Empresa */}
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ticket.company?.tradeName || "Empresa Geral"}</span>
                  </span>
                </div>

                {/* Data e Horário */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span title={formatDateTime(ticket.createdAt)}>
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                </div>
              </div>

              {/* Corpo Principal: Solicitante + Assunto + Mensagem */}
              <div className="mt-4 space-y-3">
                {/* Linha do Solicitante */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 text-xs font-black text-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                      {ticket.user?.name || "Usuário não identificado"}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {ticket.user?.email || "Sem e-mail"}
                    </p>
                  </div>
                </div>

                {/* Assunto */}
                <div>
                  <h4 className="text-base font-black text-slate-900 uppercase tracking-tight dark:text-white">
                    {ticket.subject}
                  </h4>
                </div>

                {/* Mensagem do Cliente */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs font-medium leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                  <p className="whitespace-pre-wrap line-clamp-3">{cleanMessage}</p>

                  {/* Thumbnail de Imagem / Anexo se houver */}
                  {attachment && (
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-200/50 pt-3 dark:border-slate-700/50">
                      <Paperclip className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                        {attachment.name}
                      </span>
                      {attachment.isImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: attachment.content, name: attachment.name })}
                          className="ml-auto inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[11px] font-black text-indigo-600 hover:bg-indigo-50 dark:bg-slate-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600"
                        >
                          <Eye className="h-3 w-3" />
                          Ver Print
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Prévia da Resposta do Suporte se houver */}
                {ticket.response && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      <CornerDownRight className="h-3.5 w-3.5" />
                      <span>Resposta Enviada pelo Suporte Contrx</span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap line-clamp-2">
                      {ticket.response}
                    </p>
                  </div>
                )}
              </div>

              {/* Rodapé com Ações */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  ID: #{ticket.id.slice(0, 8)}
                </span>

                <div className="flex items-center gap-2">
                  {!isFechado && (
                    <button
                      type="button"
                      onClick={() => onCloseTicket(ticket.id)}
                      className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition active:scale-95"
                    >
                      Encerrar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenTicket(ticket)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 ${
                      isAberto
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>
                      {isAberto
                        ? "Atender / Responder"
                        : isRespondido
                        ? "Ver Conversa / Editar"
                        : "Visualizar Histórico"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal para Preview de Imagem / Print */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-white p-3 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">
                {previewImage.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-center p-2 max-h-[75vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="max-h-[70vh] w-auto rounded-2xl object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
