"use client";

import React, { useState } from "react";
import { X, Copy, Check, Terminal, FileText, Bug } from "lucide-react";
import type { SystemErrorLog } from "../admin-types";
import { formatDateTime } from "../admin-types";

interface AdminErrorModalProps {
  log: SystemErrorLog | null;
  onClose: () => void;
}

export function AdminErrorModal({ log, onClose }: AdminErrorModalProps) {
  const [copiedStackTrace, setCopiedStackTrace] = useState(false);

  if (!log) return null;

  function handleCopyStackTrace() {
    if (!log?.stackTrace) return;
    navigator.clipboard.writeText(log.stackTrace);
    setCopiedStackTrace(true);
    setTimeout(() => setCopiedStackTrace(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                log.level === "CRITICAL"
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : log.level === "ERROR"
                  ? "bg-orange-50 text-orange-700 ring-orange-200"
                  : "bg-blue-50 text-blue-700 ring-blue-200"
              }`}
            >
              {log.level}
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950">
                Inspecionar Log de Erro
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {formatDateTime(log.createdAt)} • ID: {log.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 pr-3">
          {/* Metadados da Ocorrência */}
          <div className="grid gap-3 sm:grid-cols-2 rounded-2xl bg-slate-50 p-4 text-xs font-bold border border-slate-100">
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Empresa / Tenant
              </span>
              <span className="text-slate-900 font-extrabold">
                {log.companyName || "Sistema / Global"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Usuário Notificado
              </span>
              <span className="text-slate-900 font-extrabold">
                {log.userName
                  ? `${log.userName} (${log.userEmail})`
                  : log.userEmail || "Não autenticado"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Módulo / Método
              </span>
              <span className="text-slate-900">
                {log.module} {log.httpMethod ? `[${log.httpMethod}]` : ""}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Endpoint HTTP
              </span>
              <span className="text-slate-900 font-mono truncate block">
                {log.endpoint || "N/A"}
              </span>
            </div>
            {log.ipAddress && (
              <div className="sm:col-span-2">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  IP & User Agent
                </span>
                <span className="text-slate-700 font-mono text-[11px] block truncate">
                  {log.ipAddress} • {log.userAgent}
                </span>
              </div>
            )}
          </div>

          {/* Mensagem do Erro */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5 text-orange-600" />
              Mensagem de Erro
            </h4>
            <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4 font-mono text-xs font-bold text-red-900 leading-relaxed break-words">
              {log.message}
            </div>
          </div>

          {/* Stack Trace */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
                <Terminal className="h-3.5 w-3.5 text-orange-600" />
                Stack Trace (Pilha de Execução)
              </h4>
              {log.stackTrace && (
                <button
                  type="button"
                  onClick={handleCopyStackTrace}
                  className="inline-flex items-center gap-1 text-xs font-black text-orange-600 transition hover:text-orange-700"
                >
                  {copiedStackTrace ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedStackTrace ? "Copiado!" : "Copiar Stack Trace"}
                </button>
              )}
            </div>
            <pre className="max-h-56 overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 shadow-inner leading-relaxed">
              {log.stackTrace || "Nenhum stack trace gravado para esta ocorrência."}
            </pre>
          </div>

          {/* Payload JSON da Requisição */}
          {log.requestPayload && (
            <div>
              <h4 className="mb-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
                Payload da Requisição (JSON)
              </h4>
              <pre className="max-h-40 overflow-x-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-200 leading-relaxed">
                {typeof log.requestPayload === "string"
                  ? log.requestPayload
                  : JSON.stringify(log.requestPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 p-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-200 px-6 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
