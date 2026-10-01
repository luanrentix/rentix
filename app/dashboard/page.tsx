"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  ChartLine,
  FileText,
  Home,
  CheckCircle2,
  ArrowDownCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardOverview } from "@/services/dashboard.service";
import { getAppSettings } from "@/services/settings.service";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";
import type {
  DashboardFinancialPeriod,
  DashboardOverviewResponse,
  ThemeMode,
} from "@/types/dashboard.types";
import { readThemeSettingsFromStorage } from "@/services/theme-storage";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { MetricCard } from "@/components/dashboard/metric-card";
import { FinancialSummaryCard } from "@/components/dashboard/financial-summary-card";
import { RevenueEvolutionChart } from "@/components/dashboard/revenue-evolution-chart";
import { ContractEvolutionChart } from "@/components/dashboard/contract-evolution-chart";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { FinancialOperationsSection } from "@/components/dashboard/financial-operations-section";

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
    background-color: color-mix(in srgb, var(--primary-color) 14%, transparent) !important;
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

  .contrx-dashboard-page[data-contrx-theme="graphite"] {
    color: #f8fafc;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-white,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-slate-50,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-slate-100 {
    background-color: #0d1b2e !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] section.bg-white,
  .contrx-dashboard-page[data-contrx-theme="graphite"] div.bg-white {
    background: linear-gradient(145deg, #0d1b2e 0%, #11253e 100%) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-orange-50,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-orange-100 {
    background-color: color-mix(in srgb, var(--primary-color) 14%, transparent) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-red-50 {
    background-color: rgba(220, 38, 38, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-emerald-50 {
    background-color: rgba(16, 185, 129, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .bg-sky-50 {
    background-color: rgba(14, 165, 233, 0.12) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-950,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-900,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-800,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-700,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-600 {
    color: #f8fafc !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-500,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .text-slate-400 {
    color: #b6c6dc !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-orange-100,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-slate-100,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-slate-200,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-slate-300,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-red-100,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-emerald-100,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .border-sky-100 {
    border-color: #24405f !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .shadow-sm,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .shadow-md,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .shadow-lg,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .shadow-xl,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .shadow-2xl {
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .recharts-cartesian-grid line {
    stroke: #24405f !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .recharts-text,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .recharts-cartesian-axis-tick-value {
    fill: #b6c6dc !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .recharts-tooltip-wrapper .recharts-default-tooltip {
    background-color: #07111f !important;
    border-color: #24405f !important;
    color: #f8fafc !important;
    border-radius: 14px !important;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5) !important;
  }

  .contrx-dashboard-page[data-contrx-theme="graphite"] .recharts-tooltip-wrapper .recharts-tooltip-label,
  .contrx-dashboard-page[data-contrx-theme="graphite"] .recharts-tooltip-wrapper .recharts-tooltip-item {
    color: #f8fafc !important;
  }
`;

export default function DashboardPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [dashboardData, setDashboardData] =
    useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [financialPeriod, setFinancialPeriod] =
    useState<DashboardFinancialPeriod>("CurrentMonth");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [revenueChartView, setRevenueChartView] = useState<"month" | "day">(
    "month",
  );
  const [contractChartView, setContractChartView] = useState<"month" | "day">(
    "month",
  );

  const [dashboardTheme, setDashboardTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return readThemeSettingsFromStorage().mode;
    }
    return "light";
  });
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);
  const [hasCompanyConfigured, setHasCompanyConfigured] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const storedDismissed =
      getCompanyStorageItem(
        companyId,
        "contrx_onboarding_dismissed",
        "contrx_onboarding_dismissed",
      ) === "true";
    setIsOnboardingDismissed(storedDismissed);

    const storedPrivacy =
      getCompanyStorageItem(
        companyId,
        "contrx_privacy_mode",
        "contrx_privacy_mode",
      ) === "true";
    setIsPrivacyMode(storedPrivacy);

    const storedCompanySettings = getCompanyStorageItem(
      companyId,
      "contrx_company_settings",
      "contrx_company_settings",
    );
    if (storedCompanySettings) {
      try {
        const parsed = JSON.parse(storedCompanySettings);
        setHasCompanyConfigured(!!(parsed.companyName || parsed.tradeName));
      } catch {
        setHasCompanyConfigured(false);
      }
    } else {
      setHasCompanyConfigured(false);
    }
  }, [companyId]);

  const togglePrivacyMode = () => {
    if (!companyId) return;
    setIsPrivacyMode((prev) => {
      const next = !prev;
      setCompanyStorageItem(companyId, "contrx_privacy_mode", String(next));
      return next;
    });
  };

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!companyId) return;

      setIsLoading(true);
      setError("");

      try {
        const [overview, appSettings] = await Promise.all([
          getDashboardOverview(
            {
              period: financialPeriod,
              startDate: customStartDate || undefined,
              endDate: customEndDate || undefined,
            },
            forceRefresh,
          ),
          getAppSettings(companyId).catch(() => null),
        ]);

        if (appSettings?.companySettings) {
          const isConfigured = !!(
            appSettings.companySettings.companyName ||
            appSettings.companySettings.tradeName
          );
          setHasCompanyConfigured(isConfigured);
          setCompanyStorageItem(
            companyId,
            "contrx_company_settings",
            JSON.stringify(appSettings.companySettings),
          );
        }

        setDashboardData(overview);
        setLastUpdatedAt(new Date());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as informações do Dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [companyId, financialPeriod, customStartDate, customEndDate],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tema
  useEffect(() => {
    function applyStoredTheme() {
      const stored = readThemeSettingsFromStorage(companyId);
      setDashboardTheme(stored.mode);
    }

    applyStoredTheme();
    window.addEventListener("storage", applyStoredTheme);
    window.addEventListener("contrx-theme-change", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
      window.removeEventListener("contrx-theme-change", applyStoredTheme);
    };
  }, [companyId]);

  const dismissOnboarding = () => {
    if (!companyId) return;
    setCompanyStorageItem(companyId, "contrx_onboarding_dismissed", "true");
    setIsOnboardingDismissed(true);
  };

  const metrics = dashboardData?.metrics;

  const onboardingSteps = useMemo(() => {
    const totalProps = metrics?.totalProperties || 0;
    const activeConts = metrics?.activeContracts || 0;
    const finishedConts = metrics?.finishedContracts || 0;
    const totalConts = metrics?.totalContracts ?? (activeConts + finishedConts);

    return [
      {
        id: "company",
        label: "Configurar dados da empresa",
        description:
          "Preencha a razão social, CNPJ e logo para emitir contratos e recibos.",
        completed: hasCompanyConfigured,
        href: "/configuracoes",
      },
      {
        id: "property",
        label: "Cadastrar seu primeiro Bem/Ativo",
        description: "Cadastre imóveis, veículos ou equipamentos para gestão.",
        completed: totalProps > 0,
        href: "/imoveis",
      },
      {
        id: "contract",
        label: "Gerar seu primeiro Contrato",
        description: "Vincule um cliente a um bem/ativo e configure as cobranças.",
        completed: totalConts > 0 || activeConts > 0 || finishedConts > 0,
        href: "/contratos",
      },
    ];
  }, [
    hasCompanyConfigured,
    metrics?.totalProperties,
    metrics?.activeContracts,
    metrics?.finishedContracts,
    metrics?.totalContracts,
  ]);

  // Se o usuário já opera o sistema (já possui contratos históricos ou movimentação financeira/bens), ele não deve ver onboarding de primeiro uso
  const totalPropsCount = metrics?.totalProperties || 0;
  const totalContsCount =
    metrics?.totalContracts ??
    ((metrics?.activeContracts || 0) + (metrics?.finishedContracts || 0));
  const hasFinancialActivity =
    (metrics?.receivedTotal || 0) > 0 ||
    (metrics?.openReceivableTotal || 0) > 0 ||
    (metrics?.overdueReceivableTotal || 0) > 0;
  const isEstablishedAccount =
    totalContsCount > 0 || (totalPropsCount > 0 && hasFinancialActivity);

  const showOnboarding =
    !isLoading &&
    !isOnboardingDismissed &&
    !isEstablishedAccount &&
    onboardingSteps.some((s) => !s.completed);

  const exportToCSV = () => {
    if (!metrics) return;

    let csv = "data:text/csv;charset=utf-8,\uFEFF";
    csv += "CONTRX - RELATÓRIO DO DASHBOARD\n";
    csv += `Filtro de Período:;${getPeriodLabel(financialPeriod)}\n`;
    if (financialPeriod === "Custom") {
      csv += `Datas:;${customStartDate || "Início"} até ${customEndDate || "Fim"}\n`;
    }
    csv += `Data de Exportação:;${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}\n\n`;

    csv += "INDICADORES CHAVE\n";
    csv += "Indicador;Valor;Detalhe\n";
    csv += `Receita mensal prevista;"${formatCurrency(metrics.monthlyRevenue)}";"${formatCurrency(metrics.annualRevenueProjection)} projetado ao ano"\n`;
    csv += `Taxa de ocupação;"${metrics.occupancyRate}%";"${metrics.rentedProperties} de ${metrics.totalProperties} bens alugados"\n`;
    csv += `Contratos ativos;"${metrics.activeContracts}";"${metrics.finishedContracts} finalizado(s)"\n`;
    csv += `A receber em aberto;"${formatCurrency(metrics.openReceivableTotal)}";"${formatCurrency(metrics.overdueReceivableTotal)} vencido(s)"\n`;
    csv += `Taxa de inadimplência;"${metrics.delinquencyRate}%";"Sobre total previsto no período"\n`;
    csv += `Recebido confirmado;"${formatCurrency(metrics.receivedTotal)}";"Liquidado no período"\n`;
    csv += `A pagar em aberto;"${formatCurrency(metrics.openPayableTotal)}";"${formatCurrency(metrics.overduePayableTotal)} vencido(s)"\n`;
    csv += `Potencial disponível;"${formatCurrency(metrics.availablePotentialRevenue)}";"${metrics.availableProperties} bem(ns) vagos"\n\n`;

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute(
      "download",
      `contrx_dashboard_${getPeriodLabel(financialPeriod).toLowerCase().replace(/ /g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <style>{contrxDashboardThemeStyle}</style>
      <div
        data-contrx-theme={dashboardTheme}
        className="contrx-dashboard-page space-y-6"
      >
        {/* Top Header & Filtro no Padrão Bens/Ativos com Modo Privacidade */}
        <DashboardHeader
          financialPeriod={financialPeriod}
          onPeriodChange={setFinancialPeriod}
          customStartDate={customStartDate}
          onCustomStartDateChange={setCustomStartDate}
          customEndDate={customEndDate}
          onCustomEndDateChange={setCustomEndDate}
          lastUpdatedAt={lastUpdatedAt}
          isLoading={isLoading}
          onRefresh={() => loadData(true)}
          onExportCSV={exportToCSV}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacyMode={togglePrivacyMode}
        />

        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-2">
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-red-700 focus:outline-none sm:self-auto"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {showOnboarding && (
          <OnboardingChecklist
            steps={onboardingSteps}
            onDismiss={dismissOnboarding}
          />
        )}

        {/* 1º Escalão: 4 Cards Principais de Operação & Capacidade no Padrão AssetKpis */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            title="Receita mensal prevista"
            value={formatCurrency(metrics?.monthlyRevenue)}
            detail={`${formatCurrency(metrics?.annualRevenueProjection)} projetado ao ano`}
            trend={`${metrics?.revenueEfficiency ?? 0}% capacidade`}
            isPrivacyMode={isPrivacyMode}
            isCurrency
            isLoading={isLoading}
            bgClass="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
          />

          <MetricCard
            icon={<ChartLine className="h-4 w-4" />}
            title="Taxa de ocupação"
            value={`${metrics?.occupancyRate ?? 0}%`}
            detail={`${metrics?.rentedProperties ?? 0} de ${metrics?.totalProperties ?? 0} bens alugados`}
            trend={`${metrics?.vacancyRate ?? 0}% vacância`}
            isLoading={isLoading}
            colorClass="text-emerald-700 dark:text-emerald-400"
            bgClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            onClick={() => (window.location.href = "/imoveis")}
          />

          <MetricCard
            icon={<FileText className="h-4 w-4" />}
            title="Contratos ativos"
            value={metrics?.activeContracts ?? 0}
            detail={`${metrics?.finishedContracts ?? 0} finalizado(s)`}
            trend={`${formatCurrency(metrics?.averageTicket)} ticket médio`}
            isPrivacyMode={isPrivacyMode}
            isLoading={isLoading}
            colorClass="text-blue-700 dark:text-blue-400"
            bgClass="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            onClick={() => (window.location.href = "/contratos")}
          />

          <MetricCard
            icon={<Home className="h-4 w-4" />}
            title="A receber em aberto"
            value={formatCurrency(metrics?.openReceivableTotal)}
            detail={`${formatCurrency(metrics?.overdueReceivableTotal)} vencido(s)`}
            trend={`${metrics?.delinquencyRate ?? 0}% inadimplência`}
            isPrivacyMode={isPrivacyMode}
            isCurrency
            isLoading={isLoading}
            colorClass="text-amber-700 dark:text-amber-400"
            bgClass="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
            onClick={() => (window.location.href = "/contas-receber")}
          />
        </div>

        {/* 2º Escalão: 3 Resumos Operacionais do Período */}
        <div className="grid gap-3 sm:grid-cols-3">
          <FinancialSummaryCard
            title="Recebido confirmado"
            value={formatCurrency(metrics?.receivedTotal)}
            detail={`Liquidado no ${getPeriodLabel(financialPeriod).toLowerCase()}`}
            tone="green"
            icon={<CheckCircle2 className="h-4 w-4" />}
            isPrivacyMode={isPrivacyMode}
            isLoading={isLoading}
            onClick={() => (window.location.href = "/contas-receber")}
          />
          <FinancialSummaryCard
            title="A pagar em aberto"
            value={formatCurrency(metrics?.openPayableTotal)}
            detail={`${formatCurrency(metrics?.overduePayableTotal)} vencido(s)`}
            tone="red"
            icon={<ArrowDownCircle className="h-4 w-4" />}
            isPrivacyMode={isPrivacyMode}
            isLoading={isLoading}
            onClick={() => (window.location.href = "/contas-pagar")}
          />
          <FinancialSummaryCard
            title="Potencial disponível"
            value={formatCurrency(metrics?.availablePotentialRevenue)}
            detail={`${metrics?.availableProperties ?? 0} bem(ns) vagos sem contrato`}
            tone="slate"
            icon={<Home className="h-4 w-4" />}
            isPrivacyMode={isPrivacyMode}
            isLoading={isLoading}
            onClick={() => (window.location.href = "/imoveis")}
          />
        </div>

        {/* Seção 1: Gráfico de Evolução de Receita + Financeiro Operacional */}
        <div className="grid gap-6 xl:grid-cols-12">
          <RevenueEvolutionChart
            data={
              revenueChartView === "month"
                ? dashboardData?.charts.revenueEvolutionMonthly || []
                : dashboardData?.charts.revenueEvolutionDaily || []
            }
            viewMode={revenueChartView}
            onViewModeChange={setRevenueChartView}
            isPrivacyMode={isPrivacyMode}
            isLoading={isLoading}
          />

          <FinancialOperationsSection
            todayReceivables={
              dashboardData?.financialMovements.todayReceivables || []
            }
            todayPayables={
              dashboardData?.financialMovements.todayPayables || []
            }
            upcomingReceivables={
              dashboardData?.financialMovements.upcomingReceivables || []
            }
            upcomingPayables={
              dashboardData?.financialMovements.upcomingPayables || []
            }
            periodLabel={getPeriodLabel(financialPeriod).toLowerCase()}
            isPrivacyMode={isPrivacyMode}
            isLoading={isLoading}
          />
        </div>

        {/* Seção 2: Gráfico de Contratos + Central de Atenção Acionável */}
        <div className="grid gap-6 xl:grid-cols-12">
          <ContractEvolutionChart
            data={
              contractChartView === "month"
                ? dashboardData?.charts.contractEvolutionMonthly || []
                : dashboardData?.charts.contractEvolutionDaily || []
            }
            viewMode={contractChartView}
            onViewModeChange={setContractChartView}
            isLoading={isLoading}
          />

          <AlertsSection
            alerts={dashboardData?.alerts || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getPeriodLabel(period: DashboardFinancialPeriod) {
  if (period === "CurrentYear") return "ano atual";
  if (period === "All") return "período completo";
  if (period === "Custom") return "período personalizado";
  return "mês atual";
}
