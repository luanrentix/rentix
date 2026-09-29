"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Paperclip,
  Eye,
  MessageCircle,
  Loader2,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { SupportTicket } from "@/services/chamados.service";
import {
  formatDateTime,
  formatRelativeTime,
  parseMessageWithAttachment,
} from "./suporte-types";

interface SuporteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onSendReply: (ticketId: string, replyText: string) => Promise<void>;
  onCloseTicket: (ticketId: string) => Promise<void>;
}

export function SuporteDetailModal({
  isOpen,
  onClose,
  ticket,
  onSendReply,
  onCloseTicket,
}: SuporteDetailModalProps) {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  // Estados de Janela Draggable & Maximizável
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDragPos({ x: 0, y: 0 });
    setIsMaximized(false);
    setReplyText("");
    setErrorMessage("");
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest("button, input, select, textarea, a, label")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setDragPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen || !ticket) return null;

  const { cleanMessage, attachment } = parseMessageWithAttachment(ticket.message);
  const isAberto = ticket.status === "ABERTO";
  const isRespondido = ticket.status === "RESPONDIDO";
  const isFechado = ticket.status === "FECHADO";

  async function handleSendReply() {
    if (!ticket) return;
    if (!replyText.trim()) {
      setErrorMessage("Por favor, digite sua mensagem antes de enviar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onSendReply(ticket.id, replyText.trim());
      setReplyText("");
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao enviar réplica.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window Draggable & Resizable */}
        <div
          ref={modalRef}
          style={{
            transform: !isMaximized ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0)` : "none",
            resize: !isMaximized ? "both" : "none",
          }}
          className={`relative flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden ${
            isMaximized
              ? "fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none rounded-2xl"
              : "max-h-[92vh] w-full max-w-2xl min-w-[340px] min-h-[460px]"
          }`}
        >
          {/* Cabeçalho Draggable */}
          <div
            onMouseDown={handleMouseDown}
            className={`flex select-none items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 ${
              !isMaximized ? "cursor-move" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {ticket.subject}
                  </h3>
                  {isAberto && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      Em Análise
                    </span>
                  )}
                  {isRespondido && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      Resposta Pronta
                    </span>
                  )}
                  {isFechado && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Concluído
                    </span>
                  )}
                </div>
                <p className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                  Protocolo #{ticket.id.slice(0, 8)} • Aberto em {formatDateTime(ticket.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                title={isMaximized ? "Restaurar tamanho" : "Maximizar"}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Timeline de Conversa */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Mensagem Original do Usuário */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Sua Solicitação Original
                </span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {formatDateTime(ticket.createdAt)}
                </span>
              </div>

              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50/80 p-4 text-xs font-medium leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
                <p className="whitespace-pre-wrap">{cleanMessage}</p>

                {/* Imagem / Anexo se houver */}
                {attachment && (
                  <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Paperclip className="h-4 w-4 text-indigo-500" />
                      <span>Anexo enviado: {attachment.name}</span>
                    </div>
                    {attachment.isImage ? (
                      <div className="relative group max-w-sm overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={attachment.content}
                          alt={attachment.name}
                          className="max-h-56 w-full object-cover cursor-pointer transition hover:opacity-95"
                          onClick={() => setPreviewImage({ src: attachment.content, name: attachment.name })}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: attachment.content, name: attachment.name })}
                          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-xl bg-slate-900/80 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm hover:bg-slate-900"
                        >
                          <Eye className="h-3 w-3" />
                          Ampliar
                        </button>
                      </div>
                    ) : (
                      <a
                        href={attachment.content}
                        download={attachment.name}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 border border-slate-200 dark:border-slate-700"
                      >
                        Baixar Arquivo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Resposta do Suporte Contrx */}
            {ticket.response ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>Equipe de Suporte Contrx</span>
                    <span className="rounded-md bg-blue-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      Oficial
                    </span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {formatDateTime(ticket.updatedAt)}
                  </span>
                </div>

                <div className="rounded-2xl rounded-tl-sm border border-blue-200 bg-blue-50/50 p-4 text-xs font-medium leading-relaxed text-slate-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-slate-100">
                  <p className="whitespace-pre-wrap">{ticket.response}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-4 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  A equipe de suporte técnico já recebeu seu chamado e está analisando o caso. Você receberá um retorno em breve.
                </p>
              </div>
            )}
          </div>

          {/* Rodapé com Réplica ou Conclusão */}
          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 space-y-3 shrink-0">
            {!isFechado && ticket.status === "RESPONDIDO" && (
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ainda tem dúvidas? Envie uma réplica para a equipe:
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva sua mensagem ou dúvida complementar..."
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {!isFechado && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Confirmar que a dúvida ou solicitação foi resolvida e encerrar o chamado?")) {
                      await onCloseTicket(ticket.id);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Problema Resolvido / Encerrar</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                >
                  Fechar
                </button>

                {!isFechado && ticket.status === "RESPONDIDO" && (
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isSubmitting || !replyText.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Enviar Réplica</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal para Visualizar Anexo Grande */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
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
