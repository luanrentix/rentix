"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Printer, ShieldAlert, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { getSharedContract, type SharedContractResponse } from "@/services/contracts.service";
import {
  buildContractHtml,
} from "@/components/contracts/contract-print-service";

export default function ContratoCompartilhadoPage() {
  const params = useParams();
  const hash = params?.hash as string;

  const [data, setData] = useState<SharedContractResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hash) return;
    setIsLoading(true);
    setError("");

    getSharedContract(hash)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Este link de contrato compartilhado já expirou (limite de 7 dias) ou é inválido."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [hash]);

  const contractHtml = useMemo(() => {
    if (!data?.contract) return "";
    const contract = data.contract;
    const property = contract.property || undefined;
    const tenant = contract.tenant || undefined;

    return buildContractHtml(contract, property, tenant, false);
  }, [data]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  const handlePrint = () => {
    if (!data?.contract) return;
    const printWindow = window.open("", "_blank", "width=1000,height=900");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(contractHtml);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600 mb-4" />
        <h2 className="text-lg font-black text-slate-800">Carregando Contrato de Locação...</h2>
        <p className="text-xs text-slate-500 mt-1">Aguarde um momento enquanto carregamos o documento.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-lg font-black text-slate-900">Link Expirado ou Inválido</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || "Este link de contrato não está mais disponível. Links compartilhados possuem validade máxima de 7 dias."}
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-400">
              Entre em contato com o locador para solicitar um novo link.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const companyName = data.company?.tradeName || data.company?.companyName || "Contrx Locações";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 px-4 print:p-0 print:bg-white">
      {/* Barra de Ações Superior */}
      <header className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900">
              {data.contract?.propertyName || "Contrato de Locação"}
            </h1>
            <p className="text-xs text-slate-500 font-semibold">
              {companyName} • Locatário: {data.contract?.tenantName || "Inquilino"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-black text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Válido até {formatDate(data.expiresAt)}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white hover:bg-orange-700 transition shadow-sm active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </header>

      {/* Documento do Contrato */}
      <main className="w-full max-w-4xl bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        <iframe
          srcDoc={contractHtml}
          title="Contrato de Locação"
          className="w-full min-h-[1100px] border-none"
        />
      </main>
    </div>
  );
}
