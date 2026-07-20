import { useState, useMemo } from "react";
import { Expense } from "./useExpenseCalculations";

export type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";

interface UseExpenseFiltersParams {
  expenses: Expense[];
  getExpensePayment: (expenseId: string) => any;
  getExpenseSettlementAmount: (expenseId: string) => number;
  getExpenseRemainingAmount: (expense: Expense) => number;
  getExpensePaidAmount: (expense: Expense) => number;
  getStartOfDay: (date: Date) => Date;
  initialStatusFilter?: StatusFilter;
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

    return result;
  }, [expensesWithStatus, search, statusFilter]);

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
    expensesWithStatus,
    filteredExpenses,
    totalPayable,
    totalPaid,
    totalOverdue,
  };
}
