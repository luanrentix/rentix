"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { Tenant, initialTenants } from "@/data/tenants";

const STORAGE_KEY = "rentix_tenants";

type RentixTenant = Tenant & {
  cpf?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<RentixTenant | null>(
    null
  );

  const [tenantName, setTenantName] = useState("");
  const [tenantCpf, setTenantCpf] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantZipCode, setTenantZipCode] = useState("");
  const [tenantState, setTenantState] = useState("");
  const [tenantCity, setTenantCity] = useState("");
  const [tenantStreet, setTenantStreet] = useState("");
  const [tenantNumber, setTenantNumber] = useState("");
  const [tenantNeighborhood, setTenantNeighborhood] = useState("");
  const [tenantComplement, setTenantComplement] = useState("");
  const [cpfError, setCpfError] = useState("");

  const isEditing = editingTenantId !== null;

  useEffect(() => {
    const storedTenants = localStorage.getItem(STORAGE_KEY);

    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants) as RentixTenant[];

      const normalizedTenants = parsedTenants.map((tenant) => ({
        ...tenant,
        cpf: tenant.cpf || tenant.document || "",
        document: tenant.document || tenant.cpf || "",
        zipCode: tenant.zipCode || "",
        state: tenant.state || "",
        city: tenant.city || "",
        street: tenant.street || "",
        number: tenant.number || "",
        neighborhood: tenant.neighborhood || "",
        complement: tenant.complement || "",
      }));

      setTenants(
        normalizedTenants.length > 0 ? normalizedTenants : initialTenants
      );
    } else {
      setTenants(initialTenants);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  }, [tenants, isLoaded]);

  function resetForm() {
    setTenantName("");
    setTenantCpf("");
    setTenantPhone("");
    setTenantZipCode("");
    setTenantState("");
    setTenantCity("");
    setTenantStreet("");
    setTenantNumber("");
    setTenantNeighborhood("");
    setTenantComplement("");
    setCpfError("");
    setEditingTenantId(null);
    setIsFormOpen(false);
  }

  function handleOpenCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    resetForm();
  }

  async function handleZipCodeBlur() {
    const cleanZipCode = tenantZipCode.replace(/\D/g, "");

    if (cleanZipCode.length !== 8) return;

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanZipCode}/json/`
      );

      const data = (await response.json()) as ViaCepResponse;

      if (data.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setTenantZipCode(data.cep || cleanZipCode);
      setTenantState(data.uf || "");
      setTenantCity(data.localidade || "");
      setTenantStreet(data.logradouro || "");
      setTenantNeighborhood(data.bairro || "");
    } catch {
      alert("Não foi possível consultar o CEP no momento.");
    }
  }

  function handleCpfChange(value: string) {
    const formattedCpf = formatCpf(value);
    setTenantCpf(formattedCpf);

    if (formattedCpf.replace(/\D/g, "").length < 11) {
      setCpfError("");
      return;
    }

    if (!isValidCpf(formattedCpf)) {
      setCpfError("CPF inválido.");
      return;
    }

    const normalizedCpf = formattedCpf.replace(/\D/g, "");

    const cpfAlreadyExists = tenants.some((tenant) => {
      const currentTenantCpf = (tenant.cpf || tenant.document || "").replace(
        /\D/g,
        ""
      );

      return currentTenantCpf === normalizedCpf && tenant.id !== editingTenantId;
    });

    if (cpfAlreadyExists) {
      setCpfError("Já existe um inquilino cadastrado com este CPF.");
      return;
    }

    setCpfError("");
  }

  function handlePhoneChange(value: string) {
    setTenantPhone(formatPhone(value));
  }

  function handleSubmitTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidCpf(tenantCpf)) {
      setCpfError("CPF inválido.");
      return;
    }

    const normalizedCpf = tenantCpf.replace(/\D/g, "");

    const cpfAlreadyExists = tenants.some((tenant) => {
      const currentTenantCpf = (tenant.cpf || tenant.document || "").replace(
        /\D/g,
        ""
      );

      return currentTenantCpf === normalizedCpf && tenant.id !== editingTenantId;
    });

    if (cpfAlreadyExists) {
      setCpfError("Já existe um inquilino cadastrado com este CPF.");
      return;
    }

    if (isEditing) {
      setTenants((currentTenants) =>
        currentTenants.map((tenant) =>
          tenant.id === editingTenantId
            ? {
                ...tenant,
                name: tenantName,
                cpf: tenantCpf,
                document: tenantCpf,
                phone: tenantPhone,
                zipCode: tenantZipCode,
                state: tenantState,
                city: tenantCity,
                street: tenantStreet,
                number: tenantNumber,
                neighborhood: tenantNeighborhood,
                complement: tenantComplement,
              }
            : tenant
        )
      );

      resetForm();
      return;
    }

    const newTenant: RentixTenant = {
      id: Date.now(),
      name: tenantName,
      cpf: tenantCpf,
      document: tenantCpf,
      phone: tenantPhone,
      zipCode: tenantZipCode,
      state: tenantState,
      city: tenantCity,
      street: tenantStreet,
      number: tenantNumber,
      neighborhood: tenantNeighborhood,
      complement: tenantComplement,
    };

    setTenants((currentTenants) => [newTenant, ...currentTenants]);
    resetForm();
  }

  function handleEditTenant(tenant: RentixTenant) {
    setEditingTenantId(tenant.id);
    setTenantName(tenant.name);
    setTenantCpf(formatCpf(tenant.cpf || tenant.document || ""));
    setTenantPhone(formatPhone(tenant.phone));
    setTenantZipCode(tenant.zipCode || "");
    setTenantState(tenant.state || "");
    setTenantCity(tenant.city || "");
    setTenantStreet(tenant.street || "");
    setTenantNumber(tenant.number || "");
    setTenantNeighborhood(tenant.neighborhood || "");
    setTenantComplement(tenant.complement || "");
    setCpfError("");
    setIsFormOpen(true);
  }

  function handleDeleteTenant(tenant: RentixTenant) {
    setTenantToDelete(tenant);
  }

  function handleConfirmDeleteTenant() {
    if (!tenantToDelete) return;

    setTenants((currentTenants) =>
      currentTenants.filter((tenant) => tenant.id !== tenantToDelete.id)
    );

    setTenantToDelete(null);
  }

  function handleCancelDeleteTenant() {
    setTenantToDelete(null);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Inquilinos
            </h1>
            <p className="mt-2 text-slate-500">
              Gerencie os inquilinos cadastrados
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Novo inquilino
          </button>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-2xl font-black text-slate-950">
              Lista de inquilinos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tenants.length} inquilino(s) cadastrado(s)
            </p>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Telefone
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    CPF
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Cidade
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {tenant.name}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatPhone(tenant.phone)}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatCpf(tenant.cpf || tenant.document)}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {tenant.city || "Não informado"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTenant(tenant)}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTenant(tenant)}
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tenants.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhum inquilino cadastrado.
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
                    {isEditing ? "Editar inquilino" : "Novo inquilino"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados pessoais e endereço do inquilino.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitTenant}>
                <div className="p-8">
                  <div className="mb-8">
                    <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-orange-600">
                      Dados pessoais
                    </h3>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      <FormField label="Nome completo">
                        <input
                          type="text"
                          value={tenantName}
                          onChange={(event) => setTenantName(event.target.value)}
                          placeholder="Ex: João Silva"
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="CPF">
                        <input
                          type="text"
                          value={tenantCpf}
                          onChange={(event) =>
                            handleCpfChange(event.target.value)
                          }
                          placeholder="Ex: 123.456.789-00"
                          maxLength={14}
                          required
                          className={`w-full rounded-2xl border px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                            cpfError
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-slate-200 focus:border-orange-500 focus:ring-orange-100"
                          }`}
                        />
                        {cpfError && (
                          <p className="mt-2 text-xs font-bold text-red-500">
                            {cpfError}
                          </p>
                        )}
                      </FormField>

                      <FormField label="Telefone">
                        <input
                          type="text"
                          value={tenantPhone}
                          onChange={(event) =>
                            handlePhoneChange(event.target.value)
                          }
                          placeholder="Ex: (69) 99999-0000"
                          maxLength={15}
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-orange-600">
                      Endereço
                    </h3>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                      <FormField label="CEP">
                        <input
                          type="text"
                          value={tenantZipCode}
                          onChange={(event) =>
                            setTenantZipCode(formatZipCode(event.target.value))
                          }
                          onBlur={handleZipCodeBlur}
                          placeholder="Ex: 76940-000"
                          maxLength={9}
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Estado">
                        <input
                          type="text"
                          value={tenantState}
                          onChange={(event) =>
                            setTenantState(event.target.value.toUpperCase())
                          }
                          placeholder="UF"
                          maxLength