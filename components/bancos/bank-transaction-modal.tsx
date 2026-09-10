"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowLeftRight,
  X,
  Plus,
  MinusCircle,
  Save,
  Trash2,
  Edit2,
  Power,
} from "lucide-react";
import {
  getBankAccounts,
  createBankTransaction,
  deleteBankTransaction,
  transferBalance,
  type BankAccount,
  type BankTransaction,
  type BankTransactionType,
  type BankTransactionStatus,
} from "@/services/bancos.service";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/currency";

export type LaunchTab = "DESPESA" | "RECEITA" | "TRANSFERENCIA";

export interface BankTransactionInitialData {
  type?: LaunchTab;
  bankAccountId?: string;
  amount?: number;
  amountStr?: string;
  date?: string;
  description?: string;
  documentNumber?: string;
  category?: string;
  reconciled?: boolean;
  referenceType?: string;
  referenceId?: string;
  queueIndex?: number;
  queueTotal?: number;
}

interface BankTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transaction?: BankTransaction) => void;
  initialData?: BankTransactionInitialData;
  editingTransaction?: BankTransaction | null;
  accounts?: BankAccount[];
  customCategories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
}

const DEFAULT_CATEGORIES = [
  "ALUGUEL",
  "RECEITAS",
  "SALÁRIO",
  "SERVIÇOS",
  "MANUTENÇÃO",
  "FORNECEDORES",
  "IMPOSTOS",
  "VENDAS",
  "RENDIMENTOS",
  "TRANSFERÊNCIA",
  "OUTROS",
];

