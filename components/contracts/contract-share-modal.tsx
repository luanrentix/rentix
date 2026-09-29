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
import { Contract, ContrxTenant, formatCurrency, formatDate } from "./contract-types";
import { openWhatsAppMessage } from "@/services/whatsapp.service";

interface ContractShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  shareUrl: string;
  expiresAt?: string;
  tenant?: ContrxTenant | null;
}

export function ContractShareModal({
  isOpen,
  onClose,
  contract,
  shareUrl,
  expiresAt,
  tenant,
}: ContractShareModalProps) {
  const [copied, setCopied] = useState(false);

  const resolvedPhone = useMemo(() => {
    if (tenant?.phone) return tenant.phone;
    return "";
  }, [tenant]);

  const [phone, setPhone] = useState(() => resolvedPhone || "");

  useEffect(() => {
    setPhone(resolvedPhone || "");
  }, [resolvedPhone]);

  if (!isOpen || !contract) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const customerName = contract.tenantName || tenant?.name || "Cliente";
    const propertyTitle = contract.propertyName || "Imóvel / Bem";

    const msg = [
      `Olá, *${customerName}*!`,
      ``,
      `Segue o link para visualização e impressão do seu Contrato de Locação referente ao bem *${propertyTitle}*:`,
      `🔗 ${shareUrl}`,
      ``,
      `ℹ️ _Este link é válido por 7 dias._`,
    ].join("\n");

    openWhatsAppMessage({
      phone: cleanPhone,
      message: msg,
    });
  };

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("pt-BR")
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toLocaleDateString("pt-BR");
      })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Compartilhar Contrato via WhatsApp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Link de visualização pública seguro salvo em impressos compartilhados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Card Resumo do Contrato */}
        <div className="my-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-orange-600 shrink-0" />
              <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                {contract.propertyName}
              </span>
            </div>
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black text-orange-800 dark:bg-orange-950/80 dark:text-orange-300">
              {contract.isTemporaryRental ? "Temporada" : "Padrão"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold truncate">{contract.tenantName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 justify-end">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-black text-slate-900 dark:text-white">
                {formatCurrency(contract.rentValue)}
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Calendar className="h-3 w-3" />
              <span>
                Vigência: {formatDate(contract.startDate)} até {formatDate(contract.endDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Campo do Link Compartilhado */}
        <div className="space-y-1.5 mb-4">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Link de Visualização (Válido por 7 dias)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-mono text-slate-700 select-all focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black transition active:scale-95 ${
                copied
                  ? "bg-emerald-600 text-white"
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
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              title="Abrir página pública"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Válido por 7 dias (expira em {formattedExpiry})</span>
          </div>
        </div>

        {/* Telefone e Envio WhatsApp */}
        <div className="space-y-1.5 mb-5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            WhatsApp do Locatário
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Salvo em impressos_compartilhados</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
