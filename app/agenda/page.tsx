"use client";

import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItems,
  updateScheduleItem,
  type ScheduleItem as ApiScheduleItem,
} from "@/services/schedule.service";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";

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

type ActionMenuPosition = {
  top: number;
  left: number;
};

const typeOptions = [
  "Vistoria",
  "Contrato",
  "Financeiro",
  "Entrega",
  "Manutenção",
  "Reunião",
  "Cobrança",
  "Outros",
];
const responsibleOptions = [
  "Equipe Operacional",
  "Comercial",
  "Financeiro",
  "Atendimento",
  "Manutenção",
  "Administrativo",
];
const reminderOptions = [
  "Sem lembrete",
  "No início do dia",
  "15 minutos antes",
  "30 minutos antes",
  "1 hora antes",
  "1 dia antes",
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

function getInitialFormData(todayValue: string): ScheduleFormData {
  return {
    title: "",
    customerName: "",
    propertyName: "",
    date: todayValue,
    time: "08:00",
    type: "Vistoria",
    status: "scheduled",
    priority: "medium",
    responsibleName: "",
    reminder: "30 minutos antes",
    notes: "",
  };
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
      ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "canceled") {
    return isBlackTheme
      ? "border-red-900/60 bg-red-950/40 text-red-300"
      : "border-red-200 bg-red-50 text-red-700";
  }

  return isBlackTheme
    ? "border-orange-900/60 bg-orange-950/40 text-orange-300"
    : "border-orange-200 bg-orange-50 text-orange-700";
}

