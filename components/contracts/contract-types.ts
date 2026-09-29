import {
  type Contract as ApiContract,
  type ContractRenewalRecord as ApiContractRenewalRecord,
  type ContractStatus as ApiContractStatus,
  type ContractStatusReasonType as ApiContractStatusReasonType,
  type CreateContractDto,
  type UpdateContractDto,
} from "@/services/contracts.service";
import { type ReceivableAccount } from "@/services/financial.service";
import { type Property as ApiProperty } from "@/services/properties.service";
import { type Person as ApiPerson } from "@/services/people.service";

export type ThemeMode = "light" | "black" | "graphite";

export const EXPIRING_CONTRACT_DAYS_LIMIT = 30;
export const DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME = "14:00";
export const DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME = "12:00";
export const TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY = "contrx_temporary_rental_time_defaults";
export const RECEIVABLE_FROM_CONTRACT_STORAGE_KEY = "contrx_receivable_from_contract";
export const CONTRACT_SCHEDULE_DRAFT_KEY = "contrx_contract_schedule_draft";

export type ContractScheduleDraft = {
  contractId: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  isTemporaryRental?: boolean;
};

export type PropertyStatus = "Available" | "Rented";

export type Property = {
  id: string;
  name: string;
  assetCategory?: string | null;
  rentValue?: number;
  operationalStatus?: string | null;
  status: PropertyStatus;
  isActive?: boolean;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  pixKey?: string;
  contractCity?: string;
  contractDefaultNotes?: string;
};

export type ContrxTenant = {
  id: string;
  name: string;
  isTenant?: boolean;
  isActive?: boolean;
  personType?: "Individual" | "Company";
  cpf?: string;
  document?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  pixKey?: string;
  contractCity?: string;
  contractDefaultNotes?: string;
};

export type CompanySettings = {
  name?: string;
  legalName?: string;
  document?: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  pixKey?: string;
  contractCity?: string;
  contractDefaultNotes?: string;
};

export type ContractStatus =
  | "Active"
  | "Inactive"
  | "Canceled"
  | "Finished"
  | "Deleted";

export type ContractDisplayStatus = ContractStatus | "Expiring" | "Expired" | "Scheduled";

export type ContractFilterStatus = "All" | ContractStatus | "Expiring" | "Expired" | "Scheduled";

export type ContractTypeFilter = "All" | "STANDARD" | "TEMPORARY";

export type ContractDetailsTab = "Data" | "Financial" | "History" | "Prints" | "SignedPdf";

export type ContractRenewalRecord = {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  previousRentValue: number;
  newRentValue: number;
  notes?: string;
};

