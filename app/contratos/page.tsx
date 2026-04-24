"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { Tenant, initialTenants } from "@/data/tenants";

const CONTRACTS_STORAGE_KEY = "rentix_contracts";
const PROPERTIES_STORAGE_KEY = "rentix_properties";
const TENANTS_STORAGE_KEY = "rentix_tenants";

type PropertyStatus = "Available" | "Rented";

type Property = {
  id: string;
  name: string;
  rentValue?: number;
  status: PropertyStatus;
};

type RentixTenant = Tenant;

type ContractStatus = "Active" | "Inactive";

type Contract = {
  id: number;
  propertyId: string;
  propertyName: string;
  tenantId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentValue: number;
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");

  useEffect(() => {
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const storedProperties = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);

    if (storedContracts) {
      const parsedContracts = JSON.parse(storedContracts) as Contract[];

      const normalizedContracts = parsedContracts.map((contract) => ({
        ...contract,
        rentValue: Number(contract.rentValue || 0),
      }));

      setContracts(normalizedContracts);
    }

    if (storedProperties) {
      setProperties(JSON.parse(storedProperties) as Property[]);
    }

    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants) as RentixTenant[];
      setTenants(parsedTenants.length > 0 ? parsedTenants : initialTenants);
    } else {
      setTenants(initialTenants);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
  }, [contracts, isLoaded]);

  const availableProperties = useMemo(() => {
    return properties.filter((property) => {
      const hasActiveContract = contracts.some(
        (contract) =>
          String(contract.propertyId) === String(property.id) &&
          getContractStatus(contract.endDate) === "Active"
      );

      return property.status === "Available" && !hasActiveContract;
    });
  }, [properties, contracts]);

  function resetForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setEndDate("");
    setRentValue("");
    setFormError("");
    setIsFormOpen(false);
  }

  function handleOpenCreateForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setEndDate("");
    setRentValue("");
    setFormError("");
    setIsFormOpen(true);
  }

  function handleCreateContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(propertyId)
    );

    const selectedTenant = tenants.find(
      (tenant) => String(tenant.id) === String(tenantId)
    );

    if (!selectedProperty) {
      setFormError("Selecione um imóvel válido.");
      return;
    }

    if (!selectedTenant) {
      setFormError("Selecione um inquilino válido.");
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Informe a data de início e a data de fim do contrato.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError("A data de fim não pode ser menor que a data de início.");
      return;
    }

    if (!rentValue || Number(rentValue) <= 0) {
      setFormError("Informe um valor de aluguel válido.");
      return;
    }

    const newContract: Contract = {
      id: Date.now(),
      propertyId: selectedProperty.id,
      propertyName: selectedProperty.name,
      tenantId: selectedTenant.id,
      tenantName: selectedTenant.name,
      startDate,
      endDate,
      rentValue: Number(rentValue),
    };

    setContracts((currentContracts) => [newContract, ...currentContracts]);
    resetForm();
  }

  function handlePropertyChange(selectedPropertyId: string) {
    setPropertyId(selectedPropertyId);
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(selectedPropertyId)
    );

    if (selectedProperty) {
      setRentValue(String(selectedProperty.rentValue || ""));
    }
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Contratos
            </h1>
            <p className="mt-2 text-slate-500">
              Gerencie os contratos de locação.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Novo contrato
          </button>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-2xl font-black text-slate-950">
              Contratos cadastrados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {contracts.length} contrato(s) cadastrado(s)
            </p>
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
                    Início
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Fim
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {contract.propertyName}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {contract.tenantName}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatDate(contract.startDate)}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatDate(contract.endDate)}
                    </td>

                    <td className="px-6 py-4 text-sm font-black text-slate-900">
                      {formatCurrency(contract.rentValue)}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={getContractStatus(contract.endDate)} />
                    </td>
                  </tr>
                ))}

                {contracts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhum contrato cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Novo contrato
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados do contrato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateContract}>
                <div className="p-8">
                  {formError && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
                      {formError}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <FormField label="Imóvel">
                      <select
                        value={propertyId}
                        onChange={(event) =>
                          handlePropertyChange(event.target.value)
                        }
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Selecione um imóvel</option>
                        {availableProperties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Inquilino">
                      <select
                        value={tenantId}
                        onChange={(event) => {
                          setTenantId(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Selecione um inquilino</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Valor aluguel">
                      <input
                        type="number"
                        value={rentValue}
                        onChange={(event) => {
                          setRentValue(event.target.value);
                          setFormError("");
                        }}
                        placeholder="Ex: 1800"
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data início">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data fim">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => {
                          setEndDate(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Criar contrato
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

function StatusBadge({ status }: { status: ContractStatus }) {
  const statusConfig = {
    Active: {
      label: "Ativo",
      className: "bg-emerald-100 text-emerald-700",
    },
    Inactive: {
      label: "Inativo",
      className: "bg-slate-100 text-slate-600",
    },
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function getContractStatus(endDate: string): ContractStatus {
  if (!endDate) return "Inactive";

  const today = new Date();
  const contractEndDate = new Date(`${endDate}T23:59:59`);

  return contractEndDate >= today ? "Active" : "Inactive";
}

function formatCurrency(value?: number) {
  const safeValue = Number(value || 0);

  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}