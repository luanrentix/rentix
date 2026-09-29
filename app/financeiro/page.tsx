"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  RefreshCw,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageItem } from "@/services/company-storage";
import { getProperties, type Property } from "@/services/properties.service";
import {
  getFinancialSummary,
  type AccountingMode,
  type BankSummary,
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
  projectedPeriodBalance: number;
  projectedTotalBankBalance: number;
  openReceivableCount: number;
  receivedCount: number;
  openPayableCount: number;
  paidCount: number;
  delinquencyRate: number;
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
  const [bankSummary, setBankSummary] = useState<BankSummary>({
    totalCurrentBalance: 0,
    activeAccountsCount: 0,
    accounts: [],
  });
  const [accountingMode, setAccountingMode] = useState<AccountingMode>("cash");
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

  const loadFinancialSummary = useCallback(
    async (currentCompanyId: string) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const summary = await getFinancialSummary(currentCompanyId, {
          startDate,
          endDate,
          accountingMode,
        });

        setReceivables(summary.receivables);
        setPayables(summary.payables);
        if (summary.bankSummary) {
          setBankSummary(summary.bankSummary);
        }
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
    },
    [accountingMode, endDate, startDate],
  );

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
      .catch((err) =>
        console.error("Erro ao carregar bens para filtro financeiro", err),
      );
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
    const filteredReceivables =
      selectedPropertyId === "all"
        ? receivables
        : receivables.filter((r) => r.propertyId === selectedPropertyId);

    const filteredPayables =
      selectedPropertyId === "all"
        ? payables
        : payables.filter((p) => p.propertyId === selectedPropertyId);

    const openReceivables = filteredReceivables.filter((receivable) => {
      if (receivable.status === "Paid") return false;
      return isDateInsideRange(receivable.dueDate, startDate, endDate);
    });

    const receivedReceivables = filteredReceivables.filter((receivable) => {
      if (receivable.status !== "Paid") return false;
      const targetDate =
        accountingMode === "cash"
          ? receivable.paymentDate || receivable.dueDate
          : receivable.dueDate;
      return isDateInsideRange(targetDate, startDate, endDate);
    });

    const openPayables = filteredPayables.filter((payable) => {
      if (payable.status === "Paid") return false;
      return isDateInsideRange(payable.dueDate, startDate, endDate);
    });

    const paidPayables = filteredPayables.filter((payable) => {
      if (payable.status !== "Paid") return false;
      const targetDate =
        accountingMode === "cash"
          ? payable.paymentDate || payable.dueDate
          : payable.dueDate;
      return isDateInsideRange(targetDate, startDate, endDate);
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

    const operationalResult =
      accountingMode === "cash"
        ? totalReceived - totalPaid
        : totalReceived + totalToReceive - (totalPaid + totalToPay);

    const projectedPeriodBalance =
      totalReceived + totalToReceive - totalPaid - totalToPay;

    const projectedTotalBankBalance =
      bankSummary.totalCurrentBalance + totalToReceive - totalToPay;

    const totalExpectedReceivable = totalReceived + totalToReceive;
    const delinquencyRate =
      totalExpectedReceivable > 0
        ? (overdueReceivable / totalExpectedReceivable) * 100
        : 0;

    return {
      totalToReceive,
      totalReceived,
      totalToPay,
      totalPaid,
      overdueReceivable,
      overduePayable,
      operationalResult,
      projectedPeriodBalance,
      projectedTotalBankBalance,
      openReceivableCount: openReceivables.length,
      receivedCount: receivedReceivables.length,
      openPayableCount: openPayables.length,
      paidCount: paidPayables.length,
      delinquencyRate,
    };
  }, [
    accountingMode,
    bankSummary.totalCurrentBalance,
    endDate,
    payables,
    receivables,
    selectedPropertyId,
    startDate,
  ]);

  const receivableAttentionItems = useMemo(() => {
    const filteredReceivables =
      selectedPropertyId === "all"
        ? receivables
        : receivables.filter((r) => r.propertyId === selectedPropertyId);

    return filteredReceivables
      .filter((receivable) => receivable.status !== "Paid")
      .filter((receivable) =>
        isDateInsideRange(receivable.dueDate, startDate, endDate),
      )
      .sort(sortUrgentFirst)
      .slice(0, 8)
      .map(mapReceivableToStatementItem);
  }, [receivables, startDate, endDate, selectedPropertyId]);

  const payableAttentionItems = useMemo(() => {
    const filteredPayables =
      selectedPropertyId === "all"
        ? payables
        : payables.filter((p) => p.propertyId === selectedPropertyId);

    return filteredPayables
      .filter((payable) => payable.status !== "Paid")
      .filter((payable) =>
        isDateInsideRange(payable.dueDate, startDate, endDate),
      )
      .sort(sortUrgentFirst)
      .slice(0, 8)
      .map(mapPayableToStatementItem);
  }, [payables, startDate, endDate, selectedPropertyId]);

  const periodLabel = getPeriodLabel(periodShortcut, startDate, endDate);
  const totalOverdue = balance.overdueReceivable + balance.overduePayable;
  const isResultPositive = balance.operationalResult >= 0;
  const isProjectedPositive = balance.projectedTotalBankBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header - Padrão Bens/Ativos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Visão Geral Financeira
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                Acompanhe o realizado, o projetado e a disponibilidade real de caixa & bancos
              </p>
            </div>
          </div>
          {lastUpdatedAt && (
            <p className="mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              Atualizado em {new Date(lastUpdatedAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {/* Ações de Navegação e Atalhos */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => (window.location.href = "/bancos")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-4 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-100 active:scale-95 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <Banknote className="h-4 w-4" />
            Bancos & Caixas
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/financeiro/relatorios")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-200/80 bg-orange-50/80 px-4 text-xs font-black text-orange-700 shadow-sm transition hover:bg-orange-100 active:scale-95 dark:border-orange-800/40 dark:bg-orange-950/40 dark:text-orange-300"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Relatórios Gerenciais
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/contas-receber")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <ArrowUpCircle className="h-4 w-4" />
            A Receber
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/contas-pagar")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 text-xs font-black text-rose-700 shadow-sm transition hover:bg-rose-100 active:scale-95 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <ArrowDownCircle className="h-4 w-4" />
            A Pagar
          </button>
          <button
            type="button"
            onClick={() => companyId && loadFinancialSummary(companyId)}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {/* Card de Filtros no Padrão AssetFilters */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Período de Análise
            </label>
            <select
              value={periodShortcut}
              onChange={(event) =>
                updatePeriodShortcut(event.target.value as PeriodShortcut)
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="CurrentMonth">Mês atual</option>
              <option value="CurrentQuarter">Trimestre atual</option>
              <option value="CurrentYear">Ano atual</option>
              <option value="All">Todo o período</option>
              <option value="Custom">Personalizado</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Data de Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPeriodShortcut("Custom");
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Data de Término
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPeriodShortcut("Custom");
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Regime Contábil
            </label>
            <select
              value={accountingMode}
              onChange={(event) =>
                setAccountingMode(event.target.value as AccountingMode)
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="cash">Regime de Caixa (DFC - Baixados)</option>
              <option value="accrual">Regime de Competência (DRE - Vencimentos)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Filtrar por Bem / Ativo
            </label>
            <select
              value={selectedPropertyId}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Todos os bens/ativos</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.title} {prop.code ? `(${prop.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Painel Executivo de Posição Consolidada (Caixa + Projeção + Bancos) */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                  {accountingMode === "cash" ? "Resultado de Caixa" : "Resultado por Competência"} {periodLabel}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {accountingMode === "cash" ? "Regime Caixa" : "Regime Competência"}
                </span>
              </div>

              <h2
                className={`mt-3 text-3xl font-black sm:text-4xl ${
                  isResultPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isLoading ? "..." : formatCurrency(balance.operationalResult)}
              </h2>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {accountingMode === "cash"
                  ? "Entradas baixadas menos saídas pagas, usando a data efetiva de liquidação em caixa."
                  : "Receitas faturadas menos despesas incorridas com vencimento no período filtrado."}
              </p>
            </div>

            {/* Projeção Bancária Real Integrada */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 min-w-[240px]">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Posição Final Estimada em Conta
              </p>
              <p
                className={`mt-1 text-2xl font-black ${
                  isProjectedPositive
                    ? "text-slate-900 dark:text-white"
                    : "text-rose-600"
                }`}
              >
                {isLoading ? "..." : formatCurrency(balance.projectedTotalBankBalance)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Disponibilidade atual ({formatCurrency(bankSummary.totalCurrentBalance)}) + aberto líquido
              </p>
            </div>
          </div>
        </section>

        {/* Atenção e Inadimplência Crítica */}
        <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-slate-900">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                Atenção Financeira (Vencidos)
              </span>
              <h3 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                {isLoading ? "..." : formatCurrency(totalOverdue)}
              </h3>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Títulos a receber em atraso: {formatCurrency(balance.overdueReceivable)} | Despesas em atraso: {formatCurrency(balance.overduePayable)}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Grid de KPIs no Padrão AssetKpis (Bens/Ativos) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCardAsset
          label="Bancos & Caixas"
          value={formatCurrency(bankSummary.totalCurrentBalance)}
          detail={`${bankSummary.activeAccountsCount} conta(s) ativa(s)`}
          icon={Building2}
          colorClass="text-blue-700"
          bgClass="bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400"
          onClick={() => (window.location.href = "/bancos")}
        />
        <MetricCardAsset
          label="Resultado do Período"
          value={formatCurrency(balance.operationalResult)}
          detail={isResultPositive ? "Superávit do período" : "Déficit do período"}
          icon={isResultPositive ? TrendingUp : TrendingDown}
          colorClass={isResultPositive ? "text-emerald-700" : "text-rose-700"}
          bgClass={isResultPositive ? "bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400"}
        />
        <MetricCardAsset
          label="A Receber Aberto"
          value={formatCurrency(balance.totalToReceive)}
          detail={`${balance.openReceivableCount} lançamento(s)`}
          icon={ArrowUpCircle}
          colorClass="text-emerald-700"
          bgClass="bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
          onClick={() => (window.location.href = "/contas-receber")}
        />
        <MetricCardAsset
          label="A Pagar Aberto"
          value={formatCurrency(balance.totalToPay)}
          detail={`${balance.openPayableCount} compromisso(s)`}
          icon={ArrowDownCircle}
          colorClass="text-rose-700"
          bgClass="bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400"
          onClick={() => (window.location.href = "/contas-pagar")}
        />
        <MetricCardAsset
          label="Total Liquidado"
          value={formatCurrency(balance.totalReceived)}
          detail={`${balance.receivedCount} recebimento(s)`}
          icon={CheckCircle2}
          colorClass="text-slate-900 dark:text-slate-100"
          bgClass="bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
        />
        <MetricCardAsset
          label="Inadimplência"
          value={`${balance.delinquencyRate.toFixed(1)}%`}
          detail={balance.overdueReceivable > 0 ? "Requer cobrança" : "Pontualidade 100%"}
          icon={AlertCircle}
          colorClass={balance.overdueReceivable > 0 ? "text-rose-700" : "text-emerald-700"}
          bgClass={balance.overdueReceivable > 0 ? "bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"}
        />
      </div>

      {/* 3 Cards de Insights e Diagnóstico Rápido */}
      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Vencidos a Receber"
          value={formatCurrency(balance.overdueReceivable)}
          description="Contas que ultrapassaram a data limite sem registro de quitação no sistema."
          danger={balance.overdueReceivable > 0}
        />
        <InsightCard
          icon={<TrendingDown className="h-5 w-5" />}
          title="Vencidos a Pagar"
          value={formatCurrency(balance.overduePayable)}
          description="Contas operacionais ou fornecedores pendentes de quitação prioritária."
          danger={balance.overduePayable > 0}
        />
        <InsightCard
          icon={<Wallet className="h-5 w-5" />}
          title="Tendência de Caixa"
          value={isProjectedPositive ? "Positiva" : "Negativa"}
          description="Posição financeira considerando o saldo real em banco mais compromissos em aberto."
          danger={!isProjectedPositive}
        />
      </div>

      {/* Tabelas de Lançamentos Prioritários - Padrão AssetTable */}
      <div className="grid gap-5 xl:grid-cols-2">
        <StatementList
          title="Recebimentos que exigem atenção"
          emptyMessage="Nenhuma conta a receber em aberto no período selecionado."
          items={receivableAttentionItems}
          actionLabel="Ver Contas a Receber"
          onAction={() => (window.location.href = "/contas-receber")}
        />

        <StatementList
          title="Pagamentos que exigem atenção"
          emptyMessage="Nenhuma conta a pagar em aberto no período selecionado."
          items={payableAttentionItems}
          actionLabel="Ver Contas a Pagar"
          onAction={() => (window.location.href = "/contas-pagar")}
        />
      </div>
    </div>
  );
}

function MetricCardAsset({
  label,
  value,
  detail,
  icon: Icon,
  colorClass,
  bgClass,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: any;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-200 border-slate-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <span className={`text-2xl font-black ${colorClass}`}>
          {value}
        </span>
        <p className="mt-1 truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
          {detail}
        </p>
      </div>
    </button>
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
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            danger
              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
              : "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
          }`}
        >
          {icon}
        </span>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
      </div>
      <h3
        className={`text-2xl font-black ${
          danger ? "text-rose-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
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
    const searchParam = item.searchTerm
      ? `?searchTerm=${encodeURIComponent(item.searchTerm)}`
      : "";
    window.location.href = `${targetPage}${searchParam}`;
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ordenado por vencidos prioritários e datas subsequentes.
          </p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {actionLabel}
        </button>
      </div>

      <div>
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs font-semibold text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <>
            {/* Vista Mobile */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="flex w-full flex-col gap-2.5 px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="truncate">{item.subtitle}</span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(item.date)}
                      </span>
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p
                      className={`text-sm font-black ${
                        item.negative ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {item.negative ? "- " : "+ "}
                      {formatCurrency(item.amount)}
                    </p>
                    <div className="mt-1">
                      <FinancialStatusBadge status={item.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Vista Desktop - Padrão AssetTable */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Lançamento / Origem
                    </th>
                    <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Bem / Categoria
                    </th>
                    <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Vencimento
                    </th>
                    <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Valor
                    </th>
                    <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-black text-slate-950 dark:text-slate-100 text-sm max-w-[220px] truncate">
                        {item.title}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                        {item.subtitle}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatDate(item.date)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-black ${
                          item.negative ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {item.negative ? "- " : "+ "}
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4">
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
    { label: string; bg: string; dot: string }
  > = {
    Pending: {
      label: "Em Aberto",
      bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
      dot: "bg-amber-500",
    },
    Paid: {
      label: "Liquidado",
      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40",
      dot: "bg-emerald-500",
    },
    Overdue: {
      label: "Vencido",
      bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40",
      dot: "bg-rose-500",
    },
  };

  const current = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${current.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}

function mapReceivableToStatementItem(
  receivable: FinancialReceivable,
): StatementItem {
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

function isDateInsideRange(
  date: string | null,
  startDate: string,
  endDate: string,
) {
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
  if (firstItem.status === "Overdue" && secondItem.status !== "Overdue")
    return -1;
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

  return `${lastDay.getFullYear()}-${String(today.getMonth() + 1).padStart(
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