export type Contract = {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentValue: number;
  status?: ContractStatus;
  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: "Canceled" | "Deleted" | null;
  statusReasonAt?: string | null;
  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  renewedAt?: string | null;
  renewalHistory?: ContractRenewalRecord[];
  finishedAt?: string | null;
  finishReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ReceivableCharge = {
  id: string;
  contractId?: string | number | null;
  property?: string;
  tenant?: string;
  dueDate?: string;
  amount?: number;
  status?: "Pending" | "Paid";
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
};

export type PendingStatusChange = {
  contract: Contract;
  nextStatus: "Canceled" | "Deleted";
};

export type PropertyMovement = {
  id: string;
  propertyId: string;
  propertyName: string;
  type:
    | "ContractCreated"
    | "ContractUpdated"
    | "ContractCanceled"
    | "ContractDeleted"
    | "ContractRenewed"
    | "ContractFinished";
  description: string;
  createdAt: string;
};

export type ContractModalDraft = {
  editingContractId: string | null;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentValue: string;
  isTemporaryRental: boolean;
  checkInTime: string;
  checkOutTime: string;
};

export type TemplateData = {
  companyName: string;
  tradeName: string;
  landlordName: string;
  landlordDocument: string;
  landlordAddress: string;
  companyEmail: string;
  companyPhone: string;
  personName: string;
  tenantName: string;
  tenantDocument: string;
  tenantAddress: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyName: string;
  assetCategory: string;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  contractMonths: string;
  contractDays: string;
  amount: string;
  rentValue: string;
  monthlyAmount: string;
  penaltyAmount: string;
  dueDay: string;
  pixKey: string;
  contractCity: string;
  currentDate: string;
  contractDefaultNotes: string;
  entryTime?: string;
  exitTime?: string;
};

// ----------------- Utilitários e Funções Auxiliares -----------------

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function toUpperText(value: string) {
  return value.toLocaleUpperCase("pt-BR").trimStart();
}

export function formatCurrency(value?: number) {
  const safeValue = Number(value || 0);
  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseCurrencyInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return Number(digits || 0) / 100;
}

export function formatCurrencyInput(value: string | number) {
  if (typeof value === "number") {
    return formatCurrency(value);
  }
  return formatCurrency(parseCurrencyInput(value));
}

export function normalizeDateInputValue(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string) {
  const normalizedDate = normalizeDateInputValue(value);
  if (!normalizedDate) return "-";
  const [year, month, day] = normalizedDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatLongDateForPrint(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaysUntilDate(value: string) {
  if (!value) return -1;
  const today = new Date();
  const endDate = new Date(`${value}T00:00:00`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) {
    return -1;
  }
  return Math.round((endDate.getTime() - today.getTime()) / millisecondsPerDay);
}

export function isContractExpiring(endDate: string) {
  const daysUntilEndDate = getDaysUntilDate(endDate);
  return daysUntilEndDate >= 0 && daysUntilEndDate <= EXPIRING_CONTRACT_DAYS_LIMIT;
}

export function getAutomaticContractStatus(
  endDate: string,
  startDate?: string,
  isTemporaryRental?: boolean
): "Active" | "Inactive" | "Expired" | "Scheduled" {
  if (!endDate) return "Inactive";

  // 1. Contrato com início futuro -> Agendado
  if (startDate) {
    const daysUntilStart = getDaysUntilDate(startDate);
    if (daysUntilStart > 0) {
      return "Scheduled";
    }
  }

  // 2. Contrato com término decorrido -> Vencido
  const daysUntilEnd = getDaysUntilDate(endDate);
  if (daysUntilEnd < 0) {
    return "Expired";
  }

  return "Active";
}

export function getDisplayContractStatus(contract: Contract): ContractDisplayStatus {
  if (contract.status === "Deleted") return "Deleted";
  if (contract.status === "Canceled") return "Canceled";
  if (contract.status === "Finished") return "Finished";
  if (contract.status === "Inactive") return "Inactive";

  // 1. Se a data de início está no futuro, o contrato ainda não iniciou (Agendado)
  if (contract.startDate) {
    const daysUntilStart = getDaysUntilDate(contract.startDate);
    if (daysUntilStart > 0) {
      return "Scheduled";
    }
  }

  // 2. Se a data de término já passou
  const daysUntilEnd = getDaysUntilDate(contract.endDate);
  if (daysUntilEnd < 0) {
    return "Expired";
  }

  // 3. Se for contrato de Temporada: durante a estadia ele é Ativo/Em Andamento (nunca rotulado como A Vencer 30d)
  if (contract.isTemporaryRental) {
    return "Active";
  }

  // 4. Se for contrato padrão contínuo e faltar 30 dias ou menos para o término
  if (daysUntilEnd <= EXPIRING_CONTRACT_DAYS_LIMIT) {
    return "Expiring";
  }

  return "Active";
}

export function getContractStatusLabel(status: ContractDisplayStatus): string {
  const labels: Record<ContractDisplayStatus, string> = {
    Active: "Ativo",
    Scheduled: "Agendado",
    Expiring: "A Vencer",
    Expired: "Vencido",
    Finished: "Finalizado",
    Canceled: "Cancelado",
    Deleted: "Excluído",
    Inactive: "Inativo",
  };
  return labels[status] || status;
}

export function getAssetCategoryLabel(value?: string | null) {
  const labels: Record<string, string> = {
    PROPERTY: "Imóvel",
    EQUIPMENT: "Equipamento",
    MACHINE: "Máquina",
    VEHICLE: "Veículo",
    TOOL: "Ferramenta",
    OTHER: "Outro bem",
  };
  return labels[value || ""] || "Imóvel";
}

export function getContractDurationInDays(startDateValue: string, endDateValue: string) {
  const startDate = normalizeDateInputValue(startDateValue);
  const endDate = normalizeDateInputValue(endDateValue);
  if (!startDate || !endDate) return 1;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 1);
}

export function getContractDurationInMonths(startDateValue: string, endDateValue: string) {
  const startDate = normalizeDateInputValue(startDateValue);
  const endDate = normalizeDateInputValue(endDateValue);
  if (!startDate || !endDate) return 1;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 1;
  }
  const monthDifference =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return Math.max(monthDifference, 1);
}

export function getContractRentDueDay(startDateValue: string) {
  const startDate = normalizeDateInputValue(startDateValue);
  if (!startDate) return "____";
  const [, , day] = startDate.split("-");
  return day || "____";
}

export function formatDocumentForPrint(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 11) {
    return digits
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
  }
  return digits
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatFullAddressForPrint(address: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
}) {
  const parts = [
    address.street,
    address.number ? `nº ${address.number}` : "",
    address.complement,
    address.neighborhood ? `Bairro: ${address.neighborhood}` : "",
    address.city && address.state ? `${address.city}/${address.state}` : address.city || address.state,
    address.zipCode ? `CEP ${address.zipCode}` : "",
  ];
  return parts.filter(Boolean).join(", ");
}

