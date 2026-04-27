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

type RentixTenant = Tenant & {
  isTenant?: boolean;
};

type ContractStatus =
  | "Active"
  | "Inactive"
  | "Canceled"
  | "Finished"
  | "Deleted";

type ContractFilterStatus = "All" | ContractStatus;

type Contract = {
  id: number;
  propertyId: string;
  propertyName: string;
  tenantId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentValue: number;
  status?: ContractStatus;
  deletedAt?: string | null;
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingContractId, setEditingContractId] = useState<number | null>(
    null
  );
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<ContractFilterStatus>("All");

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [contractStatus, setContractStatus] =
    useState<ContractStatus>("Active");

  const isEditing = editingContractId !== null;

  useEffect(() => {
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const storedProperties = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);

    if (storedContracts) {
      const parsedContracts = JSON.parse(storedContracts) as Partial<Contract>[];

      const normalizedContracts: Contract[] = parsedContracts.map(
        (contract) => ({
          id: contract.id || Date.now(),
          propertyId: contract.propertyId || "",
          propertyName: contract.propertyName || "",
          tenantId: contract.tenantId || 0,
          tenantName: contract.tenantName || "",
          startDate: contract.startDate || "",
          endDate: contract.endDate || "",
          rentValue: Number(contract.rentValue || 0),
          status:
            contract.status ||
            getAutomaticContractStatus(contract.endDate || ""),
          deletedAt: contract.deletedAt || null,
        })
      );

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

    setProperties((currentProperties) => {
      const updatedProperties = syncPropertiesWithContracts(
        contracts,
        currentProperties
      );

      localStorage.setItem(
        PROPERTIES_STORAGE_KEY,
        JSON.stringify(updatedProperties)
      );

      return updatedProperties;
    });
  }, [contracts, isLoaded]);

  const availableProperties = useMemo(() => {
    return properties.filter((property) => {
      const hasActiveContract = contracts.some(
        (contract) =>
          String(contract.propertyId) === String(property.id) &&
          getDisplayContractStatus(contract) === "Active" &&
          contract.status !== "Deleted"
      );

      const isCurrentEditingProperty =
        isEditing && String(property.id) === String(propertyId);

      return (
        (property.status === "Available" && !hasActiveContract) ||
        isCurrentEditingProperty
      );
    });
  }, [properties, contracts, isEditing, propertyId]);

  const availableTenants = useMemo(() => {
    return tenants.filter((tenant) => tenant.isTenant !== false);
  }, [tenants]);

  const filteredContracts = useMemo(() => {
    if (statusFilter === "All") return contracts;

    return contracts.filter(
      (contract) => getDisplayContractStatus(contract) === statusFilter
    );
  }, [contracts, statusFilter]);

  function resetForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setEndDate("");
    setRentValue("");
    setContractStatus("Active");
    setFormError("");
    setEditingContractId(null);
    setIsFormOpen(false);
  }

  function handleOpenCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function handleEditContract(contract: Contract) {
    setEditingContractId(contract.id);
    setPropertyId(contract.propertyId);
    setTenantId(String(contract.tenantId));
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setRentValue(String(contract.rentValue || ""));
    setContractStatus(
      contract.status || getAutomaticContractStatus(contract.endDate)
    );
    setFormError("");
    setIsFormOpen(true);
  }

  function handleSubmitContract(event: React.FormEvent<HTMLFormElement>) {
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

    if (selectedTenant.isTenant === false) {
      setFormError("Esta pessoa não está marcada como inquilino.");
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

    if (isEditing) {
      setContracts((currentContracts) =>
        currentContracts.map((contract) =>
          contract.id === editingContractId
            ? {
                ...contract,
                propertyId: selectedProperty.id,
                propertyName: selectedProperty.name,
                tenantId: selectedTenant.id,
                tenantName: selectedTenant.name,
                startDate,
                endDate,
                rentValue: Number(rentValue),
                status: contractStatus,
                deletedAt:
                  contractStatus === "Deleted"
                    ? contract.deletedAt || new Date().toISOString()
                    : null,
              }
            : contract
        )
      );

      resetForm();
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
      status: contractStatus,
      deletedAt: contractStatus === "Deleted" ? new Date().toISOString() : null,
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

  function handleSoftDeleteContract() {
    if (!contractToDelete) return;

    setContracts((currentContracts) =>
      currentContracts.map((contract) =>
        contract.id === contractToDelete.id
          ? {
              ...contract,
              status: "Deleted",
              deletedAt: new Date().toISOString(),
            }
          : contract
      )
    );

    setContractToDelete(null);
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
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Contratos cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredContracts.length} de {contracts.length}{" "}
                contrato(s)
              </p>
            </div>

            <FormField label="Filtrar por status">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ContractFilterStatus)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-64"
              >
                <option value="All">Todos</option>
                <option value="Active">Ativos</option>
                <option value="Inactive">Inativos</option>
                <option value="Canceled">Cancelados</option>
                <option value="Finished">Finalizados</option>
                <option value="Deleted">Excluídos</option>
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
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className={`transition hover:bg-slate-50 ${
                      getDisplayContractStatus(contract) === "Deleted"
                        ? "bg-slate-50 opacity-70"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-black text-slate-900">
                      {contract.propertyName || "Não informado"}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {contract.tenantName || "Não informado"}
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
                      <StatusBadge status={getDisplayContractStatus(contract)} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditContract(contract)}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => setContractToDelete(contract)}
                          disabled={
                            getDisplayContractStatus(contract) === "Deleted"
                          }
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredContracts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhum contrato encontrado para este filtro.
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
                    {isEditing ? "Editar contrato" : "Novo contrato"}
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

              <form onSubmit={handleSubmitContract}>
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
                        {availableTenants.map((tenant) => (
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

                    <FormField label="Status">
                      <select
                        value={contractStatus}
                        onChange={(event) =>
                          setContractStatus(event.target.value as ContractStatus)
                        }
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="Active">Ativo</option>
                        <option value="Inactive">Inativo</option>
                        <option value="Canceled">Cancelado</option>
                        <option value="Finished">Finalizado</option>
                        <option value="Deleted">Excluído</option>
                      </select>
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
                    {isEditing ? "Salvar alterações" : "Criar contrato"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {contractToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                🗑️
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Excluir contrato?
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Este contrato não será apagado definitivamente. Ele ficará
                  registrado como excluído para manter o histórico do sistema.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">
                    {contractToDelete.propertyName || "Contrato"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {contractToDelete.tenantName || "Inquilino não informado"}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContractToDelete(null)}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSoftDeleteContract}
                  className="rounded-2xl bg-red-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                >
                  Sim, excluir
                </button>
              </div>
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
    Canceled: {
      label: "Cancelado",
      className: "bg-red-100 text-red-700",
    },
    Finished: {
      label: "Finalizado",
      className: "bg-blue-100 text-blue-700",
    },
    Deleted: {
      label: "Excluído",
      className: "bg-zinc-200 text-zinc-700",
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

function syncPropertiesWithContracts(
  contracts: Contract[],
  properties: Property[]
): Property[] {
  return properties.map((property) => {
    const hasActiveContract = contracts.some(
      (contract) =>
        String(contract.propertyId) === String(property.id) &&
        getDisplayContractStatus(contract) === "Active" &&
        contract.status !== "Deleted"
    );

    return {
      ...property,
      status: hasActiveContract ? "Rented" : "Available",
    };
  });
}

function getDisplayContractStatus(contract: Contract): ContractStatus {
  if (contract.status === "Deleted") return "Deleted";
  if (contract.status === "Canceled") return "Canceled";
  if (contract.status === "Finished") return "Finished";
  if (contract.status === "Inactive") return "Inactive";
  if (contract.status === "Active") {
    return getAutomaticContractStatus(contract.endDate);
  }

  return getAutomaticContractStatus(contract.endDate);
}

function getAutomaticContractStatus(endDate: string): ContractStatus {
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