function getPriorityBadgeClass(priority: SchedulePriority, isBlackTheme: boolean) {
  if (priority === "high") {
    return isBlackTheme
      ? "border-red-900/60 bg-red-950/40 text-red-300"
      : "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "low") {
    return isBlackTheme
      ? "border-sky-900/60 bg-sky-950/40 text-sky-300"
      : "border-sky-200 bg-sky-50 text-sky-700";
  }

  return isBlackTheme
    ? "border-amber-900/60 bg-amber-950/40 text-amber-300"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function getTypeAccentClass(type: string, isBlackTheme: boolean) {
  const normalizedType = normalizeText(type);

  if (normalizedType.includes("financeiro") || normalizedType.includes("cobranca")) {
    return isBlackTheme
      ? "border-l-emerald-400 bg-emerald-950/20"
      : "border-l-emerald-500 bg-emerald-50/70";
  }

  if (normalizedType.includes("contrato")) {
    return isBlackTheme
      ? "border-l-violet-400 bg-violet-950/20"
      : "border-l-violet-500 bg-violet-50/70";
  }

  if (normalizedType.includes("manutencao")) {
    return isBlackTheme
      ? "border-l-sky-400 bg-sky-950/20"
      : "border-l-sky-500 bg-sky-50/70";
  }

  if (normalizedType.includes("entrega")) {
    return isBlackTheme
      ? "border-l-amber-400 bg-amber-950/20"
      : "border-l-amber-500 bg-amber-50/70";
  }

  return isBlackTheme
    ? "border-l-orange-400 bg-orange-950/20"
    : "border-l-orange-500 bg-orange-50/70";
}

export default function AgendaPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [todayInputValue, setTodayInputValue] = useState(() =>
    formatDateToInputValue(new Date()),
  );
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() =>
    createDateFromInputValue(todayInputValue),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<SchedulePriority | "all">("all");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [isBlackTheme, setIsBlackTheme] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(() =>
    getInitialFormData(todayInputValue),
  );
  const [formError, setFormError] = useState("");
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleItem | null>(null);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [duplicatingScheduleId, setDuplicatingScheduleId] = useState<string | null>(null);
  const [statusChangingScheduleId, setStatusChangingScheduleId] = useState<string | null>(null);
  const [openActionMenuScheduleId, setOpenActionMenuScheduleId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);

  const calendarDays = useMemo(
    () => getMonthDays(currentCalendarDate),
    [currentCalendarDate],
  );
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const normalizedSearchTerm = normalizeText(searchTerm);

  const uniqueTypeOptions = useMemo(() => {
    const storedTypes = scheduleItems.map((item) => item.type).filter(Boolean);

    return Array.from(new Set([...typeOptions, ...storedTypes]));
  }, [scheduleItems]);

  const uniqueResponsibleOptions = useMemo(() => {
    const storedResponsibleNames = scheduleItems
      .map((item) => item.responsibleName)
      .filter(Boolean);

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

        return [
          item.title,
          item.customerName,
          item.propertyName,
          item.type,
          item.responsibleName,
          item.notes,
        ].some((value) => normalizeText(value).includes(normalizedSearchTerm));
      })
      .sort((firstItem, secondItem) =>
        getTimeValue(firstItem).localeCompare(getTimeValue(secondItem)),
      );
  }, [
    scheduleItems,
    normalizedSearchTerm,
    statusFilter,
    typeFilter,
    responsibleFilter,
    priorityFilter,
  ]);

  const selectedDateItems = useMemo(
    () => filteredItems.filter((item) => item.date === selectedDate),
    [filteredItems, selectedDate],
  );

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
      .sort((firstItem, secondItem) =>
        getTimeValue(firstItem).localeCompare(getTimeValue(secondItem)),
      )
      .slice(0, 6);
  }, [scheduleItems, todayInputValue]);

  const scheduledCount = scheduleItems.filter(
    (item) => item.status === "scheduled",
  ).length;
  const completedCount = scheduleItems.filter(
    (item) => item.status === "completed",
  ).length;
  const todayCount = scheduleItems.filter((item) => item.date === todayInputValue).length;
  const highPriorityCount = scheduleItems.filter(
    (item) => item.priority === "high" && item.status === "scheduled",
  ).length;
  const overdueCount = scheduleItems.filter(
    (item) => item.date < todayInputValue && item.status === "scheduled",
  ).length;

  const openActionMenuSchedule = useMemo(() => {
    return openActionMenuScheduleId
      ? scheduleItems.find(
          (scheduleItem) => String(scheduleItem.id) === String(openActionMenuScheduleId),
        ) || null
      : null;
  }, [scheduleItems, openActionMenuScheduleId]);

  const pageThemeClass = isBlackTheme
    ? "contrx-agenda-page-black"
    : "contrx-agenda-page-light";
  const cardClass = isBlackTheme
    ? "border-[#334155] bg-[#0f172a] text-[#f8fafc]"
    : "border-[#e2e8f0] bg-[#ffffff] text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const inputClass = isBlackTheme
    ? "h-12 w-full rounded-xl border border-[#334155] bg-[#020617] px-4 text-sm font-bold text-[#f8fafc] outline-none transition placeholder:text-[#64748b] focus:border-[#64748b] focus:ring-4 focus:ring-[#334155]/40"
    : "h-12 w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-4 text-sm font-bold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:ring-4 focus:ring-[#e2e8f0]";
  const textareaClass = inputClass.replace("h-12", "min-h-28 py-3");
  const secondaryButtonClass = isBlackTheme
    ? "rounded-xl bg-[#1e293b] px-4 py-3 text-sm font-bold text-[#cbd5e1] transition hover:bg-[#334155] hover:text-[#ffffff]"
    : "rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm font-bold text-[#475569] transition hover:bg-[#e2e8f0] hover:text-[#0f172a]";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayInputValue(formatDateToInputValue(new Date()));
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!companyId) {
      setIsLoadingSchedules(false);
      return;
    }

    loadScheduleItems();
  }, [companyId]);

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
        const parsedThemeSettings = storedThemeSettings
          ? (JSON.parse(storedThemeSettings) as { mode?: string })
          : null;
        const isBlackThemeSelected =
          parsedThemeSettings?.mode === "graphite" ||
          legacyTheme === "graphite" ||
          legacyTheme === "grafite" ||
          parsedThemeSettings?.mode === "black" ||
          parsedThemeSettings?.mode === "dark" ||
          legacyTheme === "black" ||
          legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isBlackThemeSelected);
        document.body.classList.toggle("dark", isBlackThemeSelected);
        setIsBlackTheme(isBlackThemeSelected);
      } catch {
        const isLegacyBlackTheme =
          legacyTheme === "graphite" ||
          legacyTheme === "grafite" ||
          legacyTheme === "black" ||
          legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isLegacyBlackTheme);
        document.body.classList.toggle("dark", isLegacyBlackTheme);
        setIsBlackTheme(isLegacyBlackTheme);
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

  useEffect(() => {
    const savedViewMode = getCompanyStorageItem(
      companyId,
      "contrx_schedule_view_mode",
      "contrx_schedule_view_mode",
    );
    const savedStatusFilter = getCompanyStorageItem(
      companyId,
      "contrx_schedule_status_filter",
      "contrx_schedule_status_filter",
    );

    if (
      savedViewMode === "month" ||
      savedViewMode === "week" ||
      savedViewMode === "day"
    ) {
      setViewMode(savedViewMode);
    }

    if (
      savedStatusFilter === "all" ||
      savedStatusFilter === "scheduled" ||
      savedStatusFilter === "completed" ||
      savedStatusFilter === "canceled"
    ) {
      setStatusFilter(savedStatusFilter);
    }
  }, [companyId]);

  useEffect(() => {
    setCompanyStorageItem(companyId, "contrx_schedule_view_mode", viewMode);
  }, [companyId, viewMode]);

  useEffect(() => {
    setCompanyStorageItem(companyId, "contrx_schedule_status_filter", statusFilter);
  }, [companyId, statusFilter]);

  useEffect(() => {
    if (!openActionMenuScheduleId) return;

    function closeFloatingActionMenu() {
      handleCloseScheduleActions();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        closeFloatingActionMenu();
        return;
      }

      if (
        target.closest("[data-schedule-action-menu]") ||
        target.closest("[data-schedule-action-trigger]")
      ) {
        return;
      }

      closeFloatingActionMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeFloatingActionMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeFloatingActionMenu);
    window.addEventListener("scroll", closeFloatingActionMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeFloatingActionMenu);
      window.removeEventListener("scroll", closeFloatingActionMenu, true);
    };
  }, [openActionMenuScheduleId]);

  async function loadScheduleItems() {
    setIsLoadingSchedules(true);
    setLoadError("");

    try {
      const apiItems = await getScheduleItems();
      setScheduleItems(apiItems.map(mapApiScheduleItemToScheduleItem));
    } catch (error) {
      console.error("Não foi possível carregar a agenda.", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a agenda.",
      );
      setScheduleItems([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  }

  function setScheduleItemsFromBackend(
    nextItems:
      | ScheduleItem[]
      | ((currentItems: ScheduleItem[]) => ScheduleItem[]),
  ) {
    setScheduleItems(nextItems);
    window.dispatchEvent(new Event("contrx-schedule-updated"));
  }

  function getFloatingActionMenuPosition(
    buttonRect: DOMRect,
    estimatedMenuHeight: number,
  ) {
    const menuWidth = 216;
    const viewportPadding = 16;
    const availableBottomSpace = window.innerHeight - buttonRect.bottom;
    const top =
      availableBottomSpace < estimatedMenuHeight
        ? Math.max(viewportPadding, buttonRect.top - estimatedMenuHeight - 8)
        : buttonRect.bottom + 8;
    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    return { top, left };
  }

  function handleToggleScheduleActions(
    scheduleItem: ScheduleItem,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (openActionMenuScheduleId === scheduleItem.id) {
      handleCloseScheduleActions();
      return;
    }

    const visibleActionCount = 5 + (scheduleItem.status !== "completed" ? 1 : 0) + (scheduleItem.status !== "canceled" ? 1 : 0);
    const estimatedMenuHeight = Math.min(visibleActionCount * 46 + 16, 360);

    setActionMenuPosition(
      getFloatingActionMenuPosition(
        event.currentTarget.getBoundingClientRect(),
        estimatedMenuHeight,
      ),
    );
    setOpenActionMenuScheduleId(scheduleItem.id);
  }

  function handleCloseScheduleActions() {
    setOpenActionMenuScheduleId(null);
    setActionMenuPosition(null);
  }

  function handlePreviousMonth() {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1),
    );
  }

  function handleNextMonth() {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1),
    );
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(formatDateToInputValue(date));
  }

  function handleTodayClick() {
    const today = new Date();
    const dateValue = formatDateToInputValue(today);

    setTodayInputValue(dateValue);
    setSelectedDate(dateValue);
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
    setFormData({ ...getInitialFormData(todayInputValue), date: dateValue || todayInputValue });
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
    if (isScheduleSaving) return;

    setIsScheduleModalOpen(false);
    setEditingScheduleId(null);
    setFormError("");
  }

  async function handleSaveSchedule() {
    if (isScheduleSaving) return;

    if (!formData.title.trim()) {
      setFormError("Informe o título do agendamento.");
      return;
    }

    if (!formData.customerName.trim()) {
      setFormError("Informe o cliente ou responsável externo.");
      return;
    }

    if (!formData.propertyName.trim()) {
      setFormError("Informe o imóvel ou referência do agendamento.");
      return;
    }

    if (!formData.date || !formData.time) {
      setFormError("Informe data e horário do agendamento.");
      return;
    }

    if (!formData.responsibleName.trim()) {
      setFormError("Selecione um responsável interno.");
      return;
    }

    if (!companyId) {
      setFormError("Empresa do usuário não encontrada. Faça login novamente.");
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
      responsibleName: formData.responsibleName.trim(),
      reminder: formData.reminder,
      notes: formData.notes.trim(),
    };

    setIsScheduleSaving(true);
    setFormError("");
    setOperationError("");

    try {
      if (editingScheduleId) {
        const apiItem = await updateScheduleItem(editingScheduleId, normalizedData);
        const updatedItem = mapApiScheduleItemToScheduleItem(apiItem);

        setScheduleItemsFromBackend((currentItems) =>
          currentItems.map((item) =>
            item.id === editingScheduleId ? updatedItem : item,
          ),
        );
      } else {
        const apiItem = await createScheduleItem(normalizedData);
        const nextItem = mapApiScheduleItemToScheduleItem(apiItem);

        setScheduleItemsFromBackend((currentItems) => [...currentItems, nextItem]);
      }

      const nextDate = createDateFromInputValue(normalizedData.date);
      setSelectedDate(normalizedData.date);
      setCurrentCalendarDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      setIsScheduleModalOpen(false);
      setEditingScheduleId(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o agendamento no backend.",
      );
    } finally {
      setIsScheduleSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!scheduleToDelete || deletingScheduleId) return;

    setDeletingScheduleId(scheduleToDelete.id);
    setOperationError("");

    try {
      await deleteScheduleItem(scheduleToDelete.id);
      setScheduleItemsFromBackend(
        (currentItems) =>
          currentItems.filter((item) => item.id !== scheduleToDelete.id),
      );
      setScheduleToDelete(null);
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o agendamento no backend.",
      );
    } finally {
      setDeletingScheduleId(null);
    }
  }

  async function handleQuickStatusChange(item: ScheduleItem, status: ScheduleStatus) {
    if (statusChangingScheduleId) return;

    setStatusChangingScheduleId(item.id);
    setOperationError("");

    try {
      const apiItem = await updateScheduleItem(item.id, { status });
      const updatedItem = mapApiScheduleItemToScheduleItem(apiItem);

      setScheduleItemsFromBackend((currentItems) =>
        currentItems.map((scheduleItem) =>
          scheduleItem.id === item.id ? updatedItem : scheduleItem,
        ),
      );
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status da agenda.",
      );
    } finally {
      setStatusChangingScheduleId(null);
    }
  }

  async function handleDuplicateSchedule(item: ScheduleItem) {
    if (!companyId || duplicatingScheduleId) return;

    setDuplicatingScheduleId(item.id);
    setOperationError("");

    try {
      const duplicatedItem = await createScheduleItem({
        title: `${item.title} - cópia`,
        customerName: item.customerName,
        propertyName: item.propertyName,
        date: addDaysToInputValue(item.date, 1),
        time: item.time,
        type: item.type,
        status: "scheduled",
        priority: item.priority,
        responsibleName: item.responsibleName,
        reminder: item.reminder,
        notes: item.notes,
      });

      setScheduleItemsFromBackend((currentItems) => [
        ...currentItems,
        mapApiScheduleItemToScheduleItem(duplicatedItem),
      ]);
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "Não foi possível duplicar o agendamento.",
      );
    } finally {
      setDuplicatingScheduleId(null);
    }
  }

  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setResponsibleFilter("all");
    setPriorityFilter("all");
  }

  function getStatusFilterLabel(status: ScheduleStatus | "all") {
    if (status === "all") return "Todos";

    return statusLabels[status];
  }

  function renderScheduleCard(item: ScheduleItem, compact = false) {
    const isOverdue = item.date < todayInputValue && item.status === "scheduled";
    const isStatusChanging = statusChangingScheduleId === item.id;
    const isDuplicating = duplicatingScheduleId === item.id;

    return (
      <article
        key={item.id}
        className={`rounded-2xl border border-l-4 p-4 shadow-sm transition hover:shadow-md ${getTypeAccentClass(
          item.type,
          isBlackTheme,
        )} ${isBlackTheme ? "border-[#334155]" : "border-[#e2e8f0]"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-orange-600">
              {item.time} · {getShortDate(item.date)}
            </p>
            <h3 className={`mt-1 break-words text-base font-black ${strongTextClass}`}>
              {item.title}
            </h3>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <div className="flex flex-col items-end gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusBadgeClass(
                  item.status,
                  isBlackTheme,
                )}`}
              >
                {statusLabels[item.status]}
              </span>
              {isOverdue && (
                <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white">
                  Atrasado
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(event) => handleToggleScheduleActions(item, event)}
              data-schedule-action-trigger
              aria-expanded={openActionMenuScheduleId === item.id}
              aria-label={`Abrir ações de ${item.title}`}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition ${
                isBlackTheme
                  ? "border-[#334155] bg-[#020617] text-[#cbd5e1] hover:bg-[#1e293b]"
                  : "border-[#dbe4ef] bg-[#ffffff] text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={`mt-3 grid gap-2 text-sm font-semibold ${
            isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"
          } ${compact ? "" : "sm:grid-cols-2"}`}
        >
          <p className="flex min-w-0 items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 text-orange-600" />
            <span className="truncate">{item.customerName}</span>
          </p>
          <p className="min-w-0 truncate">Imóvel: {item.propertyName}</p>
          <p className="min-w-0 truncate">Responsável: {item.responsibleName}</p>
          <p className="flex min-w-0 items-center gap-2">
            <Clock3 className="h-4 w-4 shrink-0 text-orange-600" />
            <span className="truncate">{item.reminder}</span>
          </p>
        </div>

        {!compact && (
          <p className={`mt-3 text-sm font-medium leading-6 ${mutedTextClass}`}>
            {item.notes || "Sem observações."}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              isBlackTheme
                ? "bg-[#1e293b] text-[#cbd5e1]"
                : "bg-[#ffffff] text-[#475569] shadow-sm ring-1 ring-[#e2e8f0]"
            }`}
          >
            {item.type}
          </span>
          <span
            className={`rounded-xl border px-3 py-2 text-xs font-black ${getPriorityBadgeClass(
              item.priority,
              isBlackTheme,
            )}`}
          >
            Prioridade {priorityLabels[item.priority]}
          </span>
          {(isStatusChanging || isDuplicating) && (
            <span
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
                isBlackTheme
                  ? "bg-[#1e293b] text-[#cbd5e1]"
                  : "bg-[#f8fafc] text-[#64748b]"
              }`}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando
            </span>
          )}
        </div>
      </article>
    );
  }

  return (
    <>
      <style jsx global>{`
        .contrx-agenda-page-light,
        .contrx-agenda-page-light * {
          color-scheme: light !important;
        }

        .contrx-agenda-page-black,
        .contrx-agenda-page-black * {
          color-scheme: dark !important;
        }

        .contrx-agenda-page-light input,
        .contrx-agenda-page-light select,
        .contrx-agenda-page-light textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }

        .contrx-agenda-page-black input,
        .contrx-agenda-page-black select,
        .contrx-agenda-page-black textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
      `}</style>

      <div
        data-contrx-theme={isBlackTheme ? "black" : "light"}
        className={`${pageThemeClass} space-y-6`}
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-orange-600">Operacional</p>
            <h1 className={`mt-1 text-3xl font-black ${strongTextClass}`}>
              AGENDA TESTE
            </h1>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedTextClass}`}>
              Organize compromissos, vistorias, cobranças, entregas e manutenções
              por data, responsável, status e prioridade.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTodayClick}
              className={secondaryButtonClass}
            >
              Ver hoje
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Novo agendamento
            </button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Hoje"
            value={todayCount}
            description="compromissos do dia"
            icon={<CalendarClock className="h-5 w-5" />}
            isBlackTheme={isBlackTheme}
          />
          <MetricCard
            title="Agendados"
            value={scheduledCount}
            description="em aberto"
            icon={<CalendarDays className="h-5 w-5" />}
            isBlackTheme={isBlackTheme}
          />
          <MetricCard
            title="Concluídos"
            value={completedCount}
            description="finalizados"
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="green"
            isBlackTheme={isBlackTheme}
          />
          <MetricCard
            title="Alta prioridade"
            value={highPriorityCount}
            description="pedem atenção"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="red"
            isBlackTheme={isBlackTheme}
          />
          <MetricCard
            title="Atrasados"
            value={overdueCount}
            description="fora do prazo"
            icon={<XCircle className="h-5 w-5" />}
            tone="red"
            isBlackTheme={isBlackTheme}
          />
        </section>

        {(loadError || operationError) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              isBlackTheme
                ? "border-red-900/60 bg-red-950/30 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {loadError || operationError}
          </div>
        )}

        <section className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className={`text-lg font-black ${strongTextClass}`}>
                Filtros da agenda
              </h2>
              <p className={`mt-1 text-sm leading-6 ${mutedTextClass}`}>
                Refine a visualização sem alterar os compromissos salvos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className={secondaryButtonClass}
            >
              Limpar filtros
            </button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.7fr]">
            <Field label="Buscar" isBlackTheme={isBlackTheme}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-600" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cliente, imóvel, responsável, título ou observação..."
                  className={`${inputClass} pl-11`}
                />
              </div>
            </Field>

            <Field label="Status" isBlackTheme={isBlackTheme}>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ScheduleStatus | "all")
                }
                className={inputClass}
              >
                <option value="all">Todos</option>
                <option value="scheduled">Agendados</option>
                <option value="completed">Concluídos</option>
                <option value="canceled">Cancelados</option>
              </select>
            </Field>

            <Field label="Tipo" isBlackTheme={isBlackTheme}>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">Todos</option>
                {uniqueTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Responsável" isBlackTheme={isBlackTheme}>
              <select
                value={responsibleFilter}
                onChange={(event) => setResponsibleFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">Todos</option>
                {uniqueResponsibleOptions.map((responsibleName) => (
                  <option key={responsibleName} value={responsibleName}>
                    {responsibleName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prioridade" isBlackTheme={isBlackTheme}>
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as SchedulePriority | "all")
                }
                className={inputClass}
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </Field>
          </div>

          {(searchTerm ||
            statusFilter !== "all" ||
            typeFilter !== "all" ||
            responsibleFilter !== "all" ||
            priorityFilter !== "all") && (
            <div
              className={`mt-4 flex flex-col justify-between gap-3 rounded-2xl border p-4 md:flex-row md:items-center ${
                isBlackTheme
                  ? "border-orange-900/60 bg-orange-950/30"
                  : "border-orange-200 bg-orange-50"
              }`}
            >
              <div>
                <p className="text-sm font-bold text-orange-700">Filtro aplicado</p>
                <p className={`text-sm ${mutedTextClass}`}>
                  {filteredItems.length} compromisso(s) encontrados · Status:{" "}
                  <strong>{getStatusFilterLabel(statusFilter)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className={secondaryButtonClass}
              >
                Remover filtros
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-6 2xl:grid-cols-[1.45fr_0.85fr]">
          <div className={`rounded-2xl border p-5 shadow-sm lg:p-6 ${cardClass}`}>
            <div
              className={`flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between ${
                isBlackTheme ? "border-[#334155]" : "border-[#e2e8f0]"
              }`}
            >
              <div>
                <h2 className={`text-xl font-black ${strongTextClass}`}>
                  {viewMode === "month"
                    ? `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`
                    : viewMode === "week"
                      ? "Semana"
                      : `Dia ${getReadableDate(selectedDate)}`}
                </h2>
                <p className={`mt-1 text-sm leading-6 ${mutedTextClass}`}>
                  {filteredItems.length} compromisso(s) no filtro atual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateInputChange(event.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  className={`flex h-12 w-12 items-center justify-center ${secondaryButtonClass}`}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className={`flex h-12 w-12 items-center justify-center ${secondaryButtonClass}`}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div
                  className={
                    isBlackTheme
                      ? "flex rounded-xl bg-[#020617] p-1 ring-1 ring-[#334155]"
                      : "flex rounded-xl bg-[#f1f5f9] p-1 ring-1 ring-[#e2e8f0]"
                  }
                >
                  {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                        viewMode === mode
                          ? "bg-orange-500 text-white shadow-sm"
                          : isBlackTheme
                            ? "text-[#cbd5e1] hover:bg-[#1e293b]"
                            : "text-[#475569] hover:bg-[#ffffff]"
                      }`}
                    >
                      {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoadingSchedules ? (
              <LoadingState isBlackTheme={isBlackTheme} />
            ) : (
              <>
                {viewMode === "month" && (
                  <div className="mt-5 grid min-w-[720px] grid-cols-7 gap-2 overflow-x-auto lg:min-w-0">
                    {weekDayLabels.map((dayLabel) => (
                      <div
                        key={dayLabel}
                        className={
                          isBlackTheme
                            ? "rounded-xl bg-orange-950/30 px-2 py-3 text-center text-xs font-black uppercase text-orange-300"
                            : "rounded-xl bg-orange-50 px-2 py-3 text-center text-xs font-black uppercase text-orange-700"
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
                          onClick={() => handleSelectDate(date)}
                          aria-pressed={isSelectedDate}
                          className={`min-h-32 rounded-2xl border p-3 text-left transition ${
                            isSelectedDate
                              ? "border-orange-400 bg-orange-50 shadow-sm"
                              : isBlackTheme
                                ? "border-[#334155] bg-[#020617] hover:border-orange-500/50 hover:bg-orange-950/20"
                                : "border-[#e2e8f0] bg-[#ffffff] hover:border-orange-200 hover:bg-orange-50/40"
                          } ${!isCurrentMonth ? "opacity-40" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                                isToday
                                  ? "bg-orange-500 text-white"
                                  : isSelectedDate
                                    ? "bg-white text-orange-600"
                                    : isBlackTheme
                                      ? "bg-[#1e293b] text-[#cbd5e1]"
                                      : "bg-[#f1f5f9] text-[#334155]"
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
                            {dateItems.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className={`truncate rounded-xl px-2 py-1 text-[11px] font-bold ${
                                  item.priority === "high"
                                    ? "bg-red-600 text-white"
                                    : isBlackTheme
                                      ? "bg-[#1e293b] text-[#cbd5e1]"
                                      : "bg-[#f1f5f9] text-[#475569]"
                                }`}
                              >
                                {item.time} · {item.title}
                              </div>
                            ))}
                            {dateItems.length > 3 && (
                              <p className={`px-2 text-[11px] font-black ${mutedTextClass}`}>
                                + {dateItems.length - 3} mais
                              </p>
                            )}
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
                        <div
                          key={dateValue}
                          className={`rounded-2xl border p-4 ${
                            isToday
                              ? "border-orange-400"
                              : isBlackTheme
                                ? "border-[#334155]"
                                : "border-[#e2e8f0]"
                          } ${isBlackTheme ? "bg-[#020617]" : "bg-[#ffffff]"}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedDate(dateValue)}
                            className="w-full text-left"
                          >
                            <p className={`text-xs font-black uppercase ${mutedTextClass}`}>
                              {weekDayLabels[date.getDay()]}
                            </p>
                            <p
                              className={`mt-1 text-2xl font-black ${
                                isToday ? "text-orange-600" : strongTextClass
                              }`}
                            >
                              {date.getDate()}
                            </p>
                          </button>
                          <div className="mt-4 space-y-2">
                            {items.length > 0 ? (
                              items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleOpenEditModal(item)}
                                  className={`w-full rounded-xl border-l-4 p-3 text-left text-xs font-bold ${getTypeAccentClass(
                                    item.type,
                                    isBlackTheme,
                                  )}`}
                                >
                                  <span className="block text-orange-600">{item.time}</span>
                                  <span className={strongTextClass}>{item.title}</span>
                                </button>
                              ))
                            ) : (
                              <p
                                className={`rounded-xl border border-dashed p-3 text-center text-xs font-bold ${
                                  isBlackTheme
                                    ? "border-[#334155] text-[#64748b]"
                                    : "border-[#e2e8f0] text-[#94a3b8]"
                                }`}
                              >
                                Livre
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewMode === "day" && (
                  <div className="mt-5 space-y-4">
                    {selectedDateItems.length > 0 ? (
                      selectedDateItems.map((item) => renderScheduleCard(item))
                    ) : (
                      <EmptyDayState
                        isBlackTheme={isBlackTheme}
                        selectedDate={selectedDate}
                        onCreate={() => handleOpenCreateModal(selectedDate)}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="space-y-6">
            <div className={`rounded-2xl border p-5 shadow-sm lg:p-6 ${cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                    Data selecionada
                  </p>
                  <h2 className={`mt-2 text-xl font-black ${strongTextClass}`}>
                    {getReadableDate(selectedDate)}
                  </h2>
                  <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>
                    {selectedDateItems.length} compromisso(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(selectedDate)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600"
                  aria-label="Criar agendamento na data selecionada"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
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

            <div className={`rounded-2xl border p-5 shadow-sm lg:p-6 ${cardClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                Próximos 7 dias
              </p>
              <h2 className={`mt-2 text-xl font-black ${strongTextClass}`}>
                Fila operacional
              </h2>
              <div className="mt-5 space-y-3">
                {nextSevenDaysItems.length > 0 ? (
                  nextSevenDaysItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedDate(item.date);
                        handleOpenEditModal(item);
                      }}
                      className={`w-full rounded-2xl border-l-4 p-4 text-left transition hover:-translate-y-0.5 ${getTypeAccentClass(
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
                        {item.customerName} · {item.propertyName}
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

            <div className={`rounded-2xl border p-5 shadow-sm lg:p-6 ${cardClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                Resumo do mês
              </p>
              <h2 className={`mt-2 text-xl font-black ${strongTextClass}`}>
                {monthItems.length} evento(s)
              </h2>
              <div className="mt-5 space-y-3">
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
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {openActionMenuSchedule && actionMenuPosition && (
        <div
          data-schedule-action-menu
          className={`fixed z-[90] max-h-[calc(100vh-32px)] w-56 overflow-y-auto rounded-2xl border p-1 text-left shadow-2xl ring-1 ${
            isBlackTheme
              ? "border-[#334155] bg-[#0f172a] ring-[#334155]"
              : "border-[#e2e8f0] bg-[#ffffff] ring-[#e2e8f0]"
          }`}
          style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
        >
          {openActionMenuSchedule.status !== "completed" && (
            <ActionMenuButton
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Concluir"
              tone="green"
              isBlackTheme={isBlackTheme}
              onClick={() => {
                handleCloseScheduleActions();
                handleQuickStatusChange(openActionMenuSchedule, "completed");
              }}
            />
          )}
          {openActionMenuSchedule.status !== "canceled" && (
            <ActionMenuButton
              icon={<XCircle className="h-4 w-4" />}
              label="Cancelar"
              isBlackTheme={isBlackTheme}
              onClick={() => {
                handleCloseScheduleActions();
                handleQuickStatusChange(openActionMenuSchedule, "canceled");
              }}
            />
          )}
          <ActionMenuButton
            icon={<RotateCcw className="h-4 w-4" />}
            label="Voltar para agendado"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              handleCloseScheduleActions();
              handleQuickStatusChange(openActionMenuSchedule, "scheduled");
            }}
          />
          <ActionMenuButton
            icon={<Copy className="h-4 w-4" />}
            label="Duplicar"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              handleCloseScheduleActions();
              handleDuplicateSchedule(openActionMenuSchedule);
            }}
          />
          <ActionMenuButton
            icon={<Edit3 className="h-4 w-4" />}
            label="Editar"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              handleCloseScheduleActions();
              handleOpenEditModal(openActionMenuSchedule);
            }}
          />
          <ActionMenuButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Excluir"
            tone="red"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              handleCloseScheduleActions();
              setScheduleToDelete(openActionMenuSchedule);
            }}
          />
        </div>
      )}

      {isScheduleModalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm ${pageThemeClass}`}
        >
          <div
            className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl shadow-2xl ring-1 ${
              isBlackTheme
                ? "bg-[#0f172a] ring-[#334155]"
                : "bg-[#ffffff] ring-[#dbe4ef]"
            }`}
          >
            <div
              className={`border-b p-6 ${
                isBlackTheme
                  ? "border-[#334155] bg-[#111827]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                    {editingScheduleId ? "Editar agenda" : "Novo agendamento"}
                  </p>
                  <h2 className={`mt-2 text-2xl font-black ${strongTextClass}`}>
                    {editingScheduleId ? "Atualizar compromisso" : "Criar compromisso"}
                  </h2>
                  <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                    Preencha os dados para manter a rotina operacional organizada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseScheduleModal}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
                    isBlackTheme
                      ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155]"
                      : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc]"
                  }`}
                  aria-label="Fechar agendamento"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {formError && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                    isBlackTheme
                      ? "border-red-900/60 bg-red-950/30 text-red-300"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Título" isBlackTheme={isBlackTheme} className="md:col-span-2" required>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Ex: Vistoria inicial"
                    className={inputClass}
                  />
                </Field>

                <Field label="Cliente / responsável" isBlackTheme={isBlackTheme} required>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                    placeholder="Nome do cliente"
                    className={inputClass}
                  />
                </Field>

                <Field label="Imóvel / referência" isBlackTheme={isBlackTheme} required>
                  <input
                    type="text"
                    value={formData.propertyName}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        propertyName: event.target.value,
                      }))
                    }
                    placeholder="Imóvel ou referência"
                    className={inputClass}
                  />
                </Field>

                <Field label="Data" isBlackTheme={isBlackTheme} required>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, date: event.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Horário" isBlackTheme={isBlackTheme} required>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, time: event.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Tipo" isBlackTheme={isBlackTheme}>
                  <select
                    value={formData.type}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, type: event.target.value }))
                    }
                    className={inputClass}
                  >
                    {uniqueTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Responsável interno" isBlackTheme={isBlackTheme} required>
                  <select
                    value={formData.responsibleName}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        responsibleName: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Selecione</option>
                    {uniqueResponsibleOptions.map((responsibleName) => (
                      <option key={responsibleName} value={responsibleName}>
                        {responsibleName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status" isBlackTheme={isBlackTheme}>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        status: event.target.value as ScheduleStatus,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Concluído</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </Field>

                <Field label="Prioridade" isBlackTheme={isBlackTheme}>
                  <select
                    value={formData.priority}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        priority: event.target.value as SchedulePriority,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </Field>

                <Field label="Lembrete" isBlackTheme={isBlackTheme} className="md:col-span-2">
                  <select
                    value={formData.reminder}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        reminder: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {reminderOptions.map((reminder) => (
                      <option key={reminder} value={reminder}>
                        {reminder}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Observações internas"
                  isBlackTheme={isBlackTheme}
                  className="md:col-span-2"
                >
                  <textarea
                    value={formData.notes}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Detalhes importantes do compromisso..."
                    rows={4}
                    className={textareaClass}
                  />
                </Field>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={handleCloseScheduleModal}
                disabled={isScheduleSaving}
                className={secondaryButtonClass}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isScheduleSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isScheduleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingScheduleId ? "Salvar alterações" : "Criar agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleToDelete && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${pageThemeClass}`}
        >
          <div
            className={`w-full max-w-md rounded-3xl p-6 text-center shadow-2xl ring-1 ${
              isBlackTheme
                ? "bg-[#0f172a] text-[#f8fafc] ring-[#334155]"
                : "bg-[#ffffff] text-[#0f172a] ring-[#e2e8f0]"
            }`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className={`mt-4 text-2xl font-black ${strongTextClass}`}>
              Excluir agendamento?
            </h2>
            <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
              Essa ação removerá o compromisso da agenda.
            </p>

            <div
              className={`mt-5 rounded-2xl border p-4 text-left ${
                isBlackTheme
                  ? "border-[#334155] bg-[#020617]"
                  : "border-[#e2e8f0] bg-[#f8fafc]"
              }`}
            >
              <p className={`text-sm font-black ${strongTextClass}`}>
                {scheduleToDelete.title}
              </p>
              <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>
                {getReadableDate(scheduleToDelete.date)} às {scheduleToDelete.time}
              </p>
              <p className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>
                {scheduleToDelete.customerName} · {scheduleToDelete.propertyName}
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
                onClick={() => setScheduleToDelete(null)}
                disabled={Boolean(deletingScheduleId)}
                className={secondaryButtonClass}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingScheduleId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingScheduleId && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  children,
  className = "",
  isBlackTheme,
  label,
  required = false,
}: {
  children: ReactNode;
  className?: string;
  isBlackTheme: boolean;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span
        className={`block text-xs font-black uppercase tracking-[0.14em] ${
          isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"
        }`}
      >
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function MetricCard({
  description,
  icon,
  isBlackTheme,
  title,
  tone = "orange",
  value,
}: {
  description: string;
  icon: ReactNode;
  isBlackTheme: boolean;
  title: string;
  tone?: "orange" | "green" | "red";
  value: number;
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-orange-600";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        isBlackTheme
          ? "border-[#334155] bg-[#0f172a]"
          : "border-[#e2e8f0] bg-[#ffffff]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm font-bold ${
            isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"
          }`}
        >
          {title}
        </p>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            isBlackTheme
              ? "bg-[#020617] text-orange-300"
              : "bg-orange-50 text-orange-600"
          }`}
        >
          {icon}
        </span>
      </div>
      <h2 className={`mt-4 text-3xl font-black ${toneClass}`}>{value}</h2>
      <p
        className={`mt-1 text-xs font-bold uppercase tracking-[0.12em] ${
          isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function LoadingState({ isBlackTheme }: { isBlackTheme: boolean }) {
  return (
    <div
      className={`mt-5 flex items-center justify-center rounded-2xl border border-dashed p-10 text-sm font-bold ${
        isBlackTheme
          ? "border-[#334155] text-[#94a3b8]"
          : "border-[#e2e8f0] text-[#64748b]"
      }`}
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Carregando agenda...
    </div>
  );
}

function EmptyDayState({
  isBlackTheme,
  onCreate,
  selectedDate,
}: {
  isBlackTheme: boolean;
  onCreate: () => void;
  selectedDate: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed p-10 text-center ${
        isBlackTheme
          ? "border-orange-900/60 bg-orange-950/20"
          : "border-orange-200 bg-orange-50/60"
      }`}
    >
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
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
        Não existe compromisso para {getReadableDate(selectedDate)} com os filtros
        atuais.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
      >
        <Plus className="h-4 w-4" />
        Criar agendamento
      </button>
    </div>
  );
}

function ActionMenuButton({
  icon,
  isBlackTheme,
  label,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  isBlackTheme: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "green" | "red";
}) {
  const toneClass =
    tone === "green"
      ? isBlackTheme
        ? "text-emerald-300 hover:bg-emerald-950/30"
        : "text-emerald-700 hover:bg-emerald-50"
      : tone === "red"
        ? isBlackTheme
          ? "text-red-300 hover:bg-red-950/30"
          : "text-red-700 hover:bg-red-50"
        : isBlackTheme
          ? "text-[#cbd5e1] hover:bg-[#1e293b]"
          : "text-[#475569] hover:bg-[#f8fafc]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${toneClass}`}
    >
      {icon}
      {label}
    </button>
  );
}
