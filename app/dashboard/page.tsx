"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ChartLine,
  CircleCheck,
  DollarSign,
  FileText,
  Home,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getContracts,
  type Contract as ApiContract,
} from "@/services/contracts.service";
import {
  getFinancialSummary,
  type FinancialPayable,
  type FinancialReceivable,
} from "@/services/financial-summary.service";
import {
  getProperties,
  type Property as ApiProperty,
} from "@/services/properties.service";
import { getCompanyStorageItem } from "@/services/company-storage";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PropertyStatus = "Available" | "Rented";

type Property = {
  id: string;
  name: string;
  address: string;
  rentValue: number;
  status: PropertyStatus;
};

type ContractStatus =
  | "Active"
  | "Finished"
  | "Inactive"
  | "Canceled"
  | "Deleted";

type Contract = {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  value?: number;
  rentValue?: number;
  status: ContractStatus;
};

type DashboardAlert = {
  id: string;
  title: string;
  description: string;
  level: "critical" | "warning" | "info" | "success";
};

type RevenueMonth = {
  month: string;
  expected: number;
  activeContracts: number;
};

type ContractEvolutionItem = {
  month: string;
  createdContracts: number;
  activeContracts: number;
};

type FinancialMovement = {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string;
  amount: number;
  status: "overdue" | "today" | "upcoming";
};

type ThemeMode = "light" | "black" | "graphite";
type DashboardFinancialPeriod = "CurrentMonth" | "CurrentYear" | "All";

const chartColors = {
  orange: "#f97316",
  orangeSoft: "#fed7aa",
  slate: "#94a3b8",
  slateSoft: "#e2e8f0",
  green: "#16a34a",
  red: "#dc2626",
};

const contrxDashboardThemeStyle = `
  .contrx-dashboard-page[data-contrx-theme="black"] {
    color: #f8fafc;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .bg-white,
  .contrx-dashboard-page[data-contrx-theme="black"] .bg-slate-50,
  .contrx-dashboard-page[data-contrx-theme="black"] .bg-slate-100 {
    background-color: #0f172a !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] section.bg-white,
  .contrx-dashboard-page[data-contrx-theme="black"] div.bg-white {
    background: linear-gradient(145deg, #0f172a 0%, #111827 100%) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .bg-orange-50,
  .contrx-dashboard-page[data-contrx-theme="black"] .bg-orange-100 {
    background-color: rgba(249, 115, 22, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .bg-red-50 {
    background-color: rgba(220, 38, 38, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .bg-emerald-50 {
    background-color: rgba(16, 185, 129, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .bg-sky-50 {
    background-color: rgba(14, 165, 233, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-950,
  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-900,
  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-800,
  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-700,
  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-600 {
    color: #f8fafc !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-500,
  .contrx-dashboard-page[data-contrx-theme="black"] .text-slate-400 {
    color: #cbd5e1 !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .border-orange-100,
  .contrx-dashboard-page[data-contrx-theme="black"] .border-slate-100,
  .contrx-dashboard-page[data-contrx-theme="black"] .border-slate-200,
  .contrx-dashboard-page[data-contrx-theme="black"] .border-slate-300,
  .contrx-dashboard-page[data-contrx-theme="black"] .border-red-100,
  .contrx-dashboard-page[data-contrx-theme="black"] .border-emerald-100,
  .contrx-dashboard-page[data-contrx-theme="black"] .border-sky-100 {
    border-color: #1e293b !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .shadow-sm,
  .contrx-dashboard-page[data-contrx-theme="black"] .shadow-md,
  .contrx-dashboard-page[data-contrx-theme="black"] .shadow-lg,
  .contrx-dashboard-page[data-contrx-theme="black"] .shadow-xl,
  .contrx-dashboard-page[data-contrx-theme="black"] .shadow-2xl {
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .recharts-cartesian-grid line {
    stroke: #334155 !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .recharts-text,
  .contrx-dashboard-page[data-contrx-theme="black"] .recharts-cartesian-axis-tick-value {
    fill: #cbd5e1 !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .recharts-tooltip-wrapper .recharts-default-tooltip {
    background-color: #020617 !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
    border-radius: 14px !important;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .recharts-tooltip-wrapper .recharts-tooltip-label,
  .contrx-dashboard-page[data-contrx-theme="black"] .recharts-tooltip-wrapper .recharts-tooltip-item {
    color: #f8fafc !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .hover\\:bg-orange-50:hover {
    background-color: rgba(249, 115, 22, 0.16) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="black"] .hover\\:bg-slate-200:hover {
    background-color: #1e293b !important;
  }
`;

