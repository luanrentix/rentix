"use client";

import React from "react";
import {
  type ImportPrintModalState,
  type PrintDocumentTemplate,
} from "../../types/settings.types";

interface ImportPrintModalProps {
  importPrintModalState: ImportPrintModalState;
  selectedImportPrintTemplate: PrintDocumentTemplate | null;
  printTemplateDocxInputRef: React.RefObject<HTMLInputElement | null>;
  isImportingPrintTemplate: boolean;
  onClose: () => void;
  onSelectDocx: () => void;
  onFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImportPrintModal: React.FC<ImportPrintModalProps> = ({
  importPrintModalState,
  selectedImportPrintTemplate,
  printTemplateDocxInputRef,
  isImportingPrintTemplate,
  onClose,
  onSelectDocx,
  onFileSelected,
}) => {
  if (!importPrintModalState.isOpen || !selectedImportPrintTemplate || !importPrintModalState.documentKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] border border-orange-100 bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl sm:h-14 sm:w-14 sm:rounded-3xl sm:text-2xl">
                {selectedImportPrintTemplate.icon}
              </div>
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                  Importar DOCX
                </div>
                <h2 className="mt-3 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                  Prepare o contrato no Word
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Antes de enviar, confira se o arquivo está em .docx e se os dados automáticos usam os marcadores do Contrx.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600 sm:h-11 sm:w-11 sm:text-xl"
              aria-label="Fechar tutorial de importação"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Modelo selecionado
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {selectedImportPrintTemplate.title}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {selectedImportPrintTemplate.description}
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {[
              "Edite o contrato no Word e mantenha apenas texto editável; PDF convertido em imagem não será lido.",
              "Troque os dados que variam por marcadores, como {tenantName}, {propertyName}, {amount}, {startDate} e {endDate}.",
              "Salve como .docx, importe aqui e depois revise a prévia antes de salvar as configurações.",
            ].map((instruction, index) => (
              <div
                key={instruction}
                className="flex gap-3 rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xs font-black text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-bold leading-6 text-slate-700">
                  {instruction}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-amber-800">
              Importante
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-amber-700">
              Se faltar algum marcador recomendado, a importação continua, mas o sistema avisará para você ajustar o texto.
            </p>
          </div>

          <input
            ref={printTemplateDocxInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={isImportingPrintTemplate}
            onChange={onFileSelected}
          />

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 sm:w-auto"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onSelectDocx}
              disabled={isImportingPrintTemplate}
              className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-md shadow-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isImportingPrintTemplate ? "Importando..." : "Selecionar DOCX"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
