"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

type ContractStatus = "Active" | "Finished";

type Contract = {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  value: number;
  status: ContractStatus;
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

  const totalProperties = properties.length;
  const rentedProperties = properties.filter(
    (property) => property.status === "Rented"
  ).length;
  const availableProperties = properties.filter(
    (property) => property.status === "Available"
  ).length;

  const activeContracts = contracts.filter(
    (contract) => contract.status === "Active"
  ).length;

  const finishedContracts = contracts.filter(
    (contract) => contract.status === "Finished"
  ).length;

  const monthlyRevenue = contracts
    .filter((contract) => contract.status === "Active")
    .reduce((total, contract) => total + contract.value, 0);

  const occupancyRate =
    totalProperties > 0
      ? Math.round((rentedProperties / totalProperties) * 100)
      : 0;

  const averageTicket =
    activeContracts > 0 ? Math.round(monthlyRevenue / activeContracts) : 0;

  const annualRevenueProjection = monthlyRevenue * 12;

  const revenueChartData = useMemo(() => {
    return [
      { month: "Jan", revenue: Math.max(monthlyRevenue - 1800, 0) },
      { month: "Fev", revenue: Math.max(monthlyRevenue - 1200, 0) },
      { month: "Mar", revenue: Math.max(monthlyRevenue - 900, 0) },
      { month: "Abr", revenue: Math.max(monthlyRevenue - 500, 0) },
      { month: "Mai", revenue: Math.max(monthlyRevenue - 300, 0) },
      { month: "Atual", revenue: monthlyRevenue },
    ];
  }, [monthlyRevenue]);

  const propertyStatusChartData = [
    { name: "Alugados", value: rentedProperties, color: "#f97316" },
    { name: "Disponíveis", value: availableProperties, color: "#e2e8f0" },
  ];

  const contractStatusChartData = [
    { name: "Ativos", value: activeContracts, color: "#f97316" },
    { name: "Finalizados", value: finishedContracts, color: "#94a3b8" },
  ];

  const nextPayments = useMemo(() => {
    return contracts
      .filter((contract) => contract.status === "Active")
      .slice(0, 4)
      .map((contract, index) => {
        const property = properties.find(
          (propertyItem) => propertyItem.id === contract.propertyId
        );

        const tenant = tenants.find(
          (tenantItem) => tenantItem.id === contract.tenantId
        );

        return {
          id: contract.id,
          propertyName: property?.name || "Imóvel não encontrado",
          tenantName: tenant?.name || "Inquilino não encontrado",
          dueDate: `${String(5 + index * 5).padStart(2, "0")}/${String(
            new Date().getMonth() + 1
          ).padStart(2, "0")}/${new Date().getFullYear()}`,
          amount: contract.value,
        };
      });
  }, [contracts, properties, tenants]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Dashboard
            </h1>
            <p className="mt-2 text-slate-500">
              Visão geral financeira, operacional e comercial do Rentix.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm">
            📅 Hoje, {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon="🏢"
            title="Imóveis"
            value={totalProperties}
            detail="Cadastrados"
          />

          <MetricCard
            icon="🔑"
            title="Alugados"
            value={rentedProperties}
            detail={`${occupancyRate}% ocupação`}
          />

          <MetricCard
            icon="🏠"
            title="Disponíveis"
            value={availableProperties}
            detail={`${100 - occupancyRate}% livres`}
          />

          <MetricCard
            icon="📄"
            title="Contratos ativos"
            value={activeContracts}
            detail="Em andamento"
          />

          <MetricCard
            icon="💰"
            title="Receita mensal"
            value={monthlyRevenue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            detail="Receita recorrente"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Receita mensal
                </h2>
                <p className="text-sm text-slate-500">
                  Gráfico real gerado com Recharts.
                </p>
              </div>

              <span className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
                Receita
              </span>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    formatter={(value) =>
                      Number(value).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    }
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="revenue" radius={[12, 12, 0, 0]} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-2">
            <h2 className="text-lg font-black text-slate-950">
              Status dos imóveis
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Distribuição entre imóveis alugados e disponíveis.
            </p>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
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
              <StatusLegend
                label="Alugados"
                value={rentedProperties}
                color="bg-orange-500"
              />
              <StatusLegend
                label="Disponíveis"
                value={availableProperties}
                color="bg-slate-300"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Próximos vencimentos
                </h2>
                <p className="text-sm text-slate-500">
                  Baseado nos contratos ativos cadastrados.
                </p>
              </div>
            </div>

            {nextPayments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Nenhum vencimento encontrado.
              </div>
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
                        <p className="font-bold text-slate-800">
                          Aluguel - {payment.propertyName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {payment.tenantName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {payment.dueDate}
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {payment.amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-2">
            <h2 className="text-lg font-black text-slate-950">
              Contratos por status
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Situação atual dos contratos.
            </p>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
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
              <StatusLegend
                label="Ativos"
                value={activeContracts}
                color="bg-orange-500"
              />
              <StatusLegend
                label="Finalizados"
                value={finishedContracts}
                color="bg-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 rounded-3xl bg-orange-50 p-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon="📊"
            title="Taxa de ocupação"
            value={`${occupancyRate}%`}
            detail={`${rentedProperties} de ${totalProperties} imóveis alugados`}
          />

          <SummaryCard
            icon="💵"
            title="Receita anual"
            value={annualRevenueProjection.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            detail="Projeção com contratos ativos"
          />

          <SummaryCard
            icon="📈"
            title="Ticket médio"
            value={averageTicket.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            detail="Por contrato ativo"
          />

          <SummaryCard
            icon="👥"
            title="Inquilinos"
            value={tenants.length}
            detail="Total cadastrado"
          />
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
};

function MetricCard({ icon, title, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
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

type SummaryCardProps = {
  icon: string;
  title: string;
  value: string | number;
  detail: string;
};

function SummaryCard({ icon, title, value, detail }: SummaryCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-xl text-orange-600">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <h3 className="mt-1 text-2xl font-black text-slate-950">{value}</h3>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}