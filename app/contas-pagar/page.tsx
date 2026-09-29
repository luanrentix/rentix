"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ArrowDownCircle, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getPayableAccounts,
  createPayableAccount,
  updatePayableAccount,
  deletePayableAccount,
  payAccount,
  reversePaidAccount,
  type PayableAccount,
} from "@/services/financial.service";
import { getPeople, type Person } from "@/services/people.service";
import { getProperties, type Property as ApiProperty } from "@/services/properties.service";
import { getCachedCompanySettings } from "@/services/settings-cache";
import {
  Expense,
  ExpenseFilterStatus,
  ExpenseLaunchType,
  ExpensePeriodShortcut,
  PaymentMethod,
  Tenant,
  Property,
  getStartOfCurrentMonth,
  getEndOfCurrentMonth,
  isDateInsideRange,
  normalizeSearchText,
  mapUiPaymentMethodToApi,
  mapApiPaymentMethodToUi,
} from "@/components/contas-pagar/payable-types";
import { PayableKpis } from "@/components/contas-pagar/payable-kpis";
import { PayableFilters } from "@/components/contas-pagar/payable-filters";
import { PayableTable } from "@/components/contas-pagar/payable-table";
import { PayableMobileCards } from "@/components/contas-pagar/payable-mobile-cards";
import { PayablePaymentModal } from "@/components/contas-pagar/modals/payable-payment-modal";
import { PayableFormModal } from "@/components/contas-pagar/modals/payable-form-modal";
import { PayableDeleteModal } from "@/components/contas-pagar/modals/payable-delete-modal";
import { PayableHistoryModal } from "@/components/contas-pagar/modals/payable-history-modal";
import { PersonSelectModal } from "@/components/contas-receber/modals/person-select-modal";
import { generateExpensePaymentReceipt } from "./printing";

