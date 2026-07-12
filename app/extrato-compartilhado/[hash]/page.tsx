"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Calendar, ShieldAlert, Loader2, Building2 } from "lucide-react";
import { getSharedBankStatement, type SharedBankStatementResponse } from "@/services/bancos.service";

export default function ExtratoCompartilhadoPage() {
  const params = useParams();
  const hash = params?.hash as string;

  const [data, setData] = useState<SharedBankStatementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hash) return;
    setIsLoading(true);
    setError("");

    getSharedBankStatement(hash)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Este link de extrato compartilhado já expirou ou é inválido.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [hash]);

  const formatCurrency = (val: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(val);
  };

  const statementTotals = data ? (() => {
    let inflows = 0;
    let outflows = 0;
    data.transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === "INFLOW") {
        inflows += amt;
      } else if (tx.type === "OUTFLOW") {
        outflows += amt;
      }
    });
    return {
      inflows,
      outflows,
      balance: inflows - outflows,
    };
  })() : { inflows: 0, outflows: 0, balance: 0 };

  const consolidatedBalance = data ? data.accounts.reduce((sum, acc) => sum + Number(acc.currentBalance), 0) : 0;
  const activeAccountName = data && data.filterAccount ? data.accounts.find((a) => a.id === data.filterAccount)?.name : null;

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-orange-500" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Extrato...</p>
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
              ? "Este link de extrato compartilhado expirou por atingir o limite máximo de 24 horas de validade."
              : error}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">
            Solicite um novo link de extrato para o administrador.
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.transactions.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl space-y-4">
          <h2 className="text-lg font-black text-slate-900 uppercase">Nenhum Lançamento</h2>
          <p className="text-sm font-semibold text-slate-500">
            Nenhuma movimentação bancária foi encontrada para os filtros configurados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm print:hidden">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-orange-500 uppercase tracking-wider">
              <Building2 className="h-4.5 w-4.5" />
              {data.companyName}
            </div>
            <h1 className="text-xl font-black text-slate-950 mt-1">Extrato Compartilhado</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Válido por 24h a partir da data de envio
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 transition shadow-sm self-end sm:self-center"
          >
            <Printer className="h-4 w-4" />
            Imprimir Extrato
          </button>
        </div>

        {/* Informações Básicas e Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Origem do Extrato</p>
            <p className="text-sm font-black text-slate-800">
              {activeAccountName ? `Conta: ${activeAccountName}` : "Consolidado (Todas as contas)"}
            </p>
            <p className="text-xs font-bold text-slate-500">
              Período: {data.filterStartDate ? new Date(data.filterStartDate).toLocaleDateString('pt-BR') : 'Início'} a {data.filterEndDate ? new Date(data.filterEndDate).toLocaleDateString('pt-BR') : 'Fim'}
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Saldo Atual da Conta</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(consolidatedBalance, data.accounts[0]?.currency)}
              </h3>
            </div>
          </div>
        </div>

        {/* Tabela do Extrato */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden p-6">
          <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">Lançamentos</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Descrição</th>
                  <th className="pb-3 pr-4">Conta</th>
                  <th className="pb-3 pr-4 text-right">Valor</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.transactions.map((tx) => {
                  const amount = Number(tx.amount);
                  const isOutflow = tx.type === "OUTFLOW";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 pr-4 font-semibold text-slate-600 whitespace-nowrap">
                        {new Date(tx.competenceDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-slate-800">{tx.description}</p>
                        {tx.category && (
                          <span className="inline-block mt-1 text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {tx.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-600 whitespace-nowrap">
                        {tx.bankAccount?.name}
                      </td>
                      <td className={`py-3 pr-4 text-right font-black whitespace-nowrap ${isOutflow ? "text-red-600" : "text-emerald-600"}`}>
                        {isOutflow ? "-" : "+"} {formatCurrency(amount, tx.bankAccount?.currency)}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        {tx.status === "CONFIRMED" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            Liquidado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                            Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-100">
                <tr className="font-black text-sm text-slate-800">
                  <td colSpan={3} className="py-3 px-4 font-black">
                    Total Lançamentos
                  </td>
                  <td className={`py-3 pr-4 text-right font-black ${
                    statementTotals.balance >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {statementTotals.balance >= 0 ? "+" : "-"} {formatCurrency(Math.abs(statementTotals.balance), data.accounts[0]?.currency)}
                  </td>
                  <td className="py-3 text-center text-slate-400 font-bold">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
