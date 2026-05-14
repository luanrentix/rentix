"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";

type ApiPersonType = "INDIVIDUAL" | "COMPANY";
type ApiPersonStatus = "ACTIVE" | "INACTIVE";

type PersonType = "individual" | "company";
type PersonStatus = "active" | "inactive";

type ToastType = "success" | "error" | "info";

type ApiPerson = {
  id: string;
  companyId: string;
  type: ApiPersonType;
  status: ApiPersonStatus;
  name: string;
  document: string;
  stateRegistration?: string | null;
  identityNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type Person = {
  id: string;
  companyId: string;
  name: string;
  type: PersonType;
  document: string;
  stateRegistration: string;
  identityNumber: string;
  email: string;
  phone: string;
  zipCode: string;
  city: string;
  state: string;
  address: string;
  status: PersonStatus;
  createdAt: string;
};

type PersonFormData = {
  name: string;
  type: PersonType;
  document: string;
  stateRegistration: string;
  identityNumber: string;
  email: string;
  phone: string;
  zipCode: string;
  city: string;
  state: string;
  address: string;
  status: PersonStatus;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type CnpjApiResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  cep?: string | null;
  municipio?: string | null;
  uf?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  descricao_situacao_cadastral?: string | null;
};

type ToastState = {
  type: ToastType;
  message: string;
} | null;

const emptyFormData: PersonFormData = {
  name: "",
  type: "individual",
  document: "",
  stateRegistration: "",
  identityNumber: "",
  email: "",
  phone: "",
  zipCode: "",
  city: "",
  state: "",
  address: "",
  status: "active",
};

function convertApiTypeToPersonType(type: ApiPersonType): PersonType {
  return type === "COMPANY" ? "company" : "individual";
}

function convertPersonTypeToApiType(type: PersonType): ApiPersonType {
  return type === "company" ? "COMPANY" : "INDIVIDUAL";
}

function convertApiStatusToPersonStatus(status: ApiPersonStatus): PersonStatus {
  return status === "INACTIVE" ? "inactive" : "active";
}

function convertPersonStatusToApiStatus(status: PersonStatus): ApiPersonStatus {
  return status === "inactive" ? "INACTIVE" : "ACTIVE";
}

function mapApiPersonToPerson(apiPerson: ApiPerson): Person {
  return {
    id: apiPerson.id,
    companyId: apiPerson.companyId,
    name: apiPerson.name,
    type: convertApiTypeToPersonType(apiPerson.type),
    document: apiPerson.document,
    stateRegistration: apiPerson.stateRegistration ?? "",
    identityNumber: apiPerson.identityNumber ?? "",
    email: apiPerson.email ?? "",
    phone: apiPerson.phone ?? "",
    zipCode: apiPerson.zipCode ?? "",
    city: apiPerson.city ?? "",
    state: apiPerson.state ?? "",
    address: apiPerson.address ?? "",
    status: convertApiStatusToPersonStatus(apiPerson.status),
    createdAt: apiPerson.createdAt,
  };
}

function formatDocument(value: string, type: PersonType) {
  const digits = value.replace(/\D/g, "").slice(0, type === "individual" ? 11 : 14);

  if (type === "individual") {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatZipCode(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildCnpjAddress(data: CnpjApiResponse) {
  const addressParts = [
    data.logradouro,
    data.numero ? `Nº ${data.numero}` : "",
    data.bairro,
    data.complemento,
  ].filter(Boolean);

  return addressParts.join(" - ");
}

export default function PeoplePage() {
  const { user } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PersonStatus>("active");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PersonFormData>(emptyFormData);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingZipCode, setIsSearchingZipCode] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [zipCodeError, setZipCodeError] = useState<string | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) {
      setIsLoadingPeople(false);
      return;
    }

    loadPeople(companyId);
  }, [companyId]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function loadPeople(currentCompanyId: string) {
    try {
      setIsLoadingPeople(true);
      setPageError(null);

      const response = await apiFetch<ApiPerson[]>(
        `/pessoas?companyId=${encodeURIComponent(currentCompanyId)}`
      );

      setPeople(response.map(mapApiPersonToPerson));
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Não foi possível carregar as pessoas."
      );
    } finally {
      setIsLoadingPeople(false);
    }
  }

  const filteredPeople = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return people.filter((person) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(person.name).includes(normalizedSearch) ||
        normalizeText(person.document).includes(normalizedSearch) ||
        normalizeText(person.email).includes(normalizedSearch) ||
        normalizeText(person.phone).includes(normalizedSearch) ||
        normalizeText(person.city).includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || person.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [people, searchTerm, statusFilter]);

  function openCreateModal() {
    setEditingPersonId(null);
    setFormData(emptyFormData);
    setPageError(null);
    setZipCodeError(null);
    setCnpjError(null);
    setIsModalOpen(true);
  }

  function openEditModal(person: Person) {
    setEditingPersonId(person.id);
    setFormData({
      name: person.name,
      type: person.type,
      document: person.document,
      stateRegistration: person.stateRegistration,
      identityNumber: person.identityNumber,
      email: person.email,
      phone: person.phone,
      zipCode: person.zipCode,
      city: person.city,
      state: person.state,
      address: person.address,
      status: person.status,
    });
    setPageError(null);
    setZipCodeError(null);
    setCnpjError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingPersonId(null);
    setFormData(emptyFormData);
    setZipCodeError(null);
    setCnpjError(null);
  }

  function updateFormData(field: keyof PersonFormData, value: string) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
  }

  async function handleSearchZipCode() {
    const zipCodeDigits = formData.zipCode.replace(/\D/g, "");

    if (zipCodeDigits.length !== 8) {
      setZipCodeError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    try {
      setIsSearchingZipCode(true);
      setZipCodeError(null);

      const response = await fetch(`https://viacep.com.br/ws/${zipCodeDigits}/json/`);
      const data = (await response.json()) as ViaCepResponse;

      if (!response.ok || data.erro) {
        setZipCodeError("CEP não encontrado.");
        return;
      }

      const addressParts = [data.logradouro, data.bairro].filter(Boolean);

      setFormData((currentFormData) => ({
        ...currentFormData,
        city: data.localidade ?? currentFormData.city,
        state: data.uf ?? currentFormData.state,
        address:
          addressParts.length > 0
            ? addressParts.join(" - ")
            : currentFormData.address,
      }));
    } catch {
      setZipCodeError("Não foi possível consultar o CEP agora.");
    } finally {
      setIsSearchingZipCode(false);
    }
  }

  async function handleSearchCnpj() {
    const cnpjDigits = formData.document.replace(/\D/g, "");

    if (formData.type !== "company") {
      setCnpjError("A busca por CNPJ está disponível apenas para Pessoa Jurídica.");
      return;
    }

    if (cnpjDigits.length !== 14) {
      setCnpjError("Informe um CNPJ válido com 14 dígitos.");
      return;
    }

    try {
      setIsSearchingCnpj(true);
      setCnpjError(null);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);

      if (!response.ok) {
        setCnpjError("CNPJ não encontrado ou indisponível no momento.");
        return;
      }

      const data = (await response.json()) as CnpjApiResponse;

      setFormData((currentFormData) => ({
        ...currentFormData,
        name:
          data.razao_social?.trim() ||
          data.nome_fantasia?.trim() ||
          currentFormData.name,
        email: data.email?.trim() || currentFormData.email,
        phone: data.ddd_telefone_1
          ? formatPhone(data.ddd_telefone_1)
          : data.ddd_telefone_2
            ? formatPhone(data.ddd_telefone_2)
            : currentFormData.phone,
        zipCode: data.cep ? formatZipCode(data.cep) : currentFormData.zipCode,
        city: data.municipio ?? currentFormData.city,
        state: data.uf ?? currentFormData.state,
        address: buildCnpjAddress(data) || currentFormData.address,
        status:
          data.descricao_situacao_cadastral?.toUpperCase() === "ATIVA"
            ? "active"
            : currentFormData.status,
      }));

      setToast({
        type: "success",
        message: "Dados do CNPJ preenchidos com sucesso.",
      });
    } catch {
      setCnpjError("Não foi possível consultar o CNPJ agora.");
    } finally {
      setIsSearchingCnpj(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyId) {
      setPageError("Empresa do usuário não encontrada. Faça login novamente.");
      return;
    }

    if (!formData.name.trim() || !formData.document.trim()) {
      setPageError("Informe nome e documento para salvar a pessoa.");
      return;
    }

    const payload = {
      companyId,
      type: convertPersonTypeToApiType(formData.type),
      status: convertPersonStatusToApiStatus(formData.status),
      name: formData.name.trim(),
      document: formData.document.trim(),
      stateRegistration:
        formData.type === "company"
          ? formData.stateRegistration.trim() || undefined
          : undefined,
      identityNumber:
        formData.type === "individual"
          ? formData.identityNumber.trim() || undefined
          : undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      zipCode: formData.zipCode.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim().toUpperCase() || undefined,
      address: formData.address.trim() || undefined,
    };

    try {
      setIsSaving(true);
      setPageError(null);

      if (editingPersonId) {
        const updatedPerson = await apiFetch<ApiPerson>(`/pessoas/${editingPersonId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setPeople((currentPeople) =>
          currentPeople.map((person) =>
            person.id === editingPersonId ? mapApiPersonToPerson(updatedPerson) : person
          )
        );

        setToast({
          type: "success",
          message: "Pessoa atualizada com sucesso.",
        });

        closeModal();
        return;
      }

      const createdPerson = await apiFetch<ApiPerson>("/pessoas", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPeople((currentPeople) => [mapApiPersonToPerson(createdPerson), ...currentPeople]);

      setToast({
        type: "success",
        message: "Pessoa cadastrada com sucesso.",
      });

      closeModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar a pessoa.";

      setPageError(message);
      setToast({
        type: "error",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function openDeleteModal(person: Person) {
    setPersonToDelete(person);
  }

  function closeDeleteModal() {
    if (isDeleting) return;
    setPersonToDelete(null);
  }

  async function handleDeleteConfirmed() {
    if (!personToDelete) return;

    try {
      setIsDeleting(true);
      setPageError(null);

      await apiFetch<ApiPerson>(`/pessoas/${personToDelete.id}`, {
        method: "DELETE",
      });

      setPeople((currentPeople) =>
        currentPeople.filter((person) => person.id !== personToDelete.id)
      );

      setToast({
        type: "success",
        message: "Pessoa excluída com sucesso.",
      });

      setPersonToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível excluir a pessoa.";

      setPageError(message);
      setToast({
        type: "error",
        message,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-7">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Pessoas
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Gerencie as pessoas cadastradas
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Nova pessoa
          </button>
        </section>

        {pageError && !isModalOpen && (
          <section className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
            {pageError}
          </section>
        )}

        <section className="overflow-x-auto rounded-[1.65rem] border border-orange-100 bg-white shadow-sm">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <h2 className="text-xl font-black text-slate-950">Pessoas</h2>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Exibindo {filteredPeople.length} de {people.length} pessoa(s).
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_155px]">
              <label className="space-y-2">
                <span className="text-xs font-black text-slate-400">Buscar</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nome, CPF/CNPJ, telefone ou e-mail"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-400">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | PersonStatus)
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-orange-50/70 text-xs font-black text-slate-950">
                <tr>
                  <th className="px-5 py-4 font-black">Nome</th>
                  <th className="px-5 py-4 font-black">Telefone</th>
                  <th className="px-5 py-4 font-black">CPF/CNPJ</th>
                  <th className="px-5 py-4 font-black">Tipo</th>
                  <th className="px-5 py-4 font-black">Situação</th>
                  <th className="px-5 py-4 text-right font-black">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoadingPeople && (
                  <>
                    {[1, 2, 3].map((item) => (
                      <tr key={item}>
                        <td className="px-5 py-5">
                          <div className="h-4 w-56 animate-pulse rounded-full bg-slate-100" />
                          <div className="mt-2 h-3 w-36 animate-pulse rounded-full bg-slate-100" />
                        </td>
                        <td className="px-5 py-5">
                          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
                        </td>
                        <td className="px-5 py-5">
                          <div className="h-4 w-36 animate-pulse rounded-full bg-slate-100" />
                        </td>
                        <td className="px-5 py-5">
                          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
                        </td>
                        <td className="px-5 py-5">
                          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                        </td>
                        <td className="px-5 py-5">
                          <div className="ml-auto h-8 w-32 animate-pulse rounded-xl bg-slate-100" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {!isLoadingPeople &&
                  filteredPeople.map((person) => (
                    <tr key={person.id} className="transition hover:bg-orange-50/30">
                      <td className="px-5 py-5">
                        <div className="max-w-[420px] truncate text-sm font-black uppercase text-slate-950">
                          {person.name}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          {person.email ? person.email : "Nenhum e-mail informado"}
                        </div>
                      </td>

                      <td className="px-5 py-5 font-semibold text-slate-700">
                        {person.phone || "-"}
                      </td>

                      <td className="px-5 py-5">
                        <div className="font-semibold text-slate-700">
                          {person.document}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          {person.type === "individual"
                            ? person.identityNumber || "RG não informado"
                            : person.stateRegistration || "IE não informada"}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {person.type === "individual"
                            ? "Pessoa física"
                            : "Pessoa jurídica"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            person.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {person.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(person)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(person)}
                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoadingPeople && filteredPeople.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <div className="text-base font-black text-slate-800">
                        Nenhuma pessoa encontrada
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Ajuste os filtros ou cadastre uma nova pessoa.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-orange-100 px-8 py-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {editingPersonId ? "Editar pessoa" : "Nova pessoa"}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Informe os dados principais para usar nos módulos do Rentix.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-red-500"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-8 py-6">
                <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                  <FormField label="Nome / Razão social" required>
                    <input
                      value={formData.name}
                      onChange={(event) => updateFormData("name", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Tipo de pessoa">
                    <select
                      value={formData.type}
                      onChange={(event) => {
                        const nextType = event.target.value as PersonType;

                        setFormData((currentFormData) => ({
                          ...currentFormData,
                          type: nextType,
                          document: "",
                          stateRegistration: "",
                          identityNumber: "",
                        }));

                        setCnpjError(null);
                      }}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="individual">Pessoa física</option>
                      <option value="company">Pessoa jurídica</option>
                    </select>
                  </FormField>

                  <FormField label={formData.type === "individual" ? "CPF" : "CNPJ"} required>
                    <div
                      className={
                        formData.type === "company"
                          ? "grid grid-cols-[1fr_auto] gap-3"
                          : ""
                      }
                    >
                      <input
                        value={formData.document}
                        onChange={(event) =>
                          updateFormData(
                            "document",
                            formatDocument(event.target.value, formData.type)
                          )
                        }
                        placeholder={
                          formData.type === "individual"
                            ? "000.000.000-00"
                            : "00.000.000/0000-00"
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />

                      {formData.type === "company" && (
                        <button
                          type="button"
                          onClick={handleSearchCnpj}
                          disabled={isSearchingCnpj}
                          className="h-11 rounded-2xl border border-orange-200 bg-white px-4 text-xs font-black text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSearchingCnpj ? "Buscando..." : "Buscar CNPJ"}
                        </button>
                      )}
                    </div>
                  </FormField>

                  <FormField
                    label={
                      formData.type === "individual"
                        ? "RG / Identidade"
                        : "Inscrição estadual"
                    }
                  >
                    <input
                      value={
                        formData.type === "individual"
                          ? formData.identityNumber
                          : formData.stateRegistration
                      }
                      onChange={(event) =>
                        formData.type === "individual"
                          ? updateFormData("identityNumber", event.target.value)
                          : updateFormData("stateRegistration", event.target.value)
                      }
                      placeholder={
                        formData.type === "individual"
                          ? "RG / Órgão emissor"
                          : "Inscrição estadual"
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Telefone">
                    <input
                      value={formData.phone}
                      onChange={(event) =>
                        updateFormData("phone", formatPhone(event.target.value))
                      }
                      placeholder="(00) 00000-0000"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="E-mail">
                    <input
                      value={formData.email}
                      onChange={(event) => updateFormData("email", event.target.value)}
                      placeholder="email@exemplo.com"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="CEP">
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <input
                        value={formData.zipCode}
                        onChange={(event) =>
                          updateFormData("zipCode", formatZipCode(event.target.value))
                        }
                        placeholder="00000-000"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />

                      <button
                        type="button"
                        onClick={handleSearchZipCode}
                        disabled={isSearchingZipCode}
                        className="h-11 rounded-2xl border border-orange-200 bg-white px-4 text-xs font-black text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSearchingZipCode ? "Buscando..." : "Buscar CEP"}
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Cidade">
                    <input
                      value={formData.city}
                      onChange={(event) => updateFormData("city", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="UF">
                    <input
                      value={formData.state}
                      onChange={(event) =>
                        updateFormData("state", event.target.value.toUpperCase().slice(0, 2))
                      }
                      maxLength={2}
                      placeholder="RO"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="Endereço">
                      <input
                        value={formData.address}
                        onChange={(event) => updateFormData("address", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>
                  </div>

                  <FormField label="Status">
                    <select
                      value={formData.status}
                      onChange={(event) =>
                        updateFormData("status", event.target.value as PersonStatus)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </FormField>
                </div>

                {cnpjError && (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    {cnpjError}
                  </div>
                )}

                {zipCodeError && (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    {zipCodeError}
                  </div>
                )}

                {pageError && (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {pageError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-8 py-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-orange-500 px-7 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving
                    ? "Salvando..."
                    : editingPersonId
                      ? "Salvar alterações"
                      : "Salvar pessoa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {personToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl font-black text-red-600">
              !
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-xl font-black text-slate-950">
                Excluir pessoa?
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Essa ação removerá o cadastro selecionado. Confirme apenas se tiver certeza.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-black uppercase text-slate-900">
                {personToDelete.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {personToDelete.document}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70]">
          <div
            className={`rounded-2xl border px-5 py-4 text-sm font-black shadow-xl ${
              toast.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : toast.type === "error"
                  ? "border-red-100 bg-red-50 text-red-700"
                  : "border-orange-100 bg-orange-50 text-orange-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
