"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AppShell from "@/components/layout/app-shell";

const RECEIVABLE_FROM_CONTRACT_STORAGE_KEY = "rentix_new_charge_from_contract";

type Contract = {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  value?: number | string;
  amount?: number | string;
  rentValue?: number | string;
  monthlyValue?: number | string;
  status: "Active" | "Finished";
};

type Property = {
  id: string;
  name: string;
};

type PersonType = "Individual" | "Company";

type Tenant = {
  id: string;
  name: string;
  personType?: PersonType;
  cpf?: string;
  phone?: string;
  isTenant?: boolean;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  district?: string;
  complement?: string;
};

type Charge = {
  id: string;
  property: string;
  tenant: string;
  dueDate: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
};

type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";
type ReportDueFilter = "All" | "Overdue" | "DueToday" | "Upcoming" | "DateRange";
type ChargeLaunchType = "single" | "installment";

type InstallmentPreview = {
  id: string;
  installmentNumber: number;
  amount: string;
  dueDate: string;
};

type ReceivableFromContractPayload = {
  contractId?: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  monthlyAmount?: number;
  totalAmount?: number;
  issueDate: string;
  dueDate: string;
  endDate?: string;
  installmentQuantity?: number;
};

type PaymentMethod =
  | "Cash"
  | "Pix"
  | "CreditCard"
  | "DebitCard"
  | "BankSlip"
  | "BankTransfer"
  | "Other";

type PaymentAllocation = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

type PaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: string;
};

type ChargePayment = {
  chargeId: string;
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: PaymentAllocation[];
  interest: number;
  discount: number;
  amountPaid: number;
  note?: string;
};

type PaymentMethodOption = {
  value: PaymentMethod;
  label: string;
};

const paymentMethodOptions: PaymentMethodOption[] = [
  { value: "Cash", label: "Dinheiro" },
  { value: "Pix", label: "Pix" },
  { value: "CreditCard", label: "Cartão de crédito" },
  { value: "DebitCard", label: "Cartão de débito" },
  { value: "BankSlip", label: "Boleto bancário" },
  { value: "BankTransfer", label: "Transferência bancária" },
  { value: "Other", label: "Outros" },
];

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

type TenantFormData = {
  personType: PersonType;
  name: string;
  cpf: string;
  phone: string;
  isTenant: boolean;
  zipCode: string;
  state: string;
  city: string;
  street: string;
  number: string;
  district: string;
  complement: string;
};

const initialTenantFormData: TenantFormData = {
  personType: "Individual",
  name: "",
  cpf: "",
  phone: "",
  isTenant: true,
  zipCode: "",
  state: "",
  city: "",
  street: "",
  number: "",
  district: "",
  complement: "",
};

