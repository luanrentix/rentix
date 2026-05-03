"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

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

type Expense = {
  id: string;
  personId?: string;
  personName?: string;
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

type CnpjWsResponse = {
  razao_social?: string;
  estabelecimento?: {
    nome_fantasia?: string;
    cnpj?: string;
    ddd1?: string;
    telefone1?: string;
    cep?: string;
    estado?: {
      sigla?: string;
    };
    cidade?: {
      nome?: string;
    };
    logradouro?: string;
    numero?: string;
    bairro?: string;
    complemento?: string;
  };
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

export default function AccountsPayablePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<ExpensePayment[]>([]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTenantCreateOpen, setIsTenantCreateOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

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
  const [tenantFormData, setTenantFormData] = useState<TenantFormData>(
    initialTenantFormData,
  );
  const [isZipCodeLoading, setIsZipCodeLoading] = useState(false);
  const [zipCodeError, setZipCodeError] = useState("");
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [cnpjSearchError, setCnpjSearchError] = useState("");

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

  useEffect(() => {
    const expenseData = localStorage.getItem("rentix_expenses");
    const tenantData = localStorage.getItem("rentix_tenants");
    const paymentData = localStorage.getItem("rentix_expense_payments");
    const savedStatusFilter = localStorage.getItem(
      "rentix_payable_status_filter",
    );

    if (expenseData) {
      const parsedExpenses = JSON.parse(expenseData) as Expense[];

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

    if (tenantData) {
      setTenants(JSON.parse(tenantData));
    }

    if (paymentData) {
      setPaymentRecords(JSON.parse(paymentData));
    }

    if (
      savedStatusFilter === "All" ||
      savedStatusFilter === "Pending" ||
      savedStatusFilter === "Paid" ||
      savedStatusFilter === "Overdue"
    ) {
      setStatusFilter(savedStatusFilter);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rentix_payable_status_filter", statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (formLaunchType !== "installment") {
      setInstallmentPreview([]);
      return;
    }

    generateInstallmentPreview();
  }, [formLaunchType, formAmount, formDueDate, formInstallmentQuantity]);

  const expensesWithStatus = useMemo<Expense[]>(() => {
    const today = getStartOfDay(new Date());

    return expenses.map((expense) => {
      const paymentRecord = getExpensePayment(expense.id);
      const dueDate = getStartOfDay(
        new Date(expense.dueDate || expense.date || new Date().toISOString()),
      );

      let status: ExpenseStatus = "Pending";

      if (paymentRecord) {
        status = "Paid";
      } else if (dueDate < today) {
        status = "Overdue";
      }

      return {
        ...expense,
        status,
      };
    });
  }, [expenses, paymentRecords]);

  const filteredExpenses = useMemo(() => {
    let result = expensesWithStatus;

    if (search.trim()) {
      const normalizedSearch = search.trim().toLowerCase();

      result = result.filter(
        (expense) =>
          expense.description.toLowerCase().includes(normalizedSearch) ||
          (expense.personName || "").toLowerCase().includes(normalizedSearch) ||
          (expense.category || "").toLowerCase().includes(normalizedSearch),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((expense) => expense.status === statusFilter);
    }

    return result;
  }, [expensesWithStatus, search, statusFilter]);

  const totalPayable = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status !== "Paid")
      .reduce((total, expense) => total + expense.amount, 0);
  }, [filteredExpenses]);

  const totalPaid = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status === "Paid")
      .reduce((total, expense) => total + getExpensePaidAmount(expense), 0);
  }, [filteredExpenses, paymentRecords]);

  const totalOverdue = useMemo(() => {
    return filteredExpenses
      .filter((expense) => expense.status === "Overdue")
      .reduce((total, expense) => total + expense.amount, 0);
  }, [filteredExpenses]);

  const isEditingPaidExpense = editingExpenseId
    ? Boolean(getExpensePayment(editingExpenseId))
    : false;

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

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(value) ? value : 0);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR");
  }

  function formatAmountInput(value: number) {
    return value.toFixed(2).replace(".", ",");
  }

  function getLocalDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

  function addDaysToDate(dateValue: string, days: number) {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);

    return getLocalDateValue(date);
  }

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
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
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
      setCnpjSearchError(
        "Informe um CNPJ com 14 números para buscar os dados.",
      );
      return;
    }

    if (!isValidCnpj(cleanCnpj)) {
      setCnpjSearchError("CNPJ inválido. Verifique o número informado.");
      return;
    }

    try {
      setIsCnpjLoading(true);
      setCnpjSearchError("");

      const companyData = await fetchCompanyDataByCnpj(cleanCnpj);

      if (!companyData) {
        setCnpjSearchError("Empresa não encontrada para o CNPJ informado.");
        return;
      }

      setTenantFormData((currentData) => ({
        ...currentData,
        name: companyData.name || currentData.name,
        cpf: formatCnpj(companyData.cnpj || cleanCnpj),
        phone: companyData.phone
          ? formatPhone(companyData.phone)
          : currentData.phone,
        zipCode: companyData.zipCode
          ? formatZipCode(companyData.zipCode)
          : currentData.zipCode,
        state: companyData.state || currentData.state,
        city: companyData.city || currentData.city,
        street: companyData.street || currentData.street,
        number: companyData.number || currentData.number,
        district: companyData.district || currentData.district,
        complement: companyData.complement || currentData.complement,
      }));
    } catch {
      setCnpjSearchError(
        "Não foi possível consultar o CNPJ agora. Tente novamente em alguns segundos.",
      );
    } finally {
      setIsCnpjLoading(false);
    }
  }

  async function fetchCompanyDataByCnpj(cleanCnpj: string) {
    const brasilApiData = await fetchCompanyDataFromBrasilApi(cleanCnpj);

    if (brasilApiData) return brasilApiData;

    return fetchCompanyDataFromCnpjWs(cleanCnpj);
  }

  async function fetchCompanyDataFromBrasilApi(cleanCnpj: string) {
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      );

      if (!response.ok) return null;

      const data = (await response.json()) as BrasilApiCnpjResponse;
      const companyName =
        data.razao_social?.trim() || data.nome_fantasia?.trim() || "";

      if (!companyName) return null;

      return {
        name: companyName,
        cnpj: data.cnpj || cleanCnpj,
        phone: data.ddd_telefone_1 || "",
        zipCode: data.cep || "",
        state: data.uf || "",
        city: data.municipio || "",
        street: data.logradouro || "",
        number: data.numero || "",
        district: data.bairro || "",
        complement: data.complemento || "",
      };
    } catch {
      return null;
    }
  }

  async function fetchCompanyDataFromCnpjWs(cleanCnpj: string) {
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);

    if (!response.ok) return null;

    const data = (await response.json()) as CnpjWsResponse;
    const establishment = data.estabelecimento;
    const phone = [establishment?.ddd1, establishment?.telefone1]
      .filter(Boolean)
      .join("");

    const companyName =
      data.razao_social?.trim() || establishment?.nome_fantasia?.trim() || "";

    if (!companyName) return null;

    return {
      name: companyName,
      cnpj: establishment?.cnpj || cleanCnpj,
      phone,
      zipCode: establishment?.cep || "",
      state: establishment?.estado?.sigla || "",
      city: establishment?.cidade?.nome || "",
      street: establishment?.logradouro || "",
      number: establishment?.numero || "",
      district: establishment?.bairro || "",
      complement: establishment?.complemento || "",
    };
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

  function createTenantFromModal() {
    const trimmedTenantName = tenantFormData.name.trim();
    const normalizedDocument = onlyNumbers(tenantFormData.cpf);

    if (!trimmedTenantName) return;

    if (!normalizedDocument) {
      setCnpjSearchError(
        tenantFormData.personType === "Company"
          ? "Informe o CNPJ antes de cadastrar a pessoa."
          : "Informe o CPF antes de cadastrar a pessoa.",
      );
      return;
    }

    const expectedDocumentLength =
      tenantFormData.personType === "Company" ? 14 : 11;

    if (normalizedDocument.length !== expectedDocumentLength) {
      setCnpjSearchError(
        tenantFormData.personType === "Company"
          ? "Informe um CNPJ válido com 14 números."
          : "Informe um CPF válido com 11 números.",
      );
      return;
    }

    const documentAlreadyExists = tenants.some((tenant) => {
      const currentDocument = onlyNumbers(tenant.cpf || "");

      return currentDocument === normalizedDocument;
    });

    if (documentAlreadyExists) {
      setCnpjSearchError(
        tenantFormData.personType === "Company"
          ? "Já existe uma pessoa cadastrada com este CNPJ."
          : "Já existe uma pessoa cadastrada com este CPF.",
      );
      return;
    }

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
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsTenantCreateOpen(false);

    localStorage.setItem("rentix_tenants", JSON.stringify(updatedTenants));
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

  function getExpensePayment(expenseId: string) {
    return paymentRecords.find(
      (paymentRecord) => String(paymentRecord.expenseId) === String(expenseId),
    );
  }

  function getExpensePaidAmount(expense: Expense) {
    return getExpensePayment(expense.id)?.amountPaid ?? expense.amount;
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

  function saveExpenses(updatedExpenses: Expense[]) {
    setExpenses(updatedExpenses);
    localStorage.setItem("rentix_expenses", JSON.stringify(updatedExpenses));
  }

  function savePaymentRecords(updatedPaymentRecords: ExpensePayment[]) {
    setPaymentRecords(updatedPaymentRecords);
    localStorage.setItem(
      "rentix_expense_payments",
      JSON.stringify(updatedPaymentRecords),
    );
  }

  function openCreateModal() {
    const today = new Date();
    const dueDate = new Date();

    dueDate.setDate(today.getDate() + 30);

    setEditingExpenseId(null);
    setFormTenant("");
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
    setIsCreateOpen(true);
  }

  function openEditExpense(expense: Expense) {
    const paymentRecord = getExpensePayment(expense.id);

    setEditingExpenseId(expense.id);
    setFormTenant(expense.personId || "");
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
    setIsCreateOpen(true);
  }

  function resetCreateForm() {
    setEditingExpenseId(null);
    setFormTenant("");
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
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setIsZipCodeLoading(false);
    setIsTenantCreateOpen(false);
  }

  function closeCreateModal() {
    resetCreateForm();
    setIsCreateOpen(false);
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

  function saveExpense() {
    setExpenseFormError("");

    const normalizedAmount = normalizeAmount(formAmount);
    const trimmedDescription = formDescription.trim();
    const trimmedCategory = formCategory.trim() || "Outros";
    const selectedTenant = tenants.find(
      (tenant) => String(tenant.id) === String(formTenant),
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
        method: currentPaymentRecord?.method || "Cash",
        paymentItems: currentPaymentRecord?.paymentItems,
        interest: currentPaymentRecord?.interest || 0,
        discount: currentPaymentRecord?.discount || 0,
        amountPaid:
          currentPaymentRecord?.amountPaid || currentExpense?.amount || 0,
        note: currentPaymentRecord?.note || "",
      };

      savePaymentRecords([
        ...paymentRecords.filter(
          (paymentRecord) =>
            String(paymentRecord.expenseId) !== String(editingExpenseId),
        ),
        updatedPaymentRecord,
      ]);

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
        id: editingExpenseId || `expense-${Date.now()}`,
        personId: selectedTenant.id,
        personName: selectedTenant.name,
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

    const installmentGroupId = `expense-installment-${Date.now()}`;

    const newExpenses: Expense[] = installmentPreview.map((installment) => ({
      id: `${installmentGroupId}-${installment.installmentNumber}`,
      personId: selectedTenant.id,
      personName: selectedTenant.name,
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

    saveExpenses([...expenses, ...newExpenses]);
    closeCreateModal();
  }

  function openPayExpenseModal(expense: Expense) {
    setExpensePendingPaymentReceipt(expense);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentFinalAmount(formatAmountInput(expense.amount));
    setPaymentMethod("Cash");
    setPaymentEntries([
      {
        id: `payment-entry-${Date.now()}`,
        method: "Cash",
        amount: formatAmountInput(expense.amount),
      },
    ]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function closePayExpenseModal() {
    setExpensePendingPaymentReceipt(null);
    setIsPaymentConfirmationOpen(false);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentFinalAmount("");
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

    if (interest < 0 || discount < 0) {
      setPaymentFormError("Informe juros e desconto com valores válidos.");
      return;
    }

    if (amountPaid <= 0) {
      setPaymentFormError("O valor final pago precisa ser maior que zero.");
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
      setPaymentFormError(
        "A soma das formas de pagamento precisa ser igual ao valor final pago.",
      );
      return;
    }

    setPaymentFormError("");
    setIsPaymentConfirmationOpen(true);
  }

  function finishPayExpense() {
    if (!expensePendingPaymentReceipt) return;

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);

    const paymentRecord: ExpensePayment = {
      expenseId: expensePendingPaymentReceipt.id,
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
          String(currentPaymentRecord.expenseId) !==
          String(expensePendingPaymentReceipt.id),
      ),
      paymentRecord,
    ];

    savePaymentRecords(updatedPaymentRecords);
    closePayExpenseModal();
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
    setExpensePendingDeletion(null);
  }

  function confirmDeleteExpense() {
    if (!expensePendingDeletion) return;

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
  }

  function openPaymentReversalConfirmation() {
    if (!editingExpenseId) return;

    const expense = expensesWithStatus.find(
      (item) => String(item.id) === String(editingExpenseId),
    );

    if (!expense || !getExpensePayment(expense.id)) {
      setExpenseFormError("Esta conta não está marcada como paga.");
      return;
    }

    setExpensePendingPaymentReversal(expense);
  }

  function closePaymentReversalConfirmation() {
    setExpensePendingPaymentReversal(null);
  }

  function confirmPaymentReversal() {
    if (!expensePendingPaymentReversal) return;

    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.expenseId) !==
        String(expensePendingPaymentReversal.id),
    );

    savePaymentRecords(updatedPaymentRecords);
    setExpensePendingPaymentReversal(null);
    closeCreateModal();
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
          : expense.amount),
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
      .reduce((total, expense) => total + expense.amount, 0);
    const paidTotal = reportExpenses
      .filter((expense) => expense.status === "Paid")
      .reduce((total, expense) => total + getExpensePaidAmount(expense), 0);
    const overdueTotal = reportExpenses
      .filter((expense) => expense.status === "Overdue")
      .reduce((total, expense) => total + expense.amount, 0);
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

    const rows = reportExpenses
      .map((expense) => {
        const payment = getExpensePayment(expense.id);
        const amount =
          expense.status === "Paid"
            ? getExpensePaidAmount(expense)
            : expense.amount;
        const paymentMethods = payment?.paymentItems?.length
          ? payment.paymentItems
              .map(
                (item) =>
                  `${getPaymentMethodLabel(item.method)} (${formatCurrency(
                    item.amount,
                  )})`,
              )
              .join(", ")
          : payment
            ? getPaymentMethodLabel(payment.method)
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

            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Forma de pagamento</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="footer">Relatório gerado pelo módulo Contas a Pagar do Rentix.</div>
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">
            Contas a Pagar
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Cadastre, acompanhe e controle suas despesas financeiras.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 p-5">
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
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Nova conta
                </button>

                <button
                  onClick={openReportModal}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Relatório PDF
                </button>
              </div>
            </div>

            <div className="mt-5">
              <input
                placeholder="Buscar por pessoa, descrição ou categoria..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead className="bg-orange-50 dark:bg-orange-950/30">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Pessoa
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
                      colSpan={7}
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

                      <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {expense.description}
                        {expense.installmentNumber &&
                          expense.installmentTotal && (
                            <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                              {expense.installmentNumber}/
                              {expense.installmentTotal}
                            </span>
                          )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
                        {expense.category || "Outros"}
                      </td>

                      <td className="px-5 py-4 text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
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
                        {expense.status !== "Paid" ? (
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => openEditExpense(expense)}
                              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => openPayExpenseModal(expense)}
                              className="rounded-xl bg-orange-50 dark:bg-orange-950/300 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                            >
                              Pagar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => openEditExpense(expense)}
                              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              Editar
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

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {editingExpenseId
                      ? "Editar conta a pagar"
                      : "Nova conta a pagar"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Informe descrição, categoria, valor, vencimento e
                    observações.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
                  aria-label="Fechar cadastro"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {!editingExpenseId && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Tipo de lançamento
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFormLaunchType("single")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        formLaunchType === "single"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/300 text-white shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      Conta única
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormLaunchType("installment")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        formLaunchType === "installment"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/300 text-white shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      Parcelado
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Pessoa
                  </label>

                  <button
                    type="button"
                    onClick={openTenantCreateModal}
                    disabled={isEditingPaidExpense}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  >
                    Cadastrar pessoa
                  </button>
                </div>

                <select
                  value={formTenant}
                  disabled={isEditingPaidExpense}
                  onChange={(event) => {
                    setExpenseFormError("");
                    setFormTenant(event.target.value);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
                >
                  <option value="">Selecione uma pessoa</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Use o mesmo cadastro de pessoas/inquilinos do Contas a
                  Receber.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Descrição
                  </label>

                  <input
                    value={formDescription}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormDescription(event.target.value);
                    }}
                    placeholder="Ex: Energia elétrica"
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>

                  <select
                    value={formCategory}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormCategory(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
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
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Valor
                  </label>

                  <input
                    value={formAmount}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormAmount(event.target.value);
                    }}
                    placeholder="0,00"
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Lançamento
                  </label>

                  <input
                    type="date"
                    value={formIssueDate}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormIssueDate(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Vencimento
                  </label>

                  <input
                    type="date"
                    value={formDueDate}
                    disabled={isEditingPaidExpense}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormDueDate(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
                  />
                </div>
              </div>

              {isEditingPaidExpense && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Data de pagamento
                  </label>

                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(event) => {
                      setExpenseFormError("");
                      setFormPaymentDate(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Observação
                </label>

                <textarea
                  value={formNote}
                  disabled={isEditingPaidExpense}
                  onChange={(event) => setFormNote(event.target.value)}
                  placeholder="Informações adicionais sobre a conta..."
                  className="min-h-24 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40 disabled:bg-slate-100 dark:bg-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 dark:text-slate-500"
                />
              </div>

              {formLaunchType === "installment" && !editingExpenseId && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
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
                        className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      As parcelas são geradas a cada 30 dias e podem ser
                      ajustadas antes de salvar.
                    </p>
                  </div>

                  {installmentPreview.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {installmentPreview.map((installment) => (
                        <div
                          key={installment.id}
                          className="grid gap-3 rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 md:grid-cols-[120px_1fr_1fr]"
                        >
                          <div className="flex items-center text-sm font-black text-slate-700 dark:text-slate-300">
                            Parcela {installment.installmentNumber}
                          </div>

                          <input
                            value={installment.amount}
                            onChange={(event) =>
                              updateInstallmentAmount(
                                installment.id,
                                event.target.value,
                              )
                            }
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {expenseFormError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-bold text-red-700">
                  {expenseFormError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-between">
              <div className="flex flex-col gap-3 md:flex-row">
                {editingExpenseId && (
                  <button
                    type="button"
                    onClick={openDeleteExpenseConfirmation}
                    className="rounded-xl bg-red-50 dark:bg-red-950/30 px-5 py-3 text-sm font-bold text-red-700 shadow-sm ring-1 ring-red-200 dark:ring-red-900/60 transition hover:bg-red-100 dark:hover:bg-red-900/40"
                  >
                    Excluir
                  </button>
                )}

                {isEditingPaidExpense && (
                  <button
                    type="button"
                    onClick={openPaymentReversalConfirmation}
                    className="rounded-xl bg-amber-50 dark:bg-amber-950/30 px-5 py-3 text-sm font-bold text-amber-700 shadow-sm ring-1 ring-amber-200 dark:ring-amber-900/60 transition hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Voltar para pendente
                  </button>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={saveExpense}
                  className="rounded-xl bg-orange-50 dark:bg-orange-950/300 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTenantCreateOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:p-4">
          <div className="flex max-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 md:max-h-[94vh] md:rounded-3xl">
            <div className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 md:px-8">
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
                  type="button"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    onChange={(event) => {
                      setCnpjSearchError("");
                      updateTenantFormData(
                        "cpf",
                        formatDocument(
                          event.target.value,
                          tenantFormData.personType,
                        ),
                      );
                    }}
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
                    maxLength={
                      tenantFormData.personType === "Company" ? 18 : 14
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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

                  {cnpjSearchError &&
                    tenantFormData.personType === "Company" && (
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
                      updateTenantFormData(
                        "phone",
                        formatPhone(event.target.value),
                      )
                    }
                    placeholder="Ex: (69) 99999-0000"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30/50 dark:bg-orange-950/30 px-5 py-4 transition hover:bg-orange-50 dark:bg-orange-950/30 dark:hover:bg-orange-950/40">
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
                      className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                      updateTenantFormData(
                        "state",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="UF"
                    maxLength={2}
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/40"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 md:flex-row md:justify-end md:px-8">
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

      {expensePendingPaymentReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
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
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
                  aria-label="Fechar pagamento"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {expensePendingPaymentReceipt.description}
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Valor original:{" "}
                  <strong>
                    {formatCurrency(expensePendingPaymentReceipt.amount)}
                  </strong>
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
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

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={closePayExpenseModal}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmPayExpense}
                className="rounded-xl bg-orange-50 dark:bg-orange-950/300 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
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
        />
      )}

      {isReportOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6">
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
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
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

                <div className="grid gap-3 md:grid-cols-5">
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
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                        reportDueFilter === filter
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80"
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
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={viewAccountsPayableReport}
                className="rounded-xl bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
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
  value: React.ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">
        {title}
      </p>

      <h2
        className={`mt-2 text-2xl font-black ${
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
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
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
            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-50 dark:bg-orange-950/300 hover:bg-orange-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
