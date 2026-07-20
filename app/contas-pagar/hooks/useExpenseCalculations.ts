import { useCallback } from "react";

export interface Expense {
  id: string;
  personId?: string;
  personName?: string;
  propertyId?: string;
  propertyName?: string;
  description: string;
  category?: string;
  amount: number;
  dueDate?: string;
  date?: string;
  status?: "Pending" | "Paid" | "Overdue";
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
}

export interface ExpensePayment {
  id?: string;
  expenseId: string;
  paidAt: string;
  method: string;
  paymentItems?: any[];
  amountPaid: number;
  interest: number;
  discount: number;
  note?: string;
}

export function useExpenseCalculations(paymentRecords: ExpensePayment[]) {
  const getExpensePayment = useCallback((expenseId: string) => {
    return paymentRecords.find(
      (paymentRecord) => String(paymentRecord.expenseId) === String(expenseId),
    );
  }, [paymentRecords]);

  const getExpensePayments = useCallback((expenseId: string) => {
    return paymentRecords.filter(
      (paymentRecord) => String(paymentRecord.expenseId) === String(expenseId),
    );
  }, [paymentRecords]);

  const getExpensePaidAmount = useCallback((expense: Expense) => {
    const paymentTotal = getExpensePayments(expense.id).reduce(
      (total, paymentRecord) => total + paymentRecord.amountPaid,
      0,
    );

    return paymentTotal || (expense.status === "Paid" ? expense.amount : 0);
  }, [getExpensePayments]);

  const getExpenseSettlementAmount = useCallback((expenseId: string) => {
    return getExpensePayments(expenseId).reduce(
      (total, paymentRecord) =>
        total +
        paymentRecord.amountPaid +
        paymentRecord.discount -
        paymentRecord.interest,
      0,
    );
  }, [getExpensePayments]);

  const getExpenseRemainingAmount = useCallback((expense: Expense) => {
    if (expense.status === "Paid" && !getExpensePayment(expense.id)) return 0;

    return Math.max(expense.amount - getExpenseSettlementAmount(expense.id), 0);
  }, [getExpensePayment, getExpenseSettlementAmount]);

  return {
    getExpensePayment,
    getExpensePayments,
    getExpensePaidAmount,
    getExpenseSettlementAmount,
    getExpenseRemainingAmount,
  };
}
