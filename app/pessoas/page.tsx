"use client";

import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Building2,
  LoaderCircle,
  Maximize2,
  Minus,
  Search,
  UserCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PersonCreateModal } from "@/components/people/person-create-modal";
import {
  createPerson,
  deletePerson,
  getPeople,
  updatePerson,
  type Person as ApiPerson,
} from "@/services/people.service";
import { getProperties, type Property as ApiProperty } from "@/services/properties.service";
import { getContracts, type Contract as ApiContract } from "@/services/contracts.service";
import {
  getPayableAccounts,
  getReceivableAccounts,
  type PayableAccount,
  type ReceivableAccount,
} from "@/services/financial.service";
import {
  clearMinimizedModalState,
  getMinimizedModalState,
  setMinimizedModalState,
  CLOSE_MINIMIZED_MODAL_EVENT,
  RESTORE_MINIMIZED_MODAL_EVENT,
} from "@/services/minimized-modal.service";

type ApiPersonType = "INDIVIDUAL" | "COMPANY";
type ApiPersonStatus = "ACTIVE" | "INACTIVE";

type PersonType = "individual" | "company";
type PersonStatus = "active" | "inactive";

type PersonTypeFilter = "all" | PersonType;

type ToastType = "success" | "error" | "info";

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
  isTenant: boolean;
  status: PersonStatus;
  createdAt: string;
  photo?: string | null;
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
  addressNumber: string;
  district: string;
  reference: string;
  isTenant: boolean;
  status: PersonStatus;
  photo: string | null;
};

type PersonModalDraft = PersonFormData & {
  editingPersonId: string | null;
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
  addressNumber: "",
  district: "",
  reference: "",
  isTenant: true,
  status: "active",
  photo: null,
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
    name: toUpperText(apiPerson.name),
    type: convertApiTypeToPersonType(apiPerson.type),
    document: formatDocument(apiPerson.document, convertApiTypeToPersonType(apiPerson.type)),
    stateRegistration: toUpperText(apiPerson.stateRegistration ?? ""),
    identityNumber: toUpperText(apiPerson.identityNumber ?? ""),
    email: toUpperText(apiPerson.email ?? ""),
    phone: apiPerson.phone ?? "",
    zipCode: apiPerson.zipCode ?? "",
    city: toUpperText(apiPerson.city ?? ""),
    state: toUpperText(apiPerson.state ?? ""),
    address: toUpperText(apiPerson.address ?? ""),
    isTenant: apiPerson.isTenant !== false,
    status: convertApiStatusToPersonStatus(apiPerson.status),
    createdAt: apiPerson.createdAt,
    photo: apiPerson.photo,
  };
}

function personHasActiveContract(personId: string, contracts: ApiContract[]): boolean {
  return contracts.some(
    (contract) =>
      contract.tenantId === personId &&
      contract.status === "ACTIVE"
  );
}

