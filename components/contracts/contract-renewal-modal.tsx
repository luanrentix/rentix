"use client";

import React, { useState, useEffect } from "react";
import {
  Contract,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  formatDate,
} from "./contract-types";
import { X, RotateCcw } from "lucide-react";

interface ContractRenewalModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    endDate: string;
    rentValue: number;
    notes?: string;
  }) => Promise<void>;
}

export function ContractRenewalModal({
  contract,
  isOpen,
  onClose,
  onConfirm,
}: ContractRenewalModalProps) {
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contract && isOpen) {
      setEndDate(contract.endDate || "");
      setRentValue(formatCurrencyInput(contract.rentValue || 0));
      setNotes("");
      setError("");
    }
  }, [contract, isOpen]);

  if (!isOpen || !contract) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!endDate) {
      setError("Informe a nova data de término do contrato.");
      return;
    }

    if (new Date(endDate) <= new Date(contract!.endDate)) {
      setError("A nova data de término deve ser posterior à data final atual.");
      return;
    }

    const numericRent = parseCurrencyInput(rentValue);
    if (!numericRent || numericRent <= 0) {
      setError("Informe um novo valor de aluguel válido.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        endDate,
        rentValue: numericRent,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar a renovação do contrato."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Renovação de Contrato
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Gere um aditivo estendendo a vigência e reajustando o valor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700">
                {error}
              </div>
            )}

            {/* Resumo do Contrato Atual */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Imóvel:</span>
                <span className="font-black text-slate-900">{contract.propertyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Locatário:</span>
                <span className="font-black text-slate-900">{contract.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Término Atual:</span>
                <span className="font-black text-slate-900">{formatDate(contract.endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Aluguel Atual:</span>
                <span className="font-black text-slate-900">{formatCurrency(contract.rentValue)}</span>
              </div>
            </div>

            {/* Nova Data de Término */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Nova Data de Término <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            {/* Novo Valor do Aluguel */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Novo Valor do Aluguel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={rentValue}
                onChange={(e) => setRentValue(formatCurrencyInput(e.target.value))}
                placeholder="R$ 0,00"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Observações / Termos do Aditivo */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Observações do Aditivo (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reajuste anual pactuado conforme índice de mercado."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Processando..." : "Confirmar Renovação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
