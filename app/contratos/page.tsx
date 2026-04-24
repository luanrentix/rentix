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

type StatusFilter = "All" | ContractStatus;

export default function ContractsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<ContractStatus>("Active");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    const storedProperties = localStorage.getItem("rentix_properties");
    const storedTenants = localStorage.getItem("rentix_tenants");
    const storedContracts = localStorage.getItem("rentix_contracts");

    if (storedProperties) setProperties(JSON.parse(storedProperties));
    if (storedTenants) setTenants(JSON.parse(storedTenants));
    if (storedContracts) setContracts(JSON.parse(storedContracts));
  }, []);

  const availableProperties = useMemo(() => {
    return properties.filter((property) => property.status === "Available");
  }, [properties]);

  const filteredContracts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const propertyName = getPropertyName(contract.propertyId).toLowerCase();
      const tenantName = getTenantName(contract.tenantId).toLowerCase();

      const matchesSearch =
        propertyName.includes(normalizedSearch) ||
        tenantName.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" || contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, properties, tenants, search, statusFilter]);

  function saveProperties(updatedProperties: Property[]) {
    setProperties(updatedProperties);
    localStorage.setItem("rentix_properties", JSON.stringify(updatedProperties));
  }

  function saveContracts(updatedContracts: Contract[]) {
    setContracts(updatedContracts);
    localStorage.setItem("rentix_contracts", JSON.stringify(updatedContracts));
  }

  function getPropertyName(id: string) {
    return (
      properties.find((property) => property.id === id)?.name ||
      "Imóvel não encontrado"
    );
  }

  function getTenantName(id: string) {
    return (
      tenants.find((tenant) => tenant.id === id)?.name ||
      "Inquilino não encontrado"
    );
  }

  function resetForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setValue("");
    setStatus("Active");
  }

  function handleCreateContract() {
    if (!propertyId || !tenantId || !startDate || !value) {
      alert("Preencha todos os campos.");
      return;
    }

    const selectedProperty = properties.find(
      (property) => property.id === propertyId
    );

    if (!selectedProperty) {
      alert("Selecione um imóvel válido.");
      return;
    }

    if (selectedProperty.status === "Rented") {
      alert("Este imóvel já está alugado e não pode receber outro contrato.");
      return;
    }

    const newContract: Contract = {
      id: crypto.randomUUID(),
      propertyId,
      tenantId,
      startDate,
      value: Number(value),
      status,
    };

    const updatedContracts = [...contracts, newContract];

    const updatedProperties = properties.map((property) =>
      property.id === propertyId && status === "Active"
        ? { ...property, status: "Rented" as PropertyStatus }
        : property
    );

    saveContracts(updatedContracts);
    saveProperties(updatedProperties);
    resetForm();
  }

  function handleFinishContract(contractId: string) {
    const contract = contracts.find((item) => item.id === contractId);

    if (!contract) return;

    const updatedContracts = contracts.map((item) =>
      item.id === contractId
        ? { ...item, status: "Finished" as ContractStatus }
        : item
    );

    const updatedProperties = properties.map((property) =>
      property.id === contract.propertyId
        ? { ...property, status: "Available" as PropertyStatus }
        : property
    );

    saveContracts(updatedContracts);
    saveProperties(updatedProperties);
  }

  function handleDeleteContract(contractId: string) {
    const contract = contracts.find((item) => item.id === contractId);

    if (!contract) return;

    const confirmDelete = confirm("Deseja realmente excluir este contrato?");

    if (!confirmDelete) return;

    const updatedContracts = contracts.filter((item) => item.id !== contractId);

    const updatedProperties = properties.map((property) =>
      property.id === contract.propertyId
        ? { ...property, status: "Available" as PropertyStatus }
        : property
    );

    saveContracts(updatedContracts);
    saveProperties(updatedProperties);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contratos</h1>
          <p className="mt-1 text-slate-500">
            Gerencie os contratos de locação dos imóveis cadastrados.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Novo contrato
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Imóvel disponível
              </label>
              <select
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Selecione um imóvel</option>

                {availableProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>

              {availableProperties.length === 0 && (
                <p className="mt-2 text-sm text-red-500">
                  Nenhum imóvel disponível para contrato.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Inquilino
              </label>
              <select
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Selecione um inquilino</option>

                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Data de início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Valor do aluguel
              </label>
              <input
                type="number"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Ex: 1200"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ContractStatus)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Active">Ativo</option>
                <option value="Finished">Finalizado</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateContract}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Criar contrato
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Contratos cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredContracts.length} de {contracts.length} contratos.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Buscar
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por imóvel ou inquilino"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 md:w-72"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 md:w-44"
                >
                  <option value="All">Todos</option>
                  <option value="Active">Ativos</option>
                  <option value="Finished">Finalizados</option>
                </select>
              </div>
            </div>
          </div>

          {contracts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-500">Nenhum contrato cadastrado ainda.</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-500">
                Nenhum contrato encontrado com os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse bg-white text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                      Imóvel
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                      Inquilino
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                      Início
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getPropertyName(contract.propertyId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getTenantName(contract.tenantId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {contract.startDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        R$ {contract.value.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            contract.status === "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {contract.status === "Active" ? "Ativo" : "Finalizado"}
                        </span>
                      </td>
                      <td className="space-x-2 px-4 py-3">
                        {contract.status === "Active" && (
                          <button
                            onClick={() => handleFinishContract(contract.id)}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                          >
                            Finalizar
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}