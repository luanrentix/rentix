"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type PropertyStatus = "Available" | "Rented";

type Property = {
  id: string;
  name: string;
  address?: string;
  rentValue?: number;
  status?: PropertyStatus;
};

type Tenant = {
  id: string | number;
  name: string;
  phone?: string;
  document?: string;
};

type ContractStatus =
  | "Active"
  | "Inactive"
  | "Canceled"
  | "Finished"
  | "Deleted";

type Contract = {
  id: string | number;
  propertyId: string;
  propertyName?: string;
  tenantId: string | number;
  tenantName?: string;
  startDate: string;
  endDate?: string;
  rentValue?: number;
  value?: number;
  status?: ContractStatus;
};

type PayableStatus = "Pending" | "Paid" | "Overdue" | "Canceled";

type PayableAccount = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string | null;
  status: PayableStatus;
  propertyId?: string;
  propertyName?: string;
  createdAt: string;
  canceledAt?: string | null;
};

type ReceivableStatus = "Pending" | "Paid" | "Overdue" | "Canceled";

type ReceivableCharge = {
  id: string;
  contractId: string;
  propertyName: string;
  tenantName: string;
  dueDate: string;
  amount: number;
  status: ReceivableStatus;
  paymentDate?: string | null;
  canceledAt?: string | null;
};

type FinanceStatusFilter = "All" | ReceivableStatus;

const PROPERTIES_STORAGE_KEY = "rentix_properties";
const TENANTS_STORAGE_KEY = "rentix_tenants";
const CONTRACTS_STORAGE_KEY = "rentix_contracts";
const PAYABLES_STORAGE_KEY = "rentix_payables";
const LEGACY_EXPENSES_STORAGE_KEY = "rentix_expenses";
const PAID_CHARGES_STORAGE_KEY = "rentix_paid_charges";
const CANCELED_CHARGES_STORAGE_KEY = "rentix_canceled_charges";