function personHasRelationships(
  personId: string,
  properties: ApiProperty[],
  contracts: ApiContract[],
  receivables: ReceivableAccount[],
  payables: PayableAccount[]
): boolean {
  const hasOwnedProperties = properties.some(
    (property) => String(property.ownerId || "") === String(personId)
  );
  const hasTenantContracts = contracts.some(
    (contract) => String(contract.tenantId || "") === String(personId)
  );
  const hasReceivables = receivables.some(
    (account) => String(account.tenantId || "") === String(personId)
  );
  const hasPayables = payables.some(
    (account) => String(account.personId || "") === String(personId)
  );

  return hasOwnedProperties || hasTenantContracts || hasReceivables || hasPayables;
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

function toUpperText(value: string) {
  return value.toLocaleUpperCase("pt-BR").trimStart();
}

function formatPersonFormValue(field: keyof PersonFormData, value: string) {
  if (
    field === "name" ||
    field === "stateRegistration" ||
    field === "identityNumber" ||
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

function parsePersonAddress(address: string) {
  let remainingAddress = toUpperText(address).trim();
  let reference = "";
  let district = "";
  let addressNumber = "";

  const referenceMatch = remainingAddress.match(/\s-\sREFER[ÊE]NCIA:\s(.+)$/i);
  if (referenceMatch?.[1]) {
    reference = referenceMatch[1].trim();
    remainingAddress = remainingAddress.slice(0, referenceMatch.index).trim();
  }

  const districtMatch = remainingAddress.match(/\s-\sBAIRRO:\s(.+)$/i);
  if (districtMatch?.[1]) {
    district = districtMatch[1].trim();
    remainingAddress = remainingAddress.slice(0, districtMatch.index).trim();
  }

  const numberMatch = remainingAddress.match(/,\s*N[ºO]\s*([^,]+)$/i);
  if (numberMatch?.[1]) {
    addressNumber = numberMatch[1].trim();
    remainingAddress = remainingAddress.slice(0, numberMatch.index).trim();
  }

  if (!district && remainingAddress.includes(" - ")) {
    const [legacyAddress, ...legacyDistrictParts] = remainingAddress.split(" - ");
    remainingAddress = legacyAddress.trim();
    district = legacyDistrictParts.join(" - ").trim();
  }

  return {
    address: remainingAddress,
    addressNumber,
    district,
    reference,
  };
}

export default function PeoplePage() {
  const { user } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PersonStatus>("active");
  const [typeFilter, setTypeFilter] = useState<PersonTypeFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PersonFormData>(emptyFormData);
  const [editActiveTab, setEditActiveTab] = useState("identificacao");
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingZipCode, setIsSearchingZipCode] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [zipCodeError, setZipCodeError] = useState<string | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [personToInactivate, setPersonToInactivate] = useState<Person | null>(null);
  const [isInactivating, setIsInactivating] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyPerson, setHistoryPerson] = useState<Person | null>(null);
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [receivableAccounts, setReceivableAccounts] = useState<ReceivableAccount[]>([]);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  const companyId = user?.companyId;

  const closeModal = useCallback(() => {
    if (isSaving) return;

    clearMinimizedModalState("people");
    setIsModalOpen(false);
    setIsModalMinimized(false);
    setEditingPersonId(null);
    setFormData(emptyFormData);
    setZipCodeError(null);
    setCnpjError(null);
  }, [isSaving]);

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

  useEffect(() => {
    const storedModalState = getMinimizedModalState<PersonModalDraft>();

    if (storedModalState?.tool === "people" && storedModalState.draft) {
      setEditingPersonId(storedModalState.draft.editingPersonId);
      setFormData(storedModalState.draft);
      setIsModalOpen(true);
      setIsModalMinimized(false);
      clearMinimizedModalState("people");
    }

    function handleRestoreMinimizedModal(event: Event) {
      const detail = (event as CustomEvent<{ tool?: string }>).detail;

      if (detail?.tool !== "people") return;

      const currentState = getMinimizedModalState<PersonModalDraft>();

      if (currentState?.tool === "people" && currentState.draft) {
        setFormData(currentState.draft);
        setEditingPersonId(currentState.draft.editingPersonId);
      }

      setIsModalOpen(true);
      setIsModalMinimized(false);
      clearMinimizedModalState("people");
    }

    function handleCloseMinimizedModal(event: Event) {
      const detail = (event as CustomEvent<{ tool?: string }>).detail;

      if (detail?.tool !== "people") return;

      closeModal();
    }

    window.addEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestoreMinimizedModal);
    window.addEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleCloseMinimizedModal);

    return () => {
      window.removeEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestoreMinimizedModal);
      window.removeEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleCloseMinimizedModal);
    };
  }, [closeModal]);

  async function loadPeople(currentCompanyId: string) {
    try {
      setIsLoadingPeople(true);
      setPageError(null);

      const [
        peopleResponse,
        propertiesResponse,
        contractsResponse,
        receivablesResponse,
        payablesResponse,
      ] = await Promise.all([
        getPeople(currentCompanyId),
        getProperties(currentCompanyId),
        getContracts(currentCompanyId),
        getReceivableAccounts(currentCompanyId),
        getPayableAccounts(currentCompanyId),
      ]);

      setPeople(peopleResponse.map(mapApiPersonToPerson));
      setProperties(propertiesResponse);
      setContracts(contractsResponse);
      setReceivableAccounts(receivablesResponse);
      setPayableAccounts(payablesResponse);
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
        normalizeText(person.identityNumber).includes(normalizedSearch) ||
        normalizeText(person.stateRegistration).includes(normalizedSearch) ||
        normalizeText(person.email).includes(normalizedSearch) ||
        normalizeText(person.phone).includes(normalizedSearch) ||
        normalizeText(person.city).includes(normalizedSearch) ||
        normalizeText(person.address).includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || person.status === statusFilter;
      const matchesType = typeFilter === "all" || person.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [people, searchTerm, statusFilter, typeFilter]);

  const activePeople = people.filter((person) => person.status === "active").length;
  const inactivePeople = people.filter((person) => person.status === "inactive").length;
  const individualPeople = people.filter((person) => person.type === "individual").length;
  const companyPeople = people.filter((person) => person.type === "company").length;

  const historyData = useMemo(() => {
    if (!historyPerson) {
      return {
        ownedProperties: [] as ApiProperty[],
        tenantContracts: [] as ApiContract[],
        receivables: [] as ReceivableAccount[],
        payables: [] as PayableAccount[],
      };
    }

    return {
      ownedProperties: properties.filter(
        (property) => String(property.ownerId || "") === String(historyPerson.id)
      ),
      tenantContracts: contracts.filter(
        (contract) => String(contract.tenantId || "") === String(historyPerson.id)
      ),
      receivables: receivableAccounts.filter(
        (account) => String(account.tenantId || "") === String(historyPerson.id)
      ),
      payables: payableAccounts.filter(
        (account) => String(account.personId || "") === String(historyPerson.id)
      ),
    };
  }, [contracts, historyPerson, payableAccounts, properties, receivableAccounts]);

  const historyMovementCount =
    historyData.ownedProperties.length +
    historyData.tenantContracts.length +
    historyData.receivables.length +
    historyData.payables.length;

  function getPersonModalDraft(): PersonModalDraft {
    return {
      ...formData,
      editingPersonId,
    };
  }

  function handleMinimizeModal() {
    setMinimizedModalState<PersonModalDraft>({
      tool: "people",
      href: "/pessoas",
      title: editingPersonId ? "Editar pessoa" : "Nova pessoa",
      subtitle: formData.name || "Cadastro em andamento",
      mode: editingPersonId ? "edit" : "create",
      draft: getPersonModalDraft(),
      updatedAt: Date.now(),
    });
    setIsModalMinimized(true);
  }

  function handleRestoreModal() {
    clearMinimizedModalState("people");
    setIsModalMinimized(false);
  }

  function openCreateModal() {
    clearMinimizedModalState("people");
    setEditingPersonId(null);
    setFormData(emptyFormData);
    setPageError(null);
    setZipCodeError(null);
    setCnpjError(null);
    setIsModalMinimized(false);
    setIsModalOpen(true);
  }

  function openEditModal(person: Person) {
    const addressData = parsePersonAddress(person.address);
    setEditActiveTab("identificacao");

    clearMinimizedModalState("people");
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
      address: addressData.address,
      addressNumber: addressData.addressNumber,
      district: addressData.district,
      reference: addressData.reference,
      isTenant: person.isTenant,
      status: person.status,
      photo: person.photo || null,
    });
    setPageError(null);
    setZipCodeError(null);
    setCnpjError(null);
    setIsModalMinimized(false);
    setIsModalOpen(true);
  }

  function openPersonHistory(person: Person) {
    setHistoryPerson(person);
  }

  function closePersonHistory() {
    setHistoryPerson(null);
  }

  function updateFormData(field: keyof PersonFormData, value: string) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: formatPersonFormValue(field, value),
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

      setFormData((currentFormData) => ({
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
          toUpperText(data.razao_social?.trim() || "") ||
          toUpperText(data.nome_fantasia?.trim() || "") ||
          currentFormData.name,
        email: toUpperText(data.email?.trim() || "") || currentFormData.email,
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

    if (formData.status === "inactive" && editingPersonId && personHasActiveContract(editingPersonId, contracts)) {
      setPageError("Não é possível inativar esta pessoa pois ela possui um contrato ativo vinculado.");
      return;
    }

    if (!formData.name.trim() || !formData.document.trim()) {
      setPageError("Informe nome e documento para salvar a pessoa.");
      return;
    }

    if (!isValidDocument(formData.document, formData.type)) {
      setPageError(
        formData.type === "company"
          ? "Informe um CNPJ válido para salvar a pessoa."
          : "Informe um CPF válido para salvar a pessoa."
      );
      return;
    }

    const normalizedDocument = onlyDigits(formData.document);
    const documentAlreadyExists = people.some(
      (person) =>
        person.id !== editingPersonId &&
        onlyDigits(person.document) === normalizedDocument,
    );

    if (documentAlreadyExists) {
      setPageError("Já existe uma pessoa cadastrada com este documento.");
      return;
    }

    const personData = {
      type: convertPersonTypeToApiType(formData.type),
      status: convertPersonStatusToApiStatus(formData.status),
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
      email: toUpperText(formData.email).trim() || undefined,
      phone: formData.phone.trim() || undefined,
      zipCode: formData.zipCode.trim() || undefined,
      city: toUpperText(formData.city).trim() || undefined,
      state: toUpperText(formData.state).trim() || undefined,
      address: buildPersonAddress(formData) || undefined,
      isTenant: formData.isTenant,
    };

    try {
      setIsSaving(true);
      setPageError(null);

      if (editingPersonId) {
        const updatedPerson = await updatePerson(editingPersonId, personData);

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

      const createdPerson = await createPerson(personData);

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

  function openInactivateModal(person: Person) {
    setPersonToInactivate(person);
  }

  function closeInactivateModal() {
    if (isInactivating) return;
    setPersonToInactivate(null);
  }

  async function handleInactivateConfirmed() {
    if (!personToInactivate) return;

    try {
      setIsInactivating(true);
      setPageError(null);

      const updatedPerson = await updatePerson(personToInactivate.id, {
        status: "INACTIVE",
      });

      setPeople((currentPeople) =>
        currentPeople.map((person) =>
          person.id === personToInactivate.id ? mapApiPersonToPerson(updatedPerson) : person
        )
      );

      setToast({
        type: "success",
        message: "Pessoa inativada com sucesso.",
      });

      setPersonToInactivate(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível inativar a pessoa.";

      setPageError(message);
      setToast({
        type: "error",
        message,
      });
    } finally {
      setIsInactivating(false);
    }
  }

  function openDeleteModal() {
    const selectedPerson = people.find((person) => person.id === editingPersonId);

    if (!selectedPerson) return;

    if (personHasRelationships(selectedPerson.id, properties, contracts, receivableAccounts, payableAccounts)) {
      setToast({
        type: "error",
        message: "Não é possível excluir esta pessoa pois ela possui propriedades vinculadas, contratos ativos/pendentes ou movimentações financeiras no histórico. Sugerimos inativar a pessoa em vez de excluí-la.",
      });
      return;
    }

    setPersonToDelete(selectedPerson);
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

      await deletePerson(personToDelete.id);

      setPeople((currentPeople) =>
        currentPeople.filter((person) => person.id !== personToDelete.id)
      );

      setToast({
        type: "success",
        message: "Pessoa excluída com sucesso.",
      });

      setPersonToDelete(null);
      closeModal();
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
    <>
      <div className="contrx-module-page contrx-properties-page space-y-5">
        <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Pessoas
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Gerencie clientes, inquilinos, fornecedores e pessoas vinculadas aos contratos.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Nova pessoa
          </button>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <PeopleStatCard
            icon={<UserRound className="h-5 w-5" />}
            label="Total cadastrado"
            value={people.length}
            detail={`${filteredPeople.length} visível(is) com filtros atuais`}
          />
          <PeopleStatCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Ativos"
            value={activePeople}
            detail="Disponíveis para operações"
          />
          <PeopleStatCard
            icon={<Building2 className="h-5 w-5" />}
            label="Pessoa jurídica"
            value={companyPeople}
            detail={`${individualPeople} pessoa(s) física(s)`}
          />
          <PeopleStatCard
            icon={<UserX className="h-5 w-5" />}
            label="Inativos"
            value={inactivePeople}
            detail="Mantidos para histórico"
          />
        </section>

        {pageError && !isModalOpen && (
          <section className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
            {pageError}
          </section>
        )}

        <section className="contrx-module-panel rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_560px] lg:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950 sm:text-2xl">Cadastros</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Exibindo {filteredPeople.length} de {people.length} pessoa(s).
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_150px_170px]">
              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Buscar</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nome, documento, cidade ou e-mail"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | PersonStatus)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Tipo</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as PersonTypeFilter)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="all">Todos</option>
                  <option value="individual">Pessoa física</option>
                  <option value="company">Pessoa jurídica</option>
                </select>
              </label>
            </div>
          </div>

          {/* Vista Desktop */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1040px] border-collapse bg-white text-left text-sm">
              <thead className="bg-orange-50 text-sm font-black text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-black">Nome</th>
                  <th className="px-5 py-4 font-black">Telefone</th>
                  <th className="px-5 py-4 font-black">CPF/CNPJ</th>
                  <th className="px-5 py-4 font-black">Tipo</th>
                  <th className="px-5 py-4 font-black">Uso</th>
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
                    <tr key={person.id} className="transition hover:bg-orange-50/25">
                      <td className="px-5 py-5">
                        <button
                          type="button"
                          onClick={() => openPersonHistory(person)}
                          className="block max-w-[420px] truncate text-left text-sm font-black uppercase text-slate-950 transition hover:text-orange-600 hover:underline"
                          title="Clique para ver o histórico desta pessoa"
                        >
                          {person.name}
                        </button>
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
                            person.isTenant
                              ? "bg-orange-50 text-orange-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {person.isTenant ? "Inquilino" : "Não inquilino"}
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
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoadingPeople && filteredPeople.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
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

          {/* Vista Mobile */}
          <div className="space-y-4 lg:hidden">
            {isLoadingPeople && (
              <div className="flex h-32 items-center justify-center bg-white rounded-2xl border border-slate-200">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
              </div>
            )}
            
            {!isLoadingPeople && filteredPeople.map((person) => (
              <div key={person.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => openPersonHistory(person)}
                      className="block text-sm font-black uppercase text-slate-950 text-left hover:text-orange-600 hover:underline"
                    >
                      {person.name}
                    </button>
                    <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                      {person.document}
                    </span>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      person.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {person.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-655 border-t border-slate-100 pt-3">
                  <p>
                    <span className="font-bold text-slate-400">E-mail:</span> {person.email || "Não informado"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-400">Telefone:</span> {person.phone || "Não informado"}
                  </p>
                  {person.type === "individual" ? (
                    <p>
                      <span className="font-bold text-slate-400">RG:</span> {person.identityNumber || "Não informado"}
                    </p>
                  ) : (
                    <p>
                      <span className="font-bold text-slate-400">IE:</span> {person.stateRegistration || "Não informada"}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                      {person.type === "individual" ? "Pessoa física" : "Pessoa jurídica"}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        person.isTenant
                          ? "bg-orange-50 text-orange-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {person.isTenant ? "Inquilino" : "Não inquilino"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openPersonHistory(person)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Histórico
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(person)}
                    className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-600"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}

            {!isLoadingPeople && filteredPeople.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Nenhuma pessoa encontrada.
              </div>
            )}
          </div>
        </section>
      </div>

      {historyPerson && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-orange-100 bg-white px-8 py-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Histórico da pessoa
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {historyPerson.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closePersonHistory}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                title="Fechar histórico"
                aria-label="Fechar histórico"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <HistoryInfo label="Tipo" value={getPersonTypeLabel(historyPerson.type)} />
                <HistoryInfo label="Documento" value={historyPerson.document} />
                <HistoryInfo label="Status" value={historyPerson.status === "active" ? "Ativo" : "Inativo"} />
                <HistoryInfo label="Movimentações" value={String(historyMovementCount)} />
                <HistoryInfo label="Telefone" value={historyPerson.phone || "Não informado"} />
                <HistoryInfo label="E-mail" value={historyPerson.email || "Não informado"} />
                <HistoryInfo label="Cidade/UF" value={`${historyPerson.city || "-"} / ${historyPerson.state || "-"}`} />
                <HistoryInfo label="CEP" value={historyPerson.zipCode || "Não informado"} />
                <HistoryInfo label="Endereço" value={historyPerson.address || "Não informado"} wide />
              </div>

              <HistorySection
                title="Bens/Ativos como proprietário"
                emptyMessage="Nenhum bem/ativo vinculado como proprietário."
              >
                {historyData.ownedProperties.map((property) => (
                  <HistoryRow
                    key={property.id}
                    title={property.title}
                    detail={`${property.city || "-"} / ${property.state || "-"} · ${formatCurrency(Number(property.rentalValue || 0))}`}
                    meta={property.isActive ? "Ativo" : "Inativo"}
                  />
                ))}
              </HistorySection>

              <HistorySection
                title="Contratos como inquilino"
                emptyMessage="Nenhum contrato vinculado como inquilino."
              >
                {historyData.tenantContracts.map((contract) => (
                  <HistoryRow
                    key={contract.id}
                    title={contract.propertyName || contract.property?.title || "Bem/ativo não informado"}
                    detail={`${formatDate(contract.startDate)} até ${formatDate(contract.endDate)} · ${formatCurrency(Number(contract.rentValue || 0))}`}
                    meta={getContractStatusLabel(contract.status)}
                  />
                ))}
              </HistorySection>

              <HistorySection
                title="Contas a receber"
                emptyMessage="Nenhuma conta a receber vinculada."
              >
                {historyData.receivables.map((account) => (
                  <HistoryRow
                    key={account.id}
                    title={account.propertyName || "Bem/ativo não informado"}
                    detail={`${formatDate(account.dueDate)} · ${formatCurrency(Number(account.amount || 0))}`}
                    meta={getFinancialStatusLabel(account.status)}
                  />
                ))}
              </HistorySection>

              <HistorySection
                title="Contas a pagar"
                emptyMessage="Nenhuma conta a pagar vinculada."
              >
                {historyData.payables.map((account) => (
                  <HistoryRow
                    key={account.id}
                    title={account.description || account.category || "Conta sem descrição"}
                    detail={`${formatDate(account.dueDate)} · ${formatCurrency(Number(account.amount || 0))}`}
                    meta={getFinancialStatusLabel(account.status)}
                  />
                ))}
              </HistorySection>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && isModalMinimized && (
        <div className="contrx-minimized-modal fixed bottom-6 right-6 z-50 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border-2 border-orange-300 bg-white shadow-2xl">
          <div className="h-2 bg-orange-500" />
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide text-orange-700">
                    Minimizado
                  </span>
                  <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgb(249_115_22/0.16)]" />
                </div>
                <p className="truncate text-base font-black text-slate-950">
                  {editingPersonId ? "Editar pessoa" : "Nova pessoa"}
                </p>
                <p className="truncate text-sm font-semibold text-slate-500">
                  {formData.name || "Cadastro em andamento"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreModal}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                  title="Restaurar modal"
                  aria-label="Restaurar modal"
                >
                  <Maximize2 className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  title="Fechar modal"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PersonCreateModal
        open={isModalOpen && !editingPersonId && !isModalMinimized}
        companyId={companyId}
        people={people}
        initialData={formData}
        onDraftChange={setFormData}
        onMinimize={handleMinimizeModal}
        onClose={closeModal}
        onCreated={(createdPerson) => {
          setPeople((currentPeople) => [
            mapApiPersonToPerson(createdPerson),
            ...currentPeople,
          ]);
          setToast({
            type: "success",
            message: "Pessoa cadastrada com sucesso.",
          });
        }}
      />

      {isModalOpen && editingPersonId && !isModalMinimized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-orange-100 px-8 py-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {editingPersonId ? "Editar pessoa" : "Nova pessoa"}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Informe os dados principais para usar nos módulos do Contrx.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMinimizeModal}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                  title="Minimizar modal"
                  aria-label="Minimizar modal"
                >
                  <Minus className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                  title="Fechar modal"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navegação por Abas */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 px-8 gap-2 overflow-x-auto shrink-0">
              {[
                { id: "identificacao", label: "Identificação", icon: "👤" },
                { id: "contato", label: "Contato", icon: "📞" },
                { id: "endereco", label: "Endereço", icon: "📍" },
                { id: "foto", label: "Foto (Em Breve)", icon: "📷" }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditActiveTab(tab.id)}
                  className={`py-4 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition shrink-0 ${
                    editActiveTab === tab.id
                      ? "border-orange-500 text-orange-600 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-8 py-6">
                {editActiveTab === "identificacao" && (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                    <FormField label="Nome / Razão social" required>
                      <input
                        value={formData.name}
                        onChange={(event) => updateFormData("name", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
                      <div className={formData.type === "company" ? "grid grid-cols-[1fr_auto] gap-3" : ""}>
                        <input
                          value={formData.document}
                          onChange={(event) =>
                            updateFormData("document", formatDocument(event.target.value, formData.type))
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
                    </FormField>

                    <FormField label={formData.type === "individual" ? "RG / Identidade" : "Inscrição estadual"}>
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
                    </FormField>

                    <FormField label="Status">
                      <select
                        value={formData.status}
                        onChange={(event) => {
                          const newStatus = event.target.value as PersonStatus;
                          if (newStatus === "inactive" && editingPersonId && personHasActiveContract(editingPersonId, contracts)) {
                            alert("Não é possível inativar esta pessoa pois ela possui um contrato ativo vinculado.");
                            return;
                          }
                          updateFormData("status", newStatus);
                        }}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </FormField>

                    <div className="md:col-span-2">
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50">
                        <input
                          type="checkbox"
                          checked={formData.isTenant}
                          onChange={(event) =>
                            setFormData((currentFormData) => ({
                              ...currentFormData,
                              isTenant: event.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span>
                          <span className="block text-sm font-black text-slate-900">
                            Marcar como inquilino
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                            Marcado aparece para seleção em contratos. Desmarcado continua disponível para contas a receber, contas a pagar e exclusão quando não houver movimentações.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {editActiveTab === "contato" && (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                    <FormField label="Telefone">
                      <input
                        value={formData.phone}
                        onChange={(event) => updateFormData("phone", formatPhone(event.target.value))}
                        placeholder="(00) 00000-0000"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="E-mail">
                      <input
                        value={formData.email}
                        onChange={(event) => updateFormData("email", event.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>
                  </div>
                )}

                {editActiveTab === "endereco" && (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                    <FormField label="CEP">
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
                    </FormField>

                    <FormField label="Cidade">
                      <input
                        value={formData.city}
                        onChange={(event) => updateFormData("city", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="UF">
                      <input
                        value={formData.state}
                        onChange={(event) => updateFormData("state", event.target.value)}
                        maxLength={2}
                        placeholder="RO"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Endereço">
                      <input
                        value={formData.address}
                        onChange={(event) => updateFormData("address", event.target.value)}
                        placeholder="Rua, avenida, travessa..."
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Número">
                      <input
                        value={formData.addressNumber}
                        onChange={(event) => updateFormData("addressNumber", event.target.value)}
                        placeholder="Nº"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Bairro">
                      <input
                        value={formData.district}
                        onChange={(event) => updateFormData("district", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </FormField>

                    <div className="md:col-span-2">
                      <FormField label="Referência">
                        <input
                          value={formData.reference}
                          onChange={(event) => updateFormData("reference", event.target.value)}
                          placeholder="Ponto de referência"
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                      </FormField>
                    </div>
                  </div>
                )}

                {editActiveTab === "foto" && (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 mb-4 text-2xl">
                      🔒
                    </div>
                    <h4 className="text-base font-black text-slate-800">
                      Funcionalidade Em Breve
                    </h4>
                    <p className="mt-2 max-w-sm text-sm font-semibold text-slate-500 leading-relaxed">
                      A possibilidade de incluir foto de perfil no cadastro de pessoas está sendo preparada e estará disponível em breve.
                    </p>
                  </div>
                )}

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

              <div className="flex flex-col gap-3 border-t border-slate-100 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {editingPersonId && (
                    <button
                      type="button"
                      onClick={openDeleteModal}
                      disabled={isSaving}
                      className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Excluir cadastro
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {personToInactivate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl font-black text-red-600">
              !
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-xl font-black text-slate-950">
                Inativar pessoa?
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Essa ação mantém o histórico e impede o uso da pessoa em novos lançamentos operacionais.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-black uppercase text-slate-900">
                {personToInactivate.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {personToInactivate.document}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeInactivateModal}
                disabled={isInactivating}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleInactivateConfirmed}
                disabled={isInactivating}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isInactivating ? "Inativando..." : "Inativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {personToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl font-black text-red-600">
              !
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-xl font-black text-slate-950">
                Excluir cadastro?
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                A exclusão só será permitida se esta pessoa não tiver nenhuma movimentação no sistema.
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
    </>
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

function PeopleStatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p>
        <p className="mt-1 truncate text-xs font-bold text-orange-600">{detail}</p>
      </div>
    </div>
  );
}

function HistoryInfo({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 ${wide ? "md:col-span-2 xl:col-span-4" : ""}`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function HistorySection({
  title,
  emptyMessage,
  children,
}: {
  title: string;
  emptyMessage: string;
  children: ReactNode;
}) {
  const hasChildren = Children.count(children) > 0;

  return (
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {hasChildren ? (
          children
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryRow({
  title,
  detail,
  meta,
}: {
  title: string;
  detail: string;
  meta: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
      </div>
      <span className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
        {meta}
      </span>
    </div>
  );
}

function getPersonTypeLabel(type: PersonType) {
  return type === "company" ? "Pessoa jurídica" : "Pessoa física";
}

function getContractStatusLabel(status: ApiContract["status"]) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    CANCELED: "Cancelado",
    FINISHED: "Finalizado",
    DELETED: "Excluído",
  };

  return labels[status] || String(status || "Não informado");
}

function getFinancialStatusLabel(status: ReceivableAccount["status"] | PayableAccount["status"]) {
  return status === "PAID" ? "Pago" : "Pendente";
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "Data não informada";

  const [datePart] = String(value).split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) return "Data não informada";

  return `${day}/${month}/${year}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calculateDigit = (base: string, factor: number) => {
    const total = base
      .split("")
      .reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const rest = (total * 10) % 11;

    return rest === 10 ? 0 : rest;
  };

  return (
    calculateDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calculateDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calculateDigit = (base: string, weights: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
    const rest = total % 11;

    return rest < 2 ? 0 : 11 - rest;
  };

  return (
    calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(cnpj[12]) &&
    calculateDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(cnpj[13])
  );
}

function isValidDocument(value: string, type: PersonType) {
  return type === "company" ? isValidCnpj(value) : isValidCpf(value);
}
