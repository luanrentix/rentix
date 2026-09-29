"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Charge,
  ChargeLaunchType,
  Tenant,
  Property,
  Contract,
  parseCurrencyToNumber,
  formatCurrencyInput,
  formatCurrency,
  EditableInstallment,
} from "../receivable-types";
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
import { PersonSelectModal } from "./person-select-modal";

interface ReceivableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCharge: Charge | null;
  initialContractPayload?: {
    tenantId?: string;
    tenantName?: string;
    propertyId?: string;
    propertyName?: string;
    contractId?: string;
    amount?: number;
    monthlyAmount?: number;
    totalAmount?: number;
    issueDate?: string;
    dueDate?: string;
    endDate?: string;
    installmentQuantity?: number;
  } | null;
  tenants: Tenant[];
  properties: Property[];
  contracts: Contract[];
  onSave: (payload: {
    tenantId?: string | null;
    property: string;
    tenant: string;
    contractId?: string | null;
    amount: number;
    issueDate?: string | null;
    dueDate: string;
    launchType: ChargeLaunchType;
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

export function ReceivableFormModal({
  isOpen,
  onClose,
  editingCharge,
  initialContractPayload,
  tenants,
  properties,
  contracts,
  onSave,
}: ReceivableFormModalProps) {
  const [tenantId, setTenantId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [contractId, setContractId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [launchType, setLaunchType] = useState<ChargeLaunchType>("single");
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
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Função para gerar as parcelas iniciais com base nos valores principais
  function generateInstallmentsList(
    type: ChargeLaunchType,
    total: number,
    count: number,
    downPayment: number,
    baseDueDate: string
  ): EditableInstallment[] {
    if (type === "single" || total <= 0 || !baseDueDate) return [];

    const [yStr, mStr, dStr] = baseDueDate.split("-");
    const baseYear = Number(yStr) || new Date().getFullYear();
    const baseMonth = Number(mStr) || new Date().getMonth() + 1;
    const baseDay = Number(dStr) || new Date().getDate();

    if (type === "installments") {
      const items: EditableInstallment[] = [];
      const installmentBase = Math.floor((total * 100) / count) / 100;
      const remainder = Math.round((total - installmentBase * count) * 100) / 100;

      for (let i = 1; i <= count; i++) {
        let curMonth = baseMonth + (i - 1);
        let curYear = baseYear;
        while (curMonth > 12) {
          curMonth -= 12;
          curYear += 1;
        }

        const date = new Date(curYear, curMonth - 1, baseDay)
          .toISOString()
          .slice(0, 10);

        const currentAmount = i === count ? installmentBase + remainder : installmentBase;
        items.push({
          id: `inst_${i}_${i}`,
          installmentNumber: i,
          installmentTotal: count,
          amount: currentAmount,
          amountStr: formatCurrencyInput(Math.round(currentAmount * 100)),
          dueDate: date,
        });
      }
      return items;
    }

    if (type === "downPaymentPlusInstallments") {
      const items: EditableInstallment[] = [];
      const remainingBalance = Math.max(0, total - downPayment);
      const installmentBase =
        count > 0 ? Math.floor((remainingBalance * 100) / count) / 100 : 0;
      const remainder =
        count > 0 ? Math.round((remainingBalance - installmentBase * count) * 100) / 100 : 0;

      // Parcela 0: Sinal / Entrada
      items.push({
        id: `downpayment_0`,
        installmentNumber: 1,
        installmentTotal: count + 1,
        amount: downPayment,
        amountStr: formatCurrencyInput(Math.round(downPayment * 100)),
        dueDate: baseDueDate,
        isDownPayment: true,
      });

      // Parcelas 1..N
      for (let i = 1; i <= count; i++) {
        let curMonth = baseMonth + i;
        let curYear = baseYear;
        while (curMonth > 12) {
          curMonth -= 12;
          curYear += 1;
        }

        const date = new Date(curYear, curMonth - 1, baseDay)
          .toISOString()
          .slice(0, 10);

        const currentAmount = i === count ? installmentBase + remainder : installmentBase;
        items.push({
          id: `inst_${i}_${i}`,
          installmentNumber: i + 1,
          installmentTotal: count + 1,
          amount: currentAmount,
          amountStr: formatCurrencyInput(Math.round(currentAmount * 100)),
          dueDate: date,
        });
      }
      return items;
    }

    return [];
  }

  // Inicialização ao abrir modal
  useEffect(() => {
    if (!isOpen) return;

    setPosition({ x: 0, y: 0 });
    setIsMaximized(false);

    if (editingCharge) {
      setTenantId(editingCharge.tenantId || "");
      setTenantName(editingCharge.tenantName);
      setPropertyName(editingCharge.propertyName);
      setContractId(editingCharge.contractId || "");
      setAmountStr(formatCurrencyInput(Math.round(editingCharge.amount * 100)));
      setIssueDate(
        editingCharge.issueDate
          ? editingCharge.issueDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setDueDate(editingCharge.dueDate.slice(0, 10));
      setLaunchType("single");
      setDownPaymentStr("");
      setInstallments([]);
    } else if (initialContractPayload) {
      setTenantId(initialContractPayload.tenantId || "");
      setTenantName(initialContractPayload.tenantName || "");
      setPropertyName(initialContractPayload.propertyName || "");
      setContractId(initialContractPayload.contractId || "");

      const isMulti = Number(initialContractPayload.installmentQuantity || 1) > 1;
      const count = Math.max(Number(initialContractPayload.installmentQuantity || 1), 1);
      const total = Number(
        initialContractPayload.totalAmount || initialContractPayload.amount || 0
      );
      const initialDueDate = initialContractPayload.dueDate
        ? initialContractPayload.dueDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const initialIssueDate = initialContractPayload.issueDate
        ? initialContractPayload.issueDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      setLaunchType(isMulti ? "installments" : "single");
      setInstallmentsCount(isMulti ? count : 2);
      setAmountStr(formatCurrencyInput(Math.round(total * 100)));
      setIssueDate(initialIssueDate);
      setDueDate(initialDueDate);
      setDownPaymentStr("");

      if (isMulti && total > 0 && initialDueDate) {
        setInstallments(
          generateInstallmentsList("installments", total, count, 0, initialDueDate)
        );
      } else {
        setInstallments([]);
      }
    } else {
      setTenantId("");
      setTenantName("");
      setPropertyName("");
      setContractId("");
      setAmountStr("");
      const today = new Date().toISOString().slice(0, 10);
      setIssueDate(today);
      setDueDate(today);
      setLaunchType("single");
      setInstallmentsCount(2);
      setDownPaymentStr("");
      setInstallments([]);
    }
    setErrorMessage("");
  }, [isOpen, editingCharge, initialContractPayload]);

  // Atualização das parcelas quando o tipo, quantidade ou valores base mudam
  const numericAmount = parseCurrencyToNumber(amountStr);
  const numericDownPayment = parseCurrencyToNumber(downPaymentStr);

  function handleRecalculateInstallments(
    newType = launchType,
    newCount = installmentsCount,
    newDownPayment = numericDownPayment,
    newDueDate = dueDate
  ) {
    if (newType === "single" || numericAmount <= 0) {
      setInstallments([]);
      return;
    }
    const generated = generateInstallmentsList(
      newType,
      numericAmount,
      newCount,
      newDownPayment,
      newDueDate
    );
    setInstallments(generated);
  }

  // Gerencia o arrasto pela barra de cabeçalho
  function handleMouseDown(e: React.MouseEvent) {
    if (isMaximized) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.startX + deltaX,
        y: dragStartRef.current.startY + deltaY,
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  // Soma atual das parcelas editadas
  const totalInstallmentsSum = installments.reduce((sum, item) => sum + item.amount, 0);
  const differenceFromTotal = Math.abs(numericAmount - totalInstallmentsSum);

  function handleInstallmentAmountChange(index: number, valStr: string) {
    const digits = valStr.replace(/\D/g, "");
    const formatted = formatCurrencyInput(digits);
    const parsed = parseCurrencyToNumber(formatted);

    setInstallments((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          amountStr: formatted,
          amount: parsed,
        };
        if (copy[index].isDownPayment) {
          setDownPaymentStr(formatted);
        }
      }
      return copy;
    });
  }

  function handleInstallmentDateChange(index: number, newDate: string) {
    setInstallments((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          dueDate: newDate,
        };
      }
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantName.trim()) {
      setErrorMessage("Informe o nome do inquilino / sacado.");
      return;
    }

    if (!propertyName.trim()) {
      setErrorMessage("Informe a descrição ou bem/imóvel vinculado.");
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

    if (launchType === "downPaymentPlusInstallments") {
      if (numericDownPayment <= 0) {
        setErrorMessage("Informe o valor do sinal de entrada maior que zero.");
        return;
      }
      if (numericDownPayment >= numericAmount) {
        setErrorMessage("O valor do sinal de entrada deve ser menor que o valor total.");
        return;
      }
    }

    // Se houver parcelas geradas, validar somatório
    if (launchType !== "single" && installments.length > 0 && differenceFromTotal > 0.05) {
      setErrorMessage(
        `A soma das parcelas (${formatCurrency(totalInstallmentsSum)}) difere do valor total da cobrança (${formatCurrency(numericAmount)}). Ajuste os valores.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await onSave({
        tenantId: tenantId || null,
        tenant: tenantName.trim().toUpperCase(),
        property: propertyName.trim().toUpperCase(),
        contractId: contractId || null,
        amount: numericAmount,
        issueDate: issueDate || null,
        dueDate,
        launchType,
        installmentsCount:
          !editingCharge && launchType !== "single" ? installmentsCount : undefined,
        downPaymentAmount:
          !editingCharge && launchType === "downPaymentPlusInstallments"
            ? numericDownPayment
            : undefined,
        installments:
          !editingCharge && launchType !== "single" && installments.length > 0
            ? installments.map((inst) => ({
                installmentNumber: inst.installmentNumber,
                installmentTotal: inst.installmentTotal,
                amount: inst.amount,
                dueDate: inst.dueDate,
                isDownPayment: inst.isDownPayment,
              }))
            : undefined,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao salvar cobrança."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Janela do Modal Movimentável e Redimensionável */}
      <div
        style={{
          transform: isMaximized
            ? "none"
            : `translate3d(${position.x}px, ${position.y}px, 0)`,
          resize: isMaximized ? "none" : "both",
        }}
        className={`relative flex flex-col border border-slate-200 bg-white shadow-2xl transition-shadow dark:border-slate-800 dark:bg-slate-900 ${
          isMaximized
            ? "fixed inset-0 h-full w-full max-h-none max-w-none rounded-none z-50"
            : "max-h-[92vh] w-full max-w-2xl min-w-[340px] sm:min-w-[540px] rounded-3xl overflow-hidden"
        }`}
      >
        {/* Barra de Título (Área de Arraste) */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 select-none dark:border-slate-800 ${
            isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing bg-slate-50/50 dark:bg-slate-800/40"
          }`}
          title="Clique e arraste para movimentar a janela"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              {editingCharge ? (
                <Edit2 className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
                {editingCharge ? "Editar Cobrança" : "Nova Cobrança a Receber"}
              </h3>
              <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                Arraste pela barra superior para reposicionar a janela.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setIsMaximized(!isMaximized);
                if (!isMaximized) setPosition({ x: 0, y: 0 });
              }}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={isMaximized ? "Restaurar tamanho" : "Maximizar"}
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
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Formulário com Scroll Interno */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lançamento Único vs Parcelado vs Sinal (apenas criação) */}
            {!editingCharge && (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100/70 p-1.5 dark:bg-slate-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setLaunchType("single");
                    setInstallments([]);
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                    launchType === "single"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  Cobrança Única
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLaunchType("installments");
                    handleRecalculateInstallments("installments", installmentsCount);
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                    launchType === "installments"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  Carnê / Parcelado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLaunchType("downPaymentPlusInstallments");
                    let currentDp = parseCurrencyToNumber(downPaymentStr);
                    if (currentDp <= 0 && numericAmount > 0) {
                      const suggested =
                        initialContractPayload?.monthlyAmount &&
                        Number(initialContractPayload.monthlyAmount) < numericAmount
                          ? Number(initialContractPayload.monthlyAmount)
                          : Number((numericAmount / (installmentsCount + 1)).toFixed(2));
                      currentDp = suggested;
                      setDownPaymentStr(formatCurrencyInput(Math.round(suggested * 100)));
                    }
                    handleRecalculateInstallments(
                      "downPaymentPlusInstallments",
                      installmentsCount,
                      currentDp
                    );
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                    launchType === "downPaymentPlusInstallments"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  Sinal + Parcelas
                </button>
              </div>
            )}

            {/* Inquilino e Imóvel Vinculado */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Campo de Inquilino / Pessoa com Abertura de Modal */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Inquilino / Pessoa *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPersonModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <Search className="h-3 w-3" />
                    Buscar na lista
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      setTenantId("");
                    }}
                    placeholder="Clique no botão ao lado ou digite o nome..."
                    className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 pr-10 text-xs font-bold uppercase text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsPersonModalOpen(true)}
                    className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-700 dark:text-slate-300"
                    title="Abrir lista de pessoas cadastradas"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                </div>

                {tenantId && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Pessoa vinculada do cadastro
                  </p>
                )}
              </div>

              {/* Bem / Ativo Vinculado */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bem / Ativo Vinculado *
                </label>
                <div className="flex gap-2">
                  <select
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">Selecione ou digite abaixo</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title} {p.code ? `(${p.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {!propertyName && (
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="Ou digite a descrição do bem/locação..."
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-xs font-bold uppercase text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                )}
              </div>
            </div>

            {/* Contrato Vinculado (Opcional) */}
            {contracts.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vincular a Contrato Existente (Opcional)
                </label>
                <select
                  value={contractId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setContractId(cId);
                    const sel = contracts.find((c) => c.id === cId);
                    if (sel) {
                      if (sel.propertyName) setPropertyName(sel.propertyName);
                      if (sel.tenantName && !tenantName) setTenantName(sel.tenantName);
                      if (sel.tenantId && !tenantId) setTenantId(sel.tenantId);
                      if (sel.rentValue && !amountStr) {
                        setAmountStr(formatCurrencyInput(Math.round(sel.rentValue * 100)));
                      }
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">Sem contrato vinculado</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.propertyName || "Imóvel"} - {c.tenantName || "Inquilino"} (
                      {formatCurrency(c.rentValue)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Valores Principais */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Valor Total da Cobrança (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={amountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmountStr(formatCurrencyInput(val));
                    }}
                    onBlur={() => {
                      if (launchType !== "single") {
                        handleRecalculateInstallments();
                      }
                    }}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-base font-black text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {launchType === "single" ? "Data de Vencimento *" : "1º Vencimento / Data Base *"}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    const newD = e.target.value;
                    setDueDate(newD);
                    if (launchType !== "single") {
                      handleRecalculateInstallments(launchType, installmentsCount, numericDownPayment, newD);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  required
                />
              </div>
            </div>

            {/* Configuração e Grid Editável de Parcelas */}
            {!editingCharge && launchType !== "single" && (
              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/40">
                {/* Se for Sinal + Parcelas */}
                {launchType === "downPaymentPlusInstallments" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Valor do Sinal de Entrada (R$) *
                      </label>
                      <input
                        type="text"
                        value={downPaymentStr}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const formatted = formatCurrencyInput(val);
                          setDownPaymentStr(formatted);
                          const parsed = parseCurrencyToNumber(formatted);
                          handleRecalculateInstallments(launchType, installmentsCount, parsed);
                        }}
                        placeholder="0,00"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Quantidade de Parcelas Restantes
                      </label>
                      <select
                        value={installmentsCount}
                        onChange={(e) => {
                          const nextCount = Number(e.target.value);
                          setInstallmentsCount(nextCount);
                          handleRecalculateInstallments(launchType, nextCount);
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map((num) => (
                          <option key={num} value={num}>
                            {num} parcela(s)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Se for apenas Carnê / Parcelado */}
                {launchType === "installments" && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        Número de Parcelas do Carnê
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Escolha a quantidade para pré-visualizar e ajustar os valores.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={installmentsCount}
                        onChange={(e) => {
                          const nextCount = Number(e.target.value);
                          setInstallmentsCount(nextCount);
                          handleRecalculateInstallments(launchType, nextCount);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black dark:border-slate-700 dark:bg-slate-800"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map((num) => (
                          <option key={num} value={num}>
                            {num} parcelas
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRecalculateInstallments()}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800"
                        title="Recalcular divisões iguais"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabela Interativa de Parcelas Editáveis */}
                {installments.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-100 bg-slate-50/75 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 flex justify-between items-center">
                      <span>Parcelas Geradas (Você pode alterar datas e valores)</span>
                      <span className="text-[10px] lowercase font-semibold text-slate-400">
                        {installments.length} registro(s)
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
                      {installments.map((inst, index) => (
                        <div
                          key={inst.id}
                          className="flex items-center gap-2 p-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition"
                        >
                          <div className="w-28 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black ${
                                inst.isDownPayment
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {inst.isDownPayment
                                ? "Entrada / Sinal"
                                : `Parcela ${inst.installmentNumber}/${inst.installmentTotal}`}
                            </span>
                          </div>

                          <div className="flex-1 min-w-[130px]">
                            <input
                              type="date"
                              value={inst.dueDate}
                              onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            />
                          </div>

                          <div className="w-32 shrink-0">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">
                                R$
                              </span>
                              <input
                                type="text"
                                value={inst.amountStr}
                                onChange={(e) => handleInstallmentAmountChange(index, e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-right text-xs font-black text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Resumo da Soma das Parcelas */}
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/75 p-3 text-xs font-bold dark:border-slate-800 dark:bg-slate-800/60">
                      <div>
                        <span className="text-slate-500">Soma das parcelas: </span>
                        <span
                          className={`font-black ${
                            differenceFromTotal > 0.05
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatCurrency(totalInstallmentsSum)}
                        </span>
                      </div>

                      <div className="text-right">
                        {differenceFromTotal > 0.05 ? (
                          <span className="text-[11px] font-black text-red-600 dark:text-red-400">
                            Diferença de {formatCurrency(differenceFromTotal)} em relação ao total
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Soma 100% alinhada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botões do Rodapé */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {editingCharge ? "Atualizar Cobrança" : "Salvar Cobrança"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Seleção de Pessoas */}
      <PersonSelectModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        people={tenants}
        selectedPersonId={tenantId}
        onSelectPerson={(person) => {
          if (person) {
            setTenantId(person.id);
            setTenantName(person.name);
          } else {
            setTenantId("");
            setTenantName("");
          }
        }}
        onPersonCreated={(person) => {
          setTenantId(person.id);
          setTenantName(person.name);
        }}
        title="Vincular Pessoa da Cobrança"
        allowClear={false}
      />
    </div>
  );
}
