import { useState, useMemo } from "react";
import { Expense } from "./useExpenseCalculations";

export type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";
export type PeriodShortcut =
  | "CurrentMonth"
  | "NextMonth"
  | "CurrentQuarter"
  | "CurrentYear"
  | "All"
  | "Custom";

interface UseExpenseFiltersParams {
  expenses: Expense[];
  getExpensePayment: (expenseId: string) => any;
  getExpenseSettlementAmount: (expenseId: string) => number;
  getExpenseRemainingAmount: (expense: Expense) => number;
  getExpensePaidAmount: (expense: Expense) => number;
  getStartOfDay: (date: Date) => Date;
  initialStatusFilter?: StatusFilter;
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNormalizedDate(dateStr?: string) {
  if (!dateStr) return "";
  if (dateStr.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return getLocalDateString(d);
  } catch {
    return "";
  }
}

export function useExpenseFilters(params: UseExpenseFiltersParams) {
  const {
    expenses,
    getExpensePayment,
    getExpenseSettlementAmount,
    getExpenseRemainingAmount,
    getExpensePaidAmount,
    getStartOfDay,
    initialStatusFilter = "All",
  } = params;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [search, setSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [periodShortcut, setPeriodShortcut] = useState<PeriodShortcut>("All");

  const updatePeriodShortcut = (nextShortcut: PeriodShortcut) => {
    setPeriodShortcut(nextShortcut);
    const now = new Date();

    if (nextShortcut === "CurrentMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "NextMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "CurrentQuarter") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterMonth, 1);
      const end = new Date(now.getFullYear(), quarterMonth + 3, 0);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "CurrentYear") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "All") {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

  const expensesWithStatus = useMemo(() => {
    const today = getStartOfDay(new Date());

    return expenses.map((expense) => {
      const paymentRecord = getExpensePayment(expense.id);
      const dueDate = getStartOfDay(
        new Date(expense.dueDate || expense.date || new Date().toISOString()),
      );

      let status: Expense["status"] = "Pending";

      if (paymentRecord && getExpenseSettlementAmount(expense.id) >= expense.amount) {
        status = "Paid";
      } else if (!paymentRecord && expense.status === "Paid") {
        status = "Paid";
      } else if (dueDate < today) {
        status = "Overdue";
      }

      return {
        ...expense,
        status,
      };
    });
  }, [expenses, getExpensePayment, getExpenseSettlementAmount, getStartOfDay]);

  const filteredExpenses = useMemo(() => {
    let result = expensesWithStatus;

    if (search.trim()) {
      const normalizedSearch = search.trim().toLowerCase();

      result = result.filter(
        (expense) =>
          expense.description.toLowerCase().includes(normalizedSearch) ||
          (expense.personName || "").toLowerCase().includes(normalizedSearch) ||
          (expense.propertyName || "").toLowerCase().includes(normalizedSearch) ||
          (expense.category || "").toLowerCase().includes(normalizedSearch),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((expense) => expense.status === statusFilter);
    }

    if (filterStartDate) {
      result = result.filter((expense) => {
        if (statusFilter === "Paid") {
          const payment = getExpensePayment(expense.id);
          const targetDate =
            getNormalizedDate(payment?.paidAt) ||
            getNormalizedDate(expense.dueDate || expense.date);
          return !targetDate || targetDate >= filterStartDate;
        }
        const dueDate = getNormalizedDate(expense.dueDate || expense.date);
        return !dueDate || dueDate >= filterStartDate;
      });
    }

    if (filterEndDate) {
      result = result.filter((expense) => {
        if (statusFilter === "Paid") {
          const payment = getExpensePayment(expense.id);
          const targetDate =
            getNormalizedDate(payment?.paidAt) ||
            getNormalizedDate(expense.dueDate || expense.date);
          return !targetDate || targetDate <= filterEndDate;
        }
        const dueDate = getNormalizedDate(expense.dueDate || expense.date);
        return !dueDate || dueDate <= filterEndDate;
      });
    }

    return result;
  }, [expensesWithStatus, search, statusFilter, filterStartDate, filterEndDate, getExpensePayment]);

  const totalPayable = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status !== "Paid")
      .reduce((total, expense) => total + getExpenseRemainingAmount(expense), 0);
  }, [filteredExpenses, getExpenseRemainingAmount]);

  const totalPaid = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status === "Paid")
      .reduce((total, expense) => total + getExpensePaidAmount(expense), 0);
  }, [filteredExpenses, getExpensePaidAmount]);

  const totalOverdue = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status === "Overdue")
      .reduce((total, expense) => total + getExpenseRemainingAmount(expense), 0);
  }, [filteredExpenses, getExpenseRemainingAmount]);

  return {
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    periodShortcut,
    setPeriodShortcut,
    updatePeriodShortcut,
    expensesWithStatus,
    filteredExpenses,
    totalPayable,
    totalPaid,
    totalOverdue,
  };
}
