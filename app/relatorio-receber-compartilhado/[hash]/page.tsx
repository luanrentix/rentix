"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, ShieldAlert, Loader2, Building2, Calendar, FileText } from "lucide-react";
import { getSharedReceivableReport } from "@/services/financial.service";

export default function RelatorioReceberCompartilhadoPage() {
  const params = useParams();
  const hash = params?.hash as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hash) return;
    setIsLoading(true);
    setError("");

    getSharedReceivableReport(hash)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Este link de relatório compartilhado já expirou ou é inválido.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [hash]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(val) ? val : 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Pago</span>;
      case "Overdue":
        return <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">Vencido</span>;
      default:
        return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Pendente</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-orange-500" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Relatório...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl space-y-4">
          <div className="inline-flex rounded-2xl bg-red-50 p-3.5 text-red-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase">Link Expirado ou Inválido</h2>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed">
            {error.includes("expirou")
              ? "Este link de relatório compartilhado expirou por atingir o limite máximo de 7 dias de validade."
              : error}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">
            Solicite um novo link de relatório ao emissor.
          </div>
        </div>
      </div>
    );
  }

  const accounts = data?.accounts || [];
  const company = data?.company || {};

  // Filtros aplicados
  const filteredAccounts = accounts.filter((acc: any) => {
    if (data.filterStatus && data.filterStatus !== "All" && acc.status !== data.filterStatus) {
      return false;
    }
    if (data.tenantId && String(acc.tenantId || "") !== String(data.tenantId) && acc.tenantName?.toLowerCase() !== data.tenantId.toLowerCase()) {
      return false;
    }
    if (data.filterStartDate) {
      const start = new Date(`${data.filterStartDate}T00:00:00`);
      const due = new Date(acc.dueDate);
      if (due < start) return false;
    }
    if (data.filterEndDate) {
      const end = new Date(`${data.filterEndDate}T23:59:59`);
      const due = new Date(acc.dueDate);
      if (due > end) return false;
    }
    return true;
  });

  const totalAmount = filteredAccounts.reduce((sum: number, acc: any) => sum + Number(acc.amount || 0), 0);
  const totalPaid = filteredAccounts.reduce((sum: number, acc: any) => sum + Number(acc.paidAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* CABEÇALHO DA EMPRESA */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{company.tradeName || company.companyName || "Empresa"}</h1>
              <p className="text-xs font-medium text-slate-400">
                {company.document ? `CNPJ: ${company.document}` : ""} {company.phone ? `• Tel: ${company.phone}` : ""}
              </p>
            </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-lg no-print"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </button>
        </div>

        {/* TÍTULO DO RELATÓRIO & FILTROS APLICADOS */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-widest">
              <FileText className="h-4 w-4" />
              Relatório de Contas a Receber
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">Demonstrativo Financeiro</h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Período: {data.filterStartDate ? formatDate(data.filterStartDate) : "Início"} até {data.filterEndDate ? formatDate(data.filterEndDate) : "Atual"}</span>
          </div>
        </div>

        {/* TABELA DE LANÇAMENTOS */}
        <div className="p-6 sm:p-8 overflow-x-auto">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 font-medium">
              Nenhuma conta a receber encontrada para os filtros deste relatório.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                  <th className="pb-3 pr-4">Vencimento</th>
                  <th className="pb-3 pr-4">Cliente / Inquilino</th>
                  <th className="pb-3 pr-4">Bem / Imóvel</th>
                  <th className="pb-3 pr-4 text-center">Status</th>
                  <th className="pb-3 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredAccounts.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 pr-4 font-bold text-slate-900 whitespace-nowrap">
                      {formatDate(acc.dueDate)}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-slate-800">
                      {acc.tenantName || acc.person?.name || "-"}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-500">
                      {acc.propertyName || acc.property?.title || "-"}
                    </td>
                    <td className="py-3.5 pr-4 text-center">
                      {getStatusBadge(acc.status)}
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(Number(acc.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TOTALIZADORES */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs font-semibold text-slate-400">
              Link público seguro com validade de 7 dias.
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block">Total Recebido</span>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block">Total Previsto / Bruto</span>
                <span className="text-base font-black text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
