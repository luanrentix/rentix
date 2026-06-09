"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Copy,
  Download,
  FileSpreadsheet,
  Filter,
  LineChart as LineChartIcon,
  Printer,
  RefreshCw,
  Scale,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageItem } from "@/services/company-storage";
import {
  getCachedCompanySettings,
  getCachedUserSettings,
} from "@/services/settings-cache";
import {
  getFinancialSummary,
  type FinancialPayable,
  type FinancialReceivable,
  type FinancialStatus,
  type PeriodShortcut,
} from "@/services/financial-summary.service";

type ThemeMode = "light" | "black" | "graphite";
type ReportKey = "dre" | "trialBalance" | "cashFlow" | "delinquency";
type TransactionSource = "all" | "receivable" | "payable";
type ReportStatusFilter = "all" | "paid" | "open" | "overdue";
type ReportTone = "positive" | "negative" | "neutral" | "warning";

type ReportLine = {
  label: string;
  amount: number;
  tone?: ReportTone;
  detail?: string;
  strong?: boolean;
};

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
};

type RankingRow = {
  label: string;
  detail?: string;
  amount: number;
  count: number;
};

type ReportCsvData = {
  cashFlowRows: CashFlowRow[];
  overdueReceivables: FinancialReceivable[];
  overduePayables: FinancialPayable[];
  dreLines: ReportLine[];
  trialBalanceLines: ReportLine[];
};

type ChartPayload = {
  value?: number | string;
  name?: string;
  color?: string;
  payload?: Record<string, unknown>;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: ChartPayload[];
};

const reportOptions: Array<{
  key: ReportKey;
  title: string;
  description: string;
}> = [
  {
    key: "dre",
    title: "DRE gerencial",
    description: "Receita, deduções, despesas e resultado líquido do período.",
  },
  {
    key: "trialBalance",
    title: "Balancete financeiro",
    description: "Composição do realizado, aberto, projetado e indicadores de controle.",
  },
  {
    key: "cashFlow",
    title: "Fluxo de caixa",
    description: "Entradas, saídas, projeção e saldo acumulado por competência mensal.",
  },
  {
    key: "delinquency",
    title: "Inadimplência",
    description: "Valores vencidos com aging, ranking e leitura de risco financeiro.",
  },
];

