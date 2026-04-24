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
  value?: number;
  rentValue?: number;
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

  /* ✅ SALVAR PAGAMENTOS */
  useEffect(() => {
    localStorage.setItem(
      "rentix_paid_charges",
      JSON.stringify(paidChargeIds)
    );
  }, [paidChargeIds]);

  /* ✅ COBRANÇAS */
  const financialCharges = useMemo(() => {
    const today = new Date();

    return contracts
      .filter((contract) => contract.status === "Active")
      .map((contract) => {
        const property = properties.find(
          (p) => p.id === contract.propertyId
        );

        const tenant = tenants.find(
          (t) => t.id === contract.tenantId
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
          amount: getContractValue(contract),
          status: isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending",
        } as FinancialCharge;
      });
  }, [contracts, properties, tenants, paidChargeIds]);

  /* ✅ AÇÕES */
  function handleMarkAsPaid(id: string) {
    setPaidChargeIds((prev) => [...prev, id]);
  }

  function handleUndoPayment(id: string) {
    setPaidChargeIds((prev) => prev.filter((item) => item !== id));
  }

  /* MÉTRICAS (sem alteração) */
  const totalReceivable = financialCharges.reduce(
    (t, c) => t + Number(c.amount || 0),
    0
  );

  const totalReceived = financialCharges
    .filter((c) => c.status === "Paid")
    .reduce((t, c) => t + Number(c.amount || 0), 0);

  const totalPending = financialCharges
    .filter((c) => c.status === "Pending")
    .reduce((t, c) => t + Number(c.amount || 0), 0);

  const totalOverdue = financialCharges
    .filter((c) => c.status === "Overdue")
    .reduce((t, c) => t + Number(c.amount || 0), 0);

  const recentCharges = financialCharges.slice(0, 10);

  return (
    <AppShell>
      <div className="space-y-6">

        {/* LISTA DE COBRANÇAS */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-black mb-4">
            Contas a Receber
          </h2>

          {recentCharges.map((charge) => (
            <div
              key={charge.id}
              className="flex justify-between items-center p-4 border-b"
            >
              <div>
                <p className="font-bold">{charge.propertyName}</p>
                <p className="text-sm text-gray-500">
                  {charge.tenantName}
                </p>
              </div>

              <div className="text-right">
                <p>{formatDate(charge.dueDate)}</p>
                <p className="font-bold">
                  {formatCurrency(charge.amount)}
                </p>
              </div>

              <div>
                {charge.status === "Paid" ? (
                  <button
                    onClick={() => handleUndoPayment(charge.id)}
                    className="text-sm bg-gray-200 px-3 py-2 rounded-xl"
                  >
                    Desfazer
                  </button>
                ) : (
                  <button
                    onClick={() => handleMarkAsPaid(charge.id)}
                    className="text-sm bg-green-500 text-white px-3 py-2 rounded-xl"
                  >
                    Receber
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}

/* HELPERS */

function getContractValue(contract: Contract) {
  return Number(contract.value ?? contract.rentValue ?? 0);
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function buildCurrentMonthDueDate(startDate: string) {
  const today = new Date();
  const start = new Date(startDate);

  const day = Number.isNaN(start.getDate()) ? 10 : start.getDate();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}