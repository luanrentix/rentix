"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  getPriorityBadgeClass,
  getReadableDate,
  getShortDate,
  getTypeAccentClass,
  priorityLabels,
  type CalendarViewMode,
  type ScheduleItem,
} from "./agenda.types";

type AgendaSidePanelProps = {
  selectedDate: string;
  selectedDateItems: ScheduleItem[];
  nextSevenDaysItems: ScheduleItem[];
  monthItems: ScheduleItem[];
  viewMode: CalendarViewMode;
  onCreateSchedule: (date: string) => void;
  onOpenEdit: (item: ScheduleItem) => void;
  onSelectDate: (date: string) => void;
  renderScheduleCard: (item: ScheduleItem, isCompact?: boolean) => ReactNode;
  uniqueTypeOptions: string[];
  isBlackTheme: boolean;
};

export function AgendaSidePanel({
  selectedDate,
  selectedDateItems,
  nextSevenDaysItems,
  monthItems,
  viewMode,
  onCreateSchedule,
  onOpenEdit,
  onSelectDate,
  renderScheduleCard,
  uniqueTypeOptions,
  isBlackTheme,
}: AgendaSidePanelProps) {
  const cardClass = isBlackTheme
    ? "border-[#334155] bg-[#0f172a]"
    : "border-[#e2e8f0] bg-[#ffffff]";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";

  return (
    <aside className="md:col-span-1 space-y-4 md:sticky md:top-4 md:self-start">
      {viewMode !== "day" && (
        <div className={`rounded-2xl border p-4 shadow-sm md:p-5 ${cardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                DATA SELECIONADA
              </p>
              <h2 className={`mt-2 text-lg font-black ${strongTextClass}`}>
                {getReadableDate(selectedDate)}
              </h2>
              <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>
                {selectedDateItems.length} compromisso(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCreateSchedule(selectedDate)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 active:scale-95"
              aria-label="Criar agendamento na data selecionada"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {selectedDateItems.length > 0 ? (
              selectedDateItems.map((item) => renderScheduleCard(item, true))
            ) : (
              <p
                className={`rounded-2xl border border-dashed p-6 text-center text-sm font-bold ${
                  isBlackTheme
                    ? "border-[#334155] text-[#94a3b8]"
                    : "border-[#e2e8f0] text-[#64748b]"
                }`}
              >
                Nenhum compromisso nesta data.
              </p>
            )}
          </div>
        </div>
      )}

      <div className={`rounded-2xl border p-4 shadow-sm md:p-5 ${cardClass}`}>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
          Próximos 7 dias
        </p>
        <h2 className={`mt-2 text-lg font-black ${strongTextClass}`}>
          Fila operacional
        </h2>
        <div className="mt-4 space-y-3">
          {nextSevenDaysItems.length > 0 ? (
            nextSevenDaysItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectDate(item.date);
                  onOpenEdit(item);
                }}
                className={`w-full rounded-xl border-l-4 p-3 text-left transition hover:-translate-y-0.5 ${getTypeAccentClass(
                  item.type,
                  isBlackTheme,
                )}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-orange-600">
                    {getShortDate(item.date)} · {item.time}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black ${getPriorityBadgeClass(
                      item.priority,
                      isBlackTheme,
                    )}`}
                  >
                    {priorityLabels[item.priority]}
                  </span>
                </div>
                <p className={`mt-2 text-sm font-black ${strongTextClass}`}>
                  {item.title}
                </p>
                <p className={`mt-1 truncate text-xs font-semibold ${mutedTextClass}`}>
                  {item.customerName || "Sem pessoa vinculada"} ·{" "}
                  {item.propertyName || "Sem bem/ativo vinculado"}
                </p>
              </button>
            ))
          ) : (
            <p
              className={`rounded-2xl border border-dashed p-6 text-center text-sm font-bold ${
                isBlackTheme
                  ? "border-[#334155] text-[#94a3b8]"
                  : "border-[#e2e8f0] text-[#64748b]"
              }`}
            >
              Nenhum compromisso agendado para os próximos dias.
            </p>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border p-4 shadow-sm md:p-5 ${cardClass}`}>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
          Resumo do mês
        </p>
        <h2 className={`mt-2 text-lg font-black ${strongTextClass}`}>
          {monthItems.length} evento(s)
        </h2>
        <div className="mt-4 space-y-3">
          {uniqueTypeOptions.slice(0, 6).map((type) => {
            const total = monthItems.filter((item) => item.type === type).length;
            const percentage =
              monthItems.length > 0 ? Math.round((total / monthItems.length) * 100) : 0;

            return (
              <div key={type}>
                <div className="flex items-center justify-between gap-3 text-sm font-bold">
                  <span className={strongTextClass}>{type}</span>
                  <span className={mutedTextClass}>{total}</span>
                </div>
                <div
                  className={
                    isBlackTheme
                      ? "mt-2 h-2 overflow-hidden rounded-full bg-[#1e293b]"
                      : "mt-2 h-2 overflow-hidden rounded-full bg-[#f1f5f9]"
                  }
                >
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
