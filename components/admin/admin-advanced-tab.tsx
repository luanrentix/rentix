"use client";

import React from "react";
import {
  Cpu,
  RefreshCw,
  Database,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

interface AdminAdvancedTabProps {
  isLoading: boolean;
  onForceReload: () => void;
  onReprocessCommercialExpirations: () => void;
}

export function AdminAdvancedTab({
  isLoading,
  onForceReload,
  onReprocessCommercialExpirations,
}: AdminAdvancedTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Configurações Avançadas & Diagnóstico do Sistema
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Operações críticas, status de conexão e manutenção em lote da plataforma.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Status de Conexão */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500">
                Infraestrutura
              </span>
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">
                API NestJS & PostgreSQL
              </h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Conexão ativa com o banco PostgreSQL local e VPS.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Operacional & Conectado
              </span>
            </div>
          </div>

          {/* Card 2: Reprocessamento de Vencimentos */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500">
                Motor Comercial
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">
                Vencimentos Automáticos
              </h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Verifica todas as empresas e atualiza status para VENCIDO caso o prazo tenha expirado.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onReprocessCommercialExpirations}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Reprocessar Agora
              </button>
            </div>
          </div>

          {/* Card 3: Sincronização Forçada */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500">
                Cache & Dados
              </span>
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">
                Recarga Forçada do Painel
              </h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Recarrega contagens, empresas e usuários diretamente do banco sem cache.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onForceReload}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Sincronizar Dados
              </button>
            </div>
          </div>
        </div>

        {/* Seção Informativa de Reset e Limpeza */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-600" />
              Limpeza de Dados de Teste (Reset Modular)
            </h4>
            <p className="text-xs font-semibold text-slate-500">
              O módulo de reset modular com trava transacional segura está disponível na aba de Configurações do Sistema.
            </p>
          </div>

          <Link
            href="/configuracoes"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100 transition shadow-sm shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Abrir Configurações
          </Link>
        </div>
      </div>
    </div>
  );
}
