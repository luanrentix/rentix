import { useState, useMemo, useCallback } from "react";

export type ScheduleStatus = "scheduled" | "completed" | "canceled";
export type SchedulePriority = "low" | "medium" | "high";

export interface ScheduleItem {
  id: string;
  title: string;
  personId?: string | null;
  propertyId?: string | null;
  customerName: string;
  propertyName: string;
  date: string;
  time: string;
  type: string;
  status: ScheduleStatus;
  priority: SchedulePriority;
  responsibleName: string;
  notes: string;
  reminder: string;
}

interface UseAgendaFiltersParams {
  scheduleItems: ScheduleItem[];
  selectedDate: string;
  weekDays: Date[];
  currentCalendarDate: Date;
  todayInputValue: string;
  viewMode: "month" | "week" | "day";
  createDateFromInputValue: (val: string) => Date;
  formatDateToInputValue: (date: Date) => string;
  getWeekRangeLabel: (days: Date[]) => string;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getTimeValue(item: ScheduleItem) {
  return item.time || "00:00";
}

export function useAgendaFilters(params: UseAgendaFiltersParams) {
  const {
    scheduleItems,
    selectedDate,
    weekDays,
    currentCalendarDate,
    todayInputValue,
    viewMode,
    createDateFromInputValue,
    formatDateToInputValue,
    getWeekRangeLabel,
  } = params;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<SchedulePriority | "all">("all");

  const normalizedSearchTerm = useMemo(() => {
    return normalizeText(searchTerm.trim());
  }, [searchTerm]);

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
        ].some((value) => normalizeText(value || "").includes(normalizedSearchTerm));
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
  }, [filteredItems, weekDays, formatDateToInputValue]);

  const monthItems = useMemo(() => {
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();

    return filteredItems.filter((item) => {
      const itemDate = createDateFromInputValue(item.date);
      return itemDate.getMonth() === month && itemDate.getFullYear() === year;
    });
  }, [filteredItems, currentCalendarDate, createDateFromInputValue]);

  const nextSevenDaysItems = useMemo(() => {
    const startDate = createDateFromInputValue(todayInputValue);
    const date = createDateFromInputValue(todayInputValue);
    date.setDate(date.getDate() + 7);
    const endDate = date;

    return scheduleItems
      .filter((item) => {
        const itemDate = createDateFromInputValue(item.date);
        return itemDate >= startDate && itemDate <= endDate && item.status === "scheduled";
      })
      .sort((firstItem, secondItem) =>
        getTimeValue(firstItem).localeCompare(getTimeValue(secondItem)),
      )
      .slice(0, 6);
  }, [scheduleItems, todayInputValue, createDateFromInputValue]);

  const scheduledCount = useMemo(() => {
    return scheduleItems.filter((item) => item.status === "scheduled").length;
  }, [scheduleItems]);

  const completedCount = useMemo(() => {
    return scheduleItems.filter((item) => item.status === "completed").length;
  }, [scheduleItems]);

  const todayCount = useMemo(() => {
    return scheduleItems.filter((item) => item.date === todayInputValue).length;
  }, [scheduleItems, todayInputValue]);

  const highPriorityCount = useMemo(() => {
    return scheduleItems.filter((item) => item.priority === "high" && item.status === "scheduled").length;
  }, [scheduleItems]);

  const overdueCount = useMemo(() => {
    return scheduleItems.filter((item) => item.date < todayInputValue && item.status === "scheduled").length;
  }, [scheduleItems, todayInputValue]);

  const activeFilterCount = useMemo(() => {
    return [
      searchTerm.trim(),
      statusFilter !== "all",
      typeFilter !== "all",
      responsibleFilter !== "all",
      priorityFilter !== "all",
    ].filter(Boolean).length;
  }, [searchTerm, statusFilter, typeFilter, responsibleFilter, priorityFilter]);

  const calendarSubtitle = useMemo(() => {
    return viewMode === "month"
      ? `${monthItems.length} compromisso(s) neste mês`
      : viewMode === "week"
        ? `${weekItems.length} compromisso(s) de ${getWeekRangeLabel(weekDays)}`
        : `${selectedDateItems.length} compromisso(s) no dia`;
  }, [viewMode, monthItems.length, weekItems.length, selectedDateItems.length, weekDays, getWeekRangeLabel]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setResponsibleFilter("all");
    setPriorityFilter("all");
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    responsibleFilter,
    setResponsibleFilter,
    priorityFilter,
    setPriorityFilter,
    filteredItems,
    selectedDateItems,
    weekItems,
    monthItems,
    nextSevenDaysItems,
    scheduledCount,
    completedCount,
    todayCount,
    highPriorityCount,
    overdueCount,
    activeFilterCount,
    calendarSubtitle,
    handleClearFilters,
  };
}
