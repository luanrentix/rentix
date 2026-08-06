"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  CheckCircle2,
  Trash2,
  Edit2,
  Loader2,
  X,
  Building2,
  Search,
  Power,
  AlertCircle,
  Save,
  MinusCircle,
  Printer,
  Share2
} from "lucide-react";
import {
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBankTransactions,
  createBankTransaction,
  deleteBankTransaction,
  reconcileBankTransaction,
  transferBalance,
  shareBankStatement,
  type BankAccount,
  type BankTransaction,
  type BankAccountType,
  type BankTransactionType,
  type BankTransactionStatus
} from "@/services/bancos.service";
import { openWhatsAppMessage } from "@/services/whatsapp.service";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageItem } from "@/services/company-storage";
import { brazilianBanks, type BrazilianBank } from "@/lib/brazilian-banks";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/currency";
import { getPeople, type Person } from "@/services/people.service";

type LaunchTab = "DESPESA" | "RECEITA" | "TRANSFERENCIA";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function BancosPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  // Data states
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters - default start date to first day of current month, end date to today
  type PeriodShortcut = "CurrentMonth" | "CurrentQuarter" | "CurrentYear" | "All";
  const [periodShortcut, setPeriodShortcut] = useState<PeriodShortcut>("CurrentMonth");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [limit, setLimit] = useState(30);

  // Modals state
  const [isAccountsListModalOpen, setIsAccountsListModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLineIndex, setNewCategoryLineIndex] = useState<number | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [inactiveCategories, setInactiveCategories] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [keepModalOpen, setKeepModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");
  const [peopleList, setPeopleList] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  
  // Institution search state
  const [isBankSearchOpen, setIsBankSearchOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; type?: 'error' | 'success' | 'warning' } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{ title: string; message: string; onConfirm: () => void; isDanger?: boolean } | null>(null);

  const statementTotals = useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === "INFLOW") {
        inflows += amt;
      } else if (tx.type === "OUTFLOW") {
        outflows += amt;
      }
    });
    return {
      inflows,
      outflows,
      balance: inflows - outflows,
    };
  }, [transactions]);

  const defaultCategories = useMemo(() => [
    "ALUGUEL",
    "SALÁRIO",
    "SERVIÇOS",
    "MANUTENÇÃO",
    "FORNECEDORES",
    "IMPOSTOS",
    "VENDAS",
    "RENDIMENTOS",
    "TRANSFERÊNCIA",
    "OUTROS"
  ], []);

  const allCategories = useMemo(() => {
    const categoriesSet = new Set<string>(defaultCategories);

    customCategories.forEach((cat) => {
      if (cat.trim()) categoriesSet.add(cat.trim().toUpperCase());
    });

    transactions.forEach((tx) => {
      if (tx.category && tx.category.trim()) {
        categoriesSet.add(tx.category.trim().toUpperCase());
      }
    });

    return Array.from(categoriesSet)
      .filter((cat) => !inactiveCategories.includes(cat))
      .sort();
  }, [customCategories, transactions, defaultCategories, inactiveCategories]);

  const allCategoriesWithStatus = useMemo(() => {
    const categoriesSet = new Set<string>(defaultCategories);

    customCategories.forEach((cat) => {
      if (cat.trim()) categoriesSet.add(cat.trim().toUpperCase());
    });

    transactions.forEach((tx) => {
      if (tx.category && tx.category.trim()) {
        categoriesSet.add(tx.category.trim().toUpperCase());
      }
    });

    return Array.from(categoriesSet)
      .map((cat) => ({
        name: cat,
        active: !inactiveCategories.includes(cat)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customCategories, transactions, defaultCategories, inactiveCategories]);

  const showAlert = (message: string, title: string = "Aviso", type: 'error' | 'success' | 'warning' = "warning") => {
    setCustomAlert({ title, message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = "Confirmar Ação", isDanger: boolean = false) => {
    setCustomConfirm({ title, message, onConfirm, isDanger });
  };

  // Form states with formatted currency inputs
  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "CHECKING" as BankAccountType,
    agency: "",
    accountNumber: "",
    initialBalanceStr: "R$ 0,00",
    limitStr: "R$ 0,00",
    currency: "BRL",
    bankCode: "",
    bankName: "",
    active: true
  });

  // Unified "Novo Lançamento" form states
  const [activeTab, setActiveTab] = useState<LaunchTab>("DESPESA");
  const [launchForm, setLaunchForm] = useState({
    bankAccountId: "",
    originBankAccountId: "",
    destinationBankAccountId: "",
    amountStr: "R$ 0,00",
    feeStr: "R$ 0,00",
    date: new Date().toISOString().slice(0, 10),
    reconciled: true,
    description: "",
    documentNumber: "",
    categories: [{ category: "", amountStr: "R$ 0,00" }]
  });

  // Load all banking data
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError("");
    try {
      const [apiAccounts, apiTransactions, apiPeople] = await Promise.all([
        getBankAccounts(),
        getBankTransactions({
          bankAccountId: filterAccount || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          type: filterType || undefined,
          status: filterStatus || undefined,
          category: filterCategory || undefined,
          take: limit
        }),
        getPeople(companyId)
      ]);
      setAccounts(apiAccounts);
      setTransactions(apiTransactions);
      setPeopleList(apiPeople);
    } catch {
      setError("Não foi possível carregar os dados financeiros bancários.");
    } finally {
      setIsLoading(false);
    }
  }, [
    companyId,
    filterAccount,
    filterStartDate,
    filterEndDate,
    filterType,
    filterStatus,
    filterCategory,
    limit
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered banks for search
  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return brazilianBanks.slice(0, 20);
    const query = bankSearchQuery.toLowerCase();
    return brazilianBanks.filter(
      (b) => b.code.includes(query) || b.name.toLowerCase().includes(query)
    );
  }, [bankSearchQuery]);

  // Handle Account actions
  const handleOpenAccountModal = (acc?: BankAccount) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountForm({
        name: acc.name,
        type: acc.type,
        agency: acc.agency || "",
        accountNumber: acc.accountNumber || "",
        initialBalanceStr: formatCurrencyInput((Number(acc.initialBalance) * 100).toFixed(0)),
        limitStr: formatCurrencyInput((Number(acc.limit) * 100).toFixed(0)),
        currency: acc.currency,
        bankCode: acc.bankCode || "",
        bankName: acc.bankName || "",
        active: acc.active
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: "",
        type: "CHECKING",
        agency: "",
        accountNumber: "",
        initialBalanceStr: "R$ 0,00",
        limitStr: "R$ 0,00",
        currency: "BRL",
        bankCode: "",
        bankName: "",
        active: true
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const initialBalance = parseCurrencyToNumber(accountForm.initialBalanceStr);
      const limit = parseCurrencyToNumber(accountForm.limitStr);

      const normalizedForm = {
        name: accountForm.name.toUpperCase(),
        type: accountForm.type,
        agency: accountForm.agency ? accountForm.agency.toUpperCase() : "",
        accountNumber: accountForm.accountNumber ? accountForm.accountNumber.toUpperCase() : "",
        bankCode: accountForm.bankCode,
        bankName: accountForm.bankName ? accountForm.bankName.toUpperCase() : "",
        currency: accountForm.currency ? accountForm.currency.toUpperCase() : "BRL",
        initialBalance,
        limit,
        active: accountForm.active
      };

      if (normalizedForm.active === false) {
        const currentBalance = editingAccount ? Number(editingAccount.currentBalance) : initialBalance;
        if (currentBalance !== 0) {
          showAlert(`A conta só pode ser inativada se o saldo estiver zerado. Saldo atual: ${formatCurrency(currentBalance, normalizedForm.currency)}`, "Aviso", "warning");
          setIsSaving(false);
          return;
        }
      }

      if (editingAccount) {
        await updateBankAccount(editingAccount.id, normalizedForm);
      } else {
        await createBankAccount(normalizedForm);
      }
      setIsAccountModalOpen(false);
      setIsAccountsListModalOpen(true);
      loadData();
    } catch (err) {
      showAlert(getErrorMessage(err, "Erro ao salvar conta bancária."), "Erro", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActiveAccount = async (acc: BankAccount) => {
    if (acc.active) {
      const currentBalance = Number(acc.currentBalance);
      if (currentBalance !== 0) {
        showAlert(`A conta só pode ser inativada se o saldo estiver zerado. Saldo atual: ${formatCurrency(currentBalance, acc.currency)}`, "Aviso", "warning");
        return;
      }
    }
    const actionText = acc.active ? "inativar/inutilizar" : "ativar";
    showConfirm(
      `Deseja realmente ${actionText} a conta "${acc.name}"?`,
      async () => {
        try {
          await updateBankAccount(acc.id, { active: !acc.active });
          loadData();
        } catch (err) {
          showAlert(getErrorMessage(err, "Erro ao alterar status da conta."), "Erro", "error");
        }
      },
      "Confirmar Ação",
      acc.active
    );
  };

  const handleDeleteAccount = async (id: string) => {
    showConfirm(
      "Tem certeza que deseja excluir esta conta? Todas as movimentações vinculadas serão apagadas permanentemente.",
      async () => {
        try {
          await deleteBankAccount(id);
          loadData();
        } catch (err) {
          showAlert(getErrorMessage(err, "Erro ao excluir conta bancária."), "Erro", "error");
        }
      },
      "Excluir Conta?",
      true
    );
  };

  const handleShareWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharePhone) {
      showAlert("Informe o número do WhatsApp.", "Aviso", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const res = await shareBankStatement({
        bankAccountId: filterAccount || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        type: filterType || undefined,
        status: filterStatus || undefined,
        category: filterCategory || undefined,
      });

      const url = window.location.origin + "/extrato-compartilhado/" + res.id;
      const message = `Olá! Segue o link com o extrato financeiro solicitado (válido por 7 dias):\n\n${url}`;

      openWhatsAppMessage({
        phone: sharePhone,
        message,
      });
      setIsShareModalOpen(false);
      setSelectedPersonId("");
    } catch (err) {
      showAlert(getErrorMessage(err, "Erro ao gerar link de compartilhamento."), "Erro", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Split transaction categories logic
  const handleAddCategoryLine = () => {
    setLaunchForm({
      ...launchForm,
      categories: [...launchForm.categories, { category: "", amountStr: "R$ 0,00" }]
    });
  };

  const handleRemoveCategoryLine = (index: number) => {
    const updated = [...launchForm.categories];
    updated.splice(index, 1);
    setLaunchForm({
      ...launchForm,
      categories: updated
    });
  };

  const handleCategoryLineChange = (index: number, field: "category" | "amountStr", value: string) => {
    const updated = [...launchForm.categories];
    if (field === "amountStr") {
      updated[index][field] = formatCurrencyInput(value);
    } else {
      updated[index][field] = value.toUpperCase();
    }
    setLaunchForm({
      ...launchForm,
      categories: updated
    });
  };

  // Calculate sum of split category lines
  const categoriesSum = useMemo(() => {
    return launchForm.categories.reduce((sum, item) => sum + parseCurrencyToNumber(item.amountStr), 0);
  }, [launchForm.categories]);

  // Handle submit for the unified Launch Transaction Modal
  const handleConfirmLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const amount = parseCurrencyToNumber(launchForm.amountStr);
    if (amount <= 0) {
      showAlert("O valor do lançamento deve ser maior do que zero.", "Aviso", "warning");
      setIsSaving(false);
      return;
    }

    try {
      if (editingTransaction) {
        // Delete old transaction first (reverting balance) before creating updated one
        await deleteBankTransaction(editingTransaction.id);
      }

      if (activeTab === "TRANSFERENCIA") {
        if (!launchForm.originBankAccountId || !launchForm.destinationBankAccountId) {
          showAlert("Selecione as contas de origem e destino.", "Aviso", "warning");
          setIsSaving(false);
          return;
        }
        const fee = parseCurrencyToNumber(launchForm.feeStr);
        await transferBalance({
          originBankAccountId: launchForm.originBankAccountId,
          destinationBankAccountId: launchForm.destinationBankAccountId,
          amount,
          fee,
          description: launchForm.description.toUpperCase() || "TRANSFERÊNCIA BANCÁRIA",
          date: launchForm.date
        });
      } else {
        if (!launchForm.bankAccountId) {
          showAlert("Selecione uma conta financeira.", "Aviso", "warning");
          setIsSaving(false);
          return;
        }
        
        const type: BankTransactionType = activeTab === "RECEITA" ? "INFLOW" : "OUTFLOW";
        const status: BankTransactionStatus = launchForm.reconciled ? "CONFIRMED" : "PENDING";
        const categoryVal = launchForm.categories[0]?.category.toUpperCase() || "DIVERSOS";

        // Create the primary transaction
        await createBankTransaction(launchForm.bankAccountId, {
          type,
          status,
          amount,
          description: launchForm.description.toUpperCase(),
          competenceDate: launchForm.date,
          paymentDate: launchForm.reconciled ? launchForm.date : undefined,
          category: categoryVal
        });

        // If split lines exist beyond the first, we can create them as secondary transactions
        if (launchForm.categories.length > 1) {
          for (let i = 1; i < launchForm.categories.length; i++) {
            const line = launchForm.categories[i];
            const lineAmount = parseCurrencyToNumber(line.amountStr);
            if (lineAmount > 0) {
              await createBankTransaction(launchForm.bankAccountId, {
                type,
                status,
                amount: lineAmount,
                description: `${launchForm.description.toUpperCase()} (DESMEMBRADO)`,
                competenceDate: launchForm.date,
                paymentDate: launchForm.reconciled ? launchForm.date : undefined,
                category: line.category.toUpperCase() || categoryVal
              });
            }
          }
        }
      }

      // Reset form
      if (keepModalOpen) {
        setLaunchForm((prev) => ({
          ...prev,
          amountStr: "R$ 0,00",
          feeStr: "R$ 0,00",
          description: "",
          documentNumber: "",
          categories: [{ category: "", amountStr: "R$ 0,00" }]
        }));
      } else {
        handleCloseTransactionModal();
      }
      loadData();
    } catch (err) {
      showAlert(getErrorMessage(err, "Erro ao realizar o lançamento financeiro."), "Erro", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetLaunchForm = () => {
    setEditingTransaction(null);
    setLaunchForm({
      bankAccountId: "",
      originBankAccountId: "",
      destinationBankAccountId: "",
      amountStr: "R$ 0,00",
      feeStr: "R$ 0,00",
      date: new Date().toISOString().slice(0, 10),
      reconciled: true,
      description: "",
      documentNumber: "",
      categories: [{ category: "", amountStr: "R$ 0,00" }]
    });
  };

  const handleOpenNewTransactionModal = (tab: LaunchTab = "DESPESA") => {
    resetLaunchForm();
    setActiveTab(tab);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    resetLaunchForm();
  };

  const handleOpenEditTransactionModal = (tx: BankTransaction) => {
    setEditingTransaction(tx);
    const tabType = tx.type === "INFLOW" ? "RECEITA" : "DESPESA";
    const isTransfer = tx.referenceType === "TRANSFER" || tx.transferGroupId;
    const finalTab = isTransfer ? "TRANSFERENCIA" : tabType;

    setLaunchForm({
      bankAccountId: tx.bankAccountId || "",
      originBankAccountId: tx.referenceType === "TRANSFER" && tx.type === "OUTFLOW" ? tx.bankAccountId : (tx.referenceId || ""),
      destinationBankAccountId: tx.referenceType === "TRANSFER" && tx.type === "INFLOW" ? tx.bankAccountId : (tx.referenceId || ""),
      amountStr: formatCurrencyInput((tx.amount * 100).toString()),
      feeStr: formatCurrencyInput(((tx.fee || 0) * 100).toString()),
      date: new Date(tx.competenceDate).toISOString().slice(0, 10),
      reconciled: tx.status === "CONFIRMED",
      description: tx.description || "",
      documentNumber: "",
      categories: [{ category: tx.category || "", amountStr: formatCurrencyInput((tx.amount * 100).toString()) }]
    });

    setActiveTab(finalTab as LaunchTab);
    setIsTransactionModalOpen(true);
  };

  const handleReconcileTransaction = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    showConfirm(
      `Deseja liquidar este lançamento com a data de hoje (${new Date().toLocaleDateString("pt-BR")})?`,
      async () => {
        try {
          await reconcileBankTransaction(id, today);
          loadData();
        } catch (err) {
          showAlert(getErrorMessage(err, "Erro ao conciliar movimentação."), "Erro", "error");
        }
      },
      "Liquidar Lançamento"
    );
  };

  // Select a bank from the search list
  const handleSelectBank = (bank: BrazilianBank) => {
    setAccountForm({
      ...accountForm,
      bankCode: bank.code,
      bankName: bank.name
    });
    setIsBankSearchOpen(false);
  };

  // Helper to handle Period Shortcut updates (same rule as Financeiro module)
  const updatePeriodShortcut = (nextShortcut: "CurrentMonth" | "CurrentQuarter" | "CurrentYear" | "All") => {
    setPeriodShortcut(nextShortcut);
    const now = new Date();

    if (nextShortcut === "CurrentMonth") {
      setFilterStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
      return;
    }

    if (nextShortcut === "CurrentQuarter") {
      const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
      setFilterStartDate(new Date(now.getFullYear(), currentQuarterMonth, 1).toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
      return;
    }

    if (nextShortcut === "CurrentYear") {
      setFilterStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
      return;
    }

    if (nextShortcut === "All") {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

  // Consolidated balance calculation (actual balance of active bank accounts)
  const consolidatedBalance = useMemo(() => {
    return accounts
      .filter((acc) => acc.active && (!filterAccount || acc.id === filterAccount))
      .reduce((sum, acc) => sum + Number(acc.currentBalance), 0);
  }, [accounts, filterAccount]);

  const totalCreditLimit = useMemo(() => {
    return accounts
      .filter((acc) => acc.active && (!filterAccount || acc.id === filterAccount))
      .reduce((sum, acc) => sum + Number(acc.limit), 0);
  }, [accounts, filterAccount]);

  const totalInflowsMonth = useMemo(() => {
    return transactions
      .filter((t) => t.type === "INFLOW" && t.status === "CONFIRMED")
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const totalOutflowsMonth = useMemo(() => {
    return transactions
      .filter((t) => t.type === "OUTFLOW" && t.status === "CONFIRMED")
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const formatCurrency = (val: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency
    }).format(val);
  };

  // Theme support
  const [themeMode, setThemeMode] = useState("light");
  useEffect(() => {
    if (!companyId) return;
    const mode = getCompanyStorageItem(companyId, "contrx_theme_mode") || "light";
    setThemeMode(mode);
  }, [companyId]);

  // Calculando saldos progressivos para o extrato de impressão
  const transactionsWithSaldos: (BankTransaction & { saldoAfter?: number })[] = [...transactions];
  let currentAccumulated = consolidatedBalance;
  for (let i = 0; i < transactionsWithSaldos.length; i++) {
    transactionsWithSaldos[i] = {
      ...transactionsWithSaldos[i],
      saldoAfter: currentAccumulated
    };
    const amount = Number(transactionsWithSaldos[i].amount);
    if (transactionsWithSaldos[i].type === "INFLOW") {
      currentAccumulated -= amount;
    } else {
      currentAccumulated += amount;
    }
  }
  const saldoAnterior = currentAccumulated;

  const debitosAConfirmar = transactions
    .filter(tx => tx.type === "OUTFLOW" && tx.status === "PENDING")
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const creditosAConfirmar = transactions
    .filter(tx => tx.type === "INFLOW" && tx.status === "PENDING")
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const saldoTotalComPendentes = consolidatedBalance + creditosAConfirmar - debitosAConfirmar;

  const activeAccount = accounts.find(acc => acc.id === filterAccount);
  const correntistaNome = activeAccount ? activeAccount.name : "CONSOLIDADO (TODAS AS CONTAS)";
  const contaNumero = activeAccount && activeAccount.accountNumber ? activeAccount.accountNumber : "—";
  const agenciaNumero = activeAccount && activeAccount.agency ? activeAccount.agency : "—";

  const handlePrint = () => {
    const printContent = document.getElementById("print-layout-exclusivo")?.innerHTML;
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Extrato de Conta Bancária</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @page {
              size: auto;
              margin: 10mm !important;
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              padding: 0;
              margin: 0;
              background: white;
              color: #0f172a;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 15px !important;
            }
            th {
              border-bottom: 2.5px solid #475569 !important;
              color: #0f172a !important;
              font-weight: 800 !important;
              padding: 10px 6px !important;
              text-transform: uppercase !important;
              font-size: 11px !important;
            }
            td {
              border-bottom: 1px solid #e2e8f0 !important;
              padding: 10px 6px !important;
              color: #1e293b !important;
              font-size: 12px !important;
            }
            tfoot tr {
              background-color: #f8fafc !important;
              font-weight: bold !important;
            }
            tfoot td {
              border-top: 2.5px solid #94a3b8 !important;
              border-bottom: none !important;
              padding: 12px 6px !important;
            }
            .text-red-600 {
              color: #e11d48 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .text-emerald-600 {
              color: #059669 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%;">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.frameElement.remove();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const contrxPrintStyle = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-statement-section, #print-statement-section * {
        visibility: visible;
      }
    }

    @media (min-width: 768px) {
      .grid-filtros-fixo {
        display: grid !important;
        grid-template-columns: repeat(6, 1fr) !important;
        gap: 0.75rem !important;
      }
      .grid-metricas-fixo {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1rem !important;
      }
      .grid-conteudo-fixo {
        display: grid !important;
        grid-template-columns: 1fr 3fr !important;
        gap: 1.5rem !important;
      }
      .coluna-esquerda-fixa {
        grid-column: span 1 !important;
      }
      .coluna-direita-fixa {
        grid-column: span 1 !important;
      }
      .tabela-desktop-fixa {
        display: block !important;
      }
      .cards-mobile-fixo {
        display: none !important;
      }
    }

    @media (max-width: 767px) {
      .grid-filtros-fixo {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 0.75rem !important;
      }
      .grid-metricas-fixo {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 1rem !important;
      }
      .grid-conteudo-fixo {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 1.5rem !important;
      }
      .tabela-desktop-fixa {
        display: none !important;
      }
      .cards-mobile-fixo {
        display: block !important;
      }
    }
  `;

  return (
    <div data-contrx-theme={themeMode} className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: contrxPrintStyle }} />
      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Controle Bancário
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Gerencie contas correntes, caixas físicos, conciliação e transferências de saldo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleOpenNewTransactionModal("TRANSFERENCIA")}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <ArrowLeftRight className="h-4 w-4 text-orange-500" />
            Transferir
          </button>
          <button
            onClick={() => handleOpenNewTransactionModal("DESPESA")}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Lançar Movimento
          </button>
          <button
            onClick={() => setIsAccountsListModalOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-sm hover:bg-orange-600 transition"
          >
            + Conta Financeira
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Top Filter Card */}
      <div 
        className="grid grid-cols-1 gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm items-end mb-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 grid-filtros-fixo no-print"
      >
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Conta</label>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="">Todas as contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {!acc.active && "(INATIVA)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Período</label>
          <select
            value={periodShortcut}
            onChange={(e) => updatePeriodShortcut(e.target.value as "CurrentMonth" | "CurrentQuarter" | "CurrentYear" | "All")}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="CurrentMonth">Mês Atual</option>
            <option value="CurrentQuarter">Trimestre Atual</option>
            <option value="CurrentYear">Ano Atual</option>
            <option value="All">Todo o Período</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Início</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => {
              setFilterStartDate(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Fim</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => {
              setFilterEndDate(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tipo e Status</label>
          <div className="grid grid-cols-2 gap-1">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-1 text-[10px] font-bold text-slate-600 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="">Tipo</option>
              <option value="INFLOW">Entradas</option>
              <option value="OUTFLOW">Saídas</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-1 text-[10px] font-bold text-slate-600 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="">Status</option>
              <option value="CONFIRMED">Liquidados</option>
              <option value="PENDING">Pendentes</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Categoria</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 cursor-pointer uppercase"
          >
            <option value="">Todas</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div 
        className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4 grid-metricas-fixo no-print"
      >
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Saldo Consolidado</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {formatCurrency(consolidatedBalance)}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Limite de Crédito Total</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {formatCurrency(totalCreditLimit)}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Entradas (Período)</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                {formatCurrency(totalInflowsMonth)}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-red-600">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Saídas (Período)</p>
              <h3 className="text-2xl font-black text-red-600 mt-0.5">
                {formatCurrency(totalOutflowsMonth)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-3xl border border-slate-100 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div 
          className="grid grid-cols-1 gap-6 sm:grid-cols-4 grid-conteudo-fixo"
        >
          {/* Left Column: Bank Accounts List */}
          <div className="space-y-4 sm:col-span-1 coluna-esquerda-fixa no-print">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-slate-900">Contas & Caixas</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                  {accounts.length} no total
                </span>
              </div>
              {accounts.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400 font-medium">
                  Nenhuma conta bancária registrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className={`group flex flex-col justify-between rounded-2xl border p-4 transition ${
                        acc.active
                          ? "border-slate-150 bg-white hover:border-orange-200"
                          : "border-slate-100 bg-slate-50/50 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {acc.name}
                            </h3>
                            {!acc.active && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">
                                Inativa
                              </span>
                            )}
                          </div>
                          {acc.bankName && (
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                              {acc.bankCode} - {acc.bankName}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                            {acc.type === "CHECKING" && "Conta Corrente"}
                            {acc.type === "SAVINGS" && "Poupança"}
                            {acc.type === "INVESTMENT" && "Investimento"}
                            {acc.type === "CASH" && "Caixa Dinheiro"}
                            {acc.agency && ` • Ag. ${acc.agency}`}
                            {acc.accountNumber && ` • C/C ${acc.accountNumber}`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-150/55 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase">Saldo Atual</p>
                          <p className={`text-base font-black ${acc.active ? "text-slate-900" : "text-slate-500"}`}>
                            {formatCurrency(Number(acc.currentBalance), acc.currency)}
                          </p>
                        </div>
                        {Number(acc.limit) > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase">Limite</p>
                            <p className="text-xs font-bold text-slate-600">
                              {formatCurrency(Number(acc.limit), acc.currency)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Statement & Filter */}
          <div 
            className="space-y-4 sm:col-span-3 coluna-direita-fixa" 
            id="print-statement-section"
          >
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm print:!border-none print:!shadow-none print:!p-0 print:!bg-transparent">
              
              {/* LAYOUT DE IMPRESSÃO EXCLUSIVO (MODELO DO USUÁRIO) */}
              <div id="print-layout-exclusivo" className="hidden print:block text-slate-900 font-sans text-xs w-full">
                {/* Cabeçalho Superior */}
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white font-black px-3 py-1 rounded text-base tracking-widest">
                      CONTRX
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Empresa</p>
                      <h2 className="text-sm font-bold uppercase text-slate-800">CONTRX PROJETOS</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">
                      Período: {filterStartDate ? new Date(filterStartDate).toLocaleDateString('pt-BR') : 'Início'} a {filterEndDate ? new Date(filterEndDate).toLocaleDateString('pt-BR') : 'Fim'}
                    </p>
                  </div>
                </div>

                {/* Subcabeçalho de Informações do Banco (Faixa Cinza) */}
                <div className="grid grid-cols-3 bg-slate-100 p-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-y border-slate-200 mb-4">
                  <div>
                    CORRENTISTA: <span className="text-slate-950 font-black">{correntistaNome}</span>
                  </div>
                  <div className="text-center">
                    CONTA NÚMERO: <span className="text-slate-950 font-black">{contaNumero}</span>
                  </div>
                  <div className="text-right">
                    AGÊNCIA: <span className="text-slate-950 font-black">{agenciaNumero}</span>
                  </div>
                </div>

                {/* Resumo Inicial (Saldo Anterior) */}
                <div className="flex justify-end mb-2 text-xs font-bold text-slate-700 pr-2">
                  <div className="flex justify-between w-[220px]">
                    <span>Saldo Anterior:</span>
                    <span className="text-slate-950 font-black">{formatCurrency(saldoAnterior)}</span>
                  </div>
                </div>

                {/* Tabela do Extrato Impresso */}
                <table className="w-full border-collapse text-xs mt-2">
                  <thead>
                    <tr className="border-b border-slate-350 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="pb-2 text-left w-[12%]">Data</th>
                      <th className="pb-2 text-left w-[45%]">Histórico/Favorecido</th>
                      <th className="pb-2 text-left w-[20%]">Conta</th>
                      <th className="pb-2 text-right w-[11%]">Valor D/C</th>
                      <th className="pb-2 text-right w-[12%]">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsWithSaldos.slice().reverse().map((tx) => {
                      const amount = Number(tx.amount);
                      const isOutflow = tx.type === "OUTFLOW";
                      return (
                        <tr key={tx.id} className="border-b border-slate-100">
                          <td className="py-2.5 text-slate-700 whitespace-nowrap">
                            {new Date(tx.competenceDate).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-2.5 text-slate-800">
                            <span className="font-bold">{tx.description}</span>
                            {tx.category && (
                              <span className="text-[9px] text-slate-400 font-bold ml-2 uppercase">
                                • {tx.category}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-left text-slate-600 font-semibold whitespace-nowrap">
                            {tx.bankAccount?.name}
                          </td>
                          <td className={`py-2.5 text-right font-bold ${isOutflow ? "text-red-600" : "text-emerald-600"}`}>
                            {isOutflow ? "-" : ""} {formatCurrency(amount).replace("R$", "").trim()} {isOutflow ? "D" : "C"}
                          </td>
                          <td className="py-2.5 text-right font-black text-slate-900">
                            {formatCurrency(tx.saldoAfter ?? 0).replace("R$", "").trim()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Rodapé de Totais do Extrato */}
                <div className="flex flex-col items-end mt-4 pt-2 border-t border-slate-300 pr-2 space-y-1">
                  <div className="flex justify-between w-[280px] text-sm font-black text-slate-800 border-t border-slate-300 pt-2">
                    <span>SALDO:</span>
                    <span className="text-slate-950 font-black">{formatCurrency(consolidatedBalance)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6 no-print">
                <h2 className="text-lg font-black text-slate-900">Extrato Financeiro</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50 transition shadow-sm no-print"
                  >
                    <Share2 className="h-3.5 w-3.5 text-orange-500" />
                    Compartilhar
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50 transition shadow-sm no-print"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </button>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 font-medium no-print">
                  Nenhuma movimentação bancária encontrada no período.
                </div>
              ) : (
                <div>
                  <div className="hidden sm:block overflow-x-auto tabela-desktop-fixa no-print">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Data</th>
                          <th className="pb-3 pr-4">Descrição</th>
                          <th className="pb-3 pr-4">Conta</th>
                          <th className="pb-3 pr-4 text-right">Valor</th>
                          <th className="pb-3 pr-4 text-center">Status</th>
                          <th className="pb-3 text-center no-print">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {transactions.map((tx) => {
                          const amount = Number(tx.amount);
                          const isOutflow = tx.type === "OUTFLOW";
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 pr-4 font-semibold text-slate-600 whitespace-nowrap">
                                {new Date(tx.competenceDate).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-3 pr-4">
                                <p className="font-bold text-slate-800">{tx.description}</p>
                                {tx.category && (
                                  <span className="inline-block mt-1 text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {tx.category}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 pr-4 font-bold text-slate-600 whitespace-nowrap">
                                {tx.bankAccount?.name}
                              </td>
                              <td className={`py-3 pr-4 text-right font-black whitespace-nowrap ${isOutflow ? "text-red-600" : "text-emerald-600"}`}>
                                {isOutflow ? "-" : "+"} {formatCurrency(amount, tx.bankAccount?.currency)}
                                {Number(tx.fee) > 0 && (
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Tx: {formatCurrency(Number(tx.fee), tx.bankAccount?.currency)}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-center whitespace-nowrap">
                                {tx.status === "CONFIRMED" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                    Liquidado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-black text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-center whitespace-nowrap no-print">
                                <div className="flex items-center justify-center gap-1">
                                  {tx.status === "PENDING" && (
                                    <button
                                      onClick={() => handleReconcileTransaction(tx.id)}
                                      className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition"
                                      title="Liquidar / Conciliar Lançamento"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditTransactionModal(tx)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition"
                                    title="Editar Lançamento"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-100">
                        <tr className="font-black text-sm text-slate-800">
                          <td colSpan={3} className="py-3 px-4 font-black">
                            Total Lançamentos
                          </td>
                          <td className={`py-3 pr-4 text-right font-black ${
                            statementTotals.balance >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}>
                            {statementTotals.balance >= 0 ? "+" : "-"} {formatCurrency(Math.abs(statementTotals.balance))}
                          </td>
                          <td className="py-3 pr-4 text-center text-slate-400 font-bold">
                            —
                          </td>
                          <td className="py-3 text-center no-print text-slate-400 font-bold">
                            —
                          </td>
                        </tr>
                        <tr className="font-black text-sm text-slate-800 border-t border-slate-150">
                          <td colSpan={3} className="py-3 px-4 rounded-bl-2xl font-black text-slate-500">
                            {filterAccount ? "Saldo Atual da Conta" : "Saldo Consolidado Atual"}
                          </td>
                          <td className={`py-3 pr-4 text-right font-black ${
                            consolidatedBalance >= 0 ? "text-slate-900" : "text-red-600"
                          }`}>
                            {formatCurrency(consolidatedBalance)}
                          </td>
                          <td className="py-3 pr-4 text-center text-slate-400 font-bold">
                            —
                          </td>
                          <td className="py-3 text-center rounded-br-2xl no-print text-slate-400 font-bold">
                            —
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Vista Mobile: Cards de Transações */}
                  <div className="space-y-3 sm:hidden no-print cards-mobile-fixo">
                    {transactions.map((tx) => {
                      const amount = Number(tx.amount);
                      const isOutflow = tx.type === "OUTFLOW";
                      return (
                        <div
                          key={tx.id}
                          className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">
                              {new Date(tx.competenceDate).toLocaleDateString("pt-BR")}
                            </span>
                            {tx.status === "CONFIRMED" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                Liquidado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full">
                                Pendente
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="font-bold text-slate-800 text-sm">{tx.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {tx.category && (
                                <span className="inline-block text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {tx.category}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-slate-400">
                                • {tx.bankAccount?.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                            <div>
                              <p className="text-[10px] text-slate-400 font-black uppercase">Valor</p>
                              <p className={`text-base font-black ${isOutflow ? "text-red-600" : "text-emerald-600"}`}>
                                {isOutflow ? "-" : "+"} {formatCurrency(amount, tx.bankAccount?.currency)}
                              </p>
                              {Number(tx.fee) > 0 && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Tx: {formatCurrency(Number(tx.fee), tx.bankAccount?.currency)}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {tx.status === "PENDING" && (
                                <button
                                  onClick={() => handleReconcileTransaction(tx.id)}
                                  className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-600 hover:text-emerald-700 transition border border-emerald-100"
                                  title="Liquidar / Conciliar Lançamento"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditTransactionModal(tx)}
                                className="p-2 hover:bg-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition border border-slate-200 bg-slate-50"
                                title="Editar Lançamento"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Totalizador Mobile */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-150 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Movimentação no Período</span>
                        <span className={`text-sm font-black ${
                          statementTotals.balance >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                          {statementTotals.balance >= 0 ? "+" : "-"} {formatCurrency(Math.abs(statementTotals.balance))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-sm font-black text-slate-800">
                          {filterAccount ? "Saldo Atual da Conta" : "Saldo Consolidado"}
                        </span>
                        <span className={`text-base font-black ${
                          consolidatedBalance >= 0 ? "text-slate-900" : "text-red-600"
                        }`}>
                          {formatCurrency(consolidatedBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {transactions.length >= limit && (
                    <div className="flex justify-center pt-4 border-t border-slate-100 mt-4 print-hide">
                      <button
                        onClick={() => setLimit((prev) => prev + 30)}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-6 text-xs font-black text-slate-700 hover:bg-slate-50 transition shadow-sm"
                      >
                        Carregar Mais
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIST OF FINANCIAL ACCOUNTS */}
      {isAccountsListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div 
            className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col space-y-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-fade-in sm:my-0 sm:max-h-[90vh] sm:p-6"
            style={{ height: '550px' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <h3 className="text-lg font-black text-slate-900">Contas Financeiras</h3>
              <button
                onClick={() => setIsAccountsListModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Action inside modal: Add new account */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150 flex-shrink-0">
              <span className="text-xs font-bold text-slate-500">
                Gerencie todas as contas ou cadastre uma nova
              </span>
              <button
                onClick={() => {
                  setIsAccountsListModalOpen(false);
                  handleOpenAccountModal();
                }}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-black text-white hover:bg-orange-600 transition animate-pulse"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Conta
              </button>
            </div>

            {/* Scrollable list of accounts */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {accounts.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 font-medium">
                  Nenhuma conta cadastrada.
                </div>
              ) : (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`flex items-center justify-between border p-4 rounded-2xl transition ${
                      acc.active
                        ? "border-slate-150 bg-white hover:border-orange-200"
                        : "border-slate-100 bg-slate-50/50 opacity-65"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {acc.name}
                        </h4>
                        {!acc.active && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">
                            INATIVA
                          </span>
                        )}
                      </div>
                      {acc.bankName && (
                        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">
                          {acc.bankCode} - {acc.bankName}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">
                        {acc.type === "CHECKING" && "Conta Corrente"}
                        {acc.type === "SAVINGS" && "Poupança"}
                        {acc.type === "INVESTMENT" && "Investimento"}
                        {acc.type === "CASH" && "Caixa Dinheiro"}
                        {acc.agency && ` • Ag. ${acc.agency}`}
                        {acc.accountNumber && ` • C/C ${acc.accountNumber}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase">Saldo</p>
                        <p className={`text-sm font-black ${acc.active ? "text-slate-900" : "text-slate-500"}`}>
                          {formatCurrency(Number(acc.currentBalance), acc.currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActiveAccount(acc)}
                          className={`p-1.5 rounded-lg transition ${
                            acc.active ? "hover:bg-slate-100 text-slate-500 hover:text-slate-700" : "hover:bg-emerald-50 text-emerald-600"
                          }`}
                          title={acc.active ? "Inativar" : "Ativar"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsAccountsListModalOpen(false);
                            handleOpenAccountModal(acc);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-650 transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACCOUNT FORM (ADD/EDIT) */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="my-3 w-full max-w-md space-y-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl sm:my-0 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingAccount ? "Editar Conta Bancária" : "Cadastrar Conta Bancária"}
              </h3>
              <button
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setIsAccountsListModalOpen(true);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Nome da Conta / Identificação <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value.toUpperCase() })}
                  placeholder="Ex: Itaú Cobrança Principal"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 uppercase"
                />
              </div>

              {/* Institution Select (Dropdown searchable modal trigger) */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Instituição Financeira <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={() => {
                    setBankSearchQuery("");
                    setIsBankSearchOpen(true);
                  }}
                  className="w-full h-11 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm hover:border-orange-300 transition text-left"
                >
                  <span className={accountForm.bankName ? "text-slate-800 uppercase" : "text-slate-400"}>
                    {accountForm.bankName ? `${accountForm.bankCode} - ${accountForm.bankName}` : "Selecionar Instituição..."}
                  </span>
                  <Search className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">Tipo de Conta <span className="text-red-500">*</span></label>
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as BankAccountType })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-855 shadow-sm outline-none transition focus:border-orange-400"
                  >
                    <option value="CHECKING">Corrente</option>
                    <option value="SAVINGS">Poupança</option>
                    <option value="INVESTMENT">Investimento</option>
                    <option value="CASH">Dinheiro / Cofre / Caixinha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">Moeda <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value.toUpperCase() })}
                    placeholder="Ex: BRL"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 uppercase"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">Agência (Opcional)</label>
                  <input
                    type="text"
                    value={accountForm.agency}
                    onChange={(e) => setAccountForm({ ...accountForm, agency: e.target.value.toUpperCase() })}
                    placeholder="Ex: 0001"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">Conta (Nº + DV) (Opcional)</label>
                  <input
                    type="text"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value.toUpperCase() })}
                    placeholder="Ex: 12345-6"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 uppercase"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">Saldo Inicial (Opcional)</label>
                  <input
                    type="text"
                    disabled={!!editingAccount}
                    value={accountForm.initialBalanceStr}
                    onChange={(e) => setAccountForm({ ...accountForm, initialBalanceStr: formatCurrencyInput(e.target.value) })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">Limite Crédito <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={accountForm.limitStr}
                    onChange={(e) => setAccountForm({ ...accountForm, limitStr: formatCurrencyInput(e.target.value) })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400"
                  />
                </div>
              </div>

              {editingAccount && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Power className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Conta Ativa (Utilizável)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={accountForm.active}
                    onChange={(e) => setAccountForm({ ...accountForm, active: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-350 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsAccountModalOpen(false);
                    setIsAccountsListModalOpen(true);
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Gravando..." : "Salvar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: INSTITUTION SEARCH */}
      {isBankSearchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div 
            className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col space-y-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-fade-in sm:my-0 sm:max-h-[90vh] sm:p-6"
            style={{ height: '500px' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <h3 className="text-lg font-black text-slate-900">Selecionar instituição</h3>
              <button
                onClick={() => setIsBankSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input bar */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={bankSearchQuery}
                onChange={(e) => setBankSearchQuery(e.target.value.toUpperCase())}
                placeholder="Buscar por nome ou código..."
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-250 bg-white text-sm font-bold text-slate-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 uppercase"
              />
            </div>

            {/* Banks searchable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {filteredBanks.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 font-semibold flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-slate-300" />
                  Nenhuma instituição encontrada.
                </div>
              ) : (
                filteredBanks.map((bank, index) => (
                  <button
                    key={`${bank.code}-${index}`}
                    type="button"
                    onClick={() => handleSelectBank(bank)}
                    className="w-full text-left py-3 px-2 hover:bg-slate-50 rounded-xl transition flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-bold text-slate-400 leading-none">{bank.code}</span>
                    <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{bank.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED MODAL: NOVO LANÇAMENTO (MATCHES THE PRINT DESIGN EXACTLY) */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div 
            className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col space-y-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-fade-in sm:my-0 sm:max-h-[95vh] sm:p-6"
            style={{ height: '750px' }}
          >
            {/* Centered title with Back/Arrow left */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleCloseTransactionModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <ArrowLeftRight className="h-5 w-5 rotate-185" />
              </button>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
              </h3>
              <button
                type="button"
                onClick={handleCloseTransactionModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form 
              id="launch-transaction-form"
              onSubmit={handleConfirmLaunch} 
              className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2"
            >
              {/* Account selection dropdown */}
              {activeTab === "TRANSFERENCIA" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Origem (Débito) <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={launchForm.originBankAccountId}
                      onChange={(e) => setLaunchForm({ ...launchForm, originBankAccountId: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400"
                    >
                      <option value="">Selecione...</option>
                      {accounts
                        .filter((acc) => acc.active)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(Number(acc.currentBalance), acc.currency)})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Destino (Crédito) <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={launchForm.destinationBankAccountId}
                      onChange={(e) => setLaunchForm({ ...launchForm, destinationBankAccountId: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400"
                    >
                      <option value="">Selecione...</option>
                      {accounts
                        .filter((acc) => acc.active && acc.id !== launchForm.originBankAccountId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(Number(acc.currentBalance), acc.currency)})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Conta Financeira <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={launchForm.bankAccountId}
                    onChange={(e) => setLaunchForm({ ...launchForm, bankAccountId: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400"
                  >
                    <option value="">Selecione...</option>
                    {accounts
                      .filter((acc) => acc.active)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(Number(acc.currentBalance), acc.currency)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Tabs selector: Despesa, Receita, Transferência */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("DESPESA")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                    activeTab === "DESPESA" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("RECEITA")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                    activeTab === "RECEITA" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("TRANSFERENCIA")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                    activeTab === "TRANSFERENCIA" ? "bg-white text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Transferência
                </button>
              </div>

              {/* Value and Date Inputs side-by-side */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Valor <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={launchForm.amountStr}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      const updatedCats = [...launchForm.categories];
                      if (updatedCats.length <= 1) {
                        updatedCats[0] = { ...updatedCats[0], amountStr: formatted };
                      }
                      setLaunchForm({
                        ...launchForm,
                        amountStr: formatted,
                        categories: updatedCats
                      });
                    }}
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-3 text-lg font-black text-slate-850 shadow-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Data <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={launchForm.date}
                    onChange={(e) => setLaunchForm({ ...launchForm, date: e.target.value })}
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Conciliado Toggle Bar */}
              {activeTab !== "TRANSFERENCIA" && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100 border border-slate-200">
                  <input
                    type="checkbox"
                    id="reconciled"
                    checked={launchForm.reconciled}
                    onChange={(e) => setLaunchForm({ ...launchForm, reconciled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="reconciled" className="text-xs font-bold text-slate-600 select-none cursor-pointer flex flex-col">
                    <span className="font-black text-slate-800">Conciliado</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Desmarque para lançamentos previstos / não conciliados</span>
                  </label>
                </div>
              )}

              {/* Transfer Fee input (only visible in Transfer Mode) */}
              {activeTab === "TRANSFERENCIA" && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Taxa (Tarifa bancária) (Opcional)</label>
                  <input
                    type="text"
                    value={launchForm.feeStr}
                    onChange={(e) => setLaunchForm({ ...launchForm, feeStr: formatCurrencyInput(e.target.value) })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500"
                  />
                </div>
              )}

              {/* Description Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Descrição <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={launchForm.description}
                  onChange={(e) => setLaunchForm({ ...launchForm, description: e.target.value.toUpperCase() })}
                  placeholder="Ex: ALMOÇO, ALUGUEL..."
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 uppercase"
                />
              </div>

              {/* Document Number Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Número do Documento (Opcional)</label>
                <input
                  type="text"
                  value={launchForm.documentNumber}
                  onChange={(e) => setLaunchForm({ ...launchForm, documentNumber: e.target.value.toUpperCase() })}
                  placeholder="Ex: NF 12345, RECIBO..."
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 uppercase"
                />
              </div>

              {/* Split Categorization Section */}
              {activeTab !== "TRANSFERENCIA" && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400">Classificação do Lançamento <span className="text-red-500">*</span></label>
                  
                  {launchForm.categories.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                      <div className="flex-1 flex gap-1 items-center">
                        <select
                          required
                          value={item.category}
                          onChange={(e) => handleCategoryLineChange(idx, "category", e.target.value)}
                          className="flex-1 h-10 rounded-xl border border-slate-250 bg-white px-2.5 text-xs font-bold text-slate-850 shadow-sm outline-none"
                        >
                          <option value="">Categoria...</option>
                          {allCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCategoryLineIndex(idx);
                            setNewCategoryName("");
                            setIsNewCategoryModalOpen(true);
                          }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-250 bg-white text-slate-500 hover:text-slate-850 hover:border-slate-350 transition flex-shrink-0"
                          title="Cadastrar Nova Categoria"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        required
                        value={item.amountStr}
                        onChange={(e) => handleCategoryLineChange(idx, "amountStr", e.target.value)}
                        className="w-28 h-10 rounded-xl border border-slate-250 bg-white px-2 text-xs font-bold text-slate-800 shadow-sm text-right"
                      />

                      {launchForm.categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCategoryLine(idx)}
                          className="text-red-400 hover:text-red-650 transition flex-shrink-0"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddCategoryLine}
                      className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 transition shadow-sm"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar linha
                    </button>

                    <span className="text-xs font-black text-slate-500">
                      Soma: <span className={categoriesSum === parseCurrencyToNumber(launchForm.amountStr) ? "text-emerald-600" : "text-orange-500"}>{formatCurrency(categoriesSum)}</span> / {launchForm.amountStr}
                    </span>
                  </div>
                </div>
              )}

              {/* Keep modal open checkbox (only for new transactions) */}
              {!editingTransaction && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50/40 border border-orange-100/60 mt-2">
                  <input
                    type="checkbox"
                    id="keepModalOpen"
                    checked={keepModalOpen}
                    onChange={(e) => setKeepModalOpen(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-350 text-orange-500 focus:ring-orange-400 cursor-pointer"
                  />
                  <label htmlFor="keepModalOpen" className="text-xs font-bold text-slate-600 select-none cursor-pointer flex flex-col">
                    <span className="font-black text-slate-800">Manter janela aberta</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Mantém a conta e data selecionadas para realizar múltiplos lançamentos em sequência</span>
                  </label>
                </div>
              )}
            </form>

            {/* Action Button at the very bottom pinned as fixed footer */}
            <div className="pt-3 border-t border-slate-100 flex-shrink-0 flex gap-2">
              {editingTransaction && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    const isTransfer = !!editingTransaction.transferGroupId;
                    const confirmMessage = isTransfer
                      ? "Este lançamento faz parte de uma transferência. Excluir este lançamento excluirá automaticamente a entrada e a saída correspondente. Tem certeza?"
                      : "Tem certeza que deseja excluir esta movimentação? O saldo da conta será revertido.";
                    
                    showConfirm(
                      confirmMessage,
                      async () => {
                        try {
                          if (isTransfer) {
                            // Find and delete the related transaction in the other account
                            const relatedTx = transactions.find(
                              (tx) =>
                                tx.transferGroupId === editingTransaction.transferGroupId &&
                                tx.id !== editingTransaction.id
                            );
                            if (relatedTx) {
                              await deleteBankTransaction(relatedTx.id);
                            }
                          }
                          await deleteBankTransaction(editingTransaction.id);
                          handleCloseTransactionModal();
                          loadData();
                        } catch (err) {
                          showAlert(getErrorMessage(err, "Erro ao excluir movimentação."), "Erro", "error");
                        }
                      },
                      "Excluir Lançamento?",
                      true
                    );
                  }}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-red-50 text-sm font-black text-red-600 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Lançamento
                </button>
              )}
              <button
                type="submit"
                form="launch-transaction-form"
                disabled={isSaving}
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-black text-white hover:bg-orange-600 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Gravando..." : (editingTransaction ? "Salvar Lançamento" : "Confirmar Lançamento")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAMENTO DE CATEGORIAS */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col space-y-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-fade-in sm:my-0 sm:max-h-[90vh] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <h3 className="text-base font-black text-slate-900">Gerenciar Classificações</h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewCategoryModalOpen(false);
                  setEditingCategoryOldName(null);
                  setNewCategoryName("");
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Form de adicionar / editar categoria */}
            <div className="space-y-2 flex-shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                {editingCategoryOldName ? `Editar: ${editingCategoryOldName}` : "Nova Classificação"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                  placeholder="EX: COMBUSTÍVEL, REFEIÇÃO..."
                  className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-500 uppercase"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    const cleanName = newCategoryName.trim().toUpperCase();

                    if (editingCategoryOldName) {
                      // Editar
                      if (editingCategoryOldName !== cleanName) {
                        setCustomCategories((prev) =>
                          prev.map((c) => (c === editingCategoryOldName ? cleanName : c))
                        );
                        // Atualiza seleções atuais no form se necessário
                        if (newCategoryLineIndex !== null) {
                          handleCategoryLineChange(newCategoryLineIndex, "category", cleanName);
                        }
                      }
                      setEditingCategoryOldName(null);
                    } else {
                      // Criar nova
                      if (!customCategories.includes(cleanName)) {
                        setCustomCategories((prev) => [...prev, cleanName]);
                      }
                      // Se foi clicado pelo botão de uma linha específica, seleciona ela
                      if (newCategoryLineIndex !== null) {
                        handleCategoryLineChange(newCategoryLineIndex, "category", cleanName);
                      }
                    }
                    setNewCategoryName("");
                  }}
                  className="h-10 px-4 rounded-xl bg-orange-500 text-xs font-black text-white hover:bg-orange-600 transition flex items-center gap-1 flex-shrink-0"
                >
                  <Save className="h-3.5 w-3.5" />
                  {editingCategoryOldName ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>

            {/* Lista de categorias cadastradas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                Classificações Cadastradas ({allCategoriesWithStatus.length})
              </label>

              {allCategoriesWithStatus.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                  Nenhuma classificação cadastrada.
                </div>
              ) : (
                allCategoriesWithStatus.map((cat) => (
                  <div
                    key={cat.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      cat.active
                        ? "bg-white border-slate-200 hover:border-slate-300"
                        : "bg-slate-100 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${cat.active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                        {cat.name}
                      </span>
                      {!cat.active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase">
                          Inativa
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Selecionar esta categoria para o lançamento */}
                      {newCategoryLineIndex !== null && cat.active && (
                        <button
                          type="button"
                          onClick={() => {
                            handleCategoryLineChange(newCategoryLineIndex, "category", cat.name);
                            setIsNewCategoryModalOpen(false);
                            setNewCategoryName("");
                            setEditingCategoryOldName(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-[11px] font-black transition"
                        >
                          Usar
                        </button>
                      )}

                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryOldName(cat.name);
                          setNewCategoryName(cat.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Editar Nome"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Inativar / Ativar */}
                      <button
                        type="button"
                        onClick={() => {
                          if (cat.active) {
                            setInactiveCategories((prev) => [...prev, cat.name]);
                          } else {
                            setInactiveCategories((prev) => prev.filter((c) => c !== cat.name));
                          }
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          cat.active
                            ? "text-amber-500 hover:bg-amber-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={cat.active ? "Inativar Classificação" : "Ativar Classificação"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => {
                          showConfirm(
                            `Deseja realmente excluir a classificação "${cat.name}"?`,
                            () => {
                              setCustomCategories((prev) => prev.filter((c) => c !== cat.name));
                              setInactiveCategories((prev) => prev.filter((c) => c !== cat.name));
                              if (editingCategoryOldName === cat.name) {
                                setEditingCategoryOldName(null);
                                setNewCategoryName("");
                              }
                            },
                            "Excluir Classificação?",
                            true
                          );
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Excluir Classificação"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsNewCategoryModalOpen(false);
                  setEditingCategoryOldName(null);
                  setNewCategoryName("");
                }}
                className="w-full h-11 rounded-2xl border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {customAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-2xl animate-fade-in text-center">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${
              customAlert.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-500'
            }`}>
              {customAlert.type === 'error' ? '!' : 'i'}
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">{customAlert.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="mt-6 w-full h-11 rounded-2xl bg-orange-500 text-sm font-black text-white hover:bg-orange-600 transition shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {customConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl animate-fade-in text-center">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${
              customConfirm.isDanger ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-500'
            }`}>
              ?
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">{customConfirm.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{customConfirm.message}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setCustomConfirm(null)}
                className="h-11 rounded-2xl bg-slate-100 text-sm font-black text-slate-700 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className={`h-11 rounded-2xl text-sm font-black text-white transition shadow-sm ${
                  customConfirm.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: COMPARTILHAR EXTRATO WHATSAPP */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm" style={{ zIndex: 9000 }}>
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-2xl animate-fade-in animate-duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Compartilhar Extrato</h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleShareWhatsApp} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Selecionar Pessoa Cadastrada</label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPersonId(id);
                    const person = peopleList.find((p) => p.id === id);
                    if (person && person.phone) {
                      setSharePhone(person.phone.replace(/\D/g, ""));
                    }
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">-- Selecione para preencher (opcional) --</option>
                  {peopleList
                    .filter((p) => p.status === "ACTIVE" && p.phone)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.phone})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">WhatsApp do Destinatário <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={sharePhone}
                  onChange={(e) => {
                    setSharePhone(e.target.value.replace(/\D/g, ""));
                    setSelectedPersonId("");
                  }}
                  placeholder="Ex: 11999999999"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Informe o número com DDD (apenas números)</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="h-11 rounded-2xl bg-slate-100 text-sm font-black text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 rounded-2xl bg-orange-500 text-sm font-black text-white hover:bg-orange-600 transition shadow-sm disabled:opacity-50"
                >
                  {isSaving ? "Gerando..." : "Compartilhar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
