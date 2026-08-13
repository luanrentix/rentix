"use client";

import React from "react";
import { type ResetModuleOption, type ResetOptions } from "../../types/settings.types";

interface ResetTestDataModalProps {
  isOpen: boolean;
  canResetTestData: boolean;
  selectedResetModulesCount: number;
  resetModuleOptions: ResetModuleOption[];
  resetOptions: ResetOptions;
  resetError: string;
  isResettingData: boolean;
  onClose: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onToggleOption: (key: ResetModuleOption["key"]) => void;
  onConfirm: () => void;
}

export const ResetTestDataModal: React.FC<ResetTestDataModalProps> = ({
  isOpen,
  canResetTestData,
  selectedResetModulesCount,
  resetModuleOptions,
  resetOptions,
  resetError,
  isResettingData,
  onClose,
  onSelectAll,
  onClear,
  onToggleOption,
  onConfirm,
}) => {
  if (!isOpen || !canResetTestData) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-100 text-2xl">
                ⚠️
              </div>
              <div>
                <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                  Ação crítica
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-950">
                  Resetar dados de teste
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Selecione os módulos que deseja limpar. Essa ação remove os dados da empresa atual no banco e também limpa filtros locais do navegador.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
              aria-label="Fechar reset de dados"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-red-100 bg-red-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-red-800">
                {selectedResetModulesCount} módulo(s) selecionado(s)
              </p>
              <p className="mt-1 text-xs font-semibold text-red-700">
                Use os atalhos abaixo para selecionar todos os módulos ou limpar a seleção.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-red-700 shadow-sm transition hover:bg-red-100"
              >
                Selecionar todos
              </button>

              <button
                type="button"
                onClick={onClear}
                className="rounded-2xl bg-red-100 px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-200"
              >
                Limpar seleção
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {resetModuleOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onToggleOption(option.key)}
                className={`rounded-3xl border p-4 text-left transition ${
                  resetOptions[option.key]
                    ? "border-red-300 bg-red-50 shadow-sm shadow-red-100"
                    : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
                      resetOptions[option.key] ? "bg-red-500 text-white" : "bg-slate-100"
                    }`}
                  >
                    {option.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">{option.label}</p>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs font-black ${
                          resetOptions[option.key]
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {resetError && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {resetError}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isResettingData}
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isResettingData}
            className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResettingData ? "Limpando..." : "Confirmar limpeza"}
          </button>
        </div>
      </div>
    </div>
  );
};
