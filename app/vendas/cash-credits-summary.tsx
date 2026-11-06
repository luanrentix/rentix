"use client";
import { useEffect, useState } from "react";
import { getCustomerCredits } from "@/services/sales-credit";
export type CashCreditSummary = Record<string, number>;
export default function CashCreditsSummary({
  start,
  end,
  onSummary,
}: {
  start: string;
  end: string;
  onSummary: (summary: CashCreditSummary | null) => void;
}) {
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<CashCreditSummary | null>(null);
  useEffect(() => {
    let current = true;
    onSummary(null);
    setSummary(null);
    getCustomerCredits()
      .then((customers) => {
        if (!current) return;
        const totals: CashCreditSummary = {
          "Créditos gerados no período": 0,
          "Créditos utilizados no período": 0,
          "Ajustes positivos no período": 0,
          "Ajustes negativos no período": 0,
          "Créditos revertidos no período": 0,
          "Utilizações restauradas no período": 0,
          "Saldo atual devido aos clientes": 0,
        };
        const inPeriod = (value: string) => {
          const date = new Date(value);
          const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          return (!start || local >= start) && (!end || local <= end);
        };
        for (const customer of customers) {
          totals["Saldo atual devido aos clientes"] += Math.round(
            Number(customer.balance) * 100,
          );
          for (const entry of customer.entries) {
            const cents = Math.round(Number(entry.amount) * 100);
            if (inPeriod(entry.createdAt))
              totals[
                cents > 0
                  ? "Créditos gerados no período"
                  : "Créditos utilizados no período"
              ] += Math.abs(cents);
            if (entry.reversedAt && inPeriod(entry.reversedAt))
              totals[
                cents > 0
                  ? "Créditos revertidos no período"
                  : "Utilizações restauradas no período"
              ] += Math.abs(cents);
          }
          for (const entry of customer.adjustments)
            if (inPeriod(entry.createdAt))
              totals[
                Number(entry.amount) > 0
                  ? "Ajustes positivos no período"
                  : "Ajustes negativos no período"
              ] += Math.abs(Math.round(Number(entry.amount) * 100));
        }
        for (const key of Object.keys(totals)) totals[key] /= 100;
        setSummary(totals);
        onSummary(totals);
        setError("");
      })
      .catch((cause) => {
        if (current) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar créditos.",
          );
          onSummary(null);
        }
      });
    return () => {
      current = false;
    };
  }, [start, end, onSummary]);
  return (
    <section className="space-y-3 rounded-3xl border bg-white p-5 dark:bg-slate-900">
      <h2 className="font-black">
        Créditos de clientes — movimentos sem entrada de dinheiro
      </h2>
      <p className="text-xs text-slate-500">
        Totais da empresa no período, independentes dos filtros de conta,
        pagamento e busca. O saldo devido é atual. Ajustes positivos incluem
        créditos concedidos por estornos.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {summary
          ? Object.entries(summary).map(([label, amount]) => (
              <p key={label} className="rounded-xl border p-3 text-xs">
                {label}
                <strong className="mt-1 block text-lg">
                  {amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </strong>
              </p>
            ))
          : !error && <p>Carregando créditos...</p>}
      </div>
    </section>
  );
}
