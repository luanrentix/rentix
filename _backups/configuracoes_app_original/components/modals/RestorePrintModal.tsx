"use client";

import React from "react";
import {
  type PrintDocumentTemplate,
  type RestorePrintModalState,
} from "../../types/settings.types";

interface RestorePrintModalProps {
  restorePrintModalState: RestorePrintModalState;
  selectedRestorePrintTemplate: PrintDocumentTemplate | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestorePrintModal: React.FC<RestorePrintModalProps> = ({
  restorePrintModalState,
  selectedRestorePrintTemplate,
  onClose,
  onConfirm,
}) => {
  if (!restorePrintModalState.isOpen || !selectedRestorePrintTemplate) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="contrx-modal-panel w-full max-w-lg overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-red-50 via-white to-white px-6 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-3xl">
              🔄
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Restaurar impresso padrão
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Esta ação vai substituir o texto atual pelo modelo padrão do Contrx. A alteração só será gravada definitivamente ao clicar em Salvar configurações.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-6 py-5">
          <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Impresso selecionado
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {selectedRestorePrintTemplate.title}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {selectedRestorePrintTemplate.description}
            </p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
            >
              Restaurar padrão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