const financialReportThemeStyle = `
  .contrx-financial-report-page { color: #0f172a; }
  .contrx-financial-report-page-light,
  .contrx-financial-report-page-light * { color-scheme: light; }
  .contrx-financial-report-page-light .bg-white { background-color: #ffffff !important; }
  .contrx-financial-report-page-light .bg-slate-50 { background-color: #f8fafc !important; }
  .contrx-financial-report-page-light .bg-slate-100 { background-color: #f1f5f9 !important; }
  .contrx-financial-report-page-light .text-slate-950,
  .contrx-financial-report-page-light .text-slate-900,
  .contrx-financial-report-page-light .text-slate-800,
  .contrx-financial-report-page-light .text-slate-700 { color: #0f172a !important; }
  .contrx-financial-report-page-light .text-slate-600 { color: #475569 !important; }
  .contrx-financial-report-page-light .text-slate-500 { color: #64748b !important; }
  .contrx-financial-report-page-light .text-orange-600,
  .contrx-financial-report-page-light .text-orange-700 { color: #ea580c !important; }
  .contrx-financial-report-page-light .text-red-600,
  .contrx-financial-report-page-light .text-red-700 { color: #dc2626 !important; }
  .contrx-financial-report-page-light .text-emerald-600,
  .contrx-financial-report-page-light .text-emerald-700 { color: #059669 !important; }
  .contrx-financial-report-page-light input,
  .contrx-financial-report-page-light select { background-color: #ffffff !important; border-color: #e2e8f0 !important; color: #0f172a !important; }
  .contrx-financial-report-page-black,
  .contrx-financial-report-page-graphite { color: #f8fafc; }
  .contrx-financial-report-page-black .bg-white { background: linear-gradient(145deg, #0f172a 0%, #111827 100%) !important; }
  .contrx-financial-report-page-graphite .bg-white { background: linear-gradient(145deg, #0d1b2e 0%, #07111f 100%) !important; }
  .contrx-financial-report-page-black .bg-slate-50,
  .contrx-financial-report-page-black .bg-slate-100,
  .contrx-financial-report-page-graphite .bg-slate-50,
  .contrx-financial-report-page-graphite .bg-slate-100 { background-color: #0d1b2e !important; }
  .contrx-financial-report-page-black .text-slate-950,
  .contrx-financial-report-page-black .text-slate-900,
  .contrx-financial-report-page-black .text-slate-800,
  .contrx-financial-report-page-black .text-slate-700,
  .contrx-financial-report-page-graphite .text-slate-950,
  .contrx-financial-report-page-graphite .text-slate-900,
  .contrx-financial-report-page-graphite .text-slate-800,
  .contrx-financial-report-page-graphite .text-slate-700 { color: #f8fafc !important; }
  .contrx-financial-report-page-black .text-slate-600,
  .contrx-financial-report-page-black .text-slate-500,
  .contrx-financial-report-page-graphite .text-slate-600,
  .contrx-financial-report-page-graphite .text-slate-500 { color: #b6c6dc !important; }
  .contrx-financial-report-page-black input,
  .contrx-financial-report-page-black select,
  .contrx-financial-report-page-graphite input,
  .contrx-financial-report-page-graphite select { background-color: #07111f !important; border-color: #24405f !important; color: #f8fafc !important; }
  .contrx-financial-report-page-black option,
  .contrx-financial-report-page-graphite option { background-color: #07111f !important; color: #f8fafc !important; }
  @media print {
    @page { size: A4; margin: 12mm; }
    html,
    body { width: 210mm !important; background: #ffffff !important; }
    body * { visibility: hidden !important; }
    .contrx-report-no-print { display: none !important; }
    .contrx-financial-report-page,
    .contrx-financial-report-page * { visibility: visible !important; }
    .contrx-financial-report-page {
      position: absolute !important;
      inset: 0 auto auto 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      color: #0f172a !important;
      background: #ffffff !important;
      font-size: 10px !important;
      line-height: 1.35 !important;
    }
    .contrx-financial-report-page > * + * { margin-top: 8px !important; }
    .contrx-financial-report-page .bg-white,
    .contrx-financial-report-page .bg-slate-50,
    .contrx-financial-report-page .bg-slate-100 { background: #ffffff !important; }
    .contrx-financial-report-page section,
    .contrx-financial-report-page .contrx-print-card {
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      box-shadow: none !important;
      break-inside: avoid;
      padding: 10px !important;
      background: #ffffff !important;
    }
    .contrx-financial-report-page h2 {
      font-size: 18px !important;
      line-height: 1.2 !important;
      margin-top: 3px !important;
    }
    .contrx-financial-report-page h3 {
      font-size: 12px !important;
      line-height: 1.2 !important;
    }
    .contrx-financial-report-page p,
    .contrx-financial-report-page span,
    .contrx-financial-report-page td,
    .contrx-financial-report-page th {
      color: #0f172a !important;
    }
    .contrx-report-header-grid {
      display: grid !important;
      grid-template-columns: 1fr 70mm !important;
      gap: 10px !important;
      align-items: start !important;
    }
    .contrx-report-meta-panel {
      border: 1px solid #e2e8f0 !important;
      border-radius: 6px !important;
      padding: 8px !important;
      background: #f8fafc !important;
      gap: 3px !important;
    }
    .contrx-report-summary-icon,
    .contrx-report-kpi-icon { display: none !important; }
    .contrx-report-kpi-grid {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }
    .contrx-report-kpi-card h3 {
      font-size: 14px !important;
      margin-top: 3px !important;
    }
    .contrx-report-main-grid {
      display: block !important;
    }
    .contrx-report-ranking-grid {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }
    .contrx-financial-report-page table {
      width: 100% !important;
      min-width: 0 !important;
      border-collapse: collapse !important;
      page-break-inside: auto;
      font-size: 9px !important;
    }
    .contrx-financial-report-page thead {
      display: table-header-group !important;
      background: #f1f5f9 !important;
    }
    .contrx-financial-report-page th,
    .contrx-financial-report-page td {
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 5px 6px !important;
      vertical-align: top !important;
    }
    .contrx-financial-report-page tr { page-break-inside: avoid; page-break-after: auto; }
    .contrx-financial-report-page .rounded-2xl,
    .contrx-financial-report-page .rounded-xl,
    .contrx-financial-report-page .rounded-full {
      border-radius: 6px !important;
    }
    .contrx-financial-report-page .text-2xl,
    .contrx-financial-report-page .text-base {
      font-size: inherit !important;
    }
    .contrx-financial-report-page .shadow-sm,
    .contrx-financial-report-page .shadow-md,
    .contrx-financial-report-page .shadow-lg {
      box-shadow: none !important;
    }
    .contrx-financial-report-page::after {
      content: "Contrx - relatório financeiro gerado automaticamente";
      position: fixed;
      right: 0;
      bottom: -7mm;
      left: 0;
      border-top: 1px solid #e2e8f0;
      padding-top: 2mm;
      color: #64748b;
      font-size: 8px;
      text-align: center;
    }
  }
`;

