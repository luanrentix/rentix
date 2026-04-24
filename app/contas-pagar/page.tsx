"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
};

export default function AccountsPayablePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const data = localStorage.getItem("rentix_expenses");
    if (data) setExpenses(JSON.parse(data));
  }, []);

  function addExpense() {
    if (!description || !amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      description,
      amount: Number(amount),
      date: new Date().toISOString(),
    };

    const updated = [...expenses, newExpense];
    setExpenses(updated);
    localStorage.setItem("rentix_expenses", JSON.stringify(updated));

    setDescription("");
    setAmount("");
  }

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-black">Contas a Pagar</h1>

      <div className="mb-6 flex gap-4">
        <input
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-3 rounded w-1/2"
        />

        <input
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border p-3 rounded w-1/4"
        />

        <button
          onClick={addExpense}
          className="bg-orange-500 text-white px-6 rounded"
        >
          Adicionar
        </button>
      </div>

      <div className="rounded-2xl border bg-white">
        <table className="w-full">
          <thead className="bg-orange-50">
            <tr>
              <th className="p-4 text-left">Descrição</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Data</th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-4">{e.description}</td>
                <td className="p-4 text-center">R$ {e.amount}</td>
                <td className="p-4 text-center">
                  {new Date(e.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}