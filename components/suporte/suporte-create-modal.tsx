"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Plus,
  Send,
  AlertCircle,
  Loader2,
  Paperclip,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { criarChamado } from "@/services/chamados.service";

interface SuporteCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_CHIPS = [
  "Dúvida Operacional",
  "Módulo Financeiro",
  "Bens e Imóveis",
  "Contratos e Locação",
  "Sugestão de Melhoria",
  "Inconsistência Técnica",
];

export function SuporteCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: SuporteCreateModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Anexos
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

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
    setError("");
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

  const handleFileChange = useCallback((file: File) => {
    setError("");

    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo não pode exceder o tamanho limite de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachmentBase64(base64);
      setAttachmentName(file.name);

      if (file.type.startsWith("image/")) {
        setAttachmentPreview(base64);
      } else {
        setAttachmentPreview("document");
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachmentBase64(null);
    setAttachmentName("");
    setAttachmentPreview(null);
  }, []);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Por favor, preencha o assunto do chamado.");
      return;
    }
    if (!message.trim()) {
      setError("Por favor, descreva sua solicitação ou dúvida.");
      return;
    }

    try {
      setSubmitting(true);

      let finalMessage = message.trim();
      if (attachmentBase64) {
        finalMessage += `\n\n--- ATTACHMENT: ${attachmentName} | ${attachmentBase64} ---`;
      }

      await criarChamado({
        subject: subject.trim(),
        message: finalMessage,
      });

      setSubject("");
      setMessage("");
      removeAttachment();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao enviar o chamado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card Draggable & Resizable */}
      <div
        ref={modalRef}
        style={{
          transform: !isMaximized ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0)` : "none",
          resize: !isMaximized ? "both" : "none",
        }}
        className={`relative flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden ${
          isMaximized
            ? "fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none rounded-2xl"
            : "max-h-[92vh] w-full max-w-lg min-w-[340px] min-h-[460px]"
        }`}
      >
        {/* Cabeçalho Draggable */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex select-none items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 ${
            !isMaximized ? "cursor-move" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Abrir Novo Chamado
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Envie sua dúvida, sugestão ou relato diretamente para a equipe técnica.
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
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Sugestões de Categorias */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Categoria / Atalhos Rápidos
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_CHIPS.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSubject(cat)}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Assunto */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Assunto do Chamado *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Dúvida sobre conciliação bancária"
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          {/* Mensagem Detalhada */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Mensagem ou Descrição Detalhada *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva com detalhes o que você precisa ou o que aconteceu..."
              rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          {/* Anexar Imagem ou Print */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Captura de Tela ou Print de Evidência (Opcional)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="user-ticket-attachment"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Selecionar Print / Imagem (Max 5MB)</span>
                </label>
                <input
                  type="file"
                  id="user-ticket-attachment"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />

                {attachmentName && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <span className="truncate max-w-[150px]">{attachmentName}</span>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="text-red-500 hover:text-red-700 font-black ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {attachmentPreview && attachmentPreview !== "document" && (
                <div className="relative group max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachmentPreview}
                    alt="Preview"
                    className="max-h-36 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="absolute top-2 right-2 rounded-full bg-slate-900/80 p-1 text-white hover:bg-red-600 transition"
                    title="Remover anexo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Enviar Chamado</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
