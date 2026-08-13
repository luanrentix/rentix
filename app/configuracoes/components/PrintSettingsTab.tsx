"use client";

import React from "react";
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
      <div>
        <h2 className="text-xl font-black text-slate-950">Modelos de impressos e contratos</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Gerencie os modelos de documentos PDF, carnês e relatórios do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {documentKeys.map((key) => {
          const template: PrintDocumentTemplate = printTemplates[key];
          if (!template) return null;

          return (
            <div
              key={key}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-xl font-black text-orange-600">
                      {template.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-slate-950">{template.title}</h3>
                      <p className="text-xs font-bold text-slate-400">{template.moduleName}</p>
                    </div>
                  </div>

                  {template.importedFileName && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                      Importado ({template.importedFileName})
                    </span>
                  )}
                </div>

                <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
                  {template.description}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal(key, "view")}
                    className="rounded-2xl bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    👁️ Visualizar
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPrintModal(key, "edit")}
                    className="rounded-2xl bg-orange-500 px-3.5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-orange-600"
                  >
                    ✏️ Editar texto
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenImportPrintModal(key)}
                    className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 transition hover:bg-slate-50"
                    title="Importar de arquivo Word (.docx)"
                  >
                    📥 Importar
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenRestorePrintModal(key)}
                    className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-red-600 border border-red-100 transition hover:bg-red-50"
                    title="Restaurar modelo padrão do sistema"
                  >
                    🔄 Restaurar
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
