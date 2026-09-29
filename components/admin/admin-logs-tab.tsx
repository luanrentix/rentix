"use client";

import React from "react";
import {
  Bug,
  AlertTriangle,
  Database,
  Terminal,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
} from "lucide-react";
import type {
  SystemErrorLog,
  SystemErrorLogSummary,
} from "./admin-types";
import { formatDateTime } from "./admin-types";

interface AdminLogsTabProps {
  logs: SystemErrorLog[];
  logSummary: SystemErrorLogSummary;
  logTotal: number;
  logPages: number;
  logPage: number;
  isLoadingLogs: boolean;
  isPurgingLogs: boolean;
  logLevelFilter: string;
  onLogLevelFilterChange: (value: string) => void;
  logModuleFilter: string;
  onLogModuleFilterChange: (value: string) => void;
  logPeriodFilter: "24h" | "7d" | "30d" | "all";
  onLogPeriodFilterChange: (value: "24h" | "7d" | "30d" | "all") => void;
  logSearch: string;
  onLogSearchChange: (value: string) => void;
  onSelectLog: (log: SystemErrorLog) => void;
  onReloadLogs: () => void;
  onPageChange: (newPage: number) => void;
  onPurgeNoiseLogs: () => void;
  onPurgeOldLogs: () => void;
  onPurgeAllLogs: () => void;
}

export function AdminLogsTab({
  logs,
  logSummary,
  logTotal,
  logPages,
  logPage,
  isLoadingLogs,
  isPurgingLogs,
  logLevelFilter,
  onLogLevelFilterChange,
  logModuleFilter,
  onLogModuleFilterChange,
  logPeriodFilter,
  onLogPeriodFilterChange,
  logSearch,
  onLogSearchChange,
  onSelectLog,
  onReloadLogs,
  onPageChange,
  onPurgeNoiseLogs,
  onPurgeOldLogs,
  onPurgeAllLogs,
}: AdminLogsTabProps) {
  return (
    <div className="space-y-6">
      {/* KPIs de Logs do Sistema */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Erros 24h */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Erros (24 Horas)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Bug className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {logSummary.total24h}
          </p>
          <p className="text-[11px] font-bold text-slate-400">
            Ocorrências hoje
          </p>
        </div>

        {/* Card 2: Críticos 500 */}
        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
              Erros Críticos (500)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-red-700">
            {logSummary.totalCritical}
          </p>
          <p className="text-[11px] font-bold text-red-600">
            Falhas no servidor
          </p>
        </div>

        {/* Card 3: Módulos Afetados */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Módulos Afetados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {logSummary.affectedModulesCount}
          </p>
          <p className="text-[11px] font-bold text-slate-400">
            Áreas com exceções
          </p>
        </div>

        {/* Card 4: Principal Módulo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Maior Frequência
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Terminal className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-base font-black text-slate-900 truncate">
            {logSummary.topAffectedModule || "Nenhum"}
          </p>
          <p className="text-[11px] font-bold text-slate-400">
            Módulo mais acionado
          </p>
        </div>
      </div>

      {/* Filtros e Ações de Logs */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(240px,2fr)_160px_160px_150px_auto]">
          {/* Busca */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Buscar Log
            </label>
            <div className="relative">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => onLogSearchChange(e.target.value)}
                placeholder="Mensagem, rota, endpoint, e-mail..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Nível */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Nível
            </label>
            <select
              value={logLevelFilter}
              onChange={(e) => onLogLevelFilterChange(e.target.value)}
              className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            >
              <option value="all">Todos os Níveis</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
            </select>
          </div>

          {/* Módulo */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Módulo
            </label>
            <select
              value={logModuleFilter}
              onChange={(e) => onLogModuleFilterChange(e.target.value)}
              className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            >
              <option value="all">Todos Módulos</option>
              <option value="Contas a Receber">Contas a Receber</option>
              <option value="Contas a Pagar">Contas a Pagar</option>
              <option value="Bens e Ativos">Bens / Ativos</option>
              <option value="Contratos">Contratos</option>
              <option value="Pessoas">Pessoas</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Autenticação">Autenticação</option>
            </select>
          </div>

          {/* Período */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Período
            </label>
            <select
              value={logPeriodFilter}
              onChange={(e) =>
                onLogPeriodFilterChange(e.target.value as "24h" | "7d" | "30d" | "all")
              }
              className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            >
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todo o histórico</option>
            </select>
          </div>

          {/* Botões de Ação de Manutenção */}
          <div className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={onPurgeNoiseLogs}
              disabled={isPurgingLogs}
              className="flex h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3.5 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
              title="Remover 404 e tentativas de invasão (.env, .git, etc.)"
            >
              <Trash2 className="h-3.5 w-3.5 text-amber-600" />
              404/Bots
            </button>

            <button
              type="button"
              onClick={onPurgeOldLogs}
              disabled={isPurgingLogs}
              className="flex h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              title="Expurgar logs com mais de 30 dias"
            >
              <Trash2 className="h-3.5 w-3.5" />
              &gt;30d
            </button>

            <button
              type="button"
              onClick={onPurgeAllLogs}
              disabled={isPurgingLogs}
              className="flex h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-red-50 px-3.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              title="Zerar todos os logs do banco"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Zerar
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900">
              Registros Encontrados
            </h3>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {logTotal}
            </span>
          </div>

          <button
            type="button"
            onClick={onReloadLogs}
            disabled={isLoadingLogs}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoadingLogs ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Nível</th>
                <th className="px-6 py-3.5">Data / Hora</th>
                <th className="px-6 py-3.5">Empresa / Usuário</th>
                <th className="px-6 py-3.5">Módulo / Endpoint</th>
                <th className="px-6 py-3.5">Mensagem</th>
                <th className="px-6 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                    <p className="mt-2 text-xs font-bold">Carregando logs do sistema...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2 text-sm font-black text-slate-800">
                      Nenhum erro registrado
                    </p>
                    <p className="mt-1 text-xs">
                      O sistema está operando com excelência sem registros para o filtro.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
                          log.level === "CRITICAL"
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : log.level === "ERROR"
                            ? "bg-orange-50 text-orange-700 ring-orange-200"
                            : log.level === "WARN"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-blue-50 text-blue-700 ring-blue-200"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-bold">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">
                        {log.companyName || "Sistema / Global"}
                      </p>
                      {log.userEmail && (
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">
                          {log.userEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                          {log.module}
                        </span>
                        {log.httpMethod && (
                          <span className="text-[11px] font-bold text-slate-400">
                            [{log.httpMethod}]
                          </span>
                        )}
                      </div>
                      {log.endpoint && (
                        <p className="mt-0.5 text-[11px] font-mono text-slate-500 truncate max-w-xs">
                          {log.endpoint}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs xl:max-w-md">
                      <p className="line-clamp-2 text-xs font-mono text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100 break-words">
                        {log.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectLog(log)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-600 transition hover:bg-orange-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspecionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {logPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs font-bold text-slate-500 bg-slate-50/50">
            <span>
              Página {logPage} de {logPages} ({logTotal} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, logPage - 1))}
                disabled={logPage <= 1 || isLoadingLogs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 shadow-sm"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(logPages, logPage + 1))}
                disabled={logPage >= logPages || isLoadingLogs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 shadow-sm"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
