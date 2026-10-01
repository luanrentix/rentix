export type ChargeStatus = "Pending" | "Paid" | "Overdue";
export type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";
export type PeriodShortcut =
  | "CurrentMonth"
  | "CurrentQuarter"
  | "CurrentYear"
  | "All"
  | "Custom";

export type PaymentMethod =
  | "Cash"
  | "Pix"
  | "CreditCard"
  | "DebitCard"
  | "BankSlip"
  | "BankTransfer"
  | "Other";

export type ChargeLaunchType = "single" | "installments" | "downPaymentPlusInstallments";

export type PaymentEntry = {
  id: string;
  amount: string;
  method: PaymentMethod;
};

export type ChargePayment = {
  id: string;
  chargeId?: string;
  paidAt: string;
  method: PaymentMethod;
  interest: number;
  discount: number;
  amountPaid: number;
  note?: string | null;
  paymentItems?: Array<{
    method: PaymentMethod;
    amount: number;
  }> | null;
};

export type Charge = {
  id: string;
  companyId?: string;
  contractId?: string | null;
  tenantId?: string | null;
  propertyName: string;
  tenantName: string;
  issueDate?: string | null;
  dueDate: string;
  amount: number;
  status: ChargeStatus;
  manual?: boolean;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  isDownPayment?: boolean;
  payments?: ChargePayment[];
  tenant?: {
    id: string;
    name: string;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  contract?: {
    id: string;
    propertyId?: string;
    propertyName?: string;
  } | null;
};

export type Tenant = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type Property = {
  id: string;
  title: string;
  code?: string | null;
};

export type Contract = {
  id: string;
  propertyId: string;
  propertyName?: string | null;
  tenantId: string;
  tenantName?: string | null;
  startDate: string;
  endDate: string;
  rentValue: number;
  status?: string;
};

export type InstallmentPreview = {
  installmentNumber: number;
  installmentTotal: number;
  amount: number;
  dueDate: string;
  isDownPayment?: boolean;
};

export type EditableInstallment = {
  id: string;
  installmentNumber: number;
  installmentTotal: number;
  amount: number;
  amountStr: string;
  dueDate: string;
  isDownPayment?: boolean;
};

export type PaymentSplitItem = {
  id: string;
  method: PaymentMethod;
  amount: number;
  amountStr: string;
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Pix", label: "Pix" },
  { value: "Cash", label: "Dinheiro em espécie" },
  { value: "BankTransfer", label: "Transferência bancária" },
  { value: "BankSlip", label: "Boleto bancário" },
  { value: "CreditCard", label: "Cartão de crédito" },
  { value: "DebitCard", label: "Cartão de débito" },
  { value: "Other", label: "Outro" },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const raw = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = raw.split("-");
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function normalizeSearchText(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function toUpperText(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\D/g, "");
  return Number(cleaned) / 100;
}

export function formatCurrencyInput(centsValue: string | number): string {
  const numeric = typeof centsValue === "number" ? centsValue : Number(centsValue || 0);
  return (numeric / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getStartOfCurrentMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function getEndOfCurrentMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function isDateInsideRange(dateStr: string, start?: string, end?: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export type ApiPaymentMethod =
  | "CASH"
  | "PIX"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_SLIP"
  | "BANK_TRANSFER"
  | "OTHER";

export function mapUiPaymentMethodToApi(method: PaymentMethod): ApiPaymentMethod {
  const methodMap: Record<PaymentMethod, ApiPaymentMethod> = {
    Cash: "CASH",
    Pix: "PIX",
    CreditCard: "CREDIT_CARD",
    DebitCard: "DEBIT_CARD",
    BankSlip: "BANK_SLIP",
    BankTransfer: "BANK_TRANSFER",
    Other: "OTHER",
  };
  return methodMap[method] || "OTHER";
}

export function mapApiPaymentMethodToUi(method?: string | null): PaymentMethod {
  const methodMap: Record<string, PaymentMethod> = {
    CASH: "Cash",
    PIX: "Pix",
    CREDIT_CARD: "CreditCard",
    DEBIT_CARD: "DebitCard",
    BANK_SLIP: "BankSlip",
    BANK_TRANSFER: "BankTransfer",
    OTHER: "Other",
  };
  return (method && methodMap[method]) || "Pix";
}
