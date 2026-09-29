"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Contract,
  Property,
  ContrxTenant,
  ContractRenewalRecord,
} from "./contract-types";
import {
  buildContractHtml,
  buildStandardResidentialContractHtml,
  buildTemporaryRentalContractHtml,
  buildPrintableAdendumHtml,
  buildCustomContentContractHtml,
  getDefaultContractText,
  getSavedContractCustomContent,
  saveContractCustomContent,
  removeSavedContractCustomContent,
} from "./contract-print-service";
import {
  X,
  Printer,
  Edit3,
  Save,
  RotateCcw,
  CheckCircle2,
  FileText,
  Eye,
  ArrowRight,
} from "lucide-react";

interface ContractPrintModalProps {
  contract: Contract | null;
  adendum?: {
    contract: Contract;
    renewal: ContractRenewalRecord;
  } | null;
  property?: Property | null;
  tenant?: ContrxTenant | null;
  companyId?: string;
  isOpen: boolean;
  onClose: () => void;
  onProceedToInstallments?: () => void;
}

export function ContractPrintModal({
  contract,
  adendum,
  property,
  tenant,
  companyId,
  isOpen,
  onClose,
  onProceedToInstallments,
}: ContractPrintModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customContent, setCustomContent] = useState("");
  const [hasCustomContent, setHasCustomContent] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activeContract = adendum ? adendum.contract : contract;

  // Carregar conteúdo inicial
  useEffect(() => {
    if (!isOpen || !activeContract) return;

    setIsEditing(false);
    setFeedbackMessage("");

    if (adendum) {
      // Aditivo
      setHasCustomContent(false);
      setCustomContent("");
    } else {
      // Contrato
      const saved = getSavedContractCustomContent(companyId, activeContract.id);
      if (saved) {
        setHasCustomContent(true);
        setCustomContent(saved);
      } else {
        setHasCustomContent(false);
        setCustomContent("");
      }
    }
  }, [isOpen, activeContract, adendum, companyId]);

  if (!isOpen || !activeContract) return null;

  function generateHtml(showToolbar = false): string {
    if (adendum) {
      return buildPrintableAdendumHtml(adendum.contract, adendum.renewal, showToolbar);
    }

    if (customContent && (hasCustomContent || isEditing)) {
      return buildCustomContentContractHtml(customContent, showToolbar);
    }

    return buildContractHtml(activeContract!, property || undefined, tenant || undefined, showToolbar);
  }

  function handleStartEditing() {
    if (!customContent) {
      const defaultText = getDefaultContractText(
        activeContract!,
        property || undefined,
        tenant || undefined
      );
      setCustomContent(defaultText);
    }
    setIsEditing(true);
  }

  function handleCancelEditing() {
    if (!hasCustomContent) {
      setCustomContent("");
    } else {
      const saved = getSavedContractCustomContent(companyId, activeContract!.id);
      setCustomContent(saved || "");
    }
    setIsEditing(false);
  }

  function handleSaveEdits() {
    if (!activeContract || adendum) return;
    saveContractCustomContent(companyId, activeContract.id, customContent);
    setHasCustomContent(true);
    setIsEditing(false);
    setFeedbackMessage("Minuta personalizada salva com sucesso para este contrato!");
    setTimeout(() => setFeedbackMessage(""), 3500);
  }

  function handleResetTemplate() {
    if (!activeContract || adendum) return;
    removeSavedContractCustomContent(companyId, activeContract.id);
    setHasCustomContent(false);
    setCustomContent("");
    setIsEditing(false);
    setFeedbackMessage("Minuta restaurada para o modelo padrão do sistema!");
    setTimeout(() => setFeedbackMessage(""), 3500);
  }

  function handlePrint() {
    const html = generateHtml(true);
    const printWindow = window.open("", "_blank", "width=1000,height=900");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header Superior */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {adendum
                  ? "Aditivo de Renovação de Contrato"
                  : `Minuta Contratual — ${activeContract.propertyName}`}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                {adendum
                  ? `Prorrogação até ${activeContract.endDate}`
                  : hasCustomContent
                  ? "Minuta personalizada exclusivamente para este contrato"
                  : "Modelo padrão do sistema pronto para impressão"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!adendum && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveEdits();
                    } else {
                      handleStartEditing();
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black transition ${
                    isEditing
                      ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <Save className="h-3.5 w-3.5" /> Salvar Minuta
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5 text-orange-600" /> Editar Minuta
                    </>
                  )}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shadow-sm"
                  >
                    Cancelar
                  </button>
                )}

                {hasCustomContent && !isEditing && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    title="Restaurar modelo original"
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Padrão
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white hover:bg-orange-700 transition shadow-md shadow-orange-500/20"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>

            {onProceedToInstallments && (
              <button
                type="button"
                onClick={onProceedToInstallments}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20 animate-pulse"
                title="Avançar para a geração de parcelas no Contas a Receber"
              >
                <span>Avançar: Gerar Parcelas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Banner do Fluxo de Criação de Contrato */}
        {onProceedToInstallments && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-2.5 flex items-center justify-between text-xs text-orange-900 shrink-0">
            <span className="font-bold">
              Etapa 2 de 5: Visualize e imprima o contrato. Quando terminar, avance para gerar as parcelas financeiras.
            </span>
            <button
              type="button"
              onClick={onProceedToInstallments}
              className="inline-flex items-center gap-1 font-black text-orange-700 hover:text-orange-950 underline underline-offset-2"
            >
              Avançar agora ➔
            </button>
          </div>
        )}

        {/* Feedback Alert se houver */}
        {feedbackMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center gap-2 text-xs font-black text-emerald-800 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {feedbackMessage}
          </div>
        )}

        {/* Corpo do Documento */}
        <div className="flex-1 bg-slate-100 p-4 overflow-y-auto">
          {isEditing ? (
            <div className="max-w-[210mm] mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-orange-600">
                    Edição Exclusiva da Minuta
                  </span>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    As alterações salvas serão aplicadas <strong>apenas a este contrato</strong> ({activeContract.propertyName}). Os demais contratos e novos cadastros permanecem no modelo padrão.
                  </p>
                </div>
                {hasCustomContent && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      title="Restaurar para o modelo padrão"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
                    </button>
                  </div>
                )}
              </div>
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Carregando o texto da minuta..."
                rows={30}
                className="w-full font-mono text-xs text-slate-800 leading-relaxed outline-none border border-slate-200 rounded-xl p-4 bg-slate-50/50 resize-y focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={generateHtml(false)}
              title="Pré-visualização do Contrato"
              className="w-full h-full min-h-[600px] border-0 rounded-2xl shadow-inner bg-slate-200"
            />
          )}
        </div>
      </div>
    </div>
  );
}
