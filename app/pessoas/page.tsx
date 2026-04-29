"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { Tenant, initialTenants } from "@/data/tenants";

const STORAGE_KEY = "rentix_tenants";
const CONTRACTS_STORAGE_KEY = "rentix_contracts";
const ACCOUNTS_RECEIVABLE_STORAGE_KEY = "rentix_accounts_receivable";
const ACCOUNTS_PAYABLE_STORAGE_KEY = "rentix_accounts_payable";

type PersonType = "Individual" | "Company";

type PersonStatusFilter = "Active" | "Inactive" | "All" | "Tenant" | "NotTenant";

type PersonHistoryTab =
  | "RegistrationInfo"
  | "RentalHistory"
  | "LinkedContracts"
  | "FinancialMovements";

type RentixTenant = Tenant & {
  personType?: PersonType;
  email?: string;
  cpf?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  isTenant?: boolean;
  isActive?: boolean;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  ddd_telefone_1?: string;
};

type PersonHistoryModalData = {
  person: RentixTenant;
  contractsCount: number;
  activeContractsCount: number;
  accountsReceivableRecords: Array<Record<string, unknown>>;
  accountsReceivableTotal: number;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<RentixTenant | null>(
    null
  );
  const [blockedInactivePerson, setBlockedInactivePerson] =
    useState<RentixTenant | null>(null);
  const [blockedDeletePerson, setBlockedDeletePerson] =
    useState<RentixTenant | null>(null);
  const [selectedPersonHistory, setSelectedPersonHistory] =
    useState<PersonHistoryModalData | null>(null);
  const [activePersonHistoryTab, setActivePersonHistoryTab] =
    useState<PersonHistoryTab>("RegistrationInfo");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PersonStatusFilter>("Active");

  const [tenantName, setTenantName] = useState("");
  const [tenantPersonType, setTenantPersonType] =
    useState<PersonType>("Individual");
  const [tenantCpf, setTenantCpf] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantZipCode, setTenantZipCode] = useState("");
  const [tenantState, setTenantState] = useState("");
  const [tenantCity, setTenantCity] = useState("");
  const [tenantStreet, setTenantStreet] = useState("");
  const [tenantNumber, setTenantNumber] = useState("");
  const [tenantNeighborhood, setTenantNeighborhood] = useState("");
  const [tenantComplement, setTenantComplement] = useState("");
  const [tenantIsTenant, setTenantIsTenant] = useState(true);
  const [tenantIsActive, setTenantIsActive] = useState(true);
  const [cpfError, setCpfError] = useState("");
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [cnpjSearchError, setCnpjSearchError] = useState("");

  const filteredTenants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const document = tenant.cpf || tenant.document || "";
      const city = tenant.city || "";
      const phone = tenant.phone || "";
      const email = tenant.email || "";

      const matchesSearch =
        tenant.name.toLowerCase().includes(normalizedSearch) ||
        document.toLowerCase().includes(normalizedSearch) ||
        city.toLowerCase().includes(normalizedSearch) ||
        phone.toLowerCase().includes(normalizedSearch) ||
        email.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && tenant.isActive !== false) ||
        (statusFilter === "Inactive" && tenant.isActive === false) ||
        (statusFilter === "Tenant" && tenant.isTenant !== false) ||
        (statusFilter === "NotTenant" && tenant.isTenant === false);

      return matchesSearch && matchesStatus;
    });
  }, [tenants, search, statusFilter]);

  const isEditing = editingTenantId !== null;

  useEffect(() => {
    const storedTenants = localStorage.getItem(STORAGE_KEY);

    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants) as RentixTenant[];

      const normalizedTenants = parsedTenants.map((tenant) => ({
        ...tenant,
        personType:
          tenant.personType ||
          ((tenant.cpf || tenant.document || "").replace(/\D/g, "").length > 11
            ? "Company"
            : "Individual"),
        name: toUpperCaseValue(tenant.name),
        email: formatEmailValue(tenant.email || ""),
        cpf: tenant.cpf || tenant.document || "",
        document: tenant.document || tenant.cpf || "",
        zipCode: tenant.zipCode || "",
        state: toUpperCaseValue(tenant.state || ""),
        city: toUpperCaseValue(tenant.city || ""),
        street: toUpperCaseValue(tenant.street || ""),
        number: toUpperCaseValue(tenant.number || ""),
        neighborhood: toUpperCaseValue(tenant.neighborhood || ""),
        complement: toUpperCaseValue(tenant.complement || ""),
        isTenant: tenant.isTenant ?? true,
        isActive: tenant.isActive ?? true,
      }));

      setTenants(
        normalizedTenants.length > 0 ? normalizedTenants : initialTenants
      );
    } else {
      setTenants(
        initialTenants.map((tenant) => ({
          ...tenant,
          name: toUpperCaseValue(tenant.name),
          email: formatEmailValue((tenant as RentixTenant).email || ""),
          isTenant: true,
          isActive: true,
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
    setTenantPersonType("Individual");
    setTenantCpf("");
    setTenantPhone("");
    setTenantEmail("");
    setTenantZipCode("");
    setTenantState("");
    setTenantCity("");
    setTenantStreet("");
    setTenantNumber("");
    setTenantNeighborhood("");
    setTenantComplement("");
    setTenantIsTenant(true);
    setTenantIsActive(true);
    setCpfError("");
    setIsCnpjLoading(false);
    setCnpjSearchError("");
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
      setTenantState(toUpperCaseValue(data.uf || ""));
      setTenantCity(toUpperCaseValue(data.localidade || ""));
      setTenantStreet(toUpperCaseValue(data.logradouro || ""));
      setTenantNeighborhood(toUpperCaseValue(data.bairro || ""));
    } catch {
      alert("Não foi possível consultar o CEP no momento.");
    }
  }

  function handleCpfChange(value: string) {
    const formattedDocument =
      tenantPersonType === "Company" ? formatCnpj(value) : formatCpf(value);

    setTenantCpf(formattedDocument);

    const documentDigits = formattedDocument.replace(/\D/g, "");
    const minimumLength = tenantPersonType === "Company" ? 14 : 11;

    if (documentDigits.length < minimumLength) {
      setCpfError("");
      return;
    }

    if (!isValidDocument(formattedDocument, tenantPersonType)) {
      setCpfError(
        tenantPersonType === "Company" ? "CNPJ inválido." : "CPF inválido."
      );
      return;
    }

    const documentAlreadyExists = tenants.some((tenant) => {
      const currentTenantDocument = (tenant.cpf || tenant.document || "").replace(
        /\D/g,
        ""
      );

      return (
        currentTenantDocument === documentDigits &&
        tenant.id !== editingTenantId
      );
    });

    if (documentAlreadyExists) {
      setCpfError(
        tenantPersonType === "Company"
          ? "Já existe uma pessoa cadastrada com este CNPJ."
          : "Já existe uma pessoa cadastrada com este CPF."
      );
      return;
    }

    setCpfError("");
  }

  function handlePersonTypeChange(personType: PersonType) {
    setTenantPersonType(personType);
    setTenantCpf("");
    setCpfError("");
    setCnpjSearchError("");
  }

  async function handleCnpjSearch() {
    const cleanCnpj = tenantCpf.replace(/\D/g, "");

    if (tenantPersonType !== "Company") return;

    if (cleanCnpj.length !== 14) {
      setCnpjSearchError("Informe um CNPJ com 14 números para buscar os dados.");
      return;
    }

    if (!isValidCnpj(cleanCnpj)) {
      setCnpjSearchError("CNPJ inválido. Verifique o número informado.");
      return;
    }

    try {
      setIsCnpjLoading(true);
      setCnpjSearchError("");

      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`
      );

      if (!response.ok) {
        setCnpjSearchError("Empresa não encontrada para o CNPJ informado.");
        return;
      }

      const data = (await response.json()) as BrasilApiCnpjResponse;

      const companyName =
        data.razao_social?.trim() || data.nome_fantasia?.trim() || tenantName;

      setTenantName(toUpperCaseValue(companyName));
      setTenantCpf(formatCnpj(data.cnpj || cleanCnpj));

      if (data.ddd_telefone_1) {
        setTenantPhone(formatPhone(data.ddd_telefone_1));
      }

      setTenantZipCode(data.cep ? formatZipCode(data.cep) : tenantZipCode);
      setTenantState(toUpperCaseValue(data.uf || tenantState));
      setTenantCity(toUpperCaseValue(data.municipio || tenantCity));
      setTenantStreet(toUpperCaseValue(data.logradouro || tenantStreet));
      setTenantNumber(toUpperCaseValue(data.numero || tenantNumber));
      setTenantNeighborhood(toUpperCaseValue(data.bairro || tenantNeighborhood));
      setTenantComplement(toUpperCaseValue(data.complemento || tenantComplement));
    } catch {
      setCnpjSearchError("Não foi possível consultar o CNPJ no momento.");
    } finally {
      setIsCnpjLoading(false);
    }
  }

  function handlePhoneChange(value: string) {
    setTenantPhone(formatPhone(value));
  }

  function getPersonIdFromRecord(record: Record<string, unknown>) {
    return (
      record.tenantId ||
      record.tenant_id ||
      record.personId ||
      record.person_id ||
      record.customerId ||
      record.customer_id ||
      record.supplierId ||
      record.supplier_id ||
      record.peopleId ||
      record.people_id ||
      record.person ||
      record.tenant ||
      record.customer ||
      record.supplier
    );
  }

  function personHasAnyContract(personId: number) {
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);

    if (!storedContracts) return false;

    try {
      const parsedContracts = JSON.parse(storedContracts) as Array<
        Record<string, unknown>
      >;

      return parsedContracts.some((contract) => {
        const contractPersonId = getPersonIdFromRecord(contract);

        return String(contractPersonId || "") === String(personId);
      });
    } catch {
      return false;
    }
  }

  function personHasActiveContract(personId: number) {
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);

    if (!storedContracts) return false;

    try {
      const parsedContracts = JSON.parse(storedContracts) as Array<
        Record<string, unknown>
      >;

      return parsedContracts.some((contract) => {
        const contractPersonId = getPersonIdFromRecord(contract);
        const contractStatus = String(contract.status || "").toLowerCase();
        const contractEndDate = String(contract.endDate || "");

        const isSamePerson = String(contractPersonId || "") === String(personId);
        const isDeleted = contractStatus === "deleted";
        const isCanceled = contractStatus === "canceled";
        const isFinished = contractStatus === "finished";
        const isInactive = contractStatus === "inactive";

        if (!isSamePerson || isDeleted || isCanceled || isFinished || isInactive) {
          return false;
        }

        if (!contractEndDate) {
          return contractStatus === "active";
        }

        const today = new Date();
        const endDate = new Date(`${contractEndDate}T23:59:59`);

        return contractStatus === "active" && endDate >= today;
      });
    } catch {
      return false;
    }
  }

  function personHasFinancialHistory(personId: number) {
    const storageKeys = [
      ACCOUNTS_RECEIVABLE_STORAGE_KEY,
      ACCOUNTS_PAYABLE_STORAGE_KEY,
    ];

    return storageKeys.some((storageKey) => {
      const storedRecords = localStorage.getItem(storageKey);

      if (!storedRecords) return false;

      try {
        const parsedRecords = JSON.parse(storedRecords) as Array<
          Record<string, unknown>
        >;

        return parsedRecords.some((record) => {
          const recordPersonId = getPersonIdFromRecord(record);

          return String(recordPersonId || "") === String(personId);
        });
      } catch {
        return false;
      }
    });
  }

  function personHasAnyHistory(personId: number) {
    return personHasAnyContract(personId) || personHasFinancialHistory(personId);
  }

  function getEditingTenant() {
    if (!editingTenantId) return null;

    return tenants.find((tenant) => tenant.id === editingTenantId) || null;
  }

  function handleActiveChange(checked: boolean) {
    if (!checked && editingTenantId && personHasActiveContract(editingTenantId)) {
      const tenant = getEditingTenant();

      if (tenant) {
        setBlockedInactivePerson(tenant);
      }

      return;
    }

    setTenantIsActive(checked);
  }

  function handleSubmitTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTenantName = toUpperCaseValue(tenantName);
    const normalizedTenantEmail = formatEmailValue(tenantEmail);
    const normalizedTenantState = toUpperCaseValue(tenantState);
    const normalizedTenantCity = toUpperCaseValue(tenantCity);
    const normalizedTenantStreet = toUpperCaseValue(tenantStreet);
    const normalizedTenantNumber = toUpperCaseValue(tenantNumber);
    const normalizedTenantNeighborhood = toUpperCaseValue(tenantNeighborhood);
    const normalizedTenantComplement = toUpperCaseValue(tenantComplement);

    if (!isValidDocument(tenantCpf, tenantPersonType)) {
      setCpfError(
        tenantPersonType === "Company" ? "CNPJ inválido." : "CPF inválido."
      );
      return;
    }

    const normalizedDocument = tenantCpf.replace(/\D/g, "");

    const documentAlreadyExists = tenants.some((tenant) => {
      const currentTenantDocument = (tenant.cpf || tenant.document || "").replace(
        /\D/g,
        ""
      );

      return (
        currentTenantDocument === normalizedDocument &&
        tenant.id !== editingTenantId
      );
    });

    if (documentAlreadyExists) {
      setCpfError(
        tenantPersonType === "Company"
          ? "Já existe uma pessoa cadastrada com este CNPJ."
          : "Já existe uma pessoa cadastrada com este CPF."
      );
      return;
    }

    if (!tenantIsActive && editingTenantId && personHasActiveContract(editingTenantId)) {
      const tenant = getEditingTenant();

      if (tenant) {
        setBlockedInactivePerson(tenant);
      }

      return;
    }

    if (isEditing) {
      setTenants((currentTenants) =>
        currentTenants.map((tenant) =>
          tenant.id === editingTenantId
            ? {
                ...tenant,
                name: normalizedTenantName,
                personType: tenantPersonType,
                cpf: tenantCpf,
                document: tenantCpf,
                phone: tenantPhone,
                email: normalizedTenantEmail,
                zipCode: tenantZipCode,
                state: normalizedTenantState,
                city: normalizedTenantCity,
                street: normalizedTenantStreet,
                number: normalizedTenantNumber,
                neighborhood: normalizedTenantNeighborhood,
                complement: normalizedTenantComplement,
                isTenant: tenantIsTenant,
                isActive: tenantIsActive,
              }
            : tenant
        )
      );

      resetForm();
      return;
    }

    const newTenant: RentixTenant = {
      id: Date.now(),
      name: normalizedTenantName,
      personType: tenantPersonType,
      cpf: tenantCpf,
      document: tenantCpf,
      phone: tenantPhone,
      email: normalizedTenantEmail,
      zipCode: tenantZipCode,
      state: normalizedTenantState,
      city: normalizedTenantCity,
      street: normalizedTenantStreet,
      number: normalizedTenantNumber,
      neighborhood: normalizedTenantNeighborhood,
      complement: normalizedTenantComplement,
      isTenant: tenantIsTenant,
      isActive: tenantIsActive,
    };

    setTenants((currentTenants) => [newTenant, ...currentTenants]);
    resetForm();
  }

  function handleEditTenant(tenant: RentixTenant) {
    const currentDocument = tenant.cpf || tenant.document || "";
    const currentPersonType =
      tenant.personType ||
      (currentDocument.replace(/\D/g, "").length > 11 ? "Company" : "Individual");

    setEditingTenantId(tenant.id);
    setTenantName(toUpperCaseValue(tenant.name));
    setTenantPersonType(currentPersonType);
    setTenantCpf(
      currentPersonType === "Company"
        ? formatCnpj(currentDocument)
        : formatCpf(currentDocument)
    );
    setTenantPhone(formatPhone(tenant.phone));
    setTenantEmail(formatEmailValue(tenant.email || ""));
    setTenantZipCode(tenant.zipCode || "");
    setTenantState(toUpperCaseValue(tenant.state || ""));
    setTenantCity(toUpperCaseValue(tenant.city || ""));
    setTenantStreet(toUpperCaseValue(tenant.street || ""));
    setTenantNumber(toUpperCaseValue(tenant.number || ""));
    setTenantNeighborhood(toUpperCaseValue(tenant.neighborhood || ""));
    setTenantComplement(toUpperCaseValue(tenant.complement || ""));
    setTenantIsTenant(tenant.isTenant ?? true);
    setTenantIsActive(tenant.isActive ?? true);
    setCpfError("");
    setIsFormOpen(true);
  }

  function getPersonRelatedRecords(storageKey: string, personId: number) {
    const storedRecords = localStorage.getItem(storageKey);

    if (!storedRecords) return [];

    try {
      const parsedRecords = JSON.parse(storedRecords) as Array<
        Record<string, unknown>
      >;

      return parsedRecords.filter((record) => {
        const recordPersonId = getPersonIdFromRecord(record);

        return String(recordPersonId || "") === String(personId);
      });
    } catch {
      return [];
    }
  }

  function isActiveContractRecord(contract: Record<string, unknown>) {
    const contractStatus = String(contract.status || "").toLowerCase();
    const contractEndDate = String(contract.endDate || "");

    const isDeleted = contractStatus === "deleted";
    const isCanceled = contractStatus === "canceled";
    const isFinished = contractStatus === "finished";
    const isInactive = contractStatus === "inactive";

    if (isDeleted || isCanceled || isFinished || isInactive) {
      return false;
    }

    if (!contractEndDate) {
      return contractStatus === "active";
    }

    const today = new Date();
    const endDate = new Date(`${contractEndDate}T23:59:59`);

    return contractStatus === "active" && endDate >= today;
  }

  function handleOpenPersonHistory(tenant: RentixTenant) {
    setActivePersonHistoryTab("RegistrationInfo");
    const contracts = getPersonRelatedRecords(CONTRACTS_STORAGE_KEY, tenant.id);
    const receivableRecords = getPersonRelatedRecords(
      ACCOUNTS_RECEIVABLE_STORAGE_KEY,
      tenant.id
    );
    setSelectedPersonHistory({
      person: tenant,
      contractsCount: contracts.length,
      activeContractsCount: contracts.filter(isActiveContractRecord).length,
      accountsReceivableRecords: receivableRecords,
      accountsReceivableTotal: receivableRecords.reduce(
        (total, record) => total + getFinancialRecordAmount(record),
        0
      ),
    });
  }

  function handleClosePersonHistory() {
    setSelectedPersonHistory(null);
    setActivePersonHistoryTab("RegistrationInfo");
  }

  function handleDeleteTenant(tenant: RentixTenant) {
    if (personHasAnyHistory(tenant.id)) {
      setBlockedDeletePerson(tenant);
      return;
    }

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

  function handleCloseBlockedInactivePerson() {
    setBlockedInactivePerson(null);
  }

  function handleCloseBlockedDeletePerson() {
    setBlockedDeletePerson(null);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Pessoas
            </h1>
            <p className="mt-2 text-slate-500">
              Gerencie as pessoas cadastradas
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Nova pessoa
          </button>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Pessoas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredTenants.length} de {tenants.length} pessoa(s).
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Buscar">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, CPF/CNPJ, telefone ou e-mail"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-80"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as PersonStatusFilter)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-48"
                >
                  <option value="Active">Ativos</option>
                  <option value="Inactive">Inativos</option>
                  <option value="All">Todos</option>
                  <option value="Tenant">Inquilinos</option>
                  <option value="NotTenant">Não inquilinos</option>
                </select>
              </FormField>
            </div>
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
                    CPF/CNPJ
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Situação
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-black text-slate-900">
                      <button
                        type="button"
                        onClick={() => handleOpenPersonHistory(tenant)}
                        className="text-left font-black text-slate-900 underline-offset-4 transition hover:text-orange-600 hover:underline"
                        title="Abrir histórico da pessoa"
                      >
                        {tenant.name}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatPhone(tenant.phone)}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {formatDocument(
                        tenant.cpf || tenant.document,
                        tenant.personType
                      )}
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
                      <ActiveBadge isActive={tenant.isActive ?? true} />
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

                {filteredTenants.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhuma pessoa encontrada para os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedPersonHistory && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                    Histórico da pessoa
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedPersonHistory.person.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Consulte os dados completos do cadastro e o resumo de
                    movimentações vinculadas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClosePersonHistory}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <div className="p-8">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Situação
                    </p>
                    <div className="mt-3">
                      <ActiveBadge
                        isActive={selectedPersonHistory.person.isActive ?? true}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Tipo
                    </p>
                    <p className="mt-3 text-sm font-black text-slate-900">
                      {selectedPersonHistory.person.isTenant ?? true
                        ? "Inquilino"
                        : "Não inquilino"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Contratos ativos
                    </p>
                    <p className="mt-3 text-2xl font-black text-slate-950">
                      {selectedPersonHistory.activeContractsCount}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.7rem] border border-slate-100 bg-slate-50/80 p-2">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <PersonHistoryTabButton
                      label="Informações do cadastro"
                      isActive={activePersonHistoryTab === "RegistrationInfo"}
                      onClick={() => setActivePersonHistoryTab("RegistrationInfo")}
                    />
                    <PersonHistoryTabButton
                      label="Histórico de aluguéis"
                      isActive={activePersonHistoryTab === "RentalHistory"}
                      onClick={() => setActivePersonHistoryTab("RentalHistory")}
                    />
                    <PersonHistoryTabButton
                      label="Contratos vinculados"
                      isActive={activePersonHistoryTab === "LinkedContracts"}
                      onClick={() => setActivePersonHistoryTab("LinkedContracts")}
                    />
                    <PersonHistoryTabButton
                      label="Movimentações financeiras"
                      isActive={activePersonHistoryTab === "FinancialMovements"}
                      onClick={() => setActivePersonHistoryTab("FinancialMovements")}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  {activePersonHistoryTab === "RegistrationInfo" && (
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Informações do cadastro
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Dados completos cadastrados para esta pessoa.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <PersonDetailItem
                          label="Nome / Razão social"
                          value={selectedPersonHistory.person.name}
                        />
                        <PersonDetailItem
                          label="Tipo de pessoa"
                          value={
                            selectedPersonHistory.person.personType === "Company"
                              ? "Pessoa jurídica"
                              : "Pessoa física"
                          }
                        />
                        <PersonDetailItem
                          label="CPF/CNPJ"
                          value={formatDocument(
                            selectedPersonHistory.person.cpf ||
                              selectedPersonHistory.person.document,
                            selectedPersonHistory.person.personType
                          )}
                        />
                        <PersonDetailItem
                          label="Telefone"
                          value={formatPhone(selectedPersonHistory.person.phone)}
                        />
                        <PersonDetailItem
                          label="E-mail"
                          value={
                            selectedPersonHistory.person.email || "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="CEP"
                          value={
                            selectedPersonHistory.person.zipCode || "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="Estado"
                          value={
                            selectedPersonHistory.person.state || "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="Cidade"
                          value={
                            selectedPersonHistory.person.city || "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="Logradouro"
                          value={
                            selectedPersonHistory.person.street || "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="Número"
                          value={
                            selectedPersonHistory.person.number || "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="Bairro"
                          value={
                            selectedPersonHistory.person.neighborhood ||
                            "Não informado"
                          }
                        />
                        <PersonDetailItem
                          label="Complemento"
                          value={
                            selectedPersonHistory.person.complement ||
                            "Não informado"
                          }
                        />
                      </div>
                    </div>
                  )}

                  {activePersonHistoryTab === "RentalHistory" && (
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Histórico de aluguéis
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Resumo dos vínculos de aluguel relacionados a esta pessoa.
                      </p>

                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <p className="text-sm font-black text-slate-900">
                          Contratos de aluguel encontrados
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                          Total de {selectedPersonHistory.contractsCount} contrato(s)
                          vinculado(s), sendo {selectedPersonHistory.activeContractsCount}
                          ativo(s).
                        </p>
                      </div>

                      {selectedPersonHistory.contractsCount === 0 && (
                        <EmptyPersonHistoryState
                          title="Nenhum aluguel encontrado"
                          description="Esta pessoa ainda não possui histórico de aluguéis vinculado."
                        />
                      )}
                    </div>
                  )}

                  {activePersonHistoryTab === "LinkedContracts" && (
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Contratos vinculados
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Consulta resumida dos contratos ligados ao cadastro.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <PersonDetailItem
                          label="Total de contratos"
                          value={`${selectedPersonHistory.contractsCount}`}
                        />
                        <PersonDetailItem
                          label="Contratos ativos"
                          value={`${selectedPersonHistory.activeContractsCount}`}
                        />
                      </div>

                      {selectedPersonHistory.contractsCount === 0 && (
                        <EmptyPersonHistoryState
                          title="Nenhum contrato vinculado"
                          description="Esta pessoa ainda não possui contratos vinculados no sistema."
                        />
                      )}
                    </div>
                  )}

                  {activePersonHistoryTab === "FinancialMovements" && (
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Movimentações financeiras
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Informações buscadas diretamente nas contas a receber vinculadas a esta pessoa.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <PersonDetailItem
                          label="Contas a receber"
                          value={`${selectedPersonHistory.accountsReceivableRecords.length}`}
                        />
                        <PersonDetailItem
                          label="Valor total"
                          value={formatCurrency(selectedPersonHistory.accountsReceivableTotal)}
                        />
                      </div>

                      {selectedPersonHistory.accountsReceivableRecords.length > 0 && (
                        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                                  Descrição
                                </th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                                  Vencimento
                                </th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                                  Valor
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 bg-white">
                              {selectedPersonHistory.accountsReceivableRecords.map(
                                (record, index) => (
                                  <tr key={getFinancialRecordKey(record, index)}>
                                    <td className="px-4 py-4 text-sm font-black text-slate-800">
                                      {getFinancialRecordDescription(record)}
                                    </td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                                      {formatDateValue(getFinancialRecordDueDate(record))}
                                    </td>
                                    <td className="px-4 py-4">
                                      <FinancialStatusBadge
                                        status={getFinancialRecordStatus(record)}
                                      />
                                    </td>
                                    <td className="px-4 py-4 text-right text-sm font-black text-slate-900">
                                      {formatCurrency(getFinancialRecordAmount(record))}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {selectedPersonHistory.accountsReceivableRecords.length === 0 && (
                        <EmptyPersonHistoryState
                          title="Nenhuma conta a receber encontrada"
                          description="Esta pessoa ainda não possui contas a receber vinculadas no sistema."
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {isEditing ? "Editar pessoa" : "Nova pessoa"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados pessoais e endereço da pessoa.
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
                      <FormField label="Nome completo / Razão social">
                        <input
                          type="text"
                          value={tenantName}
                          onChange={(event) => setTenantName(toUpperCaseValue(event.target.value))}
                          placeholder={
                            tenantPersonType === "Company"
                              ? "Ex: Empresa LTDA"
                              : "Ex: João Silva"
                          }
                          required
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </FormField>

                      <FormField label="Tipo de pessoa">
                        <select
                          value={tenantPersonType}
                          onChange={(event) =>
                            handlePersonTypeChange(event.target.value as PersonType)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        >
                          <option value="Individual">Pessoa física</option>
                          <option value="Company">Pessoa jurídica</option>
                        </select>
                      </FormField>

                      <FormField
                        label={tenantPersonType === "Company" ? "CNPJ" : "CPF"}
                      >
                        <input
                          type="text"
                          value={tenantCpf}
                          onChange={(event) =>
                            handleCpfChange(event.target.value)
                          }
                          onBlur={() => {
                            if (tenantPersonType === "Company") {
                              handleCnpjSearch();
                            }
                          }}
                          placeholder={
                            tenantPersonType === "Company"
                              ? "Ex: 12.345.678/0001-90"
                              : "Ex: 123.456.789-00"
                          }
                          maxLength={tenantPersonType === "Company" ? 18 : 14}
                          required
                          className={`w-full rounded-2xl border px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                            cpfError
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-slate-200 focus:border-orange-500 focus:ring-orange-100"
                          }`}
                        />

                        {tenantPersonType === "Company" && (
                          <button
                            type="button"
                            onClick={handleCnpjSearch}
                            disabled={isCnpjLoading}
                            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isCnpjLoading ? "Buscando CNPJ..." : "Buscar dados da empresa"}
                          </button>
                        )}

                        {cpfError && (
                          <p className="mt-2 text-xs font-bold text-red-500">
                            {cpfError}
                          </p>
                        )}

                        {cnpjSearchError && tenantPersonType === "Company" && (
                          <p className="mt-2 text-xs font-bold text-red-500">
                            {cnpjSearchError}
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

                      <FormField label="E-mail (opcional)">
                        <input
                          type="email"
                          value={tenantEmail}
                          onChange={(event) =>
                            setTenantEmail(formatEmailValue(event.target.value))
                          }
                          placeholder="Ex: pessoa@email.com"
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
                            É inquilino
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Quando desmarcado, esta pessoa não poderá ser
                            vinculada a contratos de aluguel.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-5">
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                        <input
                          type="checkbox"
                          checked={tenantIsActive}
                          onChange={(event) =>
                            handleActiveChange(event.target.checked)
                          }
                          className="mt-1 h-5 w-5 rounded border-slate-300 accent-orange-500"
                        />

                        <div>
                          <p className="text-sm font-black text-slate-800">
                            Pessoa ativa
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Quando desmarcado, esta pessoa fica inativa no
                            sistema. Pessoas vinculadas a contratos não podem
                            ser inativadas.
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
                            setTenantState(toUpperCaseValue(event.target.value))
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
                          onChange={(event) => setTenantCity(toUpperCaseValue(event.target.value))}
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
                            setTenantStreet(toUpperCaseValue(event.target.value))
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
                            setTenantNumber(toUpperCaseValue(event.target.value))
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
                            setTenantNeighborhood(toUpperCaseValue(event.target.value))
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
                            setTenantComplement(toUpperCaseValue(event.target.value))
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
                    {isEditing ? "Salvar alterações" : "Cadastrar pessoa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {blockedInactivePerson && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-orange-100 bg-white p-8 shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-3xl">
                ⚠️
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Pessoa vinculada a contrato
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Esta pessoa possui contrato ativo vinculado e não pode
                  ser inativada. Para alterar a situação do cadastro, encerre ou
                  remova o contrato ativo primeiro.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">
                    {blockedInactivePerson.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatDocument(
                      blockedInactivePerson.cpf || blockedInactivePerson.document,
                      blockedInactivePerson.personType
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleCloseBlockedInactivePerson}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

        {blockedDeletePerson && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-orange-100 bg-white p-8 shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-3xl">
                ⚠️
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Pessoa com histórico
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Este cadastro possui vínculos com contratos ou financeiro e
                  não pode ser excluído. Caso necessário, altere a situação para
                  inativo.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">
                    {blockedDeletePerson.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatDocument(
                      blockedDeletePerson.cpf || blockedDeletePerson.document,
                      blockedDeletePerson.personType
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleCloseBlockedDeletePerson}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                >
                  Entendi
                </button>
              </div>
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
                  Excluir pessoa?
                </h3>

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Esta ação removerá a pessoa do sistema.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">
                    {tenantToDelete.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDocument(
                      tenantToDelete.cpf || tenantToDelete.document,
                      tenantToDelete.personType
                    )}
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

type PersonHistoryTabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

type EmptyPersonHistoryStateProps = {
  title: string;
  description: string;
};

function PersonHistoryTabButton({
  label,
  isActive,
  onClick,
}: PersonHistoryTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-wide transition ${
        isActive
          ? "bg-orange-500 text-white shadow-md shadow-orange-100"
          : "bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyPersonHistoryState({
  title,
  description,
}: EmptyPersonHistoryStateProps) {
  return (
    <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
      <p className="text-sm font-black text-emerald-700">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700/80">
        {description}
      </p>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

type PersonDetailItemProps = {
  label: string;
  value: string;
};

function PersonDetailItem({ label, value }: PersonDetailItemProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

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

function ActiveBadge({ isActive }: { isActive: boolean }) {
  const activeConfig = isActive
    ? {
        label: "Ativo",
        className: "bg-emerald-100 text-emerald-700",
      }
    : {
        label: "Inativo",
        className: "bg-slate-100 text-slate-600",
      };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${activeConfig.className}`}
    >
      {activeConfig.label}
    </span>
  );
}

function getRecordStringValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function getFinancialRecordKey(record: Record<string, unknown>, index: number) {
  return getRecordStringValue(record, ["id", "receivableId", "accountId"]) || `financial-record-${index}`;
}

function getFinancialRecordDescription(record: Record<string, unknown>) {
  return (
    getRecordStringValue(record, [
      "description",
      "title",
      "name",
      "reference",
      "installment",
      "category",
    ]) || "Conta a receber"
  );
}

function getFinancialRecordDueDate(record: Record<string, unknown>) {
  return getRecordStringValue(record, [
    "dueDate",
    "due_date",
    "date",
    "paymentDate",
    "payment_date",
    "competenceDate",
    "competence_date",
  ]);
}

function getFinancialRecordStatus(record: Record<string, unknown>) {
  return getRecordStringValue(record, ["status", "paymentStatus", "payment_status"]);
}

function getFinancialRecordAmount(record: Record<string, unknown>) {
  const rawValue =
    record.amount ??
    record.value ??
    record.total ??
    record.totalValue ??
    record.total_value ??
    record.price ??
    record.installmentValue ??
    record.installment_value ??
    0;

  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : 0;
  }

  const normalizedValue = String(rawValue)
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateValue(value: string) {
  if (!value) return "Não informado";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function FinancialStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();

  const config = normalizedStatus.includes("paid") || normalizedStatus.includes("pago")
    ? { label: "Pago", className: "bg-emerald-100 text-emerald-700" }
    : normalizedStatus.includes("overdue") || normalizedStatus.includes("vencido")
      ? { label: "Vencido", className: "bg-red-100 text-red-700" }
      : normalizedStatus.includes("pending") || normalizedStatus.includes("pendente")
        ? { label: "Pendente", className: "bg-amber-100 text-amber-700" }
        : { label: status || "Não informado", className: "bg-slate-100 text-slate-600" };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatEmailValue(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function toUpperCaseValue(value: string) {
  return String(value ?? "").toUpperCase();
}

function formatCpf(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatCnpj(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function formatDocument(value: string, personType?: PersonType) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (personType === "Company" || digits.length > 11) {
    return formatCnpj(value);
  }

  return formatCpf(value);
}

function isValidDocument(value: string, personType: PersonType) {
  if (personType === "Company") {
    return isValidCnpj(value);
  }

  return isValidCpf(value);
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

function isValidCnpj(value: string) {
  const cnpj = value.replace(/\D/g, "");

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce(
      (total, weight, index) => total + Number(base[index]) * weight,
      0
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
