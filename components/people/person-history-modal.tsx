"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  User,
  Building2,
  FileText,
  DollarSign,
  Image as ImageIcon,
  MessageCircle,
  Edit2,
  Phone,
  Mail,
  MapPin,
  LoaderCircle,
} from "lucide-react";
import type { Person, PersonHistoryData } from "./person-types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPersonTypeLabel,
  openWhatsAppMessage,
} from "./person-types";
import { getMediaUrl, api } from "@/services/api";
import { getProperties } from "@/services/properties.service";
import { getContracts } from "@/services/contracts.service";
import {
  getPayableAccounts,
  getReceivableAccounts,
} from "@/services/financial.service";
import { getCachedCompanySettings } from "@/services/settings-cache";

interface PersonHistoryModalProps {
  person: Person | null;
  isOpen: boolean;
  companyId: string;
  onClose: () => void;
  onOpenEdit?: (person: Person) => void;
}

type TabType = "Overview" | "Properties" | "Contracts" | "Financial" | "Photos";

interface EntityFile {
  id?: string;
  url?: string;
  filePath?: string;
  path?: string;
  originalName?: string;
  type?: string;
}

export function PersonHistoryModal({
  person,
  isOpen,
  companyId,
  onClose,
  onOpenEdit,
}: PersonHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [isLoading, setIsLoading] = useState(false);
  const [historyData, setHistoryData] = useState<PersonHistoryData>({
    ownedProperties: [],
    tenantContracts: [],
    receivables: [],
    payables: [],
  });
  const [personFiles, setPersonFiles] = useState<EntityFile[]>([]);
  const [companySettings, setCompanySettings] = useState<{
    tradeName?: string;
    companyName?: string;
  }>({});

  useEffect(() => {
    if (isOpen && person && companyId) {
      loadPersonRelationships(person.id, companyId);
      loadPersonFiles(person.id);
      loadCompanyInfo(companyId);
      setActiveTab("Overview");
    }
  }, [isOpen, person, companyId]);

  async function loadCompanyInfo(cid: string) {
    try {
      const cached = await getCachedCompanySettings(cid);
      if (cached?.companySettings) {
        setCompanySettings(cached.companySettings);
      }
    } catch {
      // Falha silenciosa
    }
  }

  async function loadPersonRelationships(personId: string, cid: string) {
    try {
      setIsLoading(true);

      const [propsRes, contractsRes, recRes, payRes] = await Promise.all([
        getProperties(cid),
        getContracts(cid),
        getReceivableAccounts(cid),
        getPayableAccounts(cid),
      ]);

      setHistoryData({
        ownedProperties: propsRes.filter(
          (p) => String(p.ownerId || "") === String(personId)
        ),
        tenantContracts: contractsRes.filter(
          (c) => String(c.tenantId || "") === String(personId)
        ),
        receivables: recRes.filter(
          (r) => String(r.tenantId || "") === String(personId)
        ),
        payables: payRes.filter(
          (p) => String(p.personId || "") === String(personId)
        ),
      });
    } catch (err) {
      console.error("Erro ao carregar dados do histórico da pessoa", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPersonFiles(personId: string) {
    try {
      const res = await api.get<EntityFile[]>(`/files/entity/PERSON/${personId}`);
      if (Array.isArray(res.data)) {
        setPersonFiles(res.data);
      }
    } catch {
      setPersonFiles([]);
    }
  }

  if (!isOpen || !person) return null;

  const isCompany = person.type === "company";
  const isActive = person.status === "active";
  const totalMovements =
    historyData.ownedProperties.length +
    historyData.tenantContracts.length +
    historyData.receivables.length +
    historyData.payables.length;

  const totalReceivablesValue = historyData.receivables.reduce(
    (acc, r) => acc + Number(r.amount || 0),
    0
  );
  const totalPayablesValue = historyData.payables.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0
  );

  function handleExportReport() {
    if (typeof window === "undefined") return;
    const originalTitle = document.title;
    document.title = `RELATORIO_PESSOA_${person!.name.replace(/\s+/g, "_")}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm print:hidden">
        <div className="max-h-[94vh] w-full max-w-5xl flex flex-col rounded-3xl border border-orange-100 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header do Histórico */}
          <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-white/95 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-inner overflow-hidden border border-orange-200">
                {person.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getMediaUrl(person.photo)}
                    alt={person.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-black uppercase text-orange-600">
                    {person.name.slice(0, 2)}
                  </span>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                    {person.name}
                  </h2>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      isCompany
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {getPersonTypeLabel(person.type)}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isActive ? "Ativo" : "Inativo"}
                  </span>

                  {person.document && (
                    <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                      {person.document}
                    </span>
                  )}

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      person.isTenant
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {person.isTenant ? "Inquilino" : "Não inquilino"}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                  {person.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {person.phone}
                    </span>
                  )}
                  {person.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {person.email}
                    </span>
                  )}
                  {person.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {person.city}/{person.state}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {person.phone && (
                <button
                  type="button"
                  onClick={() =>
                    openWhatsAppMessage(
                      person.phone,
                      `Olá ${person.name}, tudo bem? Entramos em contato pelo sistema Contrx.`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-500 hover:text-white transition shadow-sm"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(person);
                  }}
                  className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition"
                  title="Editar cadastro"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportReport}
                className="flex items-center gap-1.5 rounded-2xl bg-orange-500 px-3.5 py-2 text-xs font-black text-white hover:bg-orange-600 transition shadow-sm shadow-orange-500/20 active:scale-95"
                title="Exportar ficha cadastral para PDF"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("Overview")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "Overview"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Visão Geral & Ficha
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Properties")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "Properties"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Bens/Ativos ({historyData.ownedProperties.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Contracts")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "Contracts"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Contratos ({historyData.tenantContracts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Financial")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "Financial"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Financeiro ({historyData.receivables.length + historyData.payables.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Photos")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "Photos"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Fotos & Anexos ({personFiles.length + (person.photo ? 1 : 0)})
            </button>
          </div>

          {/* Conteúdo das Abas com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                <LoaderCircle className="h-5 w-5 animate-spin text-orange-600" />
                <span className="text-sm font-semibold">Carregando histórico vinculado...</span>
              </div>
            )}

            {!isLoading && (
              <>
                {/* ABA 1: VISÃO GERAL & FICHA */}
                {activeTab === "Overview" && (
                  <div className="space-y-6">
                    {/* Mini KPIs */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Movimentações
                        </span>
                        <div className="mt-1 text-2xl font-black text-slate-900">
                          {totalMovements}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Vínculos no ERP
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Bens / Ativos
                        </span>
                        <div className="mt-1 text-2xl font-black text-slate-900">
                          {historyData.ownedProperties.length}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Como proprietário
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Contratos
                        </span>
                        <div className="mt-1 text-2xl font-black text-slate-900">
                          {historyData.tenantContracts.length}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Como inquilino
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Financeiro
                        </span>
                        <div className="mt-1 text-2xl font-black text-slate-900">
                          {historyData.receivables.length + historyData.payables.length}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Lançamentos vinculados
                        </p>
                      </div>
                    </div>

                    {/* Ficha Cadastral em Grid */}
                    <div className="rounded-3xl border border-slate-200 p-6 bg-white space-y-4 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Dados Cadastrais Oficiais
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        <div>
                          <span className="text-xs font-bold text-slate-400 block">
                            Nome Completo / Razão Social
                          </span>
                          <span className="font-black text-slate-900 uppercase">
                            {person.name}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block">
                            Documento (CPF / CNPJ)
                          </span>
                          <span className="font-bold text-slate-800">
                            {person.document || "Não informado"}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block">
                            {isCompany ? "Inscrição Estadual" : "RG / Identidade"}
                          </span>
                          <span className="font-bold text-slate-800">
                            {(isCompany
                              ? person.stateRegistration
                              : person.identityNumber) || "Não informado"}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block">
                            Telefone / Celular
                          </span>
                          <span className="font-bold text-slate-800">
                            {person.phone || "Não informado"}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block">
                            E-mail de Contato
                          </span>
                          <span className="font-bold text-slate-800">
                            {person.email || "Não informado"}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block">
                            Classificação
                          </span>
                          <span className="font-bold text-slate-800">
                            {person.isTenant
                              ? "Inquilino / Locatário"
                              : "Não inquilino / Outro"}
                          </span>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3">
                          <span className="text-xs font-bold text-slate-400 block">
                            Endereço Completo
                          </span>
                          <span className="font-bold text-slate-800">
                            {person.address
                              ? `${person.address} - ${person.city || ""}/${person.state || ""} - CEP: ${person.zipCode || ""}`
                              : "Endereço não informado"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 2: BENS / ATIVOS */}
                {activeTab === "Properties" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Bens e Imóveis Vinculados como Proprietário
                    </h3>

                    {historyData.ownedProperties.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                        Nenhum bem ou imóvel cadastrado com esta pessoa como proprietária.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                        {historyData.ownedProperties.map((prop) => (
                          <div
                            key={prop.id}
                            className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                          >
                            <div>
                              <p className="font-black text-slate-900 uppercase">
                                {prop.title}
                              </p>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {prop.city}/{prop.state} • Aluguel:{" "}
                                {formatCurrency(Number(prop.rentalValue || 0))}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                                prop.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {prop.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 3: CONTRATOS */}
                {activeTab === "Contracts" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Contratos de Locação Vinculados como Inquilino
                    </h3>

                    {historyData.tenantContracts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                        Nenhum contrato de locação ativo ou encerrado com esta pessoa.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                        {historyData.tenantContracts.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                          >
                            <div>
                              <p className="font-black text-slate-900 uppercase">
                                {c.propertyName || "Imóvel / Bem locado"}
                              </p>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                Vigência: {formatDate(c.startDate)} até{" "}
                                {formatDate(c.endDate)} • Valor:{" "}
                                {formatCurrency(Number(c.rentValue || 0))}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                                c.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {c.status === "ACTIVE" ? "Ativo" : c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 4: FINANCEIRO */}
                {activeTab === "Financial" && (
                  <div className="space-y-6">
                    {/* Resumo Financeiro */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-emerald-50/50 p-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                          Contas a Receber (Locação/Taxas)
                        </span>
                        <div className="text-xl font-black text-emerald-900 mt-1">
                          {formatCurrency(totalReceivablesValue)}
                        </div>
                        <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                          {historyData.receivables.length} lançamento(s)
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-red-50/50 p-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-red-700">
                          Contas a Pagar (Repasses/Serviços)
                        </span>
                        <div className="text-xl font-black text-red-900 mt-1">
                          {formatCurrency(totalPayablesValue)}
                        </div>
                        <p className="text-xs font-semibold text-red-600 mt-0.5">
                          {historyData.payables.length} lançamento(s)
                        </p>
                      </div>
                    </div>

                    {/* Lista Contas a Receber */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Lançamentos a Receber
                      </h4>
                      {historyData.receivables.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Nenhum lançamento a receber encontrado.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                          {historyData.receivables.slice(0, 10).map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3.5 text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-800">
                                  {r.propertyName || "Recebível de locação"}
                                </p>
                                <p className="text-slate-400 font-semibold mt-0.5">
                                  Vencimento: {formatDate(r.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-slate-900">
                                  {formatCurrency(Number(r.amount || 0))}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    r.status === "PAID"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {r.status === "PAID" ? "Recebido" : "Pendente"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ABA 5: FOTOS & ANEXOS */}
                {activeTab === "Photos" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Galeria de Fotos e Documentos Anexados
                    </h3>

                    {personFiles.length === 0 && !person.photo ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm font-semibold text-slate-500">
                        Nenhuma foto ou documento anexado nesta pessoa.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {person.photo && (
                          <div className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getMediaUrl(person.photo)}
                              alt="Foto de perfil"
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute top-2 left-2 rounded-lg bg-slate-900/80 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                              Foto Principal
                            </div>
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <a
                                href={getMediaUrl(person.photo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow"
                              >
                                Ver em tela cheia
                              </a>
                            </div>
                          </div>
                        )}

                        {personFiles.map((file, idx) => {
                          const fileUrl = getMediaUrl(file.url || file);
                          const isPdf =
                            file.type === "PDF" ||
                            (file.originalName &&
                              file.originalName.toLowerCase().endsWith(".pdf"));

                          return (
                            <div
                              key={file.id || idx}
                              className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm flex items-center justify-center p-2 text-center"
                            >
                              {isPdf ? (
                                <div className="flex flex-col items-center justify-center p-3 text-slate-600">
                                  <FileText className="h-8 w-8 text-red-500" />
                                  <span className="text-[11px] font-bold line-clamp-2 mt-1">
                                    {file.originalName || "Documento PDF"}
                                  </span>
                                </div>
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={fileUrl}
                                  alt={file.originalName || "Anexo"}
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                />
                              )}

                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow"
                                >
                                  Visualizar
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Relatório Oculto na Tela, Visível Exclusivamente ao Imprimir (PDF) */}
      <div id="person-history-report" className="hidden print:block p-8 bg-white text-slate-900">
        <div className="border-b-2 border-orange-500 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">
              Ficha Cadastral de Pessoa
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              {companySettings.tradeName || companySettings.companyName || "Contrx ERP"}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-400">
            Emitido em: {formatDateTime(new Date().toISOString())}
          </div>
        </div>

        <div className="space-y-6 text-sm">
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Identificação
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 block">Nome:</span>
                <span className="font-black text-slate-900">{person.name}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Documento (CPF/CNPJ):</span>
                <span className="font-bold text-slate-800">{person.document || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Tipo:</span>
                <span className="font-bold text-slate-800">{getPersonTypeLabel(person.type)}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Telefone:</span>
                <span className="font-bold text-slate-800">{person.phone || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">E-mail:</span>
                <span className="font-bold text-slate-800">{person.email || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Endereço:</span>
                <span className="font-bold text-slate-800">{person.address || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
