"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type Contract = {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  value: number;
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

export default function AccountsReceivablePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paid, setPaid] = useState<string[]>([]);

  useEffect(() => {
    const c = localStorage.getItem("rentix_contracts");
    const p = localStorage.getItem("rentix_properties");
    const t = localStorage.getItem("rentix_tenants");
    const paidData = localStorage.getItem("rentix_paid_charges");

    if (c) setContracts(JSON.parse(c));
    if (p) setProperties(JSON.parse(p));
    if (t) setTenants(JSON.parse(t));
    if (paidData) setPaid(JSON.parse(paidData));
  }, []);

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
          amount: c.value,
          status,
        };
      });
  }, [contracts, properties, tenants, paid]);

  function markPaid(id: string) {
    const updated = [...paid, id];
    setPaid(updated);
    localStorage.setItem("rentix_paid_charges", JSON.stringify(updated));
  }

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-black">Contas a Receber</h1>

      <div className="rounded-2xl border bg-white">
        <table className="w-full">
          <thead className="bg-orange-50">
            <tr>
              <th className="p-4 text-left">Imóvel</th>
              <th className="p-4 text-left">Inquilino</th>
              <th className="p-4">Vencimento</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ação</th>
            </tr>
          </thead>

          <tbody>
            {charges.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-4">{c.property}</td>
                <td className="p-4">{c.tenant}</td>
                <td className="p-4 text-center">
                  {new Date(c.dueDate).toLocaleDateString()}
                </td>
                <td className="p-4 text-center">R$ {c.amount}</td>
                <td className="p-4 text-center">{c.status}</td>
                <td className="p-4 text-center">
                  {c.status !== "Paid" && (
                    <button
                      onClick={() => markPaid(c.id)}
                      className="rounded bg-orange-500 px-4 py-2 text-white"
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
    </AppShell>
  );
}