"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageItem } from "@/services/company-storage";
import { getProperties, type Property } from "@/services/properties.service";
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

type StatementItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  status: FinancialStatus;
  negative: boolean;
  searchTerm?: string;
};

type ThemeMode = "light" | "black" | "graphite";

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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [financialTheme, setFinancialTheme] = useState<ThemeMode>("light");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  const loadFinancialSummary = useCallback(async (currentCompanyId: string) => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const summary = await getFinancialSummary(currentCompanyId, {
        startDate,
        endDate,
      });

      setReceivables(summary.receivables);
      setPayables(summary.payables);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o resumo financeiro.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    if (!companyId) {
      setReceivables([]);
      setPayables([]);
      setProperties([]);
      setIsLoading(false);
      return;
    }

    loadFinancialSummary(companyId);

    getProperties(companyId)
      .then(setProperties)
      .catch((err) => console.error("Erro ao carregar bens para filtro financeiro", err));
  }, [companyId, loadFinancialSummary]);

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

        const nextTheme =
          parsedThemeSettings?.mode === "graphite" ||
          legacyTheme === "graphite" ||
          legacyTheme === "grafite"
            ? "graphite"
            : parsedThemeSettings?.mode === "black" ||
                parsedThemeSettings?.mode === "dark" ||
                legacyTheme === "black" ||
                legacyTheme === "dark"
              ? "black"
              : "light";

        setFinancialTheme(nextTheme);
      } catch {
        setFinancialTheme(
          legacyTheme === "graphite" || legacyTheme === "grafite"
            ? "graphite"
            : legacyTheme === "black" || legacyTheme === "dark"
              ? "black"
              : "light",
        );
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
    if (!companyId) return;

    function handleFinancialUpdate() {
      loadFinancialSummary(companyId as string);
    }

    window.addEventListener("contrx-financial-updated", handleFinancialUpdate);
    window.addEventListener("contrx-receivables-updated", handleFinancialUpdate);
    window.addEventListener("contrx-payables-updated", handleFinancialUpdate);

    return () => {
      window.removeEventListener("contrx-financial-updated", handleFinancialUpdate);
      window.removeEventListener("contrx-receivables-updated", handleFinancialUpdate);
      window.removeEventListener("contrx-payables-updated", handleFinancialUpdate);
    };
  }, [companyId, loadFinancialSummary]);

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
    const filteredReceivables = selectedPropertyId === "all"
      ? receivables
      : receivables.filter(r => r.propertyId === selectedPropertyId);

    const filteredPayables = selectedPropertyId === "all"
      ? payables
      : payables.filter(p => p.propertyId === selectedPropertyId);

    const openReceivables = filteredReceivables.filter((receivable) => {
      if (receivable.status === "Paid") return false;

      return isDateInsideRange(receivable.dueDate, startDate, endDate);
    });

    const receivedReceivables = filteredReceivables.filter((receivable) => {
      if (receivable.status !== "Paid") return false;

      return isDateInsideRange(
        receivable.paymentDate || receivable.dueDate,
        startDate,
        endDate,
      );
    });

    const openPayables = filteredPayables.filter((payable) => {
      if (payable.status === "Paid") return false;

      return isDateInsideRange(payable.dueDate, startDate, endDate);
    });

    const paidPayables = filteredPayables.filter((payable) => {
      if (payable.status !== "Paid") return false;

      return isDateInsideRange(
        payable.paymentDate || payable.dueDate,
        startDate,
        endDate,
      );
    });

    const totalToReceive = sumAmounts(openReceivables, "remainingAmount");
    const totalReceived = sumAmounts(receivedReceivables, "paidAmount");
    const totalToPay = sumAmounts(openPayables, "remainingAmount");
    const totalPaid = sumAmounts(paidPayables, "paidAmount");
    const overdueReceivable = sumAmounts(
      openReceivables.filter((item) => item.status === "Overdue"),
      "remainingAmount",
    );
    const overduePayable = sumAmounts(
      openPayables.filter((item) => item.status === "Overdue"),
      "remainingAmount",
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
  }, [receivables, payables, startDate, endDate, selectedPropertyId]);

  const receivableAttentionItems = useMemo(() => {
    const filteredReceivables = selectedPropertyId === "all"
      ? receivables
      : receivables.filter(r => r.propertyId === selectedPropertyId);

    return filteredReceivables
      .filter((receivable) => receivable.status !== "Paid")
      .filter((receivable) => isDateInsideRange(receivable.dueDate, startDate, endDate))
      .sort(sortUrgentFirst)
      .slice(0, 7)
      .map(mapReceivableToStatementItem);
  }, [receivables, startDate, endDate, selectedPropertyId]);

  const payableAttentionItems = useMemo(() => {
    const filteredPayables = selectedPropertyId === "all"
      ? payables
      : payables.filter(p => p.propertyId === selectedPropertyId);

    return filteredPayables
      .filter((payable) => payable.status !== "Paid")
      .filter((payable) => isDateInsideRange(payable.dueDate, startDate, endDate))
      .sort(sortUrgentFirst)
      .slice(0, 7)
      .map(mapPayableToStatementItem);
  }, [payables, startDate, endDate, selectedPropertyId]);

  const periodLabel = getPeriodLabel(periodShortcut, startDate, endDate);
  const totalOverdue = balance.overdueReceivable + balance.overduePayable;
  const isResultPositive = balance.operationalResult >= 0;
  const isProjectedPositive = balance.projectedBalance >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Financeiro
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold text-slate-500 dark:text-slate-400">
              Acompanhe o realizado, o projetado e os vencimentos ligados às contas a receber e a pagar.
            </p>
            {lastUpdatedAt && (
              <p className="mt-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                Atualizado em {new Date(lastUpdatedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (window.location.href = "/contas-receber")}
              className="contrx-financial-action-button contrx-financial-action-button-emerald inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 hover:border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 active:bg-emerald-200"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Contas a receber
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/contas-pagar")}
              className="contrx-financial-action-button contrx-financial-action-button-red inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-700 ring-1 ring-red-100 hover:border-red-200 hover:bg-red-100 hover:text-red-800 active:bg-red-200"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Contas a pagar
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/financeiro/relatorios")}
              className="contrx-financial-action-button contrx-financial-action-button-orange inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-black text-orange-700 ring-1 ring-orange-100 hover:border-orange-200 hover:bg-orange-100 hover:text-orange-800 active:bg-orange-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Relatórios
            </button>
            <button
              type="button"
              onClick={() => companyId && loadFinancialSummary(companyId)}
              disabled={isLoading}
              className="contrx-financial-action-button contrx-financial-action-button-slate inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-black text-slate-700 hover:border-slate-300 hover:bg-slate-200 hover:text-slate-900 active:bg-slate-300 disabled:hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                Período
              </span>
              <select
                value={periodShortcut}
                onChange={(event) =>
                  updatePeriodShortcut(event.target.value as PeriodShortcut)
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                Filtrar por Bem/Ativo
              </span>
              <select
                value={selectedPropertyId}
                onChange={(event) => setSelectedPropertyId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">Todos os bens/ativos</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.title} {prop.code ? `(${prop.code})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                  Resultado de caixa {periodLabel}
                </p>
                <h2
                  className={`mt-2 text-2xl font-black sm:text-3xl ${
                    isResultPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isLoading ? "..." : formatCurrency(balance.operationalResult)}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Entradas menos saídas de caixa, usando a data real da baixa.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Saldo projetado
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${
                    isProjectedPositive
                      ? "text-slate-950 dark:text-white"
                      : "text-red-600"
                  }`}
                >
                  {isLoading ? "..." : formatCurrency(balance.projectedBalance)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  Realizado + aberto no período
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-red-500/30 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-600">
                  Atenção financeira
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {formatCurrency(totalOverdue)}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Soma de recebimentos e pagamentos vencidos no filtro atual.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<ArrowUpCircle className="h-5 w-5" />}
            title="A receber"
            value={formatCurrency(balance.totalToReceive)}
            detail={`${balance.openReceivableCount} em aberto`}
            tone="emerald"
          />
          <MetricCard
            icon={<Banknote className="h-5 w-5" />}
            title="Recebido em caixa"
            value={formatCurrency(balance.totalReceived)}
            detail={`${balance.receivedCount} baixado(s)`}
            tone="slate"
          />
          <MetricCard
            icon={<ArrowDownCircle className="h-5 w-5" />}
            title="A pagar"
            value={formatCurrency(balance.totalToPay)}
            detail={`${balance.openPayableCount} em aberto`}
            tone="red"
          />
          <MetricCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Pago em caixa"
            value={formatCurrency(balance.totalPaid)}
            detail={`${balance.paidCount} despesa(s)`}
            tone="slate"
          />
          <MetricCard
            icon={<AlertCircle className="h-5 w-5" />}
            title="Taxa Inadimplência"
            value={`${(
              (balance.overdueReceivable / (balance.totalReceived + balance.totalToReceive || 1)) * 100
            ).toFixed(1)}%`}
            detail={balance.overdueReceivable > 0 ? "Requer cobrança" : "Excelente pontualidade"}
            tone={balance.overdueReceivable > 0 ? "red" : "emerald"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InsightCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Vencidos a receber"
            value={formatCurrency(balance.overdueReceivable)}
            description="Valores vencidos que ainda não foram recebidos."
            danger={balance.overdueReceivable > 0}
          />
          <InsightCard
            icon={<TrendingDown className="h-5 w-5" />}
            title="Vencidos a pagar"
            value={formatCurrency(balance.overduePayable)}
            description="Despesas vencidas que ainda não foram pagas."
            danger={balance.overduePayable > 0}
          />
          <InsightCard
            icon={<Wallet className="h-5 w-5" />}
            title="Leitura do período"
            value={isProjectedPositive ? "Positiva" : "Negativa"}
            description="Resultado considerando entradas e saídas abertas."
            danger={!isProjectedPositive}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <StatementList
            title="Recebimentos para atenção"
            emptyMessage="Nenhuma conta a receber em aberto no período."
            items={receivableAttentionItems}
            actionLabel="Abrir contas a receber"
            onAction={() => (window.location.href = "/contas-receber")}
          />

          <StatementList
            title="Pagamentos para atenção"
            emptyMessage="Nenhuma conta a pagar em aberto no período."
            items={payableAttentionItems}
            actionLabel="Abrir contas a pagar"
            onAction={() => (window.location.href = "/contas-pagar")}
          />
        </div>
      </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  tone: "emerald" | "red" | "slate";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-orange-50 text-orange-700",
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-orange-500/30 dark:bg-slate-900">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <h3 className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white">
          {value}
        </h3>
        <p className="mt-1 truncate text-xs font-bold text-orange-600">{detail}</p>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  description,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            danger ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
          }`}
        >
          {icon}
        </span>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </p>
      </div>
      <h3
        className={`text-2xl font-black ${
          danger ? "text-red-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function StatementList({
  title,
  emptyMessage,
  items,
  actionLabel,
  onAction,
}: {
  title: string;
  emptyMessage: string;
  items: StatementItem[];
  actionLabel: string;
  onAction: () => void;
}) {
  const handleItemClick = (item: StatementItem) => {
    const targetPage = item.negative ? "/contas-pagar" : "/contas-receber";
    const searchParam = item.searchTerm ? `?searchTerm=${encodeURIComponent(item.searchTerm)}` : "";
    window.location.href = `${targetPage}${searchParam}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ordenado por vencidos e próximas datas.
          </p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
        >
          {actionLabel}
        </button>
      </div>

      <div>
        {items.length === 0 ? (
          <div className="px-5 py-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <>
            {/* Vista Mobile (Feed de botões) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700 lg:hidden">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <span className="truncate">{item.subtitle}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(item.date)}
                      </span>
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p
                      className={`text-base font-black ${
                        item.negative ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {item.negative ? "- " : ""}
                      {formatCurrency(item.amount)}
                    </p>
                    <FinancialStatusBadge status={item.status} />
                  </div>
                </button>
              ))}
            </div>

            {/* Vista Desktop (Tabela Estruturada) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase dark:text-slate-400">Lançamento / Origem</th>
                    <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase dark:text-slate-400">Imóvel / Categoria</th>
                    <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase dark:text-slate-400">Data de Vencimento</th>
                    <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase dark:text-slate-400">Valor</th>
                    <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4 font-black text-slate-900 dark:text-slate-100 text-sm max-w-[200px] truncate">{item.title}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{item.subtitle}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{formatDate(item.date)}</td>
                      <td className={`px-5 py-4 text-sm font-black ${item.negative ? "text-red-600" : "text-emerald-600"}`}>
                        {item.negative ? "- " : ""}
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <FinancialStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
    Pending: { label: "Pendente", className: "bg-amber-100 text-amber-700" },
    Paid: { label: "Pago", className: "bg-emerald-100 text-emerald-700" },
    Overdue: { label: "Vencido", className: "bg-red-100 text-red-700" },
  };

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function mapReceivableToStatementItem(receivable: FinancialReceivable): StatementItem {
  return {
    id: receivable.id,
    title: receivable.tenantName || "Pessoa não informada",
    subtitle: receivable.propertyName || "Sem bem/ativo vinculado",
    date: receivable.dueDate,
    amount: receivable.remainingAmount,
    status: receivable.status,
    negative: false,
    searchTerm: receivable.tenantName || receivable.propertyName || "",
  };
}

function mapPayableToStatementItem(payable: FinancialPayable): StatementItem {
  return {
    id: payable.id,
    title: payable.description || "Conta a pagar",
    subtitle: payable.personName || payable.category || "Geral",
    date: payable.dueDate,
    amount: payable.remainingAmount,
    status: payable.status,
    negative: true,
    searchTerm: payable.personName || payable.description || "",
  };
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

function sortUrgentFirst<T extends { dueDate: string; status: FinancialStatus }>(
  firstItem: T,
  secondItem: T,
) {
  if (firstItem.status === "Overdue" && secondItem.status !== "Overdue") return -1;
  if (firstItem.status !== "Overdue" && secondItem.status === "Overdue") return 1;

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
