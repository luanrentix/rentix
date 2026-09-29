"use client";

import React, { useState, useEffect } from "react";
import {
  Contract,
  Property,
  ContrxTenant,
  ReceivableCharge,
  ContractDetailsTab,
  formatCurrency,
  formatDate,
  getDisplayContractStatus,
  getAssetCategoryLabel,
} from "./contract-types";
import { ContractStatusBadge, ContractRentalTypeBadge } from "./contract-status-badge";
import {
  X,
  Building2,
  User,
  DollarSign,
  FileText,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Upload,
  Download,
  Printer,
} from "lucide-react";
import { openWhatsAppMessage } from "@/services/whatsapp.service";

interface ContractDetailsModalProps {
  contract: Contract | null;
  property: Property | null;
  tenant: ContrxTenant | null;
  charges: ReceivableCharge[];
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onPrintContract: (contract: Contract) => void;
}

export function ContractDetailsModal({
  contract,
  property,
  tenant,
  charges,
  companyName,
  isOpen,
  onClose,
  onPrintContract,
}: ContractDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ContractDetailsTab>("Data");
  const [signedPdfFile, setSignedPdfFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (contract && isOpen) {
      setActiveTab("Data");
      // Carregar arquivo assinado se existir
      import("@/services/api").then(({ api }) => {
        api
          .get(`/files/entity/CONTRACT/${contract.id}`)
          .then((res) => {
            if (Array.isArray(res.data) && res.data.length > 0) {
              setSignedPdfFile(res.data[0]);
            } else {
              setSignedPdfFile(null);
            }
          })
          .catch(() => setSignedPdfFile(null));
      });
    }
  }, [contract, isOpen]);

  if (!isOpen || !contract) return null;

  const displayStatus = getDisplayContractStatus(contract);

  // Totais do financeiro
  const paidCharges = charges.filter((c) => c.status === "Paid");
  const pendingCharges = charges.filter((c) => c.status !== "Paid");
  const totalAmount = charges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const paidAmount = paidCharges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const pendingAmount = pendingCharges.reduce((acc, c) => acc + (c.amount || 0), 0);

  function handleSendWhatsApp() {
    if (!tenant?.phone) {
      alert("Locatário não possui telefone cadastrado.");
      return;
    }

    openWhatsAppMessage({
      phone: tenant.phone,
      message: [
        `Olá, ${contract?.tenantName || tenant?.name || "Locatário"}.`,
        "",
        `${companyName} informa sobre o contrato de locação:`,
        `Imóvel / Bem: ${contract?.propertyName || "Não informado"}`,
        `Período: ${formatDate(contract!.startDate)} até ${formatDate(contract!.endDate)}`,
        `Valor: ${formatCurrency(contract!.rentValue)}`,
        "",
        "Caso precise de alguma informação ou comprovante, responda a esta mensagem.",
      ].join("\n"),
    });
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contract) return;

    try {
      setIsUploading(true);
      const { api } = await import("@/services/api");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "CONTRACT");
      formData.append("entityId", contract.id);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSignedPdfFile(res.data);
    } catch {
      alert("Erro ao enviar o PDF do contrato assinado.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {contract.propertyName || property?.name || "Contrato"}
              </h2>
              <ContractStatusBadge status={displayStatus} />
              <ContractRentalTypeBadge isTemporaryRental={contract.isTemporaryRental} />
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Locatário: <span className="font-black text-slate-700">{contract.tenantName || tenant?.name || "Não informado"}</span> | Vigência: {formatDate(contract.startDate)} até {formatDate(contract.endDate)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintContract(contract)}
              title="Imprimir minuta"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 transition"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-6 bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("Data")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-black transition ${
              activeTab === "Data"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            Dados da Locação
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("Financial")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-black transition ${
              activeTab === "Financial"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Contas a Receber ({charges.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("History")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-black transition ${
              activeTab === "History"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="h-4 w-4" />
            Histórico & Renovações
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SignedPdf")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-black transition ${
              activeTab === "SignedPdf"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="h-4 w-4" />
            Contrato Assinado {signedPdfFile ? "✓" : ""}
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 max-h-[calc(80vh-140px)] overflow-y-auto">
          {/* ABA 1: DADOS */}
          {activeTab === "Data" && (
            <div className="space-y-6">
              {/* Cards Imóvel e Inquilino */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Cartão do Bem */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    Bem / Ativo
                  </div>
                  <h3 className="mt-2 text-base font-black text-slate-900">
                    {property?.name || contract.propertyName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Categoria: {getAssetCategoryLabel(property?.assetCategory)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    Endereço: {property?.street ? `${property.street}, ${property.number || "s/n"}` : "Não informado"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {property?.city} - {property?.state} {property?.zipCode ? `| CEP: ${property.zipCode}` : ""}
                  </p>
                </div>

                {/* Cartão do Inquilino */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <User className="h-4 w-4 text-orange-500" />
                      Locatário
                    </div>
                    {tenant?.phone && (
                      <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        WhatsApp
                      </button>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-black text-slate-900">
                    {tenant?.name || contract.tenantName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Documento: {tenant?.cpf || tenant?.document || "Não cadastrado"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    Telefone: {tenant?.phone || "Não informado"}
                  </p>
                  <p className="text-xs text-slate-500">
                    E-mail: {tenant?.email || "Não informado"}
                  </p>
                </div>
              </div>

              {/* Informações da Vigência e Valores */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Condições do Contrato
                </h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase">
                      Início da Vigência
                    </span>
                    <span className="mt-0.5 block font-black text-slate-800 text-sm">
                      {formatDate(contract.startDate)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase">
                      Término da Vigência
                    </span>
                    <span className="mt-0.5 block font-black text-slate-800 text-sm">
                      {formatDate(contract.endDate)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase">
                      Valor do Aluguel
                    </span>
                    <span className="mt-0.5 block font-black text-orange-600 text-sm">
                      {formatCurrency(contract.rentValue)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase">
                      Modalidade
                    </span>
                    <span className="mt-0.5 block font-black text-slate-800 text-sm">
                      {contract.isTemporaryRental ? "Temporada" : "Residencial / Mensal"}
                    </span>
                  </div>
                </div>

                {contract.isTemporaryRental && (contract.checkInTime || contract.checkOutTime) && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-6 text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-orange-500" />
                      Check-in: <b>{contract.checkInTime || "--:--"}</b>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-orange-500" />
                      Check-out: <b>{contract.checkOutTime || "--:--"}</b>
                    </span>
                  </div>
                )}
              </div>

              {/* Justificativa de Status se houver */}
              {contract.statusReason && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase">
                    <AlertCircle className="h-4 w-4" />
                    Motivo da Alteração de Status ({contract.status})
                  </div>
                  <p className="mt-1 text-xs font-semibold text-amber-900">
                    {contract.statusReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: FINANCEIRO */}
          {activeTab === "Financial" && (
            <div className="space-y-5">
              {/* KPIs de Parcelas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Total Contratado
                  </span>
                  <span className="mt-1 block text-lg font-black text-slate-900">
                    {formatCurrency(totalAmount)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {charges.length} parcelas geradas
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Total Recebido
                  </span>
                  <span className="mt-1 block text-lg font-black text-emerald-700">
                    {formatCurrency(paidAmount)}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    {paidCharges.length} parcelas quitadas
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                    Pendente / A Vencer
                  </span>
                  <span className="mt-1 block text-lg font-black text-amber-700">
                    {formatCurrency(pendingAmount)}
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold">
                    {pendingCharges.length} parcelas em aberto
                  </span>
                </div>
              </div>

              {/* Tabela de Parcelas */}
              {charges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Nenhuma conta a receber sincronizada com este contrato.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-black uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Parcela</th>
                        <th className="px-4 py-3">Vencimento</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {charges.map((charge, idx) => (
                        <tr key={charge.id || idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {charge.installmentNumber && charge.installmentTotal
                              ? `${charge.installmentNumber}/${charge.installmentTotal}`
                              : `Parcela ${idx + 1}`}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-600">
                            {formatDate(charge.dueDate || "")}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900">
                            {formatCurrency(charge.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {charge.status === "Paid" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Pago
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                <Clock className="h-3 w-3" /> Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: HISTÓRICO & RENOVAÇÕES */}
          {activeTab === "History" && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Histórico de Renovações e Aditivos
              </h4>

              {(!contract.renewalHistory || contract.renewalHistory.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Este contrato não possui renovações anteriores registradas.
                </div>
              ) : (
                <div className="space-y-3">
                  {contract.renewalHistory.map((rec, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-800">
                          Renovação #{contract.renewalHistory!.length - index}
                        </span>
                        <span className="text-slate-400">
                          Realizada em {formatDate(rec.renewedAt)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Vigência Anterior</span>
                          <span className="font-semibold text-slate-700">Término: {formatDate(rec.previousEndDate)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Nova Vigência</span>
                          <span className="font-black text-emerald-700">Término: {formatDate(rec.newEndDate)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Aluguel Anterior</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(rec.previousRentValue)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Novo Aluguel</span>
                          <span className="font-black text-emerald-700">{formatCurrency(rec.newRentValue)}</span>
                        </div>
                      </div>
                      {rec.notes && (
                        <p className="mt-2 text-xs text-slate-600 italic border-t border-slate-200/60 pt-2">
                          Observações: {rec.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: CONTRATO ASSINADO */}
          {activeTab === "SignedPdf" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Documento Assinado (PDF)
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Anexe a via digitalizada ou assinada digitalmente do contrato para arquivo e consulta rápida.
                </p>

                {signedPdfFile ? (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-emerald-600" />
                      <div>
                        <span className="text-xs font-black text-emerald-900 block">
                          {signedPdfFile.name || "Contrato_Assinado.pdf"}
                        </span>
                        <span className="text-[10px] text-emerald-700">
                          Arquivo salvo no sistema
                        </span>
                      </div>
                    </div>
                    {signedPdfFile.url && (
                      <a
                        href={signedPdfFile.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-100"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 cursor-pointer hover:border-orange-500 hover:bg-orange-50/20 transition">
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="mt-2 text-xs font-bold text-slate-700">
                        {isUploading ? "Enviando arquivo..." : "Clique para selecionar o PDF assinado"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Arquivos suportados: .pdf até 15MB
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 p-4 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
