"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Expense,
  EXPENSE_CATEGORIES,
  ExpenseLaunchType,
  Tenant,
  Property,
  parseCurrencyToNumber,
  formatCurrencyInput,
  formatCurrency,
  EditableInstallment,
} from "../payable-types";
import {
  X,
  Plus,
  Edit2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Users,
  Search,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { PersonSelectModal } from "@/components/contas-receber/modals/person-select-modal";

interface PayableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense: Expense | null;
  people: Tenant[];
  properties: Property[];
  companyId?: string;
  onSave: (payload: {
    personId?: string | null;
    propertyId?: string | null;
    personName?: string | null;
    description: string;
    category?: string | null;
    note?: string | null;
    amount: number;
    issueDate?: string | null;
    dueDate: string;
    launchType: ExpenseLaunchType;
    installmentsCount?: number;
    downPaymentAmount?: number;
    installments?: Array<{
      installmentNumber?: number;
      installmentTotal?: number;
      amount: number;
      dueDate: string;
      isDownPayment?: boolean;
    }>;
  }) => Promise<void>;
}

export function PayableFormModal({
  isOpen,
  onClose,
  editingExpense,
  people,
  properties,
  companyId,
  onSave,
}: PayableFormModalProps) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [personId, setPersonId] = useState("");
  const [personName, setPersonName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [launchType, setLaunchType] = useState<ExpenseLaunchType>("single");
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [downPaymentStr, setDownPaymentStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Grid de parcelas editáveis
  const [installments, setInstallments] = useState<EditableInstallment[]>([]);

  // Modal de seleção de pessoa
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  // Estados de Movimentação (Drag) e Redimensionamento (Resize / Maximize)
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Resetar posição ao abrir
    setDragPos({ x: 0, y: 0 });
    setIsMaximized(false);

    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmountStr(formatCurrencyInput(Math.round(editingExpense.amount * 100)));
      setPersonId(editingExpense.personId || "");
      setPersonName(editingExpense.personName || "");
      setPropertyId(editingExpense.propertyId || "");
      setCategory(editingExpense.category || EXPENSE_CATEGORIES[0]);
      setIssueDate(
        editingExpense.issueDate
          ? editingExpense.issueDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setDueDate(editingExpense.dueDate.slice(0, 10));
      setNote(editingExpense.note || "");
      setLaunchType("single");
      setInstallments([]);
    } else {
      setDescription("");
      setAmountStr("");
      setPersonId("");
      setPersonName("");
      setPropertyId("");
      setCategory(EXPENSE_CATEGORIES[0]);
      setIssueDate(new Date().toISOString().slice(0, 10));
      setDueDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setLaunchType("single");
      setInstallmentsCount(2);
      setDownPaymentStr("");
      setInstallments([]);
    }
    setErrorMessage("");
  }, [isOpen, editingExpense]);

  // Cálculos de valores
  const numericAmount = parseCurrencyToNumber(amountStr);
  const numericDownPayment = parseCurrencyToNumber(downPaymentStr);

  // Gerador dinâmico de parcelas quando o usuário escolhe carnê ou sinal + parcelas
  const generateInstallments = () => {
    if (numericAmount <= 0 || !dueDate) {
      setInstallments([]);
      return;
    }

    const [yearStr, monthStr, dayStr] = dueDate.split("-");
    const baseYear = Number(yearStr) || new Date().getFullYear();
    const baseMonth = Number(monthStr) || new Date().getMonth() + 1;
    const baseDay = Number(dayStr) || new Date().getDate();

    if (launchType === "installments") {
      const count = installmentsCount || 2;
      const partAmount = Number((numericAmount / count).toFixed(2));
      const newInst: EditableInstallment[] = [];

      let curYear = baseYear;
      let curMonth = baseMonth;

      for (let i = 1; i <= count; i++) {
        // Ajusta arredondamento na última parcela para fechar 100% o valor
        const isLast = i === count;
        const currentPart = isLast
          ? Number((numericAmount - partAmount * (count - 1)).toFixed(2))
          : partAmount;

        const dateStr = new Date(curYear, curMonth - 1, baseDay)
          .toISOString()
          .slice(0, 10);

        newInst.push({
          id: `inst-${i}`,
          installmentNumber: i,
          installmentTotal: count,
          amount: currentPart,
          amountStr: formatCurrencyInput(Math.round(currentPart * 100)),
          dueDate: dateStr,
          isDownPayment: false,
        });

        curMonth += 1;
        if (curMonth > 12) {
          curMonth = 1;
          curYear += 1;
        }
      }
      setInstallments(newInst);
    } else if (launchType === "downPaymentPlusInstallments") {
      const downPayment = numericDownPayment || 0;
      const count = installmentsCount || 2;
      const remaining = Math.max(0, numericAmount - downPayment);
      const partAmount = Number((remaining / count).toFixed(2));
      const newInst: EditableInstallment[] = [];

      // Entrada / Sinal
      newInst.push({
        id: "inst-down-payment",
        installmentNumber: 1,
        installmentTotal: count + 1,
        amount: downPayment,
        amountStr: formatCurrencyInput(Math.round(downPayment * 100)),
        dueDate,
        isDownPayment: true,
      });

      // Parcelas do saldo
      let curYear = baseYear;
      let curMonth = baseMonth + 1;

      for (let i = 1; i <= count; i++) {
        if (curMonth > 12) {
          curMonth = 1;
          curYear += 1;
        }

        const isLast = i === count;
        const currentPart = isLast
          ? Number((remaining - partAmount * (count - 1)).toFixed(2))
          : partAmount;

        const dateStr = new Date(curYear, curMonth - 1, baseDay)
          .toISOString()
          .slice(0, 10);

        newInst.push({
          id: `inst-${i}`,
          installmentNumber: i + 1,
          installmentTotal: count + 1,
          amount: currentPart,
          amountStr: formatCurrencyInput(Math.round(currentPart * 100)),
          dueDate: dateStr,
          isDownPayment: false,
        });

        curMonth += 1;
      }
      setInstallments(newInst);
    }
  };

  // Efeito para sincronizar geração inicial de parcelas ao alternar tipo
  useEffect(() => {
    if (editingExpense) return;
    if (launchType !== "single" && numericAmount > 0) {
      generateInstallments();
    } else {
      setInstallments([]);
    }
  }, [launchType, installmentsCount, amountStr, downPaymentStr, dueDate]);

  // Edição de valor de uma parcela individual
  const handleInstallmentAmountChange = (id: string, rawVal: string) => {
    const numericCents = rawVal.replace(/\D/g, "");
    const numeric = Number(numericCents) / 100;

    setInstallments((prev) =>
      prev.map((inst) =>
        inst.id === id
          ? {
              ...inst,
              amount: numeric,
              amountStr: formatCurrencyInput(numericCents),
            }
          : inst
      )
    );
  };

  // Edição de vencimento de uma parcela individual
  const handleInstallmentDateChange = (id: string, newDate: string) => {
    setInstallments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, dueDate: newDate } : inst))
    );
  };

  // Somatório das parcelas para conferência
  const totalInstallmentsSum = useMemo(() => {
    return installments.reduce((acc, inst) => acc + (inst.amount || 0), 0);
  }, [installments]);

  const differenceFromTotal = Math.abs(numericAmount - totalInstallmentsSum);

  // Handlers para Arrastar (Drag) o Modal
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest("button, input, select, textarea, a")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setDragPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("Informe uma descrição para a conta a pagar.");
      return;
    }

    if (numericAmount <= 0) {
      setErrorMessage("Informe um valor maior que zero.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("Informe a data de vencimento.");
      return;
    }

    if (launchType === "downPaymentPlusInstallments" && numericDownPayment >= numericAmount) {
      setErrorMessage("O valor da entrada deve ser menor que o valor total.");
      return;
    }

    if (launchType !== "single" && installments.length > 0 && differenceFromTotal > 0.05) {
      setErrorMessage(
        `A soma das parcelas (${formatCurrency(totalInstallmentsSum)}) difere do valor total da despesa (${formatCurrency(numericAmount)}). Ajuste os valores.`
      );
      return;
    }

    const selectedPerson = people.find((p) => p.id === personId);
    const finalPersonName = selectedPerson ? selectedPerson.name : personName.trim() || null;

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await onSave({
        description: description.trim().toUpperCase(),
        amount: numericAmount,
        personId: personId || null,
        personName: finalPersonName,
        propertyId: propertyId || null,
        category: category || null,
        issueDate: issueDate || null,
        dueDate,
        launchType,
        note: note.trim() ? note.trim().toUpperCase() : null,
        installmentsCount:
          !editingExpense && launchType !== "single" ? installmentsCount : undefined,
        downPaymentAmount:
          !editingExpense && launchType === "downPaymentPlusInstallments"
            ? numericDownPayment
            : undefined,
        installments:
          !editingExpense && launchType !== "single" && installments.length > 0
            ? installments.map((inst) => ({
                installmentNumber: inst.installmentNumber,
                installmentTotal: inst.installmentTotal,
                amount: inst.amount,
                dueDate: inst.dueDate,
                isDownPayment: inst.isDownPayment,
              }))
            : undefined,
      });

      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao salvar conta a pagar."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Container Draggable & Resizable */}
      <div
        ref={modalRef}
        style={{
          transform: !isMaximized ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0)` : "none",
          resize: !isMaximized ? "both" : "none",
        }}
        className={`relative flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 ${
          isMaximized
            ? "fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none rounded-2xl"
            : "max-h-[92vh] w-full max-w-2xl min-w-[340px] min-h-[460px] overflow-hidden"
        }`}
      >
        {/* Cabeçalho Draggable */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex select-none items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 ${
            !isMaximized ? "cursor-move" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              {editingExpense ? (
                <Edit2 className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingExpense ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Preencha os dados da obrigação ou despesa. Arraste para mover.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={isMaximized ? "Restaurar tamanho" : "Maximizar janela"}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conteúdo Rolável do Formulário */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <form id="payable-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Modalidade de Lançamento (somente ao criar) */}
            {!editingExpense && (
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Modalidade do Lançamento
                </label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setLaunchType("single")}
                    className={`rounded-xl py-2 text-xs font-black transition ${
                      launchType === "single"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Lançamento Único
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaunchType("installments")}
                    className={`rounded-xl py-2 text-xs font-black transition ${
                      launchType === "installments"
                        ? "bg-white text-red-600 shadow-sm dark:bg-slate-700 dark:text-red-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Carnê de Parcelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaunchType("downPaymentPlusInstallments")}
                    className={`rounded-xl py-2 text-xs font-black transition ${
                      launchType === "downPaymentPlusInstallments"
                        ? "bg-white text-red-600 shadow-sm dark:bg-slate-700 dark:text-red-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    Sinal + Parcelas
                  </button>
                </div>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Descrição da Despesa *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: MANUTENÇÃO ELÉTRICA, CONDOMÍNIO, REPASSE PROPRIETÁRIO..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-900 outline-none uppercase transition focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            {/* Valor Total e Categoria */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Valor Total (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={amountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmountStr(formatCurrencyInput(val));
                    }}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-base font-black text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parâmetros de Parcelamento */}
            {!editingExpense && launchType !== "single" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {launchType === "downPaymentPlusInstallments" && (
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Valor da Entrada / Sinal (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          value={downPaymentStr}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setDownPaymentStr(formatCurrencyInput(val));
                          }}
                          placeholder="0,00"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-black text-slate-900 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {launchType === "downPaymentPlusInstallments"
                        ? "Parcelas do Saldo"
                        : "Número de Parcelas"}
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map((num) => (
                        <option key={num} value={num}>
                          {num} parcelas
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Grade Interativa de Parcelas Editáveis */}
            {!editingExpense && launchType !== "single" && installments.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-red-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ajustar Valores e Vencimentos das Parcelas
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={generateInstallments}
                    title="Recalcular parcelas igualmente"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Dividir igualmente
                  </button>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2 dark:border-slate-700/60 dark:bg-slate-800/50"
                    >
                      <span className="flex h-7 w-20 shrink-0 items-center justify-center rounded-lg bg-white px-1.5 text-[11px] font-black text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                        {inst.isDownPayment
                          ? "Entrada"
                          : `Parc. ${inst.installmentNumber}/${inst.installmentTotal}`}
                      </span>

                      {/* Input de Valor da Parcela */}
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          value={inst.amountStr}
                          onChange={(e) => handleInstallmentAmountChange(inst.id, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs font-black text-slate-900 outline-none focus:border-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      {/* Input de Vencimento da Parcela */}
                      <div className="w-36">
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => handleInstallmentDateChange(inst.id, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Barra de Somatório e Validação */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    Soma das Parcelas:{" "}
                    <strong className="text-slate-800 dark:text-white font-black">
                      {formatCurrency(totalInstallmentsSum)}
                    </strong>
                  </span>
                  {differenceFromTotal > 0.05 ? (
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Diferença: {formatCurrency(differenceFromTotal)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Total confere!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Fornecedor / Favorecido (com Modal de Pessoas Clicável) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Fornecedor / Favorecido
                </label>
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Search className="h-3 w-3" />
                  Buscar na lista
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value);
                    setPersonId("");
                  }}
                  placeholder="Selecione na lista ou digite o nome do favorecido..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-24 text-xs font-bold text-slate-800 outline-none uppercase transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen(true)}
                  className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 dark:bg-slate-700 dark:text-slate-200"
                >
                  <Users className="h-3.5 w-3.5" />
                  Pessoas
                </button>
              </div>
            </div>

            {/* Bem / Imóvel Vinculado */}
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Bem / Ativo Vinculado (Opcional)
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Nenhum bem vinculado (Despesa Geral da Empresa)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Datas de Emissão e Vencimento */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Data de Emissão (Opcional)
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  required
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Observações Adicionais
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Nota fiscal emitida, comprovante em anexo, parcelamento autorizado..."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700 outline-none uppercase transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </form>
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-4 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="payable-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {editingExpense ? "Atualizar Conta" : "Salvar Conta"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Seleção de Pessoas */}
      <PersonSelectModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        people={people}
        companyId={companyId}
        selectedPersonId={personId}
        onSelectPerson={(person) => {
          if (person) {
            setPersonId(person.id);
            setPersonName(person.name);
          } else {
            setPersonId("");
            setPersonName("");
          }
        }}
        onPersonCreated={(newPerson) => {
          setPersonId(newPerson.id);
          setPersonName(newPerson.name);
        }}
        title="Vincular Fornecedor / Favorecido"
        allowClear={false}
      />
    </div>
  );
}