export default function FinancialPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payables, setPayables] = useState<PayableAccount[]>([]);
  const [paidChargeIds, setPaidChargeIds] = useState<string[]>([]);
  const [canceledChargeIds, setCanceledChargeIds] = useState<string[]>([]);
  const [receivableFilter, setReceivableFilter] =
    useState<FinanceStatusFilter>("All");

  const [isPayableFormOpen, setIsPayableFormOpen] = useState(false);
  const [payableDescription, setPayableDescription] = useState("");
  const [payableAmount, setPayableAmount] = useState("");
  const [payableDueDate, setPayableDueDate] = useState("");
  const [payablePropertyId, setPayablePropertyId] = useState("");

  useEffect(() => {
    const storedProperties = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const storedPayables = localStorage.getItem(PAYABLES_STORAGE_KEY);
    const legacyExpenses = localStorage.getItem(LEGACY_EXPENSES_STORAGE_KEY);
    const storedPaidCharges = localStorage.getItem(PAID_CHARGES_STORAGE_KEY);
    const storedCanceledCharges = localStorage.getItem(CANCELED_CHARGES_STORAGE_KEY);

    if (storedProperties) {
      setProperties(JSON.parse(storedProperties));
    }

    if (storedTenants) {
      setTenants(JSON.parse(storedTenants));
    }

    if (storedContracts) {
      setContracts(JSON.parse(storedContracts));
    }

    if (storedPayables) {
      setPayables(JSON.parse(storedPayables));
    } else if (legacyExpenses) {
      const parsedExpenses = JSON.parse(legacyExpenses) as Array<{
        id: string;
        description: string;
        amount: number;
        date: string;
        propertyId?: string;
      }>;

      const migratedPayables = parsedExpenses.map((expense) => ({
        id: expense.id || crypto.randomUUID(),
        description: expense.description || "Despesa",
        amount: Number(expense.amount || 0),
        dueDate: expense.date || getTodayDate(),
        status: "Pending" as PayableStatus,
        propertyId: expense.propertyId || "",
        propertyName: "",
        paymentDate: null,
        createdAt: new Date().toISOString(),
        canceledAt: null,
      }));

      setPayables(migratedPayables);
      localStorage.setItem(PAYABLES_STORAGE_KEY, JSON.stringify(migratedPayables));
    }

    if (storedPaidCharges) {
      setPaidChargeIds(JSON.parse(storedPaidCharges));
    }

    if (storedCanceledCharges) {
      setCanceledChargeIds(JSON.parse(storedCanceledCharges));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PAYABLES_STORAGE_KEY, JSON.stringify(payables));
  }, [payables]);

  useEffect(() => {
    localStorage.setItem(PAID_CHARGES_STORAGE_KEY, JSON.stringify(paidChargeIds));
  }, [paidChargeIds]);

  useEffect(() => {
    localStorage.setItem(
      CANCELED_CHARGES_STORAGE_KEY,
      JSON.stringify(canceledChargeIds)
    );
  }, [canceledChargeIds]);

  const receivableCharges = useMemo(() => {
    const today = getTodayDate();

    return contracts
      .filter((contract) => getContractDisplayStatus(contract) === "Active")
      .map((contract) => {
        const property = properties.find(
          (propertyItem) => String(propertyItem.id) === String(contract.propertyId)
        );

        const tenant = tenants.find(
          (tenantItem) => String(tenantItem.id) === String(contract.tenantId)
        );

        const dueDate = buildCurrentMonthDueDate(contract.startDate);
        const chargeId = `${contract.id}-${dueDate}`;

        const isPaid = paidChargeIds.includes(chargeId);
        const isCanceled = canceledChargeIds.includes(chargeId);
        const isOverdue = dueDate < today && !isPaid && !isCanceled;

        return {
          id: chargeId,
          contractId: String(contract.id),
          propertyName:
            contract.propertyName || property?.name || "Imóvel não encontrado",
          tenantName:
            contract.tenantName || tenant?.name || "Inquilino não encontrado",
          dueDate,
          amount: getContractValue(contract),
          status: isCanceled
            ? "Canceled"
            : isPaid
              ? "Paid"
              : isOverdue
                ? "Overdue"
                : "Pending",
          paymentDate: isPaid ? getTodayDate() : null,
          canceledAt: isCanceled ? getTodayDate() : null,
        } as ReceivableCharge;
      });
  }, [contracts, properties, tenants, paidChargeIds, canceledChargeIds]);

  const filteredReceivables = useMemo(() => {
    if (receivableFilter === "All") return receivableCharges;

    return receivableCharges.filter((charge) => charge.status === receivableFilter);
  }, [receivableCharges, receivableFilter]);

  const totalReceivable = receivableCharges
    .filter((charge) => charge.status !== "Canceled")
    .reduce((total, charge) => total + Number(charge.amount || 0), 0);

  const totalReceived = receivableCharges
    .filter((charge) => charge.status === "Paid")
    .reduce((total, charge) => total + Number(charge.amount || 0), 0);

  const totalPending = receivableCharges
    .filter((charge) => charge.status === "Pending")
    .reduce((total, charge) => total + Number(charge.amount || 0), 0);

  const totalOverdue = receivableCharges
    .filter((charge) => charge.status === "Overdue")
    .reduce((total, charge) => total + Number(charge.amount || 0), 0);

  const totalPayable = payables
    .filter((payable) => payable.status !== "Canceled")
    .reduce((total, payable) => total + Number(payable.amount || 0), 0);

  const totalPaidPayables = payables
    .filter((payable) => payable.status === "Paid")
    .reduce((total, payable) => total + Number(payable.amount || 0), 0);

  const totalOpenPayables = payables
    .filter((payable) => payable.status === "Pending" || payable.status === "Overdue")
    .reduce((total, payable) => total + Number(payable.amount || 0), 0);

  const estimatedProfit = totalReceivable - totalPayable;
  const realizedProfit = totalReceived - totalPaidPayables;

  const paidCharges = receivableCharges.filter(
    (charge) => charge.status === "Paid"
  ).length;

  const paymentRate =
    receivableCharges.length > 0
      ? Math.round((paidCharges / receivableCharges.length) * 100)
      : 0;

  function handleMarkReceivableAsPaid(chargeId: string) {
    setPaidChargeIds((currentIds) =>
      currentIds.includes(chargeId) ? currentIds : [...currentIds, chargeId]
    );

    setCanceledChargeIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== chargeId)
    );
  }

  function handleUndoReceivablePayment(chargeId: string) {
    setPaidChargeIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== chargeId)
    );
  }

  function handleCancelReceivable(chargeId: string) {
    setCanceledChargeIds((currentIds) =>
      currentIds.includes(chargeId) ? currentIds : [...currentIds, chargeId]
    );

    setPaidChargeIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== chargeId)
    );
  }

  function handleCreatePayable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const property = properties.find(
      (propertyItem) => String(propertyItem.id) === String(payablePropertyId)
    );

    const newPayable: PayableAccount = {
      id: crypto.randomUUID(),
      description: payableDescription,
      amount: Number(payableAmount),
      dueDate: payableDueDate,
      propertyId: payablePropertyId || "",
      propertyName: property?.name || "",
      status: getPayableStatus(payableDueDate, false, false),
      paymentDate: null,
      createdAt: new Date().toISOString(),
      canceledAt: null,
    };

    setPayables((currentPayables) => [newPayable, ...currentPayables]);
    resetPayableForm();
  }

  function resetPayableForm() {
    setPayableDescription("");
    setPayableAmount("");
    setPayableDueDate("");
    setPayablePropertyId("");
    setIsPayableFormOpen(false);
  }

  function handleMarkPayableAsPaid(payableId: string) {
    setPayables((currentPayables) =>
      currentPayables.map((payable) =>
        payable.id === payableId
          ? {
              ...payable,
              status: "Paid",
              paymentDate: getTodayDate(),
            }
          : payable
      )
    );
  }

  function handleUndoPayablePayment(payableId: string) {
    setPayables((currentPayables) =>
      currentPayables.map((payable) =>
        payable.id === payableId
          ? {
              ...payable,
              status: getPayableStatus(payable.dueDate, false, false),
              paymentDate: null,
            }
          : payable
      )
    );
  }

  function handleCancelPayable(payableId: string) {
    setPayables((currentPayables) =>
      currentPayables.map((payable) =>
        payable.id === payableId
          ? {
              ...payable,
              status: "Canceled",
              canceledAt: new Date().toISOString(),
            }
          : payable
      )
    );
  }

  const normalizedPayables = payables.map((payable) => ({
    ...payable,
    status:
      payable.status === "Paid" || payable.status === "Canceled"
        ? payable.status
        : getPayableStatus(payable.dueDate, false, false),
  }));

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Financeiro
            </h1>
            <p className="mt-2 text-slate-500">
              Controle empresarial de receitas, despesas, baixas, estornos e
              resultado financeiro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPayableFormOpen(true)}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Nova conta a pagar
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <FinancialCard
            icon="📥"
            title="Total a receber"
            value={formatCurrency(totalReceivable)}
            detail={`${receivableCharges.length} cobrança(s)`}
          />

          <FinancialCard
            icon="✅"
            title="Recebido"
            value={formatCurrency(totalReceived)}
            detail={`${paymentRate}% de recebimento`}
          />

          <FinancialCard
            icon="📤"
            title="Total a pagar"
            value={formatCurrency(totalPayable)}
            detail={`${payables.length} conta(s)`}
          />

          <FinancialCard
            icon="📊"
            title="Lucro estimado"
            value={formatCurrency(estimatedProfit)}
            detail="Receber - pagar"
            isPositive={estimatedProfit >= 0}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            title="Pendente"
            value={formatCurrency(totalPending)}
            amount={receivableCharges.filter((charge) => charge.status === "Pending").length}
            description="Recebimentos aguardando baixa"
            badge="A receber"
            badgeClassName="bg-yellow-100 text-yellow-700"
          />

          <StatusCard
            title="Vencido"
            value={formatCurrency(totalOverdue)}
            amount={receivableCharges.filter((charge) => charge.status === "Overdue").length}
            description="Recebimentos em atraso"
            badge="Atenção"
            badgeClassName="bg-red-100 text-red-700"
          />

          <StatusCard
            title="Pago em despesas"
            value={formatCurrency(totalPaidPayables)}
            amount={normalizedPayables.filter((payable) => payable.status === "Paid").length}
            description="Contas pagas"
            badge="Pago"
            badgeClassName="bg-emerald-100 text-emerald-700"
          />

          <StatusCard
            title="Saldo realizado"
            value={formatCurrency(realizedProfit)}
            amount={normalizedPayables.filter((payable) => payable.status !== "Canceled").length}
            description="Recebido - contas pagas"
            badge="Realizado"
            badgeClassName="bg-orange-100 text-orange-700"
          />
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Contas a receber
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Cobranças geradas automaticamente pelos contratos ativos.
              </p>
            </div>

            <FormField label="Filtrar por status">
              <select
                value={receivableFilter}
                onChange={(event) =>
                  setReceivableFilter(event.target.value as FinanceStatusFilter)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-64"
              >
                <option value="All">Todos</option>
                <option value="Pending">Pendentes</option>
                <option value="Paid">Pagos</option>
                <option value="Overdue">Vencidos</option>
                <option value="Canceled">Cancelados</option>
              </select>
            </FormField>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Imóvel
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Inquilino
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Vencimento
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredReceivables.map((charge) => (
                  <tr key={charge.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {charge.propertyName}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {charge.tenantName}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatDate(charge.dueDate)}
                    </td>

                    <td className="px-6 py-4 text-sm font-black text-slate-900">
                      {formatCurrency(charge.amount)}
                    </td>

                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={charge.status} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {charge.status === "Paid" ? (
                          <button
                            type="button"
                            onClick={() => handleUndoReceivablePayment(charge.id)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            Estornar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkReceivableAsPaid(charge.id)}
                            disabled={charge.status === "Canceled"}
                            className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Receber
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCancelReceivable(charge.id)}
                          disabled={charge.status === "Canceled"}
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredReceivables.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhuma conta a receber encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-2xl font-black text-slate-950">
              Contas a pagar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Despesas cadastradas manualmente com baixa e cancelamento.
            </p>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Descrição
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Imóvel
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Vencimento
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {normalizedPayables.map((payable) => (
                  <tr key={payable.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {payable.description}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {payable.propertyName || "Geral"}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatDate(payable.dueDate)}
                    </td>

                    <td className="px-6 py-4 text-sm font-black text-red-600">
                      - {formatCurrency(payable.amount)}
                    </td>

                    <td className="px-6 py-4">
                      <PayableStatusBadge status={payable.status} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {payable.status === "Paid" ? (
                          <button
                            type="button"
                            onClick={() => handleUndoPayablePayment(payable.id)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            Estornar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkPayableAsPaid(payable.id)}
                            disabled={payable.status === "Canceled"}
                            className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Pagar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCancelPayable(payable.id)}
                          disabled={payable.status === "Canceled"}
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {normalizedPayables.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhuma conta a pagar cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isPayableFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Nova conta a pagar
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Cadastre uma despesa operacional do sistema.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetPayableForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreatePayable}>
                <div className="grid gap-5 p-8 md:grid-cols-2 xl:grid-cols-4">
                  <FormField label="Descrição">
                    <input
                      type="text"
                      value={payableDescription}
                      onChange={(event) => setPayableDescription(event.target.value)}
                      placeholder="Ex: Manutenção, IPTU, limpeza..."
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Valor">
                    <input
                      type="number"
                      value={payableAmount}
                      onChange={(event) => setPayableAmount(event.target.value)}
                      placeholder="Ex: 350"
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Vencimento">
                    <input
                      type="date"
                      value={payableDueDate}
                      onChange={(event) => setPayableDueDate(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Imóvel vinculado">
                    <select
                      value={payablePropertyId}
                      onChange={(event) => setPayablePropertyId(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="">Despesa geral</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                  <button
                    type="button"
                    onClick={resetPayableForm}
                    className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Cadastrar conta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
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

function PaymentStatusBadge({ status }: { status: ReceivableStatus }) {
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
    Canceled: {
      label: "Cancelado",
      className: "bg-slate-100 text-slate-600",
    },
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function PayableStatusBadge({ status }: { status: PayableStatus }) {
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
    Canceled: {
      label: "Cancelado",
      className: "bg-slate-100 text-slate-600",
    },
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function getContractDisplayStatus(contract: Contract): ContractStatus {
  if (contract.status === "Deleted") return "Deleted";
  if (contract.status === "Canceled") return "Canceled";
  if (contract.status === "Finished") return "Finished";
  if (contract.status === "Inactive") return "Inactive";
  if (contract.status === "Active") return getAutomaticContractStatus(contract.endDate);

  return getAutomaticContractStatus(contract.endDate);
}

function getAutomaticContractStatus(endDate?: string): ContractStatus {
  if (!endDate) return "Active";

  const today = new Date();
  const contractEndDate = new Date(`${endDate}T23:59:59`);

  return contractEndDate >= today ? "Active" : "Inactive";
}

function getPayableStatus(
  dueDate: string,
  isPaid: boolean,
  isCanceled: boolean
): PayableStatus {
  if (isCanceled) return "Canceled";
  if (isPaid) return "Paid";

  return dueDate < getTodayDate() ? "Overdue" : "Pending";
}

function getContractValue(contract: Contract) {
  return Number(contract.rentValue ?? contract.value ?? 0);
}

function buildCurrentMonthDueDate(startDate: string) {
  const today = new Date();
  const contractStartDate = new Date(`${startDate}T00:00:00`);

  const dueDay = Number.isNaN(contractStartDate.getDate())
    ? 10
    : contractStartDate.getDate();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dueDay).padStart(2, "0")}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}