export default function DashboardPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [dashboardTheme, setDashboardTheme] = useState<ThemeMode>("light");
  const [receivables, setReceivables] = useState<FinancialReceivable[]>([]);
  const [payables, setPayables] = useState<FinancialPayable[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [financialSummaryError, setFinancialSummaryError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [financialPeriod, setFinancialPeriod] =
    useState<DashboardFinancialPeriod>("CurrentMonth");
  const [revenueChartView, setRevenueChartView] = useState<"month" | "day">(
    "month",
  );
  const [contractChartView, setContractChartView] = useState<"month" | "day">(
    "month",
  );

  const loadDashboardData = useCallback(async (currentCompanyId: string) => {
    setIsDashboardLoading(true);
    setDashboardError("");
    setFinancialSummaryError("");

    try {
      const [apiProperties, apiContracts] = await Promise.all([
        getProperties(currentCompanyId),
        getContracts(currentCompanyId),
      ]);
      const financialSummary = await getFinancialSummary(
        currentCompanyId,
        getFinancialSummaryFilters(financialPeriod),
      ).catch((error) => {
        setFinancialSummaryError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o resumo financeiro.",
        );

        return {
          receivables: [],
          payables: [],
        };
      });

      const normalizedContracts = apiContracts.map(mapApiContractToDashboardContract);
      const activePropertyIds = new Set(
        normalizedContracts
          .filter((contract) => contract.status === "Active")
          .map((contract) => contract.propertyId),
      );

      setContracts(normalizedContracts);
      setProperties(
        apiProperties.map((property) =>
          mapApiPropertyToDashboardProperty(property, activePropertyIds),
        ),
      );
      setReceivables(
        financialSummary.receivables.map((receivable) => ({
          ...receivable,
          tenant: receivable.tenantName,
          property: receivable.propertyName,
        })),
      );
      setPayables(
        financialSummary.payables.map((payable) => ({
          ...payable,
          supplier: payable.personName,
          value: payable.amount,
        })),
      );
      setLastUpdatedAt(new Date());
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados da Dashboard.",
      );
    } finally {
      setIsDashboardLoading(false);
    }
  }, [financialPeriod]);

  useEffect(() => {
    if (!companyId) return;

    loadDashboardData(companyId);
  }, [companyId, loadDashboardData]);

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
          ? (JSON.parse(storedThemeSettings) as { mode?: ThemeMode | "dark" })
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

        setDashboardTheme(nextTheme);
      } catch {
        setDashboardTheme(
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

  function refreshDashboardData() {
    if (!companyId || isDashboardLoading) return;

    loadDashboardData(companyId);
  }

  const activeContractsList = useMemo(
    () => contracts.filter((contract) => contract.status === "Active"),
    [contracts],
  );

  const totalProperties = properties.length;
  const rentedProperties = properties.filter(
    (property) => property.status === "Rented",
  ).length;
  const availableProperties = properties.filter(
    (property) => property.status === "Available",
  ).length;

  const activeContracts = activeContractsList.length;
  const finishedContracts = contracts.filter(
    (contract) => contract.status === "Finished",
  ).length;
  const monthlyRevenue = activeContractsList.reduce(
    (total, contract) => total + getContractValue(contract),
    0,
  );

  const totalPotentialRevenue = properties.reduce(
    (total, property) => total + Number(property.rentValue || 0),
    0,
  );

  const availablePotentialRevenue = properties
    .filter((property) => property.status === "Available")
    .reduce((total, property) => total + Number(property.rentValue || 0), 0);

  const occupancyRate =
    totalProperties > 0
      ? Math.round((rentedProperties / totalProperties) * 100)
      : 0;

  const vacancyRate = totalProperties > 0 ? 100 - occupancyRate : 0;

  const revenueEfficiency =
    totalPotentialRevenue > 0
      ? Math.round((monthlyRevenue / totalPotentialRevenue) * 100)
      : 0;

  const averageTicket =
    activeContracts > 0 ? Math.round(monthlyRevenue / activeContracts) : 0;

  const annualRevenueProjection = monthlyRevenue * 12;
  const openReceivableTotal = receivables
    .filter((receivable) => receivable.status !== "Paid")
    .reduce(
      (total, receivable) =>
        total + normalizeAmount(receivable.remainingAmount ?? receivable.amount),
      0,
    );
  const receivedTotal = receivables
    .filter((receivable) => receivable.status === "Paid")
    .reduce(
      (total, receivable) =>
        total + normalizeAmount(receivable.paidAmount ?? receivable.amount),
      0,
    );
  const openPayableTotal = payables
    .filter((payable) => payable.status !== "Paid")
    .reduce(
      (total, payable) =>
        total + normalizeAmount(payable.remainingAmount ?? payable.amount),
      0,
    );
  const overdueReceivableTotal = receivables
    .filter((receivable) => receivable.status === "Overdue")
    .reduce(
      (total, receivable) =>
        total + normalizeAmount(receivable.remainingAmount ?? receivable.amount),
      0,
    );

  const revenueChartData = useMemo<RevenueMonth[]>(() => {
    return getLastSixMonths().map((monthDate) => {
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const validContracts = contracts.filter((contract) => {
        if (["Canceled", "Deleted", "Inactive"].includes(contract.status)) {
          return false;
        }

        const startDate = parseDate(contract.startDate);

        if (!startDate) {
          return contract.status === "Active";
        }

        return startDate <= monthEnd;
      });

      return {
        month: monthDate
          .toLocaleDateString("pt-BR", { month: "short" })
          .replace(".", ""),
        expected: validContracts.reduce(
          (total, contract) => total + getContractValue(contract),
          0,
        ),
        activeContracts: validContracts.length,
      };
    });
  }, [contracts]);

  const dailyRevenueChartData = useMemo<RevenueMonth[]>(() => {
    return getLastThirtyDays().map((dayDate) => {
      const dayEnd = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        23,
        59,
        59,
      );

      const validContracts = contracts.filter((contract) => {
        if (["Canceled", "Deleted", "Inactive"].includes(contract.status)) {
          return false;
        }

        const startDate = parseDate(contract.startDate);

        if (!startDate) {
          return contract.status === "Active";
        }

        return startDate <= dayEnd;
      });

      return {
        month: dayDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        expected: validContracts.reduce(
          (total, contract) => total + getContractValue(contract),
          0,
        ),
        activeContracts: validContracts.length,
      };
    });
  }, [contracts]);

  const monthlyContractEvolutionData = useMemo<ContractEvolutionItem[]>(() => {
    return getLastSixMonths().map((monthDate) => {
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const createdContracts = contracts.filter((contract) => {
        const startDate = parseDate(contract.startDate);
        return startDate && startDate >= monthStart && startDate <= monthEnd;
      });

      const activeContractsInPeriod = contracts.filter((contract) => {
        if (["Canceled", "Deleted", "Inactive"].includes(contract.status)) {
          return false;
        }

        const startDate = parseDate(contract.startDate);

        if (!startDate) {
          return contract.status === "Active";
        }

        return startDate <= monthEnd;
      });

      return {
        month: monthDate
          .toLocaleDateString("pt-BR", { month: "short" })
          .replace(".", ""),
        createdContracts: createdContracts.length,
        activeContracts: activeContractsInPeriod.length,
      };
    });
  }, [contracts]);

  const dailyContractEvolutionData = useMemo<ContractEvolutionItem[]>(() => {
    return getLastThirtyDays().map((dayDate) => {
      const dayStart = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        0,
        0,
        0,
      );
      const dayEnd = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        23,
        59,
        59,
      );

      const createdContracts = contracts.filter((contract) => {
        const startDate = parseDate(contract.startDate);
        return startDate && startDate >= dayStart && startDate <= dayEnd;
      });

      const activeContractsInPeriod = contracts.filter((contract) => {
        if (["Canceled", "Deleted", "Inactive"].includes(contract.status)) {
          return false;
        }

        const startDate = parseDate(contract.startDate);

        if (!startDate) {
          return contract.status === "Active";
        }

        return startDate <= dayEnd;
      });

      return {
        month: dayDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        createdContracts: createdContracts.length,
        activeContracts: activeContractsInPeriod.length,
      };
    });
  }, [contracts]);

  const selectedRevenueChartData =
    revenueChartView === "month" ? revenueChartData : dailyRevenueChartData;

  const selectedContractEvolutionData =
    contractChartView === "month"
      ? monthlyContractEvolutionData
      : dailyContractEvolutionData;

  const revenueChartDescription =
    revenueChartView === "month"
      ? "Receita prevista por mês com base nos contratos cadastrados. Não representa recebimento confirmado."
      : "Projeção diária dos últimos 30 dias com base nos contratos ativos em cada data.";

  const contractChartDescription =
    contractChartView === "month"
      ? "Contratos iniciados e contratos ativos nos últimos 6 meses."
      : "Contratos iniciados e contratos ativos nos últimos 30 dias.";

  const receivableMovements = useMemo(() => {
    return getFinancialMovementsFromReceivables(receivables);
  }, [receivables]);

  const payableMovements = useMemo(() => {
    return getFinancialMovementsFromPayables(payables);
  }, [payables]);

  const todayReceivableMovements = useMemo(
    () =>
      receivableMovements.filter(
        (movement) => movement.status === "today" || movement.status === "overdue",
      ),
    [receivableMovements],
  );

  const upcomingReceivableMovements = useMemo(
    () =>
      receivableMovements
        .filter((movement) => movement.status === "upcoming")
        .slice(0, 5),
    [receivableMovements],
  );

  const todayPayableMovements = useMemo(
    () =>
      payableMovements.filter(
        (movement) => movement.status === "today" || movement.status === "overdue",
      ),
    [payableMovements],
  );

  const upcomingPayableMovements = useMemo(
    () =>
      payableMovements
        .filter((movement) => movement.status === "upcoming")
        .slice(0, 5),
    [payableMovements],
  );

  const todayReceivableTotal = todayReceivableMovements.reduce(
    (total, movement) => total + movement.amount,
    0,
  );

  const todayPayableTotal = todayPayableMovements.reduce(
    (total, movement) => total + movement.amount,
    0,
  );

  const upcomingReceivableTotal = upcomingReceivableMovements.reduce(
    (total, movement) => total + movement.amount,
    0,
  );

  const upcomingPayableTotal = upcomingPayableMovements.reduce(
    (total, movement) => total + movement.amount,
    0,
  );

  const dashboardAlerts = useMemo<DashboardAlert[]>(() => {
    const alerts: DashboardAlert[] = [];
    const contractsWithoutValue = activeContractsList.filter(
      (contract) => getContractValue(contract) <= 0,
    ).length;

    if (totalProperties === 0) {
      alerts.push({
        id: "no-properties",
        title: "Nenhum bem/ativo cadastrado",
        description:
          "Cadastre bens/ativos para iniciar a gestão operacional e financeira.",
        level: "critical",
      });
    }

    if (availableProperties > 0) {
      alerts.push({
        id: "available-properties",
        title: `${availableProperties} bem(ns)/ativo(s) disponível(is)`,
        description: `${formatCurrency(availablePotentialRevenue)} em potencial mensal ainda sem contrato ativo.`,
        level: "warning",
      });
    }

    if (contractsWithoutValue > 0) {
      alerts.push({
        id: "contracts-without-value",
        title: `${contractsWithoutValue} contrato(s) sem valor`,
        description:
          "Revise os contratos ativos para manter os indicadores financeiros corretos.",
        level: "critical",
      });
    }

    if (todayReceivableMovements.length > 0) {
      alerts.push({
        id: "receivables-today",
        title: `${todayReceivableMovements.length} recebimento(s) para atenção`,
        description: `${formatCurrency(todayReceivableTotal)} entre vencimentos de hoje e atrasados.`,
        level: todayReceivableMovements.some((movement) => movement.status === "overdue")
          ? "critical"
          : "info",
      });
    }

    if (todayPayableMovements.length > 0) {
      alerts.push({
        id: "payables-today",
        title: `${todayPayableMovements.length} conta(s) a pagar para atenção`,
        description: `${formatCurrency(todayPayableTotal)} entre vencimentos de hoje e atrasados.`,
        level: todayPayableMovements.some((movement) => movement.status === "overdue")
          ? "critical"
          : "warning",
      });
    }

    if (totalProperties > 0 && occupancyRate >= 90) {
      alerts.push({
        id: "high-occupation",
        title: "Alta ocupação da carteira",
        description:
          "A carteira está performando bem. Avalie expansão de bens/ativos disponíveis.",
        level: "success",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "healthy-operation",
        title: "Operação estável",
        description: "Nenhuma ação crítica identificada no momento.",
        level: "success",
      });
    }

    return alerts.slice(0, 4);
  }, [
    activeContractsList,
    availablePotentialRevenue,
    availableProperties,
    occupancyRate,
    todayPayableMovements,
    todayPayableTotal,
    todayReceivableMovements,
    todayReceivableTotal,
    totalProperties,
  ]);

  return (
    <>
        <style>{contrxDashboardThemeStyle}</style>
        <div data-contrx-theme={dashboardTheme} className="contrx-dashboard-page space-y-5">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Indicadores estratégicos para acompanhar ocupação, receita,
                contratos e oportunidades da carteira de contratos.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={financialPeriod}
                onChange={(event) =>
                  setFinancialPeriod(event.target.value as DashboardFinancialPeriod)
                }
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                aria-label="Período financeiro da Dashboard"
              >
                <option value="CurrentMonth">Mês atual</option>
                <option value="CurrentYear">Ano atual</option>
                <option value="All">Todos</option>
              </select>

              <div className="flex h-11 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-orange-500" />
                  Hoje, {new Date().toLocaleDateString("pt-BR")}
                </span>
                {lastUpdatedAt && (
                  <span className="ml-2 text-xs font-black text-orange-600">
                    Atualizado {lastUpdatedAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={refreshDashboardData}
                disabled={!companyId || isDashboardLoading}
                className="h-11 rounded-md bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDashboardLoading ? "Atualizando..." : "Atualizar dados"}
              </button>
            </div>
          </div>

          {dashboardError && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700 shadow-sm">
              {dashboardError}
            </div>
          )}

          {!dashboardError && financialSummaryError && (
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5 text-sm font-bold text-orange-700 shadow-sm">
              Resumo financeiro indisponivel no momento: {financialSummaryError}
            </div>
          )}

          {isDashboardLoading && !dashboardError && (
            <div className="rounded-3xl border border-orange-100 bg-white p-5 text-sm font-bold text-slate-600 shadow-sm">
              Carregando indicadores da Dashboard...
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              title="Receita mensal prevista"
              value={formatCurrency(monthlyRevenue)}
              detail={`${formatCurrency(annualRevenueProjection)} projetado ao ano`}
              trend={`${revenueEfficiency}% da capacidade`}
            />

            <MetricCard
              icon={<ChartLine className="h-5 w-5" />}
              title="Taxa de ocupação"
              value={`${occupancyRate}%`}
              detail={`${rentedProperties} de ${totalProperties} bens/ativos alugados`}
              trend={`${vacancyRate}% disponível`}
            />

            <MetricCard
              icon={<FileText className="h-5 w-5" />}
              title="Contratos ativos"
              value={activeContracts}
              detail={`${finishedContracts} finalizado(s)`}
              trend={`${formatCurrency(averageTicket)} ticket médio`}
            />

            <MetricCard
              icon={<Home className="h-5 w-5" />}
              title="A receber em aberto"
              value={formatCurrency(openReceivableTotal)}
              detail={`${formatCurrency(overdueReceivableTotal)} vencido(s)`}
              trend="Financeiro real"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <FinancialSummaryCard
              title="Recebido confirmado"
              value={formatCurrency(receivedTotal)}
              detail={`${receivables.filter((item) => item.status === "Paid").length} paga(s) no ${getFinancialPeriodLabel(financialPeriod).toLowerCase()}`}
              tone="green"
            />
            <FinancialSummaryCard
              title="A pagar em aberto"
              value={formatCurrency(openPayableTotal)}
              detail={`${payables.filter((item) => item.status !== "Paid").length} pendente(s) no ${getFinancialPeriodLabel(financialPeriod).toLowerCase()}`}
              tone="red"
            />
            <FinancialSummaryCard
              title="Potencial disponível"
              value={formatCurrency(availablePotentialRevenue)}
              detail={`${availableProperties} bem(ns)/ativo(s) sem contrato ativo`}
              tone="slate"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Evolução da receita contratada
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {revenueChartDescription}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-full bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setRevenueChartView("month")}
                      className={`rounded-full px-3 py-2 text-xs font-black transition ${
                        revenueChartView === "month"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      Mês
                    </button>

                    <button
                      type="button"
                      onClick={() => setRevenueChartView("day")}
                      className={`rounded-full px-3 py-2 text-xs font-black transition ${
                        revenueChartView === "day"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      Dia
                    </button>
                  </div>

                  <ChartBadge label="Receita prevista" color="bg-orange-500" />
                  <ChartBadge label="Contratos" color="bg-slate-400" />
                </div>
              </div>

              <div className="h-80 min-h-[320px] min-w-0">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={320}
                >
                  <ComposedChart data={selectedRevenueChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="revenue"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => compactCurrency(Number(value))}
                    />
                    <YAxis
                      yAxisId="contracts"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "expected")
                          return [formatCurrency(Number(value)), "Receita prevista"];
                        return [Number(value), "Contratos"];
                      }}
                      labelFormatter={(label) =>
                        `${revenueChartView === "month" ? "Mês" : "Dia"}: ${label}`
                      }
                    />
                    <Bar
                      yAxisId="revenue"
                      dataKey="expected"
                      radius={[12, 12, 0, 0]}
                      fill={chartColors.orange}
                      barSize={revenueChartView === "month" ? 44 : 18}
                    />
                    <Line
                      yAxisId="contracts"
                      type="monotone"
                      dataKey="activeContracts"
                      stroke={chartColors.slate}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-4">
              <h2 className="text-lg font-black text-slate-950">
                Financeiro operacional
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Contas vencidas, vencendo hoje e próximos lançamentos no {getFinancialPeriodLabel(financialPeriod).toLowerCase()}.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <FinancialSummaryCard
                  title="Receber atenção"
                  value={formatCurrency(todayReceivableTotal)}
                  detail={`${todayReceivableMovements.length} vencido(s)/hoje`}
                  tone="orange"
                />
                <FinancialSummaryCard
                  title="Pagar atenção"
                  value={formatCurrency(todayPayableTotal)}
                  detail={`${todayPayableMovements.length} vencido(s)/hoje`}
                  tone="slate"
                />
                <FinancialSummaryCard
                  title="Próx. recebimentos"
                  value={formatCurrency(upcomingReceivableTotal)}
                  detail={`${upcomingReceivableMovements.length} item(ns)`}
                  tone="green"
                />
                <FinancialSummaryCard
                  title="Próx. pagamentos"
                  value={formatCurrency(upcomingPayableTotal)}
                  detail={`${upcomingPayableMovements.length} item(ns)`}
                  tone="red"
                />
              </div>

              <div className="mt-5 space-y-3">
                <FinancialMovementPreview
                  title="Receber"
                  href="/contas-receber"
                  emptyMessage="Nenhuma conta a receber próxima."
                  movements={[...todayReceivableMovements, ...upcomingReceivableMovements].slice(0, 4)}
                />

                <FinancialMovementPreview
                  title="Pagar"
                  href="/contas-pagar"
                  emptyMessage="Nenhuma conta a pagar próxima."
                  movements={[...todayPayableMovements, ...upcomingPayableMovements].slice(0, 4)}
                />
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Evolução de contratos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {contractChartDescription}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-full bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setContractChartView("month")}
                      className={`rounded-full px-3 py-2 text-xs font-black transition ${
                        contractChartView === "month"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      Mês
                    </button>

                    <button
                      type="button"
                      onClick={() => setContractChartView("day")}
                      className={`rounded-full px-3 py-2 text-xs font-black transition ${
                        contractChartView === "day"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      Dia
                    </button>
                  </div>

                  <ChartBadge label="Iniciados" color="bg-orange-500" />
                  <ChartBadge label="Ativos" color="bg-slate-400" />
                </div>
              </div>

              <div className="h-72 min-h-[288px] min-w-0">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={288}
                >
                  <ComposedChart data={selectedContractEvolutionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "createdContracts")
                          return [Number(value), "Iniciados"];
                        return [Number(value), "Ativos"];
                      }}
                      labelFormatter={(label) =>
                        `${contractChartView === "month" ? "Mês" : "Dia"}: ${label}`
                      }
                    />
                    <Bar
                      dataKey="createdContracts"
                      radius={[12, 12, 0, 0]}
                      fill={chartColors.orange}
                      barSize={contractChartView === "month" ? 44 : 18}
                    />
                    <Line
                      type="monotone"
                      dataKey="activeContracts"
                      stroke={chartColors.slate}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-4">
              <h2 className="text-lg font-black text-slate-950">
                Central de atenção
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pontos que merecem acompanhamento para melhorar a operação.
              </p>

              <div className="mt-5 space-y-3">
                {dashboardAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </>
  );
}

type MetricCardProps = {
  icon: ReactNode;
  title: string;
  value: string | number;
  detail: string;
  trend: string;
};

function MetricCard({ icon, title, value, detail, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600">
          {icon}
        </div>
        <span className="truncate rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
          {trend}
        </span>
      </div>

      <p className="mt-3 truncate text-xs font-bold text-slate-500">{title}</p>
      <h3 className="mt-1 truncate text-xl font-black text-slate-950">{value}</h3>
      <p className="mt-1 truncate text-xs font-bold text-orange-600">{detail}</p>
    </div>
  );
}

type AlertCardProps = {
  alert: DashboardAlert;
};

function AlertCard({ alert }: AlertCardProps) {
  const alertStyle = {
    critical: "border-red-100 bg-red-50 text-red-700",
    warning: "border-orange-100 bg-orange-50 text-orange-700",
    info: "border-sky-100 bg-sky-50 text-sky-700",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  }[alert.level];

  const Icon = {
    critical: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
    success: CircleCheck,
  }[alert.level];

  return (
    <div className={`rounded-2xl border p-4 ${alertStyle}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">{alert.title}</p>
          <p className="mt-1 text-sm opacity-80">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

type ChartBadgeProps = {
  label: string;
  color: string;
};

function ChartBadge({ label, color }: ChartBadgeProps) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

type FinancialSummaryCardProps = {
  title: string;
  value: string;
  detail: string;
  tone: "orange" | "slate" | "green" | "red";
};

function FinancialSummaryCard({ title, value, detail, tone }: FinancialSummaryCardProps) {
  const toneClassName = {
    orange: "bg-orange-50 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className={`rounded-lg px-4 py-3.5 ${toneClassName}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-80">
        {title}
      </p>
      <p className="mt-2 text-lg font-black">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{detail}</p>
    </div>
  );
}

type FinancialMovementPreviewProps = {
  title: string;
  href: string;
  emptyMessage: string;
  movements: FinancialMovement[];
};

function FinancialMovementPreview({
  title,
  href,
  emptyMessage,
  movements,
}: FinancialMovementPreviewProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={href}
          className="rounded-xl px-2 py-1 text-sm font-black text-slate-800 transition hover:bg-white hover:text-orange-600"
        >
          {title}
        </Link>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500">
          {movements.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {movements.length === 0 ? (
          <p className="text-xs font-semibold text-slate-500">{emptyMessage}</p>
        ) : (
          movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-800">
                  {movement.title}
                </p>
                <p className="truncate text-[11px] font-semibold text-slate-500">
                  {movement.subtitle} · {formatDateLabel(movement.dueDate)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-slate-900">
                  {formatCurrency(movement.amount)}
                </p>
                <p className={`text-[10px] font-black ${getFinancialStatusClassName(movement.status)}`}>
                  {getFinancialStatusLabel(movement.status)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function mapApiPropertyToDashboardProperty(
  property: ApiProperty,
  activePropertyIds: Set<string>,
): Property {
  const address = [
    property.address,
    property.number,
    property.district,
    property.city,
    property.state,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: property.id,
    name: property.title || "Bem/ativo sem nome",
    address,
    rentValue: Number(property.rentalValue || 0),
    status: activePropertyIds.has(property.id) ? "Rented" : "Available",
  };
}

function mapApiContractToDashboardContract(contract: ApiContract): Contract {
  return {
    id: contract.id,
    propertyId: contract.propertyId,
    tenantId: contract.tenantId,
    startDate: contract.startDate,
    rentValue: Number(contract.rentValue || 0),
    status: mapApiContractStatusToDashboardStatus(contract.status),
  };
}

function mapApiContractStatusToDashboardStatus(
  status: ApiContract["status"],
): ContractStatus {
  const statusMap: Record<ApiContract["status"], ContractStatus> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    CANCELED: "Canceled",
    FINISHED: "Finished",
    DELETED: "Deleted",
  };

  return statusMap[status] || "Inactive";
}

function getContractValue(contract: Contract) {
  return Number(contract.value ?? contract.rentValue ?? 0);
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function compactCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}k`;
  }

  return `R$ ${value}`;
}

function parseDate(value?: string) {
  if (!value) return null;

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getLastSixMonths() {
  const currentDate = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 5 + index,
      1,
    );
  });
}

function getLastThirtyDays() {
  const currentDate = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - 29 + index,
    );
  });
}

function getFinancialSummaryFilters(period: DashboardFinancialPeriod) {
  const today = new Date();

  if (period === "All") return {};

  if (period === "CurrentYear") {
    return {
      startDate: getLocalDateValue(new Date(today.getFullYear(), 0, 1)),
      endDate: getLocalDateValue(new Date(today.getFullYear(), 11, 31)),
    };
  }

  return {
    startDate: getLocalDateValue(
      new Date(today.getFullYear(), today.getMonth(), 1),
    ),
    endDate: getLocalDateValue(
      new Date(today.getFullYear(), today.getMonth() + 1, 0),
    ),
  };
}

function getFinancialPeriodLabel(period: DashboardFinancialPeriod) {
  if (period === "CurrentYear") return "ano atual";
  if (period === "All") return "período completo";

  return "mês atual";
}

function getLocalDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function getEndOfUpcomingRange(days = 7) {
  const date = getStartOfToday();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);

  return date;
}

function normalizeAmount(value?: number) {
  return Number(value || 0);
}

function getFinancialMovementStatus(dueDateValue: string): FinancialMovement["status"] | null {
  const dueDate = parseDate(dueDateValue);

  if (!dueDate) return null;

  const today = getStartOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const upcomingEnd = getEndOfUpcomingRange(7);

  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) return "overdue";
  if (dueDate >= today && dueDate < tomorrow) return "today";
  if (dueDate <= upcomingEnd) return "upcoming";

  return null;
}

function getFinancialMovementsFromReceivables(
  receivables: FinancialReceivable[],
) {
  return receivables
    .filter((charge) => charge.status !== "Paid")
    .map((charge): FinancialMovement | null => {
      const dueDate = charge.dueDate;
      const status = getFinancialMovementStatus(dueDate);

      if (!status) return null;

      return {
        id: String(charge.id),
        title: charge.tenant || "Pessoa não informada",
        subtitle: charge.property || "Sem bem/ativo vinculado",
        dueDate,
        amount: normalizeAmount(charge.amount),
        status,
      };
    })
    .filter((movement): movement is FinancialMovement => Boolean(movement))
    .sort(sortFinancialMovements);
}

function getFinancialMovementsFromPayables(
  payableCharges: FinancialPayable[],
  paidIds: string[] = [],
) {
  return payableCharges
    .filter((charge) => {
      const isPaid =
        paidIds.includes(String(charge.id)) ||
        charge.status === "Paid";

      return !isPaid;
    })
    .map((charge): FinancialMovement | null => {
      const dueDate = charge.dueDate || "";
      const status = getFinancialMovementStatus(dueDate);

      if (!status) return null;

      return {
        id: String(charge.id),
        title:
          charge.supplier ||
          charge.creditor ||
          charge.description ||
          "Conta a pagar",
        subtitle: charge.category || charge.description || "Sem categoria",
        dueDate,
        amount: normalizeAmount(charge.amount ?? charge.value),
        status,
      };
    })
    .filter((movement): movement is FinancialMovement => Boolean(movement))
    .sort(sortFinancialMovements);
}

function sortFinancialMovements(
  firstMovement: FinancialMovement,
  secondMovement: FinancialMovement,
) {
  const statusOrder: Record<FinancialMovement["status"], number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
  };

  const firstDate = parseDate(firstMovement.dueDate)?.getTime() || 0;
  const secondDate = parseDate(secondMovement.dueDate)?.getTime() || 0;

  return (
    statusOrder[firstMovement.status] - statusOrder[secondMovement.status] ||
    firstDate - secondDate
  );
}

function formatDateLabel(value: string) {
  const date = parseDate(value);

  if (!date) return "Sem vencimento";

  return date.toLocaleDateString("pt-BR");
}

function getFinancialStatusLabel(status: FinancialMovement["status"]) {
  if (status === "overdue") return "Atrasado";
  if (status === "today") return "Hoje";

  return "Próximo";
}

function getFinancialStatusClassName(status: FinancialMovement["status"]) {
  if (status === "overdue") return "text-red-600";
  if (status === "today") return "text-orange-600";

  return "text-emerald-600";
}
