"use client";

import { Plus } from "lucide-react";

type AgendaHeaderProps = {
  onTodayClick: () => void;
  onNewScheduleClick: () => void;
  isBlackTheme: boolean;
};

export function AgendaHeader({
  onTodayClick,
  onNewScheduleClick,
  isBlackTheme,
}: AgendaHeaderProps) {
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";
  const secondaryButtonClass = isBlackTheme
    ? "inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-bold text-[#f8fafc] transition hover:border-[#475569] hover:bg-[#0f172a]"
    : "inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]";

  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
          PLANEJAMENTO OPERACIONAL
        </p>
        <h1 className={`mt-2 text-3xl font-black ${strongTextClass}`}>
          Agenda de Compromissos
        </h1>
        <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
          Gerencie vistorias, contratos, manutenções e rotinas com lembretes proativos.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTodayClick}
          className={secondaryButtonClass}
        >
          Ver hoje
        </button>
        <button
          type="button"
          onClick={onNewScheduleClick}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Novo agendamento
        </button>
      </div>
    </div>
  );
}
