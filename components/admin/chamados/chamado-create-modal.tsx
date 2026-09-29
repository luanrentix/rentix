"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Building2,
  User,
  FileText,
  Send,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { AdminCompany, AdminUser } from "@/services/admin.service";

interface ChamadoCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: AdminCompany[];
  users: AdminUser[];
  onCreateTicket: (payload: {
    targetCompanyId: string;
    targetUserId: string;
    subject: string;
    message: string;
  }) => Promise<void>;
}

export function ChamadoCreateModal({
  isOpen,
  onClose,
  companies,
  users,
  onCreateTicket,
}: ChamadoCreateModalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const filteredUsers = useMemo(() => {
    if (!selectedCompanyId) return [];
    return users.filter((u) => u.company.id === selectedCompanyId);
  }, [selectedCompanyId, users]);

  useEffect(() => {
    if (filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    } else {
      setSelectedUserId("");
    }
  }, [selectedCompanyId, filteredUsers]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId || !selectedUserId || !subject.trim() || !message.trim()) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onCreateTicket({
        targetCompanyId: selectedCompanyId,
        targetUserId: selectedUserId,
        subject: subject.trim(),
        message: message.trim(),
      });
      onClose();
      setSubject("");
      setMessage("");
      setSelectedCompanyId("");
      setSelectedUserId("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao criar novo chamado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
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
                Iniciar Novo Chamado
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Envie uma notificação ou chamado diretamente para uma empresa cliente.
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

        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Empresa */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Empresa de Destino *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
          </div>

          {/* Usuário da Empresa */}
          {selectedCompanyId && (
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Usuário Destinatário *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
            </div>
          )}

          {/* Assunto */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Assunto *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Atualização do Módulo de Contas a Pagar"
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white uppercase"
              required
            />
          </div>

          {/* Mensagem Inicial */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Mensagem Inicial *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o motivo do chamado ou notificação para o cliente..."
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
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
              disabled={isSubmitting || !selectedUserId || !subject.trim() || !message.trim()}
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
                  <span>Iniciar Conversa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
