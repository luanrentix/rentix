"use client";

import React from "react";
import {
  FileText,
  Eye,
  Edit3,
  Download,
  RotateCcw,
} from "lucide-react";
import {
  type PrintDocumentKey,
  type PrintDocumentTemplate,
  type PrintTemplates,
} from "../types/settings.types";

interface PrintSettingsTabProps {
  printTemplates: PrintTemplates;
  onOpenPrintModal: (documentKey: PrintDocumentKey, mode: "view" | "edit") => void;
  onOpenImportPrintModal: (documentKey: PrintDocumentKey) => void;
  onOpenRestorePrintModal: (documentKey: PrintDocumentKey) => void;
}

export const PrintSettingsTab: React.FC<PrintSettingsTabProps> = ({
  printTemplates,
  onOpenPrintModal,
  onOpenImportPrintModal,
  onOpenRestorePrintModal,
}) => {
  const documentKeys: PrintDocumentKey[] = [
    "temporaryContract",
    "standardContract",
    "assetContract",
    "paymentBooklet",
    "accountsPayableReport",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Modelos de impressos e contratos</h2>
        <p className="mt-1 text-sm font-normal text-slate-500">
          Personalize as minutas em HTML/DOCX, layouts de carnês e relatórios em PDF do sistema.
        </p>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {documentKeys.map((key) => {
          const template: PrintDocumentTemplate = printTemplates[key];
          if (!template) return null;

          return (
            <div
              key={key}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{template.title}</h3>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {template.moduleName}
                      </span>
                    </div>
                  </div>

                  {template.importedFileName ? (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                      Importado ({template.importedFileName})
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      Padrão do Sistema
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal(key, "view")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4 text-slate-500" />
                    <span>Visualizar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPrintModal(key, "edit")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
                  >
                    <Edit3 className="h-4 w-4 text-white" />
                    <span>Editar texto</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenImportPrintModal(key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    title="Importar de arquivo Word (.docx)"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    <span>Importar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenRestorePrintModal(key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50/40 px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    title="Restaurar modelo padrão do sistema"
                  >
                    <RotateCcw className="h-4 w-4 text-red-500" />
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

