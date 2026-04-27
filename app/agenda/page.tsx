"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type ScheduleStatus = "scheduled" | "completed" | "canceled";
type CalendarViewMode = "month" | "week" | "day";

type ScheduleItem = {
  id: number;
  title: string;
  customerName: string;
  propertyName: string;
  date: string;
  time: string;
  type: string;
  status: ScheduleStatus;
  notes: string;
};

const scheduleItems: ScheduleItem[] = [
  {
    id: 1,
    title: "Vistoria inicial",
    customerName: "João Almeida",
    propertyName: "Apartamento Centro",
    date: "2026-04-27",
    time: "08:30",
    type: "Vistoria",
    status: "scheduled",
    notes: "Verificar pintura, tomadas e estado geral do imóvel.",
  },
  {
    id: 2,
    title: "Assinatura de contrato",
    customerName: "Maria Oliveira",
    propertyName: "Casa Jardim Tropical",
    date: "2026-04-27",
    time: "10:00",
    type: "Contrato",
    status: "scheduled",
    notes: "Conferir documentos antes da assinatura.",
  },
  {
    id: 3,
    title: "Cobrança em aberto",
    customerName: "Carlos Mendes",
    propertyName: "Sala Comercial 204",
    date: "2026-04-27",
    time: "14:00",
    type: "Financeiro",
    status: "scheduled",
    notes: "Entrar em contato sobre aluguel vencido.",
  },
  {
    id: 4,
    title: "Entrega de chaves",
    customerName: "Ana Souza",
    propertyName: "Kitnet Universitária",
    date: "2026-04-28",
    time: "09:15",
    type: "Entrega",
    status: "completed",
    notes: "Chaves entregues e termo finalizado.",
  },
  {
    id: 5,
    title: "Renovação de contrato",
    customerName: "Fernanda Lima",
    propertyName: "Casa Bela Vista",
    date: "2026-04-30",
    time: "16:20",
    type: "Contrato",
    status: "scheduled",
    notes: "Conferir reajuste e prazo de renovação.",
  },
  {
    id: 6,
    title: "Manutenção hidráulica",
    customerName: "Roberto Alves",
    propertyName: "Apartamento Solar",
    date: "2026-05-04",
    time: "13:30",
    type: "Manutenção",
    status: "scheduled",
    notes: "Acompanhar técnico responsável pelo reparo.",
  },
];

const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const statusLabels: Record<ScheduleStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  canceled: "Cancelado",
};

const statusStyles: Record<ScheduleStatus, string> = {
  scheduled: "bg-orange-50 text-orange-700 ring-orange-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  canceled: "bg-red-50 text-red-700 ring-red-100",
};

function formatDateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDateFromInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getMonthDays(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstMonthDay = new Date(year, month, 1);
  const lastMonthDay = new Date(year, month + 1, 0);
  const firstWeekDay = firstMonthDay.getDay();
  const totalMonthDays = lastMonthDay.getDate();

  const calendarDays: Date[] = [];

  for (let index = firstWeekDay; index > 0; index -= 1) {
    calendarDays.push(new Date(year, month, 1 - index));
  }

  for (let day = 1; day <= totalMonthDays; day += 1) {
    calendarDays.push(new Date(year, month, day));
  }

  while (calendarDays.length % 7 !== 0) {
    const nextDay = calendarDays.length - firstWeekDay - totalMonthDays + 1;
    calendarDays.push(new Date(year, month + 1, nextDay));
  }

  return calendarDays;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState("2026-04-27");
  const [currentCalendarDate, setCurrentCalendarDate] = useState(
    createDateFromInputValue("2026-04-27")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  const calendarDays = useMemo(
    () => getMonthDays(currentCalendarDate),
    [currentCalendarDate]
  );

  const selectedDateItems = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return scheduleItems
      .filter((item) => item.date === selectedDate)
      .filter((item) => {
        if (!normalizedSearchTerm) return true;

        return (
          item.title.toLowerCase().includes(normalizedSearchTerm) ||
          item.customerName.toLowerCase().includes(normalizedSearchTerm) ||
          item.propertyName.toLowerCase().includes(normalizedSearchTerm) ||
          item.type.toLowerCase().includes(normalizedSearchTerm)
        );
      })
      .sort((firstItem, secondItem) => firstItem.time.localeCompare(secondItem.time));
  }, [selectedDate, searchTerm]);

  const scheduledCount = selectedDateItems.filter(
    (item) => item.status === "scheduled"
  ).length;
  const completedCount = selectedDateItems.filter(
    (item) => item.status === "completed"
  ).length;
  const canceledCount = selectedDateItems.filter(
    (item) => item.status === "canceled"
  ).length;

  function handlePreviousMonth() {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
    );
  }

  function handleNextMonth() {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
    );
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(formatDateToInputValue(date));
  }

  function handleTodayClick() {
    const today = new Date();
    setSelectedDate(formatDateToInputValue(today));
    setCurrentCalendarDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function handleDateInputChange(value: string) {
    const newDate = createDateFromInputValue(value);

    setSelectedDate(value);
    setCurrentCalendarDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  }

  return (
    <AppShell>
      <div className="relative z-0 space-y-6">
        <section className="relative z-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 shadow-xl shadow-orange-100">
          <div className="relative z-0 p-6 text-white lg:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute bottom-4 right-20 h-24 w-24 rounded-full bg-white/10" />

            <div className="relative z-0 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-white/80">
                  Rentix
                </p>
                <h1 className="mt-3 text-3xl font-black lg:text-4xl">Agenda</h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/90 lg:text-base">
                  Gerencie vistorias, contratos, cobranças, entregas de chaves e
                  compromissos operacionais em uma agenda visual integrada ao Rentix.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleTodayClick}
                  className="rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white ring-1 ring-white/25 transition hover:bg-white/25"
                >
                  Hoje
                </button>

                <button
                  type="button"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-orange-600 shadow-lg shadow-orange-900/10 transition hover:scale-[1.02] hover:bg-orange-50"
                >
                  + Novo Agendamento
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-0 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Total do dia</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {selectedDateItems.length}
            </h2>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Agendados</p>
            <h2 className="mt-2 text-3xl font-black text-orange-600">
              {scheduledCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Concluídos</p>
            <h2 className="mt-2 text-3xl font-black text-emerald-600">
              {completedCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Cancelados</p>
            <h2 className="mt-2 text-3xl font-black text-red-600">
              {canceledCount}
            </h2>
          </div>
        </section>

        <section className="relative z-0 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm lg:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {monthNames[currentCalendarDate.getMonth()]}{" "}
                  {currentCalendarDate.getFullYear()}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Clique em uma data para visualizar os compromissos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  ›
                </button>

                <div className="flex rounded-2xl bg-slate-100 p-1">
                  {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                        viewMode === mode
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2">
              {weekDayLabels.map((dayLabel) => (
                <div
                  key={dayLabel}
                  className="rounded-2xl bg-orange-50 px-2 py-3 text-center text-xs font-black uppercase tracking-wide text-orange-700"
                >
                  {dayLabel}
                </div>
              ))}

              {calendarDays.map((date) => {
                const inputDateValue = formatDateToInputValue(date);
                const dateItems = scheduleItems.filter((item) => item.date === inputDateValue);
                const isCurrentMonth =
                  date.getMonth() === currentCalendarDate.getMonth();
                const isSelectedDate = inputDateValue === selectedDate;
                const isToday = inputDateValue === formatDateToInputValue(new Date());

                return (
                  <button
                    key={inputDateValue}
                    type="button"
                    onClick={() => handleSelectDate(date)}
                    className={`min-h-28 rounded-3xl border p-3 text-left transition ${
                      isSelectedDate
                        ? "border-orange-400 bg-orange-50 shadow-md shadow-orange-100"
                        : "border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                    } ${!isCurrentMonth ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                          isToday
                            ? "bg-orange-500 text-white"
                            : isSelectedDate
                              ? "bg-white text-orange-600"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {dateItems.length > 0 && (
                        <span className="rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">
                          {dateItems.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      {dateItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="truncate rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700"
                        >
                          {item.time} • {item.title}
                        </div>
                      ))}

                      {dateItems.length > 2 && (
                        <p className="px-2 text-[11px] font-black text-orange-600">
                          +{dateItems.length - 2} outros
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm lg:p-6">
            <div className="border-b border-slate-100 pb-5">
              <p className="text-sm font-bold text-orange-600">Data selecionada</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {createDateFromInputValue(selectedDate).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              <div className="mt-4 space-y-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateInputChange(event.target.value)}
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar cliente, imóvel ou tipo..."
                  className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {selectedDateItems.length > 0 ? (
                selectedDateItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-orange-100 hover:bg-orange-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-orange-600">
                          {item.time}
                        </p>
                        <h3 className="mt-1 text-base font-black text-slate-950">
                          {item.title}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusStyles[item.status]}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm font-semibold text-slate-600">
                      <p>{item.customerName}</p>
                      <p>{item.propertyName}</p>
                    </div>

                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                      {item.notes}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                        {item.type}
                      </span>

                      <button
                        type="button"
                        className="rounded-2xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-600"
                      >
                        Abrir
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    📅
                  </div>

                  <p className="mt-4 text-lg font-black text-slate-800">
                    Nenhum compromisso
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    Não existe agendamento para esta data ou filtro informado.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
