"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { getReadableDate, type ScheduleItem } from "./agenda.types";

type AgendaCompleteModalProps = {
  isOpen: boolean;
  item: ScheduleItem | null;
  onClose: () => void;
  onConfirmComplete: (item: ScheduleItem, outcomeNote: string) => Promise<void>;
  isBlackTheme: boolean;
};

export function AgendaCompleteModal({
  isOpen,
  item,
  onClose,
  onConfirmComplete,
  isBlackTheme,
}: AgendaCompleteModalProps) {
  const [outcomeNote, setOutcomeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const pageThemeClass = isBlackTheme ? "theme-black" : "theme-light";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";
  const inputClass = isBlackTheme
    ? "w-full rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-semibold text-[#f8fafc] placeholder-[#64748b] transition focus:border-orange-500 focus:outline-none"
    : "w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] transition focus:border-orange-500 focus:bg-[#ffffff] focus:outline-none";
  const secondaryButtonClass = isBlackTheme
    ? "inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-bold text-[#f8fafc] transition hover:border-[#475569] hover:bg-[#0f172a]"
    : "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]";

  const handleSubmit = async (withNote: boolean) => {
    setIsSubmitting(true);
    try {
      await onConfirmComplete(item, withNote ? outcomeNote.trim() : "");
      setOutcomeNote("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${pageThemeClass}`}
    >
      <div
        className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ring-1 ${
          isBlackTheme
            ? "bg-[#0f172a] text-[#f8fafc] ring-[#334155]"
            : "bg-[#ffffff] text-[#0f172a] ring-[#e2e8f0]"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className={`text-xl font-black ${strongTextClass}`}>
                Concluir Agendamento
              </h2>
              <p className={`text-xs font-semibold ${mutedTextClass}`}>
                Registre o desfecho do atendimento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              isBlackTheme ? "hover:bg-slate-800" : "hover:bg-slate-100"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`mt-4 rounded-xl border p-3 text-left ${
            isBlackTheme
              ? "border-[#334155] bg-[#020617]"
              : "border-[#e2e8f0] bg-[#f8fafc]"
          }`}
        >
          <p className={`text-sm font-black ${strongTextClass}`}>{item.title}</p>
          <p className={`mt-0.5 text-xs font-semibold ${mutedTextClass}`}>
            {getReadableDate(item.date)} às {item.time} · {item.customerName || "Sem cliente"} ·{" "}
            {item.propertyName || "Sem imóvel"}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <label
            className={`block text-xs font-black uppercase tracking-[0.14em] ${
              isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"
            }`}
          >
            Nota de desfecho / Resultado (opcional)
          </label>
          <textarea
            rows={3}
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            placeholder="Ex: Vistoria realizada com sucesso, sem avarias. Chaves entregues ao locatário."
            className={inputClass}
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={secondaryButtonClass}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(Boolean(outcomeNote.trim()))}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 active:scale-95"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {outcomeNote.trim() ? "Salvar com anotação" : "Concluir agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
