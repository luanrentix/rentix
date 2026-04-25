"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type Contract = {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  value?: number | string;
  amount?: number | string;
  rentValue?: number | string;
  monthlyValue?: number | string;
  status: "Active" | "Finished";
};

type Property = {
  id: string;
  name: string;
};

type Tenant = {
  id: string;
  name: string;
};

type Charge = {
  id: string;
  property: string;
  tenant: string;
  dueDate: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
  manual?: boolean;
};

type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";

export default function AccountsReceivablePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paid, setPaid] = useState<string[]>([]);
  const [manualCharges, setManualCharges] = useState<Charge[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const [formTenant, setFormTenant] = useState("");
  const [formProperty, setFormProperty] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("");

  useEffect(() => {
    const c = localStorage.getItem("rentix_contracts");
    const p = localStorage.getItem("rentix_properties");
    const t = localStorage.getItem("rentix_tenants");
    const paidData = localStorage.getItem("rentix_paid_charges");
    const manualData = localStorage.getItem("rentix_manual_charges");
    const savedStatusFilter = localStorage.getItem(
      "rentix_receivable_status_filter",
    );

    if (c) setContracts(JSON.parse(c));
    if (p) setProperties(JSON.parse(p));
    if (t) setTenants(JSON.parse(t));
    if (paidData) setPaid(JSON.parse(paidData));
    if (manualData) setManualCharges(JSON.parse(manualData));

    if (
      savedStatusFilter === "All" ||
      savedStatusFilter === "Pending" ||
      savedStatusFilter === "Paid" ||
      savedStatusFilter === "Overdue"
    ) {
      setStatusFilter(savedStatusFilter);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rentix_receivable_status_filter", statusFilter);
  }, [statusFilter]);

  function normalizeAmount(value: unknown) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const normalizedValue = value
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();

      const parsedValue = Number(normalizedValue);

      return Number.isFinite(parsedValue) ? parsedValue : 0;
    }

    return 0;
  }

  function getContractAmount(contract: Contract) {
    return normalizeAmount(
      contract.value ??
        contract.amount ??
        contract.rentValue ??
        contract.monthlyValue ??
        0,
    );
  }

  const automaticCharges = useMemo(() => {
    const today = new Date();

    return contracts
      .filter((contract) => contract.status === "Active")
      .map((contract) => {
        const property = properties.find(
          (item) => item.id === contract.propertyId,
        );

        const tenant = tenants.find((item) => item.id === contract.tenantId);

        const dueDate = new Date();
        dueDate.setDate(new Date(contract.startDate).getDate());

        const id = `${contract.id}-${dueDate.toISOString()}`;
        const isPaid = paid.includes(id);

        let status: Charge["status"] = "Pending";

        if (isPaid) {
          status = "Paid";
        } else if (dueDate < today) {
          status = "Overdue";
        }

        return {
          id,
          property: property?.name || "Imóvel",
          tenant: tenant?.name || "Inquilino",
          dueDate: dueDate.toISOString(),
          amount: getContractAmount(contract),
          status,
        };
      });
  }, [contracts, properties, tenants, paid]);

  const manualChargesWithStatus = useMemo(() => {
    const today = new Date();

    return manualCharges.map((charge) => {
      let status: Charge["status"] = "Pending";

      if (paid.includes(charge.id)) {
        status = "Paid";
      } else if (new Date(charge.dueDate) < today) {
        status = "Overdue";
      }

      return {
        ...charge,
        status,
      };
    });
  }, [manualCharges, paid]);

  const charges = useMemo(() => {
    return [...automaticCharges, ...manualChargesWithStatus];
  }, [automaticCharges, manualChargesWithStatus]);

  const filteredCharges = useMemo(() => {
    let result = charges;

    if (selectedTenant) {
      result = result.filter(
        (charge) =>
          charge.tenant.toLowerCase() === selectedTenant.name.toLowerCase(),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((charge) => charge.status === statusFilter);
    }

    return result;
  }, [charges, selectedTenant, statusFilter]);

  const totalReceivable = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status !== "Paid")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const totalPaid = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const totalOverdue = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tenants, search]);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(value) ? value : 0);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR");
  }

  function getStatusLabel(status: Charge["status"]) {
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Pendente";
  }

  function getStatusClassName(status: Charge["status"]) {
    if (status === "Paid") {
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    }

    if (status === "Overdue") {
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    }

    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  function getStatusFilterLabel(status: StatusFilter) {
    if (status === "Pending") return "Pendente";
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Todos";
  }

  function markPaid(id: string) {
    const updated = [...paid, id];

    setPaid(updated);
    localStorage.setItem("rentix_paid_charges", JSON.stringify(updated));
  }

  function clearTenantFilter() {
    setSelectedTenant(null);
    setSearch("");
    setIsSearchOpen(false);
  }

  function clearAllFilters() {
    setSelectedTenant(null);
    setSearch("");
    setStatusFilter("All");
  }

  function resetCreateForm() {
    setFormTenant("");
    setFormProperty("");
    setFormAmount("");
    setFormDate("");
  }

  function closeCreateModal() {
    resetCreateForm();
    setIsCreateOpen(false);
  }

  function createManualCharge() {
    if (!formTenant || !formProperty || !formAmount || !formDate) return;

    const tenant = tenants.find((item) => item.id === formTenant);
    const property = properties.find((item) => item.id === formProperty);

    if (!tenant || !property) return;

    const newCharge: Charge = {
      id: `manual-${Date.now()}`,
      property: property.name,
      tenant: tenant.name,
      dueDate: new Date(formDate).toISOString(),
      amount: normalizeAmount(formAmount),
      status: "Pending",
      manual: true,
    };

    const updatedManualCharges = [...manualCharges, newCharge];

    setManualCharges(updatedManualCharges);
    localStorage.setItem(
      "rentix_manual_charges",
      JSON.stringify(updatedManualCharges),
    );

    closeCreateModal();
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Contas a Receber
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Acompanhe cobranças geradas automaticamente pelos contratos ativos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Total a Receber" value={formatCurrency(totalReceivable)} />
          <Card title="Total Recebido" value={formatCurrency(totalPaid)} green />
          <Card title="Total Vencido" value={formatCurrency(totalOverdue)} red />
          <Card title="Cobranças" value={filteredCharges.length} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Filtros Financeiros
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Refine a visualização sem alterar os dados originais.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["All", "Pending", "Paid", "Overdue"] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      statusFilter === status
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {getStatusFilterLabel(status)}
                  </button>
                ),
              )}

              <button
                onClick={clearAllFilters}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {(selectedTenant || statusFilter !== "All") && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-orange-700">
                Filtro aplicado
              </p>

              <p className="text-sm text-slate-700">
                {selectedTenant ? (
                  <>
                    Inquilino: <strong>{selectedTenant.name}</strong>
                  </>
                ) : (
                  "Todos os inquilinos"
                )}{" "}
                · Status: <strong>{getStatusFilterLabel(statusFilter)}</strong>.
              </p>
            </div>

            <button
              onClick={clearAllFilters}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm ring-1 ring-orange-200 transition hover:bg-orange-100"
            >
              Remover filtros
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Lista de Contas a Receber
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Visualize os recebimentos pendentes, pagos e vencidos.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Nova cobrança
                </button>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Buscar inquilino
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900">
                    Imóvel
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900">
                    Inquilino
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Vencimento
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Valor
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCharges.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      Nenhuma conta a receber encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((charge) => (
                    <tr
                      key={charge.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">
                        {charge.property}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {charge.tenant}
                      </td>

                      <td className="px-5 py-4 text-center text-sm text-slate-600">
                        {formatDate(charge.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-center text-sm font-bold text-slate-900">
                        {formatCurrency(charge.amount)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                            charge.status,
                          )}`}
                        >
                          {getStatusLabel(charge.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {charge.status !== "Paid" ? (
                          <button
                            onClick={() => markPaid(charge.id)}
                            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-emerald-600">
                            Recebido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl shadow-lg shadow-orange-500/20">
                    🔎
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Buscar por Inquilino
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Selecione um inquilino para visualizar somente as contas
                      dele.
                    </p>
                  </div>
                </div>

                <button
                  onClick={clearTenantFilter}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fechar busca"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nome do inquilino
                </label>

                <input
                  placeholder="Digite para buscar..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredTenants.length === 0 ? (
                    <div className="rounded-xl bg-white p-5 text-center text-sm text-slate-500">
                      Nenhum inquilino encontrado.
                    </div>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setIsSearchOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-100 transition hover:bg-orange-50 hover:ring-orange-200"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {tenant.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            Clique para filtrar as contas
                          </p>
                        </div>

                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                          Selecionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 md:flex-row md:justify-end">
                <button
                  onClick={clearTenantFilter}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Ver todas as contas
                </button>

                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl shadow-lg shadow-emerald-600/20">
                    💰
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Nova cobrança
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Cadastre uma conta a receber manual sem alterar os
                      contratos.
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeCreateModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fechar cadastro"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Inquilino
                </label>

                <select
                  value={formTenant}
                  onChange={(event) => setFormTenant(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Selecione o inquilino</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Imóvel
                </label>

                <select
                  value={formProperty}
                  onChange={(event) => setFormProperty(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Selecione o imóvel</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Valor
                  </label>

                  <input
                    placeholder="Ex: 1500,00"
                    value={formAmount}
                    onChange={(event) => setFormAmount(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Vencimento
                  </label>

                  <input
                    type="date"
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 md:flex-row md:justify-end">
                <button
                  onClick={closeCreateModal}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  onClick={createManualCharge}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Salvar cobrança
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Card({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: React.ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <h2
        className={`mt-2 text-2xl font-black ${
          green
            ? "text-emerald-600"
            : red
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}