export function doDateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && endA >= startB;
}

export function getContractSortTime(contract: Contract) {
  const dateCandidates = [
    contract.createdAt,
    contract.updatedAt,
    contract.startDate,
    contract.endDate,
  ];

  for (const dateCandidate of dateCandidates) {
    if (!dateCandidate) continue;
    const timestamp = new Date(dateCandidate).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

// ----------------- Mapeamentos de API -----------------

export function formatApiDateForInput(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mapApiContractStatus(status: ApiContractStatus): ContractStatus {
  const statusMap: Record<ApiContractStatus, ContractStatus> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    CANCELED: "Canceled",
    FINISHED: "Finished",
    DELETED: "Deleted",
  };
  return statusMap[status] || "Inactive";
}

export function mapContractStatusToApi(status: ContractStatus): ApiContractStatus {
  const statusMap: Record<ContractStatus, ApiContractStatus> = {
    Active: "ACTIVE",
    Inactive: "INACTIVE",
    Canceled: "CANCELED",
    Finished: "FINISHED",
    Deleted: "DELETED",
  };
  return statusMap[status] || "INACTIVE";
}

export function mapApiContractStatusReasonType(
  value?: ApiContractStatusReasonType | null,
): Contract["statusReasonType"] {
  if (value === "CANCELED") return "Canceled";
  if (value === "DELETED") return "Deleted";
  return null;
}

export function mapContractStatusReasonTypeToApi(
  value?: Contract["statusReasonType"],
): ApiContractStatusReasonType | null {
  if (value === "Canceled") return "CANCELED";
  if (value === "Deleted") return "DELETED";
  return null;
}

export function mapApiRenewalRecord(record: ApiContractRenewalRecord): ContractRenewalRecord {
  return {
    renewedAt: record.renewedAt,
    previousEndDate: formatApiDateForInput(record.previousEndDate),
    newEndDate: formatApiDateForInput(record.newEndDate),
    previousRentValue: Number(record.previousRentValue || 0),
    newRentValue: Number(record.newRentValue || 0),
    notes: record.notes,
  };
}

export function mapApiContractToContract(apiContract: ApiContract): Contract {
  const propertyName =
    apiContract.propertyName ||
    apiContract.property?.title ||
    "BEM/ATIVO NÃO INFORMADO";
  const tenantName =
    apiContract.tenantName ||
    apiContract.tenant?.name ||
    "LOCATÁRIO NÃO INFORMADO";

  return {
    id: apiContract.id,
    propertyId: apiContract.propertyId,
    propertyName: toUpperText(propertyName),
    tenantId: apiContract.tenantId,
    tenantName,
    startDate: formatApiDateForInput(apiContract.startDate),
    endDate: formatApiDateForInput(apiContract.endDate),
    rentValue: Number(apiContract.rentValue || 0),
    status: mapApiContractStatus(apiContract.status),
    deletedAt: apiContract.deletedAt || null,
    statusReason: apiContract.statusReason || null,
    statusReasonType: mapApiContractStatusReasonType(apiContract.statusReasonType),
    statusReasonAt: apiContract.statusReasonAt || null,
    isTemporaryRental: apiContract.isTemporaryRental ?? false,
    checkInTime: apiContract.checkInTime || "",
    checkOutTime: apiContract.checkOutTime || "",
    renewedAt: apiContract.renewedAt || null,
    renewalHistory: Array.isArray(apiContract.renewalHistory)
      ? apiContract.renewalHistory.map(mapApiRenewalRecord)
      : [],
    finishedAt: apiContract.finishedAt || null,
    finishReason: apiContract.finishReason || null,
    createdAt: apiContract.createdAt,
    updatedAt: apiContract.updatedAt,
  };
}

export function normalizeApiAmount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
  return 0;
}

export function mapReceivableAccountToCharge(account: ReceivableAccount): ReceivableCharge {
  return {
    id: account.id,
    contractId: account.contractId || null,
    property: account.propertyName,
    tenant: account.tenantName,
    dueDate: account.dueDate,
    amount: normalizeApiAmount(account.amount),
    status: account.status === "PAID" ? "Paid" : "Pending",
    manual: account.manual,
    issueDate: account.issueDate || undefined,
    installmentNumber: account.installmentNumber || undefined,
    installmentTotal: account.installmentTotal || undefined,
    installmentGroupId: account.installmentGroupId || undefined,
  };
}

export function mapApiPropertyToProperty(
  apiProperty: ApiProperty,
  contracts: Contract[],
): Property {
  const hasActiveContract = contracts.some(
    (contract) =>
      String(contract.propertyId) === String(apiProperty.id) &&
      ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(contract)) &&
      contract.status !== "Deleted" &&
      !contract.isTemporaryRental,
  );

  return {
    id: apiProperty.id,
    name: toUpperText(apiProperty.title || ""),
    assetCategory: apiProperty.assetCategory || "PROPERTY",
    rentValue: Number(apiProperty.rentalValue || 0),
    operationalStatus: (apiProperty as any).operationalStatus || null,
    status: hasActiveContract ? "Rented" : "Available",
    isActive: apiProperty.isActive ?? true,
    zipCode: apiProperty.zipCode || "",
    state: toUpperText(apiProperty.state || ""),
    city: toUpperText(apiProperty.city || ""),
    street: toUpperText(apiProperty.address || ""),
    number: toUpperText(apiProperty.number || ""),
    neighborhood: toUpperText(apiProperty.district || ""),
    complement: toUpperText(apiProperty.complement || ""),
  };
}

