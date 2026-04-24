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
};

type StatusFilter = "ALL" | "Pending" | "Paid" | "Overdue";

export default function AccountsReceivablePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paid, setPaid] = useState<string[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    const c = localStorage.getItem("rentix_contracts");
    const p = localStorage.getItem("rentix_properties");
    const t = localStorage.getItem("rentix_tenants");
    const paidData = localStorage.getItem("rentix_paid_charges");

    const savedStatus = localStorage.getItem("rentix_status_filter");

    if (c) setContracts(JSON.parse(c));
    if (p) setProperties(JSON.parse(p));
    if (t) setTenants(JSON.parse(t));
    if (paidData) setPaid(JSON.parse(paidData));
    if (savedStatus) setStatusFilter(savedStatus as StatusFilter);
  }, []);

  useEffect(() => {
    localStorage.setItem("rentix_status_filter", statusFilter);
  }, [statusFilter]);

  function normalizeAmount(value: unknown) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    if (typeof value === "string") {
      const v = value.replace("R$", "").replace(/\./g, "").replace(",", ".");
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
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

  const charges = useMemo(() => {
    const today = new Date();

    return contracts
      .filter((c) => c.status === "Active")
      .map((c) => {
        const property = properties.find((p) => p.id === c.propertyId);
        const tenant = tenants.find((t) => t.id === c.tenantId);

        const dueDate = new Date();
        dueDate.setDate(new Date(c.startDate).getDate());

        const id = `${c.id}-${dueDate.toISOString()}`;
        const isPaid = paid.includes(id);

        let status: Charge["status"] = "Pending";

        if (isPaid) status = "Paid";
        else if (dueDate < today) status = "Overdue";

        return {
          id,
          property: property?.name || "Imóvel",
          tenant: tenant?.name || "Inquilino",
          dueDate: dueDate.toISOString(),
          amount: getContractAmount(c),
          status,
        };
      });
  }, [contracts, properties, tenants, paid]);

  const filteredCharges = useMemo(() => {
    let result = charges;

    if (selectedTenant) {
      result = result.filter(
        (c) =>
          c.tenant.toLowerCase() === selectedTenant.name.toLowerCase(),
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    return result;
  }, [charges, selectedTenant, statusFilter]);

  const totalReceivable = useMemo(
    () =>
      filteredCharges
        .filter((c) => c.status !== "Paid")
        .reduce((t, c) => t + c.amount, 0),
    [filteredCharges],
  );

  const totalPaid = useMemo(
    () =>
      filteredCharges
        .filter((c) => c.status === "Paid")
        .reduce((t, c) => t + c.amount, 0),
    [filteredCharges],
  );

  const totalOverdue = useMemo(
    () =>
      filteredCharges
        .filter((c) => c.status === "Overdue")
        .reduce((t, c) => t + c.amount, 0),
    [filteredCharges],
  );

  function formatCurrency(v: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(v) ? v : 0);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("pt-BR");
  }

  function markPaid(id: string) {
    const updated = [...paid, id];
    setPaid(updated);
    localStorage.setItem("rentix_paid_charges", JSON.stringify(updated));
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <h1 className="text-3xl font-black">Contas a Receber</h1>

        {/* FILTROS ENTERPRISE */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "Pending", "Paid", "Overdue"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as StatusFilter)}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${
                statusFilter === status
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {status === "ALL"
                ? "Todos"
                : status === "Pending"
                ? "Pendente"
                : status === "Paid"
                ? "Pago"
                : "Vencido"}
            </button>
          ))}
        </div>

        {/* CARDS */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Total a Receber" value={formatCurrency(totalReceivable)} />
          <Card title="Recebido" value={formatCurrency(totalPaid)} green />
          <Card title="Vencido" value={formatCurrency(totalOverdue)} red />
          <Card title="Registros" value={filteredCharges.length} />
        </div>

        {/* TABELA */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-orange-50">
              <tr>
                <th className="p-4 text-left">Imóvel</th>
                <th className="p-4 text-left">Inquilino</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center">Valor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredCharges.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-4">{c.property}</td>
                  <td className="p-4">{c.tenant}</td>
                  <td className="p-4 text-center">
                    {formatDate(c.dueDate)}
                  </td>
                  <td className="p-4 text-center">
                    {formatCurrency(c.amount)}
                  </td>
                  <td className="p-4 text-center">{c.status}</td>
                  <td className="p-4 text-center">
                    {c.status !== "Paid" && (
                      <button
                        onClick={() => markPaid(c.id)}
                        className="bg-orange-500 text-white px-4 py-2 rounded"
                      >
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  value: any;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <h2
        className={`text-2xl font-black ${
          green ? "text-green-600" : red ? "text-red-600" : ""
        }`}
      >
        {value}
      </h2>
    </div>
  );
}