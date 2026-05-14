"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/context/AuthContext";
import {
  getFinancialSummary,
  type FinancialPayable,
  type FinancialReceivable,
  type FinancialStatus,
  type PeriodShortcut,
} from "@/services/financial-summary.service";

type BalanceSummary = {
  totalToReceive: number;
  totalReceived: number;
  totalToPay: number;
  totalPaid: number;
  overdueReceivable: number;
  overduePayable: number;
  operationalResult: number;
  projectedBalance: number;
  openReceivableCount: number;
  receivedCount: number;
  openPayableCount: number;
  paidCount: number;
};

export default function FinancialPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [receivables, setReceivables] = useState<FinancialReceivable[]>([]);
  const [payables, setPayables] = useState<FinancialPayable[]>([]);
  const [periodShortcut, setPeriodShortcut] =
    useState<PeriodShortcut>("CurrentMonth");
  const [startDate, setStartDate] = useState(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState(getEndOfCurrentMonth());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    loadFinancialSummary(companyId);
  }, [companyId]);

  async function loadFinancialSummary(currentCompanyId: string) {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const summary = await getFinancialSummary(currentCompanyId);

      setReceivables(summary.receivables);
      setPayables(summary.payables);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o resumo financeiro.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updatePeriodShortcut(nextShortcut: PeriodShortcut) {
    setPeriodShortcut(nextShortcut);

    if (nextShortcut === "CurrentMonth") {
      setStartDate(getStartOfCurrentMonth());
      setEndDate(getEndOfCurrentMonth());
      return;
    }

    if (nextShortcut === "CurrentQuarter") {
      setStartDate(getStartOfCurrentQuarter());
      setEndDate(getEndOfCurrentQuarter());
      return;
    }

    if (nextShortcut === "CurrentYear") {
      setStartDate(getStartOfCurrentYear());
      setEndDate(getEndOfCurrentYear());
      return;
    }

    if (nextShortcut === "All") {
      setStartDate("");
      setEndDate("");
    }
  }

  const balance = useMemo<BalanceSummary>(() => {
    const openReceivables = receivables.filter((receivable) => {
      if (receivable.status === "Paid") return false;

      return isDateInsideRange(receivable.dueDate, startDate, endDate);
    });

    const receivedReceivables = receivables.filter((receivable) => {
      if (receivable.status !== "Paid") return false;

      return isDateInsideRange(
        receivable.paymentDate || receivable.dueDate,
        startDate,
        endDate,
      );
    });

    const openPayables = payables.filter((payable) => {
      if (payable.status === "Paid") return false;

      return isDateInsideRange(payable.dueDate, startDate, endDate);
    });

    const paidPayables = payables.filter((payable) => {
      if (payable.status !== "Paid") return false;

      return isDateInsideRange(
        payable.paymentDate || payable.dueDate,
        startDate,
        endDate,
      );
    });

    const totalToReceive = sumAmounts(openReceivables, "amount");
    const totalReceived = sumAmounts(receivedReceivables, "paidAmount");
    const totalToPay = sumAmounts(openPayables, "amount");
    const totalPaid = sumAmounts(paidPayables, "paidAmount");
    const overdueReceivable = sumAmounts(
      openReceivables.filter((item) => item.status === "Overdue"),
      "amount",
    );
    const overduePayable = sumAmounts(
      openPayables.filter((item) => item.status === "Overdue"),
      "amount",
    );

    return {
      totalToReceive,
      totalReceived,
      totalToPay,
      totalPaid,
      overdueReceivable,
      overduePayable,
      operationalResult: totalReceived - totalPaid,
      projectedBalance:
        totalReceived + totalToReceive - totalPaid - totalToPay,
      openReceivableCount: openReceivables.length,
      receivedCount: receivedReceivables.length,
      openPayableCount: openPayables.length,
      paidCount: paidPayables.length,
    };
  }, [receivables, payables, startDate, endDate]);

  const nextReceivables = useMemo(() => {
    return receivables
      .filter((receivable) => receivable.status !== "Paid")
      .filter((receivable) =>
        isDateInsideRange(receivable.dueDate, startDate, endDate),
      )
      .sort(sortByDueDate)
      .slice(0, 6);
  }, [receivables, startDate, endDate]);

  const nextPayables = useMemo(() => {
    return payables
      .filter((payable) => payable.status !== "Paid")
      .filter((payable) => isDateInsideRange(payable.dueDate, startDate, endDate))
      .sort(sortByDueDate)
      .slice(0, 6);
  }, [payables, startDate, endDate]);

  const periodLabel = getPeriodLabel(periodShortcut, startDate, endDate);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              Financeiro
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold text-slate-500 dark:text-slate-400">
              Resultado direto das contas a receber, contas a pagar e baixas
              registradas no backend.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Atalho
                </span>
                <select
                  value={periodShortcut}
                  onChange={(event) =>
                    updatePeriodShortcut(event.target.value as PeriodShortcut)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="CurrentMonth">Mês atual</option>
                  <option value="CurrentQuarter">Trimestre atual</option>
                  <option value="CurrentYear">Ano atual</option>
                  <option value="All">Todo o período</option>
                  <option value="Custom">Personalizado</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Início
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPeriodShortcut("Custom");
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Fim
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPeriodShortcut("Custom");
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-orange-600">
                Resultado {periodLabel}
              </p>
              <h2
                className={`mt-2 text-5xl font-black ${
                  balance.operationalResult >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {isLoading ? "..." : formatCurrency(balance.operationalResult)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Total recebido menos total pago, usando a data real de baixa.
              </p>
            </div>

            <div className="rounded-2xl bg-orange-50 px-6 py-5 text-left dark:bg-orange-500/10 lg:text-right">
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                Saldo projetado
              </p>
              <p
                className={`mt-1 text-3xl font-black ${
                  balance.projectedBalance >= 0
                    ? "text-slate-950 dark:text-white"
                    : "text-red-600"
                }`}
              >
                {isLoading ? "..." : formatCurrency(balance.projectedBalance)}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                Recebido + a receber - pago - a pagar
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <BalanceCard
            title="A receber"
            value={formatCurrency(balance.totalToReceive)}
            detail={`${balance.openReceivableCount} conta(s) em aberto`}
          />
          <BalanceCard
            title="Recebido"
            value={formatCurrency(balance.totalReceived)}
            detail={`${balance.receivedCount} recebimento(s) baixado(s)`}
          />
          <BalanceCard
            title="A pagar"
            value={formatCurrency(balance.totalToPay)}
            detail={`${balance.openPayableCount} conta(s) em aberto`}
            danger
          />
          <BalanceCard
            title="Pago"
            value={formatCurrency(balance.totalPaid)}
            detail={`${balance.paidCount} despesa(s) paga(s)`}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <SimpleSummaryCard
            title="Vencidos a receber"
            value={formatCurrency(balance.overdueReceivable)}
            description="Valores vencidos que ainda não foram recebidos."
            danger={balance.overdueReceivable > 0}
          />
          <SimpleSummaryCard
            title="Vencidos a pagar"
            value={formatCurrency(balance.overduePayable)}
            description="Despesas vencidas que ainda não foram pagas."
            danger={balance.overduePayable > 0}
          />
          <SimpleSummaryCard
            title="Leitura do período"
            value={balance.projectedBalance >= 0 ? "Positiva" : "Negativa"}
            description="Resultado considerando entradas e saídas abertas."
            danger={balance.projectedBalance < 0}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <StatementList
            title="Próximos recebimentos"
            emptyMessage="Nenhuma conta a receber em aberto no período."
            items={nextReceivables.map((receivable) => ({
              id: receivable.id,
              title: receivable.tenantName,
              subtitle: receivable.propertyName,
              date: receivable.dueDate,
              amount: receivable.amount,
              status: receivable.status,
              negative: false,
            }))}
          />

          <StatementList
            title="Próximos pagamentos"
            emptyMessage="Nenhuma conta a pagar em aberto no período."
            items={nextPayables.map((payable) => ({
              id: payable.id,
              title: payable.description,
              subtitle: payable.personName || payable.category || "Geral",
              date: payable.dueDate,
              amount: payable.amount,
              status: payable.status,
              negative: true,
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}

function BalanceCard({
  title,
  value,
  detail,
  danger = false,
}: {
  title: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <p className="text-sm font-black text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <h3
        className={`mt-3 text-3xl font-black ${
          danger ? "text-red-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

function SimpleSummaryCard({
  title,
  value,
  description,
  danger = false,
}: {
  title: string;
  value: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <p className="text-sm font-black text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <h3
        className={`mt-3 text-3xl font-black ${
          danger ? "text-red-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function StatementList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  emptyMessage: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    date: string;
    amount: number;
    status: FinancialStatus;
    negative: boolean;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.length === 0 ? (
          <div className="px-6 py-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">
                  {item.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {item.subtitle} · Vencimento {formatDate(item.date)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p
                  className={`text-lg font-black ${
                    item.negative ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {item.negative ? "- " : ""}
                  {formatCurrency(item.amount)}
                </p>
                <FinancialStatusBadge status={item.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  const statusConfig: Record<
    FinancialStatus,
    { label: string; className: string }
  > = {
    Pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
    Paid: { label: "Pago", className: "bg-emerald-100 text-emerald-700" },
    Overdue: { label: "Vencido", className: "bg-red-100 text-red-700" },
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function isDateInsideRange(date: string | null, startDate: string, endDate: string) {
  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) return false;
  if (startDate && normalizedDate < startDate) return false;
  if (endDate && normalizedDate > endDate) return false;

  return true;
}

function normalizeDate(value: unknown) {
  if (!value) return "";

  const rawValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) return rawValue.slice(0, 10);

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
}

function sortByDueDate<T extends { dueDate: string }>(firstItem: T, secondItem: T) {
  return firstItem.dueDate.localeCompare(secondItem.dueDate);
}

function sumAmounts<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
) {
  return items.reduce((total, item) => {
    const amount = Number(item[key] || 0);

    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function getStartOfCurrentMonth() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

function getEndOfCurrentMonth() {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(lastDay.getDate()).padStart(2, "0")}`;
}

function getStartOfCurrentQuarter() {
  const today = new Date();
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;

  return `${today.getFullYear()}-${String(quarterStartMonth + 1).padStart(
    2,
    "0",
  )}-01`;
}

function getEndOfCurrentQuarter() {
  const today = new Date();
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const quarterEndDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);

  return `${quarterEndDate.getFullYear()}-${String(
    quarterEndDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(quarterEndDate.getDate()).padStart(2, "0")}`;
}

function getStartOfCurrentYear() {
  const today = new Date();

  return `${today.getFullYear()}-01-01`;
}

function getEndOfCurrentYear() {
  const today = new Date();

  return `${today.getFullYear()}-12-31`;
}

function getPeriodLabel(
  shortcut: PeriodShortcut,
  startDate: string,
  endDate: string,
) {
  if (shortcut === "CurrentMonth") return "do mês atual";
  if (shortcut === "CurrentQuarter") return "do trimestre atual";
  if (shortcut === "CurrentYear") return "do ano atual";
  if (shortcut === "All") return "de todo o período";

  if (startDate && endDate) {
    return `de ${formatDate(startDate)} a ${formatDate(endDate)}`;
  }

  if (startDate) return `a partir de ${formatDate(startDate)}`;
  if (endDate) return `até ${formatDate(endDate)}`;

  return "personalizado";
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) return "-";

  return new Date(`${normalizedDate}T00:00:00`).toLocaleDateString("pt-BR");
}
