"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Property,
  RentalHistoryContract,
  formatCurrency,
  formatDate,
} from "./asset-types";
import { Person } from "@/services/people.service";
import {
  X,
  KeyRound,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  ExternalLink,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { openWhatsAppMessage } from "@/services/whatsapp.service";
import Link from "next/link";

interface AssetRentalModalProps {
  property: Property | null;
  contract: RentalHistoryContract | null;
  tenantPerson?: Person | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory: (property: Property) => void;
}

export function AssetRentalModal({
  property,
  contract,
  tenantPerson,
  isOpen,
  onClose,
  onOpenHistory,
}: AssetRentalModalProps) {
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentTimestamp(Date.now());
    }
  }, [isOpen]);

  // Calcular prazos e dias restantes
  const contractTimeline = useMemo(() => {
    if (!contract?.startDate || !contract?.endDate || !currentTimestamp) return null;

    const start = new Date(contract.startDate).getTime();
    const end = new Date(contract.endDate).getTime();
    const now = currentTimestamp;

    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.round((now - start) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.round((end - now) / (1000 * 60 * 60 * 24));
    const percent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    const isExpired = remainingDays < 0;
    const isExpiring = !isExpired && remainingDays <= 30;

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      percent,
      isExpired,
      isExpiring,
    };
  }, [contract, currentTimestamp]);

  if (!isOpen || !property) return null;

  const tenantName =
    contract?.tenantName || tenantPerson?.name || "Locatário não informado";
  const tenantDocument =
    contract?.tenantDocument || tenantPerson?.document || "";
  const tenantPhone = tenantPerson?.phone || "";
  const tenantEmail = tenantPerson?.email || "";

  const rentValue = contract?.rentValue || property.rentValue || 0;

  function handleSendWhatsApp() {
    if (!tenantPhone) return;
    openWhatsAppMessage({
      phone: tenantPhone,
      message: `Olá ${tenantName}, entro em contato a respeito da locação do imóvel/ativo ${property?.name || ""}.`,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 bg-slate-50/80 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-inner">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-950">
                  Informações da Locação & Contrato
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Alugado
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {property.name} {property.code ? `• Cód: #${property.code}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            title="Fechar janela"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Card de Destaque Financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-emerald-150 bg-gradient-to-br from-emerald-50/60 to-white p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                  Valor Atual do Aluguel
                </span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-950 tracking-tight">
                {formatCurrency(rentValue)}
                <span className="text-xs font-bold text-emerald-700 font-normal"> /mês</span>
              </p>
              {property.rentValue && property.rentValue !== rentValue ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Valor base de tabela: {formatCurrency(property.rentValue)}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Modalidade & Gestão
                </span>
                <Building className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-sm font-black text-slate-900">
                {property.managementMode === "MANAGED"
                  ? "Imóvel Administrado (Terceiros)"
                  : "Patrimônio Próprio"}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                {property.administrationFeePercentage ? (
                  <span>Taxa Adm: {property.administrationFeePercentage}%</span>
                ) : null}
                {property.ownerPayoutDay ? (
                  <span>• Repasse: dia {property.ownerPayoutDay}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Card do Contrato e Vigência */}
          {contract ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Período & Vigência do Contrato
                  </span>
                </div>
                {contractTimeline && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                      contractTimeline.isExpired
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : contractTimeline.isExpiring
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {contractTimeline.isExpired ? (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Contrato Vencido
                      </>
                    ) : contractTimeline.isExpiring ? (
                      <>
                        <Clock className="h-3 w-3" />
                        Vence em {contractTimeline.remainingDays} dias
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        {contractTimeline.remainingDays} dias restantes
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400">Data de Início:</span>
                  <p className="mt-0.5 text-sm font-black text-slate-900">
                    {formatDate(contract.startDate)}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-400">Data de Término:</span>
                  <p className="mt-0.5 text-sm font-black text-slate-900">
                    {formatDate(contract.endDate)}
                  </p>
                </div>
              </div>

              {/* Barra de Progresso do Contrato */}
              {contractTimeline && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                    <span>Duração: {contractTimeline.totalDays} dias</span>
                    <span>{contractTimeline.percent}% decorrido</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-500 ${
                        contractTimeline.isExpired
                          ? "bg-red-500"
                          : contractTimeline.isExpiring
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${contractTimeline.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Se for Locação por Temporada */}
              {contract.isTemporaryRental && (
                <div className="mt-3 rounded-xl bg-orange-50/70 border border-orange-150 p-2.5 text-xs text-orange-900 flex items-center justify-between">
                  <span className="font-bold">Locação Temporária:</span>
                  <span>
                    Check-in: {contract.checkInTime || "14:00"} • Check-out: {contract.checkOutTime || "12:00"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              O bem está marcado com status operacional <strong>Alugado</strong>, mas nenhum contrato ativo foi vinculado diretamente a ele.
            </div>
          )}

          {/* Card do Locatário */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Dados do Locatário (Inquilino)
                </span>
              </div>
              {tenantPhone && (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chamar no WhatsApp
                </button>
              )}
            </div>

            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-400">Nome:</span>
                <p className="mt-0.5 text-sm font-black text-slate-900">
                  {tenantName}
                </p>
              </div>

              {tenantDocument && (
                <div>
                  <span className="font-bold text-slate-400">CPF / CNPJ:</span>
                  <p className="mt-0.5 text-sm font-bold text-slate-700">
                    {tenantDocument}
                  </p>
                </div>
              )}

              {tenantPhone && (
                <div>
                  <span className="font-bold text-slate-400">Telefone:</span>
                  <p className="mt-0.5 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {tenantPhone}
                  </p>
                </div>
              )}

              {tenantEmail && (
                <div>
                  <span className="font-bold text-slate-400">E-mail:</span>
                  <p className="mt-0.5 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-slate-400" />
                    {tenantEmail}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-150 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHistory(property);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Building className="h-3.5 w-3.5 text-slate-500" />
            Ficha Completa do Bem
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/contratos"
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-700 active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Gerenciar Contratos
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
