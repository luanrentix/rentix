import type { Person as ApiPerson } from "@/services/people.service";
import type { Property as ApiProperty } from "@/services/properties.service";
import type { Contract as ApiContract } from "@/services/contracts.service";
import type { ReceivableAccount, PayableAccount } from "@/services/financial.service";

export type ApiPersonType = "INDIVIDUAL" | "COMPANY";
export type ApiPersonStatus = "ACTIVE" | "INACTIVE";

export type PersonType = "individual" | "company";
export type PersonStatus = "active" | "inactive";

export type PersonTypeFilter = "all" | PersonType;
export type PersonStatusFilter = "all" | PersonStatus;
export type PersonTenantFilter = "all" | "tenant" | "non_tenant";

export type Person = {
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
  photo: string | null;
};

export type PersonModalDraft = PersonFormData & {
  editingPersonId: string | null;
};

export type PersonHistoryData = {
  ownedProperties: ApiProperty[];
  tenantContracts: ApiContract[];
  receivables: ReceivableAccount[];
  payables: PayableAccount[];
};

export const emptyFormData: PersonFormData = {
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

export function onlyDigits(value: string = ""): string {
  return value.replace(/\D/g, "");
}

export function toUpperText(value: string = ""): string {
  return value.toUpperCase();
}

export function normalizeSearchText(value: string = ""): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function convertApiTypeToPersonType(type: ApiPersonType): PersonType {
  return type === "COMPANY" ? "company" : "individual";
}

export function convertPersonTypeToApiType(type: PersonType): ApiPersonType {
  return type === "company" ? "COMPANY" : "INDIVIDUAL";
}

export function convertApiStatusToPersonStatus(status: ApiPersonStatus): PersonStatus {
  return status === "INACTIVE" ? "inactive" : "active";
}

export function convertPersonStatusToApiStatus(status: PersonStatus): ApiPersonStatus {
  return status === "inactive" ? "INACTIVE" : "ACTIVE";
}

export function formatDocument(value: string = "", type: PersonType = "individual"): string {
  const digits = onlyDigits(value);

  if (type === "company") {
    const limited = digits.slice(0, 14);
    if (limited.length <= 2) return limited;
    if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
    if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
    if (limited.length <= 12) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
    }
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12, 14)}`;
  }

  const limited = digits.slice(0, 11);
  if (limited.length <= 3) return limited;
  if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
  if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
  return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9, 11)}`;
}

export function formatPhone(value: string = ""): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatZipCode(value: string = ""): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function buildPersonAddress(
  data: Pick<PersonFormData, "address" | "addressNumber" | "district" | "reference">
): string {
  const address = toUpperText(data.address).trim();
  const number = toUpperText(data.addressNumber).trim();
  const district = toUpperText(data.district).trim();
  const reference = toUpperText(data.reference).trim();

  const mainAddress = [address, number ? `Nº ${number}` : ""].filter(Boolean).join(", ");
  const details = [
    district ? `BAIRRO: ${district}` : "",
    reference ? `REFERÊNCIA: ${reference}` : "",
  ].filter(Boolean);

  return [mainAddress, ...details].filter(Boolean).join(" - ");
}

export function parsePersonAddress(rawAddress: string = ""): {
  address: string;
  addressNumber: string;
  district: string;
  reference: string;
} {
  const normalized = (rawAddress || "").trim();
  if (!normalized) {
    return { address: "", addressNumber: "", district: "", reference: "" };
  }

  const parts = normalized.split(/\s*-\s*/);
  const mainPart = parts[0] || "";
  let district = "";
  let reference = "";

  for (const part of parts.slice(1)) {
    const upperPart = part.toUpperCase();
    if (upperPart.startsWith("BAIRRO:")) {
      district = part.replace(/^BAIRRO:\s*/i, "").trim();
    } else if (upperPart.startsWith("REFERÊNCIA:") || upperPart.startsWith("REFERENCIA:")) {
      reference = part.replace(/^REFER[EÊ]NCIA:\s*/i, "").trim();
    } else if (!district) {
      district = part.trim();
    }
  }

  const numberMatch = mainPart.match(/,\s*Nº\s*([^,]+)$/i) || mainPart.match(/,\s*(\d+[^,]*)$/i);
  let address = mainPart;
  let addressNumber = "";

  if (numberMatch && numberMatch.index !== undefined) {
    address = mainPart.slice(0, numberMatch.index).trim();
    addressNumber = (numberMatch[1] || "").trim();
  }

  return { address, addressNumber, district, reference };
}

export function isValidCpf(value: string = ""): boolean {
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

export function isValidCnpj(value: string = ""): boolean {
  const cnpj = onlyDigits(value);
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

export function isValidDocument(value: string = "", type: PersonType): boolean {
  return type === "company" ? isValidCnpj(value) : isValidCpf(value);
}

export function getWhatsAppUrl(phone: string = "", customMessage?: string): string {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  const baseUrl = `https://wa.me/${fullNumber}`;
  if (customMessage) {
    return `${baseUrl}?text=${encodeURIComponent(customMessage)}`;
  }
  return baseUrl;
}

export function openWhatsAppMessage(phone: string = "", customMessage?: string): void {
  const url = getWhatsAppUrl(phone, customMessage);
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function mapApiPersonToPerson(apiPerson: ApiPerson): Person {
  const pType = convertApiTypeToPersonType(apiPerson.type);
  return {
    id: apiPerson.id,
    companyId: apiPerson.companyId,
    name: toUpperText(apiPerson.name),
    type: pType,
    document: formatDocument(apiPerson.document, pType),
    stateRegistration: toUpperText(apiPerson.stateRegistration ?? ""),
    identityNumber: toUpperText(apiPerson.identityNumber ?? ""),
    email: toUpperText(apiPerson.email ?? ""),
    phone: apiPerson.phone ? formatPhone(apiPerson.phone) : "",
    zipCode: apiPerson.zipCode ? formatZipCode(apiPerson.zipCode) : "",
    city: toUpperText(apiPerson.city ?? ""),
    state: toUpperText(apiPerson.state ?? ""),
    address: toUpperText(apiPerson.address ?? ""),
    isTenant: apiPerson.isTenant !== false,
    status: convertApiStatusToPersonStatus(apiPerson.status),
    createdAt: apiPerson.createdAt,
    photo: apiPerson.photo,
  };
}

export function getPersonTypeLabel(type: PersonType): string {
  return type === "company" ? "Pessoa jurídica" : "Pessoa física";
}

export function formatCurrency(value: number = 0): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