export default function FinancialReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [receivables, setReceivables] = useState<FinancialReceivable[]>([]);
  const [payables, setPayables] = useState<FinancialPayable[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportKey>("dre");
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

  const loadReports = useCallback(async (currentCompanyId: string) => {
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
          : "Não foi possível carregar os relatórios financeiros.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [endDate, startDate]);

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

  const companyProfile = useMemo(() => {
    const cachedCompanySettings = getCachedCompanySettings();
    const cachedUserSettings = getCachedUserSettings();

    return {
      companyName: String(
        cachedCompanySettings?.companyName ||
          cachedCompanySettings?.tradeName ||
          cachedCompanySettings?.name ||
          "Contrx",
      ),
      document: String(
        cachedCompanySettings?.document ||
          cachedCompanySettings?.cnpj ||
          cachedCompanySettings?.cpfCnpj ||
          "-",
      ),
      issuedBy: String(cachedUserSettings?.name || user?.name || "-"),
    };
  }, [user?.name]);

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
            if (!matchesSearch(normalizedSearchTerm, [
              item.tenantName,
              item.propertyName,
              item.dueDate,
            ])) return false;

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
            if (!matchesSearch(normalizedSearchTerm, [
              item.personName,
              item.description,
              item.category,
              item.dueDate,
            ])) return false;

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

    const grossRevenue = sumAmounts(receivedReceivables, "amount");
    const revenueDiscounts = sumOptionalAmounts(
      receivedReceivables,
      "discountAmount",
    );
    const revenueInterest = sumOptionalAmounts(
      receivedReceivables,
      "interestAmount",
    );
    const totalReceived = sumAmounts(receivedReceivables, "paidAmount");
    const grossExpenses = sumAmounts(paidPayables, "amount");
    const expenseDiscounts = sumOptionalAmounts(paidPayables, "discountAmount");
    const expenseInterest = sumOptionalAmounts(paidPayables, "interestAmount");
    const totalPaid = sumAmounts(paidPayables, "paidAmount");
    const totalReceivableOpen = sumAmounts(openReceivables, "remainingAmount");
    const totalPayableOpen = sumAmounts(openPayables, "remainingAmount");
    const overdueReceivableTotal = sumAmounts(
      overdueReceivables,
      "remainingAmount",
    );
    const overduePayableTotal = sumAmounts(overduePayables, "remainingAmount");
    const operationalResult = totalReceived - totalPaid;
    const projectedResult =
      totalReceived + totalReceivableOpen - totalPaid - totalPayableOpen;
    const expectedReceivable = totalReceived + totalReceivableOpen;
    const expectedPayable = totalPaid + totalPayableOpen;
    const collectionRate = getPercentage(totalReceived, expectedReceivable);
    const paymentCompletionRate = getPercentage(totalPaid, expectedPayable);
    const delinquencyRate = getPercentage(
      overdueReceivableTotal,
      expectedReceivable,
    );
    const operationalMargin = getPercentage(operationalResult, totalReceived);
    const averageReceipt = getAverage(totalReceived, receivedReceivables.length);
    const highestDebtor = getTopRankingRow(
      overdueReceivables.map((item) => ({
        label: item.tenantName || "Pessoa não informada",
        detail: item.propertyName || "Sem bem/ativo vinculado",
        amount: item.remainingAmount,
      })),
    );
    const highestExpenseCategory = getTopRankingRow(
      filteredData.payables.map((item) => ({
        label: item.category || "Outros",
        detail: "Categoria de despesa",
        amount:
          item.status === "Paid"
            ? Number(item.paidAmount || 0)
            : Number(item.remainingAmount || 0),
      })),
    );
    const cashFlowRows = buildCashFlowRows(
      filteredData.receivables,
      filteredData.payables,
    );
    const agingBuckets = buildAgingBuckets([
      ...overdueReceivables.map((item) => ({
        dueDate: item.dueDate,
        amount: item.remainingAmount,
      })),
      ...overduePayables.map((item) => ({
        dueDate: item.dueDate,
        amount: item.remainingAmount,
      })),
    ]);
    const debtorRanking = buildRankingRows(
      overdueReceivables.map((item) => ({
        label: item.tenantName || "Pessoa não informada",
        detail: item.propertyName || "Sem bem/ativo vinculado",
        amount: item.remainingAmount,
      })),
    ).slice(0, 6);
    const expenseCategoryRanking = buildRankingRows(
      filteredData.payables.map((item) => ({
        label: item.category || "Outros",
        detail: item.status === "Paid" ? "Pago" : "Em aberto",
        amount:
          item.status === "Paid"
            ? Number(item.paidAmount || 0)
            : Number(item.remainingAmount || 0),
      })),
    ).slice(0, 6);

    return {
      grossRevenue,
      revenueDiscounts,
      revenueInterest,
      totalReceived,
      grossExpenses,
      expenseDiscounts,
      expenseInterest,
      totalPaid,
      totalReceivableOpen,
      totalPayableOpen,
      operationalResult,
      projectedResult,
      expectedReceivable,
      expectedPayable,
      collectionRate,
      paymentCompletionRate,
      delinquencyRate,
      operationalMargin,
      averageReceipt,
      highestDebtor,
      highestExpenseCategory,
      overdueReceivables,
      overduePayables,
      overdueReceivableTotal,
      overduePayableTotal,
      overdueTotal: overdueReceivableTotal + overduePayableTotal,
      cashFlowRows,
      agingBuckets,
      debtorRanking,
      expenseCategoryRanking,
      dreLines: [
        {
          label: "Entradas de caixa recebidas",
          amount: grossRevenue,
          tone: "positive",
          detail: `${receivedReceivables.length} recebimento(s) baixado(s)`,
        },
        {
          label: "Deduções e descontos concedidos",
          amount: revenueDiscounts,
          tone: "negative",
          detail: "Valores abatidos nas baixas de contas a receber",
        },
        {
          label: "Juros e acréscimos recebidos",
          amount: revenueInterest,
          tone: "positive",
          detail: "Acréscimos financeiros registrados nas baixas",
        },
        {
          label: "Receita liquida movimentada em caixa",
          amount: totalReceived,
          tone: "positive",
          strong: true,
        },
        {
          label: "Saidas de caixa pagas",
          amount: totalPaid,
          tone: "negative",
          detail: `${paidPayables.length} pagamento(s) baixado(s)`,
        },
        {
          label: "Descontos obtidos em despesas",
          amount: expenseDiscounts,
          tone: "positive",
        },
        {
          label: "Juros e acréscimos pagos",
          amount: expenseInterest,
          tone: "negative",
        },
        {
          label: "Resultado operacional de caixa",
          amount: operationalResult,
          tone: operationalResult >= 0 ? "positive" : "negative",
          detail: `Margem operacional de ${formatPercentage(operationalMargin)}`,
          strong: true,
        },
        {
          label: "Resultado líquido projetado",
          amount: projectedResult,
          tone: projectedResult >= 0 ? "positive" : "negative",
          detail: "Inclui contas em aberto no período filtrado",
          strong: true,
        },
      ] satisfies ReportLine[],
      trialBalanceLines: [
        {
          label: "Entradas de caixa",
          amount: totalReceived,
          tone: "positive",
        },
        {
          label: "Saidas de caixa",
          amount: totalPaid,
          tone: "negative",
        },
        {
          label: "Saldo financeiro de caixa",
          amount: operationalResult,
          tone: operationalResult >= 0 ? "positive" : "negative",
          strong: true,
        },
        {
          label: "A receber em aberto",
          amount: totalReceivableOpen,
          tone: "positive",
          detail: `${openReceivables.length} lançamento(s) aguardando baixa`,
        },
        {
          label: "A pagar em aberto",
          amount: totalPayableOpen,
          tone: "negative",
          detail: `${openPayables.length} lançamento(s) aguardando pagamento`,
        },
        {
          label: "Saldo projetado",
          amount: projectedResult,
          tone: projectedResult >= 0 ? "positive" : "negative",
          strong: true,
        },
      ] satisfies ReportLine[],
      chartRows: [
        {
          name: "Recebido em caixa",
          value: totalReceived,
        },
        {
          name: "A receber",
          value: totalReceivableOpen,
        },
        {
          name: "Pago em caixa",
          value: totalPaid,
        },
        {
          name: "A pagar",
          value: totalPayableOpen,
        },
      ],
    };
  }, [filteredData.payables, filteredData.receivables]);

  const periodLabel = getPeriodLabel(periodShortcut, startDate, endDate);
  const selectedReportOption = reportOptions.find(
    (item) => item.key === selectedReport,
  );
  const issuedAt = lastUpdatedAt || new Date().toISOString();
  const launchCount =
    filteredData.receivables.length + filteredData.payables.length;

  const executiveSummary = useMemo(() => {
    const resultStatus =
      reportData.projectedResult >= 0
        ? "projeção positiva"
        : "projeção negativa";
    const delinquencyStatus =
      reportData.delinquencyRate >= 20
        ? "risco alto"
        : reportData.delinquencyRate >= 8
          ? "risco moderado"
          : "risco controlado";
    const debtorInfo = reportData.highestDebtor
      ? `Maior devedor: ${reportData.highestDebtor.label} (${formatCurrency(
          reportData.highestDebtor.amount,
        )}).`
      : "Não há devedor vencido no filtro atual.";

    return [
      `O período apresenta ${resultStatus}, com saldo projetado de ${formatCurrency(
        reportData.projectedResult,
      )}.`,
      `A taxa de recebimento é ${formatPercentage(
        reportData.collectionRate,
      )}, enquanto a inadimplência está em ${formatPercentage(
        reportData.delinquencyRate,
      )} (${delinquencyStatus}).`,
      debtorInfo,
    ];
  }, [reportData]);

  function exportCsv() {
    const rows = buildCsvRows(reportData, selectedReport, periodLabel);
    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `relatorio-financeiro-${selectedReport}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyExecutiveSummary() {
    const summaryText = [
      `${selectedReportOption?.title || "Relatório financeiro"} - ${periodLabel}`,
      ...executiveSummary,
      `Resultado de caixa: ${formatCurrency(reportData.operationalResult)}`,
      `Saldo projetado: ${formatCurrency(reportData.projectedResult)}`,
      `Inadimplência: ${formatCurrency(reportData.overdueTotal)}`,
    ].join("\n");

    await navigator.clipboard.writeText(summaryText);
    setCopyFeedback("Resumo copiado.");
    window.setTimeout(() => setCopyFeedback(""), 2200);
  }

  return (
    <>
      <style>{financialReportThemeStyle}</style>
      <div
        data-contrx-theme={financialTheme}
        className={`contrx-financial-report-page space-y-6 ${
          financialTheme === "black"
            ? "contrx-financial-report-page-black"
            : financialTheme === "graphite"
              ? "contrx-financial-report-page-graphite"
              : "contrx-financial-report-page-light"
        }`}
      >
        <div className="contrx-report-no-print flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/financeiro")}
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Relatórios financeiros
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold text-slate-500 dark:text-slate-400">
              Análise gerencial com DRE, balancete, fluxo de caixa, inadimplência, indicadores e exportação.
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
              onClick={() => companyId && loadReports(companyId)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              type="button"
              onClick={copyExecutiveSummary}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-black text-orange-700 ring-1 ring-orange-100 transition hover:bg-orange-100"
            >
              <Copy className="h-4 w-4" />
              {copyFeedback || "Copiar resumo"}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Imprimir PDF
            </button>
          </div>
        </div>

        <section className="contrx-print-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
          <div className="contrx-report-header-grid grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                Relatório emitido
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {selectedReportOption?.title || "Relatório financeiro"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Base analisada: {launchCount} lançamento(s) financeiro(s) no período {periodLabel.toLowerCase()}.
              </p>
            </div>
            <div className="contrx-report-meta-panel grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
              <ReportMeta label="Empresa" value={companyProfile.companyName} />
              <ReportMeta label="Documento" value={companyProfile.document} />
              <ReportMeta label="Emitido por" value={companyProfile.issuedBy} />
              <ReportMeta
                label="Data de emissão"
                value={new Date(issuedAt).toLocaleString("pt-BR")}
              />
            </div>
          </div>
        </section>

        <section className="contrx-report-no-print rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-100">
            <Filter className="h-4 w-4 text-orange-600" />
            Filtros do relatório
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              label="Início"
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
                setPeriodShortcut("Custom");
              }}
            />
            <DateField
              label="Fim"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                setPeriodShortcut("Custom");
              }}
            />
            <SelectField
              label="Origem"
              value={transactionSource}
              onChange={(value) => setTransactionSource(value as TransactionSource)}
              options={[
                { label: "Todas", value: "all" },
                { label: "Contas a receber", value: "receivable" },
                { label: "Contas a pagar", value: "payable" },
              ]}
            />
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as ReportStatusFilter)}
              options={[
                { label: "Todos", value: "all" },
                { label: "Baixados", value: "paid" },
                { label: "Em aberto", value: "open" },
                { label: "Vencidos", value: "overdue" },
              ]}
            />
            <SelectField
              label="Categoria"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { label: "Todas", value: "all" },
                ...filterOptions.categoryOptions.map((category) => ({
                  label: category,
                  value: category,
                })),
              ]}
            />
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                Buscar pessoa, bem/ativo, descrição ou categoria
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Digite para filtrar"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
        </section>

        <div className="contrx-report-no-print grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {reportOptions.map((report) => (
            <button
              key={report.key}
              type="button"
              onClick={() => setSelectedReport(report.key)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                selectedReport === report.key
                  ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100"
                  : "border-orange-100 bg-white dark:border-orange-500/30 dark:bg-slate-900"
              }`}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                {getReportIcon(report.key)}
              </div>
              <p className="text-base font-black text-slate-950 dark:text-white">
                {report.title}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                {report.description}
              </p>
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="contrx-print-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="contrx-report-summary-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                Resumo executivo
              </p>
              <div className="mt-2 space-y-2">
                {executiveSummary.map((summary) => (
                  <p
                    key={summary}
                    className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300"
                  >
                    {summary}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="contrx-report-kpi-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Saldo projetado"
            value={formatCurrency(reportData.projectedResult)}
            detail="Realizado + aberto no período"
            tone={reportData.projectedResult >= 0 ? "positive" : "negative"}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            title="Taxa de recebimento"
            value={formatPercentage(reportData.collectionRate)}
            detail={`${formatCurrency(reportData.totalReceived)} recebido`}
            tone={reportData.collectionRate >= 75 ? "positive" : "warning"}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <KpiCard
            title="Inadimplência"
            value={formatPercentage(reportData.delinquencyRate)}
            detail={formatCurrency(reportData.overdueReceivableTotal)}
            tone={reportData.delinquencyRate > 0 ? "negative" : "positive"}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            title="Ticket médio"
            value={formatCurrency(reportData.averageReceipt)}
            detail="Média dos recebimentos baixados"
            tone="neutral"
            icon={<FileSpreadsheet className="h-5 w-5" />}
          />
        </div>

        <div className="contrx-report-main-grid grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="contrx-print-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-700 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                  {periodLabel}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {selectedReportOption?.title || "Relatório"}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {selectedReportOption?.description}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {isLoading ? "Carregando..." : `${launchCount} lançamento(s)`}
              </div>
            </div>

            {selectedReport === "dre" && (
              <ReportLineTable lines={reportData.dreLines} />
            )}

            {selectedReport === "trialBalance" && (
              <ReportLineTable lines={reportData.trialBalanceLines} />
            )}

            {selectedReport === "cashFlow" && (
              <CashFlowTable rows={reportData.cashFlowRows} />
            )}

            {selectedReport === "delinquency" && (
              <DelinquencyTable
                receivables={reportData.overdueReceivables}
                payables={reportData.overduePayables}
                total={reportData.overdueTotal}
              />
            )}
          </section>

          <aside className="space-y-5">
            <ProfessionalChart
              title="Composição financeira"
              description="Comparativo entre realizado e aberto."
              height={260}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.chartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(value) => compactCurrency(Number(value))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ProfessionalChart>

            <ProfessionalChart
              title="Saldo acumulado"
              description="Evolução mensal do caixa realizado."
              height={260}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.cashFlowRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickFormatter={formatShortMonth}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => compactCurrency(Number(value))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accumulatedBalance"
                    name="Saldo acumulado"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ProfessionalChart>
          </aside>
        </div>

        <div className="contrx-report-ranking-grid grid gap-5 xl:grid-cols-3">
          <RankingPanel
            title="Maiores devedores"
            rows={reportData.debtorRanking}
            emptyMessage="Nenhuma conta vencida a receber."
          />
          <RankingPanel
            title="Despesas por categoria"
            rows={reportData.expenseCategoryRanking}
            emptyMessage="Nenhuma despesa no filtro atual."
          />
          <AgingPanel buckets={reportData.agingBuckets} />
        </div>
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
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

function ReportMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[105px_1fr] gap-3">
      <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-sm font-black text-slate-900 dark:text-white">
        {value || "-"}
      </span>
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone: ReportTone;
  icon: React.ReactNode;
}) {
  const toneClass = {
    positive: "bg-emerald-50 text-emerald-700",
    negative: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="contrx-report-kpi-card contrx-print-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <div className={`contrx-report-kpi-icon mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
        {value}
      </h3>
      <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function ReportLineTable({ lines }: { lines: ReportLine[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700">
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {lines.map((line) => (
          <div
            key={line.label}
            className={`grid gap-3 px-4 py-4 md:grid-cols-[1fr_190px] ${
              line.strong ? "bg-slate-50 dark:bg-slate-950" : ""
            }`}
          >
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {line.label}
              </p>
              {line.detail && (
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {line.detail}
                </p>
              )}
            </div>
            <p
              className={`text-left text-base font-black md:text-right ${getToneTextClass(
                line.tone,
              )}`}
            >
              {formatCurrency(line.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashFlowTable({ rows }: { rows: CashFlowRow[] }) {
  if (rows.length === 0) {
    return <EmptyReport message="Nenhum lançamento encontrado para o período." />;
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-black">Período</th>
            <th className="px-4 py-3 text-right font-black">Recebido em caixa</th>
            <th className="px-4 py-3 text-right font-black">Pago em caixa</th>
            <th className="px-4 py-3 text-right font-black">Saldo do mês</th>
            <th className="px-4 py-3 text-right font-black">A receber</th>
            <th className="px-4 py-3 text-right font-black">A pagar</th>
            <th className="px-4 py-3 text-right font-black">Projetado</th>
            <th className="px-4 py-3 text-right font-black">Acumulado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((row) => (
            <tr key={row.period}>
              <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                {formatMonth(row.period)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                {formatCurrency(row.received)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-600">
                {formatCurrency(row.paid)}
              </td>
              <td
                className={`px-4 py-3 text-right font-black ${
                  row.monthlyBalance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(row.monthlyBalance)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                {formatCurrency(row.receivableOpen)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                {formatCurrency(row.payableOpen)}
              </td>
              <td
                className={`px-4 py-3 text-right font-black ${
                  row.projectedBalance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(row.projectedBalance)}
              </td>
              <td
                className={`px-4 py-3 text-right font-black ${
                  row.accumulatedBalance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(row.accumulatedBalance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DelinquencyTable({
  receivables,
  payables,
  total,
}: {
  receivables: FinancialReceivable[];
  payables: FinancialPayable[];
  total: number;
}) {
  const rows = [
    ...receivables.map((item) => ({
      id: item.id,
      type: "A receber",
      title: item.tenantName,
      subtitle: item.propertyName,
      dueDate: item.dueDate,
      amount: item.remainingAmount,
      status: item.status,
      daysOverdue: getDaysOverdue(item.dueDate),
    })),
    ...payables.map((item) => ({
      id: item.id,
      type: "A pagar",
      title: item.description,
      subtitle: item.personName || item.category,
      dueDate: item.dueDate,
      amount: item.remainingAmount,
      status: item.status,
      daysOverdue: getDaysOverdue(item.dueDate),
    })),
  ].sort((first, second) => second.daysOverdue - first.daysOverdue);

  if (rows.length === 0) {
    return <EmptyReport message="Nenhuma inadimplência encontrada no período." />;
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
        Total em atraso: {formatCurrency(total)}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-black">Tipo</th>
              <th className="px-4 py-3 font-black">Descrição</th>
              <th className="px-4 py-3 font-black">Vencimento</th>
              <th className="px-4 py-3 text-right font-black">Dias</th>
              <th className="px-4 py-3 text-right font-black">Saldo</th>
              <th className="px-4 py-3 font-black">Risco</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row) => (
              <tr key={`${row.type}-${row.id}`}>
                <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                  {row.type}
                </td>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-900 dark:text-white">
                    {row.title || "Sem descrição"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {row.subtitle || "Sem vínculo"}
                  </p>
                </td>
                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                  {formatDate(row.dueDate)}
                </td>
                <td className="px-4 py-3 text-right font-black text-red-600">
                  {row.daysOverdue}
                </td>
                <td className="px-4 py-3 text-right font-black text-red-600">
                  {formatCurrency(row.amount)}
                </td>
                <td className="px-4 py-3">
                  <RiskBadge daysOverdue={row.daysOverdue} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfessionalChart({
  title,
  description,
  height,
  children,
}: {
  title: string;
  description: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <section className="contrx-report-no-print rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <h3 className="text-base font-black text-slate-950 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <div className="mt-4" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-black text-slate-900">{label}</p>
      {payload.map((item) => (
        <p key={`${item.name}-${item.value}`} className="font-bold text-slate-600">
          {item.name || "Valor"}: {formatCurrency(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
}

function RankingPanel({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: RankingRow[];
  emptyMessage: string;
}) {
  return (
    <section className="contrx-print-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <h3 className="text-base font-black text-slate-950 dark:text-white">
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.label}-${row.amount}`}
              className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {row.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {row.count} lançamento(s) {row.detail ? `- ${row.detail}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black text-orange-600">
                  {formatCurrency(row.amount)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AgingPanel({ buckets }: { buckets: AgingBucket[] }) {
  return (
    <section className="contrx-print-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <h3 className="text-base font-black text-slate-950 dark:text-white">
        Aging de atraso
      </h3>
      <div className="mt-4 space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black">
              <span className="text-slate-600 dark:text-slate-300">
                {bucket.label}
              </span>
              <span className="text-red-600">
                {formatCurrency(bucket.amount)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${Math.min(bucket.count * 18, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {bucket.count} lançamento(s)
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyReport({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {message}
    </div>
  );
}

function RiskBadge({ daysOverdue }: { daysOverdue: number }) {
  const risk =
    daysOverdue > 60
      ? { label: "Alto", className: "bg-red-100 text-red-700" }
      : daysOverdue > 30
        ? { label: "Médio", className: "bg-amber-100 text-amber-700" }
        : { label: "Baixo", className: "bg-orange-100 text-orange-700" };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${risk.className}`}>
      {risk.label}
    </span>
  );
}

function getReportIcon(report: ReportKey) {
  if (report === "dre") return <BarChart3 className="h-5 w-5" />;
  if (report === "trialBalance") return <Scale className="h-5 w-5" />;
  if (report === "cashFlow") return <LineChartIcon className="h-5 w-5" />;

  return <AlertTriangle className="h-5 w-5" />;
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

function buildAgingBuckets(items: Array<{ dueDate: string; amount: number }>) {
  const buckets: AgingBucket[] = [
    { label: "1 a 15 dias", amount: 0, count: 0 },
    { label: "16 a 30 dias", amount: 0, count: 0 },
    { label: "31 a 60 dias", amount: 0, count: 0 },
    { label: "Acima de 60 dias", amount: 0, count: 0 },
  ];

  items.forEach((item) => {
    const daysOverdue = getDaysOverdue(item.dueDate);
    const index =
      daysOverdue <= 15 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : 3;

    buckets[index].amount += Number(item.amount || 0);
    buckets[index].count += 1;
  });

  return buckets;
}

function buildRankingRows(
  items: Array<{ label: string; detail?: string; amount: number }>,
) {
  const rows = new Map<string, RankingRow>();

  items.forEach((item) => {
    const currentRow = rows.get(item.label);

    if (currentRow) {
      currentRow.amount += Number(item.amount || 0);
      currentRow.count += 1;
      return;
    }

    rows.set(item.label, {
      label: item.label,
      detail: item.detail,
      amount: Number(item.amount || 0),
      count: 1,
    });
  });

  return Array.from(rows.values()).sort(
    (first, second) => second.amount - first.amount,
  );
}

function getTopRankingRow(
  items: Array<{ label: string; detail?: string; amount: number }>,
) {
  return buildRankingRows(items)[0] || null;
}

function buildCsvRows(
  reportData: ReportCsvData,
  selectedReport: ReportKey,
  periodLabel: string,
) {
  const header = [["Relatório", selectedReport, "Período", periodLabel]];

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
      ...reportData.cashFlowRows.map((row) => [
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
      ["Tipo", "Descrição", "Vencimento", "Dias em atraso", "Saldo"],
      ...[
        ...reportData.overdueReceivables.map((item) => [
          "A receber",
          `${item.tenantName} - ${item.propertyName}`,
          formatDate(item.dueDate),
          getDaysOverdue(item.dueDate),
          item.remainingAmount,
        ]),
        ...reportData.overduePayables.map((item) => [
          "A pagar",
          `${item.description} - ${item.personName || item.category}`,
          formatDate(item.dueDate),
          getDaysOverdue(item.dueDate),
          item.remainingAmount,
        ]),
      ],
    ];
  }

  const lines =
    selectedReport === "dre"
      ? reportData.dreLines
      : reportData.trialBalanceLines;

  return [
    ...header,
    ["Descrição", "Valor", "Detalhe"],
    ...lines.map((line) => [line.label, line.amount, line.detail || ""]),
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

function getAverage(total: number, count: number) {
  if (count <= 0) return 0;

  return total / count;
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

function compactCurrency(value: number) {
  return Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercentage(value?: number) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;
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

function formatShortMonth(period: string) {
  if (!period) return "-";

  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "short",
  });
}

function getToneTextClass(tone?: ReportTone) {
  if (tone === "positive") return "text-emerald-600";
  if (tone === "negative") return "text-red-600";
  if (tone === "warning") return "text-amber-600";

  return "text-slate-900 dark:text-white";
}
