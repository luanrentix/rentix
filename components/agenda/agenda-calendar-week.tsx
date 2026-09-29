"use client";

import {
  formatDateToInputValue,
  getTypeAccentClass,
  weekDayLabels,
  type ScheduleItem,
} from "./agenda.types";

type AgendaCalendarWeekProps = {
  weekDays: Date[];
  selectedDate: string;
  todayInputValue: string;
  weekItems: ScheduleItem[];
  onSelectDate: (dateValue: string) => void;
  onOpenEdit: (item: ScheduleItem) => void;
  isBlackTheme: boolean;
};

export function AgendaCalendarWeek({
  weekDays,
  selectedDate,
  todayInputValue,
  weekItems,
  onSelectDate,
  onOpenEdit,
  isBlackTheme,
}: AgendaCalendarWeekProps) {
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";

  return (
    <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
      {weekDays.map((date) => {
        const dateValue = formatDateToInputValue(date);
        const items = weekItems.filter((item) => item.date === dateValue);
        const isToday = dateValue === todayInputValue;
        const isSelected = dateValue === selectedDate;

        return (
          <div
            key={dateValue}
            onClick={() => onSelectDate(dateValue)}
            className={`rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 flex flex-col ${
              isSelected
                ? "border-orange-500 bg-orange-500/5 shadow-md ring-1 ring-orange-500/30"
                : isToday
                  ? "border-orange-500/30 bg-orange-500/[0.02]"
                  : isBlackTheme
                    ? "border-[#334155]/60 bg-[#020617] hover:border-[#334155] hover:bg-orange-500/[0.01]"
                    : "border-[#e2e8f0] bg-[#ffffff] hover:border-[#cbd5e1] hover:bg-orange-50/25"
            }`}
          >
            <div className="w-full text-left pb-2 border-b border-dashed border-[#e2e8f0] dark:border-[#334155]/60 flex items-center justify-between">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${mutedTextClass}`}>
                  {weekDayLabels[date.getDay()]}
                </p>
                <p
                  className={`mt-0.5 text-lg font-black ${
                    isToday ? "text-orange-500 font-extrabold" : strongTextClass
                  }`}
                >
                  {date.getDate()}
                </p>
              </div>
              {items.length > 0 && (
                <span
                  className={`text-[10px] font-black rounded-full px-1.5 py-0.5 ${
                    isBlackTheme
                      ? "bg-orange-950/60 text-orange-400 border border-orange-500/20"
                      : "bg-orange-50 text-orange-700 border border-orange-200"
                  }`}
                >
                  {items.length}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2 flex-1">
              {items.length > 0 ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectDate(dateValue);
                      onOpenEdit(item);
                    }}
                    className={`w-full rounded-xl border-l-4 p-2 text-left text-xs font-bold transition hover:-translate-y-0.5 shadow-sm ${getTypeAccentClass(
                      item.type,
                      isBlackTheme,
                    )}`}
                  >
                    <span className="block text-orange-600 text-[10px] font-black">
                      {item.time}
                    </span>
                    <span className={`line-clamp-2 ${strongTextClass}`}>
                      {item.title}
                    </span>
                  </button>
                ))
              ) : (
                <div className="h-full flex items-center justify-center min-h-[4rem]">
                  <p
                    className={`w-full text-center text-xs font-bold py-4 rounded-xl border border-dashed ${
                      isBlackTheme
                        ? "border-[#334155]/60 text-[#475569]"
                        : "border-[#e2e8f0] text-[#94a3b8]"
                    }`}
                  >
                    Livre
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
