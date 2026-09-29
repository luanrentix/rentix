"use client";

import React, { useState } from "react";
import { Contract, formatCurrency, formatDate } from "./contract-types";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Receipt,
  ArrowRight,
} from "lucide-react";

// ----------------- MODAL DE FINALIZAÇÃO -----------------
interface ContractFinishModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  pendingCharges?: Array<{
    id: string;
    amount: number;
    dueDate: string;
    installmentNumber?: number | null;
    installmentTotal?: number | null;
    isDownPayment?: boolean;
    status: string;
  }>;
  onGoToReceivables?: (contractId: string) => void;
}

export function ContractFinishModal({
  contract,
  isOpen,
  onClose,
  onConfirm,
  pendingCharges = [],
  onGoToReceivables,
}: ContractFinishModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !contract) return null;

  const hasPendingCharges = pendingCharges.length > 0;
  const totalPendingAmount = pendingCharges.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );

  async function handleConfirm() {
    if (hasPendingCharges) {
      setError("Não é possível finalizar o contrato com parcelas em aberto.");
      return;
    }

    setError("");
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      setError("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(cleanReason);
      setReason("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível finalizar o contrato."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl mx-auto ${
            hasPendingCharges
              ? "bg-rose-50 text-rose-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {hasPendingCharges ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <CheckCircle2 className="h-6 w-6" />
          )}
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-base font-black text-slate-900">
            {hasPendingCharges
              ? "Não é possível finalizar: parcelas em aberto"
              : "Finalizar Contrato de Locação"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {hasPendingCharges
              ? `O contrato do bem ${contract.propertyName} possui parcelas pendentes no financeiro. Realize o abatimento ou quitação antes de finalizar.`
              : `Ao finalizar, o bem/ativo ${contract.propertyName} será liberado para nova locação e o contrato será encerrado.`}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-black text-red-700">
            {error}
          </div>
        )}

        {hasPendingCharges ? (
          /* Bloco de Parcelas Pendentes e Redirecionamento para Abatimento */
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-black text-rose-900">
                <span>{pendingCharges.length} parcela(s) pendente(s)</span>
                <span>Total: {formatCurrency(totalPendingAmount)}</span>
              </div>

              <div className="mt-2.5 max-h-40 overflow-y-auto divide-y divide-rose-100 rounded-xl bg-white border border-rose-100 p-2">
                {pendingCharges.map((charge, idx) => (
                  <div
                    key={charge.id || idx}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div>
                      <span className="font-black text-slate-800">
                        {charge.isDownPayment
                          ? "Sinal / Entrada"
                          : charge.installmentNumber
                          ? `Parcela ${charge.installmentNumber}/${charge.installmentTotal || "?"}`
                          : `Cobrança #${idx + 1}`}
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-400">
                        Vencimento: {formatDate(charge.dueDate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">
                        {formatCurrency(charge.amount)}
                      </span>
                      <span className="block text-[10px] font-bold text-rose-600 uppercase">
                        {charge.status === "Overdue" ? "Vencida" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {onGoToReceivables && (
              <button
                type="button"
                onClick={() => onGoToReceivables(contract.id)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                <Receipt className="h-4 w-4" />
                Ir para Contas a Receber para Abatimento
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          /* Formulário de Motivo quando NÃO houver parcelas pendentes */
          <>
            <div className="mt-4 space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Motivo da Finalização / Devolução <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Término de contrato amigável e entrega das chaves realizada com vistoria aprovada."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 resize-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Finalizando..." : "Confirmar Finalização"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ----------------- MODAL DE CANCELAMENTO -----------------
interface ContractCancelModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function ContractCancelModal({
  contract,
  isOpen,
  onClose,
  onConfirm,
}: ContractCancelModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !contract) return null;

  async function handleConfirm() {
    setError("");
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      setError("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(cleanReason);
      setReason("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível cancelar o contrato."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
          <Ban className="h-6 w-6" />
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-base font-black text-slate-900">
            Cancelar Contrato
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Tem certeza que deseja cancelar o contrato do bem <b>{contract.propertyName}</b>? As parcelas em aberto serão canceladas e o imóvel será desocupado.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-black text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Motivo do Cancelamento <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Rescisão contratual antecipada solicitada pelo locatário."
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-rose-500 resize-none"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-2xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Cancelando..." : "Confirmar Cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------- MODAL DE CONFIRMAÇÃO DE EDIÇÃO DE CONTRATO FINALIZADO/CANCELADO -----------------
interface ContractEditConfirmationModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ContractEditConfirmationModal({
  contract,
  isOpen,
  onClose,
  onConfirm,
}: ContractEditConfirmationModalProps) {
  if (!isOpen || !contract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-base font-black text-slate-900">
          Editar Contrato Encerrado?
        </h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Este contrato já se encontra com status <b>{contract.status}</b>. Alterar seus dados pode impactar o histórico financeiro e relatórios de auditoria.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
          >
            Não, voltar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-orange-600 px-5 py-2 text-xs font-black text-white hover:bg-orange-700 transition"
          >
            Sim, editar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------- MODAL DE EXCLUSÃO DE CONTRATO -----------------
interface ContractDeleteModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function ContractDeleteModal({
  contract,
  isOpen,
  onClose,
  onConfirm,
}: ContractDeleteModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !contract) return null;

  async function handleConfirm() {
    setError("");
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      setError("Informe um motivo com pelo menos 5 caracteres para a exclusão.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(cleanReason);
      setReason("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível excluir o contrato."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-base font-black text-slate-900">
            Excluir Contrato de Locação
          </h3>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Tem certeza que deseja excluir o contrato do bem <b>{contract.propertyName}</b>?
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/80 p-3.5 text-xs text-red-900 font-semibold space-y-1">
          <p className="font-black text-red-700 uppercase tracking-wider text-[11px]">Ações automáticas:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-red-800">
            <li>As parcelas de <b>contas a receber</b> deste contrato serão excluídas.</li>
            <li>Os <b>agendamentos</b> deste contrato na agenda serão removidos.</li>
            <li>O bem/ativo será liberado para <b>disponível</b> novamente.</li>
          </ul>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-100 p-2.5 text-xs font-black text-red-800">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700">
            Motivo da Exclusão <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Cancelamento definitivo antes do início ou erro no preenchimento."
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-red-500 resize-none"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-2xl bg-red-600 px-5 py-2 text-xs font-black text-white hover:bg-red-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Excluindo..." : "Confirmar Exclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------- MODAL DE PROMPT DE FATURAMENTO / PARCELAS -----------------
interface ContractPromptInstallmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  title?: string;
  description?: string;
  propertyName?: string;
}

export function ContractPromptInstallmentsModal({
  isOpen,
  onClose,
  onGenerate,
  title = "Deseja gerar o faturamento agora?",
  description = "O contrato foi processado com sucesso. Deseja gerar o faturamento (parcelas / carnê) do contrato no Contas a Receber agora?",
  propertyName,
}: ContractPromptInstallmentsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h3 className="mt-5 text-xl font-black text-slate-900">
          {title}
        </h3>
        {propertyName && (
          <p className="mt-1 text-xs font-black uppercase text-orange-600">
            {propertyName}
          </p>
        )}
        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
          {description}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-100 px-6 py-3.5 text-center text-xs font-black text-slate-700 transition hover:bg-slate-200"
          >
            Não, talvez depois
          </button>

          <button
            type="button"
            onClick={onGenerate}
            className="w-full rounded-2xl bg-emerald-600 px-6 py-3.5 text-center text-xs font-black text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700"
          >
            Sim, gerar parcelas
          </button>
        </div>
      </div>
    </div>
  );
}
