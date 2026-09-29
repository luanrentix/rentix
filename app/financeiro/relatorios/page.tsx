"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Filter,
  LineChart as LineChartIcon,
  Printer,
  RefreshCw,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageItem } from "@/services/company-storage";
import {
  getCachedCompanySettings,
  getCachedUserSettings,
  setCachedAppSettings,
} from "@/services/settings-cache";
import { getAppSettings } from "@/services/settings.service";
import {
  getFinancialSummary,
  type AccountingMode,
  type BankSummary,
  type FinancialPayable,
  type FinancialReceivable,
  type FinancialStatus,
  type PeriodShortcut,
} from "@/services/financial-summary.service";

type ThemeMode = "light" | "black" | "graphite";
type ReportKey = "dre" | "trialBalance" | "cashFlow" | "delinquency";
type TransactionSource = "all" | "receivable" | "payable";
type ReportStatusFilter = "all" | "paid" | "open" | "overdue";

type CashFlowRow = {
  period: string;
  received: number;
  paid: number;
  receivableOpen: number;
  payableOpen: number;
  monthlyBalance: number;
  projectedBalance: number;
  accumulatedBalance: number;
};

type AgingBucket = {
  label: string;
  amount: number;
  count: number;
  percentage: number;
};

type CategoryExpenseBreakdown = {
  category: string;
  paidAmount: number;
  openAmount: number;
  totalAmount: number;
  percentage: number;
};

const reportOptions: Array<{
  key: ReportKey;
  title: string;
  tag: string;
  formalTitle: string;
  description: string;
}> = [
  {
    key: "dre",
    title: "DRE Gerencial",
    tag: "Demonstração de Resultado",
    formalTitle: "DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE GERENCIAL)",
    description: "Receita bruta, deduções, despesas por categoria e resultado líquido do exercício.",
  },
  {
    key: "trialBalance",
    title: "Balancete Financeiro",
    tag: "Controle Patrimonial",
    formalTitle: "BALANCETE FINANCEIRO DE DISPONIBILIDADES & OBRIGAÇÕES",
    description: "Saldos das contas bancárias, movimentações realizadas e compromissos pendentes.",
  },
  {
    key: "cashFlow",
    title: "Fluxo de Caixa",
    tag: "DFC Mensal",
    formalTitle: "DEMONSTRATIVO DE FLUXO DE CAIXA MENSAL (DFC)",
    description: "Entradas, saídas, projeção líquida e evolução do saldo acumulado por competência.",
  },
  {
    key: "delinquency",
    title: "Inadimplência & Aging",
    tag: "Gestão de Risco",
    formalTitle: "RELATÓRIO ANALÍTICO DE INADIMPLÊNCIA & AGING DE CARTEIRA",
    description: "Matriz etária de vencimentos em atraso com listagem analítica dos devedores.",
  },
];

// Estilos de Impressão Contábil Oficial - Formato Documental Puro A4
const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }

    /* Ocultar elementos de tela e de navegação */
    .contrx-screen-only,
    .contrx-mobile-bottom-nav,
    nav,
    aside,
    button,
    .no-print,
    [data-print-hide="true"] {
      display: none !important;
    }

    /* Ocultar header APENAS se for o header de navegação da aplicação (shell) */
    body > header,
    body > div > header.sticky {
      display: none !important;
    }

    html, body {
      width: 100% !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-size: 10px !important;
      line-height: 1.35 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .contrx-financial-report-page {
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: none !important;
      background: #ffffff !important;
    }

    /* Documento de Impressão */
    .contrx-print-document {
      display: block !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: #ffffff !important;
    }

    /* Cabeçalho Oficial do Relatório - SEMPRE VISÍVEL NA IMPRESSÃO */
    .contrx-report-header {
      display: block !important;
      width: 100% !important;
      margin-bottom: 5mm !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }

    /* Rodapé Oficial do Relatório */
    .contrx-report-footer {
      display: flex !important;
      width: 100% !important;
      margin-top: 6mm !important;
      page-break-inside: avoid !important;
    }

    .contrx-print-table-container {
      width: 100% !important;
      overflow: visible !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0 !important;
    }

    table {
      width: 100% !important;
      min-width: 0 !important;
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      font-size: 9px !important;
    }

    thead {
      display: table-header-group !important;
      background-color: #f1f5f9 !important;
    }

    tr {
      page-break-inside: avoid !important;
      page-break-after: auto !important;
    }

    th {
      border-bottom: 1.5px solid #0f172a !important;
      border-top: 1px solid #cbd5e1 !important;
      padding: 4px 6px !important;
      color: #0f172a !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      font-size: 8.5px !important;
    }

    td {
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 4px 6px !important;
      color: #0f172a !important;
      vertical-align: middle !important;
    }

    .no-break {
      page-break-inside: avoid !important;
    }
  }

  @media screen {
    .contrx-print-document {
      display: block;
    }
  }
