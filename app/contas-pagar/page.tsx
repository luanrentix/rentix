"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { PersonCreateModal } from "@/components/people/person-create-modal";
import {
  createPayableAccount,
  deletePayableAccount,
  getPayableAccounts,
  payAccount,
  replacePaidAccountPayment,
  reversePaidAccount,
  updatePayableAccount,
  type PayableAccount,
  type PaymentMethod as ApiPaymentMethod,
} from "@/services/financial.service";
import { getPeople, type Person } from "@/services/people.service";
import {
  getProperties,
  type Property as ApiProperty,
} from "@/services/properties.service";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";
import { getCachedCompanySettings } from "@/services/settings-cache";
import { useExpenseCalculations } from "./hooks/useExpenseCalculations";
import { useExpenseFilters } from "./hooks/useExpenseFilters";
import { generateExpensePaymentReceipt } from "./printing";

type ThemeMode = "light" | "black" | "graphite";
type PersonType = "Individual" | "Company";

type ExpenseStatus = "Pending" | "Paid" | "Overdue";
type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";
type ReportDueFilter =
  | "All"
  | "Overdue"
  | "DueToday"
  | "Upcoming"
  | "DateRange";
type ExpenseLaunchType = "single" | "installment";

type ActionMenuPosition = {
  top: number;
  left: number;
};

type PaymentMethod =
  | "Cash"
  | "Pix"
  | "CreditCard"
  | "DebitCard"
  | "BankSlip"
  | "BankTransfer"
  | "Other";

type PaymentMethodOption = {
  value: PaymentMethod;
  label: string;
};

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

type ExpensePayment = {
  expenseId: string;
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: PaymentAllocation[];
  interest: number;
  discount: number;
  amountPaid: number;
  note?: string;
};

type InstallmentPreview = {
  id: string;
  installmentNumber: number;
  amount: string;
  dueDate: string;
};

const MAX_INSTALLMENT_QUANTITY = 120;

type Expense = {
  id: string;
  personId?: string;
  personName?: string;
  propertyId?: string;
  propertyName?: string;
  description: string;
  category?: string;
  note?: string;
  amount: number;
  date?: string;
  issueDate?: string;
  dueDate?: string;
  status?: ExpenseStatus;
  manual?: boolean;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
};

