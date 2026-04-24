"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

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

type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  propertyId?: string;
};

type PaymentStatus = "Pending" | "Paid" | "Overdue";

type FinancialCharge = {
  id: string;
  contractId: string;
  propertyName: string;
  tenantName: string;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
};

export default function FinancialPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paidChargeIds, setPaidChargeIds] = useState<string[]>([]);

  useEffect(() => {
    const storedProperties = localStorage.getItem("rentix_properties");
    const storedTenants = localStorage.getItem("rentix_tenants");
    const storedContracts = localStorage.getItem("rentix_contracts");
    const storedExpenses = localStorage.getItem("rentix_expenses");
    const storedPaidCharges = localStorage.getItem("rentix_paid_charges");

    if (storedProperties) setProperties(JSON.parse(storedProperties));
    if (storedTenants) setTenants(JSON.parse(storedTenants));
    if (storedContracts) setContracts(JSON.parse(storedContracts));
    if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
    if (storedPaidCharges) setPaidChargeIds(JSON.parse(storedPaidCharges));
  }, []);

  const financialCharges = useMemo(() => {
    const today = new Date();

    return contracts
      .filter((contract) => contract.status === "Active")
      .map((contract) => {
        const property = properties.find(
          (propertyItem) => propertyItem.id === contract.propertyId
        );

        const tenant = tenants.find(
          (tenantItem) => tenantItem.id === contract.tenantId
        );

        const dueDate = buildCurrentMonthDueDate(contract.startDate);
        const chargeId = `${contract.id}-${dueDate}`;

        const isPaid = paidChargeIds.includes(chargeId);
        const isOverdue = new Date(dueDate) < today && !isPaid;

        return {
          id: chargeId,
          contractId: contract.id,
          propertyName: property?.name || "Imóvel não encontrado",
          tenantName: tenant?.name || "Inquilino não encontrado",
          dueDate,
          amount: contract.value,
          status: isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending",
        } as FinancialCharge;
      });
  }, [contracts, properties, tenants, paidChargeIds]);

  const totalReceivable = financialCharges.reduce(
    (total, charge) => total + charge.amount,
    0
  );

  const totalReceived = financialCharges
    .filter((charge) => charge.status === "Paid")
    .reduce((total, charge) => total + charge.amount, 0);

  const totalPending = financialCharges
    .filter((charge) => charge.status === "Pending")
    .reduce((total, charge) => total + charge.amount, 0);

  const totalOverdue = financialCharges
    .filter((charge) => charge.status === "Overdue")
    .reduce((total, charge) => total + charge.amount, 0);

  const totalPayable = expenses.reduce((total, expense) => total + expense.amount, 0);

  const estimatedProfit = totalReceivable - totalPayable;
  const realizedProfit = totalReceived - totalPayable;

  const activeContracts = contracts.filter(
    (contract) => contract.status === "Active"
  ).length;

  const paidCharges = financialCharges.filter(
    (charge) => charge.status === "Paid"
  ).length;

  const pendingCharges = financialCharges.filter(
    (charge) => charge.status === "Pending"
  ).length;

  const overdueCharges = financialCharges.filter(
    (charge) => charge.status === "Overdue"
  ).length;

  const paymentRate =
    financialCharges.length > 0
      ? Math.round((paidCharges / financialCharges.length) * 100)
      : 0;

  const expenseRate =
    totalReceivable > 0 ? Math.round((totalPayable / totalReceivable) * 100) : 0;

  const recentExpenses = expenses.slice(-5).reverse();
  const recentCharges = financialCharges.slice(0, 5);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Financeiro
            </h1>
            <p className="mt-2 text-slate-500">
              Visão consolidada de receitas, despesas, cobranças e resultado financeiro.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm">
            📅 Competência atual
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <FinancialCard
            icon="📥"
            title="Total a receber"
            value={formatCurrency(totalReceivable)}
            detail={`${activeContracts} contratos ativos`}
          />

          <FinancialCard
            icon="📤"
            title="Total a pagar"
            value={formatCurrency(totalPayable)}
            detail={`${expenses.length} despesas cadastradas`}
          />

          <FinancialCard
            icon="📊"
            title="Lucro estimado"
            value={formatCurrency(estimatedProfit)}
            detail="Receber - pagar"
            isPositive={estimatedProfit >= 0}
          />

          <FinancialCard
            icon="✅"
            title="Lucro realizado"
            value={formatCurrency(realizedProfit)}
            detail="Recebido - despesas"
            isPositive={realizedProfit >= 0}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <StatusCard
            title="Recebido"
            value={formatCurrency(totalReceived)}
            amount={paidCharges}
            description="Cobranças pagas"
            badge="Pago"
            badgeClassName="bg-emerald-100 text-emerald-700"
          />

          <StatusCard
            title="Pendente"
            value={formatCurrency(totalPending)}
            amount={pendingCharges}
            description="Aguardando pagamento"
            badge="Pendente"
            badgeClassName="bg-yellow-100 text-yellow-700"
          />

          <StatusCard
            title="Vencido"
            value={formatCurrency(totalOverdue)}
            amount={overdueCharges}
            description="Pagamentos em atraso"
            badge="Vencido"
            badgeClassName="bg-red-100 text-red-700"
          />

          <StatusCard
            title="Taxa de pagamento"
            value={`${paymentRate}%`}
            amount={financialCharges.length}
            description="Cobranças da competência"
            badge="Indicador"
            badgeClassName="bg-orange-100 text-orange-700"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-950">
                Resultado financeiro
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Comparativo entre receitas previstas, valores recebidos e despesas.
              </p>
            </div>

            <div className="space-y-6">
              <FinancialProgress
                label="Receita prevista"
                value={totalReceivable}
                maxValue={Math.max(totalReceivable, totalPayable, 1)}
                className="bg-orange-500"
              />

              <FinancialProgress
                label="Receita recebida"
                value={totalReceived}
                maxValue={Math.max(totalReceivable, totalPayable, 1)}
                className="bg-emerald-500"
              />

              <FinancialProgress
                label="Despesas"
                value={totalPayable}
                maxValue={Math.max(totalReceivable, totalPayable, 1)}
                className="bg-red-500"
              />

              <div className="rounded-2xl bg-orange-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      Margem estimada
                    </p>
                    <h3 className="mt-1 text-3xl font-black text-slate-950">
                      {totalReceivable > 0
                        ? `${Math.round((estimatedProfit / totalReceivable) * 100)}%`
                        : "0%"}
                    </h3>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-500">
                      Peso das despesas
                    </p>
                    <h3 className="mt-1 text-3xl font-black text-orange-600">
                      {expenseRate}%
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-2">
            <h2 className="text-xl font-black text-slate-950">
              Resumo operacional
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Indicadores principais do financeiro.
            </p>

            <div className="mt-6 space-y-4">
              <OperationalItem
                label="Contratos ativos"
                value={activeContracts}
                icon="📄"
              />

              <OperationalItem
                label="Cobranças geradas"
                value={financialCharges.length}
                icon="📥"
              />

              <OperationalItem
                label="Despesas cadastradas"
                value={expenses.length}
                icon="📤"
              />

              <OperationalItem
                label="Imóveis cadastrados"
                value={properties.length}
                icon="🏢"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Últimas cobranças
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Contas a receber geradas pelos contratos ativos.
                </p>
              </div>

              <a
                href="/contas-receber"
                className="text-sm font-black text-orange-600 transition hover:text-orange-700"
              >
                Ver todas
              </a>
            </div>

            {recentCharges.length === 0 ? (
              <EmptyState message="Nenhuma cobrança encontrada." />
            ) : (
              <div className="space-y-3">
                {recentCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"
                  >
                    <div>
                      <p className="font-black text-slate-800">
                        {charge.propertyName}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        {charge.tenantName}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-slate-900">
                        {formatCurrency(charge.amount)}
                      </p>
                      <PaymentStatusBadge status={charge.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Últimas despesas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Contas a pagar cadastradas manualmente.
                </p>
              </div>

              <a
                href="/contas-pagar"
                className="text-sm font-black text-orange-600 transition hover:text-orange-700"
              >
                Ver todas
              </a>
            </div>

            {recentExpenses.length === 0 ? (
              <EmptyState message="Nenhuma despesa cadastrada." />
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"
                  >
                    <div>
                      <p className="font-black text-slate-800">
                        {expense.description}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        {formatDate(expense.date)}
                      </p>
                    </div>

                    <p className="font-black text-red-600">
                      - {formatCurrency(expense.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function buildCurrentMonthDueDate(startDate: string) {
  const today = new Date();
  const contractStartDate = new Date(startDate);

  const dueDay = Number.isNaN(contractStartDate.getDate())
    ? 10
    : contractStartDate.getDate();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dueDay).padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

type FinancialCardProps = {
  icon: string;
  title: string;
  value: string;
  detail: string;
  isPositive?: boolean;
};

function FinancialCard({
  icon,
  title,
  value,
  detail,
  isPositive = true,
}: FinancialCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>

      <h3
        className={`mt-3 text-3xl font-black ${
          isPositive ? "text-slate-950" : "text-red-600"
        }`}
      >
        {value}
      </h3>

      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

type StatusCardProps = {
  title: string;
  value: string;
  amount: number;
  description: string;
  badge: string;
  badgeClassName: string;
};

function StatusCard({
  title,
  value,
  amount,
  description,
  badge,
  badgeClassName,
}: StatusCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-black ${badgeClassName}`}>
          {badge}
        </span>

        <span className="text-sm font-black text-slate-400">{amount}</span>
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-3 text-sm font-semibold text-slate-500">{description}</p>
    </div>
  );
}

type FinancialProgressProps = {
  label: string;
  value: number;
  maxValue: number;
  className: string;
};

function FinancialProgress({
  label,
  value,
  maxValue,
  className,
}: FinancialProgressProps) {
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black text-slate-700">{label}</span>
        <span className="text-sm font-black text-slate-950">
          {formatCurrency(value)}
        </span>
      </div>

      <div className="h-3 rounded-full bg-slate-100">
        <div
          className={`h-3 rounded-full ${className}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

type OperationalItemProps = {
  label: string;
  value: number;
  icon: string;
};

function OperationalItem({ label, value, icon }: OperationalItemProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          {icon}
        </span>

        <span className="font-bold text-slate-600">{label}</span>
      </div>

      <span className="text-xl font-black text-slate-950">{value}</span>
    </div>
  );
}

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
};

function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const statusConfig = {
    Pending: {
      label: "Pendente",
      className: "bg-yellow-100 text-yellow-700",
    },
    Paid: {
      label: "Pago",
      className: "bg-emerald-100 text-emerald-700",
    },
    Overdue: {
      label: "Vencido",
      className: "bg-red-100 text-red-700",
    },
  };

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <p className="text-sm font-semibold text-slate-500">{message}</p>
    </div>
  );
}