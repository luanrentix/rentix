"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
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

type Tenant = {
  id: string;
  name: string;
  phone: string;
  document: string;
};

type ContractStatus = "Active" | "Finished" | "Inactive" | "Canceled" | "Deleted";

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

const chartColors = {
  orange: "#f97316",
  orangeSoft: "#fed7aa",
  slate: "#94a3b8",
  slateSoft: "#e2e8f0",
  green: "#16a34a",
  red: "#dc2626",
};

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const storedProperties = localStorage.getItem("rentix_properties");
    const storedTenants = localStorage.getItem("rentix_tenants");
    const storedContracts = localStorage.getItem("rentix_contracts");

    if (storedProperties) setProperties(JSON.parse(storedProperties));
    if (storedTenants) setTenants(JSON.parse(storedTenants));
    if (storedContracts) setContracts(JSON.parse(storedContracts));
  }, []);

  const activeContractsList = useMemo(
    () => contracts.filter((contract) => contract.status === "Active"),
    [contracts]
  );

  const totalProperties = properties.length;
  const rentedProperties = properties.filter(
    (property) => property.status === "Rented"
  ).length;
  const availableProperties = properties.filter(
    (property) => property.status === "Available"
  ).length;

  const activeContracts = activeContractsList.length;
  const finishedContracts = contracts.filter(
    (contract) => contract.status === "Finished"
  ).length;
  const canceledContracts = contracts.filter(
    (contract) => contract.status === "Canceled"
  ).length;

  const monthlyRevenue = activeContractsList.reduce(
    (total, contract) => total + getContractValue(contract),
    0
  );

  const totalPotentialRevenue = properties.reduce(
    (total, property) => total + Number(property.rentValue || 0),
    0
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

  const contractStatusChartData = [
    { name: "Ativos", value: activeContracts, color: chartColors.orange },
    { name: "Finalizados", value: finishedContracts, color: chartColors.slate },
    { name: "Cancelados", value: canceledContracts, color: chartColors.red },
  ].filter((item) => item.value > 0);

  const propertyStatusChartData = [
    { name: "Alugados", value: rentedProperties, color: chartColors.orange },
    { name: "Disponíveis", value: availableProperties, color: chartColors.slateSoft },
  ];

  const revenueChartData = useMemo<RevenueMonth[]>(() => {
    return getLastSixMonths().map((monthDate) => {
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59
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
        month: monthDate.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        expected: validContracts.reduce(
          (total, contract) => total + getContractValue(contract),
          0
        ),
        activeContracts: validContracts.length,
      };
    });
  }, [contracts]);

  const topRevenueProperties = useMemo(() => {
    return activeContractsList
      .map((contract) => {
        const property = properties.find(
          (propertyItem) => String(propertyItem.id) === String(contract.propertyId)
        );
        const tenant = tenants.find(
          (tenantItem) => String(tenantItem.id) === String(contract.tenantId)
        );

        return {
          id: contract.id,
          propertyName: property?.name || "Imóvel não encontrado",
          tenantName: tenant?.name || "Pessoa não encontrada",
          amount: getContractValue(contract),
        };
      })
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 5);
  }, [activeContractsList, properties, tenants]);

  const nextPayments = useMemo(() => {
    return activeContractsList.slice(0, 5).map((contract, index) => {
      const property = properties.find(
        (propertyItem) => String(propertyItem.id) === String(contract.propertyId)
      );

      const tenant = tenants.find(
        (tenantItem) => String(tenantItem.id) === String(contract.tenantId)
      );

      return {
        id: contract.id,
        propertyName: property?.name || "Imóvel não encontrado",
        tenantName: tenant?.name || "Pessoa não encontrada",
        dueDate: `${String(5 + index * 5).padStart(2, "0")}/${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}/${new Date().getFullYear()}`,
        amount: getContractValue(contract),
      };
    });
  }, [activeContractsList, properties, tenants]);

  const dashboardAlerts = useMemo<DashboardAlert[]>(() => {
    const alerts: DashboardAlert[] = [];
    const contractsWithoutValue = activeContractsList.filter(
      (contract) => getContractValue(contract) <= 0
    ).length;

    if (totalProperties === 0) {
      alerts.push({
        id: "no-properties",
        title: "Nenhum imóvel cadastrado",
        description: "Cadastre imóveis para iniciar a gestão operacional e financeira.",
        level: "critical",
      });
    }

    if (availableProperties > 0) {
      alerts.push({
        id: "available-properties",
        title: `${availableProperties} imóvel(is) disponível(is)`,
        description: `${formatCurrency(availablePotentialRevenue)} em potencial mensal ainda sem contrato ativo.`,
        level: "warning",
      });
    }

    if (contractsWithoutValue > 0) {
      alerts.push({
        id: "contracts-without-value",
        title: `${contractsWithoutValue} contrato(s) sem valor`,
        description: "Revise os contratos ativos para manter os indicadores financeiros corretos.",
        level: "critical",
      });
    }

    if (totalProperties > 0 && occupancyRate >= 90) {
      alerts.push({
        id: "high-occupation",
        title: "Alta ocupação da carteira",
        description: "A carteira está performando bem. Avalie expansão de imóveis disponíveis.",
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
    totalProperties,
  ]);

  return (
    <AppShell>
      <div className="space-y-8 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Indicadores estratégicos para acompanhar ocupação, receita, contratos e oportunidades da carteira imobiliária.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm">
            📅 Hoje, {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon="💰"
            title="Receita mensal ativa"
            value={formatCurrency(monthlyRevenue)}
            detail={`${formatCurrency(annualRevenueProjection)} projetado ao ano`}
            trend={`${revenueEfficiency}% da capacidade`}
          />

          <MetricCard
            icon="📈"
            title="Taxa de ocupação"
            value={`${occupancyRate}%`}
            detail={`${rentedProperties} de ${totalProperties} imóveis alugados`}
            trend={`${vacancyRate}% disponível`}
          />

          <MetricCard
            icon="📄"
            title="Contratos ativos"
            value={activeContracts}
            detail={`${finishedContracts} finalizado(s)`}
            trend={`${formatCurrency(averageTicket)} ticket médio`}
          />

          <MetricCard
            icon="🏠"
            title="Receita em aberto"
            value={formatCurrency(availablePotentialRevenue)}
            detail={`${availableProperties} imóvel(is) disponível(is)`}
            trend="Potencial mensal"
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
                  Receita mensal estimada com base nos contratos cadastrados e seus valores.
                </p>
              </div>

              <div className="flex gap-2">
                <ChartBadge label="Receita" color="bg-orange-500" />
                <ChartBadge label="Contratos" color="bg-slate-400" />
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                      if (name === "expected") return [formatCurrency(Number(value)), "Receita"];
                      return [Number(value), "Contratos"];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar
                    yAxisId="revenue"
                    dataKey="expected"
                    radius={[12, 12, 0, 0]}
                    fill={chartColors.orange}
                    barSize={44}
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
            <h2 className="text-lg font-black text-slate-950">Central de atenção</h2>
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

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-4">
            <h2 className="text-lg font-black text-slate-950">Status da carteira</h2>
            <p className="mt-1 text-sm text-slate-500">
              Distribuição atual entre imóveis alugados e disponíveis.
            </p>

            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {propertyStatusChartData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3">
              <StatusLegend label="Alugados" value={rentedProperties} color="bg-orange-500" />
              <StatusLegend label="Disponíveis" value={availableProperties} color="bg-slate-300" />
            </div>
          </section>

          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-4">
            <h2 className="text-lg font-black text-slate-950">Contratos por status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Leitura rápida da saúde contratual.
            </p>

            {contractStatusChartData.length === 0 ? (
              <EmptyState message="Nenhum contrato cadastrado." />
            ) : (
              <>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contractStatusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={66}
                        outerRadius={100}
                        paddingAngle={4}
                      >
                        {contractStatusChartData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-3">
                  {contractStatusChartData.map((item) => (
                    <StatusLegend
                      key={item.name}
                      label={item.name}
                      value={item.value}
                      color={getLegendColor(item.name)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-4">
            <h2 className="text-lg font-black text-slate-950">Top receitas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Imóveis ativos com maior contribuição mensal.
            </p>

            <div className="mt-5 space-y-3">
              {topRevenueProperties.length === 0 ? (
                <EmptyState message="Nenhum contrato ativo encontrado." />
              ) : (
                topRevenueProperties.map((item, index) => (
                  <RankingItem
                    key={item.id}
                    position={index + 1}
                    title={item.propertyName}
                    subtitle={item.tenantName}
                    value={formatCurrency(item.amount)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Próximos vencimentos</h2>
                <p className="text-sm text-slate-500">
                  Lista operacional baseada nos contratos ativos cadastrados.
                </p>
              </div>
            </div>

            {nextPayments.length === 0 ? (
              <EmptyState message="Nenhum vencimento encontrado." />
            ) : (
              <div className="space-y-3">
                {nextPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                        📅
                      </div>

                      <div>
                        <p className="font-bold text-slate-800">Aluguel - {payment.propertyName}</p>
                        <p className="text-sm text-slate-500">{payment.tenantName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-orange-600">{payment.dueDate}</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm xl:col-span-5">
            <h2 className="text-lg font-black">Resumo executivo</h2>
            <p className="mt-1 text-sm text-slate-300">
              Leitura consolidada da operação atual.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ExecutiveSummaryItem title="Carteira" value={`${totalProperties} imóveis`} />
              <ExecutiveSummaryItem title="Capacidade mensal" value={formatCurrency(totalPotentialRevenue)} />
              <ExecutiveSummaryItem title="Receita ativa" value={formatCurrency(monthlyRevenue)} />
              <ExecutiveSummaryItem title="Oportunidade" value={formatCurrency(availablePotentialRevenue)} />
            </div>

            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-sm font-semibold text-slate-200">Diagnóstico</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {getExecutiveDiagnosis({
                  totalProperties,
                  occupancyRate,
                  availablePotentialRevenue,
                  activeContracts,
                })}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

type MetricCardProps = {
  icon: string;
  title: string;
  value: string | number;
  detail: string;
  trend: string;
};

function MetricCard({ icon, title, value, detail, trend }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
          {icon}
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
          {trend}
        </span>
      </div>

      <p className="mt-5 text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

type StatusLegendProps = {
  label: string;
  value: number;
  color: string;
};

function StatusLegend({ label, value, color }: StatusLegendProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span className="font-bold text-slate-600">{label}</span>
      </div>

      <span className="font-black text-slate-950">{value}</span>
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

  const icon = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
    success: "✅",
  }[alert.level];

  return (
    <div className={`rounded-2xl border p-4 ${alertStyle}`}>
      <div className="flex gap-3">
        <span className="text-lg">{icon}</span>
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

type RankingItemProps = {
  position: number;
  title: string;
  subtitle: string;
  value: string;
};

function RankingItem({ position, title, subtitle, value }: RankingItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-black text-orange-600">
          {position}
        </div>
        <div className="min-w-0">
          <p className="truncate font-black text-slate-800">{title}</p>
          <p className="truncate text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <p className="shrink-0 font-black text-orange-600">{value}</p>
    </div>
  );
}

type ExecutiveSummaryItemProps = {
  title: string;
  value: string;
};

function ExecutiveSummaryItem({ title, value }: ExecutiveSummaryItemProps) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
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
    return new Date(currentDate.getFullYear(), currentDate.getMonth() - 5 + index, 1);
  });
}

function getLegendColor(label: string) {
  const colors: Record<string, string> = {
    Ativos: "bg-orange-500",
    Finalizados: "bg-slate-400",
    Cancelados: "bg-red-500",
  };

  return colors[label] || "bg-slate-300";
}

function getExecutiveDiagnosis({
  totalProperties,
  occupancyRate,
  availablePotentialRevenue,
  activeContracts,
}: {
  totalProperties: number;
  occupancyRate: number;
  availablePotentialRevenue: number;
  activeContracts: number;
}) {
  if (totalProperties === 0) {
    return "Ainda não existem imóveis cadastrados. O primeiro passo é estruturar a carteira para ativar os indicadores da operação.";
  }

  if (activeContracts === 0) {
    return "A carteira possui imóveis cadastrados, mas ainda não existem contratos ativos gerando receita recorrente.";
  }

  if (occupancyRate >= 90) {
    return "A operação apresenta alta ocupação e boa geração recorrente. O próximo ganho está em ampliar a carteira e proteger a renovação dos contratos ativos.";
  }

  if (availablePotentialRevenue > 0) {
    return "Existe potencial de receita parado em imóveis disponíveis. Priorize a conversão desses imóveis para aumentar a receita recorrente mensal.";
  }

  return "A operação está equilibrada, com contratos ativos e indicadores suficientes para acompanhamento financeiro e operacional.";
}