export default function AccountsReceivablePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paid, setPaid] = useState<string[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<ChargePayment[]>([]);
  const [manualCharges, setManualCharges] = useState<Charge[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [autoOpenSearch, setAutoOpenSearch] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTenantCreateOpen, setIsTenantCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const [formTenant, setFormTenant] = useState("");
  const [formProperty, setFormProperty] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formIssueDate, setFormIssueDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaymentDate, setFormPaymentDate] = useState("");
  const [formLaunchType, setFormLaunchType] =
    useState<ChargeLaunchType>("single");
  const [formInstallmentQuantity, setFormInstallmentQuantity] = useState("2");
  const [installmentPreview, setInstallmentPreview] = useState<
    InstallmentPreview[]
  >([]);

  const [tenantFormData, setTenantFormData] = useState<TenantFormData>(
    initialTenantFormData,
  );
  const [isZipCodeLoading, setIsZipCodeLoading] = useState(false);
  const [zipCodeError, setZipCodeError] = useState("");
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [cnpjSearchError, setCnpjSearchError] = useState("");
  const [chargeFormError, setChargeFormError] = useState("");
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [chargePendingDeletion, setChargePendingDeletion] =
    useState<Charge | null>(null);
  const [chargePendingPaymentReversal, setChargePendingPaymentReversal] =
    useState<Charge | null>(null);
  const [chargePendingPaymentReceipt, setChargePendingPaymentReceipt] =
    useState<Charge | null>(null);
  const [isPaymentConfirmationOpen, setIsPaymentConfirmationOpen] =
    useState(false);
  const [paymentInterest, setPaymentInterest] = useState("");
  const [paymentDiscount, setPaymentDiscount] = useState("");
  const [paymentFinalAmount, setPaymentFinalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentFormError, setPaymentFormError] = useState("");

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTenantId, setReportTenantId] = useState("");
  const [reportStatusFilter, setReportStatusFilter] =
    useState<StatusFilter>("All");
  const [reportDueFilter, setReportDueFilter] =
    useState<ReportDueFilter>("All");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportFormError, setReportFormError] = useState("");

  function openChargeFromContractPayload(payload: ReceivableFromContractPayload) {
    const normalizedInstallmentQuantity = Math.max(
      Number(payload.installmentQuantity || 1),
      1,
    );
    const monthlyAmount = normalizeAmount(payload.monthlyAmount ?? payload.amount);
    const totalAmount = normalizeAmount(
      payload.totalAmount ?? monthlyAmount * normalizedInstallmentQuantity,
    );
    const receivableAmount =
      normalizedInstallmentQuantity > 1 ? totalAmount : monthlyAmount;

    setFormTenant(String(payload.tenantId || ""));
    setFormProperty(String(payload.propertyId || ""));
    setFormAmount(formatAmountInput(receivableAmount));
    setFormIssueDate(payload.issueDate || getLocalDateValue(new Date()));
    setFormDueDate(payload.dueDate || getLocalDateValue(new Date()));
    setFormPaymentDate("");
    setFormLaunchType(normalizedInstallmentQuantity > 1 ? "installment" : "single");
    setFormInstallmentQuantity(String(Math.max(normalizedInstallmentQuantity, 2)));
    setEditingChargeId(null);
    setChargeFormError("");
    setInstallmentPreview([]);
    setIsTenantCreateOpen(false);
    setSelectedTenant(null);
    setSearch("");
    setIsSearchOpen(false);
    setIsCreateOpen(true);
  }

  useEffect(() => {
    const c = localStorage.getItem("rentix_contracts");
    const p = localStorage.getItem("rentix_properties");
    const t = localStorage.getItem("rentix_tenants");
    const paidData = localStorage.getItem("rentix_paid_charges");
    const manualData = localStorage.getItem("rentix_manual_charges");
    const paymentData = localStorage.getItem("rentix_charge_payments");
    const savedStatusFilter = localStorage.getItem(
      "rentix_receivable_status_filter",
    );
    const savedAutoOpenSearch = localStorage.getItem(
      "rentix_auto_open_search",
    );

    if (c) setContracts(JSON.parse(c));
    if (p) setProperties(JSON.parse(p));
    if (t) setTenants(JSON.parse(t));
    if (paidData) setPaid(JSON.parse(paidData));
    if (manualData) setManualCharges(JSON.parse(manualData));
    if (paymentData) setPaymentRecords(JSON.parse(paymentData));

    if (
      savedStatusFilter === "All" ||
      savedStatusFilter === "Pending" ||
      savedStatusFilter === "Paid" ||
      savedStatusFilter === "Overdue"
    ) {
      setStatusFilter(savedStatusFilter);
    }

    if (savedAutoOpenSearch !== null) {
      const parsedAutoOpenSearch = JSON.parse(savedAutoOpenSearch) as boolean;

      setAutoOpenSearch(parsedAutoOpenSearch);
      setIsSearchOpen(parsedAutoOpenSearch);
    } else {
      setAutoOpenSearch(true);
      setIsSearchOpen(true);
    }

    const contractChargeData = localStorage.getItem(
      RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
    );

    if (contractChargeData) {
      try {
        const parsedContractChargeData = JSON.parse(
          contractChargeData,
        ) as ReceivableFromContractPayload;

        openChargeFromContractPayload(parsedContractChargeData);
        localStorage.removeItem(RECEIVABLE_FROM_CONTRACT_STORAGE_KEY);
      } catch {
        localStorage.removeItem(RECEIVABLE_FROM_CONTRACT_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rentix_receivable_status_filter", statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (formLaunchType !== "installment") {
      setInstallmentPreview([]);
      return;
    }

    generateInstallmentPreview();
  }, [formLaunchType, formAmount, formDueDate, formInstallmentQuantity]);

  function onlyNumbers(value: string) {
    return value.replace(/\D/g, "");
  }

  function formatCpf(value: string) {
    return onlyNumbers(value)
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatCnpj(value: string) {
    return onlyNumbers(value)
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
      .replace(
        /^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/,
        "$1.$2.$3/$4-$5",
      );
  }

  function formatDocument(value: string, personType: PersonType) {
    if (personType === "Company") return formatCnpj(value);

    return formatCpf(value);
  }

  function formatPhone(value: string) {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function formatZipCode(value: string) {
    return onlyNumbers(value)
      .slice(0, 8)
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  async function verifyZipCode() {
    const zipCode = onlyNumbers(tenantFormData.zipCode);

    if (zipCode.length === 0) {
      setZipCodeError("");
      return;
    }

    if (zipCode.length !== 8) {
      setZipCodeError("CEP inválido. Digite 8 números.");
      return;
    }

    try {
      setIsZipCodeLoading(true);
      setZipCodeError("");

      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const data = await response.json();

      if (data.erro) {
        setZipCodeError("CEP não encontrado.");
        return;
      }

      setTenantFormData((currentData) => ({
        ...currentData,
        zipCode: formatZipCode(zipCode),
        state: data.uf || currentData.state,
        city: data.localidade || currentData.city,
        street: data.logradouro || currentData.street,
        district: data.bairro || currentData.district,
        complement: currentData.complement,
      }));
    } catch {
      setZipCodeError("Não foi possível consultar o CEP agora.");
    } finally {
      setIsZipCodeLoading(false);
    }
  }

  function normalizeAmount(value: unknown) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const normalizedValue = value
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();

      const parsedValue = Number(normalizedValue);

      return Number.isFinite(parsedValue) ? parsedValue : 0;
    }

    return 0;
  }

  function getContractAmount(contract: Contract) {
    return normalizeAmount(
      contract.value ??
        contract.amount ??
        contract.rentValue ??
        contract.monthlyValue ??
        0,
    );
  }

  const automaticCharges = useMemo<Charge[]>(() => {
    const today = new Date();

    return contracts
      .filter((contract) => contract.status === "Active")
      .map((contract) => {
        const property = properties.find(
          (item) => item.id === contract.propertyId,
        );

        const tenant = tenants.find((item) => item.id === contract.tenantId);

        const dueDate = new Date();
        dueDate.setDate(new Date(contract.startDate).getDate());

        const id = `${contract.id}-${dueDate.toISOString()}`;
        const isPaid = paid.includes(id);

        let status: Charge["status"] = "Pending";

        if (isPaid) {
          status = "Paid";
        } else if (dueDate < today) {
          status = "Overdue";
        }

        return {
          id,
          property: property?.name || "Imóvel",
          tenant: tenant?.name || "Inquilino",
          dueDate: dueDate.toISOString(),
          amount: getContractAmount(contract),
          status,
        };
      });
  }, [contracts, properties, tenants, paid]);

  const manualChargesWithStatus = useMemo<Charge[]>(() => {
    const today = new Date();

    return manualCharges.map((charge) => {
      let status: Charge["status"] = "Pending";

      if (paid.includes(charge.id)) {
        status = "Paid";
      } else if (new Date(charge.dueDate) < today) {
        status = "Overdue";
      }

      return {
        ...charge,
        status,
      };
    });
  }, [manualCharges, paid]);

  const charges = useMemo<Charge[]>(() => {
    const manualChargeIds = new Set(
      manualChargesWithStatus.map((charge) => String(charge.id)),
    );

    const automaticChargesWithoutManualAdjustments = automaticCharges.filter(
      (charge) => !manualChargeIds.has(String(charge.id)),
    );

    return [
      ...automaticChargesWithoutManualAdjustments,
      ...manualChargesWithStatus,
    ];
  }, [automaticCharges, manualChargesWithStatus]);

  const filteredCharges = useMemo(() => {
    let result = charges;

    if (selectedTenant) {
      result = result.filter(
        (charge) =>
          charge.tenant.toLowerCase() === selectedTenant.name.toLowerCase(),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((charge) => charge.status === statusFilter);
    }

    return result;
  }, [charges, selectedTenant, statusFilter]);

  const totalReceivable = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status !== "Paid")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const totalPaid = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
  }, [filteredCharges, paymentRecords]);

  const totalOverdue = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tenants, search]);

  const isEditingPaidCharge = editingChargeId
    ? paid.includes(editingChargeId)
    : false;

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(value) ? value : 0);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR");
  }

  function getStatusLabel(status: Charge["status"]) {
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Pendente";
  }

  function getStatusClassName(status: Charge["status"]) {
    if (status === "Paid") {
      return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-900/60";
    }

    if (status === "Overdue") {
      return "bg-red-50 dark:bg-red-950/30 text-red-700 ring-1 ring-red-200";
    }

    return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 ring-1 ring-amber-200";
  }

  function getStatusFilterLabel(status: StatusFilter) {
    if (status === "Pending") return "Pendente";
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Todos";
  }

  function getReportDueFilterLabel(filter: ReportDueFilter) {
    if (filter === "Overdue") return "Vencidas";
    if (filter === "DueToday") return "Vencendo hoje";
    if (filter === "Upcoming") return "A vencer";
    if (filter === "DateRange") return "Por período";

    return "Todos os vencimentos";
  }

  function getLocalDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addDaysToDate(dateValue: string, days: number) {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);

    return getLocalDateValue(date);
  }

  function formatAmountInput(value: number) {
    return value.toFixed(2).replace(".", ",");
  }

  function getPaymentMethodLabel(method: PaymentMethod) {
    return (
      paymentMethodOptions.find((option) => option.value === method)?.label ||
      "Outros"
    );
  }

  function calculatePaymentAmount(
    charge: Charge,
    interest: number,
    discount: number,
  ) {
    return Math.max(charge.amount + interest - discount, 0);
  }

  function updatePaymentFinalAmountFromAdjustments(
    charge: Charge,
    interestValue: string,
    discountValue: string,
  ) {
    const interest = normalizeAmount(interestValue);
    const discount = normalizeAmount(discountValue);
    const finalAmount = calculatePaymentAmount(charge, interest, discount);

    const formattedFinalAmount = formatAmountInput(finalAmount);

    setPaymentFinalAmount(formattedFinalAmount);
    updatePaymentEntriesFromFinalAmount(formattedFinalAmount);
  }

  function updatePaymentAdjustmentsFromFinalAmount(
    charge: Charge,
    finalAmountValue: string,
  ) {
    const finalAmount = normalizeAmount(finalAmountValue);
    const difference = finalAmount - charge.amount;

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      setPaymentInterest("");
      setPaymentDiscount("");
      return;
    }

    if (difference > 0) {
      setPaymentInterest(formatAmountInput(difference));
      setPaymentDiscount("");
      return;
    }

    if (difference < 0) {
      setPaymentInterest("");
      setPaymentDiscount(formatAmountInput(Math.abs(difference)));
      return;
    }

    setPaymentInterest("");
    setPaymentDiscount("");
  }

  function updatePaymentEntriesFromFinalAmount(finalAmount: string) {
    setPaymentEntries((currentEntries) => {
      if (currentEntries.length !== 1) return currentEntries;

      return currentEntries.map((entry) => ({
        ...entry,
        amount: finalAmount,
      }));
    });
  }

  function addPaymentEntry() {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) => [
      ...currentEntries,
      {
        id: `payment-entry-${Date.now()}`,
        method: "Pix",
        amount: "",
      },
    ]);
  }

  function removePaymentEntry(entryId: string) {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) =>
      currentEntries.length > 1
        ? currentEntries.filter((entry) => entry.id !== entryId)
        : currentEntries,
    );
  }

  function updatePaymentEntryMethod(entryId: string, method: PaymentMethod) {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId ? { ...entry, method } : entry,
      ),
    );
  }

  function updatePaymentEntryAmount(entryId: string, amount: string) {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId ? { ...entry, amount } : entry,
      ),
    );
  }

  function getPaymentEntriesTotal() {
    return paymentEntries.reduce(
      (total, entry) => total + normalizeAmount(entry.amount),
      0,
    );
  }

  function getChargePayment(chargeId: string) {
    return paymentRecords.find(
      (paymentRecord) => String(paymentRecord.chargeId) === String(chargeId),
    );
  }

  function getChargePaidAmount(charge: Charge) {
    return getChargePayment(charge.id)?.amountPaid ?? charge.amount;
  }

  function getDateInputValue(dateValue?: string) {
    if (!dateValue) return "";

    return getLocalDateValue(new Date(dateValue));
  }

  function getStartOfDay(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    return normalizedDate;
  }

  function getEndOfDay(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);

    return normalizedDate;
  }

  function openReportModal() {
    setReportTenantId(selectedTenant ? String(selectedTenant.id) : "");
    setReportStatusFilter(statusFilter);
    setReportDueFilter("All");
    setReportStartDate("");
    setReportEndDate("");
    setReportFormError("");
    setIsReportOpen(true);
  }

  function closeReportModal() {
    setIsReportOpen(false);
    setReportFormError("");
  }

  function getReportFilteredCharges() {
    const today = getStartOfDay(new Date());
    const startDate = reportStartDate
      ? getStartOfDay(new Date(`${reportStartDate}T00:00:00`))
      : null;
    const endDate = reportEndDate
      ? getEndOfDay(new Date(`${reportEndDate}T00:00:00`))
      : null;
    const selectedReportTenant = tenants.find(
      (tenant) => String(tenant.id) === String(reportTenantId),
    );

    return charges.filter((charge) => {
      const dueDate = getStartOfDay(new Date(charge.dueDate));

      if (
        selectedReportTenant &&
        charge.tenant.toLowerCase() !== selectedReportTenant.name.toLowerCase()
      ) {
        return false;
      }

      if (reportStatusFilter !== "All" && charge.status !== reportStatusFilter) {
        return false;
      }

      if (reportDueFilter === "Overdue" && charge.status !== "Overdue") {
        return false;
      }

      if (reportDueFilter === "DueToday" && dueDate.getTime() !== today.getTime()) {
        return false;
      }

      if (
        reportDueFilter === "Upcoming" &&
        (dueDate < today || charge.status === "Paid")
      ) {
        return false;
      }

      if (reportDueFilter === "DateRange") {
        if (startDate && dueDate < startDate) return false;
        if (endDate && dueDate > endDate) return false;
      }

      return true;
    });
  }

  function getReportTotalAmount(reportCharges: Charge[]) {
    return reportCharges.reduce(
      (total, charge) =>
        total +
        (charge.status === "Paid" ? getChargePaidAmount(charge) : charge.amount),
      0,
    );
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function getCompanySettingsForCarnet() {
    const defaultCompanySettings = {
      companyName: "Rentix",
      tradeName: "Rentix",
      document: "",
      phone: "",
      email: "",
      city: "",
      pixKeyType: "",
      pixKey: "",
    };

    try {
      const storedCompanySettings = localStorage.getItem("rentix_company_settings");

      if (!storedCompanySettings) {
        return defaultCompanySettings;
      }

      return {
        ...defaultCompanySettings,
        ...JSON.parse(storedCompanySettings),
      };
    } catch {
      return defaultCompanySettings;
    }
  }

  function getPaymentBookletInstructions() {
    const defaultInstructions = [
      "1. Efetue o pagamento até a data de vencimento.",
      "2. Após o vencimento, poderão ser aplicados multa e juros conforme contrato.",
      "3. Guarde este comprovante para controle financeiro.",
    ].join("\n");

    try {
      const storedPrintTemplates = localStorage.getItem("rentix_print_templates");

      if (!storedPrintTemplates) {
        return defaultInstructions;
      }

      const parsedPrintTemplates = JSON.parse(storedPrintTemplates) as {
        paymentBooklet?: { content?: string };
      };

      const templateContent = parsedPrintTemplates.paymentBooklet?.content || "";

      return normalizePaymentBookletInstructions(templateContent) || defaultInstructions;
    } catch {
      return defaultInstructions;
    }
  }

  function normalizePaymentBookletInstructions(content: string) {
    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      return "";
    }

    if (!cleanContent.includes("INSTRUÇÕES:")) {
      return cleanContent;
    }

    const instructionsSection = cleanContent.split("INSTRUÇÕES:")[1] || "";

    return instructionsSection
      .split("GERADO EM:")[0]
      .trim();
  }

  function renderPaymentBookletInstructions(instructions: string) {
    const instructionRows = instructions
      .split("\n")
      .map((instruction) => instruction.trim())
      .filter(Boolean)
      .map((instruction) => `<p>${escapeHtml(instruction)}</p>`)
      .join("");

    if (!instructionRows) {
      return "";
    }

    return `<div class="instructions"><span>Instruções</span>${instructionRows}</div>`;
  }

  function removeTextAccents(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function sanitizePixText(value: string, maxLength: number) {
    return removeTextAccents(value)
      .replace(/[^a-zA-Z0-9 $%*+\-.\/]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function formatEmvField(id: string, value: string) {
    const length = String(value.length).padStart(2, "0");

    return `${id}${length}${value}`;
  }

  function calculatePixCrc16(payload: string) {
    let crc = 0xffff;

    for (let index = 0; index < payload.length; index += 1) {
      crc ^= payload.charCodeAt(index) << 8;

      for (let bit = 0; bit < 8; bit += 1) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }

        crc &= 0xffff;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function generatePixPayload(params: {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    amount: number;
    txId: string;
    description: string;
  }) {
    const pixKey = params.pixKey.trim();

    if (!pixKey) {
      return "";
    }

    const merchantAccountInfo =
      formatEmvField("00", "br.gov.bcb.pix") +
      formatEmvField("01", pixKey) +
      formatEmvField("02", sanitizePixText(params.description, 72));

    const additionalDataField = formatEmvField(
      "05",
      sanitizePixText(params.txId || "RENTIX", 25),
    );

    const amount = Number(params.amount || 0).toFixed(2);
    const payloadWithoutCrc =
      formatEmvField("00", "01") +
      formatEmvField("26", merchantAccountInfo) +
      formatEmvField("52", "0000") +
      formatEmvField("53", "986") +
      formatEmvField("54", amount) +
      formatEmvField("58", "BR") +
      formatEmvField("59", sanitizePixText(params.merchantName || "RENTIX", 25)) +
      formatEmvField("60", sanitizePixText(params.merchantCity || "BRASIL", 15)) +
      formatEmvField("62", additionalDataField) +
      "6304";

    return `${payloadWithoutCrc}${calculatePixCrc16(payloadWithoutCrc)}`;
  }

  function getPixQrCodeUrl(pixPayload: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
      pixPayload,
    )}`;
  }

  function generatePaymentCarnet(carnetCharges: Charge[]) {
    if (carnetCharges.length === 0) return;

    const printWindow = window.open(
      "",
      "_blank",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
    );

    if (!printWindow) {
      setChargeFormError(
        "As parcelas foram salvas, mas não foi possível abrir o carnê. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    const companySettings = getCompanySettingsForCarnet();
    const companyName =
      companySettings.tradeName || companySettings.companyName || "Rentix";
    const companyDocument = companySettings.document || "Não informado";
    const companyPhone = companySettings.phone || "Não informado";
    const companyEmail = companySettings.email || "Não informado";
    const pixKeyType = companySettings.pixKeyType || "Pix";
    const pixKey = companySettings.pixKey || "Não cadastrada";
    const firstCharge = carnetCharges[0];
    const paymentBookletInstructions = getPaymentBookletInstructions();
    const totalAmount = carnetCharges.reduce(
      (total, charge) => total + charge.amount,
      0,
    );

    const rows = carnetCharges
      .map(
        (charge) => `
          <tr>
            <td>${charge.installmentNumber || 1}/${charge.installmentTotal || carnetCharges.length}</td>
            <td>${escapeHtml(charge.tenant)}</td>
            <td>${escapeHtml(charge.property)}</td>
            <td>${formatDate(charge.dueDate)}</td>
            <td>${formatCurrency(charge.amount)}</td>
          </tr>
        `,
      )
      .join("");

    const vouchers = carnetCharges
      .map((charge) => {
        const installmentLabel = `${charge.installmentNumber || 1}/${
          charge.installmentTotal || carnetCharges.length
        }`;
        const pixPayload = generatePixPayload({
          pixKey: companySettings.pixKey || "",
          merchantName: companyName,
          merchantCity: companySettings.city || "Brasil",
          amount: charge.amount,
          txId: `RX${String(charge.installmentGroupId || charge.id)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-18)}${String(charge.installmentNumber || 1).padStart(2, "0")}`,
          description: `Aluguel ${installmentLabel} ${charge.tenant}`,
        });
        const pixQrCodeUrl = pixPayload ? getPixQrCodeUrl(pixPayload) : "";

        return `
          <section class="voucher">
            <div class="voucher-header">
              <div>
                <div class="brand">${escapeHtml(companyName)}</div>
                <h2>Carnê de pagamento</h2>
              </div>
              <div class="installment-badge">
                Parcela ${installmentLabel}
              </div>
            </div>

            <div class="voucher-grid">
              <div class="field full">
                <span>Inquilino/Pessoa</span>
                <strong>${escapeHtml(charge.tenant)}</strong>
              </div>

              <div class="field full">
                <span>Imóvel</span>
                <strong>${escapeHtml(charge.property)}</strong>
              </div>

              <div class="field">
                <span>Vencimento</span>
                <strong>${formatDate(charge.dueDate)}</strong>
              </div>

              <div class="field">
                <span>Valor</span>
                <strong>${formatCurrency(charge.amount)}</strong>
              </div>
            </div>

            <div class="pix-area">
              <div class="pix-info">
                <span>Pagamento via Pix</span>
                <strong>${escapeHtml(pixKey)}</strong>
                <small>Tipo da chave: ${escapeHtml(pixKeyType || "Não informado")}</small>
                ${
                  pixPayload
                    ? `<div class="pix-copy"><span>Pix copia e cola</span><p>${escapeHtml(pixPayload)}</p></div>`
                    : `<div class="pix-warning">Cadastre a chave Pix da empresa para gerar o QR Code automático.</div>`
                }
              </div>
              ${
                pixQrCodeUrl
                  ? `<div class="pix-qr"><img src="${pixQrCodeUrl}" alt="QR Code Pix" /><span>QR Code Pix</span></div>`
                  : ""
              }
            </div>

            ${renderPaymentBookletInstructions(paymentBookletInstructions)}

            <div class="voucher-footer">
              <span>${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)}</span>
              <span>Telefone: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}</span>
            </div>
          </section>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Carnê de Pagamento</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: Arial, sans-serif; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(10px); }
            .toolbar button { border: 0; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 800; cursor: pointer; }
            .print-button { background: #059669; color: #ffffff; }
            .close-button { background: #e2e8f0; color: #0f172a; }
            @page { size: A4; margin: 10mm; }
            .page { width: min(1240px, calc(100% - 40px)); margin: 24px auto; }
            .voucher-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .summary { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 18px; background: #ffffff; padding: 24px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.10); }
            .summary-header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
            .brand { color: #ea580c; font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
            h1, h2 { margin: 6px 0 0; }
            .summary-meta { color: #64748b; font-size: 12px; line-height: 1.7; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #fff7ed; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
            th, td { border: 1px solid #e2e8f0; padding: 9px; font-size: 12px; text-align: left; }
            .voucher { break-inside: avoid; page-break-inside: avoid; border: 1px dashed #94a3b8; border-radius: 18px; background: #ffffff; padding: 18px; min-height: 318px; }
            .voucher-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            .installment-badge { border-radius: 999px; background: #ecfdf5; color: #047857; padding: 8px 12px; font-size: 12px; font-weight: 900; white-space: nowrap; }
            .voucher-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
            .field { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; background: #f8fafc; }
            .field.full { grid-column: 1 / -1; }
            .field span { display: block; color: #64748b; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
            .field strong { display: block; margin-top: 5px; font-size: 14px; }
            .field small { display: block; margin-top: 5px; color: #64748b; font-size: 11px; font-weight: 700; }
            .pix-area { display: grid; grid-template-columns: minmax(0, 1fr) 132px; gap: 12px; margin-top: 12px; border: 1px solid #a7f3d0; border-radius: 14px; background: #ecfdf5; padding: 12px; }
            .pix-info span, .pix-copy span { display: block; color: #047857; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
            .pix-info strong { display: block; margin-top: 5px; color: #0f172a; font-size: 14px; }
            .pix-info small { display: block; margin-top: 4px; color: #475569; font-size: 11px; font-weight: 700; }
            .pix-copy { margin-top: 8px; border-radius: 10px; background: #ffffff; padding: 8px; border: 1px dashed #6ee7b7; }
            .pix-copy p { margin: 5px 0 0; color: #0f172a; font-size: 8px; line-height: 1.35; word-break: break-all; }
            .pix-warning { margin-top: 8px; border-radius: 10px; background: #fff7ed; color: #c2410c; padding: 8px; font-size: 11px; font-weight: 800; }
            .pix-qr { display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; background: #ffffff; padding: 8px; border: 1px solid #d1fae5; }
            .pix-qr img { width: 112px; height: 112px; object-fit: contain; }
            .pix-qr span { margin-top: 5px; color: #047857; font-size: 10px; font-weight: 900; }
            .instructions { margin-top: 12px; border: 1px solid #fed7aa; border-radius: 12px; background: #fff7ed; padding: 10px 12px; }
            .instructions span { display: block; margin-bottom: 6px; color: #c2410c; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
            .instructions p { margin: 3px 0; color: #334155; font-size: 10px; line-height: 1.35; font-weight: 700; }
            .voucher-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; color: #64748b; font-size: 10px; font-weight: 700; }
            @media print {
              body { background: #ffffff; }
              .toolbar { display: none !important; }
              .page { width: 100%; margin: 0; padding: 0; }
              .summary { box-shadow: none; border-radius: 0; }
              .voucher { margin-bottom: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="print-button" type="button" onclick="window.print()">Imprimir carnê</button>
            <button class="close-button" type="button" onclick="window.close()">Fechar</button>
          </div>

          <main class="page">
            <section class="summary">
              <div class="summary-header">
                <div>
                  <div class="brand">${escapeHtml(companyName)} · Financeiro</div>
                  <h1>Carnê de Pagamento</h1>
                  <p>Inquilino: <strong>${escapeHtml(firstCharge.tenant)}</strong></p>
                  <p>Imóvel: <strong>${escapeHtml(firstCharge.property)}</strong></p>
                </div>
                <div class="summary-meta">
                  Parcelas: <strong>${carnetCharges.length}</strong><br />
                  Total: <strong>${formatCurrency(totalAmount)}</strong><br />
                  Gerado em: <strong>${new Date().toLocaleString("pt-BR")}</strong>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Inquilino</th>
                    <th>Imóvel</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </section>

            <div class="voucher-list">
              ${vouchers}
            </div>
          </main>

          <script>
            window.onload = function () {
              window.focus();
              try {
                window.moveTo(0, 0);
                window.resizeTo(screen.availWidth, screen.availHeight);
              } catch (error) {}
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    try {
      printWindow.moveTo(0, 0);
      printWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
    } catch {}
  }

  function openAccountsReceivableReport(shouldPrint: boolean) {
    setReportFormError("");

    if (reportDueFilter === "DateRange" && !reportStartDate && !reportEndDate) {
      setReportFormError(
        "Informe ao menos uma data inicial ou final para gerar relatório por período.",
      );
      return;
    }

    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
      setReportFormError("A data inicial não pode ser maior que a data final.");
      return;
    }

    const reportCharges = getReportFilteredCharges();

    if (reportCharges.length === 0) {
      setReportFormError("Nenhuma conta encontrada para os filtros informados.");
      return;
    }

    const selectedReportTenant = tenants.find(
      (tenant) => String(tenant.id) === String(reportTenantId),
    );
    const pendingTotal = reportCharges
      .filter((charge) => charge.status === "Pending")
      .reduce((total, charge) => total + charge.amount, 0);
    const paidTotal = reportCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
    const overdueTotal = reportCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + charge.amount, 0);
    const grandTotal = getReportTotalAmount(reportCharges);

    const filterSummary = [
      `Pessoa: ${selectedReportTenant?.name || "Todas"}`,
      `Status: ${getStatusFilterLabel(reportStatusFilter)}`,
      `Vencimento: ${getReportDueFilterLabel(reportDueFilter)}`,
      reportDueFilter === "DateRange" && reportStartDate
        ? `De: ${formatDate(`${reportStartDate}T00:00:00`)}`
        : "",
      reportDueFilter === "DateRange" && reportEndDate
        ? `Até: ${formatDate(`${reportEndDate}T00:00:00`)}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const rows = reportCharges
      .map((charge) => {
        const payment = getChargePayment(charge.id);
        const amount =
          charge.status === "Paid" ? getChargePaidAmount(charge) : charge.amount;
        const paymentMethods = payment?.paymentItems?.length
          ? payment.paymentItems
              .map(
                (item) =>
                  `${getPaymentMethodLabel(item.method)} (${formatCurrency(item.amount)})`,
              )
              .join(", ")
          : payment
            ? getPaymentMethodLabel(payment.method)
            : "-";

        return `
          <tr>
            <td>${escapeHtml(charge.property)}</td>
            <td>${escapeHtml(charge.tenant)}</td>
            <td>${formatDate(charge.dueDate)}</td>
            <td>${formatCurrency(amount)}</td>
            <td>${getStatusLabel(charge.status)}</td>
            <td>${payment?.paidAt ? formatDate(payment.paidAt) : "-"}</td>
            <td>${escapeHtml(paymentMethods)}</td>
          </tr>
        `;
      })
      .join("");

    const reportWindow = window.open("", "_blank", "width=1200,height=800");

    if (!reportWindow) {
      setReportFormError(
        "Não foi possível abrir o relatório. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    reportWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Contas a Receber</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #f1f5f9; }
            .report-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(10px); }
            .toolbar-button { border: 0; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 800; cursor: pointer; transition: 0.2s ease; }
            .toolbar-button.print { background: #059669; color: #ffffff; box-shadow: 0 8px 18px rgba(5, 150, 105, 0.2); }
            .toolbar-button.print:hover { background: #047857; }
            .toolbar-button.close { background: #e2e8f0; color: #0f172a; }
            .toolbar-button.close:hover { background: #cbd5e1; }
            .report-page { width: min(1180px, calc(100% - 48px)); margin: 28px auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12); }
            .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; }
            .brand { font-size: 13px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.08em; }
            h1 { margin: 6px 0 0; font-size: 26px; }
            .meta { margin-top: 8px; font-size: 12px; color: #64748b; line-height: 1.6; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; background: #f8fafc; }
            .card span { display: block; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .card strong { display: block; margin-top: 6px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #fff7ed; color: #0f172a; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
            th, td { border: 1px solid #e2e8f0; padding: 9px; font-size: 12px; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            .footer { margin-top: 24px; font-size: 11px; color: #64748b; text-align: center; }
            @media print {
              body { margin: 0; background: #ffffff; }
              .no-print { display: none !important; }
              .report-page { width: 100%; margin: 0; padding: 18px; border: 0; border-radius: 0; box-shadow: none; }
              .summary { grid-template-columns: repeat(4, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="report-toolbar no-print">
            <button class="toolbar-button print" type="button" onclick="window.print()">Imprimir</button>
            <button class="toolbar-button close" type="button" onclick="window.close()">Fechar relatório</button>
          </div>

          <main class="report-page">
          <div class="header">
            <div>
              <div class="brand">Rentix · Financeiro</div>
              <h1>Relatório de Contas a Receber</h1>
              <div class="meta">${escapeHtml(filterSummary)}</div>
            </div>
            <div class="meta">
              Gerado em:<br />
              <strong>${new Date().toLocaleString("pt-BR")}</strong>
            </div>
          </div>

          <div class="summary">
            <div class="card"><span>Quantidade</span><strong>${reportCharges.length}</strong></div>
            <div class="card"><span>Total geral</span><strong>${formatCurrency(grandTotal)}</strong></div>
            <div class="card"><span>Total pago</span><strong>${formatCurrency(paidTotal)}</strong></div>
            <div class="card"><span>Total vencido</span><strong>${formatCurrency(overdueTotal)}</strong></div>
          </div>

          <div class="summary">
            <div class="card"><span>Total pendente</span><strong>${formatCurrency(pendingTotal)}</strong></div>
            <div class="card"><span>Status</span><strong>${getStatusFilterLabel(reportStatusFilter)}</strong></div>
            <div class="card"><span>Vencimento</span><strong>${getReportDueFilterLabel(reportDueFilter)}</strong></div>
            <div class="card"><span>Pessoa</span><strong>${escapeHtml(selectedReportTenant?.name || "Todas")}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Inquilino/Pessoa</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Forma de pagamento</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="footer">Relatório gerado pelo módulo Contas a Receber do Rentix.</div>
          </main>
          ${
            shouldPrint
              ? `<script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>`
              : ""
          }
        </body>
      </html>
    `);
    reportWindow.document.close();
  }

  function viewAccountsReceivableReport() {
    openAccountsReceivableReport(false);
  }

  function generateAccountsReceivablePdf() {
    openAccountsReceivableReport(true);
  }

  function openCreateModal() {
    const today = new Date();
    const dueDate = new Date();

    dueDate.setDate(today.getDate() + 30);

    setFormIssueDate(getLocalDateValue(today));
    setFormDueDate(getLocalDateValue(dueDate));
    setFormPaymentDate("");
    setFormLaunchType("single");
    setEditingChargeId(null);
    setChargeFormError("");
    setIsCreateOpen(true);
  }

  function openEditCharge(charge: Charge) {
    const tenant = tenants.find(
      (item) => item.name.toLowerCase() === charge.tenant.toLowerCase(),
    );
    const property = properties.find(
      (item) => item.name.toLowerCase() === charge.property.toLowerCase(),
    );

    const paymentRecord = getChargePayment(charge.id);

    setEditingChargeId(charge.id);
    setFormTenant(tenant ? String(tenant.id) : "");
    setFormProperty(property ? String(property.id) : "");
    setFormAmount(formatAmountInput(charge.amount));
    setFormIssueDate(
      getDateInputValue(charge.issueDate) || getLocalDateValue(new Date()),
    );
    setFormDueDate(getDateInputValue(charge.dueDate));
    setFormPaymentDate(
      paymentRecord?.paidAt
        ? getDateInputValue(paymentRecord.paidAt)
        : getLocalDateValue(new Date()),
    );
    setFormLaunchType("single");
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setChargeFormError("");
    setIsCreateOpen(true);
  }

  function openReceivePaymentModal(charge: Charge) {
    setChargePendingPaymentReceipt(charge);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentFinalAmount(formatAmountInput(charge.amount));
    setPaymentMethod("Cash");
    setPaymentEntries([
      {
        id: `payment-entry-${Date.now()}`,
        method: "Cash",
        amount: formatAmountInput(charge.amount),
      },
    ]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function closeReceivePaymentModal() {
    setChargePendingPaymentReceipt(null);
    setIsPaymentConfirmationOpen(false);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentFinalAmount("");
    setPaymentMethod("Cash");
    setPaymentEntries([]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function confirmReceivePayment() {
    if (!chargePendingPaymentReceipt) return;

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);
    const paymentEntriesTotal = getPaymentEntriesTotal();

    if (interest < 0 || discount < 0) {
      setPaymentFormError(
        "Informe juros e desconto com valores válidos para receber a cobrança.",
      );
      return;
    }

    if (amountPaid <= 0) {
      setPaymentFormError("O valor final recebido precisa ser maior que zero.");
      return;
    }

    if (paymentEntries.length === 0) {
      setPaymentFormError("Informe ao menos uma forma de pagamento.");
      return;
    }

    const hasInvalidPaymentEntry = paymentEntries.some(
      (entry) => normalizeAmount(entry.amount) <= 0,
    );

    if (hasInvalidPaymentEntry) {
      setPaymentFormError(
        "Informe valores válidos em todas as formas de pagamento.",
      );
      return;
    }

    if (Math.abs(paymentEntriesTotal - amountPaid) > 0.01) {
      setPaymentFormError(
        "A soma das formas de pagamento precisa ser igual ao valor final recebido.",
      );
      return;
    }

    setPaymentFormError("");
    setIsPaymentConfirmationOpen(true);
  }

  function closePaymentConfirmation() {
    setIsPaymentConfirmationOpen(false);
  }

  function finishReceivePayment() {
    if (!chargePendingPaymentReceipt) return;

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);

    const updatedPaid = paid.includes(chargePendingPaymentReceipt.id)
      ? paid
      : [...paid, chargePendingPaymentReceipt.id];

    const paymentRecord: ChargePayment = {
      chargeId: chargePendingPaymentReceipt.id,
      paidAt: new Date().toISOString(),
      method: paymentEntries[0]?.method || paymentMethod,
      paymentItems: paymentEntries.map((entry) => ({
        id: entry.id,
        method: entry.method,
        amount: normalizeAmount(entry.amount),
      })),
      interest,
      discount,
      amountPaid,
      note: paymentNote.trim(),
    };

    const updatedPaymentRecords = [
      ...paymentRecords.filter(
        (currentPaymentRecord) =>
          String(currentPaymentRecord.chargeId) !==
          String(chargePendingPaymentReceipt.id),
      ),
      paymentRecord,
    ];

    setPaid(updatedPaid);
    setPaymentRecords(updatedPaymentRecords);
    localStorage.setItem("rentix_paid_charges", JSON.stringify(updatedPaid));
    localStorage.setItem(
      "rentix_charge_payments",
      JSON.stringify(updatedPaymentRecords),
    );

    closeReceivePaymentModal();
  }

  function clearTenantFilter() {
    setSelectedTenant(null);
    setSearch("");
    setIsSearchOpen(false);
  }

  function clearAllFilters() {
    setSelectedTenant(null);
    setSearch("");
    setStatusFilter("All");
  }

  function resetCreateForm() {
    setFormTenant("");
    setFormProperty("");
    setFormAmount("");
    setFormIssueDate("");
    setFormDueDate("");
    setFormPaymentDate("");
    setFormLaunchType("single");
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setChargeFormError("");
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsZipCodeLoading(false);
    setIsTenantCreateOpen(false);
  }

  function closeCreateModal() {
    resetCreateForm();
    setEditingChargeId(null);
    setIsCreateOpen(false);
  }

  function openDeleteChargeConfirmation() {
    if (!editingChargeId) return;

    const charge = manualCharges.find(
      (item) => String(item.id) === String(editingChargeId),
    );

    if (!charge) {
      setChargeFormError(
        "Esta cobrança não pode ser excluída porque foi gerada automaticamente por contrato.",
      );
      return;
    }

    setChargePendingDeletion(charge);
  }

  function closeDeleteChargeConfirmation() {
    setChargePendingDeletion(null);
  }

  function openPaymentReversalConfirmation() {
    if (!editingChargeId) return;

    const charge = charges.find(
      (item) => String(item.id) === String(editingChargeId),
    );

    if (!charge || !paid.includes(charge.id)) {
      setChargeFormError(
        "Esta cobrança não está marcada como paga para voltar para pagamento.",
      );
      return;
    }

    setChargePendingPaymentReversal(charge);
  }

  function closePaymentReversalConfirmation() {
    setChargePendingPaymentReversal(null);
  }

  function confirmPaymentReversal() {
    if (!chargePendingPaymentReversal) return;

    const updatedPaid = paid.filter(
      (paidChargeId) =>
        String(paidChargeId) !== String(chargePendingPaymentReversal.id),
    );

    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.chargeId) !==
        String(chargePendingPaymentReversal.id),
    );

    setPaid(updatedPaid);
    setPaymentRecords(updatedPaymentRecords);
    localStorage.setItem("rentix_paid_charges", JSON.stringify(updatedPaid));
    localStorage.setItem(
      "rentix_charge_payments",
      JSON.stringify(updatedPaymentRecords),
    );

    setChargePendingPaymentReversal(null);
    closeCreateModal();
  }

  function confirmDeleteCharge() {
    if (!chargePendingDeletion) return;

    const updatedManualCharges = manualCharges.filter(
      (charge) => String(charge.id) !== String(chargePendingDeletion.id),
    );
    const updatedPaid = paid.filter(
      (paidChargeId) =>
        String(paidChargeId) !== String(chargePendingDeletion.id),
    );
    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.chargeId) !== String(chargePendingDeletion.id),
    );

    setManualCharges(updatedManualCharges);
    setPaid(updatedPaid);
    setPaymentRecords(updatedPaymentRecords);
    localStorage.setItem(
      "rentix_manual_charges",
      JSON.stringify(updatedManualCharges),
    );
    localStorage.setItem("rentix_paid_charges", JSON.stringify(updatedPaid));
    localStorage.setItem(
      "rentix_charge_payments",
      JSON.stringify(updatedPaymentRecords),
    );

    setChargePendingDeletion(null);
    closeCreateModal();
  }

  function openTenantCreateModal() {
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsTenantCreateOpen(true);
  }

  function closeTenantCreateModal() {
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsTenantCreateOpen(false);
  }

  function updateTenantFormData<K extends keyof TenantFormData>(
    field: K,
    value: TenantFormData[K],
  ) {
    setTenantFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function updateTenantPersonType(personType: PersonType) {
    setTenantFormData((currentData) => ({
      ...currentData,
      personType,
      cpf: "",
    }));
    setZipCodeError("");
    setCnpjSearchError("");
  }

  async function searchCompanyByCnpj() {
    const cleanCnpj = onlyNumbers(tenantFormData.cpf);

    if (tenantFormData.personType !== "Company") return;

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
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      );

      if (!response.ok) {
        setCnpjSearchError("Empresa não encontrada para o CNPJ informado.");
        return;
      }

      const data = (await response.json()) as BrasilApiCnpjResponse;

      setTenantFormData((currentData) => ({
        ...currentData,
        name:
          data.razao_social?.trim() ||
          data.nome_fantasia?.trim() ||
          currentData.name,
        cpf: formatCnpj(data.cnpj || cleanCnpj),
        phone: data.ddd_telefone_1
          ? formatPhone(data.ddd_telefone_1)
          : currentData.phone,
        zipCode: data.cep ? formatZipCode(data.cep) : currentData.zipCode,
        state: data.uf || currentData.state,
        city: data.municipio || currentData.city,
        street: data.logradouro || currentData.street,
        number: data.numero || currentData.number,
        district: data.bairro || currentData.district,
        complement: data.complemento || currentData.complement,
      }));
    } catch {
      setCnpjSearchError("Não foi possível consultar o CNPJ no momento.");
    } finally {
      setIsCnpjLoading(false);
    }
  }

  function createTenantFromModal() {
    const trimmedTenantName = tenantFormData.name.trim();

    if (!trimmedTenantName) return;

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: trimmedTenantName,
      personType: tenantFormData.personType,
      cpf: tenantFormData.cpf.trim(),
      phone: tenantFormData.phone.trim(),
      isTenant: tenantFormData.isTenant,
      zipCode: tenantFormData.zipCode.trim(),
      state: tenantFormData.state.trim(),
      city: tenantFormData.city.trim(),
      street: tenantFormData.street.trim(),
      number: tenantFormData.number.trim(),
      district: tenantFormData.district.trim(),
      complement: tenantFormData.complement.trim(),
    };

    const updatedTenants = [...tenants, newTenant];

    setTenants(updatedTenants);
    setFormTenant(newTenant.id);
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setIsTenantCreateOpen(false);

    localStorage.setItem("rentix_tenants", JSON.stringify(updatedTenants));
  }

  function generateInstallmentPreview() {
    const totalAmount = normalizeAmount(formAmount);
    const quantity = Number(formInstallmentQuantity);

    if (!formDueDate || totalAmount <= 0 || !Number.isFinite(quantity)) {
      setInstallmentPreview([]);
      return;
    }

    const normalizedQuantity = Math.max(2, Math.trunc(quantity));
    const installmentAmount = totalAmount / normalizedQuantity;

    const generatedInstallments = Array.from(
      { length: normalizedQuantity },
      (_, index) => ({
        id: `preview-${index + 1}`,
        installmentNumber: index + 1,
        amount: formatAmountInput(installmentAmount),
        dueDate: addDaysToDate(formDueDate, index * 30),
      }),
    );

    setInstallmentPreview(generatedInstallments);
  }

  function updateInstallmentAmount(id: string, amount: string) {
    setInstallmentPreview((currentInstallments) =>
      currentInstallments.map((installment) =>
        installment.id === id ? { ...installment, amount } : installment,
      ),
    );
  }

  function updateInstallmentDueDate(id: string, dueDate: string) {
    setInstallmentPreview((currentInstallments) =>
      currentInstallments.map((installment) =>
        installment.id === id ? { ...installment, dueDate } : installment,
      ),
    );
  }

  function getCarnetChargesFromCharge(charge: Charge) {
    if (charge.installmentGroupId) {
      const groupedCharges = charges
        .filter(
          (currentCharge) =>
            String(currentCharge.installmentGroupId || "") ===
            String(charge.installmentGroupId),
        )
        .sort(
          (firstCharge, secondCharge) =>
            Number(firstCharge.installmentNumber || 0) -
            Number(secondCharge.installmentNumber || 0),
        );

      if (groupedCharges.length > 0) {
        return groupedCharges;
      }
    }

    return [
      {
        ...charge,
        installmentNumber: charge.installmentNumber || 1,
        installmentTotal: charge.installmentTotal || 1,
        installmentGroupId: charge.installmentGroupId || charge.id,
      },
    ];
  }

  function reprintPaymentCarnet(charge: Charge) {
    const carnetCharges = getCarnetChargesFromCharge(charge);

    generatePaymentCarnet(carnetCharges);
  }

  function saveManualCharge() {
    setChargeFormError("");

    const normalizedAmount = normalizeAmount(formAmount);

    if (isEditingPaidCharge) {
      if (!editingChargeId) return;

      if (!formPaymentDate) {
        setChargeFormError(
          "Informe a data de pagamento para salvar os ajustes.",
        );
        return;
      }

      const currentPaymentRecord = getChargePayment(editingChargeId);
      const currentCharge = charges.find(
        (charge) => String(charge.id) === String(editingChargeId),
      );

      const updatedPaymentRecord: ChargePayment = {
        chargeId: editingChargeId,
        paidAt: new Date(`${formPaymentDate}T00:00:00`).toISOString(),
        method: currentPaymentRecord?.method || "Cash",
        interest: currentPaymentRecord?.interest || 0,
        discount: currentPaymentRecord?.discount || 0,
        amountPaid:
          currentPaymentRecord?.amountPaid || currentCharge?.amount || 0,
        note: currentPaymentRecord?.note || "",
      };

      const updatedPaymentRecords = [
        ...paymentRecords.filter(
          (paymentRecord) =>
            String(paymentRecord.chargeId) !== String(editingChargeId),
        ),
        updatedPaymentRecord,
      ];

      setPaymentRecords(updatedPaymentRecords);
      localStorage.setItem(
        "rentix_charge_payments",
        JSON.stringify(updatedPaymentRecords),
      );

      closeCreateModal();
      return;
    }

    if (!formTenant) {
      setChargeFormError(
        "Selecione um inquilino/pessoa para salvar a cobrança.",
      );
      return;
    }

    if (normalizedAmount <= 0) {
      setChargeFormError(
        "Informe um valor total válido para salvar a cobrança.",
      );
      return;
    }

    if (!formIssueDate) {
      setChargeFormError(
        "Informe a data de lançamento para salvar a cobrança.",
      );
      return;
    }

    if (!formDueDate) {
      setChargeFormError(
        "Informe o primeiro vencimento para salvar a cobrança.",
      );
      return;
    }

    const tenant = tenants.find((item) => String(item.id) === formTenant);
    const property = properties.find(
      (item) => String(item.id) === formProperty,
    );

    if (!tenant) {
      setChargeFormError(
        "Inquilino/pessoa não encontrado. Selecione novamente.",
      );
      return;
    }

    const chargeProperty = property?.name || "Sem imóvel vinculado";
    const issueDate = new Date(`${formIssueDate}T00:00:00`).toISOString();

    if (formLaunchType === "single") {
      const savedCharge: Charge = {
        id: editingChargeId || `manual-${Date.now()}`,
        property: chargeProperty,
        tenant: tenant.name,
        dueDate: new Date(`${formDueDate}T00:00:00`).toISOString(),
        issueDate,
        amount: normalizedAmount,
        status: "Pending",
        manual: true,
      };

      const alreadyExists = manualCharges.some(
        (charge) => String(charge.id) === String(savedCharge.id),
      );

      const updatedManualCharges = alreadyExists
        ? manualCharges.map((charge) =>
            String(charge.id) === String(savedCharge.id) ? savedCharge : charge,
          )
        : [...manualCharges, savedCharge];

      setManualCharges(updatedManualCharges);
      localStorage.setItem(
        "rentix_manual_charges",
        JSON.stringify(updatedManualCharges),
      );

      generatePaymentCarnet([
        {
          ...savedCharge,
          installmentNumber: 1,
          installmentTotal: 1,
          installmentGroupId: savedCharge.id,
        },
      ]);
      closeCreateModal();
      return;
    }

    if (installmentPreview.length === 0) {
      setChargeFormError(
        "Gere ao menos uma parcela válida para salvar a cobrança.",
      );
      return;
    }

    const hasInvalidInstallment = installmentPreview.some(
      (installment) =>
        normalizeAmount(installment.amount) <= 0 || !installment.dueDate,
    );

    if (hasInvalidInstallment) {
      setChargeFormError(
        "Revise os valores e vencimentos das parcelas antes de salvar.",
      );
      return;
    }

    const installmentGroupId = `installment-${Date.now()}`;

    const newCharges: Charge[] = installmentPreview.map((installment) => ({
      id: `${installmentGroupId}-${installment.installmentNumber}`,
      property: chargeProperty,
      tenant: tenant.name,
      dueDate: new Date(`${installment.dueDate}T00:00:00`).toISOString(),
      issueDate,
      amount: normalizeAmount(installment.amount),
      status: "Pending",
      manual: true,
      installmentNumber: installment.installmentNumber,
      installmentTotal: installmentPreview.length,
      installmentGroupId,
    }));

    const updatedManualCharges = [...manualCharges, ...newCharges];

    setManualCharges(updatedManualCharges);
    localStorage.setItem(
      "rentix_manual_charges",
      JSON.stringify(updatedManualCharges),
    );

    generatePaymentCarnet(newCharges);
    closeCreateModal();
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">
            Contas a Receber
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Acompanhe cobranças geradas automaticamente pelos contratos ativos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card
            title="Total a Receber"
            value={formatCurrency(totalReceivable)}
          />
          <Card
            title="Total Recebido"
            value={formatCurrency(totalPaid)}
            green
          />
          <Card
            title="Total Vencido"
            value={formatCurrency(totalOverdue)}
            red
          />
          <Card title="Cobranças" value={filteredCharges.length} />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Filtros Financeiros
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Refine a visualização sem alterar os dados originais.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["All", "Pending", "Paid", "Overdue"] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      statusFilter === status
                        ? "bg-orange-50 dark:bg-orange-950/300 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {getStatusFilterLabel(status)}
                  </button>
                ),
              )}

              <button
                onClick={clearAllFilters}
                className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {(selectedTenant || statusFilter !== "All") && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/30 p-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-orange-700">
                Filtro aplicado
              </p>

              <p className="text-sm text-slate-700 dark:text-slate-300">
                {selectedTenant ? (
                  <>
                    Inquilino: <strong>{selectedTenant.name}</strong>
                  </>
                ) : (
                  "Todos os inquilinos"
                )}{" "}
                · Status: <strong>{getStatusFilterLabel(statusFilter)}</strong>.
              </p>
            </div>

            <button
              onClick={clearAllFilters}
              className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-orange-600 shadow-sm ring-1 ring-orange-200 dark:ring-orange-900/60 transition hover:bg-orange-100 dark:hover:bg-orange-900/50 dark:bg-orange-900/40"
            >
              Remover filtros
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Lista de Contas a Receber
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Visualize os recebimentos pendentes, pagos e vencidos.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openCreateModal}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Nova cobrança
                </button>

                <button
                  onClick={openReportModal}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Relatório PDF
                </button>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="rounded-xl bg-orange-50 dark:bg-orange-950/300 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Buscar inquilino
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-orange-50 dark:bg-orange-950/30">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Imóvel
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Inquilino
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Vencimento
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Valor
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCharges.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500"
                    >
                      Nenhuma conta a receber encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((charge) => (
                    <tr
                      key={charge.id}
                      className="border-t border-slate-100 dark:border-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {charge.property}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
                        {charge.tenant}
                        {charge.installmentNumber &&
                          charge.installmentTotal && (
                            <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                              {charge.installmentNumber}/
                              {charge.installmentTotal}
                            </span>
                          )}
                      </td>

                      <td className="px-5 py-4 text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
                        {formatDate(charge.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(charge.amount)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                            charge.status,
                          )}`}
                        >
                          {getStatusLabel(charge.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {charge.status !== "Paid" ? (
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => openEditCharge(charge)}
                              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => reprintPaymentCarnet(charge)}
                              className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/50 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/50 dark:bg-emerald-900/40"
                            >
                              Carnê
                            </button>

                            <button
                              onClick={() => openReceivePaymentModal(charge)}
                              className="rounded-xl bg-orange-50 dark:bg-orange-950/300 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                            >
                              Receber
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => openEditCharge(charge)}
                              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => reprintPaymentCarnet(charge)}
                              className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/50 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/50 dark:bg-emerald-900/40"
                            >
                              Carnê
                            </button>

                            <span className="inline-flex items-center text-sm font-semibold text-emerald-600">
                              Pago
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isReportOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl shadow-lg shadow-slate-900/20">
                    📄
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      Relatório de contas a receber
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Visualize o relatório na tela ou gere um PDF com filtros por pessoa,
                      status, vencidas, a vencer ou período.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReportModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
                  aria-label="Fechar relatório"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Pessoa/Inquilino
                  </label>

                  <select
                    value={reportTenantId}
                    onChange={(event) => {
                      setReportFormError("");
                      setReportTenantId(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-700"
                  >
                    <option value="">Todas as pessoas</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Status
                  </label>

                  <select
                    value={reportStatusFilter}
                    onChange={(event) => {
                      setReportFormError("");
                      setReportStatusFilter(event.target.value as StatusFilter);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-700"
                  >
                    <option value="All">Todos</option>
                    <option value="Pending">Pendente</option>
                    <option value="Paid">Pago</option>
                    <option value="Overdue">Vencido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Filtro de vencimento
                </label>

                <div className="grid gap-3 md:grid-cols-5">
                  {([
                    "All",
                    "Overdue",
                    "DueToday",
                    "Upcoming",
                    "DateRange",
                  ] as ReportDueFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        setReportFormError("");
                        setReportDueFilter(filter);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                        reportDueFilter === filter
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                      }`}
                    >
                      {getReportDueFilterLabel(filter)}
                    </button>
                  ))}
                </div>
              </div>

              {reportDueFilter === "DateRange" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Data inicial
                    </label>

                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(event) => {
                        setReportFormError("");
                        setReportStartDate(event.target.value);
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Data final
                    </label>

                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(event) => {
                        setReportFormError("");
                        setReportEndDate(event.target.value);
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-700"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Prévia do relatório
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Registros
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                      {getReportFilteredCharges().length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Total filtrado
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(getReportTotalAmount(getReportFilteredCharges()))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Tipo
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">
                      {getReportDueFilterLabel(reportDueFilter)}
                    </p>
                  </div>
                </div>
              </div>

              {reportFormError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-bold text-red-700">
                  {reportFormError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={viewAccountsReceivableReport}
                className="rounded-xl bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800"
              >
                Visualizar relatório
              </button>

              <button
                type="button"
                onClick={generateAccountsReceivablePdf}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/300 text-xl shadow-lg shadow-orange-500/20">
                    🔎
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      Buscar por Inquilino
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Selecione um inquilino para visualizar somente as contas
                      dele.
                    </p>
                  </div>
                </div>

                <button
                  onClick={clearTenantFilter}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
                  aria-label="Fechar busca"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nome do inquilino
                </label>

                <input
                  placeholder="Digite para buscar..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredTenants.length === 0 ? (
                    <div className="rounded-xl bg-white dark:bg-slate-900 p-5 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Nenhum inquilino encontrado.
                    </div>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setIsSearchOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-left shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 transition hover:bg-orange-50 dark:hover:bg-orange-950/40 dark:bg-orange-950/30 hover:ring-orange-200 dark:ring-orange-900/60"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {tenant.name}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            Clique para filtrar as contas
                          </p>
                        </div>

                        <span className="rounded-full bg-orange-100 dark:bg-orange-900/40 px-3 py-1 text-xs font-bold text-orange-700">
                          Selecionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={autoOpenSearch}
                  onChange={(event) => {
                    const value = event.target.checked;

                    setAutoOpenSearch(value);
                    localStorage.setItem(
                      "rentix_auto_open_search",
                      JSON.stringify(value),
                    );
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-orange-500"
                />

                <span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-200">
                    Abrir busca automaticamente ao entrar na tela
                  </span>

                  <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Desmarque esta opção para não abrir a busca toda vez que
                    acessar Contas a Receber.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 pt-5 md:flex-row md:justify-end">
                <button
                  onClick={clearTenantFilter}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Ver todas as contas
                </button>

                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="rounded-xl bg-orange-50 dark:bg-orange-950/300 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30">
                    💰
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {editingChargeId ? "Editar cobrança" : "Nova cobrança"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      {editingChargeId
                        ? "Ajuste os dados da conta a receber selecionada."
                        : "Cadastre uma conta a receber avulsa, única ou parcelada."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeCreateModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
                  aria-label="Fechar cadastro"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-120px)] space-y-5 overflow-y-auto p-6">
              {!editingChargeId && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Tipo de lançamento
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChargeFormError("");
                        setFormLaunchType("single");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        formLaunchType === "single"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                      }`}
                    >
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                        Conta única
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Lançamento avulso com apenas um vencimento.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChargeFormError("");
                        setFormLaunchType("installment");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        formLaunchType === "installment"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                      }`}
                    >
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                        Sequência de parcelas
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Divide o valor total em parcelas editáveis.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Inquilino/Pessoa
                    </label>

                    <select
                      value={formTenant}
                      disabled={isEditingPaidCharge}
                      onChange={(event) => {
                        setChargeFormError("");
                        setFormTenant(event.target.value);
                      }}
                      className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                        isEditingPaidCharge
                          ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <option value="">Selecione o inquilino/pessoa</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isEditingPaidCharge && (
                    <button
                      type="button"
                      onClick={openTenantCreateModal}
                      className="h-12 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      NOVO
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {isEditingPaidCharge
                    ? "Cobrança paga não permite alteração de inquilino/pessoa."
                    : "Use o botão NOVO para abrir o cadastro completo de inquilino e selecionar automaticamente no lançamento."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Imóvel
                  <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    opcional
                  </span>
                </label>

                <select
                  value={formProperty}
                  disabled={isEditingPaidCharge}
                  onChange={(event) => {
                    setChargeFormError("");
                    setFormProperty(event.target.value);
                  }}
                  className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                    isEditingPaidCharge
                      ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <option value="">Sem imóvel vinculado</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Valor total
                  </label>

                  <input
                    placeholder="Ex: 1500,00"
                    value={formAmount}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormAmount(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Data de lançamento
                  </label>

                  <input
                    type="date"
                    value={formIssueDate}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormIssueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Primeiro vencimento
                  </label>

                  <input
                    type="date"
                    value={formDueDate}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormDueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
              </div>

              {isEditingPaidCharge && (
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30/40 p-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Data de pagamento
                  </label>

                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormPaymentDate(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 md:max-w-xs"
                  />

                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Para cobrança paga, somente a data de pagamento pode ser
                    ajustada antes de salvar.
                  </p>
                </div>
              )}

              {!editingChargeId && formLaunchType === "installment" && (
                <div className="space-y-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30/40 p-4">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                        Quantidade de parcelas
                      </label>

                      <input
                        type="number"
                        min={2}
                        value={formInstallmentQuantity}
                        onChange={(event) =>
                          setFormInstallmentQuantity(event.target.value)
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                      />
                    </div>

                    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-1 ring-emerald-100 dark:ring-emerald-900/50">
                      O sistema divide o valor total em parcelas iguais e gera
                      os vencimentos automaticamente de 30 em 30 dias. Você pode
                      ajustar valor e vencimento antes de salvar.
                    </div>
                  </div>

                  {installmentPreview.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-[90px_1fr_1fr] bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        <span>Parcela</span>
                        <span>Valor</span>
                        <span>Vencimento</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {installmentPreview.map((installment) => (
                          <div
                            key={installment.id}
                            className="grid grid-cols-[90px_1fr_1fr] gap-3 px-4 py-3"
                          >
                            <div className="flex items-center text-sm font-black text-slate-900 dark:text-slate-100">
                              {installment.installmentNumber}/
                              {installmentPreview.length}
                            </div>

                            <input
                              value={installment.amount}
                              onChange={(event) =>
                                updateInstallmentAmount(
                                  installment.id,
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                            />

                            <input
                              type="date"
                              value={installment.dueDate}
                              onChange={(event) =>
                                updateInstallmentDueDate(
                                  installment.id,
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {chargeFormError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-bold text-red-700">
                  {chargeFormError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 pt-5 md:flex-row md:items-center md:justify-between">
                {editingChargeId && (
                  <div className="flex flex-col-reverse gap-3 md:flex-row">
                    {!isEditingPaidCharge && (
                      <button
                        type="button"
                        onClick={openDeleteChargeConfirmation}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                      >
                        Excluir cobrança
                      </button>
                    )}

                    {isEditingPaidCharge && (
                      <button
                        type="button"
                        onClick={openPaymentReversalConfirmation}
                        className="rounded-xl bg-amber-50 dark:bg-amber-950/300 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
                      >
                        Voltar para pagamento
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row md:justify-end">
                  {!isEditingPaidCharge && (
                    <button
                      onClick={closeCreateModal}
                      className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    onClick={saveManualCharge}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    {editingChargeId ? "Salvar ajustes" : "Salvar cobrança"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {chargePendingPaymentReceipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30">
                    💵
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      Receber cobrança
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Informe os dados do pagamento para confirmar o
                      recebimento.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReceivePaymentModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
                  aria-label="Fechar recebimento"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Cobrança selecionada
                </p>

                <div className="mt-3 grid gap-3 text-sm text-slate-700 dark:text-slate-300 md:grid-cols-2">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {chargePendingPaymentReceipt.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingPaymentReceipt.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {formatDate(chargePendingPaymentReceipt.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Valor original:
                    </span>{" "}
                    {formatCurrency(chargePendingPaymentReceipt.amount)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Juros
                    <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      se houver
                    </span>
                  </label>

                  <input
                    placeholder="Ex: 25,00"
                    value={paymentInterest}
                    onChange={(event) => {
                      const value = event.target.value;

                      setPaymentFormError("");
                      setPaymentInterest(value);

                      if (chargePendingPaymentReceipt) {
                        updatePaymentFinalAmountFromAdjustments(
                          chargePendingPaymentReceipt,
                          value,
                          paymentDiscount,
                        );
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Desconto
                    <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      se houver
                    </span>
                  </label>

                  <input
                    placeholder="Ex: 50,00"
                    value={paymentDiscount}
                    onChange={(event) => {
                      const value = event.target.value;

                      setPaymentFormError("");
                      setPaymentDiscount(value);

                      if (chargePendingPaymentReceipt) {
                        updatePaymentFinalAmountFromAdjustments(
                          chargePendingPaymentReceipt,
                          paymentInterest,
                          value,
                        );
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Valor final
                  </label>

                  <input
                    placeholder="Ex: 250,00"
                    value={paymentFinalAmount}
                    onChange={(event) => {
                      const value = event.target.value;

                      setPaymentFormError("");
                      setPaymentFinalAmount(value);
                      updatePaymentEntriesFromFinalAmount(value);

                      if (chargePendingPaymentReceipt) {
                        updatePaymentAdjustmentsFromFinalAmount(
                          chargePendingPaymentReceipt,
                          value,
                        );
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-black text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Formas de pagamento
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Permite receber com um ou mais tipos, como Pix e cartão de
                      débito no mesmo recebimento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addPaymentEntry}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Adicionar forma
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {paymentEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 md:grid-cols-[1fr_180px_auto] md:items-end"
                    >
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                          Tipo do pagamento {index + 1}
                        </label>

                        <select
                          value={entry.method}
                          onChange={(event) =>
                            updatePaymentEntryMethod(
                              entry.id,
                              event.target.value as PaymentMethod,
                            )
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                        >
                          {paymentMethodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                          Valor
                        </label>

                        <input
                          placeholder="Ex: 100,00"
                          value={entry.amount}
                          onChange={(event) =>
                            updatePaymentEntryAmount(entry.id, event.target.value)
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-black text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removePaymentEntry(entry.id)}
                        disabled={paymentEntries.length === 1}
                        className="h-12 rounded-xl bg-red-50 dark:bg-red-950/30 px-4 text-sm font-bold text-red-600 ring-1 ring-red-100 dark:ring-red-900/50 transition hover:bg-red-100 dark:hover:bg-red-900/50 dark:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                  Total informado nas formas de pagamento: {formatCurrency(getPaymentEntriesTotal())}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Observação
                  <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    opcional
                  </span>
                </label>

                <input
                  placeholder="Ex: Pix + cartão de débito / comprovante enviado pelo WhatsApp"
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                />
              </div>

              {paymentFormError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-bold text-red-700">
                  {paymentFormError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closeReceivePaymentModal}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmReceivePayment}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30 transition hover:bg-emerald-700"
              >
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentConfirmationOpen && chargePendingPaymentReceipt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="flex-1 overflow-y-auto p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-3xl ring-1 ring-emerald-100 dark:ring-emerald-900/50">
                ✅
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Confirmar recebimento?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Confira os dados antes de concluir. Depois de confirmar, a
                cobrança será marcada como paga.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Cobrança selecionada
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Inquilino:</span>{" "}
                    {chargePendingPaymentReceipt.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingPaymentReceipt.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Vencimento:</span>{" "}
                    {formatDate(chargePendingPaymentReceipt.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor original:</span>{" "}
                    {formatCurrency(chargePendingPaymentReceipt.amount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Dados do recebimento
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Juros:</span>{" "}
                    {formatCurrency(normalizeAmount(paymentInterest))}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Desconto:</span>{" "}
                    {formatCurrency(normalizeAmount(paymentDiscount))}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor final:</span>{" "}
                    {formatCurrency(normalizeAmount(paymentFinalAmount))}
                  </p>

                  <div>
                    <p className="font-black text-slate-950 dark:text-white">Formas de pagamento:</p>
                    <div className="mt-2 space-y-1">
                      {paymentEntries.map((entry) => (
                        <p key={entry.id}>
                          {getPaymentMethodLabel(entry.method)} · {formatCurrency(normalizeAmount(entry.amount))}
                        </p>
                      ))}
                    </div>
                  </div>

                  {paymentNote.trim() && (
                    <p>
                      <span className="font-black text-slate-950 dark:text-white">Observação:</span>{" "}
                      {paymentNote.trim()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closePaymentConfirmation}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Conferir novamente
              </button>

              <button
                type="button"
                onClick={finishReceivePayment}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30 transition hover:bg-emerald-700"
              >
                Sim, confirmar
              </button>
            </div>
          </div>
        </div>
      )}


      {chargePendingDeletion && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 text-3xl ring-1 ring-red-100 dark:ring-red-900/50">
                ⚠️
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Excluir cobrança?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Esta ação removerá a cobrança selecionada do contas a receber.
                Depois de confirmar, ela não aparecerá mais na listagem.
              </p>

              <div className="mt-5 rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-red-600">
                  Cobrança selecionada
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {chargePendingDeletion.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingDeletion.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {formatDate(chargePendingDeletion.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor:</span>{" "}
                    {formatCurrency(chargePendingDeletion.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closeDeleteChargeConfirmation}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDeleteCharge}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 dark:shadow-red-950/30 transition hover:bg-red-700"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {chargePendingPaymentReversal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-3xl ring-1 ring-amber-100 dark:ring-amber-900/50">
                ↩️
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Voltar cobrança para pagamento?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Esta ação removerá o status de pago da cobrança selecionada.
                Depois de confirmar, ela voltará para pendente ou vencida,
                conforme a data de vencimento.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                  Cobrança selecionada
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {chargePendingPaymentReversal.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingPaymentReversal.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {formatDate(chargePendingPaymentReversal.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor:</span>{" "}
                    {formatCurrency(chargePendingPaymentReversal.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closePaymentReversalConfirmation}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmPaymentReversal}
                className="rounded-2xl bg-amber-50 dark:bg-amber-950/300 px-6 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/20 dark:shadow-amber-950/30 transition hover:bg-amber-600"
              >
                Sim, voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {isTenantCreateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:p-4">
          <div className="flex max-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 md:max-h-[94vh] md:rounded-3xl">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-5 md:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    Nova pessoa
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Preencha os dados pessoais e endereço da pessoa.
                  </p>
                </div>

                <button
                  onClick={closeTenantCreateModal}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-xl font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label="Fechar cadastro de pessoa"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 md:px-8">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Nome completo / Razão social
                  </label>

                  <input
                    value={tenantFormData.name}
                    onChange={(event) =>
                      updateTenantFormData("name", event.target.value)
                    }
                    placeholder={
                      tenantFormData.personType === "Company"
                        ? "Ex: Empresa LTDA"
                        : "Ex: João Silva"
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Tipo de pessoa
                  </label>

                  <select
                    value={tenantFormData.personType}
                    onChange={(event) =>
                      updateTenantPersonType(event.target.value as PersonType)
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  >
                    <option value="Individual">Pessoa física</option>
                    <option value="Company">Pessoa jurídica</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    {tenantFormData.personType === "Company" ? "CNPJ" : "CPF"}
                  </label>

                  <input
                    value={tenantFormData.cpf}
                    onChange={(event) =>
                      updateTenantFormData(
                        "cpf",
                        formatDocument(
                          event.target.value,
                          tenantFormData.personType,
                        ),
                      )
                    }
                    onBlur={() => {
                      if (tenantFormData.personType === "Company") {
                        searchCompanyByCnpj();
                      }
                    }}
                    placeholder={
                      tenantFormData.personType === "Company"
                        ? "Ex: 12.345.678/0001-90"
                        : "Ex: 123.456.789-00"
                    }
                    maxLength={tenantFormData.personType === "Company" ? 18 : 14}
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />

                  {tenantFormData.personType === "Company" && (
                    <button
                      type="button"
                      onClick={searchCompanyByCnpj}
                      disabled={isCnpjLoading}
                      className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCnpjLoading
                        ? "Buscando CNPJ..."
                        : "Buscar dados da empresa"}
                    </button>
                  )}

                  {cnpjSearchError && tenantFormData.personType === "Company" && (
                    <p className="mt-2 text-xs font-bold text-red-500">
                      {cnpjSearchError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Telefone
                  </label>

                  <input
                    value={tenantFormData.phone}
                    onChange={(event) =>
                      updateTenantFormData("phone", formatPhone(event.target.value))
                    }
                    placeholder="Ex: (69) 99999-0000"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30/50 px-5 py-4 transition hover:bg-orange-50 dark:hover:bg-orange-950/40 dark:bg-orange-950/30">
                <input
                  type="checkbox"
                  checked={tenantFormData.isTenant}
                  onChange={(event) =>
                    updateTenantFormData("isTenant", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 accent-orange-500"
                />

                <span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-200">
                    Esta pessoa é inquilino
                  </span>

                  <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Quando desmarcado, esta pessoa não poderá ser vinculada a
                    contratos de aluguel.
                  </span>
                </span>
              </label>

              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-orange-600">
                  Endereço
                </h3>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    CEP
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={tenantFormData.zipCode}
                      onChange={(event) =>
                        updateTenantFormData(
                          "zipCode",
                          formatZipCode(event.target.value),
                        )
                      }
                      onBlur={verifyZipCode}
                      placeholder="Ex: 76940-000"
                      className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                    />

                    <button
                      type="button"
                      onClick={verifyZipCode}
                      disabled={isZipCodeLoading}
                      className="h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/300 px-4 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:bg-orange-300"
                    >
                      {isZipCodeLoading ? "..." : "Buscar"}
                    </button>
                  </div>

                  {zipCodeError && (
                    <p className="mt-2 text-xs font-bold text-red-500">
                      {zipCodeError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Estado
                  </label>

                  <input
                    value={tenantFormData.state}
                    onChange={(event) =>
                      updateTenantFormData("state", event.target.value.toUpperCase())
                    }
                    placeholder="UF"
                    maxLength={2}
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Cidade
                  </label>

                  <input
                    value={tenantFormData.city}
                    onChange={(event) =>
                      updateTenantFormData("city", event.target.value)
                    }
                    placeholder="Cidade"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Logradouro
                  </label>

                  <input
                    value={tenantFormData.street}
                    onChange={(event) =>
                      updateTenantFormData("street", event.target.value)
                    }
                    placeholder="Rua, avenida..."
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Número
                  </label>

                  <input
                    value={tenantFormData.number}
                    onChange={(event) =>
                      updateTenantFormData("number", event.target.value)
                    }
                    placeholder="Número da casa"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Bairro
                  </label>

                  <input
                    value={tenantFormData.district}
                    onChange={(event) =>
                      updateTenantFormData("district", event.target.value)
                    }
                    placeholder="Bairro"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Complemento
                  </label>

                  <input
                    value={tenantFormData.complement}
                    onChange={(event) =>
                      updateTenantFormData("complement", event.target.value)
                    }
                    placeholder="Apartamento, bloco, referência..."
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-5 md:flex-row md:justify-end md:px-8">
              <button
                type="button"
                onClick={closeTenantCreateModal}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-4 text-sm font-black text-slate-600 dark:text-slate-400 dark:text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={createTenantFromModal}
                className="rounded-2xl bg-orange-50 dark:bg-orange-950/300 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 dark:shadow-orange-950/30 transition hover:bg-orange-600"
              >
                Cadastrar pessoa
              </button>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}

function isValidCnpj(value: string) {
  const cnpj = value.replace(/\D/g, "");

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

function Card({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{title}</p>

      <h2
        className={`mt-2 text-2xl font-black ${
          green ? "text-emerald-600" : red ? "text-red-600" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}
