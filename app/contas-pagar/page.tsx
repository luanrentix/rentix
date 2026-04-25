"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type ExpenseStatus = "Pending" | "Paid";
type StatusFilter = "All" | "Pending" | "Paid";

type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status?: ExpenseStatus;
};

export default function AccountsPayablePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    const data = localStorage.getItem("rentix_expenses");

    if (data) {
      const parsedExpenses: Expense[] = JSON.parse(data);

      setExpenses(
        parsedExpenses.map((expense) => ({
          ...expense,
          status: expense.status || "Pending",
        })),
      );
    }
  }, []);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(value) ? value : 0);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR");
  }

  function addExpense() {
    if (!description || !amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      description,
      amount: Number(amount),
      date: new Date().toISOString(),
      status: "Pending",
    };

    const updatedExpenses = [...expenses, newExpense];

    setExpenses(updatedExpenses);
    localStorage.setItem("rentix_expenses", JSON.stringify(updatedExpenses));

    setDescription("");
    setAmount("");
  }

  function markPaid(id: string) {
    const updatedExpenses = expenses.map((expense) =>
      expense.id === id
        ? { ...expense, status: "Paid" as ExpenseStatus }
        : expense,
    );

    setExpenses(updatedExpenses);
    localStorage.setItem("rentix_expenses", JSON.stringify(updatedExpenses));
  }

  function getStatusLabel(status?: ExpenseStatus) {
    if (status === "Paid") return "Pago";

    return "Pendente";
  }

  function getStatusClassName(status?: ExpenseStatus) {
    if (status === "Paid") {
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    }

    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  function getStatusFilterLabel(status: StatusFilter) {
    if (status === "Pending") return "Pendente";
    if (status === "Paid") return "Pago";

    return "Todos";
  }

  function clearAllFilters() {
    setStatusFilter("All");
  }

  const filteredExpenses = useMemo(() => {
    if (statusFilter === "All") return expenses;

    return expenses.filter((expense) => expense.status === statusFilter);
  }, [expenses, statusFilter]);

  const totalPayable = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status !== "Paid")
      .reduce((total, expense) => total + expense.amount, 0);
  }, [filteredExpenses]);

  const totalPaid = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status === "Paid")
      .reduce((total, expense) => total + expense.amount, 0);
  }, [filteredExpenses]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Contas a Pagar
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Cadastre, acompanhe e controle suas despesas financeiras.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Total a Pagar" value={formatCurrency(totalPayable)} red />
          <Card title="Total Pago" value={formatCurrency(totalPaid)} green />
          <Card title="Despesas" value={filteredExpenses.length} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Nova Conta a Pagar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Informe a descrição e o valor da despesa.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px_160px]">
            <input
              placeholder="Descrição"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />

            <input
              placeholder="Valor"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />

            <button
              onClick={addExpense}
              className="h-12 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Filtros Financeiros
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Refine a visualização sem alterar os dados originais.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["All", "Pending", "Paid"] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    statusFilter === status
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {getStatusFilterLabel(status)}
                </button>
              ))}

              <button
                onClick={clearAllFilters}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Lista de Contas a Pagar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Visualize as despesas pendentes e pagas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900">
                    Descrição
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Valor
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Data
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      Nenhuma conta a pagar encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">
                        {expense.description}
                      </td>

                      <td className="px-5 py-4 text-center text-sm font-bold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </td>

                      <td className="px-5 py-4 text-center text-sm text-slate-600">
                        {formatDate(expense.date)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                            expense.status,
                          )}`}
                        >
                          {getStatusLabel(expense.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {expense.status !== "Paid" ? (
                          <button
                            onClick={() => markPaid(expense.id)}
                            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-emerald-600">
                            Pago
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Card({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: React.ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <h2
        className={`mt-2 text-2xl font-black ${
          green
            ? "text-emerald-600"
            : red
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}