export function mapApiPersonToTenant(apiPerson: ApiPerson): ContrxTenant {
  return {
    id: apiPerson.id,
    name: apiPerson.name,
    isTenant: apiPerson.isTenant !== false,
    isActive: apiPerson.status === "ACTIVE",
    personType: apiPerson.type === "COMPANY" ? "Company" : "Individual",
    cpf: apiPerson.document,
    document: apiPerson.document,
    email: apiPerson.email || "",
    phone: apiPerson.phone || "",
    zipCode: apiPerson.zipCode || "",
    state: apiPerson.state || "",
    city: apiPerson.city || "",
    street: apiPerson.address || "",
  };
}

export function buildContractPayload(contract: Contract): CreateContractDto | UpdateContractDto {
  return {
    propertyId: contract.propertyId,
    tenantId: contract.tenantId,
    propertyName: contract.propertyName,
    tenantName: contract.tenantName,
    startDate: contract.startDate,
    endDate: contract.endDate,
    rentValue: Number(contract.rentValue || 0),
    status: mapContractStatusToApi(contract.status || "Active"),
    deletedAt: contract.deletedAt || null,
    statusReason: contract.statusReason || null,
    statusReasonType: mapContractStatusReasonTypeToApi(contract.statusReasonType),
    statusReasonAt: contract.statusReasonAt || null,
    isTemporaryRental: contract.isTemporaryRental ?? false,
    checkInTime: contract.checkInTime || "",
    checkOutTime: contract.checkOutTime || "",
    renewedAt: contract.renewedAt || null,
    renewalHistory: contract.renewalHistory || [],
    finishedAt: contract.finishedAt || null,
    finishReason: contract.finishReason || null,
  };
}

export function syncPropertiesWithContracts(contracts: Contract[], properties: Property[]): Property[] {
  return properties.map((property) => {
    const hasActiveContract = contracts.some(
      (contract) =>
        String(contract.propertyId) === String(property.id) &&
        ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(contract)) &&
        contract.status !== "Deleted" &&
        !contract.isTemporaryRental
    );

    return {
      ...property,
      name: toUpperText(property.name || ""),
      status: hasActiveContract ? "Rented" : "Available",
      isActive: property.isActive ?? true,
    };
  });
}

export type ReceivableFromContractPayload = {
  contractId: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  amount: number;
  monthlyAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  endDate: string;
  installmentQuantity: number;
};

export function getFirstDueDateFromStartDate(dateValue: string) {
  if (!dateValue) return "";
  const dueDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return "";
  dueDate.setMonth(dueDate.getMonth() + 1);

  const year = dueDate.getFullYear();
  const month = String(dueDate.getMonth() + 1).padStart(2, "0");
  const day = String(dueDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonthsToDate(dateValue: string, monthsToAdd: number) {
  if (!dateValue) return "";
  const nextDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return "";
  nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getContractInstallmentQuantity(startDateValue: string, endDateValue: string) {
  if (!startDateValue || !endDateValue) return 1;
  const start = new Date(`${startDateValue}T00:00:00`);
  const end = new Date(`${endDateValue}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 1;
  }

  const monthDifference =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  return Math.max(monthDifference, 1);
}

export function getContractReceivableSchedule(contract: Contract) {
  if (contract.isTemporaryRental) {
    return [
      {
        dueDate: contract.startDate,
        amount: Number(contract.rentValue || 0),
        installmentNumber: 1,
        installmentTotal: 1,
      },
    ];
  }

  const installmentQuantity = getContractInstallmentQuantity(contract.startDate, contract.endDate);
  const firstDueDate = getFirstDueDateFromStartDate(contract.startDate);

  if (!firstDueDate) return [];

  return Array.from({ length: installmentQuantity }, (_, index) => ({
    dueDate: addMonthsToDate(firstDueDate, index),
    amount: Number(contract.rentValue || 0),
    installmentNumber: index + 1,
    installmentTotal: installmentQuantity,
  }));
}