`;

export default function FinancialReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [receivables, setReceivables] = useState<FinancialReceivable[]>([]);
  const [payables, setPayables] = useState<FinancialPayable[]>([]);
  const [bankSummary, setBankSummary] = useState<BankSummary>({
    totalCurrentBalance: 0,
    activeAccountsCount: 0,
    accounts: [],
  });
  const [selectedReport, setSelectedReport] = useState<ReportKey>("dre");
  const [accountingMode, setAccountingMode] = useState<AccountingMode>("accrual");
  const [periodShortcut, setPeriodShortcut] =
    useState<PeriodShortcut>("CurrentMonth");
  const [startDate, setStartDate] = useState(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState(getEndOfCurrentMonth());
  const [transactionSource, setTransactionSource] =
    useState<TransactionSource>("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [financialTheme, setFinancialTheme] = useState<ThemeMode>("light");

  const loadReports = useCallback(
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
            : "Não foi possível carregar os relatórios financeiros.",
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
      setIsLoading(false);
      return;
    }

    loadReports(companyId);
  }, [companyId, loadReports]);

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

        setFinancialTheme(
          parsedThemeSettings?.mode === "graphite" ||
            legacyTheme === "graphite" ||
            legacyTheme === "grafite"
            ? "graphite"
            : parsedThemeSettings?.mode === "black" ||
                parsedThemeSettings?.mode === "dark" ||
                legacyTheme === "black" ||
                legacyTheme === "dark"
              ? "black"
              : "light",
        );
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

  const [companySettings, setCompanySettings] = useState<Record<string, unknown> | null>(() => getCachedCompanySettings());
  const [userSettings, setUserSettings] = useState<Record<string, unknown> | null>(() => getCachedUserSettings());

  useEffect(() => {
    if (!companyId) return;
    let isMounted = true;
    getAppSettings(companyId)
      .then((settings) => {
        if (!isMounted) return;
        if (settings?.companySettings) {
          setCompanySettings(settings.companySettings);
        }
        if (settings?.userSettings) {
          setUserSettings(settings.userSettings);
        }
        setCachedAppSettings({
          companySettings: settings?.companySettings,
          userSettings: settings?.userSettings,
        });
      })
      .catch(() => {
        // Fallback para valores já cacheados
      });
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  const companyProfile = useMemo(() => {
    const cachedCompany = companySettings || getCachedCompanySettings();
    const cachedUser = userSettings || getCachedUserSettings();

    const companyName = String(
      cachedCompany?.companyName ||
        cachedCompany?.tradeName ||
        cachedCompany?.name ||
        "Contrx Gestão Empresarial",
    ).trim();

    const tradeName = String(cachedCompany?.tradeName || "").trim();

    const document = String(
      cachedCompany?.document ||
        cachedCompany?.cnpj ||
        cachedCompany?.cpfCnpj ||
        "-",
    ).trim();

    const phone = String(cachedCompany?.phone || "").trim();
    const email = String(cachedCompany?.email || "").trim();
    const addressParts = [
      cachedCompany?.address,
      cachedCompany?.number ? `nº ${cachedCompany.number}` : "",
      cachedCompany?.neighborhood,
      cachedCompany?.city && cachedCompany?.state
        ? `${cachedCompany.city}/${cachedCompany.state}`
        : (cachedCompany?.city || cachedCompany?.state || ""),
    ].filter(Boolean);

    const address = addressParts.length > 0 ? addressParts.join(", ") : "";

    const issuedBy = String(
      cachedUser?.name || user?.name || "Administrador",
    ).trim();

    return {
      companyName,
      tradeName: tradeName && tradeName !== companyName ? tradeName : null,
      document: document !== "-" && document ? document : "Não informado",
      phone: phone !== "-" ? phone : "",
      email: email !== "-" ? email : "",
      address,
      issuedBy,
    };
  }, [companySettings, userSettings, user?.name]);

  const filterOptions = useMemo(() => {
    const categoryOptions = Array.from(
      new Set(
        payables
          .map((item) => item.category || "Outros")
          .filter(Boolean)
          .sort((first, second) => first.localeCompare(second)),
      ),
    );

    return { categoryOptions };
  }, [payables]);

  const filteredData = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    const nextReceivables =
      transactionSource === "payable"
        ? []
        : receivables.filter((item) => {
            if (!matchesStatusFilter(item.status, statusFilter)) return false;
            if (
              !matchesSearch(normalizedSearchTerm, [
                item.tenantName,
                item.propertyName,
                item.dueDate,
              ])
            )
              return false;

            return true;
          });

    const nextPayables =
      transactionSource === "receivable"
        ? []
        : payables.filter((item) => {
            if (!matchesStatusFilter(item.status, statusFilter)) return false;
            if (categoryFilter !== "all" && item.category !== categoryFilter) {
              return false;
            }
            if (
              !matchesSearch(normalizedSearchTerm, [
                item.personName,
                item.description,
                item.category,
                item.dueDate,
              ])
            )
              return false;

            return true;
          });

    return {
      receivables: nextReceivables,
      payables: nextPayables,
    };
  }, [
    categoryFilter,
    payables,
    receivables,
    searchTerm,
    statusFilter,
    transactionSource,
  ]);

  const reportData = useMemo(() => {
    const receivedReceivables = filteredData.receivables.filter(
      (item) => item.status === "Paid",
    );
    const openReceivables = filteredData.receivables.filter(
      (item) => item.status !== "Paid",
    );
    const paidPayables = filteredData.payables.filter(
      (item) => item.status === "Paid",
    );
    const openPayables = filteredData.payables.filter(
      (item) => item.status !== "Paid",
    );
    const overdueReceivables = openReceivables.filter(
      (item) => item.status === "Overdue",
    );
    const overduePayables = openPayables.filter(
      (item) => item.status === "Overdue",
    );

    const isAccrual = accountingMode === "accrual";

    // Totais Contábeis
    const grossRevenue = isAccrual
      ? sumAmounts(filteredData.receivables, "amount")
      : sumAmounts(receivedReceivables, "amount");

    const revenueDiscounts = isAccrual
      ? sumOptionalAmounts(filteredData.receivables, "discountAmount")
      : sumOptionalAmounts(receivedReceivables, "discountAmount");

    const revenueInterest = isAccrual
      ? sumOptionalAmounts(filteredData.receivables, "interestAmount")
      : sumOptionalAmounts(receivedReceivables, "interestAmount");

    const totalReceived = sumAmounts(receivedReceivables, "paidAmount");

    const grossExpenses = isAccrual
      ? sumAmounts(filteredData.payables, "amount")
      : sumAmounts(paidPayables, "amount");

    const expenseDiscounts = isAccrual
      ? sumOptionalAmounts(filteredData.payables, "discountAmount")
      : sumOptionalAmounts(paidPayables, "discountAmount");

    const expenseInterest = isAccrual
      ? sumOptionalAmounts(filteredData.payables, "interestAmount")
      : sumOptionalAmounts(paidPayables, "interestAmount");

    const totalPaid = sumAmounts(paidPayables, "paidAmount");
    const totalReceivableOpen = sumAmounts(openReceivables, "remainingAmount");
    const totalPayableOpen = sumAmounts(openPayables, "remainingAmount");
    const overdueReceivableTotal = sumAmounts(
      overdueReceivables,
      "remainingAmount",
    );
    const overduePayableTotal = sumAmounts(overduePayables, "remainingAmount");

    const netAccrualRevenue = grossRevenue - revenueDiscounts + revenueInterest;
    const netAccrualExpense = grossExpenses - expenseDiscounts + expenseInterest;
    const operationalResult = isAccrual
      ? netAccrualRevenue - netAccrualExpense
      : totalReceived - totalPaid;

    const projectedPeriodBalance =
      totalReceived + totalReceivableOpen - totalPaid - totalPayableOpen;

    const finalProjectedBankBalance =
      bankSummary.totalCurrentBalance + totalReceivableOpen - totalPayableOpen;

    const totalExpectedReceivable = totalReceived + totalReceivableOpen;
    const totalExpectedPayable = totalPaid + totalPayableOpen;
    const collectionRate = getPercentage(totalReceived, totalExpectedReceivable);
    const paymentCompletionRate = getPercentage(totalPaid, totalExpectedPayable);
    const delinquencyRate = getPercentage(
      overdueReceivableTotal,
      totalExpectedReceivable,
    );
    const operationalMargin = getPercentage(
      operationalResult,
      isAccrual ? netAccrualRevenue : totalReceived,
    );

    // Desdobramento analítico de despesas por categoria
    const categoryBreakdownMap = new Map<string, { paid: number; open: number }>();
    filteredData.payables.forEach((p) => {
      const cat = p.category || "Geral / Outros";
      const current = categoryBreakdownMap.get(cat) || { paid: 0, open: 0 };
      if (p.status === "Paid") {
        current.paid += Number(p.paidAmount || p.amount || 0);
      } else {
        current.open += Number(p.remainingAmount || p.amount || 0);
      }
      categoryBreakdownMap.set(cat, current);
    });

    const categoryBreakdown: CategoryExpenseBreakdown[] = Array.from(
      categoryBreakdownMap.entries(),
    )
      .map(([category, amounts]) => {
        const total = isAccrual ? amounts.paid + amounts.open : amounts.paid;
        return {
          category,
          paidAmount: amounts.paid,
          openAmount: amounts.open,
          totalAmount: total,
          percentage: getPercentage(total, isAccrual ? grossExpenses : totalPaid),
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const cashFlowRows = buildCashFlowRows(
      filteredData.receivables,
      filteredData.payables,
    );

    const agingBuckets = buildAgingBuckets(
      [
        ...overdueReceivables.map((item) => ({
          dueDate: item.dueDate,
          amount: item.remainingAmount,
        })),
        ...overduePayables.map((item) => ({
          dueDate: item.dueDate,
          amount: item.remainingAmount,
        })),
      ],
      overdueReceivableTotal + overduePayableTotal,
    );

    return {
      grossRevenue,
      revenueDiscounts,
      revenueInterest,
      netAccrualRevenue,
      netAccrualExpense,
      totalReceived,
      grossExpenses,
      expenseDiscounts,
      expenseInterest,
      totalPaid,
      totalReceivableOpen,
      totalPayableOpen,
      operationalResult,
      projectedPeriodBalance,
      finalProjectedBankBalance,
      collectionRate,
      paymentCompletionRate,
      delinquencyRate,
      operationalMargin,
      overdueReceivables,
      overduePayables,
      overdueReceivableTotal,
      overduePayableTotal,
      overdueTotal: overdueReceivableTotal + overduePayableTotal,
      categoryBreakdown,
      cashFlowRows,
      agingBuckets,
      receivedCount: receivedReceivables.length,
      paidCount: paidPayables.length,
      openReceivableCount: openReceivables.length,
      openPayableCount: openPayables.length,
    };
  }, [
    accountingMode,
    bankSummary.totalCurrentBalance,
    filteredData.payables,
    filteredData.receivables,
  ]);

  const periodLabel = getPeriodLabel(periodShortcut, startDate, endDate);
  const selectedReportOption = reportOptions.find(
    (item) => item.key === selectedReport,
  );
  const issuedAt = lastUpdatedAt || new Date().toISOString();
  const launchCount =
    filteredData.receivables.length + filteredData.payables.length;

  function exportCsv() {
    const rows = buildCsvRows(reportData, selectedReport, periodLabel, accountingMode);
    const csvContent = rows
      .map((row) =>
        row
          .map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `relatorio-${selectedReport}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyExecutiveSummary() {
    const summaryText = [
      `${selectedReportOption?.title || "Relatório financeiro"} - ${periodLabel}`,
      `Regime: ${accountingMode === "accrual" ? "Competência" : "Caixa"}`,
      `Resultado apurado: ${formatCurrency(reportData.operationalResult)}`,
      `Disponibilidade em bancos: ${formatCurrency(bankSummary.totalCurrentBalance)}`,
      `Posição projetada final: ${formatCurrency(reportData.finalProjectedBankBalance)}`,
      `Inadimplência total: ${formatCurrency(reportData.overdueTotal)} (${reportData.delinquencyRate.toFixed(1)}%)`,
    ].join("\n");

    await navigator.clipboard.writeText(summaryText);
    setCopyFeedback("Resumo copiado!");
    window.setTimeout(() => setCopyFeedback(""), 2200);
  }

  return (
    <>
      <style>{printStyles}</style>

      <div
        data-contrx-theme={financialTheme}
        className={`contrx-financial-report-page space-y-6 ${
          financialTheme === "black"
            ? "dark"
            : financialTheme === "graphite"
              ? "dark"
              : ""
        }`}
      >
        {/* ========================================================= */}
        {/* BLOCO DE TELA (NÃO IMPRIME): Header, Abas e Filtros       */}
        {/* ========================================================= */}
        <div className="contrx-screen-only space-y-6">
          {/* Header Superior */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/financeiro")}
                className="mb-2 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar à Visão Geral
              </button>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Relatórios Financeiros & Controladoria
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Emissão formal de DRE, Balancete, Fluxo de Caixa e Inadimplência
              </p>
              {lastUpdatedAt && (
                <p className="mt-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                  Atualizado em {new Date(lastUpdatedAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => companyId && loadReports(companyId)}
                disabled={isLoading}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={copyExecutiveSummary}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-200/80 bg-orange-50/80 px-4 text-xs font-black text-orange-700 shadow-sm transition hover:bg-orange-100 active:scale-95 dark:border-orange-800/40 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <Copy className="h-4 w-4" />
                {copyFeedback || "Copiar Resumo"}
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-xs font-black text-white shadow-lg transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" />
                Imprimir Relatório (PDF)
              </button>
            </div>
          </div>

          {/* Seletor dos 4 Relatórios */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {reportOptions.map((report) => {
              const isSelected = selectedReport === report.key;

              return (
                <button
                  key={report.key}
                  type="button"
                  onClick={() => setSelectedReport(report.key)}
                  className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40 dark:bg-orange-950/30"
                      : "border-slate-200 bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {report.tag}
                    </span>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        isSelected
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {getReportIcon(report.key)}
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-base font-black text-slate-950 dark:text-white">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                      {report.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Filtros Padronizados */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
              <Filter className="h-4 w-4 text-orange-600" />
              Parâmetros de Emissão
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label="Período"
                value={periodShortcut}
                onChange={(value) => updatePeriodShortcut(value as PeriodShortcut)}
                options={[
                  { label: "Mês atual", value: "CurrentMonth" },
                  { label: "Trimestre atual", value: "CurrentQuarter" },
                  { label: "Ano atual", value: "CurrentYear" },
                  { label: "Todo o período", value: "All" },
                  { label: "Personalizado", value: "Custom" },
                ]}
              />
              <DateField
                label="Data Inicial"
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setPeriodShortcut("Custom");
                }}
              />
              <DateField
                label="Data Final"
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setPeriodShortcut("Custom");
                }}
              />
              <SelectField
                label="Regime Contábil"
                value={accountingMode}
                onChange={(value) => setAccountingMode(value as AccountingMode)}
                options={[
                  { label: "Regime de Competência (DRE)", value: "accrual" },
                  { label: "Regime de Caixa (DFC)", value: "cash" },
                ]}
              />
              <SelectField
                label="Origem dos Títulos"
                value={transactionSource}
                onChange={(value) => setTransactionSource(value as TransactionSource)}
                options={[
                  { label: "Todas as contas", value: "all" },
                  { label: "Apenas contas a receber", value: "receivable" },
                  { label: "Apenas contas a pagar", value: "payable" },
                ]}
              />
              <SelectField
                label="Status da Conta"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as ReportStatusFilter)}
                options={[
                  { label: "Todos os status", value: "all" },
                  { label: "Apenas liquidadas", value: "paid" },
                  { label: "Apenas em aberto", value: "open" },
                  { label: "Apenas vencidas", value: "overdue" },
                ]}
              />
              <SelectField
                label="Categoria"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { label: "Todas as categorias", value: "all" },
                  ...filterOptions.categoryOptions.map((category) => ({
                    label: category,
                    value: category,
                  })),
                ]}
              />
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Busca Rápida
                </label>
                <div className="relative mt-1">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Pessoa, bem, descrição..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
              {errorMessage}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* DOCUMENTO OFICIAL DO RELATÓRIO (RENDERIZA TELA E IMPRIME) */}
        {/* ========================================================= */}
        <main className="contrx-print-document rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:border-none print:p-0 print:shadow-none">
          {/* ========================================================= */}
          {/* CABEÇALHO INSTITUCIONAL CONTÁBIL (VISÍVEL EM TELA E PRINT) */}
          {/* ========================================================= */}
          <div className="contrx-report-header border-b-2 border-slate-900 pb-3 mb-4 dark:border-slate-700 print:border-black">
            {/* Bloco 1: Identificação da Empresa e Metadados do Sistema */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white print:text-black uppercase tracking-tight">
                    {companyProfile.companyName}
                  </h1>
                  {companyProfile.tradeName && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 print:text-slate-700">
                      ({companyProfile.tradeName})
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 print:text-slate-800">
                  <span>CNPJ/CPF: <strong className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{companyProfile.document}</strong></span>
                  {companyProfile.phone && ` · Tel: ${companyProfile.phone}`}
                  {companyProfile.email && ` · E-mail: ${companyProfile.email}`}
                  {companyProfile.address && ` · ${companyProfile.address}`}
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 dark:text-slate-400 print:text-slate-800 shrink-0">
                <p>Sistema: <strong className="text-slate-800 dark:text-slate-200 print:text-black">Contrx ERP Financeiro</strong></p>
                <p>Emissão: <strong className="text-slate-900 dark:text-white print:text-black">{new Date(issuedAt).toLocaleString("pt-BR")}</strong></p>
                <p>Responsável: <strong className="text-slate-900 dark:text-white print:text-black">{companyProfile.issuedBy}</strong></p>
              </div>
            </div>

            {/* Bloco 2: Faixa Oficial do Relatório com Parâmetros Contábeis */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
              <div className="mb-2">
                <h2 className="font-black text-slate-950 dark:text-white print:text-black text-sm uppercase tracking-wide">
                  {selectedReportOption?.formalTitle}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-700">
                  {selectedReportOption?.description}
                </p>
              </div>

              {/* Quadro Sintético de Parâmetros de Emissão Contábil */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 print:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 print:border-slate-300">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 print:text-slate-700 block">Período de Apuração:</span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-bold">{periodLabel}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 print:text-slate-700 block">Regime Contábil:</span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-bold">
                    {accountingMode === "accrual" ? "Competência (Fato Gerador)" : "Caixa (Liquidações)"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 print:text-slate-700 block">Lançamentos Processados:</span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-bold">{launchCount} registro(s)</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 print:text-slate-700 block">Filtro de Status:</span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-bold">
                    {statusFilter === "all" ? "Todos os Lançamentos" : statusFilter === "paid" ? "Apenas Liquidados" : statusFilter === "open" ? "Em Aberto" : "Em Atraso"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 1. RELATÓRIO: DRE GERENCIAL                              */}
          {/* ========================================================= */}
          {selectedReport === "dre" && (
            <div className="space-y-4">
              <div className="contrx-print-table-container overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 print:bg-slate-100 print:text-black">
                      <th className="px-4 py-2.5 font-black uppercase">Conta / Discriminação Gerencial</th>
                      <th className="px-4 py-2.5 text-right font-black uppercase w-36">Valor (R$)</th>
                      <th className="px-4 py-2.5 text-right font-black uppercase w-20">AV (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {/* 1. RECEITAS */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-black">
                      <td className="px-4 py-2 text-slate-950 dark:text-white print:text-black">
                        1. RECEITA OPERACIONAL BRUTA
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 font-black">
                        {formatCurrency(reportData.grossRevenue)}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                        100,0%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (-) Deduções e Descontos Concedidos
                      </td>
                      <td className="px-4 py-1.5 text-right text-rose-600">
                        - {formatCurrency(reportData.revenueDiscounts)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-400">
                        {getPercentage(reportData.revenueDiscounts, reportData.grossRevenue || 1).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (+) Juros e Acréscimos Financeiros Recebidos
                      </td>
                      <td className="px-4 py-1.5 text-right text-emerald-600">
                        + {formatCurrency(reportData.revenueInterest)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-400">
                        {getPercentage(reportData.revenueInterest, reportData.grossRevenue || 1).toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-black text-slate-950 dark:text-white print:bg-slate-100 print:text-black">
                      <td className="px-4 py-2">
                        (=) RECEITA OPERACIONAL LÍQUIDA
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 font-black">
                        {formatCurrency(accountingMode === "accrual" ? reportData.netAccrualRevenue : reportData.totalReceived)}
                      </td>
                      <td className="px-4 py-2 text-right font-black">
                        {getPercentage(
                          accountingMode === "accrual" ? reportData.netAccrualRevenue : reportData.totalReceived,
                          reportData.grossRevenue || 1,
                        ).toFixed(1)}%
                      </td>
                    </tr>

                    {/* 2. CUSTOS E DESPESAS OPERACIONAIS */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-black">
                      <td className="px-4 py-2 text-slate-950 dark:text-white print:text-black">
                        2. CUSTOS E DESPESAS OPERACIONAIS
                      </td>
                      <td className="px-4 py-2 text-right text-rose-700 dark:text-rose-400 font-black">
                        - {formatCurrency(reportData.grossExpenses)}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                        {getPercentage(reportData.grossExpenses, reportData.grossRevenue || 1).toFixed(1)}%
                      </td>
                    </tr>

                    {/* Detalhamento das Despesas por Categoria */}
                    {reportData.categoryBreakdown.map((cat) => (
                      <tr key={cat.category}>
                        <td className="px-6 py-1 text-slate-600 dark:text-slate-400">
                          · {cat.category}
                        </td>
                        <td className="px-4 py-1 text-right text-rose-600">
                          - {formatCurrency(cat.totalAmount)}
                        </td>
                        <td className="px-4 py-1 text-right text-slate-400">
                          {cat.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}

                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (+) Descontos Obtidos nas Despesas
                      </td>
                      <td className="px-4 py-1.5 text-right text-emerald-600">
                        + {formatCurrency(reportData.expenseDiscounts)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-400">
                        {getPercentage(reportData.expenseDiscounts, reportData.grossRevenue || 1).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (-) Juros e Multas Pagas
                      </td>
                      <td className="px-4 py-1.5 text-right text-rose-600">
                        - {formatCurrency(reportData.expenseInterest)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-400">
                        {getPercentage(reportData.expenseInterest, reportData.grossRevenue || 1).toFixed(1)}%
                      </td>
                    </tr>

                    {/* RESULTADO LÍQUIDO FINAL */}
                    <tr className="border-t-2 border-slate-900 bg-slate-100 font-black text-sm dark:bg-slate-800 dark:border-slate-700 print:bg-slate-200 print:border-black">
                      <td className="px-4 py-3 text-slate-950 dark:text-white print:text-black">
                        (=) RESULTADO OPERACIONAL DO EXERCÍCIO ({accountingMode === "accrual" ? "DRE" : "DFC"})
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black ${
                          reportData.operationalResult >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatCurrency(reportData.operationalResult)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white print:text-black">
                        {reportData.operationalMargin.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Nota de rodapé da DRE */}
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold pt-1">
                <span>Margem Operacional Líquida: <strong className="text-slate-800 dark:text-slate-200">{reportData.operationalMargin.toFixed(1)}%</strong></span>
                <span>Base contábil: {accountingMode === "accrual" ? "Fato gerador por competência de vencimento" : "Liquidações em caixa"}</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. RELATÓRIO: BALANCETE FINANCEIRO                       */}
          {/* ========================================================= */}
          {selectedReport === "trialBalance" && (
            <div className="space-y-4">
              <div className="contrx-print-table-container overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 print:bg-slate-100 print:text-black">
                      <th className="px-4 py-2.5 font-black uppercase">Grupo / Conta Financeira</th>
                      <th className="px-4 py-2.5 font-black uppercase w-48">Tipo / Banco</th>
                      <th className="px-4 py-2.5 text-right font-black uppercase w-36">Saldo / Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {/* 1. DISPONIBILIDADES BANCÁRIAS */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-black">
                      <td colSpan={2} className="px-4 py-2 text-slate-950 dark:text-white print:text-black">
                        1. DISPONIBILIDADES (CONTAS BANCÁRIAS & CAIXA)
                      </td>
                      <td className="px-4 py-2 text-right text-blue-700 dark:text-blue-400 font-black">
                        {formatCurrency(bankSummary.totalCurrentBalance)}
                      </td>
                    </tr>
                    {bankSummary.accounts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-1.5 text-slate-400 italic">
                          Nenhuma conta bancária cadastrada no sistema.
                        </td>
                      </tr>
                    ) : (
                      bankSummary.accounts.map((acc) => (
                        <tr key={acc.id}>
                          <td className="px-6 py-1.5 text-slate-700 dark:text-slate-300">
                            · {acc.name}
                          </td>
                          <td className="px-4 py-1.5 text-slate-500">
                            {acc.bankName || "Conta Corrente"} ({acc.type})
                          </td>
                          <td className="px-4 py-1.5 text-right font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(acc.currentBalance)}
                          </td>
                        </tr>
                      ))
                    )}

                    {/* 2. MOVIMENTAÇÃO DO PERÍODO */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-black">
                      <td colSpan={2} className="px-4 py-2 text-slate-950 dark:text-white print:text-black">
                        2. MOVIMENTAÇÃO REALIZADA NO PERÍODO
                      </td>
                      <td className={`px-4 py-2 text-right font-black ${reportData.totalReceived >= reportData.totalPaid ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatCurrency(reportData.totalReceived - reportData.totalPaid)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (+) Entradas Liquidadas em Caixa
                      </td>
                      <td className="px-4 py-1.5 text-slate-400">
                        {reportData.receivedCount} título(s) baixado(s)
                      </td>
                      <td className="px-4 py-1.5 text-right text-emerald-600 font-semibold">
                        + {formatCurrency(reportData.totalReceived)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (-) Saídas Pagas em Caixa
                      </td>
                      <td className="px-4 py-1.5 text-slate-400">
                        {reportData.paidCount} despesa(s) quitada(s)
                      </td>
                      <td className="px-4 py-1.5 text-right text-rose-600 font-semibold">
                        - {formatCurrency(reportData.totalPaid)}
                      </td>
                    </tr>

                    {/* 3. OBRIGAÇÕES E DIREITOS PENDENTES */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-black">
                      <td colSpan={2} className="px-4 py-2 text-slate-950 dark:text-white print:text-black">
                        3. DIREITOS E OBRIGAÇÕES PENDENTES NO PERÍODO
                      </td>
                      <td className={`px-4 py-2 text-right font-black ${reportData.totalReceivableOpen >= reportData.totalPayableOpen ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatCurrency(reportData.totalReceivableOpen - reportData.totalPayableOpen)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (+) Contas a Receber em Aberto
                      </td>
                      <td className="px-4 py-1.5 text-slate-400">
                        {reportData.openReceivableCount} título(s) pendente(s)
                      </td>
                      <td className="px-4 py-1.5 text-right text-emerald-600 font-semibold">
                        + {formatCurrency(reportData.totalReceivableOpen)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-1.5 text-slate-600 dark:text-slate-400">
                        (-) Contas a Pagar em Aberto
                      </td>
                      <td className="px-4 py-1.5 text-slate-400">
                        {reportData.openPayableCount} compromisso(s) pendente(s)
                      </td>
                      <td className="px-4 py-1.5 text-right text-rose-600 font-semibold">
                        - {formatCurrency(reportData.totalPayableOpen)}
                      </td>
                    </tr>

                    {/* 4. POSIÇÃO FINAL PROJETADA */}
                    <tr className="border-t-2 border-slate-900 bg-slate-100 font-black text-sm dark:bg-slate-800 dark:border-slate-700 print:bg-slate-200 print:border-black">
                      <td colSpan={2} className="px-4 py-3 text-slate-950 dark:text-white print:text-black">
                        4. POSIÇÃO FINAL ESTIMADA (DISPONIBILIDADE ATUAL + PENDÊNCIAS LÍQUIDAS)
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${reportData.finalProjectedBankBalance >= 0 ? "text-slate-950 dark:text-white print:text-black" : "text-rose-700"}`}>
                        {formatCurrency(reportData.finalProjectedBankBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. RELATÓRIO: FLUXO DE CAIXA MENSAL (DFC)                 */}
          {/* ========================================================= */}
          {selectedReport === "cashFlow" && (
            <div className="space-y-4">
              <div className="contrx-print-table-container overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 print:bg-slate-100 print:text-black">
                      <th className="px-3 py-2.5 font-black uppercase">Período</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">Recebido (R$)</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">Pago (R$)</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">Saldo Mês (R$)</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">A Receber (R$)</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">A Pagar (R$)</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">Projetado (R$)</th>
                      <th className="px-3 py-2.5 text-right font-black uppercase">Acumulado (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {reportData.cashFlowRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-400 italic">
                          Nenhum lançamento registrado para o período filtrado.
                        </td>
                      </tr>
                    ) : (
                      reportData.cashFlowRows.map((row) => (
                        <tr key={row.period} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-black text-slate-950 dark:text-white print:text-black">
                            {formatMonth(row.period)}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-600 font-semibold">
                            {formatCurrency(row.received)}
                          </td>
                          <td className="px-3 py-2 text-right text-rose-600 font-semibold">
                            {formatCurrency(row.paid)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-black ${
                              row.monthlyBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {formatCurrency(row.monthlyBalance)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(row.receivableOpen)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(row.payableOpen)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-black ${
                              row.projectedBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {formatCurrency(row.projectedBalance)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-black ${
                              row.accumulatedBalance >= 0 ? "text-slate-900 dark:text-white print:text-black" : "text-rose-700"
                            }`}
                          >
                            {formatCurrency(row.accumulatedBalance)}
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Totalizador Geral do Fluxo de Caixa */}
                    {reportData.cashFlowRows.length > 0 && (
                      <tr className="border-t-2 border-slate-900 bg-slate-100 font-black text-xs dark:bg-slate-800 dark:border-slate-700 print:bg-slate-200 print:border-black">
                        <td className="px-3 py-2.5 text-slate-950 dark:text-white print:text-black">
                          TOTAL CONSOLIDADO
                        </td>
                        <td className="px-3 py-2.5 text-right text-emerald-700 font-black">
                          {formatCurrency(reportData.totalReceived)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-rose-700 font-black">
                          {formatCurrency(reportData.totalPaid)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-black ${reportData.totalReceived >= reportData.totalPaid ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatCurrency(reportData.totalReceived - reportData.totalPaid)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white print:text-black">
                          {formatCurrency(reportData.totalReceivableOpen)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white print:text-black">
                          {formatCurrency(reportData.totalPayableOpen)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-black ${reportData.projectedPeriodBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatCurrency(reportData.projectedPeriodBalance)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white print:text-black">
                          -
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. RELATÓRIO: INADIMPLÊNCIA & AGING DE CARTEIRA           */}
          {/* ========================================================= */}
          {selectedReport === "delinquency" && (
            <div className="space-y-5">
              {/* Tabela 1: Resumo por Faixa de Aging */}
              <div className="no-break space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Resumo por Faixas de Atraso (Aging)
                </p>
                <div className="contrx-print-table-container overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 print:bg-slate-100 print:text-black">
                        <th className="px-4 py-2 font-black uppercase">Faixa de Atraso</th>
                        <th className="px-4 py-2 text-center font-black uppercase w-28">Títulos</th>
                        <th className="px-4 py-2 text-right font-black uppercase w-36">Valor em Aberto (R$)</th>
                        <th className="px-4 py-2 text-right font-black uppercase w-28">% da Inadimplência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {reportData.agingBuckets.map((bucket) => (
                        <tr key={bucket.label}>
                          <td className="px-4 py-2 font-bold text-slate-900 dark:text-white print:text-black">
                            {bucket.label}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-400">
                            {bucket.count}
                          </td>
                          <td className="px-4 py-2 text-right font-black text-rose-600">
                            {formatCurrency(bucket.amount)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                            {bucket.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black dark:bg-slate-800 print:bg-slate-200">
                        <td className="px-4 py-2 text-slate-950 dark:text-white print:text-black">
                          TOTAL GERAL EM ATRASO
                        </td>
                        <td className="px-4 py-2 text-center">
                          {reportData.overdueReceivables.length + reportData.overduePayables.length}
                        </td>
                        <td className="px-4 py-2 text-right font-black text-rose-700">
                          {formatCurrency(reportData.overdueTotal)}
                        </td>
                        <td className="px-4 py-2 text-right font-black text-slate-950 dark:text-white print:text-black">
                          100,0%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela 2: Relação Nominal de Títulos Vencidos */}
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Relação Analítica de Contas Vencidas
                </p>
                <div className="contrx-print-table-container overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 print:bg-slate-100 print:text-black">
                        <th className="px-3 py-2 font-black uppercase w-20">Tipo</th>
                        <th className="px-3 py-2 font-black uppercase">Pessoa / Origem</th>
                        <th className="px-3 py-2 font-black uppercase">Bem / Categoria</th>
                        <th className="px-3 py-2 font-black uppercase w-24">Vencimento</th>
                        <th className="px-3 py-2 text-center font-black uppercase w-16">Dias</th>
                        <th className="px-3 py-2 text-right font-black uppercase w-28">Valor (R$)</th>
                        <th className="px-3 py-2 text-center font-black uppercase w-20">Risco</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {reportData.overdueReceivables.length === 0 && reportData.overduePayables.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-slate-400 italic">
                            Nenhum título em atraso registrado para o período.
                          </td>
                        </tr>
                      ) : (
                        [
                          ...reportData.overdueReceivables.map((r) => ({
                            type: "A Receber",
                            person: r.tenantName || "Pessoa não informada",
                            ref: r.propertyName || "Geral",
                            dueDate: r.dueDate,
                            days: getDaysOverdue(r.dueDate),
                            amount: r.remainingAmount,
                          })),
                          ...reportData.overduePayables.map((p) => ({
                            type: "A Pagar",
                            person: p.personName || p.description,
                            ref: p.category || "Outros",
                            dueDate: p.dueDate,
                            days: getDaysOverdue(p.dueDate),
                            amount: p.remainingAmount,
                          })),
                        ]
                          .sort((a, b) => b.days - a.days)
                          .map((item, idx) => (
                            <tr key={`${item.type}-${item.person}-${idx}`} className="hover:bg-slate-50/50">
                              <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-white print:text-black">
                                {item.type}
                              </td>
                              <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-white print:text-black max-w-[180px] truncate">
                                {item.person}
                              </td>
                              <td className="px-3 py-1.5 text-slate-500 max-w-[140px] truncate">
                                {item.ref}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">
                                {formatDate(item.dueDate)}
                              </td>
                              <td className="px-3 py-1.5 text-center font-black text-rose-600">
                                {item.days}
                              </td>
                              <td className="px-3 py-1.5 text-right font-black text-rose-600">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                                    item.days > 60
                                      ? "bg-rose-100 text-rose-800"
                                      : item.days > 30
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-orange-100 text-orange-800"
                                  }`}
                                >
                                  {item.days > 60 ? "ALTO" : item.days > 30 ? "MÉDIO" : "BAIXO"}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé Oficial do Relatório */}
          <footer className="contrx-report-footer mt-8 pt-3 border-t border-slate-200 dark:border-slate-800 print:border-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 font-semibold gap-1">
            <span>Contrx ERP · Sistema de Gestão Financeira e Controle de Ativos</span>
            <span>Documento emitido em {new Date(issuedAt).toLocaleString("pt-BR")} | Página 1</span>
          </footer>
        </main>
      </div>
    </>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getReportIcon(report: ReportKey) {
  if (report === "dre") return <BarChart3 className="h-4 w-4" />;
  if (report === "trialBalance") return <Scale className="h-4 w-4" />;
  if (report === "cashFlow") return <LineChartIcon className="h-4 w-4" />;

  return <AlertTriangle className="h-4 w-4" />;
}

function buildCashFlowRows(
  receivables: FinancialReceivable[],
  payables: FinancialPayable[],
) {
  const rows = new Map<string, CashFlowRow>();

  function getRow(period: string) {
    const currentRow = rows.get(period);

    if (currentRow) return currentRow;

    const nextRow: CashFlowRow = {
      period,
      received: 0,
      paid: 0,
      receivableOpen: 0,
      payableOpen: 0,
      monthlyBalance: 0,
      projectedBalance: 0,
      accumulatedBalance: 0,
    };

    rows.set(period, nextRow);
    return nextRow;
  }

  receivables.forEach((item) => {
    const date = item.status === "Paid" ? item.paymentDate || item.dueDate : item.dueDate;
    const normalizedPeriod = normalizeDate(date).slice(0, 7);
    if (!normalizedPeriod) return;

    const row = getRow(normalizedPeriod);

    if (item.status === "Paid") row.received += Number(item.paidAmount || 0);
    else row.receivableOpen += Number(item.remainingAmount || 0);
  });

  payables.forEach((item) => {
    const date = item.status === "Paid" ? item.paymentDate || item.dueDate : item.dueDate;
    const normalizedPeriod = normalizeDate(date).slice(0, 7);
    if (!normalizedPeriod) return;

    const row = getRow(normalizedPeriod);

    if (item.status === "Paid") row.paid += Number(item.paidAmount || 0);
    else row.payableOpen += Number(item.remainingAmount || 0);
  });

  let accumulatedBalance = 0;

  return Array.from(rows.values())
    .sort((first, second) => first.period.localeCompare(second.period))
    .map((row) => {
      const monthlyBalance = row.received - row.paid;
      const projectedBalance =
        row.received + row.receivableOpen - row.paid - row.payableOpen;

      accumulatedBalance += monthlyBalance;

      return {
        ...row,
        monthlyBalance,
        projectedBalance,
        accumulatedBalance,
      };
    });
}

function buildAgingBuckets(
  items: Array<{ dueDate: string; amount: number }>,
  totalOverdue: number,
) {
  const buckets: AgingBucket[] = [
    { label: "1 a 15 dias", amount: 0, count: 0, percentage: 0 },
    { label: "16 a 30 dias", amount: 0, count: 0, percentage: 0 },
    { label: "31 a 60 dias", amount: 0, count: 0, percentage: 0 },
    { label: "Acima de 60 dias", amount: 0, count: 0, percentage: 0 },
  ];

  items.forEach((item) => {
    const daysOverdue = getDaysOverdue(item.dueDate);
    const index =
      daysOverdue <= 15 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : 3;

    buckets[index].amount += Number(item.amount || 0);
    buckets[index].count += 1;
  });

  return buckets.map((b) => ({
    ...b,
    percentage: totalOverdue > 0 ? (b.amount / totalOverdue) * 100 : 0,
  }));
}

function buildCsvRows(
  reportData: any,
  selectedReport: ReportKey,
  periodLabel: string,
  accountingMode: AccountingMode,
) {
  const header = [
    ["Relatório", selectedReport, "Período", periodLabel, "Regime", accountingMode],
  ];

  if (selectedReport === "cashFlow") {
    return [
      ...header,
      [
        "Período",
        "Recebido em caixa",
        "Pago em caixa",
        "Saldo do mês",
        "A receber",
        "A pagar",
        "Projetado",
        "Acumulado",
      ],
      ...reportData.cashFlowRows.map((row: any) => [
        formatMonth(row.period),
        row.received,
        row.paid,
        row.monthlyBalance,
        row.receivableOpen,
        row.payableOpen,
        row.projectedBalance,
        row.accumulatedBalance,
      ]),
    ];
  }

  if (selectedReport === "delinquency") {
    return [
      ...header,
      ["Tipo", "Pessoa / Fornecedor", "Vencimento", "Dias em atraso", "Saldo"],
      ...[
        ...reportData.overdueReceivables.map((item: any) => [
          "A receber",
          item.tenantName,
          formatDate(item.dueDate),
          getDaysOverdue(item.dueDate),
          item.remainingAmount,
        ]),
        ...reportData.overduePayables.map((item: any) => [
          "A pagar",
          item.personName || item.description,
          formatDate(item.dueDate),
          getDaysOverdue(item.dueDate),
          item.remainingAmount,
        ]),
      ],
    ];
  }

  if (selectedReport === "dre") {
    return [
      ...header,
      ["Conta", "Valor (R$)"],
      ["Receita Bruta", reportData.grossRevenue],
      ["Deduções / Descontos", reportData.revenueDiscounts],
      ["Juros / Acréscimos", reportData.revenueInterest],
      ["Receita Líquida", reportData.netAccrualRevenue],
      ["Despesas Operacionais", reportData.grossExpenses],
      ...reportData.categoryBreakdown.map((cat: any) => [
        `  ${cat.category}`,
        cat.totalAmount,
      ]),
      ["Resultado Operacional", reportData.operationalResult],
    ];
  }

  return [
    ...header,
    ["Conta", "Valor (R$)"],
    ["Disponibilidades", reportData.finalProjectedBankBalance],
    ["Entradas", reportData.totalReceived],
    ["Saídas", reportData.totalPaid],
    ["A Receber em Aberto", reportData.totalReceivableOpen],
    ["A Pagar em Aberto", reportData.totalPayableOpen],
  ];
}

function matchesStatusFilter(
  status: FinancialStatus,
  statusFilter: ReportStatusFilter,
) {
  if (statusFilter === "all") return true;
  if (statusFilter === "paid") return status === "Paid";
  if (statusFilter === "open") return status !== "Paid";

  return status === "Overdue";
}

function matchesSearch(searchTerm: string, values: string[]) {
  if (!searchTerm) return true;

  return values.some((value) => normalizeSearchText(value).includes(searchTerm));
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

function sumOptionalAmounts<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
) {
  return sumAmounts(items, key);
}

function getPercentage(value: number, total: number) {
  if (!Number.isFinite(total) || total === 0) return 0;

  return (value / total) * 100;
}

function getDaysOverdue(date: string) {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) return 0;

  const dueDate = new Date(`${normalizedDate}T00:00:00`);
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = todayDate.getTime() - dueDate.getTime();

  return Math.max(Math.floor(diff / 86_400_000), 0);
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
  if (shortcut === "CurrentMonth") return "Mês atual";
  if (shortcut === "CurrentQuarter") return "Trimestre atual";
  if (shortcut === "CurrentYear") return "Ano atual";
  if (shortcut === "All") return "Todo o período";

  if (startDate && endDate) return `${formatDate(startDate)} a ${formatDate(endDate)}`;
  if (startDate) return `A partir de ${formatDate(startDate)}`;
  if (endDate) return `Até ${formatDate(endDate)}`;

  return "Personalizado";
}

function normalizeDate(value: unknown) {
  if (!value) return "";

  const rawValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) return rawValue.slice(0, 10);

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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

function formatMonth(period: string) {
  if (!period) return "-";

  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
