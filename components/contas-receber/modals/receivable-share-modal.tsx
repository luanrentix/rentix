"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Share2,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Clock,
  User,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { Charge, Tenant, formatCurrency, formatDateBR } from "../receivable-types";
import { openWhatsAppMessage } from "@/services/whatsapp.service";

interface ReceivableShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  charge: Charge | null;
  shareUrl: string;
  expiresAt?: string;
  tenantPhone?: string | null;
  tenants?: Tenant[];
}

export function ReceivableShareModal({
  isOpen,
  onClose,
  charge,
  shareUrl,
  expiresAt,
  tenantPhone,
  tenants,
}: ReceivableShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Resolver o telefone da pessoa/sacado a partir das múltiplas fontes disponíveis
  const resolvedPhone = useMemo(() => {
    if (tenantPhone) return tenantPhone;
    if (charge?.tenant?.phone) return charge.tenant.phone;
    if (charge && tenants && tenants.length > 0) {
      const found =
        (charge.tenantId && tenants.find((t) => t.id === charge.tenantId)) ||
        tenants.find(
          (t) =>
            t.name.trim().toLowerCase() ===
            charge.tenantName.trim().toLowerCase()
        );
      if (found?.phone) return found.phone;
    }
    return "";
  }, [tenantPhone, charge, tenants]);

  const [phone, setPhone] = useState(() => resolvedPhone || "");

  // Atualizar o campo de telefone sempre que o modal for aberto ou a cobrança mudar
  useEffect(() => {
    if (isOpen) {
      setPhone(resolvedPhone || "");
    }
  }, [isOpen, resolvedPhone]);

  if (!isOpen || !charge) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para input manual se navigator.clipboard falhar
      const input = document.getElementById("share-url-input") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  }

  function handleSendWhatsApp() {
    const rawPhone = phone.replace(/\D/g, "");
    const formattedAmount = formatCurrency(charge?.amount || 0);
    const formattedDate = formatDateBR(charge?.dueDate);

    const message = `Olá, ${charge?.tenantName}!\n\nSegue o link seguro para visualização da sua cobrança referente a ${charge?.propertyName}:\n\n${shareUrl}\n\n*Valor:* ${formattedAmount}\n*Vencimento:* ${formattedDate}\n\nQualquer dúvida, estamos à disposição!`;

    if (!rawPhone) {
      // Se não tiver telefone digitado, abre o WhatsApp Web permitindo escolher o contato
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    openWhatsAppMessage({
      phone: rawPhone,
      message,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Link de Cobrança Gerado
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Compartilhe o relatório público de cobrança com o cliente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo da Cobrança */}
        <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
              <User className="h-3.5 w-3.5" /> Sacado:
            </span>
            <span className="font-black text-slate-900 dark:text-white uppercase truncate max-w-[260px]">
              {charge.tenantName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
              <Building2 className="h-3.5 w-3.5" /> Bem / Descrição:
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[260px]">
              {charge.propertyName}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700">
            <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> Vencimento:
            </span>
            <span className="font-black text-slate-900 dark:text-white">
              {formatDateBR(charge.dueDate)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
              <DollarSign className="h-3.5 w-3.5" /> Valor da Cobrança:
            </span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {formatCurrency(charge.amount)}
            </span>
          </div>
        </div>

        {/* Apresentação do Link em Destaque */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Link Público de Cobrança
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Válido por 7 dias
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black transition active:scale-95 shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ação de Envio por WhatsApp */}
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950/60 dark:bg-emerald-950/20">
          <label className="block text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 mb-1.5">
            Enviar Diretamente para o WhatsApp do Cliente
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="DDD + Telefone (ex: 11999998888)"
              className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100"
            />

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar no WhatsApp
            </button>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visualizar Página de Cobrança
          </a>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
