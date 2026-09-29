"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Plus, Clock, FileText } from "lucide-react";

// Serviços
import {
  createContract,
  getContracts,
  updateContract,
  cancelContract,
  finishContract,
  renewContract,
  softDeleteContract,
  shareContract,
  type CreateContractDto,
  type UpdateContractDto,
} from "@/services/contracts.service";
import { openWhatsAppMessage } from "@/services/whatsapp.service";
import { getProperties } from "@/services/properties.service";
import { getPeople } from "@/services/people.service";
import {
  getReceivableAccounts,
  deleteReceivableAccount,
  type ReceivableAccount,
} from "@/services/financial.service";
import {
  getScheduleItems,
  deleteScheduleItem,
} from "@/services/schedule.service";
import { createPropertyMovement } from "@/services/property-movements.service";
import {
  clearMinimizedModalState,
  setMinimizedModalState,
  CLOSE_MINIMIZED_MODAL_EVENT,
  RESTORE_MINIMIZED_MODAL_EVENT,
} from "@/services/minimized-modal.service";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";

// Tipos e Componentes Modulares
import {
  Contract,
  Property,
  ContrxTenant,
  ContractFilterStatus,
  ContractTypeFilter,
  ContractRenewalRecord,
  ContractModalDraft,
  DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME,
  DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME,
  TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
  RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
  CONTRACT_SCHEDULE_DRAFT_KEY,
  getContractReceivableSchedule,
  mapApiContractToContract,
  mapApiPropertyToProperty,
  mapApiPersonToTenant,
  mapReceivableAccountToCharge,
  buildContractPayload,
  syncPropertiesWithContracts,
  getDisplayContractStatus,
  normalizeSearchText,
  getContractSortTime,
} from "@/components/contracts/contract-types";
import { ContractKpis } from "@/components/contracts/contract-kpis";
import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractTable } from "@/components/contracts/contract-table";
import { ContractMobileCards } from "@/components/contracts/contract-mobile-cards";
import { ContractFormModal } from "@/components/contracts/contract-form-modal";
import { ContractDetailsModal } from "@/components/contracts/contract-details-modal";
import { ContractRenewalModal } from "@/components/contracts/contract-renewal-modal";
import {
  ContractFinishModal,
  ContractCancelModal,
  ContractDeleteModal,
  ContractEditConfirmationModal,
  ContractPromptInstallmentsModal,
} from "@/components/contracts/contract-lifecycle-modals";
import { ContractPrintModal } from "@/components/contracts/contract-print-modal";
import { ContractTimeDefaultsModal } from "@/components/contracts/contract-time-defaults-modal";
import { ContractShareModal } from "@/components/contracts/contract-share-modal";

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function ContractsPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  // Dados principais
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<ContrxTenant[]>([]);
  const [receivableAccounts, setReceivableAccounts] = useState<ReceivableAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractFilterStatus>("Active");
  const [typeFilter, setTypeFilter] = useState<ContractTypeFilter>("All");

  // Estado dos Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormMinimized, setIsFormMinimized] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const [detailsContract, setDetailsContract] = useState<Contract | null>(null);
  const [printContract, setPrintContract] = useState<Contract | null>(null);
  const [printableAdendum, setPrintableAdendum] = useState<{
    contract: Contract;
    renewal: ContractRenewalRecord;
  } | null>(null);

  const [renewalContract, setRenewalContract] = useState<Contract | null>(null);
  const [finishContractTarget, setFinishContractTarget] = useState<Contract | null>(null);
  const [cancelContractTarget, setCancelContractTarget] = useState<Contract | null>(null);
  const [deleteContractTarget, setDeleteContractTarget] = useState<Contract | null>(null);
  const [promptParcelasContract, setPromptParcelasContract] = useState<Contract | null>(null);
  const [pendingEditContract, setPendingEditContract] = useState<Contract | null>(null);
  const [postCreateFlowContract, setPostCreateFlowContract] = useState<Contract | null>(null);

  // Compartilhamento via WhatsApp
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalContract, setShareModalContract] = useState<Contract | null>(null);
  const [shareModalUrl, setShareModalUrl] = useState("");
  const [shareModalExpiresAt, setShareModalExpiresAt] = useState<string | undefined>();

  // Horários padrão de temporada
  const [defaultCheckInTime, setDefaultCheckInTime] = useState(DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
  const [defaultCheckOutTime, setDefaultCheckOutTime] = useState(DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);
  const [isTimeDefaultsOpen, setIsTimeDefaultsOpen] = useState(false);

  // Carregar dados da empresa
  const loadData = useCallback(async (cid: string) => {
    try {
      setIsLoading(true);
      const [apiContracts, apiProperties, apiPeople, apiReceivables] = await Promise.all([
        getContracts(),
        getProperties(cid),
        getPeople(cid),
        getReceivableAccounts(cid),
      ]);

      const loadedContracts = apiContracts.map(mapApiContractToContract);
      const loadedProperties = apiProperties.map((p) => mapApiPropertyToProperty(p, loadedContracts));
      const loadedTenants = apiPeople.map(mapApiPersonToTenant);

      setContracts(loadedContracts);
      setProperties(syncPropertiesWithContracts(loadedContracts, loadedProperties));
      setTenants(loadedTenants);
      setReceivableAccounts(apiReceivables);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar dados de contratos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      loadData(companyId);
    } else {
      setIsLoading(false);
    }
  }, [companyId, loadData]);

  // Carregar horários padrão de temporada salvos
  useEffect(() => {
    const stored = getCompanyStorageItem(
      companyId,
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY
    );
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.checkInTime) setDefaultCheckInTime(parsed.checkInTime);
      if (parsed.checkOutTime) setDefaultCheckOutTime(parsed.checkOutTime);
    } catch {
      // Usa padrões
    }
  }, [companyId]);

  // Auto-dismiss do Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Notificação de fluxo completo retornado da Agenda
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("flowCompleted") === "1") {
      setToast({
        type: "success",
        message: "Fluxo de contrato concluído com sucesso! Contrato, parcelas e agendamento registrados.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Suporte a abertura direta de contrato via URL (?openContractId=...)
  useEffect(() => {
    if (typeof window === "undefined" || isLoading || contracts.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get("openContractId");
    if (targetId) {
      const found = contracts.find((c) => String(c.id) === String(targetId));
      if (found) {
        setPrintContract(found);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [isLoading, contracts]);

  // Gerenciamento de Modal Minimizável
  const handleCloseFormModal = useCallback(() => {
    clearMinimizedModalState("contracts");
    setIsFormOpen(false);
    setIsFormMinimized(false);
    setEditingContract(null);
  }, []);

  const handleMinimizeFormModal = useCallback(() => {
    setIsFormMinimized(true);
    setMinimizedModalState<ContractModalDraft>({
      tool: "contracts",
      draft: {
        editingContractId: editingContract?.id || null,
        propertyId: editingContract?.propertyId || "",
        tenantId: editingContract?.tenantId || "",
        startDate: editingContract?.startDate || "",
        endDate: editingContract?.endDate || "",
        rentValue: String(editingContract?.rentValue || ""),
        isTemporaryRental: Boolean(editingContract?.isTemporaryRental),
        checkInTime: editingContract?.checkInTime || "",
        checkOutTime: editingContract?.checkOutTime || "",
      },
    });
  }, [editingContract]);

  const handleRestoreFormModal = useCallback(() => {
    setIsFormMinimized(false);
    setIsFormOpen(true);
    clearMinimizedModalState("contracts");
  }, []);

  useEffect(() => {
    function handleRestore(event: Event) {
      const detail = (event as CustomEvent<{ tool?: string }>).detail;
      if (detail?.tool === "contracts") {
        handleRestoreFormModal();
      }
    }
    function handleClose(event: Event) {
      const detail = (event as CustomEvent<{ tool?: string }>).detail;
      if (detail?.tool === "contracts") {
        handleCloseFormModal();
      }
    }
    window.addEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestore);
    window.addEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleClose);
    return () => {
      window.removeEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestore);
      window.removeEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleClose);
    };
  }, [handleRestoreFormModal, handleCloseFormModal]);

  // Filtro de Contratos
  const filteredContracts = useMemo(() => {
    const term = normalizeSearchText(search);

    return contracts
      .filter((c) => {
        const displayStatus = getDisplayContractStatus(c);
        const matchesStatus =
          statusFilter === "All" ||
          displayStatus === statusFilter ||
          (statusFilter === "Active" && (displayStatus === "Expiring" || displayStatus === "Scheduled"));

        const matchesType =
          typeFilter === "All" ||
          (typeFilter === "TEMPORARY" && c.isTemporaryRental) ||
          (typeFilter === "STANDARD" && !c.isTemporaryRental);

        const matchesSearch =
          !term ||
          normalizeSearchText(c.propertyName).includes(term) ||
          normalizeSearchText(c.tenantName).includes(term);

        return matchesStatus && matchesType && matchesSearch;
      })
      .sort((a, b) => getContractSortTime(b) - getContractSortTime(a));
  }, [contracts, statusFilter, typeFilter, search]);

  // Ações de Contrato
  async function handleSaveContract(data: Partial<Contract>) {
    if (!companyId) return;

    if (editingContract) {
      // Atualização
      const updatedDto: UpdateContractDto = {
        ...buildContractPayload({ ...editingContract, ...data } as Contract),
      };
      const res = await updateContract(editingContract.id, updatedDto);
      const saved = mapApiContractToContract(res);

      setContracts((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setToast({ type: "success", message: "Contrato atualizado com sucesso!" });

      createPropertyMovement({
        companyId,
        propertyId: String(saved.propertyId),
        propertyName: saved.propertyName,
        type: "ContractUpdated",
        description: "Contrato atualizado no cadastro de locação.",
      }).catch(console.warn);
    } else {
      // Criação
      const createDto: CreateContractDto = {
        ...(buildContractPayload(data as Contract) as CreateContractDto),
      };
      const res = await createContract(createDto);
      const saved = mapApiContractToContract(res);

      setContracts((prev) => [saved, ...prev]);

      createPropertyMovement({
        companyId,
        propertyId: String(saved.propertyId),
        propertyName: saved.propertyName,
        type: "ContractCreated",
        description: "Contrato criado e bem/ativo vinculado à locação.",
      }).catch(console.warn);

      // Prepara payload de faturamento para o Contas a Receber
      const receivableSchedule = getContractReceivableSchedule(saved);
      if (companyId) {
        const monthlyAmount = Number(saved.rentValue || 0);
        const totalAmount = receivableSchedule.reduce(
          (total, item) => total + Number(item.amount || 0),
          0
        );
        const firstInstallment = receivableSchedule[0] || { dueDate: saved.startDate };

        setCompanyStorageItem(
          companyId,
          RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
          JSON.stringify({
            contractId: String(saved.id),
            tenantId: String(saved.tenantId),
            tenantName:
              saved.tenantName ||
              tenants.find((t) => String(t.id) === String(saved.tenantId))?.name ||
              "",
            propertyId: String(saved.propertyId),
            propertyName:
              saved.propertyName ||
              properties.find((p) => String(p.id) === String(saved.propertyId))?.name ||
              "",
            amount: monthlyAmount,
            monthlyAmount,
            totalAmount,
            issueDate: saved.startDate,
            dueDate: firstInstallment.dueDate,
            endDate: saved.endDate,
            installmentQuantity: receivableSchedule.length || 1,
          })
        );

        // Prepara dados para o agendamento posterior na Agenda
        setCompanyStorageItem(
          companyId,
          CONTRACT_SCHEDULE_DRAFT_KEY,
          JSON.stringify({
            contractId: String(saved.id),
            tenantId: String(saved.tenantId),
            tenantName:
              saved.tenantName ||
              tenants.find((t) => String(t.id) === String(saved.tenantId))?.name ||
              "",
            propertyId: String(saved.propertyId),
            propertyName:
              saved.propertyName ||
              properties.find((p) => String(p.id) === String(saved.propertyId))?.name ||
              "",
            startDate: saved.startDate,
            endDate: saved.endDate,
            checkInTime: saved.checkInTime || defaultCheckInTime,
            checkOutTime: saved.checkOutTime || defaultCheckOutTime,
            isTemporaryRental: Boolean(saved.isTemporaryRental),
          })
        );
      }

      // Fecha o formulário de cadastro
      handleCloseFormModal();

      // Abre imediatamente a VISUALIZAÇÃO E IMPRESSÃO DO CONTRATO
      setPostCreateFlowContract(saved);
      setPrintContract(saved);
      setToast({ type: "success", message: "Contrato criado! Visualize o documento para conferência e impressão." });
    }

    // Atualiza status operacional dos imóveis
    if (companyId) {
      getProperties(companyId)
        .then((props) => setProperties(syncPropertiesWithContracts(contracts, props.map((p) => mapApiPropertyToProperty(p, contracts)))))
        .catch(console.warn);
    }
  }

  function handleEditClick(contract: Contract) {
    if (contract.status === "Finished" || contract.status === "Canceled" || contract.status === "Deleted") {
      setPendingEditContract(contract);
    } else {
      setEditingContract(contract);
      setIsFormOpen(true);
      setIsFormMinimized(false);
    }
  }

  function handleConfirmPendingEdit() {
    if (pendingEditContract) {
      setEditingContract(pendingEditContract);
      setPendingEditContract(null);
      setIsFormOpen(true);
      setIsFormMinimized(false);
    }
  }

  function handleGenerateInstallments() {
    if (!promptParcelasContract) return;
    const targetId = promptParcelasContract.id;
    setPromptParcelasContract(null);
    window.location.href = `/contas-receber?fromContract=1&contractId=${encodeURIComponent(
      String(targetId)
    )}`;
  }

  async function handleConfirmRenewal(renewalData: {
    endDate: string;
    rentValue: number;
    notes?: string;
  }) {
    if (!renewalContract || !companyId) return;

    const res = await renewContract(renewalContract.id, renewalData);
    const renewed = mapApiContractToContract(res);

    setContracts((prev) => prev.map((c) => (c.id === renewed.id ? renewed : c)));

    createPropertyMovement({
      companyId,
      propertyId: String(renewed.propertyId),
      propertyName: renewed.propertyName,
      type: "ContractRenewed",
      description: `Contrato renovado com vigência estendida até ${renewed.endDate}.`,
    }).catch(console.warn);

    if (renewed.renewalHistory && renewed.renewalHistory.length > 0) {
      setPrintableAdendum({
        contract: renewed,
        renewal: renewed.renewalHistory[0],
      });
    }

    // Prepara payload das parcelas para o novo período
    const receivableSchedule = getContractReceivableSchedule(renewed);
    if (receivableSchedule.length > 0) {
      const monthlyAmount = Number(renewed.rentValue || 0);
      const totalAmount = receivableSchedule.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );
      const firstInstallment = receivableSchedule[0];

      setCompanyStorageItem(
        companyId,
        RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
        JSON.stringify({
          contractId: String(renewed.id),
          tenantId: String(renewed.tenantId),
          tenantName:
            renewed.tenantName ||
            tenants.find((t) => String(t.id) === String(renewed.tenantId))?.name ||
            "",
          propertyId: String(renewed.propertyId),
          propertyName:
            renewed.propertyName ||
            properties.find((p) => String(p.id) === String(renewed.propertyId))?.name ||
            "",
          amount: monthlyAmount,
          monthlyAmount,
          totalAmount,
          issueDate: renewed.startDate,
          dueDate: firstInstallment.dueDate,
          endDate: renewed.endDate,
          installmentQuantity: receivableSchedule.length,
        })
      );

      setPromptParcelasContract(renewed);
    }

    setToast({ type: "success", message: "Contrato renovado com sucesso!" });

    getReceivableAccounts(companyId).then(setReceivableAccounts).catch(console.warn);
  }

  async function handleConfirmFinish(reason: string) {
    if (!finishContractTarget || !companyId) return;

    const res = await finishContract(finishContractTarget.id, reason);
    const finished = mapApiContractToContract(res);

    setContracts((prev) => prev.map((c) => (c.id === finished.id ? finished : c)));
    setToast({ type: "success", message: "Contrato finalizado e bem/ativo liberado!" });

    getReceivableAccounts(companyId).then(setReceivableAccounts).catch(console.warn);
    getProperties(companyId)
      .then((props) => setProperties(syncPropertiesWithContracts(contracts, props.map((p) => mapApiPropertyToProperty(p, contracts)))))
      .catch(console.warn);
  }

  async function handleConfirmCancel(reason: string) {
    if (!cancelContractTarget || !companyId) return;

    const res = await cancelContract(cancelContractTarget.id, reason);
    const canceled = mapApiContractToContract(res);

    setContracts((prev) => prev.map((c) => (c.id === canceled.id ? canceled : c)));
    setToast({ type: "success", message: "Contrato cancelado com sucesso." });

    getReceivableAccounts(companyId).then(setReceivableAccounts).catch(console.warn);
    getProperties(companyId)
      .then((props) => setProperties(syncPropertiesWithContracts(contracts, props.map((p) => mapApiPropertyToProperty(p, contracts)))))
      .catch(console.warn);
  }

  async function handleConfirmDelete(reason: string) {
    if (!deleteContractTarget || !companyId) return;

    const targetId = deleteContractTarget.id;
    const targetContract = deleteContractTarget;

    try {
      const res = await softDeleteContract(targetId, reason);
      const deleted = mapApiContractToContract(res);

      // 1. Atualiza lista de contratos
      setContracts((prev) => prev.map((c) => (c.id === deleted.id ? deleted : c)));

      // 2. Remove parcelas do estado local de contas a receber e chama limpeza no financeiro
      const linkedCharges = receivableAccounts.filter(
        (acc) => String(acc.contractId || "") === String(targetId)
      );
      await Promise.all(
        linkedCharges.map((acc) => deleteReceivableAccount(acc.id).catch(console.warn))
      );
      setReceivableAccounts((prev) =>
        prev.filter((acc) => String(acc.contractId || "") !== String(targetId))
      );

      // 3. Remove agendamentos vinculados na Agenda
      try {
        const allSchedules = await getScheduleItems();
        const contractSchedules = allSchedules.filter(
          (item) =>
            item.notes?.includes(targetId) ||
            item.notes?.includes(`contract-due:${targetId}`) ||
            item.notes?.includes(`contract-start:${targetId}`) ||
            (item.type === "Contrato" && item.propertyName === targetContract.propertyName)
        );
        await Promise.all(
          contractSchedules.map((s) => deleteScheduleItem(s.id).catch(console.warn))
        );
      } catch (scheduleErr) {
        console.warn("Aviso ao limpar agendamentos da agenda:", scheduleErr);
      }

      // 4. Registra movimentação do bem e atualiza status dos imóveis
      createPropertyMovement({
        companyId,
        propertyId: String(targetContract.propertyId),
        propertyName: targetContract.propertyName,
        type: "ContractDeleted",
        description: "Contrato excluído e contas/agendamentos vinculados removidos do sistema.",
      }).catch(console.warn);

      getProperties(companyId)
        .then((props) =>
          setProperties(syncPropertiesWithContracts(contracts, props.map((p) => mapApiPropertyToProperty(p, contracts))))
        )
        .catch(console.warn);

      setToast({
        type: "success",
        message:
          "Contrato excluído com sucesso. Parcelas a receber e agendamentos vinculados foram removidos do sistema.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Não foi possível excluir o contrato.",
      });
    }
  }

  function handleSaveTimeDefaults(checkIn: string, checkOut: string) {
    setDefaultCheckInTime(checkIn);
    setDefaultCheckOutTime(checkOut);
    setCompanyStorageItem(
      companyId,
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
      JSON.stringify({ checkInTime: checkIn, checkOutTime: checkOut })
    );
    setToast({ type: "success", message: "Horários padrão de temporada salvos!" });
  }

  const selectedDetailsCharges = useMemo(() => {
    if (!detailsContract) return [];
    return receivableAccounts
      .filter((acc) => String(acc.contractId || "") === String(detailsContract.id))
      .map(mapReceivableAccountToCharge);
  }, [detailsContract, receivableAccounts]);

  const selectedPropertyForPrint = useMemo(() => {
    const target = printContract || detailsContract;
    if (!target) return null;
    return properties.find((p) => String(p.id) === String(target.propertyId)) || null;
  }, [printContract, detailsContract, properties]);

  const selectedTenantForPrint = useMemo(() => {
    const target = printContract || detailsContract;
    if (!target) return null;
    return tenants.find((t) => String(t.id) === String(target.tenantId)) || null;
  }, [printContract, detailsContract, tenants]);

  // Parcelas pendentes do contrato selecionado para finalização
  const finishModalPendingCharges = useMemo(() => {
    if (!finishContractTarget) return [];
    return receivableAccounts
      .filter(
        (acc) =>
          String(acc.contractId || "") === String(finishContractTarget.id) &&
          acc.status !== "PAID"
      )
      .map((acc) => ({
        id: acc.id,
        amount: Number(acc.amount || 0),
        dueDate: acc.dueDate,
        installmentNumber: acc.installmentNumber,
        installmentTotal: acc.installmentTotal,
        isDownPayment: acc.isDownPayment,
        status: acc.status,
      }));
  }, [finishContractTarget, receivableAccounts]);

  // Compartilhamento de Contrato via WhatsApp com link público válido por 7 dias
  async function handleShareContractWhatsApp(contract: Contract) {
    try {
      setToast({ type: "info", message: "Gerando link de visualização seguro do contrato..." });
      const res = await shareContract(contract.id);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${baseUrl}/contrato-compartilhado/${res.id}`;

      setShareModalContract(contract);
      setShareModalUrl(url);
      setShareModalExpiresAt(res.expiresAt);
      setIsShareModalOpen(true);

      const tenant = tenants.find((t) => String(t.id) === String(contract.tenantId));
      if (tenant?.phone) {
        const cleanPhone = tenant.phone.replace(/\D/g, "");
        const customerName = contract.tenantName || tenant.name || "Cliente";
        const propertyTitle = contract.propertyName || "Imóvel / Bem";
        const msg = [
          `Olá, *${customerName}*!`,
          ``,
          `Segue o link para visualização e impressão do seu Contrato de Locação referente ao bem *${propertyTitle}*:`,
          `🔗 ${url}`,
          ``,
          `ℹ️ _Este link é válido por 7 dias._`,
        ].join("\n");

        openWhatsAppMessage({
          phone: cleanPhone,
          message: msg,
        });
      }
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao gerar link de compartilhamento.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[999] flex items-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-black shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : toast.type === "error"
              ? "bg-rose-600 text-white shadow-rose-500/20"
              : "bg-slate-900 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Contratos de Locação
            </h1>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Gerencie contratos residenciais, comerciais e por temporada com sincronização financeira.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTimeDefaultsOpen(true)}
            title="Configurar horários padrão de check-in e check-out"
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Horários Temporada</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingContract(null);
              setIsFormOpen(true);
              setIsFormMinimized(false);
            }}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Novo Contrato
          </button>
        </div>
      </div>

      {/* Indicadores / KPIs */}
      <ContractKpis
        contracts={contracts}
        selectedFilter={statusFilter}
        onSelectFilter={setStatusFilter}
      />

      {/* Barra de Filtros e Busca */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <ContractFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      </div>

      {/* Listagem Desktop (Tabela) */}
      {/* Listagem Desktop (Tabela) */}
      <ContractTable
        contracts={filteredContracts}
        properties={properties}
        tenants={tenants}
        isLoading={isLoading}
        onOpenDetails={setDetailsContract}
        onPrintContract={setPrintContract}
        onShareWhatsApp={handleShareContractWhatsApp}
        onEdit={handleEditClick}
        onRenew={setRenewalContract}
        onFinish={setFinishContractTarget}
        onCancel={setCancelContractTarget}
        onDelete={setDeleteContractTarget}
      />

      {/* Listagem Mobile (Cards) */}
      <ContractMobileCards
        contracts={filteredContracts}
        properties={properties}
        tenants={tenants}
        onOpenDetails={setDetailsContract}
        onPrintContract={setPrintContract}
        onShareWhatsApp={handleShareContractWhatsApp}
        onEdit={handleEditClick}
        onRenew={setRenewalContract}
        onFinish={setFinishContractTarget}
        onCancel={setCancelContractTarget}
        onDelete={setDeleteContractTarget}
      />

      {/* Modais do Sistema */}
      {/* 1. Modal de Cadastro/Edição */}
      <ContractFormModal
        isOpen={isFormOpen}
        isMinimized={isFormMinimized}
        onMinimize={handleMinimizeFormModal}
        onRestore={handleRestoreFormModal}
        onClose={handleCloseFormModal}
        editingContract={editingContract}
        properties={properties}
        tenants={tenants}
        allContracts={contracts}
        defaultCheckInTime={defaultCheckInTime}
        defaultCheckOutTime={defaultCheckOutTime}
        onOpenTimeDefaults={() => setIsTimeDefaultsOpen(true)}
        onSave={handleSaveContract}
      />

      {/* 2. Modal de Detalhes 360° */}
      <ContractDetailsModal
        contract={detailsContract}
        property={selectedPropertyForPrint}
        tenant={selectedTenantForPrint}
        charges={selectedDetailsCharges}
        companyName={(user as any)?.company?.name || (user as any)?.companyName || "Contrx"}
        isOpen={Boolean(detailsContract)}
        onClose={() => setDetailsContract(null)}
        onPrintContract={(c) => {
          setDetailsContract(null);
          setPrintContract(c);
        }}
      />

      {/* 3. Modal de Impressão e Minuta */}
      <ContractPrintModal
        contract={printContract}
        property={selectedPropertyForPrint}
        tenant={selectedTenantForPrint}
        companyId={companyId}
        isOpen={Boolean(printContract)}
        onProceedToInstallments={
          postCreateFlowContract
            ? () => {
                const targetId = postCreateFlowContract.id;
                setPrintContract(null);
                setPostCreateFlowContract(null);
                window.location.href = `/contas-receber?fromContract=1&contractId=${encodeURIComponent(String(targetId))}`;
              }
            : undefined
        }
        onClose={() => {
          const pendingFlow = postCreateFlowContract;
          setPrintContract(null);
          setPostCreateFlowContract(null);
          if (pendingFlow) {
            window.location.href = `/contas-receber?fromContract=1&contractId=${encodeURIComponent(String(pendingFlow.id))}`;
          }
        }}
      />

      {/* 4. Modal de Impressão de Aditivo */}
      {printableAdendum && (
        <ContractPrintModal
          contract={printableAdendum.contract}
          adendum={printableAdendum}
          companyId={companyId}
          isOpen={Boolean(printableAdendum)}
          onClose={() => setPrintableAdendum(null)}
        />
      )}

      {/* 5. Modal de Renovação */}
      <ContractRenewalModal
        contract={renewalContract}
        isOpen={Boolean(renewalContract)}
        onClose={() => setRenewalContract(null)}
        onConfirm={handleConfirmRenewal}
      />

      {/* 6. Modal de Finalização com Bloqueio de Parcelas Pendentes */}
      <ContractFinishModal
        contract={finishContractTarget}
        isOpen={Boolean(finishContractTarget)}
        onClose={() => setFinishContractTarget(null)}
        onConfirm={handleConfirmFinish}
        pendingCharges={finishModalPendingCharges}
        onGoToReceivables={(contractId) => {
          setFinishContractTarget(null);
          window.location.href = `/contas-receber?filterContractId=${encodeURIComponent(contractId)}`;
        }}
      />

      {/* 6.1. Modal de Compartilhamento de Contrato via WhatsApp */}
      <ContractShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareModalContract(null);
          setShareModalUrl("");
        }}
        contract={shareModalContract}
        shareUrl={shareModalUrl}
        expiresAt={shareModalExpiresAt}
        tenant={tenants.find((t) => String(t.id) === String(shareModalContract?.tenantId)) || null}
      />

      {/* 7. Modal de Cancelamento */}
      <ContractCancelModal
        contract={cancelContractTarget}
        isOpen={Boolean(cancelContractTarget)}
        onClose={() => setCancelContractTarget(null)}
        onConfirm={handleConfirmCancel}
      />

      {/* 8. Modal de Exclusão com limpeza de parcelas e agenda */}
      <ContractDeleteModal
        contract={deleteContractTarget}
        isOpen={Boolean(deleteContractTarget)}
        onClose={() => setDeleteContractTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* 9. Confirmação de Edição de Contrato Encerrado */}
      <ContractEditConfirmationModal
        contract={pendingEditContract}
        isOpen={Boolean(pendingEditContract)}
        onClose={() => setPendingEditContract(null)}
        onConfirm={handleConfirmPendingEdit}
      />

      {/* 10. Prompt de Faturamento / Gerar Parcelas no Contas a Receber */}
      <ContractPromptInstallmentsModal
        isOpen={Boolean(promptParcelasContract)}
        onClose={() => setPromptParcelasContract(null)}
        onGenerate={handleGenerateInstallments}
        propertyName={promptParcelasContract?.propertyName || undefined}
        title="Deseja gerar o faturamento agora?"
        description="O contrato foi processado e registrado com sucesso. Deseja abrir o Contas a Receber para conferir e gerar o carnê de parcelas deste contrato?"
      />

      {/* 11. Configuração de Horários Padrão */}
      <ContractTimeDefaultsModal
        isOpen={isTimeDefaultsOpen}
        onClose={() => setIsTimeDefaultsOpen(false)}
        defaultCheckInTime={defaultCheckInTime}
        defaultCheckOutTime={defaultCheckOutTime}
        onSave={handleSaveTimeDefaults}
      />
    </div>
  );
}
