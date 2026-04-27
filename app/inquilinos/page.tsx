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
  isTenant?: boolean;
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
  const [tenantIsTenant, setTenantIsTenant] = useState(true);
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
        isTenant: tenant.isTenant ?? true,
      }));

      setTenants(
        normalizedTenants.length > 0 ? normalizedTenants : initialTenants
      );
    } else {
      setTenants(
        initialTenants.map((tenant) => ({
          ...tenant,
          isTenant: true,
        }))
      );
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
    setTenantIsTenant(true);
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
                isTenant: tenantIsTenant,
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
      isTenant: tenantIsTenant,
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
    setTenantIsTenant(tenant.isTenant ?? true);
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
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Tipo
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
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          tenant.isTenant ?? true
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {tenant.isTenant ?? true
                          ? "Inquilino"
                          : "Não inquilino"}
                      </span>
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
                      colSpan={6}
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

                    <div className="mt-5">
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 px-5 py-4 transition hover:bg-orange-50">
                        <input
                          type="checkbox"
                          checked={tenantIsTenant}
                          onChange={(event) =>
                            setTenantIsTenant(event.target.checked)
                          }
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />

                        <div>
                          <p className="text-sm font-black text-slate-800">
                            Esta pessoa é inquilino
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Quando desmarcado, esta pessoa não poderá ser
                            vinculada a contratos de aluguel.
                          </p>
                        </div>
                      </label>
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
                          maxLength={2}
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Cidade">
                        <input
                          type="text"
                          value={tenantCity}
                          onChange={(event) => setTenantCity(event.target.value)}
                          placeholder="Cidade"
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Logradouro">
                        <input
                          type="text"
                          value={tenantStreet}
                          onChange={(event) =>
                            setTenantStreet(event.target.value)
                          }
                          placeholder="Rua, avenida..."
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Número">
                        <input
                          type="text"
                          value={tenantNumber}
                          onChange={(event) =>
                            setTenantNumber(event.target.value)
                          }
                          placeholder="Número da casa"
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Bairro">
                        <input
                          type="text"
                          value={tenantNeighborhood}
                          onChange={(event) =>
                            setTenantNeighborhood(event.target.value)
                          }
                          placeholder="Bairro"
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Complemento">
                        <input
                          type="text"
                          value={tenantComplement}
                          onChange={(event) =>
                            setTenantComplement(event.target.value)
                          }
                          placeholder="Apartamento, bloco, referência..."
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={Boolean(cpfError)}
                    className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditing ? "Salvar alterações" : "Cadastrar inquilino"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {tenantToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                🗑️
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Excluir inquilino?
                </h3>

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Esta ação removerá o inquilino do sistema.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">
                    {tenantToDelete.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tenantToDelete.cpf || tenantToDelete.document}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancelDeleteTenant}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteTenant}
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

function formatCpf(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatPhone(value?: string) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);

  if (!digits) return "-";

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatZipCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;

  for (let index = 0; index < 9; index++) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let firstCheckDigit = (sum * 10) % 11;
  if (firstCheckDigit === 10) firstCheckDigit = 0;

  if (firstCheckDigit !== Number(cpf[9])) return false;

  sum = 0;

  for (let index = 0; index < 10; index++) {
    sum += Number(cpf[index]) * (11 - index);
  }

  let secondCheckDigit = (sum * 10) % 11;
  if (secondCheckDigit === 10) secondCheckDigit = 0;

  return secondCheckDigit === Number(cpf[10]);
}