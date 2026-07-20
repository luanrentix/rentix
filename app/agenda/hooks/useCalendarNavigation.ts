import { useState, useCallback, useEffect, useMemo } from "react";

export type ViewMode = "month" | "week" | "day";

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

export function getMonthDays(currentDate: Date) {
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

export function getWeekDays(selectedDate: string) {
  const baseDate = createDateFromInputValue(selectedDate);
  const startDate = new Date(baseDate);
  startDate.setDate(baseDate.getDate() - baseDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

export function useCalendarNavigation(todayValue: string) {
  const [selectedDate, setSelectedDate] = useState<string>(todayValue);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const [currentCalendarDate, setCurrentCalendarDate] = useState(() =>
    createDateFromInputValue(todayValue),
  );

  useEffect(() => {
    const date = createDateFromInputValue(selectedDate);
    setCurrentCalendarDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [selectedDate]);

  const calendarDays = useMemo(
    () => getMonthDays(currentCalendarDate),
    [currentCalendarDate],
  );

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const moveSelectedDateByDays = useCallback((amount: number) => {
    setSelectedDate((current) => addDaysToInputValue(current, amount));
  }, []);

  const handlePreviousPeriod = useCallback(() => {
    if (viewMode === "month") {
      const date = createDateFromInputValue(selectedDate);
      date.setMonth(date.getMonth() - 1);
      setSelectedDate(formatDateToInputValue(date));
    } else if (viewMode === "week") {
      setSelectedDate((current) => addDaysToInputValue(current, -7));
    } else {
      setSelectedDate((current) => addDaysToInputValue(current, -1));
    }
  }, [viewMode, selectedDate]);

  const handleNextPeriod = useCallback(() => {
    if (viewMode === "month") {
      const date = createDateFromInputValue(selectedDate);
      date.setMonth(date.getMonth() + 1);
      setSelectedDate(formatDateToInputValue(date));
    } else if (viewMode === "week") {
      setSelectedDate((current) => addDaysToInputValue(current, 7));
    } else {
      setSelectedDate((current) => addDaysToInputValue(current, 1));
    }
  }, [viewMode, selectedDate]);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(formatDateToInputValue(date));
  }, []);

  const handleTodayClick = useCallback(() => {
    setSelectedDate(todayValue);
  }, [todayValue]);

  const handleDateInputChange = useCallback((value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setSelectedDate(value);
    }
  }, []);

  return {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    currentCalendarDate,
    setCurrentCalendarDate,
    calendarDays,
    weekDays,
    moveSelectedDateByDays,
    handlePreviousPeriod,
    handleNextPeriod,
    handleSelectDate,
    handleTodayClick,
    handleDateInputChange,
    createDateFromInputValue,
    formatDateToInputValue,
  };
}
