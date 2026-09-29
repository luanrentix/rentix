"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { getReadableDate, type ScheduleItem } from "./agenda.types";

type AgendaDeleteModalProps = {
  item: ScheduleItem | null;
  isDeleting: boolean;
  operationError: string;
  onClose: () => void;
  onConfirmDelete: () => void;
  isBlackTheme: boolean;
};

export function AgendaDeleteModal({
  item,
  isDeleting,
  operationError,
  onClose,
  onConfirmDelete,
  isBlackTheme,
}: AgendaDeleteModalProps) {
  if (!item) return null;

  const pageThemeClass = isBlackTheme ? "theme-black" : "theme-light";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";
  const secondaryButtonClass = isBlackTheme
    ? "inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-bold text-[#f8fafc] transition hover:border-[#475569] hover:bg-[#0f172a]"
    : "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${pageThemeClass}`}
    >
      <div
        className={`w-full max-w-md rounded-2xl p-5 text-center shadow-2xl ring-1 ${
          isBlackTheme
            ? "bg-[#0f172a] text-[#f8fafc] ring-[#334155]"
            : "bg-[#ffffff] text-[#0f172a] ring-[#e2e8f0]"
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className={`mt-4 text-2xl font-black ${strongTextClass}`}>
          Excluir agendamento?
        </h2>
        <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
          Essa ação removerá o compromisso da agenda permanentemente.
        </p>

        <div
          className={`mt-5 rounded-2xl border p-4 text-left ${
            isBlackTheme
              ? "border-[#334155] bg-[#020617]"
              : "border-[#e2e8f0] bg-[#f8fafc]"
          }`}
        >
          <p className={`text-sm font-black ${strongTextClass}`}>{item.title}</p>
          <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>
            {getReadableDate(item.date)} às {item.time}
          </p>
          <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>
            {item.customerName || "Sem pessoa vinculada"} ·{" "}
            {item.propertyName || "Sem bem/ativo vinculado"}
          </p>
        </div>

        {operationError && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
              isBlackTheme
                ? "border-red-900/60 bg-red-950/30 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {operationError}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={secondaryButtonClass}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70 active:scale-95"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
