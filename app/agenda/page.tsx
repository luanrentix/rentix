"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/context/AuthContext";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItems,
  updateScheduleItem,
  type ScheduleItem as ApiScheduleItem,
} from "@/services/schedule.service";
import { getCompanyStorageItem } from "@/services/company-storage";

type ScheduleStatus = "scheduled" | "completed" | "canceled";
type SchedulePriority = "low" | "medium" | "high";
type CalendarViewMode = "month" | "week" | "day";

type ScheduleItem = {
  id: string;
  title: string;
  customerName: string;
  propertyName: string;
  date: string;
  time: string;
  type: string;
  status: ScheduleStatus;
  priority: SchedulePriority;
  responsibleName: string;
  reminder: string;
  notes: string;
};

type ScheduleFormData = Omit<ScheduleItem, "id">;

const todayInputValue = formatDateToInputValue(new Date());

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultScheduleItems: ScheduleItem[] = [
  {
    id: "sample-1",
    title: "Vistoria inicial",
    customerName: "João Almeida",
    propertyName: "Apartamento Centro",
    date: todayInputValue,
    time: "08:30",
    type: "Vistoria",
    status: "scheduled",
    priority: "high",
    responsibleName: "Equipe Operacional",
    reminder: "30 minutos antes",
    notes: "Verificar pintura, tomadas, hidráulica e estado geral do imóvel.",
  },
  {
    id: "sample-2",
    title: "Assinatura de contrato",
    customerName: "Maria Oliveira",
    propertyName: "Casa Jardim Tropical",
    date: todayInputValue,
    time: "10:00",
    type: "Contrato",
    status: "scheduled",
    priority: "medium",
    responsibleName: "Comercial",
    reminder: "1 hora antes",
    notes: "Conferir documentos e condições finais antes da assinatura.",
  },
  {
    id: "sample-3",
    title: "Cobrança em aberto",
    customerName: "Carlos Mendes",
    propertyName: "Sala Comercial 204",
    date: todayInputValue,
    time: "14:00",
    type: "Financeiro",
    status: "scheduled",
    priority: "high",
    responsibleName: "Financeiro",
    reminder: "No início do dia",
    notes: "Entrar em contato sobre aluguel vencido e registrar retorno.",
  },
  {
    id: "sample-4",
    title: "Entrega de chaves",
    customerName: "Ana Souza",
    propertyName: "Kitnet Universitária",
    date: addDaysToInputValue(todayInputValue, 1),
    time: "09:15",
    type: "Entrega",
    status: "completed",
    priority: "medium",
    responsibleName: "Atendimento",
    reminder: "30 minutos antes",
    notes: "Chaves entregues e termo finalizado.",
  },
  {
    id: "sample-5",
    title: "Renovação de contrato",
    customerName: "Fernanda Lima",
    propertyName: "Casa Bela Vista",
    date: addDaysToInputValue(todayInputValue, 3),
    time: "16:20",
    type: "Contrato",
    status: "scheduled",
    priority: "medium",
    responsibleName: "Comercial",
    reminder: "1 dia antes",
    notes: "Conferir reajuste, prazo de renovação e garantias.",
  },
  {
    id: "sample-6",
    title: "Manutenção hidráulica",
    customerName: "Roberto Alves",
    propertyName: "Apartamento Solar",
    date: addDaysToInputValue(todayInputValue, -1),
    time: "13:30",
    type: "Manutenção",
    status: "canceled",
    priority: "low",
    responsibleName: "Manutenção",
    reminder: "Sem lembrete",
    notes: "Remarcado pelo prestador responsável pelo reparo.",
  },
];

const emptyFormData: ScheduleFormData = {
  title: "",
  customerName: "",
  propertyName: "",
  date: todayInputValue,
  time: "08:00",
  type: "Vistoria",
  status: "scheduled",
  priority: "medium",
  responsibleName: "",
  reminder: "30 minutos antes",
  notes: "",
};

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

const typeOptions = ["Vistoria", "Contrato", "Financeiro", "Entrega", "Manutenção", "Reunião", "Cobrança", "Outros"];
const responsibleOptions = ["Equipe Operacional", "Comercial", "Financeiro", "Atendimento", "Manutenção", "Administrativo"];
const reminderOptions = ["Sem lembrete", "No início do dia", "15 minutos antes", "30 minutos antes", "1 hora antes", "1 dia antes"];

const statusLabels: Record<ScheduleStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  canceled: "Cancelado",
};

const priorityLabels: Record<SchedulePriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
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

