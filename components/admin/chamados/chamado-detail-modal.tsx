"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Paperclip,
  Eye,
  Sparkles,
  MessageCircle,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { SupportTicket } from "@/services/chamados.service";
import {
  formatDateTime,
  formatRelativeTime,
  parseMessageWithAttachment,
} from "./chamados-types";

interface ChamadoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onSendResponse: (ticketId: string, response: string, closeAfter?: boolean) => Promise<void>;
  onCloseTicket: (ticketId: string) => Promise<void>;
}

const QUICK_TEMPLATES = [
  "Olá! Recebemos sua solicitação e nossa equipe técnica já está analisando o caso.",
  "Verificamos e o ajuste já foi aplicado no sistema. Por favor, atualize a página e teste novamente.",
  "Poderia nos fornecer mais detalhes ou uma captura de tela do momento exato do ocorrido?",
  "A solicitação foi concluída com sucesso. Permanecemos à disposição caso necessite de mais suporte.",
];

export function ChamadoDetailModal({
  isOpen,
  onClose,
  ticket,
  onSendResponse,
  onCloseTicket,
}: ChamadoDetailModalProps) {
  const [responseText, setResponseText] = useState("");
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
    if (ticket) {
      setResponseText(ticket.response || "");
      setErrorMessage("");
    }
  }, [isOpen, ticket]);

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

  const initials = (ticket.user?.name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  async function handleSend(closeAfter: boolean = false) {
    if (!ticket) return;
    if (!responseText.trim()) {
      setErrorMessage("Por favor, digite uma resposta antes de enviar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onSendResponse(ticket.id, responseText.trim(), closeAfter);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao enviar resposta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend(false);
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
              : "max-h-[92vh] w-full max-w-3xl min-w-[340px] min-h-[460px]"
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
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      Em Aberto
                    </span>
                  )}
                  {isRespondido && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      Respondido
                    </span>
                  )}
                  {isFechado && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Concluído
                    </span>
                  )}
                </div>
                <p className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {ticket.company?.tradeName || "Empresa Geral"} • Solicitado por {ticket.user?.name || "Usuário"} ({ticket.user?.email})
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

          {/* Timeline de Conversa (Chat) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Mensagem do Cliente */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-300 text-xs font-black text-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
                {initials}
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {ticket.user?.name}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {formatDateTime(ticket.createdAt)} ({formatRelativeTime(ticket.createdAt)})
                  </span>
                </div>

                <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50/80 p-4 text-xs font-medium leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
                  <p className="whitespace-pre-wrap">{cleanMessage}</p>

                  {/* Anexo de Imagem se houver */}
                  {attachment && (
                    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <Paperclip className="h-4 w-4 text-indigo-500" />
                        <span>Anexo / Captura de tela: {attachment.name}</span>
                      </div>
                      {attachment.isImage ? (
                        <div className="relative group max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.content}
                            alt={attachment.name}
                            className="max-h-60 w-full object-cover cursor-pointer transition hover:opacity-95"
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
            </div>

            {/* Resposta Anterior do Suporte (se existir) */}
            {ticket.response && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xs font-black text-white shadow-md shadow-indigo-600/20">
                  CX
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span>Equipe Contrx Suporte</span>
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        Oficial
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {formatDateTime(ticket.updatedAt)}
                    </span>
                  </div>

                  <div className="rounded-2xl rounded-tl-sm border border-indigo-100 bg-indigo-50/40 p-4 text-xs font-medium leading-relaxed text-slate-800 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-slate-200">
                    <p className="whitespace-pre-wrap">{ticket.response}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Painel de Ação / Composição de Resposta */}
          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 space-y-3 shrink-0">
            {/* Atalhos Rápidos de Templates */}
            <div>
              <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Respostas Rápidas</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResponseText(tmpl)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    Template #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Caixa de Texto */}
            <div className="relative">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva a resposta para o cliente (será enviada por e-mail e notificação)... (Ctrl + Enter para enviar)"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-indigo-950"
              />
            </div>

            {/* Barra de Envio e Opções */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Pressione <kbd className="rounded bg-slate-200 px-1 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">Ctrl + Enter</kbd> para enviar
              </span>

              <div className="flex items-center gap-2">
                {!isFechado && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("Deseja realmente encerrar este chamado sem enviar nova resposta?")) {
                        await onCloseTicket(ticket.id);
                        onClose();
                      }
                    }}
                    disabled={isSubmitting}
                    className="rounded-2xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                  >
                    Apenas Encerrar
                  </button>
                )}

                {!isFechado && (
                  <button
                    type="button"
                    onClick={() => handleSend(true)}
                    disabled={isSubmitting || !responseText.trim()}
                    className="rounded-2xl border border-emerald-500 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 transition disabled:opacity-50"
                  >
                    Responder e Concluir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSend(false)}
                  disabled={isSubmitting || !responseText.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{isRespondido ? "Atualizar Resposta" : "Enviar Resposta"}</span>
                    </>
                  )}
                </button>
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
