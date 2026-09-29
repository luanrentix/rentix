"use client";

import React, { useState, useEffect } from "react";
import {
  Contract,
  Property,
  ContrxTenant,
  formatCurrencyInput,
  parseCurrencyInput,
  formatDate,
  doDateRangesOverlap,
  getDisplayContractStatus,
  toUpperText,
  getAssetCategoryLabel,
} from "./contract-types";
import { X, Minus, Maximize2, Clock } from "lucide-react";

interface ContractFormModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  editingContract: Contract | null;
  properties: Property[];
  tenants: ContrxTenant[];
  allContracts: Contract[];
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  onOpenTimeDefaults: () => void;
  onSave: (contractData: Partial<Contract>) => Promise<void>;
}

export function ContractFormModal({
  isOpen,
  isMinimized,
  onMinimize,
  onRestore,
  onClose,
  editingContract,
  properties,
  tenants,
  allContracts,
  defaultCheckInTime,
  defaultCheckOutTime,
  onOpenTimeDefaults,
  onSave,
}: ContractFormModalProps) {
  const isEditing = Boolean(editingContract);

  // Form State
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [isTemporaryRental, setIsTemporaryRental] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset or initialize state
  useEffect(() => {
    if (editingContract) {
      setPropertyId(String(editingContract.propertyId || ""));
      setTenantId(String(editingContract.tenantId || ""));
      setStartDate(editingContract.startDate || "");
      setEndDate(editingContract.endDate || "");
      setRentValue(formatCurrencyInput(editingContract.rentValue || 0));
      setIsTemporaryRental(Boolean(editingContract.isTemporaryRental));
      setCheckInTime(editingContract.checkInTime || "");
      setCheckOutTime(editingContract.checkOutTime || "");
      setFormError("");
    } else {
      setPropertyId("");
      setTenantId("");
      setStartDate("");
      setEndDate("");
      setRentValue("");
      setIsTemporaryRental(false);
      setCheckInTime("");
      setCheckOutTime("");
      setFormError("");
    }
  }, [editingContract, isOpen]);

  // Lista de Imóveis e Ativos disponíveis conforme as regras do ERP
  const availableProperties = properties.filter((property) => {
    const isCurrentEditingProperty = isEditing && String(property.id) === String(propertyId);
    if (isCurrentEditingProperty) return true;

    // 1. O bem precisa estar ativo no cadastro
    if (property.isActive === false) return false;

    // 2. O bem não pode estar em manutenção operacional
    if (property.operationalStatus === "MAINTENANCE") return false;

    // Se o bem NÃO for imóvel (assetCategory !== "PROPERTY"):
    // Ou se o contrato for do tipo TEMPORÁRIO:
    // O bem DEVE APARECER para seleção (mesmo tendo outros contratos já cadastrados)!
    // A restrição ocorre na data: não pode criar com a mesma data ou sobreposição de período.
    const isNonPropertyAsset = property.assetCategory && property.assetCategory !== "PROPERTY";
    if (isTemporaryRental || isNonPropertyAsset) {
      return true;
    }

    // 3. Contratos ativos deste imóvel (locação contínua padrão)
    const activeContracts = allContracts.filter((contract) => {
      const isSameProperty = String(contract.propertyId) === String(property.id);
      const isSameContract = isEditing && contract.id === editingContract?.id;
      const isActive =
        ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(contract)) &&
        contract.status !== "Deleted";

      return isSameProperty && !isSameContract && isActive;
    });

    const hasStandardActiveContract = activeContracts.some((c) => !c.isTemporaryRental);

    // Se o imóvel já possui um contrato padrão contínuo ativo ou agendado:
    // Ele NÃO deve aparecer para nova seleção
    if (hasStandardActiveContract) {
      return false;
    }

    // REGRA 1: Se for contrato PADRÃO (não temporada) para IMÓVEL:
    // Se o imóvel já possui contrato ativo (padrão ou temporada ativa/agendada), NÃO DEVE APARECER
    if (activeContracts.length > 0) return false;
    if (property.status === "Rented") return false;

    return true;
  });

  // Detector em tempo real de conflito de datas para o bem selecionado
  const dateConflict = React.useMemo(() => {
    if (!propertyId || !startDate || !endDate) return null;
    const selectedProp = properties.find((p) => String(p.id) === String(propertyId));
    if (!selectedProp) return null;

    const isNonPropertyAsset = selectedProp.assetCategory && selectedProp.assetCategory !== "PROPERTY";
    const allowMultiplePeriods = isTemporaryRental || isNonPropertyAsset;

    const conflict = allContracts.find((c) => {
      const isSameProp = String(c.propertyId) === String(propertyId);
      const isSameCont = isEditing && c.id === editingContract?.id;
      const isActiveCont =
        ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(c)) &&
        c.status !== "Deleted";

      if (!isSameProp || isSameCont || !isActiveCont) return false;
      if (!allowMultiplePeriods) return true;
      return doDateRangesOverlap(startDate, endDate, c.startDate, c.endDate);
    });

    return conflict || null;
  }, [propertyId, startDate, endDate, isTemporaryRental, properties, allContracts, isEditing, editingContract]);

  // Lista de Inquilinos disponíveis (respeita regra de isTenant)
  const availableTenants = tenants.filter((tenant) => {
    const isActive = tenant.isActive !== false;
    const isTenant = tenant.isTenant !== false;
    return (isActive && isTenant) || (isEditing && String(tenant.id) === String(tenantId));
  });

  function handlePropertySelect(selectedId: string) {
    setPropertyId(selectedId);
    setFormError("");

    const prop = properties.find((p) => String(p.id) === String(selectedId));
    if (prop && prop.rentValue) {
      setRentValue(formatCurrencyInput(prop.rentValue));
    }
  }

  function handleApplyDefaultTimes() {
    setCheckInTime(defaultCheckInTime);
    setCheckOutTime(defaultCheckOutTime);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const selectedProperty = properties.find((p) => String(p.id) === String(propertyId));
    if (!selectedProperty) {
      setFormError("Selecione um bem/ativo válido.");
      return;
    }

    const selectedTenant = tenants.find((t) => String(t.id) === String(tenantId));
    if (!selectedTenant) {
      setFormError("Selecione uma pessoa válida para ser o locatário.");
      return;
    }

    if (selectedTenant.isActive === false) {
      setFormError("Esta pessoa está inativa e não pode ser vinculada a contratos.");
      return;
    }

    if (selectedTenant.isTenant === false && !isEditing) {
      setFormError("Esta pessoa não está marcada como inquilino.");
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Informe a data de início e de fim do contrato.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError("A data de término não pode ser anterior à data de início.");
      return;
    }

    const numericRent = parseCurrencyInput(rentValue);
    if (!numericRent || numericRent <= 0) {
      setFormError("Informe um valor de aluguel válido.");
      return;
    }

    // REGRA 1 & 2: Checagem rigorosa de conflito de contratos ativos
    const isNonPropertyAsset =
      selectedProperty.assetCategory && selectedProperty.assetCategory !== "PROPERTY";
    const allowMultiplePeriods = isTemporaryRental || isNonPropertyAsset;

    if (!allowMultiplePeriods) {
      // Contrato padrão para imóvel: não pode haver nenhum contrato ativo para este imóvel
      const hasAnyActive = allContracts.some((c) => {
        const isSameProp = String(c.propertyId) === String(selectedProperty.id);
        const isSameCont = isEditing && c.id === editingContract?.id;
        const isActiveCont =
          ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(c)) &&
          c.status !== "Deleted";
        return isSameProp && !isSameCont && isActiveCont;
      });

      if (hasAnyActive) {
        setFormError("Este imóvel já possui um contrato ativo e não pode ser alugado novamente.");
        return;
      }
    } else {
      // Temporada ou Ativo não-imóvel: não pode haver contrato com sobreposição de data
      const conflicting = allContracts.find((c) => {
        const isSameProp = String(c.propertyId) === String(selectedProperty.id);
        const isSameCont = isEditing && c.id === editingContract?.id;
        const isActiveCont =
          ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(c)) &&
          c.status !== "Deleted";

        if (!isSameProp || isSameCont || !isActiveCont) return false;
        return doDateRangesOverlap(startDate, endDate, c.startDate, c.endDate);
      });

      if (conflicting) {
        const assetMsgPrefix = isNonPropertyAsset ? "ativo" : "contrato de temporada";
        setFormError(
          `Não é permitido criar contrato para este ${assetMsgPrefix} com a mesma data ou sobreposição de período. Este bem já possui contrato ativo de ${formatDate(conflicting.startDate)} até ${formatDate(conflicting.endDate)}.`
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      await onSave({
        propertyId: selectedProperty.id,
        propertyName: toUpperText(selectedProperty.name),
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        startDate,
        endDate,
        rentValue: numericRent,
        isTemporaryRental,
        checkInTime: isTemporaryRental ? checkInTime : "",
        checkOutTime: isTemporaryRental ? checkOutTime : "",
      });
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Não foi possível salvar o contrato."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  // Estado Minimizado (Barra Flutuante no canto inferior)
  if (isMinimized) {
    const selectedProp = properties.find((p) => String(p.id) === String(propertyId));

    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-slate-800">
              {isEditing ? "Editando Contrato" : "Novo Contrato"}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[200px]">
              {selectedProp?.name || "Rascunho de contrato"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-100 pl-2">
          <button
            type="button"
            onClick={onRestore}
            title="Restaurar janela"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition hover:bg-orange-100"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fechar rascunho"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl my-8 overflow-hidden">
        {/* Header da Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isEditing ? "Editar Contrato" : "Novo Contrato de Locação"}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {isEditing
                ? "Atualize os termos, datas ou valores da locação."
                : "Selecione o bem/ativo, o locatário e defina o período e aluguel."}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onMinimize}
              title="Minimizar janela"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar janela"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[calc(85vh-140px)] overflow-y-auto">
            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Modalidade do Contrato */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Modalidade do Contrato <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemporaryRental(false);
                      setCheckInTime("");
                      setCheckOutTime("");
                      setFormError("");
                      if (propertyId) {
                        const selectedProp = properties.find((p) => String(p.id) === String(propertyId));
                        const isNonPropertyAsset =
                          selectedProp?.assetCategory && selectedProp.assetCategory !== "PROPERTY";

                        if (!isNonPropertyAsset) {
                          const hasActive = allContracts.some((c) => {
                            const isSameProp = String(c.propertyId) === String(propertyId);
                            const isSameContract = isEditing && c.id === editingContract?.id;
                            const isActive =
                              ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(c)) &&
                              c.status !== "Deleted";
                            return isSameProp && !isSameContract && isActive;
                          });
                          if (hasActive) {
                            setPropertyId("");
                          }
                        }
                      }
                    }}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                      !isTemporaryRental
                        ? "border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-black">📄 Locação Padrão</span>
                    <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Residencial/comercial contínuo ou locação de ativos
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTemporaryRental(true);
                      setFormError("");
                    }}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                      isTemporaryRental
                        ? "border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-black">🏖️ Locação por Temporada</span>
                    <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Curto prazo / diárias (permite agendar em datas livres)
                    </span>
                  </button>
                </div>
              </div>

              {/* Bem / Ativo */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Bem / Ativo <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {isTemporaryRental
                      ? "Disponível para reservas por temporada"
                      : "Bens e ativos disponíveis ou agendáveis"}
                  </span>
                </div>
                <select
                  value={propertyId}
                  onChange={(e) => handlePropertySelect(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">Selecione o bem/ativo para locação</option>
                  {availableProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {getAssetCategoryLabel(p.assetCategory)}
                    </option>
                  ))}
                </select>
                {availableProperties.length === 0 && (
                  <p className="text-[11px] font-semibold text-amber-600 mt-1">
                    {isTemporaryRental
                      ? "Nenhum bem disponível para temporada."
                      : "Todos os bens já possuem contratos no período ou estão em manutenção."}
                  </p>
                )}
              </div>

              {/* Inquilino */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Locatário / Inquilino <span className="text-red-500">*</span>
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    setFormError("");
                  }}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">Selecione o inquilino cadastrado</option>
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.cpf || t.document ? `(${t.cpf || t.document})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor do Aluguel */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Valor {isTemporaryRental ? "Total da Temporada" : "do Aluguel Mensal"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rentValue}
                  onChange={(e) => {
                    setRentValue(formatCurrencyInput(e.target.value));
                    setFormError("");
                  }}
                  placeholder="R$ 0,00"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* Status Automático Notice */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-black text-slate-700">Ciclo de Vida Automático</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Novos contratos são criados como <b>Ativo</b>. Vencimento, cancelamento e renovação são geridos nas ações.
                </p>
              </div>

              {/* Data Início */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Data de Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setFormError("");
                  }}
                  required
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${
                    dateConflict
                      ? "border-red-300 bg-red-50/50 text-red-900 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 bg-white text-slate-700 focus:border-orange-500 focus:ring-orange-100"
                  }`}
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Data de Término <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setFormError("");
                  }}
                  required
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${
                    dateConflict
                      ? "border-red-300 bg-red-50/50 text-red-900 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 bg-white text-slate-700 focus:border-orange-500 focus:ring-orange-100"
                  }`}
                />
              </div>

              {/* Alerta em Tempo Real de Conflito de Período */}
              {dateConflict && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs sm:col-span-2 animate-in fade-in duration-200">
                  <div className="font-black flex items-center gap-1.5 text-rose-900">
                    ⚠️ Conflito de Datas Detectado
                  </div>
                  <div className="mt-1 font-semibold leading-relaxed">
                    O bem selecionado já possui um contrato ativo entre{" "}
                    <strong>{formatDate(dateConflict.startDate)}</strong> e{" "}
                    <strong>{formatDate(dateConflict.endDate)}</strong>{" "}
                    ({dateConflict.tenantName || "Outro locatário"}). Por favor, escolha datas livres para prosseguir.
                  </div>
                </div>
              )}
            </div>

            {/* Opção de Locação por Temporada - Horários */}
            {isTemporaryRental && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Horários de Check-in e Check-out
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Defina os horários de entrada e saída para a locação de temporada.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyDefaultTimes}
                      className="rounded-xl bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700 transition hover:bg-orange-200"
                    >
                      Usar Padrão
                    </button>
                    <button
                      type="button"
                      onClick={onOpenTimeDefaults}
                      title="Configurar horários padrão"
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        Check-in (Entrada)
                      </label>
                      <input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        Check-out (Saída)
                      </label>
                      <input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Footer da Modal */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-orange-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-700 disabled:opacity-50"
            >
              {isSaving
                ? "Salvando..."
                : isEditing
                ? "Salvar Alterações"
                : "Criar Contrato"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