function addDaysToInputValue(value: string, amount: number) {
  const date = createDateFromInputValue(value);
  date.setDate(date.getDate() + amount);
  return formatDateToInputValue(date);
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

function getWeekDays(selectedDate: string) {
  const baseDate = createDateFromInputValue(selectedDate);
  const startDate = new Date(baseDate);
  startDate.setDate(baseDate.getDate() - baseDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function getReadableDate(value: string) {
  return createDateFromInputValue(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getShortDate(value: string) {
  return createDateFromInputValue(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getTimeValue(item: ScheduleItem) {
  return `${item.date}T${item.time || "00:00"}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeStoredScheduleItem(item: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: typeof item.id === "string" ? item.id : String(Date.now()),
    title: item.title || "Agendamento",
    customerName: item.customerName || "Não informado",
    propertyName: item.propertyName || "Não informado",
    date: item.date || todayInputValue,
    time: item.time || "08:00",
    type: item.type || "Outros",
    status: item.status || "scheduled",
    priority: item.priority || "medium",
    responsibleName: item.responsibleName || "Administrativo",
    reminder: item.reminder || "Sem lembrete",
    notes: item.notes || "",
  };
}

function mapApiScheduleItemToScheduleItem(item: ApiScheduleItem): ScheduleItem {
  return {
    id: item.id,
    title: item.title,
    customerName: item.customerName,
    propertyName: item.propertyName,
    date: item.date.slice(0, 10),
    time: item.time,
    type: item.type,
    status: item.status,
    priority: item.priority,
    responsibleName: item.responsibleName,
    reminder: item.reminder,
    notes: item.notes || "",
  };
}

function getStatusBadgeClass(status: ScheduleStatus, isBlackTheme: boolean) {
  if (status === "completed") {
    return isBlackTheme
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "canceled") {
    return isBlackTheme ? "bg-red-500/10 text-red-300 ring-red-500/30" : "bg-red-50 text-red-700 ring-red-100";
  }

  return isBlackTheme ? "bg-orange-500/10 text-orange-300 ring-orange-500/30" : "bg-orange-50 text-orange-700 ring-orange-100";
}

function getPriorityBadgeClass(priority: SchedulePriority, isBlackTheme: boolean) {
  if (priority === "high") {
    return isBlackTheme ? "bg-red-500/10 text-red-300 ring-red-500/30" : "bg-red-50 text-red-700 ring-red-100";
  }

  if (priority === "low") {
    return isBlackTheme ? "bg-sky-500/10 text-sky-300 ring-sky-500/30" : "bg-sky-50 text-sky-700 ring-sky-100";
  }

  return isBlackTheme ? "bg-amber-500/10 text-amber-300 ring-amber-500/30" : "bg-amber-50 text-amber-700 ring-amber-100";
}

function getTypeAccentClass(type: string, isBlackTheme: boolean) {
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes("financeiro") || normalizedType.includes("cobrança")) {
    return isBlackTheme ? "border-l-emerald-400 bg-emerald-500/10" : "border-l-emerald-500 bg-emerald-50/70";
  }

  if (normalizedType.includes("contrato")) {
    return isBlackTheme ? "border-l-violet-400 bg-violet-500/10" : "border-l-violet-500 bg-violet-50/70";
  }

  if (normalizedType.includes("manutenção")) {
    return isBlackTheme ? "border-l-sky-400 bg-sky-500/10" : "border-l-sky-500 bg-sky-50/70";
  }

  if (normalizedType.includes("entrega")) {
    return isBlackTheme ? "border-l-amber-400 bg-amber-500/10" : "border-l-amber-500 bg-amber-50/70";
  }

  return isBlackTheme ? "border-l-orange-400 bg-orange-500/10" : "border-l-orange-500 bg-orange-50/70";
}

export default function AgendaPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(createDateFromInputValue(todayInputValue));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<SchedulePriority | "all">("all");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [isBlackTheme, setIsBlackTheme] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(emptyFormData);
  const [formError, setFormError] = useState("");
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    if (!companyId) return;

    loadScheduleItems(companyId);
  }, [companyId]);

  async function loadScheduleItems(currentCompanyId: string) {
    try {
      const apiItems = await getScheduleItems(currentCompanyId);
      setScheduleItems(apiItems.map(mapApiScheduleItemToScheduleItem));
    } catch (error) {
      console.error("Nao foi possivel carregar a agenda.", error);
      setScheduleItems([]);
    }
  }

  useEffect(() => {
    function applyStoredTheme() {
      const storedThemeSettings = getCompanyStorageItem(
        companyId,
        "contrx_theme_settings",
        "contrx_theme_settings",
      );
      const legacyTheme = getCompanyStorageItem(
        companyId,
        "contrx_theme",
        "contrx_theme",
      );

      try {
        const parsedThemeSettings = storedThemeSettings ? (JSON.parse(storedThemeSettings) as { mode?: string }) : null;
        const isBlackThemeSelected =
          parsedThemeSettings?.mode === "black" ||
          parsedThemeSettings?.mode === "dark" ||
          legacyTheme === "black" ||
          legacyTheme === "dark";

        setIsBlackTheme(isBlackThemeSelected);
      } catch {
        setIsBlackTheme(legacyTheme === "black" || legacyTheme === "dark");
      }
    }

    applyStoredTheme();
    window.addEventListener("storage", applyStoredTheme);
    window.addEventListener("contrx-theme-change", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
      window.removeEventListener("contrx-theme-change", applyStoredTheme);
    };
  }, [companyId]);

  const calendarDays = useMemo(() => getMonthDays(currentCalendarDate), [currentCalendarDate]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const uniqueTypeOptions = useMemo(() => {
    const storedTypes = scheduleItems.map((item) => item.type).filter(Boolean);
    return Array.from(new Set([...typeOptions, ...storedTypes]));
  }, [scheduleItems]);

  const uniqueResponsibleOptions = useMemo(() => {
    const storedResponsibleNames = scheduleItems.map((item) => item.responsibleName).filter(Boolean);
    return Array.from(new Set([...responsibleOptions, ...storedResponsibleNames]));
  }, [scheduleItems]);

  const filteredItems = useMemo(() => {
    return scheduleItems
      .filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (typeFilter !== "all" && item.type !== typeFilter) return false;
        if (responsibleFilter !== "all" && item.responsibleName !== responsibleFilter) return false;
        if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
        if (!normalizedSearchTerm) return true;

        return (
          item.title.toLowerCase().includes(normalizedSearchTerm) ||
          item.customerName.toLowerCase().includes(normalizedSearchTerm) ||
          item.propertyName.toLowerCase().includes(normalizedSearchTerm) ||
          item.type.toLowerCase().includes(normalizedSearchTerm) ||
          item.responsibleName.toLowerCase().includes(normalizedSearchTerm) ||
          item.notes.toLowerCase().includes(normalizedSearchTerm)
        );
      })
      .sort((firstItem, secondItem) => getTimeValue(firstItem).localeCompare(getTimeValue(secondItem)));
  }, [scheduleItems, normalizedSearchTerm, statusFilter, typeFilter, responsibleFilter, priorityFilter]);

  const selectedDateItems = useMemo(() => filteredItems.filter((item) => item.date === selectedDate), [filteredItems, selectedDate]);

  const weekItems = useMemo(() => {
    const weekDateValues = weekDays.map((date) => formatDateToInputValue(date));
    return filteredItems.filter((item) => weekDateValues.includes(item.date));
  }, [filteredItems, weekDays]);

  const monthItems = useMemo(() => {
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();
    return filteredItems.filter((item) => {
      const itemDate = createDateFromInputValue(item.date);
      return itemDate.getMonth() === month && itemDate.getFullYear() === year;
    });
  }, [filteredItems, currentCalendarDate]);

  const nextSevenDaysItems = useMemo(() => {
    const startDate = createDateFromInputValue(todayInputValue);
    const endDate = createDateFromInputValue(addDaysToInputValue(todayInputValue, 7));

    return scheduleItems
      .filter((item) => {
        const itemDate = createDateFromInputValue(item.date);
        return itemDate >= startDate && itemDate <= endDate && item.status === "scheduled";
      })
      .sort((firstItem, secondItem) => getTimeValue(firstItem).localeCompare(getTimeValue(secondItem)))
      .slice(0, 6);
  }, [scheduleItems]);

  const scheduledCount = scheduleItems.filter((item) => item.status === "scheduled").length;
  const completedCount = scheduleItems.filter((item) => item.status === "completed").length;
  const todayCount = scheduleItems.filter((item) => item.date === todayInputValue).length;
  const highPriorityCount = scheduleItems.filter((item) => item.priority === "high" && item.status === "scheduled").length;
  const overdueCount = scheduleItems.filter((item) => item.date < todayInputValue && item.status === "scheduled").length;

  const pageClass = isBlackTheme ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-50 text-slate-950";
  const cardClass = isBlackTheme
    ? "border border-slate-700 bg-slate-900 shadow-slate-950/40"
    : "border border-orange-100 bg-white shadow-orange-100/60";
  const mutedTextClass = isBlackTheme ? "text-slate-400" : "text-slate-500";
  const strongTextClass = isBlackTheme ? "text-white" : "text-slate-950";
  const inputClass = isBlackTheme
    ? "w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/20"
    : "w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
  const secondaryButtonClass = isBlackTheme
    ? "rounded-2xl bg-slate-800 px-4 py-3 text-sm font-black text-slate-100 transition hover:bg-slate-700"
    : "rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-600";

  function persistScheduleItems(nextItems: ScheduleItem[]) {
    setScheduleItems(nextItems);
  }

  function handlePreviousMonth() {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
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
    if (!value) return;
    const newDate = createDateFromInputValue(value);
    setSelectedDate(value);
    setCurrentCalendarDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  }

  function handleOpenCreateModal(dateValue = selectedDate) {
    setEditingScheduleId(null);
    setFormError("");
    setFormData({ ...emptyFormData, date: dateValue || todayInputValue });
    setIsScheduleModalOpen(true);
  }

  function handleOpenEditModal(item: ScheduleItem) {
    setEditingScheduleId(item.id);
    setFormError("");
    setFormData({
      title: item.title,
      customerName: item.customerName,
      propertyName: item.propertyName,
      date: item.date,
      time: item.time,
      type: item.type,
      status: item.status,
      priority: item.priority,
      responsibleName: item.responsibleName,
      reminder: item.reminder,
      notes: item.notes,
    });
    setIsScheduleModalOpen(true);
  }

  function handleCloseScheduleModal() {
    setIsScheduleModalOpen(false);
    setEditingScheduleId(null);
    setFormError("");
  }

  async function handleSaveSchedule() {
    if (!formData.title.trim()) {
      setFormError("Informe o título do agendamento.");
      return;
    }

    if (!formData.customerName.trim()) {
      setFormError("Informe o cliente ou responsável.");
      return;
    }

    if (!formData.propertyName.trim()) {
      setFormError("Informe o imóvel ou referência.");
      return;
    }

    if (!formData.date || !formData.time) {
      setFormError("Informe data e horário do agendamento.");
      return;
    }

    const normalizedData: ScheduleFormData = {
      title: formData.title.trim(),
      customerName: formData.customerName.trim(),
      propertyName: formData.propertyName.trim(),
      date: formData.date,
      time: formData.time,
      type: formData.type.trim() || "Outros",
      status: formData.status,
      priority: formData.priority,
      responsibleName: formData.responsibleName.trim() || "Administrativo",
      reminder: formData.reminder,
      notes: formData.notes.trim(),
    };

    if (!companyId) {
      setFormError("Empresa do usuario nao encontrada. Faca login novamente.");
      return;
    }

    if (editingScheduleId) {
      let updatedItem: ScheduleItem;

      try {
        const apiItem = await updateScheduleItem(editingScheduleId, normalizedData);
        updatedItem = mapApiScheduleItemToScheduleItem(apiItem);
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar o agendamento no backend.",
        );
        return;
      }

      const nextItems = scheduleItems.map((item) => (item.id === editingScheduleId ? updatedItem : item));
      persistScheduleItems(nextItems);
    } else {
      let nextItem: ScheduleItem;

      try {
        const apiItem = await createScheduleItem({
          companyId,
          ...normalizedData,
        });
        nextItem = mapApiScheduleItemToScheduleItem(apiItem);
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel criar o agendamento no backend.",
        );
        return;
      }

      persistScheduleItems([...scheduleItems, nextItem]);
    }

    setSelectedDate(normalizedData.date);
    const nextDate = createDateFromInputValue(normalizedData.date);
    setCurrentCalendarDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    handleCloseScheduleModal();
  }

  async function handleConfirmDelete() {
    if (!scheduleToDelete) return;
    try {
      await deleteScheduleItem(scheduleToDelete.id);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel excluir o agendamento no backend.",
      );
      return;
    }

    persistScheduleItems(scheduleItems.filter((item) => item.id !== scheduleToDelete.id));
    setScheduleToDelete(null);
  }

  async function handleQuickStatusChange(item: ScheduleItem, status: ScheduleStatus) {
    try {
      const apiItem = await updateScheduleItem(item.id, { status });
      const updatedItem = mapApiScheduleItemToScheduleItem(apiItem);
      persistScheduleItems(scheduleItems.map((scheduleItem) => (scheduleItem.id === item.id ? updatedItem : scheduleItem)));
    } catch (error) {
      console.error("Nao foi possivel atualizar o status da agenda.", error);
    }
  }

  async function handleDuplicateSchedule(item: ScheduleItem) {
    if (!companyId) return;

    try {
      const duplicatedItem = await createScheduleItem({
        companyId,
        title: `${item.title} - copia`,
        customerName: item.customerName,
        propertyName: item.propertyName,
        date: selectedDate,
        time: item.time,
        type: item.type,
        status: "scheduled",
        priority: item.priority,
        responsibleName: item.responsibleName,
        reminder: item.reminder,
        notes: item.notes,
      });

      persistScheduleItems([
        ...scheduleItems,
        mapApiScheduleItemToScheduleItem(duplicatedItem),
      ]);
    } catch (error) {
      console.error("Nao foi possivel duplicar o agendamento.", error);
    }
    return;

    const duplicatedItem: ScheduleItem = {
      ...item,
      id: String(Date.now()),
      title: `${item.title} - cópia`,
      date: selectedDate,
      status: "scheduled",
    };
    persistScheduleItems([...scheduleItems, duplicatedItem]);
  }

  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setResponsibleFilter("all");
    setPriorityFilter("all");
  }

  function renderScheduleCard(item: ScheduleItem, compact = false) {
    const isOverdue = item.date < todayInputValue && item.status === "scheduled";

    return (
      <article key={item.id} className={`rounded-3xl border-l-4 p-4 transition hover:-translate-y-0.5 ${getTypeAccentClass(item.type, isBlackTheme)}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-orange-600">{item.time} • {getShortDate(item.date)}</p>
            <h3 className={`mt-1 text-base font-black ${strongTextClass}`}>{item.title}</h3>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${getStatusBadgeClass(item.status, isBlackTheme)}`}>
              {statusLabels[item.status]}
            </span>
            {isOverdue && <span className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-black text-white">Atrasado</span>}
          </div>
        </div>

        <div className={`mt-3 grid gap-2 text-sm font-semibold ${isBlackTheme ? "text-slate-300" : "text-slate-600"} ${compact ? "" : "sm:grid-cols-2"}`}>
          <p>👤 {item.customerName}</p>
          <p>🏠 {item.propertyName}</p>
          <p>👥 {item.responsibleName}</p>
          <p>⏰ {item.reminder}</p>
        </div>

        {!compact && <p className={`mt-3 text-sm font-medium leading-6 ${mutedTextClass}`}>{item.notes || "Sem observações."}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className={isBlackTheme ? "rounded-2xl bg-slate-800 px-3 py-2 text-xs font-black text-slate-300" : "rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm"}>
              {item.type}
            </span>
            <span className={`rounded-2xl px-3 py-2 text-xs font-black ring-1 ${getPriorityBadgeClass(item.priority, isBlackTheme)}`}>
              Prioridade {priorityLabels[item.priority]}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.status !== "completed" && (
              <button type="button" onClick={() => handleQuickStatusChange(item, "completed")} className="rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-600">
                Concluir
              </button>
            )}
            {item.status !== "canceled" && (
              <button type="button" onClick={() => handleQuickStatusChange(item, "canceled")} className={isBlackTheme ? "rounded-2xl bg-slate-800 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-slate-700" : "rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200"}>
                Cancelar
              </button>
            )}
            <button type="button" onClick={() => handleDuplicateSchedule(item)} className={secondaryButtonClass}>
              Duplicar
            </button>
            <button type="button" onClick={() => handleOpenEditModal(item)} className="rounded-2xl bg-orange-500 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-600">
              Editar
            </button>
            <button type="button" onClick={() => setScheduleToDelete(item)} className={isBlackTheme ? "rounded-2xl bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20" : "rounded-2xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"}>
              Excluir
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <AppShell>
      <div className={pageClass}>
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className={`rounded-[2rem] p-5 shadow-sm lg:p-6 ${cardClass}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className={`flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.22em] ${mutedTextClass}`}>
                  <span>Contrx</span>
                  <span className="h-1 w-1 rounded-full bg-orange-500" />
                  <span>Agenda</span>
                  <span className="h-1 w-1 rounded-full bg-orange-500" />
                  <span>Operacional</span>
                </div>
                <h1 className={`mt-3 text-3xl font-black leading-tight lg:text-4xl ${strongTextClass}`}>Central operacional da agenda</h1>
                <p className={`mt-3 max-w-3xl text-sm font-semibold leading-6 lg:text-base ${mutedTextClass}`}>
                  Controle compromissos, visitas, vistorias, contratos, cobranças e manutenções com visão rápida e ações diretas.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
                <button type="button" onClick={handleTodayClick} className={secondaryButtonClass}>
                  Ver hoje
                </button>
                <button type="button" onClick={() => handleOpenCreateModal()} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600">
                  + Novo agendamento
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Hoje", value: todayCount, description: "compromissos do dia", icon: "📅", color: "text-orange-600" },
              { label: "Agendados", value: scheduledCount, description: "em aberto", icon: "⏳", color: "text-orange-600" },
              { label: "Concluídos", value: completedCount, description: "finalizados", icon: "✅", color: "text-emerald-600" },
              { label: "Alta prioridade", value: highPriorityCount, description: "pedem atenção", icon: "🔥", color: "text-red-600" },
              { label: "Atrasados", value: overdueCount, description: "fora do prazo", icon: "⚠️", color: "text-red-600" },
            ].map((metric) => (
              <div key={metric.label} className={`rounded-3xl p-5 shadow-sm ${cardClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-bold ${mutedTextClass}`}>{metric.label}</p>
                  <span className={isBlackTheme ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-xl" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-xl"}>{metric.icon}</span>
                </div>
                <h2 className={`mt-4 text-3xl font-black ${metric.color}`}>{metric.value}</h2>
                <p className={`mt-1 text-xs font-bold uppercase tracking-[0.16em] ${mutedTextClass}`}>{metric.description}</p>
              </div>
            ))}
          </section>

          <section className={`rounded-[2rem] p-5 shadow-sm lg:p-6 ${cardClass}`}>
            <div className="grid gap-3 xl:grid-cols-[1.4fr_0.55fr_0.55fr_0.55fr_0.55fr_auto] xl:items-end">
              <label className="space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Buscar</span>
                <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cliente, imóvel, responsável, título ou observação..." className={inputClass} />
              </label>

              <label className="space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ScheduleStatus | "all")} className={inputClass}>
                  <option value="all">Todos</option>
                  <option value="scheduled">Agendados</option>
                  <option value="completed">Concluídos</option>
                  <option value="canceled">Cancelados</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Tipo</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={inputClass}>
                  <option value="all">Todos</option>
                  {uniqueTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Responsável</span>
                <select value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)} className={inputClass}>
                  <option value="all">Todos</option>
                  {uniqueResponsibleOptions.map((responsibleName) => (
                    <option key={responsibleName} value={responsibleName}>{responsibleName}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Prioridade</span>
                <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as SchedulePriority | "all")} className={inputClass}>
                  <option value="all">Todas</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </label>

              <button type="button" onClick={handleClearFilters} className={secondaryButtonClass}>Limpar</button>
            </div>
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1.45fr_0.85fr]">
            <div className={`rounded-[2rem] p-5 shadow-sm lg:p-6 ${cardClass}`}>
              <div className={`flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between ${isBlackTheme ? "border-slate-700" : "border-slate-100"}`}>
                <div>
                  <h2 className={`text-xl font-black ${strongTextClass}`}>
                    {viewMode === "month" ? `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}` : viewMode === "week" ? "Semana operacional" : `Timeline de ${getReadableDate(selectedDate)}`}
                  </h2>
                  <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>Visualização premium com ações rápidas e destaques operacionais.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={selectedDate} onChange={(event) => handleDateInputChange(event.target.value)} className={inputClass} />
                  <button type="button" onClick={handlePreviousMonth} className={secondaryButtonClass}>‹</button>
                  <button type="button" onClick={handleNextMonth} className={secondaryButtonClass}>›</button>

                  <div className={isBlackTheme ? "flex rounded-2xl bg-slate-800 p-1" : "flex rounded-2xl bg-slate-100 p-1"}>
                    {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
                      <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-xl px-4 py-2 text-xs font-black transition ${viewMode === mode ? (isBlackTheme ? "bg-slate-950 text-orange-400 shadow-sm" : "bg-white text-orange-600 shadow-sm") : (isBlackTheme ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                        {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {viewMode === "month" && (
                <div className="mt-5 grid grid-cols-7 gap-2">
                  {weekDayLabels.map((dayLabel) => (
                    <div key={dayLabel} className={isBlackTheme ? "rounded-2xl bg-orange-500/10 px-2 py-3 text-center text-xs font-black uppercase tracking-wide text-orange-300" : "rounded-2xl bg-orange-50 px-2 py-3 text-center text-xs font-black uppercase tracking-wide text-orange-700"}>
                      {dayLabel}
                    </div>
                  ))}

                  {calendarDays.map((date) => {
                    const inputDateValue = formatDateToInputValue(date);
                    const dateItems = filteredItems.filter((item) => item.date === inputDateValue);
                    const isCurrentMonth = date.getMonth() === currentCalendarDate.getMonth();
                    const isSelectedDate = inputDateValue === selectedDate;
                    const isToday = inputDateValue === todayInputValue;

                    return (
                      <button key={inputDateValue} type="button" onClick={() => handleSelectDate(date)} className={`min-h-32 rounded-3xl border p-3 text-left transition ${isSelectedDate ? (isBlackTheme ? "border-orange-500/50 bg-orange-500/10 shadow-md shadow-orange-950/20" : "border-orange-400 bg-orange-50 shadow-md shadow-orange-100") : (isBlackTheme ? "border-slate-700 bg-slate-950 hover:border-orange-500/40 hover:bg-orange-500/10" : "border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/40")} ${!isCurrentMonth ? "opacity-40" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${isToday ? "bg-orange-500 text-white" : isSelectedDate ? (isBlackTheme ? "bg-slate-900 text-orange-400" : "bg-white text-orange-600") : (isBlackTheme ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700")}`}>
                            {date.getDate()}
                          </span>
                          {dateItems.length > 0 && <span className="rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">{dateItems.length}</span>}
                        </div>

                        <div className="mt-3 space-y-1">
                          {dateItems.slice(0, 3).map((item) => (
                            <div key={item.id} className={`truncate rounded-xl px-2 py-1 text-[11px] font-bold ${item.priority === "high" ? "bg-red-500 text-white" : isBlackTheme ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                              {item.time} • {item.title}
                            </div>
                          ))}
                          {dateItems.length > 3 && <p className={`px-2 text-[11px] font-black ${mutedTextClass}`}>+ {dateItems.length - 3} mais</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {viewMode === "week" && (
                <div className="mt-5 grid gap-3 lg:grid-cols-7">
                  {weekDays.map((date) => {
                    const dateValue = formatDateToInputValue(date);
                    const items = weekItems.filter((item) => item.date === dateValue);
                    const isToday = dateValue === todayInputValue;

                    return (
                      <div key={dateValue} className={`rounded-3xl border p-4 ${isToday ? "border-orange-400" : isBlackTheme ? "border-slate-700" : "border-slate-100"} ${isBlackTheme ? "bg-slate-950" : "bg-white"}`}>
                        <button type="button" onClick={() => setSelectedDate(dateValue)} className="w-full text-left">
                          <p className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>{weekDayLabels[date.getDay()]}</p>
                          <p className={`mt-1 text-2xl font-black ${isToday ? "text-orange-600" : strongTextClass}`}>{date.getDate()}</p>
                        </button>
                        <div className="mt-4 space-y-2">
                          {items.length > 0 ? items.map((item) => (
                            <button key={item.id} type="button" onClick={() => handleOpenEditModal(item)} className={`w-full rounded-2xl border-l-4 p-3 text-left text-xs font-bold ${getTypeAccentClass(item.type, isBlackTheme)}`}>
                              <span className="block text-orange-600">{item.time}</span>
                              <span className={strongTextClass}>{item.title}</span>
                            </button>
                          )) : <p className={`rounded-2xl border border-dashed p-3 text-center text-xs font-bold ${isBlackTheme ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>Livre</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "day" && (
                <div className="mt-5 space-y-4">
                  {selectedDateItems.length > 0 ? selectedDateItems.map((item) => renderScheduleCard(item)) : (
                    <div className={isBlackTheme ? "rounded-3xl border border-dashed border-orange-500/40 bg-orange-500/10 p-10 text-center" : "rounded-3xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center"}>
                      <div className={isBlackTheme ? "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-3xl" : "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm"}>📅</div>
                      <p className={`mt-4 text-xl font-black ${strongTextClass}`}>Dia livre</p>
                      <p className={`mt-2 text-sm font-medium leading-6 ${mutedTextClass}`}>Não existe compromisso para esta data com os filtros atuais.</p>
                      <button type="button" onClick={() => handleOpenCreateModal(selectedDate)} className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600">Criar agendamento</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className={`rounded-[2rem] p-5 shadow-sm lg:p-6 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">Data selecionada</p>
                    <h2 className={`mt-2 text-xl font-black ${strongTextClass}`}>{getReadableDate(selectedDate)}</h2>
                    <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>{selectedDateItems.length} compromisso(s) encontrado(s)</p>
                  </div>
                  <button type="button" onClick={() => handleOpenCreateModal(selectedDate)} className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600">+</button>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedDateItems.length > 0 ? selectedDateItems.map((item) => renderScheduleCard(item, true)) : (
                    <div className={isBlackTheme ? "rounded-3xl border border-dashed border-orange-500/40 bg-orange-500/10 p-8 text-center" : "rounded-3xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center"}>
                      <div className={isBlackTheme ? "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-2xl" : "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm"}>📌</div>
                      <p className={`mt-4 text-lg font-black ${strongTextClass}`}>Nenhum compromisso</p>
                      <p className={`mt-2 text-sm font-medium leading-6 ${mutedTextClass}`}>Use o botão acima para criar uma nova tarefa operacional.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`rounded-[2rem] p-5 shadow-sm lg:p-6 ${cardClass}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">Próximos 7 dias</p>
                <h2 className={`mt-2 text-xl font-black ${strongTextClass}`}>Fila operacional</h2>
                <div className="mt-5 space-y-3">
                  {nextSevenDaysItems.length > 0 ? nextSevenDaysItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setSelectedDate(item.date); handleOpenEditModal(item); }} className={`w-full rounded-3xl border-l-4 p-4 text-left transition hover:-translate-y-0.5 ${getTypeAccentClass(item.type, isBlackTheme)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-orange-600">{getShortDate(item.date)} • {item.time}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${getPriorityBadgeClass(item.priority, isBlackTheme)}`}>{priorityLabels[item.priority]}</span>
                      </div>
                      <p className={`mt-2 text-sm font-black ${strongTextClass}`}>{item.title}</p>
                      <p className={`mt-1 text-xs font-semibold ${mutedTextClass}`}>{item.customerName} • {item.propertyName}</p>
                    </button>
                  )) : <p className={`rounded-3xl border border-dashed p-6 text-center text-sm font-bold ${isBlackTheme ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>Nenhum compromisso agendado para os próximos dias.</p>}
                </div>
              </div>

              <div className={`rounded-[2rem] p-5 shadow-sm lg:p-6 ${cardClass}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">Resumo do mês</p>
                <h2 className={`mt-2 text-xl font-black ${strongTextClass}`}>{monthItems.length} evento(s)</h2>
                <div className="mt-5 space-y-3">
                  {uniqueTypeOptions.slice(0, 6).map((type) => {
                    const total = monthItems.filter((item) => item.type === type).length;
                    const percentage = monthItems.length > 0 ? Math.round((total / monthItems.length) * 100) : 0;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between gap-3 text-sm font-bold">
                          <span className={strongTextClass}>{type}</span>
                          <span className={mutedTextClass}>{total}</span>
                        </div>
                        <div className={isBlackTheme ? "mt-2 h-2 overflow-hidden rounded-full bg-slate-800" : "mt-2 h-2 overflow-hidden rounded-full bg-slate-100"}>
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </section>
        </div>

        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className={`max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] p-6 shadow-2xl ${isBlackTheme ? "bg-slate-900 text-white" : "bg-white text-slate-950"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">{editingScheduleId ? "Editar agenda" : "Novo agendamento"}</p>
                  <h2 className={`mt-2 text-2xl font-black ${strongTextClass}`}>{editingScheduleId ? "Atualizar compromisso" : "Criar compromisso premium"}</h2>
                  <p className={`mt-2 text-sm font-semibold ${mutedTextClass}`}>Preencha os dados operacionais para manter a agenda organizada e rastreável.</p>
                </div>
                <button type="button" onClick={handleCloseScheduleModal} className={secondaryButtonClass}>✕</button>
              </div>

              {formError && <div className={isBlackTheme ? "mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300" : "mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700"}>{formError}</div>}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Título</span>
                  <input type="text" value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Ex: Vistoria inicial" className={inputClass} />
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Cliente / Responsável</span>
                  <input type="text" value={formData.customerName} onChange={(event) => setFormData((current) => ({ ...current, customerName: event.target.value }))} placeholder="Nome do cliente" className={inputClass} />
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Imóvel / Referência</span>
                  <input type="text" value={formData.propertyName} onChange={(event) => setFormData((current) => ({ ...current, propertyName: event.target.value }))} placeholder="Imóvel ou referência" className={inputClass} />
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Data</span>
                  <input type="date" value={formData.date} onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))} className={inputClass} />
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Horário</span>
                  <input type="time" value={formData.time} onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))} className={inputClass} />
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Tipo</span>
                  <select value={formData.type} onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))} className={inputClass}>
                    {uniqueTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Responsável interno</span>
                  <select value={formData.responsibleName} onChange={(event) => setFormData((current) => ({ ...current, responsibleName: event.target.value }))} className={inputClass}>
                    <option value="">Selecione</option>
                    {uniqueResponsibleOptions.map((responsibleName) => <option key={responsibleName} value={responsibleName}>{responsibleName}</option>)}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Status</span>
                  <select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as ScheduleStatus }))} className={inputClass}>
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Concluído</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Prioridade</span>
                  <select value={formData.priority} onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value as SchedulePriority }))} className={inputClass}>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Lembrete</span>
                  <select value={formData.reminder} onChange={(event) => setFormData((current) => ({ ...current, reminder: event.target.value }))} className={inputClass}>
                    {reminderOptions.map((reminder) => <option key={reminder} value={reminder}>{reminder}</option>)}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${mutedTextClass}`}>Observações internas</span>
                  <textarea value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} placeholder="Detalhes importantes do compromisso..." rows={4} className={inputClass} />
                </label>
              </div>

              <div className={`mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end ${isBlackTheme ? "border-slate-700" : "border-slate-100"}`}>
                <button type="button" onClick={handleCloseScheduleModal} className={secondaryButtonClass}>Cancelar</button>
                <button type="button" onClick={handleSaveSchedule} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600">
                  {editingScheduleId ? "Salvar alterações" : "Criar agendamento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {scheduleToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-[2rem] p-6 text-center shadow-2xl ${isBlackTheme ? "bg-slate-900 text-white" : "bg-white text-slate-950"}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-3xl text-red-500">!</div>
              <h2 className={`mt-4 text-2xl font-black ${strongTextClass}`}>Excluir agendamento?</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedTextClass}`}>Essa ação removerá o compromisso da agenda.</p>

              <div className={isBlackTheme ? "mt-5 rounded-3xl border border-slate-700 bg-slate-950 p-4 text-left" : "mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-left"}>
                <p className={`text-sm font-black ${strongTextClass}`}>{scheduleToDelete.title}</p>
                <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>{getReadableDate(scheduleToDelete.date)} às {scheduleToDelete.time}</p>
                <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>{scheduleToDelete.customerName} • {scheduleToDelete.propertyName}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setScheduleToDelete(null)} className={secondaryButtonClass}>Cancelar</button>
                <button type="button" onClick={handleConfirmDelete} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
