"use client";

import React from "react";
import { Download, FileText, X } from "lucide-react";
import {
  type PrintDocumentKey,
  type PrintDocumentTemplate,
} from "../../types/settings.types";

interface PrintPreviewModalProps {
  isOpen: boolean;
  documentKey: PrintDocumentKey | null;
  selectedPrintTemplate: PrintDocumentTemplate | null;
  selectedPrintTemplatePreview: string;
  downloadingPrintTemplateKey: PrintDocumentKey | null;
  onClose: () => void;
  onDownloadDocx: (documentKey: PrintDocumentKey) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  documentKey,
  selectedPrintTemplate,
  selectedPrintTemplatePreview,
  downloadingPrintTemplateKey,
  onClose,
  onDownloadDocx,
}) => {
  if (!isOpen || !selectedPrintTemplate || !documentKey) return null;

  const isDownloading = downloadingPrintTemplateKey === documentKey;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6 backdrop-blur-sm">
      <div className="contrx-modal-panel flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {selectedPrintTemplate.title}
                  </h2>
                  {selectedPrintTemplate.importedFileName ? (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      Personalizado ({selectedPrintTemplate.importedFileName})
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      Padrão do Sistema
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  Visualização da minuta formatada com dados de demonstração.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDownloadDocx(documentKey)}
                disabled={isDownloading}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-orange-500" />
                <span>{isDownloading ? "Baixando..." : "Baixar Word (.docx)"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 border border-slate-200 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar visualização"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content (A4 Document Canvas) */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6">
          <div className="mx-auto max-w-[780px] rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] font-normal leading-relaxed text-slate-800 selection:bg-orange-100">
              {selectedPrintTemplatePreview}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:px-6">
          <p className="text-xs text-slate-400">
            Para alterar cláusulas, baixe o arquivo em Word, edite e importe de volta.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onDownloadDocx(documentKey)}
              disabled={isDownloading}
              className="inline-flex sm:hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-orange-500" />
              <span>{isDownloading ? "Baixando..." : "Baixar Word"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Fechar visualização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