export default function ContasPagarPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  // Estados principais
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [people, setPeople] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseFilterStatus>("Pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedPersonId, setSelectedPersonId] = useState("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");
  const [periodShortcut, setPeriodShortcut] = useState<ExpensePeriodShortcut>("CurrentMonth");
  const [startDate, setStartDate] = useState(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState(getEndOfCurrentMonth());
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modais
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPersonFilterModalOpen, setIsPersonFilterModalOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState<"delete" | "reversal">("delete");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Mapear dados da API para o tipo de domínio Expense
  function mapApiExpense(item: PayableAccount): Expense {
    const rawPayments = item.payments || [];
    const payments = rawPayments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      method: mapApiPaymentMethodToUi(p.method),
      interest: Number(p.interest || 0),
      discount: Number(p.discount || 0),
      amountPaid: Number(p.amountPaid || 0),
      note: p.note || null,
      paymentItems: Array.isArray((p as any).paymentItems)
        ? (p as any).paymentItems.map((pi: any) => ({
            method: mapApiPaymentMethodToUi(pi.method),
            amount: Number(pi.amount || 0),
          }))
        : null,
    }));

    const amount = Number(item.amount || 0);
    const paidSum = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const discountSum = payments.reduce((sum, p) => sum + p.discount, 0);
    const interestSum = payments.reduce((sum, p) => sum + p.interest, 0);
    const totalSettled = paidSum + discountSum - interestSum;

    const isPaid = totalSettled >= amount - 0.001 && amount > 0;
    const isOverdue =
      !isPaid &&
      item.dueDate &&
      item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);

    const status = isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending";

    return {
      id: item.id,
      companyId: item.companyId,
      personId: item.personId,
      propertyId: item.propertyId,
      personName: item.personName,
      description: item.description,
      category: item.category,
      note: item.note,
      amount,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      status,
      manual: item.manual,
      installmentNumber: item.installmentNumber,
      installmentTotal: item.installmentTotal,
      installmentGroupId: item.installmentGroupId,
      payments,
      property: item.property
        ? { id: item.property.id, title: item.property.title }
        : null,
    };
  }

  // Cálculos de saldo de cada conta
  const getExpensePaidAmount = useCallback((expense: Expense) => {
    const payments = expense.payments || [];
    const total = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    return total || (expense.status === "Paid" ? expense.amount : 0);
  }, []);

  const getExpenseRemainingAmount = useCallback((expense: Expense) => {
    if (expense.status === "Paid" && (!expense.payments || expense.payments.length === 0)) {
      return 0;
    }
    const payments = expense.payments || [];
    const settled = payments.reduce(
      (sum, p) => sum + p.amountPaid + p.discount - p.interest,
      0
    );
    return Math.max(0, expense.amount - settled);
  }, []);

  // Carregar dados
  const loadData = useCallback(async (currentCompanyId: string) => {
    try {
      setErrorMessage("");
      const [apiExpenses, apiPeople, apiProperties] = await Promise.all([
        getPayableAccounts(currentCompanyId),
        getPeople(currentCompanyId),
        getProperties(currentCompanyId),
      ]);

      setExpenses(apiExpenses.map(mapApiExpense));
      setPeople(
        apiPeople.map((p) => ({
          id: p.id,
          name: p.name,
          document: p.document,
          phone: p.phone,
          email: p.email,
        }))
      );
      setProperties(
        apiProperties.map((prop) => ({
          id: prop.id,
          title: prop.title,
          code: prop.code,
        }))
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao carregar contas a pagar."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    loadData(companyId);
  }, [companyId, loadData]);

  // Alteração de atalho de período
  function handlePeriodShortcutChange(nextShortcut: ExpensePeriodShortcut) {
    setPeriodShortcut(nextShortcut);
    const now = new Date();

    if (nextShortcut === "CurrentMonth") {
      setStartDate(getStartOfCurrentMonth());
      setEndDate(getEndOfCurrentMonth());
    } else if (nextShortcut === "CurrentQuarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      setStartDate(new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), qMonth + 3, 0).toISOString().slice(0, 10));
    } else if (nextShortcut === "CurrentYear") {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10));
    } else if (nextShortcut === "All") {
      setStartDate("");
      setEndDate("");
    }
  }

  function handleResetFilters() {
    setSearch("");
    setStatusFilter("Pending");
    setCategoryFilter("all");
    setSelectedPersonId("all");
    setSelectedPropertyId("all");
    handlePeriodShortcutChange("All");
  }

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "Pending" ||
    categoryFilter !== "all" ||
    selectedPersonId !== "all" ||
    selectedPropertyId !== "all" ||
    periodShortcut !== "CurrentMonth";

  // Filtragem de despesas
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Filtro de status
      if (statusFilter !== "All" && expense.status !== statusFilter) {
        return false;
      }

      // Filtro de fornecedor
      if (selectedPersonId !== "all" && expense.personId !== selectedPersonId) {
        return false;
      }

      // Filtro de bem / imóvel
      if (selectedPropertyId === "none" && expense.propertyId) {
        return false;
      }
      if (
        selectedPropertyId !== "all" &&
        selectedPropertyId !== "none" &&
        expense.propertyId !== selectedPropertyId
      ) {
        return false;
      }

      // Filtro de categoria
      if (categoryFilter !== "all" && expense.category !== categoryFilter) {
        return false;
      }

      // Filtro de data / período (usa data de vencimento)
      if (!isDateInsideRange(expense.dueDate, startDate, endDate)) {
        return false;
      }

      // Busca textual
      if (search.trim()) {
        const query = normalizeSearchText(search);
        const desc = normalizeSearchText(expense.description);
        const person = normalizeSearchText(expense.personName);
        const cat = normalizeSearchText(expense.category);
        const note = normalizeSearchText(expense.note);
        const propTitle = normalizeSearchText(expense.property?.title);

        const matches =
          desc.includes(query) ||
          person.includes(query) ||
          cat.includes(query) ||
          note.includes(query) ||
          propTitle.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    expenses,
    statusFilter,
    selectedPersonId,
    selectedPropertyId,
    categoryFilter,
    startDate,
    endDate,
    search,
  ]);

  // Ações de Modais
  function handleOpenPayment(expense: Expense) {
    setSelectedExpense(expense);
    setIsPaymentModalOpen(true);
  }

  function handleOpenEdit(expense: Expense) {
    setSelectedExpense(expense);
    setIsFormModalOpen(true);
  }

  function handleOpenCreate() {
    setSelectedExpense(null);
    setIsFormModalOpen(true);
  }

  function handleOpenDelete(expense: Expense) {
    setSelectedExpense(expense);
    setDeleteModalMode("delete");
    setIsDeleteModalOpen(true);
  }

  function handleOpenReversal(expense: Expense) {
    setSelectedExpense(expense);
    setDeleteModalMode("reversal");
    setIsDeleteModalOpen(true);
  }

  function handleViewPayments(expense: Expense) {
    setSelectedExpense(expense);
    setIsHistoryModalOpen(true);
  }

  // Operações de API
  async function handleConfirmPayment(data: {
    amountPaid: number;
    interest: number;
    discount: number;
    method: PaymentMethod;
    paidAt: string;
    note?: string;
    bankAccountId?: string | null;
    paymentItems?: Array<{
      method: PaymentMethod;
      amount: number;
    }>;
  }) {
    if (!selectedExpense || !companyId) return;

    const apiPaymentItems = data.paymentItems?.map((item) => ({
      method: mapUiPaymentMethodToApi(item.method),
      amount: item.amount,
    }));

    await payAccount(selectedExpense.id, {
      amountPaid: data.amountPaid,
      interest: data.interest,
      discount: data.discount,
      method: mapUiPaymentMethodToApi(data.method),
      paidAt: data.paidAt,
      note: data.note,
      bankAccountId: data.bankAccountId,
      paymentItems:
        apiPaymentItems && apiPaymentItems.length > 0 ? apiPaymentItems : undefined,
    });

    await loadData(companyId);
  }

  async function handleSaveExpense(payload: {
    personId?: string | null;
    propertyId?: string | null;
    personName?: string | null;
    description: string;
    category?: string | null;
    note?: string | null;
    amount: number;
    issueDate?: string | null;
    dueDate: string;
    launchType?: ExpenseLaunchType;
    installmentsCount?: number;
    downPaymentAmount?: number;
    installments?: Array<{
      installmentNumber?: number;
      installmentTotal?: number;
      amount: number;
      dueDate: string;
      isDownPayment?: boolean;
    }>;
  }) {
    if (!companyId) return;

    if (selectedExpense) {
      await updatePayableAccount(selectedExpense.id, {
        description: payload.description,
        amount: payload.amount,
        personId: payload.personId,
        personName: payload.personName,
        propertyId: payload.propertyId,
        category: payload.category,
        note: payload.note,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
      });
    } else if (payload.installments && payload.installments.length > 0) {
      // Salva parcelas personalizadas e editadas individualmente na grade
      const groupId = `grp_${Date.now()}`;
      for (const inst of payload.installments) {
        const descSuffix = inst.isDownPayment
          ? " (Sinal / Entrada)"
          : inst.installmentTotal && inst.installmentTotal > 1
          ? ` (${inst.installmentNumber}/${inst.installmentTotal})`
          : "";

        await createPayableAccount({
          description: `${payload.description}${descSuffix}`,
          amount: inst.amount,
          personId: payload.personId,
          personName: payload.personName,
          propertyId: payload.propertyId,
          category: payload.category,
          note: payload.note,
          issueDate: payload.issueDate,
          dueDate: inst.dueDate,
          installmentNumber: inst.installmentNumber,
          installmentTotal: inst.installmentTotal,
          installmentGroupId: groupId,
        });
      }
    } else {
      const count = payload.installmentsCount || 1;
      if (count > 1) {
        const groupId = `grp_${Date.now()}`;
        const installmentAmount = Number((payload.amount / count).toFixed(2));
        const [yearStr, monthStr, dayStr] = payload.dueDate.split("-");
        let currentYear = Number(yearStr);
        let currentMonth = Number(monthStr);
        const dueDay = Number(dayStr);

        for (let i = 1; i <= count; i++) {
          const installmentDate = new Date(currentYear, currentMonth - 1, dueDay)
            .toISOString()
            .slice(0, 10);

          await createPayableAccount({
            description: `${payload.description} (${i}/${count})`,
            amount: installmentAmount,
            personId: payload.personId,
            personName: payload.personName,
            propertyId: payload.propertyId,
            category: payload.category,
            note: payload.note,
            issueDate: payload.issueDate,
            dueDate: installmentDate,
            installmentNumber: i,
            installmentTotal: count,
            installmentGroupId: groupId,
          });

          currentMonth += 1;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear += 1;
          }
        }
      } else {
        await createPayableAccount({
          description: payload.description,
          amount: payload.amount,
          personId: payload.personId,
          personName: payload.personName,
          propertyId: payload.propertyId,
          category: payload.category,
          note: payload.note,
          issueDate: payload.issueDate,
          dueDate: payload.dueDate,
        });
      }
    }

    await loadData(companyId);
  }

  async function handleConfirmDeleteOrReversal() {
    if (!selectedExpense || !companyId) return;

    if (deleteModalMode === "delete") {
      await deletePayableAccount(selectedExpense.id);
    } else {
      await reversePaidAccount(selectedExpense.id);
    }

    await loadData(companyId);
  }

  function handlePrintReceipt(expense: Expense) {
    const lastPayment = expense.payments && expense.payments.length > 0
      ? expense.payments[0]
      : null;

    if (!lastPayment) return;

    const companySettings = getCachedCompanySettings() || {};
    generateExpensePaymentReceipt({
      expense: {
        id: expense.id,
        personName: expense.personName || "FORNECEDOR",
        description: expense.description,
        amount: expense.amount,
        dueDate: expense.dueDate,
        category: expense.category || undefined,
      },
      paymentRecord: {
        expenseId: expense.id,
        paidAt: lastPayment.paidAt,
        method: lastPayment.method,
        amountPaid: lastPayment.amountPaid,
        interest: lastPayment.interest,
        discount: lastPayment.discount,
        note: lastPayment.note || undefined,
      },
      companySettings,
      getPaymentMethodLabel: (m) => m,
      setPaymentFormError: (msg) => alert(msg),
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="text-sm font-bold text-slate-500">
          Carregando contas a pagar...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Contas a Pagar
            </h1>
            <button
              type="button"
              onClick={() => {
                if (companyId) {
                  setIsRefreshing(true);
                  loadData(companyId);
                }
              }}
              disabled={isRefreshing}
              className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 dark:border-slate-800 dark:hover:text-slate-200"
              title="Recarregar contas"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-red-600" : ""}`}
              />
            </button>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gerencie obrigações, despesas recorrentes, fornecedores e repasses no padrão Contrx.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nova Despesa
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* KPIs Interativos no Topo (Padrão Bens/Ativos) */}
      <PayableKpis
        expenses={expenses}
        selectedFilter={statusFilter}
        onSelectFilter={setStatusFilter}
        getExpenseRemainingAmount={getExpenseRemainingAmount}
        getExpensePaidAmount={getExpensePaidAmount}
      />

      {/* Card de Busca e Filtros Rápidos (Container rounded-3xl) */}
      <PayableFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        selectedPersonId={selectedPersonId}
        onPersonChange={setSelectedPersonId}
        onOpenPersonSelectModal={() => setIsPersonFilterModalOpen(true)}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={setSelectedPropertyId}
        periodShortcut={periodShortcut}
        onPeriodShortcutChange={handlePeriodShortcutChange}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        people={people}
        properties={properties}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Visualização de Tabela Desktop vs Cards Mobile */}
      {viewMode === "table" ? (
        <>
          <div className="hidden lg:block">
            <PayableTable
              expenses={filteredExpenses}
              people={people}
              onOpenPaymentModal={handleOpenPayment}
              onOpenEditModal={handleOpenEdit}
              onOpenDeleteModal={handleOpenDelete}
              onOpenReversalModal={handleOpenReversal}
              onPrintReceipt={handlePrintReceipt}
              onViewPayments={handleViewPayments}
              getExpenseRemainingAmount={getExpenseRemainingAmount}
              getExpensePaidAmount={getExpensePaidAmount}
            />
          </div>
          <div className="block lg:hidden">
            <PayableMobileCards
              expenses={filteredExpenses}
              people={people}
              onOpenPaymentModal={handleOpenPayment}
              onOpenEditModal={handleOpenEdit}
              onOpenDeleteModal={handleOpenDelete}
              onOpenReversalModal={handleOpenReversal}
              onPrintReceipt={handlePrintReceipt}
              onViewPayments={handleViewPayments}
              getExpenseRemainingAmount={getExpenseRemainingAmount}
              getExpensePaidAmount={getExpensePaidAmount}
            />
          </div>
        </>
      ) : (
        <PayableMobileCards
          expenses={filteredExpenses}
          people={people}
          onOpenPaymentModal={handleOpenPayment}
          onOpenEditModal={handleOpenEdit}
          onOpenDeleteModal={handleOpenDelete}
          onOpenReversalModal={handleOpenReversal}
          onPrintReceipt={handlePrintReceipt}
          onViewPayments={handleViewPayments}
          getExpenseRemainingAmount={getExpenseRemainingAmount}
          getExpensePaidAmount={getExpensePaidAmount}
        />
      )}

      {/* Modais */}
      <PayablePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        remainingAmount={
          selectedExpense ? getExpenseRemainingAmount(selectedExpense) : 0
        }
        onConfirmPayment={handleConfirmPayment}
      />

      <PayableFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedExpense(null);
        }}
        editingExpense={selectedExpense}
        people={people}
        properties={properties}
        companyId={companyId}
        onSave={handleSaveExpense}
      />

      <PayableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        mode={deleteModalMode}
        onConfirm={handleConfirmDeleteOrReversal}
      />

      <PayableHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
      />

      {/* Modal de Busca Rápida de Fornecedores / Favorecidos para Filtro */}
      <PersonSelectModal
        isOpen={isPersonFilterModalOpen}
        onClose={() => setIsPersonFilterModalOpen(false)}
        people={people}
        companyId={companyId}
        selectedPersonId={selectedPersonId}
        onSelectPerson={(person) => {
          setSelectedPersonId(person ? person.id : "all");
        }}
        onPersonCreated={(newPerson) => {
          setPeople((prev) => [newPerson, ...prev]);
          setSelectedPersonId(newPerson.id);
        }}
        title="Selecionar Fornecedor / Favorecido"
      />
    </div>
  );
}