type Tenant = {
  id: string;
  name: string;
  document?: string;
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

type Property = {
  id: string;
  name: string;
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

const expenseCategoryOptions = [
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Fornecedor",
  "Manutenção",
  "Impostos",
  "Serviços",
  "Outros",
];

function createLocalId(prefix: string) {
  const randomId =
    globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(36).slice(2, 12);

  return `${prefix}-${randomId}`;
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

function formatAmountInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function getAmountInCents(value: unknown) {
  return Math.round(normalizeAmount(value) * 100);
}

function formatCentsAsAmountInput(valueInCents: number) {
  return formatAmountInput(valueInCents / 100);
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return formatAmountInput(Number(digits) / 100);
}

function distributeAmountInCents(totalInCents: number, quantity: number) {
  if (quantity <= 0) return [];

  const normalizedTotalInCents = Math.max(Math.round(totalInCents), 0);
  const baseAmountInCents = Math.floor(normalizedTotalInCents / quantity);
  let centsRemainder = normalizedTotalInCents - baseAmountInCents * quantity;

  return Array.from({ length: quantity }, () => {
    const extraCent = centsRemainder > 0 ? 1 : 0;

    if (centsRemainder > 0) {
      centsRemainder -= 1;
    }

    return baseAmountInCents + extraCent;
  });
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

export default function AccountsPayablePage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<ExpensePayment[]>([]);

  function getStartOfDay(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function getCompanySettingsForReceipt() {
    const defaultCompanySettings = {
      companyName: "Contrx",
      tradeName: "Contrx",
      document: "",
      phone: "",
      email: "",
      city: "",
    };

    try {
      const cachedCompanySettings = getCachedCompanySettings();

      if (!cachedCompanySettings) {
        return defaultCompanySettings;
      }

      const source =
        cachedCompanySettings.company &&
        typeof cachedCompanySettings.company === "object" &&
        !Array.isArray(cachedCompanySettings.company)
          ? (cachedCompanySettings.company as Record<string, unknown>)
          : (cachedCompanySettings as Record<string, unknown>);

      return {
        companyName: String(source.companyName || "Contrx"),
        tradeName: String(source.tradeName || source.companyName || "Contrx"),
        document: String(source.document || ""),
        phone: String(source.phone || ""),
        email: String(source.email || ""),
        city: String(source.city || ""),
      };
    } catch {
      return defaultCompanySettings;
    }
  }

  const {
    getExpensePayment,
    getExpensePayments,
    getExpensePaidAmount,
    getExpenseSettlementAmount,
    getExpenseRemainingAmount,
  } = useExpenseCalculations(paymentRecords);

  const {
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    expensesWithStatus,
    filteredExpenses,
    totalPayable,
    totalPaid,
    totalOverdue,
  } = useExpenseFilters({
    expenses,
    getExpensePayment,
    getExpenseSettlementAmount,
    getExpenseRemainingAmount,
    getExpensePaidAmount,
    getStartOfDay,
    initialStatusFilter: "All",
  });
  const [openActionMenuExpenseId, setOpenActionMenuExpenseId] = useState<
    string | null
  >(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTenantCreateOpen, setIsTenantCreateOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExpenseSaving, setIsExpenseSaving] = useState(false);
  const [processingConfirmation, setProcessingConfirmation] = useState<
    "payment" | "delete" | "reversal" | null
  >(null);

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expensePendingDeletion, setExpensePendingDeletion] =
    useState<Expense | null>(null);
  const [expensePendingPaymentReversal, setExpensePendingPaymentReversal] =
    useState<Expense | null>(null);
  const [expensePendingPaymentReceipt, setExpensePendingPaymentReceipt] =
    useState<Expense | null>(null);

  const [isPaymentConfirmationOpen, setIsPaymentConfirmationOpen] =
    useState(false);

  const [formTenant, setFormTenant] = useState("");
  const [formProperty, setFormProperty] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Outros");
  const [formAmount, setFormAmount] = useState("");
  const [formIssueDate, setFormIssueDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaymentDate, setFormPaymentDate] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formLaunchType, setFormLaunchType] =
    useState<ExpenseLaunchType>("single");
  const [formInstallmentQuantity, setFormInstallmentQuantity] = useState("2");
  const [installmentPreview, setInstallmentPreview] = useState<
    InstallmentPreview[]
  >([]);
  const [expenseFormError, setExpenseFormError] = useState("");

  const [paymentInterest, setPaymentInterest] = useState("");
  const [paymentDiscount, setPaymentDiscount] = useState("");
  const [paymentFinalAmount, setPaymentFinalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentFormError, setPaymentFormError] = useState("");

  const [reportCategory, setReportCategory] = useState("");
  const [reportStatusFilter, setReportStatusFilter] =
    useState<StatusFilter>("All");
  const [reportDueFilter, setReportDueFilter] =
    useState<ReportDueFilter>("All");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportFormError, setReportFormError] = useState("");

  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isBlackTheme, setIsBlackTheme] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    loadPayablesFromBackend(companyId);
  }, [companyId]);

  async function loadPayablesFromBackend(currentCompanyId: string) {
    try {
      const [apiExpenses, apiPeople, apiProperties] = await Promise.all([
        getPayableAccounts(currentCompanyId),
        getPeople(currentCompanyId),
        getProperties(currentCompanyId),
      ]);
      const nextExpenses = apiExpenses.map(mapApiPayableToExpense);
      const nextPaymentRecords = apiExpenses.flatMap(mapApiPayableToPayments);

      setExpenses(nextExpenses);
      setPaymentRecords(nextPaymentRecords);
      setTenants(apiPeople.map(mapApiPersonToTenant));
      setProperties(apiProperties.map(mapApiPropertyToProperty));

      const queryParams = new URLSearchParams(window.location.search);
      const searchTermFromQuery = queryParams.get("searchTerm");

      if (searchTermFromQuery) {
        setSearch(searchTermFromQuery);
      }
    } catch (error) {
      console.error("Não foi possível carregar contas a pagar.", error);
    }
  }

  useEffect(() => {
    function applyStoredTheme() {
      const storedThemeSettings = getCompanyStorageItem(
        companyId,
        "contrx_theme_settings",
        "contrx_theme_settings",
      );
      const legacyTheme = getCompanyStorageItem(
        companyId,
        "contrx_theme",
        "contrx_theme",
      );

      try {
        const parsedThemeSettings = storedThemeSettings
          ? (JSON.parse(storedThemeSettings) as { mode?: string })
          : null;

        const nextTheme =
          parsedThemeSettings?.mode === "graphite" ||
          legacyTheme === "graphite" ||
          legacyTheme === "grafite"
            ? "graphite"
            : parsedThemeSettings?.mode === "black" ||
                parsedThemeSettings?.mode === "dark" ||
                legacyTheme === "black" ||
                legacyTheme === "dark"
              ? "black"
              : "light";
        const isDarkTheme = nextTheme !== "light";

        document.documentElement.classList.toggle("dark", isDarkTheme);
        document.body.classList.toggle("dark", isDarkTheme);
        setThemeMode(nextTheme);
        setIsBlackTheme(isDarkTheme);
      } catch {
        const nextTheme =
          legacyTheme === "graphite" || legacyTheme === "grafite"
            ? "graphite"
            : legacyTheme === "black" || legacyTheme === "dark"
              ? "black"
              : "light";
        const isDarkTheme = nextTheme !== "light";

        document.documentElement.classList.toggle("dark", isDarkTheme);
        document.body.classList.toggle("dark", isDarkTheme);
        setThemeMode(nextTheme);
        setIsBlackTheme(isDarkTheme);
      }
    }

    applyStoredTheme();

    window.addEventListener("storage", applyStoredTheme);
    window.addEventListener("contrx-theme-change", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
      window.removeEventListener("contrx-theme-change", applyStoredTheme);
    };
  }, [companyId]);


  useEffect(() => {
    const savedStatusFilter = getCompanyStorageItem(
      companyId,
      "contrx_payable_status_filter",
      "contrx_payable_status_filter",
    );

    if (false) {
      const parsedExpenses = [] as Expense[];

      setExpenses(
        parsedExpenses.map((expense) => ({
          ...expense,
          personName: expense.personName || "Pessoa não informada",
          category: expense.category || "Outros",
          note: expense.note || "",
          issueDate:
            expense.issueDate || expense.date || new Date().toISOString(),
          dueDate: expense.dueDate || expense.date || new Date().toISOString(),
          status: expense.status || "Pending",
          manual: expense.manual ?? true,
        })),
      );
    }

    if (false) {
      setTenants([]);
    }

    if (false) {
      setPaymentRecords([]);
    }

    if (
      savedStatusFilter === "All" ||
      savedStatusFilter === "Pending" ||
      savedStatusFilter === "Paid" ||
      savedStatusFilter === "Overdue"
    ) {
      setStatusFilter(savedStatusFilter);
    }
  }, [companyId]);

  useEffect(() => {
    setCompanyStorageItem(companyId, "contrx_payable_status_filter", statusFilter);
  }, [companyId, statusFilter]);

  const openActionMenuExpense = useMemo(() => {
    return openActionMenuExpenseId
      ? expensesWithStatus.find(
          (expense) => String(expense.id) === String(openActionMenuExpenseId),
        ) || null
      : null;
  }, [expensesWithStatus, openActionMenuExpenseId]);



  function getFloatingActionMenuPosition(
    buttonRect: DOMRect,
    estimatedMenuHeight: number,
  ) {
    const menuWidth = 208;
    const viewportPadding = 16;
    const availableBottomSpace = window.innerHeight - buttonRect.bottom;
    const top =
      availableBottomSpace < estimatedMenuHeight + 20
        ? Math.max(viewportPadding, buttonRect.top - estimatedMenuHeight - 8)
        : buttonRect.bottom + 8;
    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    return { top, left };
  }

  function handleToggleExpenseActions(
    expense: Expense,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (openActionMenuExpenseId === expense.id) {
      handleCloseExpenseActions();
      return;
    }

    const hasPayment = Boolean(getExpensePayment(expense.id));
    const visibleActionCount =
      1 + (expense.status !== "Paid" ? 1 : 0) + (hasPayment ? 2 : 0);
    const estimatedMenuHeight = visibleActionCount * 50 + 20;

    setActionMenuPosition(
      getFloatingActionMenuPosition(
        event.currentTarget.getBoundingClientRect(),
        estimatedMenuHeight,
      ),
    );
    setOpenActionMenuExpenseId(expense.id);
  }

  function handleCloseExpenseActions() {
    setOpenActionMenuExpenseId(null);
    setActionMenuPosition(null);
  }

  useEffect(() => {
    if (!openActionMenuExpenseId) return;

    function closeFloatingActionMenu() {
      handleCloseExpenseActions();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        closeFloatingActionMenu();
        return;
      }

      if (
        target.closest("[data-payable-action-menu]") ||
        target.closest("[data-payable-action-trigger]")
      ) {
        return;
      }

      closeFloatingActionMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeFloatingActionMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeFloatingActionMenu);
    window.addEventListener("scroll", closeFloatingActionMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeFloatingActionMenu);
      window.removeEventListener("scroll", closeFloatingActionMenu, true);
    };
  }, [openActionMenuExpenseId]);



  const isEditingPaidExpense = editingExpenseId
    ? Boolean(getExpensePayment(editingExpenseId))
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

  function getDateInputValue(dateValue?: string) {
    if (!dateValue) return "";

    return getLocalDateValue(new Date(dateValue));
  }



  function getEndOfDay(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);

    return normalizedDate;
  }

  function openTenantCreateModal() {
    setIsTenantCreateOpen(true);
  }

  function closeTenantCreateModal() {
    setIsTenantCreateOpen(false);
  }

  function handleTenantCreated(apiPerson: Person) {
    const newTenant = mapApiPersonToTenant(apiPerson);

    setTenants((currentTenants) => {
      const tenantAlreadyExists = currentTenants.some(
        (tenant) => String(tenant.id) === String(newTenant.id),
      );

      return tenantAlreadyExists ? currentTenants : [...currentTenants, newTenant];
    });
    setFormTenant(newTenant.id);
    setExpenseFormError("");
  }

  function getStatusLabel(status?: ExpenseStatus) {
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Pendente";
  }

  function getStatusClassName(status?: ExpenseStatus) {
    if (status === "Paid") {
      return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 ring-1 ring-emerald-200";
    }

    if (status === "Overdue") {
      return "bg-red-50 dark:bg-red-950/30 text-red-700 ring-1 ring-red-200 dark:ring-red-900/60";
    }

    return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 ring-1 ring-amber-200 dark:ring-amber-900/60";
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

  function getPaymentMethodLabel(method: PaymentMethod) {
    return (
      paymentMethodOptions.find((option) => option.value === method)?.label ||
      "Outros"
    );
  }

  function calculatePaymentAmount(
    expense: Expense,
    interest: number,
    discount: number,
  ) {
    return Math.max(expense.amount + interest - discount, 0);
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

  function updatePaymentFinalAmountFromAdjustments(
    expense: Expense,
    interestValue: string,
    discountValue: string,
  ) {
    const interest = normalizeAmount(interestValue);
    const discount = normalizeAmount(discountValue);
    const finalAmount = calculatePaymentAmount(expense, interest, discount);
    const formattedFinalAmount = formatAmountInput(finalAmount);

    setPaymentFinalAmount(formattedFinalAmount);
    updatePaymentEntriesFromFinalAmount(formattedFinalAmount);
  }

  function updatePaymentAdjustmentsFromFinalAmount(
    expense: Expense,
    finalAmountValue: string,
  ) {
    const finalAmount = normalizeAmount(finalAmountValue);
    const difference = finalAmount - expense.amount;

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

  function getPaymentEntriesTotal() {
    return paymentEntries.reduce(
      (total, entry) => total + normalizeAmount(entry.amount),
      0,
    );
  }

  function getPaymentEntriesDifference() {
    return getPaymentEntriesTotal() - normalizeAmount(paymentFinalAmount);
  }

  function getPaymentEntriesBalanceLabel() {
    const difference = getPaymentEntriesDifference();

    if (difference > 0.01) {
      return `Excedente: ${formatCurrency(difference)}`;
    }

    if (difference < -0.01) {
      return `Falta informar: ${formatCurrency(Math.abs(difference))}`;
    }

    return "Valores conferidos";
  }

  function getPaymentEntriesBalanceClassName() {
    const difference = getPaymentEntriesDifference();

    if (difference > 0.01) {
      return isBlackTheme
        ? "border-sky-900/60 bg-sky-950/30 text-sky-300"
        : "border-sky-200 bg-sky-50 text-sky-700";
    }

    if (difference < -0.01) {
      return isBlackTheme
        ? "border-amber-900/60 bg-amber-950/30 text-amber-300"
        : "border-amber-200 bg-amber-50 text-amber-700";
    }

    return isBlackTheme
      ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  function addPaymentEntry() {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) => [
      ...currentEntries,
      {
        id: createLocalId("payment-entry"),
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

  function dispatchAccountsPayableIntegrationEvents() {
    window.dispatchEvent(new Event("contrx-payables-updated"));
    window.dispatchEvent(new Event("contrx-accounts-payable-updated"));
    window.dispatchEvent(new Event("contrx-financial-updated"));
  }

  function saveExpenses(updatedExpenses: Expense[]) {
    setExpenses(updatedExpenses);
    dispatchAccountsPayableIntegrationEvents();
  }

  function savePaymentRecords(updatedPaymentRecords: ExpensePayment[]) {
    setPaymentRecords(updatedPaymentRecords);
    dispatchAccountsPayableIntegrationEvents();
  }

  function openCreateModal() {
    const today = new Date();
    const dueDate = new Date();

    dueDate.setDate(today.getDate() + 30);

    setEditingExpenseId(null);
    setFormTenant("");
    setFormProperty("");
    setFormDescription("");
    setFormCategory("Outros");
    setFormAmount("");
    setFormIssueDate(getLocalDateValue(today));
    setFormDueDate(getLocalDateValue(dueDate));
    setFormPaymentDate("");
    setFormNote("");
    setFormLaunchType("single");
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setExpenseFormError("");
    setIsExpenseSaving(false);
    setIsCreateOpen(true);
  }

  function openEditExpense(expense: Expense) {
    const paymentRecord = getExpensePayment(expense.id);

    setEditingExpenseId(expense.id);
    setFormTenant(expense.personId || "");
    setFormProperty(expense.propertyId || "");
    setFormDescription(expense.description);
    setFormCategory(expense.category || "Outros");
    setFormAmount(formatAmountInput(expense.amount));
    setFormIssueDate(
      getDateInputValue(expense.issueDate || expense.date) ||
        getLocalDateValue(new Date()),
    );
    setFormDueDate(
      getDateInputValue(expense.dueDate || expense.date) ||
        getLocalDateValue(new Date()),
    );
    setFormPaymentDate(
      paymentRecord?.paidAt
        ? getDateInputValue(paymentRecord.paidAt)
        : getLocalDateValue(new Date()),
    );
    setFormNote(expense.note || "");
    setFormLaunchType("single");
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setExpenseFormError("");
    setIsExpenseSaving(false);
    setIsCreateOpen(true);
  }

  function resetCreateForm() {
    setEditingExpenseId(null);
    setFormTenant("");
    setFormProperty("");
    setFormDescription("");
    setFormCategory("Outros");
    setFormAmount("");
    setFormIssueDate("");
    setFormDueDate("");
    setFormPaymentDate("");
    setFormNote("");
    setFormLaunchType("single");
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setExpenseFormError("");
    setIsTenantCreateOpen(false);
  }

  function closeCreateModal() {
    resetCreateForm();
    setIsExpenseSaving(false);
    setIsCreateOpen(false);
  }

  async function saveExpenseWithSavingState() {
    if (isExpenseSaving) return;

    setIsExpenseSaving(true);

    try {
      await saveExpense();
    } finally {
      setIsExpenseSaving(false);
    }
  }

  const generateInstallmentPreview = useCallback(() => {
    const totalAmountInCents = getAmountInCents(formAmount);
    const quantity = Number(formInstallmentQuantity);

    if (!formDueDate || totalAmountInCents <= 0 || !Number.isFinite(quantity)) {
      setInstallmentPreview([]);
      return;
    }

    const normalizedQuantity = Math.min(
      MAX_INSTALLMENT_QUANTITY,
      Math.max(2, Math.trunc(quantity)),
    );
    const installmentAmountsInCents = distributeAmountInCents(
      totalAmountInCents,
      normalizedQuantity,
    );

    const generatedInstallments = Array.from(
      { length: normalizedQuantity },
      (_, index) => ({
        id: `preview-${index + 1}`,
        installmentNumber: index + 1,
        amount: formatCentsAsAmountInput(installmentAmountsInCents[index] || 0),
        dueDate: addDaysToDate(formDueDate, index * 30),
      }),
    );

    setInstallmentPreview(generatedInstallments);
  }, [formAmount, formDueDate, formInstallmentQuantity]);

  useEffect(() => {
    if (formLaunchType !== "installment") {
      setInstallmentPreview([]);
      return;
    }

    generateInstallmentPreview();
  }, [formLaunchType, generateInstallmentPreview]);

  function updateInstallmentAmount(id: string, amount: string) {
    setExpenseFormError("");

    setInstallmentPreview((currentInstallments) => {
      const totalAmountInCents = getAmountInCents(formAmount);
      const changedInstallment = currentInstallments.find(
        (installment) => installment.id === id,
      );

      if (!changedInstallment || totalAmountInCents <= 0) {
        return currentInstallments.map((installment) =>
          installment.id === id ? { ...installment, amount } : installment,
        );
      }

      const changedAmountInCents = getAmountInCents(amount);
      const otherInstallments = currentInstallments.filter(
        (installment) => installment.id !== id,
      );
      const remainingAmountInCents = totalAmountInCents - changedAmountInCents;

      if (remainingAmountInCents < 0) {
        setExpenseFormError(
          "O valor informado ultrapassa o valor total da conta.",
        );

        return currentInstallments.map((installment) =>
          installment.id === id ? { ...installment, amount } : installment,
        );
      }

      if (otherInstallments.length === 0) {
        return currentInstallments.map((installment) =>
          installment.id === id ? { ...installment, amount } : installment,
        );
      }

      const redistributedAmountsInCents = distributeAmountInCents(
        remainingAmountInCents,
        otherInstallments.length,
      );
      let redistributedIndex = 0;

      return currentInstallments.map((installment) => {
        if (installment.id === id) {
          return {
            ...installment,
            amount,
          };
        }

        const redistributedAmountInCents =
          redistributedAmountsInCents[redistributedIndex] || 0;
        redistributedIndex += 1;

        return {
          ...installment,
          amount: formatCentsAsAmountInput(redistributedAmountInCents),
        };
      });
    });
  }

  function updateInstallmentDueDate(id: string, dueDate: string) {
    setInstallmentPreview((currentInstallments) =>
      currentInstallments.map((installment) =>
        installment.id === id ? { ...installment, dueDate } : installment,
      ),
    );
  }

  async function saveExpense() {
    setExpenseFormError("");

    const normalizedAmount = normalizeAmount(formAmount);
    const trimmedDescription = formDescription.trim();
    const trimmedCategory = formCategory.trim() || "Outros";
    const selectedTenant = tenants.find(
      (tenant) => String(tenant.id) === String(formTenant),
    );
    const selectedProperty = properties.find(
      (property) => String(property.id) === String(formProperty),
    );

    if (isEditingPaidExpense) {
      if (!editingExpenseId) return;

      if (!formPaymentDate) {
        setExpenseFormError(
          "Informe a data de pagamento para salvar os ajustes.",
        );
        return;
      }

      const currentPaymentRecord = getExpensePayment(editingExpenseId);
      const currentExpense = expensesWithStatus.find(
        (expense) => String(expense.id) === String(editingExpenseId),
      );

      const updatedPaymentRecord: ExpensePayment = {
        expenseId: editingExpenseId,
        paidAt: new Date(`${formPaymentDate}T00:00:00`).toISOString(),
        method: (currentPaymentRecord?.method || "Cash") as PaymentMethod,
        paymentItems: currentPaymentRecord?.paymentItems,
        interest: currentPaymentRecord?.interest || 0,
        discount: currentPaymentRecord?.discount || 0,
        amountPaid:
          currentPaymentRecord?.amountPaid || currentExpense?.amount || 0,
        note: currentPaymentRecord?.note || "",
      };

      const nextPaymentRecords = [
        ...paymentRecords.filter(
          (paymentRecord) =>
            String(paymentRecord.expenseId) !== String(editingExpenseId),
        ),
        updatedPaymentRecord,
      ];

      if (companyId) {
        try {
          await replacePaidAccountPayment(editingExpenseId, {
            paidAt: updatedPaymentRecord.paidAt,
            method: mapUiPaymentMethodToApi(updatedPaymentRecord.method),
            paymentItems: updatedPaymentRecord.paymentItems
              ? mapUiPaymentItemsToApi(updatedPaymentRecord.paymentItems)
              : undefined,
            interest: updatedPaymentRecord.interest,
            discount: updatedPaymentRecord.discount,
            amountPaid: updatedPaymentRecord.amountPaid,
            note: updatedPaymentRecord.note,
          });
        } catch (error) {
          setExpenseFormError(
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar o pagamento no backend.",
          );
          return;
        }
      }

      savePaymentRecords(nextPaymentRecords);

      closeCreateModal();
      return;
    }

    if (!formTenant || !selectedTenant) {
      setExpenseFormError("Selecione uma pessoa para salvar a conta a pagar.");
      return;
    }

    if (!trimmedDescription) {
      setExpenseFormError("Informe a descrição da conta a pagar.");
      return;
    }

    if (normalizedAmount <= 0) {
      setExpenseFormError("Informe um valor válido para salvar a conta.");
      return;
    }

    if (!formIssueDate) {
      setExpenseFormError("Informe a data de lançamento.");
      return;
    }

    if (!formDueDate) {
      setExpenseFormError("Informe a data de vencimento.");
      return;
    }

    const issueDate = new Date(`${formIssueDate}T00:00:00`).toISOString();

    if (formLaunchType === "single") {
      const savedExpense: Expense = {
        id: editingExpenseId || createLocalId("expense"),
        personId: selectedTenant.id,
        personName: selectedTenant.name,
        propertyId: selectedProperty?.id,
        propertyName: selectedProperty?.name,
        description: trimmedDescription,
        category: trimmedCategory,
        note: formNote.trim(),
        dueDate: new Date(`${formDueDate}T00:00:00`).toISOString(),
        issueDate,
        date: issueDate,
        amount: normalizedAmount,
        status: "Pending",
        manual: true,
      };

      const alreadyExists = expenses.some(
        (expense) => String(expense.id) === String(savedExpense.id),
      );

      if (companyId) {
        try {
          const apiExpense = alreadyExists
            ? await updatePayableAccount(savedExpense.id, {
                personId: selectedTenant.id,
                propertyId: selectedProperty?.id || null,
                personName: selectedTenant.name,
                description: trimmedDescription,
                category: trimmedCategory,
                note: formNote.trim(),
                dueDate: savedExpense.dueDate || issueDate,
                issueDate,
                amount: normalizedAmount,
                manual: true,
              })
            : await createPayableAccount({
                personId: selectedTenant.id,
                propertyId: selectedProperty?.id || null,
                personName: selectedTenant.name,
                description: trimmedDescription,
                category: trimmedCategory,
                note: formNote.trim(),
                dueDate: savedExpense.dueDate || issueDate,
                issueDate,
                amount: normalizedAmount,
                manual: true,
              });

          savedExpense.id = apiExpense.id;
        } catch (error) {
          setExpenseFormError(
            error instanceof Error
              ? error.message
              : "Não foi possível salvar a conta a pagar no backend.",
          );
          return;
        }
      }

      const updatedExpenses = alreadyExists
        ? expenses.map((expense) =>
            String(expense.id) === String(savedExpense.id)
              ? savedExpense
              : expense,
          )
        : [...expenses, savedExpense];

      saveExpenses(updatedExpenses);
      closeCreateModal();
      return;
    }

    if (installmentPreview.length === 0) {
      setExpenseFormError("Gere ao menos uma parcela válida para salvar.");
      return;
    }

    const hasInvalidInstallment = installmentPreview.some(
      (installment) =>
        normalizeAmount(installment.amount) <= 0 || !installment.dueDate,
    );

    if (hasInvalidInstallment) {
      setExpenseFormError("Revise os valores e vencimentos das parcelas.");
      return;
    }

    const installmentTotalInCents = installmentPreview.reduce(
      (total, installment) => total + getAmountInCents(installment.amount),
      0,
    );
    const expenseTotalInCents = getAmountInCents(formAmount);

    if (installmentTotalInCents !== expenseTotalInCents) {
      setExpenseFormError(
        `A soma das parcelas precisa fechar exatamente o valor total da conta. Diferença: ${formatCurrency(
          Math.abs(installmentTotalInCents - expenseTotalInCents) / 100,
        )}.`,
      );
      return;
    }

    const installmentGroupId = createLocalId("expense-installment");

    const newExpenses: Expense[] = installmentPreview.map((installment) => ({
      id: `${installmentGroupId}-${installment.installmentNumber}`,
      personId: selectedTenant.id,
      personName: selectedTenant.name,
      propertyId: selectedProperty?.id,
      propertyName: selectedProperty?.name,
      description: trimmedDescription,
      category: trimmedCategory,
      note: formNote.trim(),
      dueDate: new Date(`${installment.dueDate}T00:00:00`).toISOString(),
      issueDate,
      date: issueDate,
      amount: normalizeAmount(installment.amount),
      status: "Pending",
      manual: true,
      installmentNumber: installment.installmentNumber,
      installmentTotal: installmentPreview.length,
      installmentGroupId,
    }));

    if (companyId) {
      try {
        const apiExpenses = await Promise.all(
          newExpenses.map((expense) =>
            createPayableAccount({
              personId: selectedTenant.id,
              propertyId: selectedProperty?.id || null,
              personName: selectedTenant.name,
              description: expense.description,
              category: expense.category,
              note: expense.note,
              dueDate: expense.dueDate || issueDate,
              issueDate,
              amount: expense.amount,
              manual: true,
              installmentNumber: expense.installmentNumber,
              installmentTotal: expense.installmentTotal,
              installmentGroupId: expense.installmentGroupId,
            }),
          ),
        );

        apiExpenses.forEach((apiExpense, index) => {
          newExpenses[index].id = apiExpense.id;
        });
      } catch (error) {
        setExpenseFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as parcelas no backend.",
        );
        return;
      }
    }

    saveExpenses([...expenses, ...newExpenses]);
    closeCreateModal();
  }

  function openPayExpenseModal(expense: Expense) {
    const today = new Date();
    const remainingAmount = getExpenseRemainingAmount(expense);

    setExpensePendingPaymentReceipt(expense);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentFinalAmount(formatAmountInput(remainingAmount));
    setFormPaymentDate(getLocalDateValue(today));
    setPaymentMethod("Cash");
    setPaymentEntries([
      {
        id: createLocalId("payment-entry"),
        method: "Cash",
        amount: formatAmountInput(remainingAmount),
      },
    ]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function closePayExpenseModal() {
    if (processingConfirmation) return;

    setExpensePendingPaymentReceipt(null);
    setIsPaymentConfirmationOpen(false);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentFinalAmount("");
    setFormPaymentDate("");
    setPaymentMethod("Cash");
    setPaymentEntries([]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function confirmPayExpense() {
    if (!expensePendingPaymentReceipt) return;

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);
    const paymentEntriesTotal = getPaymentEntriesTotal();
    const remainingAmount = getExpenseRemainingAmount(expensePendingPaymentReceipt);
    const maximumPaymentAmount = Math.max(remainingAmount + interest - discount, 0);

    if (interest < 0 || discount < 0) {
      setPaymentFormError("Informe juros e desconto com valores válidos.");
      return;
    }

    if (amountPaid <= 0) {
      setPaymentFormError("O valor final pago precisa ser maior que zero.");
      return;
    }

    if (amountPaid - maximumPaymentAmount > 0.01) {
      setPaymentFormError(
        `O valor pago não pode ser maior que ${formatCurrency(maximumPaymentAmount)} considerando juros e desconto.`,
      );
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
      setPaymentFormError("Informe valores válidos nas formas de pagamento.");
      return;
    }

    if (Math.abs(paymentEntriesTotal - amountPaid) > 0.01) {
      const difference = Math.abs(amountPaid - paymentEntriesTotal);

      setPaymentFormError(
        paymentEntriesTotal < amountPaid
          ? `Falta informar ${formatCurrency(difference)} nas formas de pagamento.`
          : `As formas de pagamento excedem o valor pago em ${formatCurrency(difference)}.`,
      );
      return;
    }

    setPaymentFormError("");
    setIsPaymentConfirmationOpen(true);
  }

  async function finishPayExpense() {
    if (!expensePendingPaymentReceipt || processingConfirmation) return;

    setProcessingConfirmation("payment");

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);

    const paymentRecord: ExpensePayment = {
      expenseId: expensePendingPaymentReceipt.id,
      paidAt: formPaymentDate
        ? new Date(`${formPaymentDate}T00:00:00`).toISOString()
        : new Date().toISOString(),
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

    let updatedPaymentRecords = [
      ...paymentRecords.filter(
        (currentPaymentRecord) =>
          String(currentPaymentRecord.expenseId) !==
          String(expensePendingPaymentReceipt.id),
      ),
      paymentRecord,
    ];

    if (companyId) {
      try {
        const paidAccount = await payAccount(expensePendingPaymentReceipt.id, {
          paidAt: paymentRecord.paidAt,
          method: mapUiPaymentMethodToApi(paymentRecord.method),
          paymentItems: mapUiPaymentItemsToApi(paymentRecord.paymentItems || []),
          interest,
          discount,
          amountPaid,
          note: paymentRecord.note,
        });

        const paidExpense = mapApiPayableToExpense(paidAccount);
        updatedPaymentRecords = [
          ...paymentRecords.filter(
            (currentPaymentRecord) =>
              String(currentPaymentRecord.expenseId) !== String(paidExpense.id),
          ),
          ...mapApiPayableToPayments(paidAccount),
        ];
        saveExpenses(
          expenses.map((expense) =>
            String(expense.id) === String(paidExpense.id) ? paidExpense : expense,
          ),
        );
      } catch (error) {
        setPaymentFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o pagamento no backend.",
        );
        setProcessingConfirmation(null);
        return;
      }
    }

    savePaymentRecords(updatedPaymentRecords);
    closePayExpenseModal();
    setProcessingConfirmation(null);

    const targetExpense = expenses.find(e => String(e.id) === String(expensePendingPaymentReceipt.id)) || expensePendingPaymentReceipt;
    const finalPaymentRecord = updatedPaymentRecords.find(pr => String(pr.expenseId) === String(targetExpense.id)) || paymentRecord;
    
    generateExpensePaymentReceipt({
      expense: targetExpense,
      paymentRecord: finalPaymentRecord,
      companySettings: getCompanySettingsForReceipt(),
      getPaymentMethodLabel,
      setPaymentFormError,
    });
  }

  function openDeleteExpenseConfirmation() {
    if (!editingExpenseId) return;

    const expense = expenses.find(
      (item) => String(item.id) === String(editingExpenseId),
    );

    if (!expense) {
      setExpenseFormError("Conta a pagar não encontrada para exclusão.");
      return;
    }

    setExpensePendingDeletion(expense);
  }

  function closeDeleteExpenseConfirmation() {
    if (processingConfirmation) return;

    setExpensePendingDeletion(null);
  }

  async function confirmDeleteExpense() {
    if (!expensePendingDeletion || processingConfirmation) return;

    setProcessingConfirmation("delete");

    if (companyId) {
      try {
        await deletePayableAccount(expensePendingDeletion.id);
      } catch (error) {
        setExpenseFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a conta a pagar no backend.",
        );
        setExpensePendingDeletion(null);
        setProcessingConfirmation(null);
        return;
      }
    }

    const updatedExpenses = expenses.filter(
      (expense) => String(expense.id) !== String(expensePendingDeletion.id),
    );
    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.expenseId) !== String(expensePendingDeletion.id),
    );

    saveExpenses(updatedExpenses);
    savePaymentRecords(updatedPaymentRecords);

    setExpensePendingDeletion(null);
    closeCreateModal();
    setProcessingConfirmation(null);
  }

  function openPaymentReversalConfirmation(selectedExpense?: Expense) {
    if (!selectedExpense && !editingExpenseId) return;

    const expense =
      selectedExpense ||
      expensesWithStatus.find(
        (item) => String(item.id) === String(editingExpenseId),
      );

    if (!expense || !getExpensePayment(expense.id)) {
      setExpenseFormError("Esta conta não está marcada como paga.");
      return;
    }

    setExpensePendingPaymentReversal(expense);
  }

  function closePaymentReversalConfirmation() {
    if (processingConfirmation) return;

    setExpensePendingPaymentReversal(null);
  }

  async function confirmPaymentReversal() {
    if (!expensePendingPaymentReversal || processingConfirmation) return;

    setProcessingConfirmation("reversal");

    if (companyId) {
      try {
        await reversePaidAccount(expensePendingPaymentReversal.id);
      } catch (error) {
        setExpenseFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível estornar o pagamento no backend.",
        );
        setExpensePendingPaymentReversal(null);
        setProcessingConfirmation(null);
        return;
      }
    }

    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.expenseId) !==
        String(expensePendingPaymentReversal.id),
    );

    savePaymentRecords(updatedPaymentRecords);
    setExpensePendingPaymentReversal(null);
    closeCreateModal();
    setProcessingConfirmation(null);
  }

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("All");
  }

  function openReportModal() {
    setReportCategory("");
    setReportStatusFilter(statusFilter);
    setReportDueFilter("All");
    setReportStartDate("");
    setReportEndDate("");
    setReportFormError("");
    setIsReportOpen(true);
  }

  function reprintExpensePaymentReceipt(expense: Expense) {
    const paymentRecord = getExpensePayment(expense.id);

    if (!paymentRecord) {
      setPaymentFormError(
        "Não existe recibo salvo para esta despesa. Confirme o pagamento antes de reimprimir.",
      );
      return;
    }

    generateExpensePaymentReceipt({
      expense,
      paymentRecord,
      companySettings: getCompanySettingsForReceipt(),
      getPaymentMethodLabel,
      setPaymentFormError,
    });
  }

  function closeReportModal() {
    setIsReportOpen(false);
    setReportFormError("");
  }

  function getReportFilteredExpenses() {
    const today = getStartOfDay(new Date());
    const startDate = reportStartDate
      ? getStartOfDay(new Date(`${reportStartDate}T00:00:00`))
      : null;
    const endDate = reportEndDate
      ? getEndOfDay(new Date(`${reportEndDate}T00:00:00`))
      : null;

    return expensesWithStatus.filter((expense) => {
      const dueDate = getStartOfDay(
        new Date(expense.dueDate || expense.date || new Date().toISOString()),
      );

      if (reportCategory && expense.category !== reportCategory) {
        return false;
      }

      if (
        reportStatusFilter !== "All" &&
        expense.status !== reportStatusFilter
      ) {
        return false;
      }

      if (reportDueFilter === "Overdue" && expense.status !== "Overdue") {
        return false;
      }

      if (
        reportDueFilter === "DueToday" &&
        dueDate.getTime() !== today.getTime()
      ) {
        return false;
      }

      if (
        reportDueFilter === "Upcoming" &&
        (dueDate < today || expense.status === "Paid")
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

  function getReportTotalAmount(reportExpenses: Expense[]) {
    return reportExpenses.reduce(
      (total, expense) =>
        total +
        (expense.status === "Paid"
          ? getExpensePaidAmount(expense)
          : getExpenseRemainingAmount(expense)),
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

  function getAccountsPayableReportHeader(templateData: Record<string, string>) {
    const defaultTemplate = `RELATÓRIO DE CONTAS A PAGAR

EMPRESA: {companyName}
CATEGORIA: {reportCategory}
STATUS: {reportStatus}
VENCIMENTO: {reportDueFilter}
PERÍODO: {reportStartDate} até {reportEndDate}

RESUMO:
Quantidade: {reportCount}
Total geral: {reportTotal}
Total pago: {reportPaidTotal}
Total pendente: {reportPendingTotal}
Total vencido: {reportOverdueTotal}

GERADO EM: {currentDate}`;
    const configuredTemplate: unknown = null;
    const templateContent =
      configuredTemplate &&
      typeof configuredTemplate === "object" &&
      !Array.isArray(configuredTemplate) &&
      typeof (configuredTemplate as { content?: unknown }).content === "string"
        ? (configuredTemplate as { content: string }).content
        : defaultTemplate;

    return Object.entries(templateData).reduce((content, [key, value]) => {
      return content.replace(new RegExp(`{${key}}`, "g"), value);
    }, templateContent);
  }

  function openAccountsPayableReport(shouldPrint: boolean) {
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

    const reportExpenses = getReportFilteredExpenses();

    if (reportExpenses.length === 0) {
      setReportFormError(
        "Nenhuma conta encontrada para os filtros informados.",
      );
      return;
    }

    const pendingTotal = reportExpenses
      .filter((expense) => expense.status === "Pending")
      .reduce((total, expense) => total + getExpenseRemainingAmount(expense), 0);
    const paidTotal = reportExpenses
      .filter((expense) => expense.status === "Paid")
      .reduce((total, expense) => total + getExpensePaidAmount(expense), 0);
    const overdueTotal = reportExpenses
      .filter((expense) => expense.status === "Overdue")
      .reduce((total, expense) => total + getExpenseRemainingAmount(expense), 0);
    const grandTotal = getReportTotalAmount(reportExpenses);

    const filterSummary = [
      `Categoria: ${reportCategory || "Todas"}`,
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

    const configuredReportHeader = getAccountsPayableReportHeader({
      companyName: "Contrx",
      reportCategory: reportCategory || "Todas",
      reportStatus: getStatusFilterLabel(reportStatusFilter),
      reportDueFilter: getReportDueFilterLabel(reportDueFilter),
      reportStartDate:
        reportDueFilter === "DateRange" && reportStartDate
          ? formatDate(`${reportStartDate}T00:00:00`)
          : "Todos",
      reportEndDate:
        reportDueFilter === "DateRange" && reportEndDate
          ? formatDate(`${reportEndDate}T00:00:00`)
          : "Todos",
      reportCount: String(reportExpenses.length),
      reportTotal: formatCurrency(grandTotal),
      reportPaidTotal: formatCurrency(paidTotal),
      reportPendingTotal: formatCurrency(pendingTotal),
      reportOverdueTotal: formatCurrency(overdueTotal),
      currentDate: new Date().toLocaleString("pt-BR"),
    });
    void configuredReportHeader;

    const rows = reportExpenses
      .map((expense) => {
        const payment = getExpensePayment(expense.id);
        const amount =
          expense.status === "Paid"
            ? getExpensePaidAmount(expense)
            : getExpenseRemainingAmount(expense);
        const paymentMethods = payment?.paymentItems?.length
          ? payment.paymentItems
              .map(
                (item) =>
                  `${getPaymentMethodLabel(item.method as PaymentMethod)} (${formatCurrency(
                    item.amount,
                  )})`,
              )
              .join(", ")
          : payment
            ? getPaymentMethodLabel(payment.method as PaymentMethod)
            : "-";

        return `
          <tr>
            <td>${escapeHtml(expense.personName || "Pessoa não informada")}</td>
            <td>${escapeHtml(expense.description)}</td>
            <td>${escapeHtml(expense.category || "Outros")}</td>
            <td>${formatDate(expense.dueDate || expense.date || "")}</td>
            <td>${formatCurrency(amount)}</td>
            <td>${getStatusLabel(expense.status)}</td>
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
          <title>Relatório de Contas a Pagar</title>
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
            .filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 22px; }
            .filter-item { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; }
            .filter-item span { display: block; font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; }
            .filter-item strong { display: block; margin-top: 5px; font-size: 13px; }
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
                <div class="brand">Contrx · Financeiro</div>
                <h1>Relatório de Contas a Pagar</h1>
                <div class="meta">${escapeHtml(filterSummary)}</div>
              </div>
              <div class="meta">
                Gerado em:<br />
                <strong>${new Date().toLocaleString("pt-BR")}</strong>
              </div>
            </div>

            <div class="summary">
              <div class="card"><span>Quantidade</span><strong>${reportExpenses.length}</strong></div>
              <div class="card"><span>Total geral</span><strong>${formatCurrency(grandTotal)}</strong></div>
              <div class="card"><span>Total pago</span><strong>${formatCurrency(paidTotal)}</strong></div>
              <div class="card"><span>Total vencido</span><strong>${formatCurrency(overdueTotal)}</strong></div>
            </div>

            <div class="summary">
              <div class="card"><span>Total pendente</span><strong>${formatCurrency(pendingTotal)}</strong></div>
              <div class="card"><span>Status</span><strong>${getStatusFilterLabel(reportStatusFilter)}</strong></div>
              <div class="card"><span>Vencimento</span><strong>${getReportDueFilterLabel(reportDueFilter)}</strong></div>
              <div class="card"><span>Categoria</span><strong>${escapeHtml(reportCategory || "Todas")}</strong></div>
            </div>

            <div class="filters">
              <div class="filter-item"><span>Categoria</span><strong>${escapeHtml(reportCategory || "Todas")}</strong></div>
              <div class="filter-item"><span>Status</span><strong>${getStatusFilterLabel(reportStatusFilter)}</strong></div>
              <div class="filter-item"><span>Vencimento</span><strong>${getReportDueFilterLabel(reportDueFilter)}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Vencimento</th>
                  <th>Valor pago/em aberto</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Forma de pagamento</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="footer">Relatório gerado pelo módulo Contas a Pagar do Contrx.</div>
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

  function viewAccountsPayableReport() {
    openAccountsPayableReport(false);
  }

  function generateAccountsPayablePdf() {
    openAccountsPayableReport(true);
  }

  const accountsPayableThemeClass =
    themeMode === "graphite"
      ? "contrx-accounts-payable-page-graphite"
      : isBlackTheme
        ? "contrx-accounts-payable-page-black"
        : "contrx-accounts-payable-page-light";

  return (
    <>
      <style jsx global>{`
        .contrx-accounts-payable-page-light,
        .contrx-accounts-payable-page-light * {
          color-scheme: light !important;
        }

        .contrx-accounts-payable-page-light .bg-white,
        .contrx-accounts-payable-page-light [class*="dark:bg-slate"],
        .contrx-accounts-payable-page-light [class*="dark:from-slate"],
        .contrx-accounts-payable-page-light [class*="dark:to-slate"] {
          background-color: #ffffff !important;
          background-image: none !important;
        }

        .contrx-accounts-payable-page-light .bg-slate-50,
        .contrx-accounts-payable-page-light .bg-slate-100 {
          background-color: #f8fafc !important;
        }

        .contrx-accounts-payable-page-light .bg-orange-50,
        .contrx-accounts-payable-page-light .bg-orange-100,
        .contrx-accounts-payable-page-light [class*="dark:bg-orange"] {
          background-color: #fff7ed !important;
        }

        .contrx-accounts-payable-page-light [class*="bg-orange-50"][class*="text-white"],
        .contrx-accounts-payable-page-light button[class*="bg-orange-50"],
        .contrx-accounts-payable-page-light button[class*="bg-orange-500"] {
          background-color: #f97316 !important;
          color: #ffffff !important;
        }

        .contrx-accounts-payable-page-light button[class*="bg-slate-900"],
        .contrx-accounts-payable-page-light button[class*="bg-emerald-600"],
        .contrx-accounts-payable-page-light button[class*="bg-red-600"] {
          color: #ffffff !important;
        }

        .contrx-accounts-payable-page-light .bg-red-50,
        .contrx-accounts-payable-page-light .bg-red-100 {
          background-color: #fef2f2 !important;
        }

        .contrx-accounts-payable-page-light .bg-emerald-50,
        .contrx-accounts-payable-page-light .bg-emerald-100 {
          background-color: #ecfdf5 !important;
        }

        .contrx-accounts-payable-page-light .bg-amber-50,
        .contrx-accounts-payable-page-light .bg-amber-100 {
          background-color: #fffbeb !important;
        }

        .contrx-accounts-payable-page-light .text-slate-950,
        .contrx-accounts-payable-page-light .text-slate-900,
        .contrx-accounts-payable-page-light .text-slate-800,
        .contrx-accounts-payable-page-light .text-slate-700,
        .contrx-accounts-payable-page-light [class*="dark:text-slate-100"],
        .contrx-accounts-payable-page-light [class*="dark:text-white"] {
          color: #0f172a !important;
        }

        .contrx-accounts-payable-page-light .text-slate-600,
        .contrx-accounts-payable-page-light .text-slate-500,
        .contrx-accounts-payable-page-light .text-slate-400,
        .contrx-accounts-payable-page-light [class*="dark:text-slate-300"],
        .contrx-accounts-payable-page-light [class*="dark:text-slate-400"],
        .contrx-accounts-payable-page-light [class*="dark:text-slate-500"] {
          color: #475569 !important;
        }

        .contrx-accounts-payable-page-light .text-orange-600,
        .contrx-accounts-payable-page-light .text-orange-700 {
          color: #ea580c !important;
        }

        .contrx-accounts-payable-page-light .text-red-600,
        .contrx-accounts-payable-page-light .text-red-700 {
          color: #dc2626 !important;
        }

        .contrx-accounts-payable-page-light .text-emerald-600,
        .contrx-accounts-payable-page-light .text-emerald-700 {
          color: #047857 !important;
        }

        .contrx-accounts-payable-page-light .text-amber-700 {
          color: #b45309 !important;
        }

        .contrx-accounts-payable-page-light .border-slate-100,
        .contrx-accounts-payable-page-light .border-slate-200,
        .contrx-accounts-payable-page-light .border-slate-300,
        .contrx-accounts-payable-page-light [class*="dark:border-slate"] {
          border-color: #e2e8f0 !important;
        }

        .contrx-accounts-payable-page-light .ring-slate-100,
        .contrx-accounts-payable-page-light .ring-slate-200,
        .contrx-accounts-payable-page-light [class*="dark:ring-slate"] {
          --tw-ring-color: #e2e8f0 !important;
        }

        .contrx-accounts-payable-page-light input,
        .contrx-accounts-payable-page-light select,
        .contrx-accounts-payable-page-light textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }

        .contrx-accounts-payable-page-light input::placeholder,
        .contrx-accounts-payable-page-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .contrx-accounts-payable-page-light table,
        .contrx-accounts-payable-page-light tbody,
        .contrx-accounts-payable-page-light tbody tr {
          background-color: #ffffff !important;
        }

        .contrx-accounts-payable-page-light thead {
          background-color: #fff7ed !important;
        }

        .contrx-accounts-payable-page-light tbody tr:hover {
          background-color: #f8fafc !important;
        }

        .contrx-accounts-payable-page-light .shadow-sm,
        .contrx-accounts-payable-page-light .shadow-md,
        .contrx-accounts-payable-page-light .shadow-2xl {
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10) !important;
        }

        .contrx-accounts-payable-page-black,
        .contrx-accounts-payable-page-black * {
          color-scheme: dark !important;
        }

        .contrx-accounts-payable-page-black .bg-white,
        .contrx-accounts-payable-page-black .bg-slate-50,
        .contrx-accounts-payable-page-black .bg-slate-100 {
          background-color: #0f172a !important;
        }

        .contrx-accounts-payable-page-black .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0f172a, #111827) !important;
        }

        .contrx-accounts-payable-page-black .text-slate-950,
        .contrx-accounts-payable-page-black .text-slate-900,
        .contrx-accounts-payable-page-black .text-slate-800,
        .contrx-accounts-payable-page-black .text-slate-700 {
          color: #f8fafc !important;
        }

        .contrx-accounts-payable-page-black .text-slate-600,
        .contrx-accounts-payable-page-black .text-slate-500,
        .contrx-accounts-payable-page-black .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .contrx-accounts-payable-page-black input,
        .contrx-accounts-payable-page-black select,
        .contrx-accounts-payable-page-black textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }

        .contrx-accounts-payable-page-black input::placeholder,
        .contrx-accounts-payable-page-black textarea::placeholder {
          color: #64748b !important;
        }

        .contrx-accounts-payable-page-black table,
        .contrx-accounts-payable-page-black tbody,
        .contrx-accounts-payable-page-black tbody tr {
          background-color: #0f172a !important;
        }

        .contrx-accounts-payable-page-black thead {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }

        .contrx-accounts-payable-page-black tbody tr:hover {
          background-color: #1e293b !important;
        }

        .contrx-accounts-payable-page-graphite,
        .contrx-accounts-payable-page-graphite * {
          color-scheme: dark !important;
        }

        .contrx-accounts-payable-page-graphite .bg-white,
        .contrx-accounts-payable-page-graphite .bg-slate-50,
        .contrx-accounts-payable-page-graphite .bg-slate-100,
        .contrx-accounts-payable-page-graphite table,
        .contrx-accounts-payable-page-graphite tbody,
        .contrx-accounts-payable-page-graphite tbody tr {
          background-color: #0d1b2e !important;
        }

        .contrx-accounts-payable-page-graphite .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0d1b2e, #162a44) !important;
        }

        .contrx-accounts-payable-page-graphite .text-slate-950,
        .contrx-accounts-payable-page-graphite .text-slate-900,
        .contrx-accounts-payable-page-graphite .text-slate-800,
        .contrx-accounts-payable-page-graphite .text-slate-700 {
          color: #f8fafc !important;
        }

        .contrx-accounts-payable-page-graphite .text-slate-600,
        .contrx-accounts-payable-page-graphite .text-slate-500,
        .contrx-accounts-payable-page-graphite .text-slate-400 {
          color: #b6c6dc !important;
        }

        .contrx-accounts-payable-page-graphite input,
        .contrx-accounts-payable-page-graphite select,
        .contrx-accounts-payable-page-graphite textarea {
          background-color: #07111f !important;
          border-color: #24405f !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }

        .contrx-accounts-payable-page-graphite thead {
          background-color: rgba(249, 115, 22, 0.18) !important;
        }

        .contrx-accounts-payable-page-graphite tbody tr:hover {
          background-color: #162a44 !important;
        }
      `}</style>

      <div
        data-contrx-theme={themeMode}
        className={`${accountsPayableThemeClass} space-y-5`}
      >
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">
            Contas a Pagar
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Cadastre, acompanhe e controle suas despesas financeiras.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Card
            title="Total a Pagar"
            value={formatCurrency(totalPayable)}
            red
          />
          <Card title="Total Pago" value={formatCurrency(totalPaid)} green />
          <Card
            title="Total Vencido"
            value={formatCurrency(totalOverdue)}
            red
          />
          <Card title="Despesas" value={filteredExpenses.length} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
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
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {getStatusFilterLabel(status)}
                  </button>
                ),
              )}

              <button
                onClick={clearAllFilters}
                className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {(search || statusFilter !== "All") && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-950/30 p-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-orange-700">
                Filtro aplicado
              </p>

              <p className="text-sm text-slate-700 dark:text-slate-300">
                Busca: <strong>{search || "Todas"}</strong> · Status:{" "}
                <strong>{getStatusFilterLabel(statusFilter)}</strong>.
              </p>
            </div>

            <button
              onClick={clearAllFilters}
              className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-orange-600 shadow-sm ring-1 ring-orange-200 dark:ring-orange-800/50 transition hover:bg-orange-100 dark:hover:bg-orange-900/40"
            >
              Remover filtros
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Lista de Contas a Pagar
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Visualize as despesas pendentes, pagas e vencidas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openCreateModal}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Nova conta
                </button>

                <button
                  onClick={openReportModal}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Relatório PDF
                </button>
              </div>
            </div>

            <div className="mt-4">
              <input
                placeholder="Buscar por pessoa, descrição ou categoria..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-orange-900/40"
              />
            </div>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead className="bg-orange-50 dark:bg-orange-950/30">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Pessoa
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Bem/Ativo
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Descrição
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Categoria
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
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500"
                    >
                      Nenhuma conta a pagar encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 transition hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {expense.personName || "Pessoa não informada"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-505">
                        {expense.propertyName || "Sem bem/ativo vinculado"}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {expense.description}
                        {expense.installmentNumber &&
                          expense.installmentTotal && (
                            <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-505">
                              {expense.installmentNumber}/
                              {expense.installmentTotal}
                            </span>
                          )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-505">
                        {expense.category || "Outros"}
                      </td>

                      <td className="px-5 py-4 text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-505">
                        {formatDate(expense.dueDate || expense.date || "")}
                      </td>

                      <td className="px-5 py-4 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(expense.amount)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                            expense.status,
                          )}`}
                        >
                          {getStatusLabel(expense.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="relative inline-flex justify-center">
                          <button
                            type="button"
                            onClick={(event) => handleToggleExpenseActions(expense, event)}
                            data-payable-action-trigger
                            aria-expanded={openActionMenuExpenseId === expense.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            Ações
                            <span className="text-xs">▼</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Vista Mobile */}
          <div className="space-y-4 lg:hidden">
            {filteredExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                Nenhuma conta a pagar encontrada.
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
                        {expense.personName || "Pessoa não informada"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                        {expense.propertyName || "Sem bem/ativo vinculado"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${getStatusClassName(
                        expense.status,
                      )}`}
                    >
                      {getStatusLabel(expense.status)}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <p>
                      <span className="font-bold text-slate-400">Descrição:</span> {expense.description}
                      {expense.installmentNumber && expense.installmentTotal && (
                        <span className="ml-2 rounded-full bg-slate-105 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          {expense.installmentNumber}/{expense.installmentTotal}
                        </span>
                      )}
                    </p>
                    <p>
                      <span className="font-bold text-slate-400">Categoria:</span> {expense.category || "Outros"}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Vencimento</p>
                        <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                          {formatDate(expense.dueDate || expense.date || "")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase text-right">Valor</p>
                        <p className="text-sm font-black text-slate-950 dark:text-slate-100 mt-0.5">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={(event) => handleToggleExpenseActions(expense, event)}
                      data-payable-action-trigger
                      aria-expanded={openActionMenuExpenseId === expense.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      Ações
                      <span className="text-[10px]">▼</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {openActionMenuExpense && actionMenuPosition && (
        <div
          data-payable-action-menu
          className="fixed z-[90] max-h-[calc(100vh-32px)] w-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 text-left shadow-2xl ring-1 ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700"
          style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
        >
          <button
            type="button"
            onClick={() => {
              handleCloseExpenseActions();
              openEditExpense(openActionMenuExpense);
            }}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Editar
          </button>

          {openActionMenuExpense.status !== "Paid" && (
            <button
              type="button"
              onClick={() => {
                handleCloseExpenseActions();
                openPayExpenseModal(openActionMenuExpense);
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-orange-700 transition hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/30"
            >
              Pagar
            </button>
          )}

          {getExpensePayment(openActionMenuExpense.id) && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleCloseExpenseActions();
                  reprintExpensePaymentReceipt(openActionMenuExpense);
                }}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/30"
              >
                Imprimir Recibo
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseExpenseActions();
                  openPaymentReversalConfirmation(openActionMenuExpense);
                }}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                Estornar pagamento
              </button>
            </>
          )}
        </div>
      )}

      {isCreateOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ${accountsPayableThemeClass}`}>
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-950/30">
                    R$
                  </div>

                  <div>
                    <h2 className={`text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {editingExpenseId
                        ? "Editar conta a pagar"
                        : "Nova conta a pagar"}
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      {editingExpenseId
                        ? "Ajuste os dados da conta a pagar selecionada."
                        : "Cadastre uma conta a pagar avulsa, única ou parcelada."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isExpenseSaving}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isBlackTheme
                      ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155] hover:text-[#ffffff]"
                      : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  }`}
                  aria-label="Fechar cadastro"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-120px)] space-y-5 overflow-y-auto p-6">
              {!editingExpenseId && (
                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Tipo de lançamento
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseFormError("");
                        setFormLaunchType("single");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        formLaunchType === "single"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-4 ring-orange-100 dark:ring-orange-900/50"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <p className={`text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                        Conta única
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Lançamento avulso com apenas um vencimento.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExpenseFormError("");
                        setFormLaunchType("installment");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        formLaunchType === "installment"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-4 ring-orange-100 dark:ring-orange-900/50"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <p className={`text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                        Sequência de parcelas
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Divide o valor total em parcelas editáveis.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border p-4 ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#111827]"
                    : "border-[#dbe4ef] bg-[#f8fafc]"
                }`}
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                      Pessoa/Fornecedor
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      value={formTenant}
                      disabled={isEditingPaidExpense}
                      onChange={(event) => {
                        setExpenseFormError("");
                        setFormTenant(event.target.value);
                      }}
                      className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                        isEditingPaidExpense
                          ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <option value="">Selecione a pessoa/fornecedor</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isEditingPaidExpense && (
                    <button
                      type="button"
                      onClick={openTenantCreateModal}
                      className="h-12 rounded-xl bg-[#0f172a] px-5 text-sm font-bold text-[#ffffff] shadow-sm transition hover:bg-slate-800"
                    >
                      NOVO
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {isEditingPaidExpense
                    ? "Conta paga não permite alteração de pessoa/fornecedor."
                    : "Use o botão NOVO para abrir o cadastro completo de pessoa e selecionar automaticamente no lançamento."}
                </p>
              </div>

              <div>
                <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  Bem/Ativo
                </label>

                <select
                  value={formProperty}
                  disabled={isEditingPaidExpense}
                  onChange={(event) => {
                    setExpenseFormError("");
                    setFormProperty(event.target.value);
                  }}
                  className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                    isEditingPaidExpense
                      ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <option value="">Sem bem/ativo vinculado</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Descrição
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    value={formDescription}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormDescription(event.target.value);
                    }}
                    placeholder="Ex: Energia elétrica"
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                      isEditingPaidExpense
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Categoria
                  </label>

                  <select
                    value={formCategory}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormCategory(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                      isEditingPaidExpense
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {expenseCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Valor total
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500 dark:text-slate-400">
                      R$
                    </span>

                    <input
                      inputMode="decimal"
                      value={formAmount}
                      disabled={isEditingPaidExpense}
                      onChange={(event) => {
                        setExpenseFormError("");
                        setFormAmount(formatCurrencyInput(event.target.value));
                      }}
                      onBlur={() => {
                        const amount = normalizeAmount(formAmount);

                        setFormAmount(amount > 0 ? formatAmountInput(amount) : "");
                      }}
                      placeholder="0,00"
                      className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 pl-11 text-sm font-black outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                        isEditingPaidExpense
                          ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Data de lançamento
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    value={formIssueDate}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormIssueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                      isEditingPaidExpense
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Primeiro vencimento
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    value={formDueDate}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormDueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                      isEditingPaidExpense
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
              </div>

              {isEditingPaidExpense && (
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Data de pagamento
                  </label>

                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormPaymentDate(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 md:max-w-xs"
                  />

                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Para conta paga, somente a data de pagamento pode ser
                    ajustada antes de salvar.
                  </p>
                </div>
              )}

              <div>
                <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  Observação
                </label>

                <textarea
                  value={formNote}
                  disabled={isEditingPaidExpense}
                  onChange={(event) => setFormNote(event.target.value)}
                  placeholder="Informações adicionais sobre a conta..."
                  className={`min-h-24 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                    isEditingPaidExpense
                      ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  }`}
                />
              </div>

              {formLaunchType === "installment" && !editingExpenseId && (
                <div className="space-y-4 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 p-4">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
                    <div>
                      <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                        Quantidade de parcelas
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        type="number"
                        min={2}
                        max={MAX_INSTALLMENT_QUANTITY}
                        value={formInstallmentQuantity}
                        onChange={(event) => {
                          setExpenseFormError("");
                          const nextQuantity = Number(event.target.value);

                          if (!event.target.value || !Number.isFinite(nextQuantity)) {
                            setFormInstallmentQuantity(event.target.value);
                            return;
                          }

                          setFormInstallmentQuantity(
                            String(
                              Math.min(
                                MAX_INSTALLMENT_QUANTITY,
                                Math.max(2, Math.trunc(nextQuantity)),
                              ),
                            ),
                          );
                        }}
                        className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                      />
                      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Limite de {MAX_INSTALLMENT_QUANTITY} parcelas.
                      </p>
                    </div>

                    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-400 ring-1 ring-orange-100 dark:ring-orange-900/50">
                      As parcelas são geradas a cada 30 dias e podem ser
                      ajustadas antes de salvar.
                    </div>
                  </div>

                  {installmentPreview.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="hidden grid-cols-[90px_1fr_1fr] bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 md:grid">
                        <span>Parcela</span>
                        <span>Valor</span>
                        <span>Vencimento</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {installmentPreview.map((installment) => (
                          <div
                            key={installment.id}
                            className="grid gap-3 px-4 py-3 md:grid-cols-[90px_1fr_1fr]"
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
                              aria-label={`Valor da parcela ${installment.installmentNumber}`}
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
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
                              aria-label={`Vencimento da parcela ${installment.installmentNumber}`}
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {expenseFormError && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${isBlackTheme ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {expenseFormError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 pt-5 md:flex-row md:items-center md:justify-between">
                {editingExpenseId && (
                  <div className="flex flex-col-reverse gap-3 md:flex-row">
                    {!isEditingPaidExpense && (
                      <button
                        type="button"
                        disabled={isExpenseSaving}
                        onClick={openDeleteExpenseConfirmation}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Excluir conta
                      </button>
                    )}

                    {isEditingPaidExpense && (
                      <button
                        type="button"
                        disabled={isExpenseSaving}
                        onClick={() => openPaymentReversalConfirmation()}
                        className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Voltar para pendente
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row md:justify-end">
                  {!isEditingPaidExpense && (
                    <button
                      type="button"
                      disabled={isExpenseSaving}
                      onClick={closeCreateModal}
                      className={`rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isBlackTheme
                          ? "bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]"
                          : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                      }`}
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isExpenseSaving}
                    onClick={saveExpenseWithSavingState}
                    className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isExpenseSaving
                      ? "Salvando..."
                      : editingExpenseId
                        ? "Salvar ajustes"
                        : "Salvar conta"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PersonCreateModal
        open={isTenantCreateOpen}
        companyId={companyId}
        people={tenants.map((tenant) => ({
          id: tenant.id,
          document: tenant.document || tenant.cpf || "",
        }))}
        onClose={closeTenantCreateModal}
        onCreated={handleTenantCreated}
      />
      {expensePendingPaymentReceipt && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${accountsPayableThemeClass}`}>
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Pagar conta
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Ajuste juros, desconto, valor final e formas de pagamento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePayExpenseModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
                  aria-label="Fechar pagamento"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-red-200/60 pb-3 dark:border-red-900/40">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-400">
                      Detalhamento da Conta a Pagar
                    </p>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {expensePendingPaymentReceipt.description}
                    </h3>
                  </div>

                  <span className="inline-flex w-fit rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-red-700 shadow-sm dark:border-red-900 dark:bg-slate-900 dark:text-red-300">
                    A Pagar
                  </span>
                </div>

                <div className="mt-4 grid gap-4 text-xs font-bold text-slate-700 dark:text-slate-300 md:grid-cols-3">
                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="block text-[10px] font-black uppercase text-slate-400">Fornecedor / Favorecido</span>
                    <span className="text-sm font-black text-slate-950 dark:text-white truncate block mt-0.5">
                      {expensePendingPaymentReceipt.personName || "Não informado"}
                    </span>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="block text-[10px] font-black uppercase text-slate-400">Bem / Ativo</span>
                    <span className="text-sm font-black text-slate-950 dark:text-white truncate block mt-0.5">
                      {expensePendingPaymentReceipt.propertyName || "Não informado"}
                    </span>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="block text-[10px] font-black uppercase text-slate-400">Valor Original</span>
                    <span className="text-sm font-black text-slate-950 dark:text-white truncate block mt-0.5">
                      {formatCurrency(expensePendingPaymentReceipt.amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Data de pagamento
                  </label>

                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(event) => setFormPaymentDate(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Juros
                  </label>

                  <input
                    value={paymentInterest}
                    onChange={(event) => {
                      const value = event.target.value;

                      setPaymentInterest(value);
                      updatePaymentFinalAmountFromAdjustments(
                        expensePendingPaymentReceipt,
                        value,
                        paymentDiscount,
                      );
                    }}
                    placeholder="0,00"
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Desconto
                  </label>

                  <input
                    value={paymentDiscount}
                    onChange={(event) => {
                      const value = event.target.value;

                      setPaymentDiscount(value);
                      updatePaymentFinalAmountFromAdjustments(
                        expensePendingPaymentReceipt,
                        paymentInterest,
                        value,
                      );
                    }}
                    placeholder="0,00"
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Valor final pago
                  </label>

                  <input
                    value={paymentFinalAmount}
                    onChange={(event) => {
                      const value = event.target.value;

                      setPaymentFinalAmount(value);
                      updatePaymentAdjustmentsFromFinalAmount(
                        expensePendingPaymentReceipt,
                        value,
                      );
                      updatePaymentEntriesFromFinalAmount(value);
                    }}
                    placeholder="0,00"
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Formas de pagamento
                  </label>

                  <button
                    type="button"
                    onClick={addPaymentEntry}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Adicionar forma
                  </button>
                </div>

                <div className="space-y-3">
                  {paymentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 md:grid-cols-[1fr_180px_auto]"
                    >
                      <select
                        value={entry.method}
                        onChange={(event) =>
                          updatePaymentEntryMethod(
                            entry.id,
                            event.target.value as PaymentMethod,
                          )
                        }
                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                      >
                        {paymentMethodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <input
                        value={entry.amount}
                        onChange={(event) =>
                          updatePaymentEntryAmount(entry.id, event.target.value)
                        }
                        placeholder="0,00"
                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                      />

                      <button
                        type="button"
                        onClick={() => removePaymentEntry(entry.id)}
                        className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-red-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/40"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                  Total informado: {formatCurrency(getPaymentEntriesTotal())}
                </p>

                <div
                  className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold ${getPaymentEntriesBalanceClassName()}`}
                >
                  {getPaymentEntriesBalanceLabel()}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Observação do pagamento
                </label>

                <textarea
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  placeholder="Ex: pago com desconto negociado..."
                  className="min-h-20 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                />
              </div>

              {paymentFormError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-bold text-red-700">
                  {paymentFormError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closePayExpenseModal}
                disabled={Boolean(processingConfirmation)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmPayExpense}
                disabled={Boolean(processingConfirmation)}
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentConfirmationOpen && expensePendingPaymentReceipt && (
        <ConfirmationModal
          icon="💰"
          title="Confirmar pagamento?"
          description="Esta conta será marcada como paga e o pagamento ficará registrado."
          itemLabel="Conta"
          itemValue={expensePendingPaymentReceipt.description}
          confirmLabel="Confirmar pagamento"
          onCancel={() => setIsPaymentConfirmationOpen(false)}
          onConfirm={finishPayExpense}
          isProcessing={processingConfirmation === "payment"}
          processingLabel="Registrando pagamento..."
          isBlackTheme={isBlackTheme}
          themeClass={accountsPayableThemeClass}
        />
      )}

      {expensePendingDeletion && (
        <ConfirmationModal
          icon="⚠️"
          title="Excluir conta a pagar?"
          description="Esta ação removerá a conta e seus registros de pagamento."
          itemLabel="Conta"
          itemValue={expensePendingDeletion.description}
          confirmLabel="Excluir conta"
          danger
          onCancel={closeDeleteExpenseConfirmation}
          onConfirm={confirmDeleteExpense}
          isProcessing={processingConfirmation === "delete"}
          processingLabel="Excluindo..."
          isBlackTheme={isBlackTheme}
          themeClass={accountsPayableThemeClass}
        />
      )}

      {expensePendingPaymentReversal && (
        <ConfirmationModal
          icon="↩️"
          title="Voltar para pendente?"
          description="O registro de pagamento será removido e a conta voltará para pendente."
          itemLabel="Conta"
          itemValue={expensePendingPaymentReversal.description}
          confirmLabel="Voltar para pendente"
          onCancel={closePaymentReversalConfirmation}
          onConfirm={confirmPaymentReversal}
          isProcessing={processingConfirmation === "reversal"}
          processingLabel="Estornando..."
          isBlackTheme={isBlackTheme}
          themeClass={accountsPayableThemeClass}
        />
      )}

      {isReportOpen && (
        <div className={`fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${accountsPayableThemeClass}`}>
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="border-b border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Relatório de contas a pagar
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Visualize o relatório na tela ou gere um PDF com filtros por
                    categoria, status, vencidas, a vencer ou período.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeReportModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    borderColor: "#e2e8f0",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                  }}
                  aria-label="Fechar relatório"
                >
                  X
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>

                  <select
                    value={reportCategory}
                    onChange={(event) => {
                      setReportFormError("");
                      setReportCategory(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-800"
                  >
                    <option value="">Todas as categorias</option>
                    {expenseCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
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
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-800"
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {(
                    [
                      "All",
                      "Overdue",
                      "DueToday",
                      "Upcoming",
                      "DateRange",
                    ] as ReportDueFilter[]
                  ).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        setReportFormError("");
                        setReportDueFilter(filter);
                      }}
                      className="min-h-16 rounded-2xl border px-3 py-3 text-sm font-bold leading-snug transition"
                      style={{
                        backgroundColor:
                          reportDueFilter === filter ? "#020617" : "#ffffff",
                        color: reportDueFilter === filter ? "#ffffff" : "#0f172a",
                        borderColor:
                          reportDueFilter === filter ? "#020617" : "#cbd5e1",
                        boxShadow:
                          reportDueFilter === filter
                            ? "0 1px 2px rgba(15, 23, 42, 0.12)"
                            : "none",
                      }}
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
                      className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-800"
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
                      className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 dark:ring-slate-800"
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
                      {getReportFilteredExpenses().length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Total filtrado
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(
                        getReportTotalAmount(getReportFilteredExpenses()),
                      )}
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

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-xl px-5 py-3 text-sm font-bold transition"
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#0f172a",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={viewAccountsPayableReport}
                className="rounded-xl px-5 py-3 text-sm font-bold shadow-sm ring-1 transition"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  borderColor: "#e2e8f0",
                }}
              >
                Visualizar relatório
              </button>

              <button
                type="button"
                onClick={generateAccountsPayablePdf}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function mapApiPayableToExpense(account: PayableAccount): Expense {
  return {
    id: account.id,
    personId: account.personId || undefined,
    propertyId: account.propertyId || account.property?.id || undefined,
    propertyName: account.property?.title || undefined,
    personName: account.personName || "Pessoa não informada",
    description: account.description,
    category: account.category || "Outros",
    note: account.note || "",
    amount: normalizeApiAmount(account.amount),
    date: account.issueDate || account.dueDate,
    issueDate: account.issueDate || account.dueDate,
    dueDate: account.dueDate,
    status: account.status === "PAID" ? "Paid" : "Pending",
    manual: account.manual,
    installmentNumber: account.installmentNumber || undefined,
    installmentTotal: account.installmentTotal || undefined,
    installmentGroupId: account.installmentGroupId || undefined,
  };
}

function mapApiPayableToPayments(account: PayableAccount): ExpensePayment[] {
  return (account.payments || []).map((payment) => ({
    expenseId: account.id,
    paidAt: payment.paidAt,
    method: mapApiPaymentMethodToUi(payment.method),
    paymentItems: mapApiPaymentItemsToUi(payment.paymentItems),
    interest: normalizeApiAmount(payment.interest),
    discount: normalizeApiAmount(payment.discount),
    amountPaid: normalizeApiAmount(payment.amountPaid),
    note: payment.note || "",
  }));
}

function mapApiPersonToTenant(person: Person): Tenant {
  return {
    id: person.id,
    name: person.name,
    document: person.document,
    personType: person.type === "COMPANY" ? "Company" : "Individual",
    cpf: person.document,
    phone: person.phone || "",
    isTenant: person.isTenant !== false,
    state: person.state || "",
    city: person.city || "",
    street: person.address || "",
  };
}

function mapApiPropertyToProperty(property: ApiProperty): Property {
  return {
    id: property.id,
    name: property.title,
  };
}

function mapUiPaymentMethodToApi(method: PaymentMethod): ApiPaymentMethod {
  const methodMap: Record<PaymentMethod, ApiPaymentMethod> = {
    Cash: "CASH",
    Pix: "PIX",
    CreditCard: "CREDIT_CARD",
    DebitCard: "DEBIT_CARD",
    BankSlip: "BANK_SLIP",
    BankTransfer: "BANK_TRANSFER",
    Other: "OTHER",
  };

  return methodMap[method];
}

function mapApiPaymentMethodToUi(method: ApiPaymentMethod): PaymentMethod {
  const methodMap: Record<ApiPaymentMethod, PaymentMethod> = {
    CASH: "Cash",
    PIX: "Pix",
    CREDIT_CARD: "CreditCard",
    DEBIT_CARD: "DebitCard",
    BANK_SLIP: "BankSlip",
    BANK_TRANSFER: "BankTransfer",
    OTHER: "Other",
  };

  return methodMap[method];
}

function mapUiPaymentItemsToApi(items: PaymentAllocation[]) {
  return items.map((item) => ({
    ...item,
    method: mapUiPaymentMethodToApi(item.method),
  }));
}

function mapApiPaymentItemsToUi(items: unknown): PaymentAllocation[] | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as {
        id?: unknown;
        method?: unknown;
        amount?: unknown;
      };

      if (typeof record.method !== "string") {
        return null;
      }

      return {
        id: typeof record.id === "string" ? record.id : `payment-item-${Date.now()}`,
        method: mapApiPaymentMethodToUi(record.method as ApiPaymentMethod),
        amount: normalizeApiAmount(record.amount),
      };
    })
    .filter((item): item is PaymentAllocation => item !== null);
}

function normalizeApiAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function Card({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: React.ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <h2
        className={`mt-1 truncate text-xl font-black ${
          green
            ? "text-emerald-600"
            : red
              ? "text-red-600"
              : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}

function ConfirmationModal({
  icon,
  title,
  description,
  itemLabel,
  itemValue,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
  isProcessing = false,
  processingLabel = "Processando...",
  isBlackTheme,
  themeClass,
}: {
  icon: string;
  title: string;
  description: string;
  itemLabel: string;
  itemValue: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  processingLabel?: string;
  isBlackTheme?: boolean;
  themeClass?: string;
}) {
  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${themeClass ?? (isBlackTheme ? "contrx-accounts-payable-page-black" : "contrx-accounts-payable-page-light")}`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="p-6 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg ${
              danger
                ? "bg-red-50 dark:bg-red-950/30 text-red-600 shadow-red-500/10"
                : "bg-orange-50 dark:bg-orange-950/30 text-orange-600 shadow-orange-500/10"
            }`}
          >
            {icon}
          </div>

          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-slate-100">
            {title}
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {description}
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-left">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {itemLabel}
            </p>

            <p className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">
              {itemValue}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {isProcessing ? processingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
