"use client";

import React from "react";
import {
  type PrintDocumentKey,
  type PrintDocumentTemplate,
  type PrintEditorViewMode,
  type PrintModalState,
} from "../../types/settings.types";
import { printTemplateVariableGroups } from "../../constants/print-templates";

interface PrintEditorModalProps {
  printModalState: PrintModalState;
  selectedPrintTemplate: PrintDocumentTemplate | null;
  selectedPrintTemplatePreview: string;
  selectedPrintTemplateStats: { characters: number; words: number; lines: number; variables: string[] };
  selectedPrintTemplateMissingVariables: string[];
  printEditorViewMode: PrintEditorViewMode;
  setPrintEditorViewMode: (mode: PrintEditorViewMode) => void;
  printTemplateTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  downloadingPrintTemplateKey: PrintDocumentKey | null;
  isImportingPrintTemplate: boolean;
  onClose: () => void;
  onDownloadForEditing: (documentKey: PrintDocumentKey) => void;
  onOpenImportTutorial: (documentKey: PrintDocumentKey) => void;
}

export const PrintEditorModal: React.FC<PrintEditorModalProps> = ({
  printModalState,
  selectedPrintTemplate,
  selectedPrintTemplatePreview,
  selectedPrintTemplateStats,
  selectedPrintTemplateMissingVariables,
  printEditorViewMode,
  setPrintEditorViewMode,
  printTemplateTextareaRef,
  downloadingPrintTemplateKey,
  isImportingPrintTemplate,
  onClose,
  onDownloadForEditing,
  onOpenImportTutorial,
}) => {
  if (!printModalState.isOpen || !selectedPrintTemplate || !printModalState.documentKey) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="contrx-modal-panel flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-100 text-2xl">
                {selectedPrintTemplate.icon}
              </div>
              <div>
                <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                  Modelo de impresso
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-950">
                  {selectedPrintTemplate.title}
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  {selectedPrintTemplate.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
              aria-label="Fechar modelo de impresso"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-100 p-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPrintEditorViewMode("split")}
                    className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                      printEditorViewMode === "split"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Dividido
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintEditorViewMode("editor")}
                    className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                      printEditorViewMode === "editor"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Texto
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintEditorViewMode("preview")}
                    className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                      printEditorViewMode === "preview"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Prévia
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {printEditorViewMode !== "preview" && (
                  <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                      <p className="text-sm font-black text-slate-950">Texto do modelo</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {selectedPrintTemplateStats.lines} linhas no modelo
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 sm:p-5">
                      <div className="mx-auto max-w-[850px] bg-white px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 sm:px-8">
                        <textarea
                          ref={printTemplateTextareaRef}
                          readOnly
                          value={selectedPrintTemplate?.content || ""}
                          spellCheck={false}
                          className="min-h-[62vh] w-full resize-y border-0 bg-transparent font-serif text-[15px] font-medium leading-8 text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </section>
                )}

                {printEditorViewMode !== "editor" && (
                  <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                      <p className="text-sm font-black text-slate-950">
                        Prévia do arquivo em uso
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Dados de exemplo
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 sm:p-5">
                      <div className="mx-auto min-h-[62vh] max-w-[850px] bg-white px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 sm:px-8">
                        <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700">
                          {selectedPrintTemplatePreview}
                        </pre>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-white px-4 py-4 xl:border-l xl:border-t-0">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Como editar corretamente
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Siga estes passos antes de importar a nova versão.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
                  <div className="space-y-3">
                    {[
                      "Baixe o DOCX atual e abra no Word ou LibreOffice.",
                      "Mantenha os marcadores entre chaves para os dados automáticos.",
                      "Salve como .docx e importe o arquivo editado.",
                    ].map((instruction, index) => (
                      <div key={instruction} className="flex gap-3 rounded-2xl bg-white px-3 py-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <p className="text-xs font-bold leading-5 text-slate-700">
                          {instruction}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDownloadForEditing(printModalState.documentKey!)}
                    disabled={downloadingPrintTemplateKey === printModalState.documentKey}
                    className="mt-3 flex w-full cursor-pointer items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-xs font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingPrintTemplateKey === printModalState.documentKey
                      ? "Preparando arquivo..."
                      : "Baixar arquivo para edição"}
                  </button>
                </div>

                {printModalState.documentKey !== "paymentBooklet" &&
                  printModalState.documentKey !== "accountsPayableReport" && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Importar contrato Word
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Envie um .docx com marcadores como {"{{inquilino_nome}}"}, {"{{bem_nome}}"} ou {"{{valor_aluguel}}"}.
                      </p>

                      <button
                        type="button"
                        onClick={() => onOpenImportTutorial(printModalState.documentKey!)}
                        disabled={isImportingPrintTemplate}
                        className="mt-3 flex w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isImportingPrintTemplate ? "Importando..." : "Selecionar DOCX"}
                      </button>
                    </div>
                  )}

                {selectedPrintTemplateMissingVariables.length > 0 && (
                  <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-800">
                    Campos recomendados ausentes: {selectedPrintTemplateMissingVariables.join(", ")}.
                  </div>
                )}

                {printTemplateVariableGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
                      {group.title}
                    </p>

                    <div className="grid gap-2">
                      {group.variables.map((variable) => (
                        <div
                          key={`${group.title}-${variable.value}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                        >
                          <span>{variable.label}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {variable.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
