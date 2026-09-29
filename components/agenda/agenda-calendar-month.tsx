"use client";

import type { MouseEvent } from "react";
import {
  formatDateToInputValue,
  monthNames,
  weekDayLabels,
  type ScheduleItem,
} from "./agenda.types";

type AgendaCalendarMonthProps = {
  calendarDays: Date[];
  currentCalendarDate: Date;
  selectedDate: string;
  todayInputValue: string;
  filteredItems: ScheduleItem[];
  onSelectDate: (date: Date) => void;
  onContextMenu: (event: MouseEvent, dateValue: string) => void;
  isBlackTheme: boolean;
};

export function AgendaCalendarMonth({
  calendarDays,
  currentCalendarDate,
  selectedDate,
  todayInputValue,
  filteredItems,
  onSelectDate,
  onContextMenu,
  isBlackTheme,
}: AgendaCalendarMonthProps) {
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";

  return (
    <div className="mt-4 overflow-x-auto pb-2">
      <div className="grid min-w-[640px] grid-cols-7 gap-1.5 lg:min-w-0 xl:gap-2">
        {weekDayLabels.map((dayLabel) => (
          <div
            key={dayLabel}
            className={
              isBlackTheme
                ? "rounded-lg bg-orange-950/30 px-2 py-2 text-center text-[11px] font-black uppercase text-orange-300"
                : "rounded-lg bg-orange-50 px-2 py-2 text-center text-[11px] font-black uppercase text-orange-700"
            }
          >
            {dayLabel}
          </div>
        ))}

        {calendarDays.map((date) => {
          const inputDateValue = formatDateToInputValue(date);
          const dateItems = filteredItems.filter(
            (item) => item.date === inputDateValue,
          );
          const isCurrentMonth =
            date.getMonth() === currentCalendarDate.getMonth();
          const isSelectedDate = inputDateValue === selectedDate;
          const isToday = inputDateValue === todayInputValue;

          return (
            <button
              key={inputDateValue}
              type="button"
              onClick={() => onSelectDate(date)}
              onContextMenu={(e) => onContextMenu(e, inputDateValue)}
              aria-pressed={isSelectedDate}
              title={
                dateItems.length > 0
                  ? `${date.getDate()} de ${monthNames[date.getMonth()]}: ${dateItems
                      .map((i) => `${i.time} - ${i.title}`)
                      .join("; ")} (Botão direito para novo agendamento)`
                  : `${date.getDate()} de ${monthNames[date.getMonth()]}: Nenhum compromisso (Botão direito para novo agendamento)`
              }
              style={{ aspectRatio: "1.25 / 1" }}
              className={`w-full rounded-xl border p-2 text-left transition-all duration-200 relative flex flex-col justify-between ${
                isSelectedDate
                  ? "border-orange-500 bg-orange-500/10 shadow-sm ring-1 ring-orange-500/30"
                  : isBlackTheme
                    ? "border-[#334155]/60 bg-[#020617] hover:border-orange-500/40 hover:bg-orange-500/[0.04]"
                    : "border-[#e2e8f0] bg-[#ffffff] hover:border-orange-500/30 hover:bg-orange-50/30"
              } ${!isCurrentMonth ? "opacity-35" : ""}`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-black flex h-7 w-7 items-center justify-center rounded-lg ${
                    isToday
                      ? "bg-orange-500 text-white font-extrabold shadow-sm"
                      : isSelectedDate
                        ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold"
                        : isBlackTheme
                          ? "text-[#cbd5e1]"
                          : "text-slate-700"
                  }`}
                >
                  {date.getDate()}
                </span>
                {dateItems.length > 0 && (
                  <span
                    className={`text-[10px] font-black rounded-full px-1.5 py-0.5 ${
                      isBlackTheme
                        ? "bg-orange-950/60 text-orange-400 border border-orange-500/20"
                        : "bg-orange-50 text-orange-700 border border-orange-200"
                    }`}
                  >
                    {dateItems.length}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1 w-full flex-1 flex flex-col justify-end">
                {dateItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    title={`${item.time} - ${item.title}${item.customerName ? ` (${item.customerName})` : ""}`}
                    className={`truncate rounded-lg px-2 py-0.5 text-[10px] font-bold w-full ${
                      item.priority === "high"
                        ? "bg-red-600 text-white shadow-sm"
                        : isBlackTheme
                          ? "bg-[#1e293b] text-[#cbd5e1]"
                          : "bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]"
                    }`}
                  >
                    {item.time} · {item.title}
                  </div>
                ))}
                {dateItems.length > 2 && (
                  <p className={`px-1 text-[10px] font-black ${mutedTextClass}`}>
                    + {dateItems.length - 2} mais
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
