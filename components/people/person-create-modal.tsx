"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, Minimize2, Search, X } from "lucide-react";
import { createPerson, type Person } from "@/services/people.service";

type PersonType = "individual" | "company";
type PersonStatus = "active" | "inactive";

export type PersonCreateModalListItem = {
  id: string;
  document?: string | null;
};

export type PersonFormData = {
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
  addressNumber: string;
  district: string;
  reference: string;
  isTenant: boolean;
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

type PersonCreateModalProps = {
  open: boolean;
  companyId?: string;
  people?: PersonCreateModalListItem[];
  initialData?: PersonFormData;
  onDraftChange?: (draft: PersonFormData) => void;
  onMinimize?: () => void;
  onClose: () => void;
  onCreated: (person: Person) => void;
};

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
  addressNumber: "",
  district: "",
  reference: "",
  isTenant: true,
  status: "active",
};

export function PersonCreateModal({
  open,
  companyId,
  people = [],
  initialData,
  onDraftChange,
  onMinimize,
  onClose,
  onCreated,
}: PersonCreateModalProps) {
  const [formData, setFormData] = useState<PersonFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingZipCode, setIsSearchingZipCode] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [zipCodeError, setZipCodeError] = useState<string | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormData(initialData || emptyFormData);
    } else {
      setFormData(emptyFormData);
      setFormError(null);
      setZipCodeError(null);
      setCnpjError(null);
      setIsSaving(false);
      setIsSearchingZipCode(false);
      setIsSearchingCnpj(false);
    }
  }, [initialData, open]);

  if (!open) return null;

  function handleClose() {
    if (isSaving) return;

    setFormData(emptyFormData);
    onDraftChange?.(emptyFormData);
    setFormError(null);
    setZipCodeError(null);
    setCnpjError(null);
    onClose();
  }

  function updateFormData(field: keyof PersonFormData, value: string) {
    setFormError(null);
    updateFormDataDraft((currentFormData) => ({
      ...currentFormData,
      [field]: formatPersonFormValue(field, value),
    }));
  }

  function updateFormDataDraft(
    updater: (currentFormData: PersonFormData) => PersonFormData,
  ) {
    let nextDraft: PersonFormData | null = null;

    setFormData((currentFormData) => {
      nextDraft = updater(currentFormData);
      return nextDraft;
    });

    if (nextDraft) {
      onDraftChange?.(nextDraft);
    }
  }
  function changePersonType(nextType: PersonType) {
    updateFormDataDraft((currentFormData) => ({
      ...currentFormData,
      type: nextType,
      document: "",
      stateRegistration: "",
      identityNumber: "",
    }));
    setCnpjError(null);
    setFormError(null);
  }

  function changeTenantFlag(isTenant: boolean) {
    updateFormDataDraft((currentFormData) => ({
      ...currentFormData,
      isTenant,
    }));
  }

  async function handleSearchZipCode() {
    const zipCodeDigits = onlyDigits(formData.zipCode);

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

      updateFormDataDraft((currentFormData) => ({
          ...currentFormData,
          city: toUpperText(data.localidade ?? currentFormData.city),
          state: toUpperText(data.uf ?? currentFormData.state).slice(0, 2),
          address: toUpperText(data.logradouro ?? currentFormData.address),
          district: toUpperText(data.bairro ?? currentFormData.district),
      }));
    } catch {
      setZipCodeError("Não foi possível consultar o CEP agora.");
    } finally {
      setIsSearchingZipCode(false);
    }
  }

  async function handleSearchCnpj() {
    const cnpjDigits = onlyDigits(formData.document);

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

      updateFormDataDraft((currentFormData) => ({
          ...currentFormData,
          name:
            toUpperText(data.razao_social?.trim() || "") ||
            toUpperText(data.nome_fantasia?.trim() || "") ||
            currentFormData.name,
          email: data.email?.trim().toLowerCase() || currentFormData.email,
          phone: data.ddd_telefone_1
            ? formatPhone(data.ddd_telefone_1)
            : data.ddd_telefone_2
              ? formatPhone(data.ddd_telefone_2)
              : currentFormData.phone,
          zipCode: data.cep ? formatZipCode(data.cep) : currentFormData.zipCode,
          city: toUpperText(data.municipio ?? currentFormData.city),
          state: toUpperText(data.uf ?? currentFormData.state).slice(0, 2),
          address: toUpperText(data.logradouro ?? currentFormData.address),
          addressNumber: toUpperText(data.numero ?? currentFormData.addressNumber),
          district: toUpperText(data.bairro ?? currentFormData.district),
          reference: toUpperText(data.complemento ?? currentFormData.reference),
          status:
            data.descricao_situacao_cadastral?.toUpperCase() === "ATIVA"
              ? "active"
              : currentFormData.status,
      }));
    } catch {
      setCnpjError("Não foi possível consultar o CNPJ agora.");
    } finally {
      setIsSearchingCnpj(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyId) {
      setFormError("Empresa do usuário não encontrada. Faça login novamente.");
      return;
    }

    if (!formData.name.trim() || !formData.document.trim()) {
      setFormError("Informe nome e documento para salvar a pessoa.");
      return;
    }

    if (!isValidDocument(formData.document, formData.type)) {
      setFormError(
        formData.type === "company"
          ? "Informe um CNPJ válido para salvar a pessoa."
          : "Informe um CPF válido para salvar a pessoa.",
      );
      return;
    }

    const normalizedDocument = onlyDigits(formData.document);
    const documentAlreadyExists = people.some(
      (person) => onlyDigits(person.document || "") === normalizedDocument,
    );

    if (documentAlreadyExists) {
      setFormError("Já existe uma pessoa cadastrada com este documento.");
      return;
    }

    const personData = {
      type: formData.type === "company" ? "COMPANY" as const : "INDIVIDUAL" as const,
      status: formData.status === "inactive" ? "INACTIVE" as const : "ACTIVE" as const,
      name: toUpperText(formData.name).trim(),
      document: normalizedDocument,
      stateRegistration:
        formData.type === "company"
          ? toUpperText(formData.stateRegistration).trim() || undefined
          : undefined,
      identityNumber:
        formData.type === "individual"
          ? toUpperText(formData.identityNumber).trim() || undefined
          : undefined,
      email: formData.email.trim().toLowerCase() || undefined,
      phone: formData.phone.trim() || undefined,
      zipCode: formData.zipCode.trim() || undefined,
      city: toUpperText(formData.city).trim() || undefined,
      state: toUpperText(formData.state).trim() || undefined,
      address: buildPersonAddress(formData) || undefined,
      isTenant: formData.isTenant,
    };

    try {
      setIsSaving(true);
      setFormError(null);

      const createdPerson = await createPerson(personData);

      onCreated(createdPerson);
      setFormData(emptyFormData);
      onDraftChange?.(emptyFormData);
      setFormError(null);
      setZipCodeError(null);
      setCnpjError(null);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar a pessoa.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-orange-100 px-8 py-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Nova pessoa
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Informe os dados principais para usar nos módulos do Contrx.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                title="Minimizar modal"
                aria-label="Minimizar modal"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
              title="Fechar modal"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
              <PersonModalField label="Nome / Razão social" required>
                <input
                  value={formData.name}
                  onChange={(event) => updateFormData("name", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Tipo de pessoa">
                <select
                  value={formData.type}
                  onChange={(event) => {
                    const nextType = event.target.value as PersonType;

                    changePersonType(nextType);
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="individual">Pessoa física</option>
                  <option value="company">Pessoa jurídica</option>
                </select>
              </PersonModalField>

              <PersonModalField label={formData.type === "individual" ? "CPF" : "CNPJ"} required>
                <div className={formData.type === "company" ? "grid grid-cols-[1fr_auto] gap-3" : ""}>
                  <input
                    value={formData.document}
                    onChange={(event) =>
                      updateFormData(
                        "document",
                        formatDocument(event.target.value, formData.type),
                      )
                    }
                    placeholder={formData.type === "individual" ? "000.000.000-00" : "00.000.000/0000-00"}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />

                  {formData.type === "company" && (
                    <button
                      type="button"
                      onClick={handleSearchCnpj}
                      disabled={isSearchingCnpj}
                      className="flex h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-xs font-black text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSearchingCnpj ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {isSearchingCnpj ? "Buscando..." : "Buscar CNPJ"}
                    </button>
                  )}
                </div>
              </PersonModalField>

              <PersonModalField label={formData.type === "individual" ? "RG / Identidade" : "Inscrição estadual"}>
                <input
                  value={formData.type === "individual" ? formData.identityNumber : formData.stateRegistration}
                  onChange={(event) =>
                    formData.type === "individual"
                      ? updateFormData("identityNumber", event.target.value)
                      : updateFormData("stateRegistration", event.target.value)
                  }
                  placeholder={formData.type === "individual" ? "RG / Órgão emissor" : "Inscrição estadual"}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Telefone">
                <input
                  value={formData.phone}
                  onChange={(event) => updateFormData("phone", formatPhone(event.target.value))}
                  placeholder="(00) 00000-0000"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="E-mail">
                <input
                  value={formData.email}
                  onChange={(event) => updateFormData("email", event.target.value)}
                  placeholder="email@exemplo.com"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="CEP">
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <input
                    value={formData.zipCode}
                    onChange={(event) => updateFormData("zipCode", formatZipCode(event.target.value))}
                    placeholder="00000-000"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />

                  <button
                    type="button"
                    onClick={handleSearchZipCode}
                    disabled={isSearchingZipCode}
                    className="flex h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-xs font-black text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSearchingZipCode ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {isSearchingZipCode ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>
              </PersonModalField>

              <PersonModalField label="Cidade">
                <input
                  value={formData.city}
                  onChange={(event) => updateFormData("city", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="UF">
                <input
                  value={formData.state}
                  onChange={(event) => updateFormData("state", event.target.value)}
                  maxLength={2}
                  placeholder="RO"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Endereço">
                <input
                  value={formData.address}
                  onChange={(event) => updateFormData("address", event.target.value)}
                  placeholder="Rua, avenida, travessa..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Número">
                <input
                  value={formData.addressNumber}
                  onChange={(event) => updateFormData("addressNumber", event.target.value)}
                  placeholder="Nº"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Bairro">
                <input
                  value={formData.district}
                  onChange={(event) => updateFormData("district", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Referência">
                <input
                  value={formData.reference}
                  onChange={(event) => updateFormData("reference", event.target.value)}
                  placeholder="Ponto de referência"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </PersonModalField>

              <PersonModalField label="Status">
                <select
                  value={formData.status}
                  onChange={(event) => updateFormData("status", event.target.value as PersonStatus)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </PersonModalField>

              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50">
                  <input
                    type="checkbox"
                    checked={formData.isTenant}
                    onChange={(event) =>
                      changeTenantFlag(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />

                  <span>
                    <span className="block text-sm font-black text-slate-900">
                      Marcar como inquilino
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                      Marcado aparece em contratos. Desmarcado continua disponível para lançamentos financeiros.
                    </span>
                  </span>
                </label>
              </div>
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

            {formError && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {formError}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-8 py-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-orange-500 px-7 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Salvando..." : "Salvar pessoa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PersonModalField({
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
        {required ? <span className="ml-1 text-orange-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toUpperText(value: string) {
  return value.toLocaleUpperCase("pt-BR");
}

function formatPersonFormValue(field: keyof PersonFormData, value: string) {
  if (
    field === "name" ||
    field === "email" ||
    field === "city" ||
    field === "address" ||
    field === "addressNumber" ||
    field === "district" ||
    field === "reference"
  ) {
    return toUpperText(value);
  }

  if (field === "state") return toUpperText(value).slice(0, 2);

  return value;
}

function formatDocument(value: string, type: PersonType) {
  const digits = onlyDigits(value).slice(0, type === "individual" ? 11 : 14);

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
  const digits = onlyDigits(value).slice(0, 11);

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
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function buildPersonAddress(data: Pick<PersonFormData, "address" | "addressNumber" | "district" | "reference">) {
  const address = toUpperText(data.address).trim();
  const number = toUpperText(data.addressNumber).trim();
  const district = toUpperText(data.district).trim();
  const reference = toUpperText(data.reference).trim();

  const mainAddress = [address, number ? `Nº ${number}` : ""]
    .filter(Boolean)
    .join(", ");
  const details = [
    district ? `BAIRRO: ${district}` : "",
    reference ? `REFERÊNCIA: ${reference}` : "",
  ].filter(Boolean);

  return [mainAddress, ...details].filter(Boolean).join(" - ");
}

function isValidDocument(value: string, type: PersonType) {
  return type === "company" ? isValidCnpj(value) : isValidCpf(value);
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (base: string, factor: number) => {
    const sum = base
      .split("")
      .reduce((total, digit) => total + Number(digit) * factor--, 0);
    const rest = (sum * 10) % 11;

    return rest === 10 ? 0 : rest;
  };

  return (
    calculateDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calculateDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce(
      (total, weight, index) => total + Number(base[index]) * weight,
      0,
    );

    const rest = sum % 11;

    return rest < 2 ? 0 : 11 - rest;
  };

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstCheckDigit = calculateDigit(cnpj.slice(0, 12), firstWeights);
  const secondCheckDigit = calculateDigit(cnpj.slice(0, 13), secondWeights);

  return (
    firstCheckDigit === Number(cnpj[12]) &&
    secondCheckDigit === Number(cnpj[13])
  );
}