function formatCurrency(val: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(val);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function BankTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  editingTransaction,
  accounts: externalAccounts,
  customCategories: externalCustomCategories,
  onCategoriesChange,
}: BankTransactionModalProps) {
  const [internalAccounts, setInternalAccounts] = useState<BankAccount[]>([]);
  const [activeTab, setActiveTab] = useState<LaunchTab>("RECEITA");
  const [isSaving, setIsSaving] = useState(false);
  const [keepModalOpen, setKeepModalOpen] = useState(false);

  // Categories management
  const [internalCustomCategories, setInternalCustomCategories] = useState<string[]>([]);
  const [inactiveCategories, setInactiveCategories] = useState<string[]>([]);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLineIndex, setNewCategoryLineIndex] = useState<number | null>(null);
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);

  // Alerts & Confirmations
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    type?: "error" | "success" | "warning";
  } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);

  const showAlert = (
    message: string,
    title = "Aviso",
    type: "error" | "success" | "warning" = "warning"
  ) => {
    setCustomAlert({ title, message, type });
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title = "Confirmar Ação",
    isDanger = false
  ) => {
    setCustomConfirm({ title, message, onConfirm, isDanger });
  };

  // Launch form state
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
    categories: [{ category: "", amountStr: "R$ 0,00" }],
  });

  const accounts = externalAccounts ?? internalAccounts;
  const customCategories = externalCustomCategories ?? internalCustomCategories;

  // Load bank accounts if not supplied
  const loadAccounts = useCallback(async () => {
    try {
      const data = await getBankAccounts();
      setInternalAccounts(data);
    } catch {
      // Ignora erro se backend inacessível
    }
  }, []);

  useEffect(() => {
    if (isOpen && !externalAccounts) {
      loadAccounts();
    }
  }, [isOpen, externalAccounts, loadAccounts]);

  // Merge categories
  const allCategories = useMemo(() => {
    const categoriesSet = new Set<string>(DEFAULT_CATEGORIES);
    customCategories.forEach((cat) => {
      if (cat.trim()) categoriesSet.add(cat.trim().toUpperCase());
    });
    return Array.from(categoriesSet)
      .filter((cat) => !inactiveCategories.includes(cat))
      .sort();
  }, [customCategories, inactiveCategories]);

  const allCategoriesWithStatus = useMemo(() => {
    const categoriesSet = new Set<string>(DEFAULT_CATEGORIES);
    customCategories.forEach((cat) => {
      if (cat.trim()) categoriesSet.add(cat.trim().toUpperCase());
    });
    return Array.from(categoriesSet)
      .map((cat) => ({
        name: cat,
        active: !inactiveCategories.includes(cat),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customCategories, inactiveCategories]);

  // Populate form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      const tabType = editingTransaction.type === "INFLOW" ? "RECEITA" : "DESPESA";
      const isTransfer =
        editingTransaction.referenceType === "TRANSFER" || Boolean(editingTransaction.transferGroupId);
      const finalTab = isTransfer ? "TRANSFERENCIA" : tabType;

      setLaunchForm({
        bankAccountId: editingTransaction.bankAccountId || "",
        originBankAccountId:
          editingTransaction.referenceType === "TRANSFER" && editingTransaction.type === "OUTFLOW"
            ? editingTransaction.bankAccountId
            : editingTransaction.referenceId || "",
        destinationBankAccountId:
          editingTransaction.referenceType === "TRANSFER" && editingTransaction.type === "INFLOW"
            ? editingTransaction.bankAccountId
            : editingTransaction.referenceId || "",
        amountStr: formatCurrencyInput((editingTransaction.amount * 100).toString()),
        feeStr: formatCurrencyInput(((editingTransaction.fee || 0) * 100).toString()),
        date: new Date(editingTransaction.competenceDate).toISOString().slice(0, 10),
        reconciled: editingTransaction.status === "CONFIRMED",
        description: editingTransaction.description || "",
        documentNumber: "",
        categories: [
          {
            category: editingTransaction.category || "",
            amountStr: formatCurrencyInput((editingTransaction.amount * 100).toString()),
          },
        ],
      });
      setActiveTab(finalTab as LaunchTab);
    } else {
      // New transaction with optional initialData
      const tab = initialData?.type || "RECEITA";
      const activeAccounts = accounts.filter((acc) => acc.active);
      const defaultAccountId =
        initialData?.bankAccountId || (activeAccounts.length > 0 ? activeAccounts[0].id : "");

      let formattedAmount = "R$ 0,00";
      if (initialData?.amountStr) {
        formattedAmount = initialData.amountStr;
      } else if (typeof initialData?.amount === "number") {
        formattedAmount = formatCurrencyInput((initialData.amount * 100).toFixed(0));
      }

      const initialCategory = initialData?.category || (tab === "RECEITA" ? "RECEITAS" : "");

      setLaunchForm({
        bankAccountId: defaultAccountId,
        originBankAccountId: defaultAccountId,
        destinationBankAccountId: "",
        amountStr: formattedAmount,
        feeStr: "R$ 0,00",
        date: initialData?.date || new Date().toISOString().slice(0, 10),
        reconciled: initialData?.reconciled !== undefined ? initialData.reconciled : true,
        description: initialData?.description ? initialData.description.toUpperCase() : "",
        documentNumber: initialData?.documentNumber ? initialData.documentNumber.toUpperCase() : "",
        categories: [{ category: initialCategory, amountStr: formattedAmount }],
      });
      setActiveTab(tab);
    }
  }, [isOpen, editingTransaction, initialData, accounts]);

  // If default account was empty initially but accounts loaded later, select first active account
  useEffect(() => {
    if (isOpen && !editingTransaction && !launchForm.bankAccountId && accounts.length > 0) {
      const activeAcc = accounts.find((acc) => acc.active);
      if (activeAcc) {
        setLaunchForm((prev) => ({
          ...prev,
          bankAccountId: prev.bankAccountId || activeAcc.id,
          originBankAccountId: prev.originBankAccountId || activeAcc.id,
        }));
      }
    }
  }, [isOpen, accounts, editingTransaction, launchForm.bankAccountId]);

  // Handle category line changes
  const handleCategoryLineChange = (
    index: number,
    field: "category" | "amountStr",
    value: string
  ) => {
    const updated = [...launchForm.categories];
    if (field === "amountStr") {
      updated[index][field] = formatCurrencyInput(value);
    } else {
      updated[index][field] = value;
    }
    setLaunchForm({
      ...launchForm,
      categories: updated,
    });
  };

  const handleAddCategoryLine = () => {
    setLaunchForm({
      ...launchForm,
      categories: [...launchForm.categories, { category: "", amountStr: "R$ 0,00" }],
    });
  };

  const handleRemoveCategoryLine = (index: number) => {
    if (launchForm.categories.length <= 1) return;
    setLaunchForm({
      ...launchForm,
      categories: launchForm.categories.filter((_, i) => i !== index),
    });
  };

  // Calculate sum of split category lines
  const categoriesSum = useMemo(() => {
    return launchForm.categories.reduce(
      (sum, item) => sum + parseCurrencyToNumber(item.amountStr),
      0
    );
  }, [launchForm.categories]);

  // Handle submit for Launch Transaction Modal
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
        await deleteBankTransaction(editingTransaction.id);
      }

      let createdTx: BankTransaction | undefined;

      if (activeTab === "TRANSFERENCIA") {
        if (!launchForm.originBankAccountId || !launchForm.destinationBankAccountId) {
          showAlert("Selecione as contas de origem e destino.", "Aviso", "warning");
          setIsSaving(false);
          return;
        }
        const fee = parseCurrencyToNumber(launchForm.feeStr);
        const res = await transferBalance({
          originBankAccountId: launchForm.originBankAccountId,
          destinationBankAccountId: launchForm.destinationBankAccountId,
          amount,
          fee,
          description: launchForm.description.toUpperCase() || "TRANSFERÊNCIA BANCÁRIA",
          date: launchForm.date,
        });
        createdTx = res.inflowTx;
      } else {
        if (!launchForm.bankAccountId) {
          showAlert("Selecione uma conta financeira.", "Aviso", "warning");
          setIsSaving(false);
          return;
        }

        const type: BankTransactionType = activeTab === "RECEITA" ? "INFLOW" : "OUTFLOW";
        const status: BankTransactionStatus = launchForm.reconciled ? "CONFIRMED" : "PENDING";
        const categoryVal = launchForm.categories[0]?.category.toUpperCase() || "DIVERSOS";

        createdTx = await createBankTransaction(launchForm.bankAccountId, {
          type,
          status,
          amount,
          description: launchForm.description.toUpperCase(),
          competenceDate: launchForm.date,
          paymentDate: launchForm.reconciled ? launchForm.date : undefined,
          category: categoryVal,
          referenceType: initialData?.referenceType || "MANUAL",
          referenceId: initialData?.referenceId || undefined,
        });

        // Split lines beyond the first
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
                category: line.category.toUpperCase() || categoryVal,
                referenceType: initialData?.referenceType || "MANUAL",
                referenceId: initialData?.referenceId || undefined,
              });
            }
          }
        }
      }

      const hasMoreInQueue = Boolean(
        initialData?.queueTotal &&
        initialData.queueTotal > (initialData.queueIndex || 1)
      );

      if (keepModalOpen && !editingTransaction) {
        setLaunchForm((prev) => ({
          ...prev,
          amountStr: "R$ 0,00",
          feeStr: "R$ 0,00",
          description: "",
          documentNumber: "",
          categories: [{ category: "", amountStr: "R$ 0,00" }],
        }));
        showAlert("Lançamento gravado com sucesso! Janela mantida aberta.", "Sucesso", "success");
      } else if (!hasMoreInQueue) {
        onClose();
      }

      if (onSuccess) {
        onSuccess(createdTx);
      }
    } catch (err) {
      showAlert(
        getErrorMessage(err, "Erro ao realizar o lançamento financeiro."),
        "Erro",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateCustomCategoriesList = (updater: (prev: string[]) => string[]) => {
    if (onCategoriesChange) {
      const next = updater(customCategories);
      onCategoriesChange(next);
    } else {
      setInternalCustomCategories(updater);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
        <div
          className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col space-y-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-fade-in sm:my-0 sm:max-h-[95vh] sm:p-6"
          style={{ height: "750px" }}
        >
          {/* Centered title with Back/Arrow left */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Voltar"
            >
              <ArrowLeftRight className="h-5 w-5 rotate-185" />
            </button>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {editingTransaction
                ? "Editar Lançamento"
                : initialData?.queueTotal && initialData.queueTotal > 1
                ? `Novo Lançamento (${initialData.queueIndex || 1}/${initialData.queueTotal})`
                : "Novo Lançamento"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Fechar"
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
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Origem (Débito) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={launchForm.originBankAccountId}
                    onChange={(e) =>
                      setLaunchForm({ ...launchForm, originBankAccountId: e.target.value })
                    }
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
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Destino (Crédito) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={launchForm.destinationBankAccountId}
                    onChange={(e) =>
                      setLaunchForm({ ...launchForm, destinationBankAccountId: e.target.value })
                    }
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
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Conta Financeira <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={launchForm.bankAccountId}
                  onChange={(e) =>
                    setLaunchForm({ ...launchForm, bankAccountId: e.target.value })
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-400"
                >
                  <option value="">Selecione a conta...</option>
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
                  activeTab === "DESPESA"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("RECEITA")}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                  activeTab === "RECEITA"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("TRANSFERENCIA")}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "TRANSFERENCIA"
                    ? "bg-white text-orange-500 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transferência
              </button>
            </div>

            {/* Value and Date Inputs side-by-side */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Valor <span className="text-red-500">*</span>
                </label>
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
                      categories: updatedCats,
                    });
                  }}
                  className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-3 text-lg font-black text-slate-850 shadow-sm outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Data <span className="text-red-500">*</span>
                </label>
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
                  id="reconciled-bank-modal"
                  checked={launchForm.reconciled}
                  onChange={(e) =>
                    setLaunchForm({ ...launchForm, reconciled: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="reconciled-bank-modal"
                  className="text-xs font-bold text-slate-600 select-none cursor-pointer flex flex-col"
                >
                  <span className="font-black text-slate-800">Conciliado</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Desmarque para lançamentos previstos / não conciliados
                  </span>
                </label>
              </div>
            )}

            {/* Transfer Fee input */}
            {activeTab === "TRANSFERENCIA" && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Taxa (Tarifa bancária) (Opcional)
                </label>
                <input
                  type="text"
                  value={launchForm.feeStr}
                  onChange={(e) =>
                    setLaunchForm({ ...launchForm, feeStr: formatCurrencyInput(e.target.value) })
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500"
                />
              </div>
            )}

            {/* Description Input */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                Descrição <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={launchForm.description}
                onChange={(e) =>
                  setLaunchForm({ ...launchForm, description: e.target.value.toUpperCase() })
                }
                placeholder="Ex: RECEBIMENTO ALUGUEL, REFEIÇÃO..."
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 uppercase"
              />
            </div>

            {/* Document Number Input */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                Número do Documento (Opcional)
              </label>
              <input
                type="text"
                value={launchForm.documentNumber}
                onChange={(e) =>
                  setLaunchForm({ ...launchForm, documentNumber: e.target.value.toUpperCase() })
                }
                placeholder="Ex: NF 12345, PARC 1/12..."
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 uppercase"
              />
            </div>

            {/* Split Categorization Section */}
            {activeTab !== "TRANSFERENCIA" && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  Classificação do Lançamento <span className="text-red-500">*</span>
                </label>

                {launchForm.categories.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200"
                  >
                    <div className="flex-1 flex gap-1 items-center">
                      <select
                        required
                        value={item.category}
                        onChange={(e) => handleCategoryLineChange(idx, "category", e.target.value)}
                        className="flex-1 h-10 rounded-xl border border-slate-250 bg-white px-2.5 text-xs font-bold text-slate-850 shadow-sm outline-none"
                      >
                        <option value="">Categoria...</option>
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
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
                    Soma:{" "}
                    <span
                      className={
                        categoriesSum === parseCurrencyToNumber(launchForm.amountStr)
                          ? "text-emerald-600"
                          : "text-orange-500"
                      }
                    >
                      {formatCurrency(categoriesSum)}
                    </span>{" "}
                    / {launchForm.amountStr}
                  </span>
                </div>
              </div>
            )}

            {/* Keep modal open checkbox (only for new transactions) */}
            {!editingTransaction && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50/40 border border-orange-100/60 mt-2">
                <input
                  type="checkbox"
                  id="keepModalOpen-bank-modal"
                  checked={keepModalOpen}
                  onChange={(e) => setKeepModalOpen(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-350 text-orange-500 focus:ring-orange-400 cursor-pointer"
                />
                <label
                  htmlFor="keepModalOpen-bank-modal"
                  className="text-xs font-bold text-slate-600 select-none cursor-pointer flex flex-col"
                >
                  <span className="font-black text-slate-800">Manter janela aberta</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Mantém a conta e data selecionadas para realizar múltiplos lançamentos em sequência
                  </span>
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
                  const isTransfer = Boolean(editingTransaction.transferGroupId);
                  const confirmMessage = isTransfer
                    ? "Este lançamento faz parte de uma transferência. Excluir este lançamento excluirá automaticamente a entrada e a saída correspondente. Tem certeza?"
                    : "Tem certeza que deseja excluir esta movimentação? O saldo da conta será revertido.";

                  showConfirm(
                    confirmMessage,
                    async () => {
                      try {
                        await deleteBankTransaction(editingTransaction.id);
                        onClose();
                        if (onSuccess) onSuccess();
                      } catch (err) {
                        showAlert(
                          getErrorMessage(err, "Erro ao excluir movimentação."),
                          "Erro",
                          "error"
                        );
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
              {isSaving
                ? "Gravando..."
                : editingTransaction
                ? "Salvar Lançamento"
                : initialData?.queueTotal && initialData.queueTotal > (initialData.queueIndex || 1)
                ? `Confirmar e Próximo (${(initialData.queueIndex || 1) + 1}/${initialData.queueTotal})`
                : "Confirmar Lançamento"}
            </button>
          </div>
        </div>
      </div>

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
                      if (editingCategoryOldName !== cleanName) {
                        updateCustomCategoriesList((prev) =>
                          prev.map((c) => (c === editingCategoryOldName ? cleanName : c))
                        );
                        if (newCategoryLineIndex !== null) {
                          handleCategoryLineChange(newCategoryLineIndex, "category", cleanName);
                        }
                      }
                      setEditingCategoryOldName(null);
                    } else {
                      if (!customCategories.includes(cleanName)) {
                        updateCustomCategoriesList((prev) => [...prev, cleanName]);
                      }
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
                      <span
                        className={`text-xs font-black ${
                          cat.active ? "text-slate-800" : "text-slate-400 line-through"
                        }`}
                      >
                        {cat.name}
                      </span>
                      {!cat.active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase">
                          Inativa
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
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

                      <button
                        type="button"
                        onClick={() => {
                          showConfirm(
                            `Deseja realmente excluir a classificação "${cat.name}"?`,
                            () => {
                              updateCustomCategoriesList((prev) =>
                                prev.filter((c) => c !== cat.name)
                              );
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

      {/* Custom Alert Modal */}
      {customAlert && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-2xl animate-fade-in text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${
                customAlert.type === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-orange-50 text-orange-500"
              }`}
            >
              {customAlert.type === "error" ? "!" : "i"}
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">{customAlert.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              {customAlert.message}
            </p>
            <button
              onClick={() => setCustomAlert(null)}
              className="mt-6 w-full h-11 rounded-2xl bg-orange-500 text-sm font-black text-white hover:bg-orange-600 transition shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {customConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl animate-fade-in text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${
                customConfirm.isDanger ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-500"
              }`}
            >
              ?
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">{customConfirm.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              {customConfirm.message}
            </p>
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
                  customConfirm.isDanger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
