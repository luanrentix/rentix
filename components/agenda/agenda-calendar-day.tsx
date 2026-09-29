"use client";

import type { ReactNode } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { getReadableDate, type ScheduleItem } from "./agenda.types";

type AgendaCalendarDayProps = {
  selectedDate: string;
  selectedDateItems: ScheduleItem[];
  renderScheduleCard: (item: ScheduleItem) => ReactNode;
  onCreateSchedule: () => void;
  isBlackTheme: boolean;
};

export function AgendaCalendarDay({
  selectedDate,
  selectedDateItems,
  renderScheduleCard,
  onCreateSchedule,
  isBlackTheme,
}: AgendaCalendarDayProps) {
  if (selectedDateItems.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-dashed p-8 text-center ${
          isBlackTheme
            ? "border-orange-900/60 bg-orange-950/20"
            : "border-orange-200 bg-orange-50/60"
        }`}
      >
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
            isBlackTheme
              ? "bg-[#020617] text-orange-300"
              : "bg-[#ffffff] text-orange-600 shadow-sm"
          }`}
        >
          <CalendarDays className="h-7 w-7" />
        </div>
        <p
          className={`mt-4 text-xl font-black ${
            isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"
          }`}
        >
          Dia livre
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"
          }`}
        >
          Não existe compromisso para {getReadableDate(selectedDate)} com os filtros atuais.
        </p>
        <button
          type="button"
          onClick={onCreateSchedule}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          Agendar para este dia
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {selectedDateItems.map((item) => renderScheduleCard(item))}
    </div>
  );
}
