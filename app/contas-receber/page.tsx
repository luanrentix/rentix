"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ArrowUpCircle, RefreshCw, Loader2, CheckSquare, Printer, ArrowRight, X, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getReceivableAccounts,
  createReceivableAccount,
  updateReceivableAccount,
  deleteReceivableAccount,
  receiveAccount,
  receiveAccountsBatch,
  reverseReceivedAccount,
  shareReceivableReport,
  type ReceivableAccount,
} from "@/services/financial.service";
import { getPeople, type Person } from "@/services/people.service";
import { getProperties, type Property as ApiProperty } from "@/services/properties.service";
import { getContracts, type Contract as ApiContract } from "@/services/contracts.service";
import { getCachedCompanySettings } from "@/services/settings-cache";
import {
  getCompanyStorageItem,
  removeCompanyStorageItem,
} from "@/services/company-storage";
import {
  Charge,
  ChargePayment,
  PAYMENT_METHODS,
  formatCurrency,
  StatusFilter,
  PeriodShortcut,
  PaymentMethod,
  ChargeLaunchType,
  Tenant,
  Property,
  Contract,
  getStartOfCurrentMonth,
  getEndOfCurrentMonth,
  isDateInsideRange,
  normalizeSearchText,
  mapUiPaymentMethodToApi,
  mapApiPaymentMethodToUi,
} from "@/components/contas-receber/receivable-types";
import { ReceivableKpis } from "@/components/contas-receber/receivable-kpis";
import { ReceivableFilters } from "@/components/contas-receber/receivable-filters";
import { ReceivableTable } from "@/components/contas-receber/receivable-table";
import { ReceivableMobileCards } from "@/components/contas-receber/receivable-mobile-cards";
import { ReceivablePaymentModal } from "@/components/contas-receber/modals/receivable-payment-modal";
import { ReceivableBatchModal } from "@/components/contas-receber/modals/receivable-batch-modal";
import { ReceivableFormModal } from "@/components/contas-receber/modals/receivable-form-modal";
import { ReceivableDeleteModal } from "@/components/contas-receber/modals/receivable-delete-modal";
import { ReceivableHistoryModal } from "@/components/contas-receber/modals/receivable-history-modal";
import { PersonSelectModal } from "@/components/contas-receber/modals/person-select-modal";
import { ReceivableShareModal } from "@/components/contas-receber/modals/receivable-share-modal";
import { generatePaymentReceipt, generatePaymentReceiptBatch, generatePaymentCarnet } from "./printing";

export default function ContasReceberPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  // Estados principais
  const [charges, setCharges] = useState<Charge[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filtros e Seleção em Lote
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
  const [selectedTenantId, setSelectedTenantId] = useState("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");
  const [periodShortcut, setPeriodShortcut] = useState<PeriodShortcut>("CurrentMonth");
  const [startDate, setStartDate] = useState(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState(getEndOfCurrentMonth());
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modais
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPersonFilterModalOpen, setIsPersonFilterModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalCharge, setShareModalCharge] = useState<Charge | null>(null);
  const [shareModalUrl, setShareModalUrl] = useState("");
  const [shareModalExpiresAt, setShareModalExpiresAt] = useState<string | undefined>();
  const [deleteModalMode, setDeleteModalMode] = useState<"delete" | "reversal">("delete");
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [contractPayload, setContractPayload] = useState<any>(null);
  const [flowContractId, setFlowContractId] = useState<string | null>(null);
  const [filterContractId, setFilterContractId] = useState<string | null>(null);
  const [pendingContractCarnetFlow, setPendingContractCarnetFlow] = useState<{
    contractId: string;
    charges: Charge[];
  } | null>(null);
  const [paymentReceiptSuccess, setPaymentReceiptSuccess] = useState<{
    charge: Charge;
    paymentRecord: ChargePayment;
  } | null>(null);
  const [batchReceiptSuccess, setBatchReceiptSuccess] = useState<{
    items: Array<{ charge: Charge; paymentRecord: ChargePayment }>;
  } | null>(null);

  const getPaymentMethodLabel = useCallback((method: any): string => {
    const found = PAYMENT_METHODS.find((pm) => pm.value === method);
    return found?.label || String(method || "");
  }, []);

  // Mapear dados da API para o tipo de domínio Charge
  function mapApiCharge(item: ReceivableAccount): Charge {
    const rawPayments = item.payments || [];
    const payments = rawPayments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      method: mapApiPaymentMethodToUi(p.method),
      interest: Number(p.interest || 0),
      discount: Number(p.discount || 0),
      amountPaid: Number(p.amountPaid || 0),
      note: p.note || null,
      paymentItems: Array.isArray((p as any).paymentItems)
        ? (p as any).paymentItems.map((pi: any) => ({
            method: mapApiPaymentMethodToUi(pi.method),
            amount: Number(pi.amount || 0),
          }))
        : null,
    }));

    const amount = Number(item.amount || 0);
    const paidSum = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const discountSum = payments.reduce((sum, p) => sum + p.discount, 0);
    const interestSum = payments.reduce((sum, p) => sum + p.interest, 0);
    const totalSettled = paidSum + discountSum - interestSum;

    const isPaid = totalSettled >= amount - 0.001 && amount > 0;
    const isOverdue =
      !isPaid &&
      item.dueDate &&
      item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);

    const status = isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending";

    return {
      id: item.id,
      companyId: item.companyId,
      contractId: item.contractId,
      tenantId: item.tenantId,
      propertyName: item.propertyName,
      tenantName: item.tenantName,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      amount,
      status,
      manual: item.manual,
      installmentNumber: item.installmentNumber,
      installmentTotal: item.installmentTotal,
      installmentGroupId: item.installmentGroupId,
      isDownPayment: item.isDownPayment,
      payments,
      tenant: item.tenant || null,
    };
  }

  // Cálculos de saldo de cada cobrança
  const getChargePaidAmount = useCallback((charge: Charge) => {
    const payments = charge.payments || [];
    const total = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    return total || (charge.status === "Paid" ? charge.amount : 0);
  }, []);

  const getChargeRemainingAmount = useCallback((charge: Charge) => {
    if (charge.status === "Paid" && (!charge.payments || charge.payments.length === 0)) {
      return 0;
    }
    const payments = charge.payments || [];
    const settled = payments.reduce(
      (sum, p) => sum + p.amountPaid + p.discount - p.interest,
      0
    );
    return Math.max(0, charge.amount - settled);
  }, []);

  // Carregar dados
  const loadData = useCallback(async (currentCompanyId: string) => {
    try {
      setErrorMessage("");
      const [apiCharges, apiPeople, apiProperties, apiContracts] = await Promise.all([
        getReceivableAccounts(currentCompanyId),
        getPeople(currentCompanyId),
        getProperties(currentCompanyId),
        getContracts(currentCompanyId),
      ]);

      setCharges(apiCharges.map(mapApiCharge));
      setTenants(
        apiPeople.map((p) => ({
          id: p.id,
          name: p.name,
          document: p.document,
          phone: p.phone,
          email: p.email,
        }))
      );
      setProperties(
        apiProperties.map((prop) => ({
          id: prop.id,
          title: prop.title,
          code: prop.code,
        }))
      );
      setContracts(
        apiContracts.map((c) => ({
          id: c.id,
          propertyId: c.propertyId,
          propertyName: c.propertyName || undefined,
          tenantId: c.tenantId,
          tenantName: c.tenantName || undefined,
          startDate: c.startDate,
          endDate: c.endDate,
          rentValue: Number(c.rentValue || 0),
          status: c.status,
        }))
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao carregar contas a receber."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    loadData(companyId);
  }, [companyId, loadData]);

  // Suporte a abertura automática via contrato (?fromContract=1&contractId=...)
  useEffect(() => {
    if (typeof window === "undefined" || !companyId || isLoading) return;

    const queryParams = new URLSearchParams(window.location.search);
    const cameFromContract = queryParams.get("fromContract") === "1";
    const contractIdFromQuery = queryParams.get("contractId");
    const filterContractFromUrl = queryParams.get("filterContractId");

    if (filterContractFromUrl) {
      setFilterContractId(filterContractFromUrl);
      setStatusFilter("Pending");
      setPeriodShortcut("All");
      setStartDate("");
      setEndDate("");
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (cameFromContract && contractIdFromQuery) {
      // Ajusta filtros para que a cobrança criada fique visível
      setStatusFilter("All");
      setPeriodShortcut("All");
      setStartDate("");
      setEndDate("");
      setFlowContractId(contractIdFromQuery);

      const contractChargeData = getCompanyStorageItem(
        companyId,
        "contrx_receivable_from_contract",
        "contrx_receivable_from_contract"
      );

      if (contractChargeData) {
        try {
          const parsed = JSON.parse(contractChargeData);
          removeCompanyStorageItem(companyId, "contrx_receivable_from_contract");
          setContractPayload(parsed);
          setSelectedCharge(null);
          setIsFormModalOpen(true);
        } catch {
          removeCompanyStorageItem(companyId, "contrx_receivable_from_contract");
        }
      } else {
        const matchedContract = contracts.find((c) => String(c.id) === String(contractIdFromQuery));
        if (matchedContract) {
          const monthly = Number(matchedContract.rentValue || 0);
          setContractPayload({
            contractId: String(matchedContract.id),
            tenantId: String(matchedContract.tenantId || ""),
            tenantName: matchedContract.tenantName || "",
            propertyId: String(matchedContract.propertyId || ""),
            propertyName: matchedContract.propertyName || "",
            amount: monthly,
            monthlyAmount: monthly,
            totalAmount: monthly,
            issueDate: matchedContract.startDate,
            dueDate: matchedContract.startDate,
            endDate: matchedContract.endDate,
            installmentQuantity: 1,
          });
          setSelectedCharge(null);
          setIsFormModalOpen(true);
        }
      }

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [companyId, isLoading, contracts]);

  // Alteração de atalho de período
  function handlePeriodShortcutChange(nextShortcut: PeriodShortcut) {
    setPeriodShortcut(nextShortcut);
    const now = new Date();

    if (nextShortcut === "CurrentMonth") {
      setStartDate(getStartOfCurrentMonth());
      setEndDate(getEndOfCurrentMonth());
    } else if (nextShortcut === "CurrentQuarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      setStartDate(new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), qMonth + 3, 0).toISOString().slice(0, 10));
    } else if (nextShortcut === "CurrentYear") {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10));
    } else if (nextShortcut === "All") {
      setStartDate("");
      setEndDate("");
    }
  }

  function handleResetFilters() {
    setSearch("");
    setStatusFilter("Pending");
    setSelectedTenantId("all");
    setSelectedPropertyId("all");
    handlePeriodShortcutChange("All");
    setSelectedIds([]);
  }

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "Pending" ||
    selectedTenantId !== "all" ||
    selectedPropertyId !== "all" ||
    periodShortcut !== "CurrentMonth";

  // Filtragem de cobranças
  const filteredCharges = useMemo(() => {
    return charges.filter((charge) => {
      if (filterContractId && String(charge.contractId || "") !== String(filterContractId)) {
        return false;
      }

      if (statusFilter !== "All" && charge.status !== statusFilter) {
        return false;
      }

      if (selectedTenantId !== "all" && charge.tenantId !== selectedTenantId) {
        return false;
      }

      if (
        selectedPropertyId !== "all" &&
        !charge.propertyName.toLowerCase().includes(selectedPropertyId.toLowerCase())
      ) {
        return false;
      }

      if (!isDateInsideRange(charge.dueDate, startDate, endDate)) {
        return false;
      }

      if (search.trim()) {
        const query = normalizeSearchText(search);
        const tenant = normalizeSearchText(charge.tenantName);
        const prop = normalizeSearchText(charge.propertyName);

        const matches = tenant.includes(query) || prop.includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [charges, statusFilter, selectedTenantId, selectedPropertyId, startDate, endDate, search, filterContractId]);

  const selectedChargesList = useMemo(() => {
    return charges.filter((c) => selectedIds.includes(c.id));
  }, [charges, selectedIds]);

  const shareModalTenantPhone = useMemo(() => {
    if (!shareModalCharge) return "";
    if (shareModalCharge.tenant?.phone) return shareModalCharge.tenant.phone;

    const foundTenant =
      (shareModalCharge.tenantId &&
        tenants.find((t) => t.id === shareModalCharge.tenantId)) ||
      tenants.find(
        (t) =>
          t.name.trim().toLowerCase() ===
          shareModalCharge.tenantName.trim().toLowerCase()
      );

    return foundTenant?.phone || "";
  }, [shareModalCharge, tenants]);

  // Seleção em lote
  function handleToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleToggleSelectAll() {
    if (selectedIds.length === filteredCharges.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCharges.map((c) => c.id));
    }
  }

  // Ações de Modais
  function handleOpenPayment(charge: Charge) {
    setSelectedCharge(charge);
    setIsPaymentModalOpen(true);
  }

  function handleOpenEdit(charge: Charge) {
    setSelectedCharge(charge);
    setIsFormModalOpen(true);
  }

  function handleOpenCreate() {
    setSelectedCharge(null);
    setIsFormModalOpen(true);
  }

  function handleOpenDelete(charge: Charge) {
    setSelectedCharge(charge);
    setDeleteModalMode("delete");
    setIsDeleteModalOpen(true);
  }

  function handleOpenReversal(charge: Charge) {
    setSelectedCharge(charge);
    setDeleteModalMode("reversal");
    setIsDeleteModalOpen(true);
  }

  function handleViewPayments(charge: Charge) {
    setSelectedCharge(charge);
    setIsHistoryModalOpen(true);
  }

  // Operações de API
  async function handleConfirmPayment(data: {
    amountPaid: number;
    interest: number;
    discount: number;
    method: PaymentMethod;
    paidAt: string;
    note?: string;
    bankAccountId?: string | null;
    paymentItems?: Array<{
      method: PaymentMethod;
      amount: number;
    }>;
  }) {
    if (!selectedCharge || !companyId) return;

    const chargeToPrint = { ...selectedCharge };

    const apiPaymentItems = data.paymentItems?.map((item) => ({
      method: mapUiPaymentMethodToApi(item.method),
      amount: item.amount,
    }));

    await receiveAccount(selectedCharge.id, {
      amountPaid: data.amountPaid,
      interest: data.interest,
      discount: data.discount,
      method: mapUiPaymentMethodToApi(data.method),
      paidAt: data.paidAt,
      note: data.note,
      bankAccountId: data.bankAccountId,
      paymentItems:
        apiPaymentItems && apiPaymentItems.length > 0 ? apiPaymentItems : undefined,
    });

    await loadData(companyId);

    const paymentRecord: ChargePayment = {
      id: `pay_${Date.now()}`,
      paidAt: data.paidAt,
      method: data.method,
      amountPaid: data.amountPaid,
      interest: data.interest,
      discount: data.discount,
      note: data.note || null,
      paymentItems: data.paymentItems || null,
    };

    const printableCharge: Charge = {
      ...chargeToPrint,
      status: "Paid",
      payments: [paymentRecord],
    };

    // Se estiver no fluxo de contrato, atualiza o status da parcela paga no carnê
    if (pendingContractCarnetFlow) {
      setPendingContractCarnetFlow((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          charges: prev.charges.map((c) =>
            c.id === chargeToPrint.id
              ? {
                  ...c,
                  status: "Paid" as const,
                  payments: [paymentRecord],
                }
              : c
          ),
        };
      });
    } else {
      // Abre o comprovante de pagamento diretamente para impressão
      const companySettings = getCachedCompanySettings() || {};
      generatePaymentReceipt({
        charge: printableCharge,
        paymentRecord,
        companySettings,
        getPaymentMethodLabel,
        setPaymentFormError: (msg) => console.warn(msg),
      });

      // Exibe modal de confirmação do recibo com botão de reimpressão garantido
      setPaymentReceiptSuccess({
        charge: printableCharge,
        paymentRecord,
      });
    }
  }

  async function handleConfirmBatchPayment(data: {
    method: PaymentMethod;
    paidAt: string;
    bankAccountId?: string | null;
  }) {
    if (!companyId || selectedIds.length === 0) return;

    const chargesToReceive = charges.filter((c) => selectedIds.includes(c.id));

    const payload = selectedIds.map((id) => {
      const ch = charges.find((c) => c.id === id);
      const rem = ch ? getChargeRemainingAmount(ch) : 0;
      return {
        chargeId: id,
        amountPaid: rem,
        method: mapUiPaymentMethodToApi(data.method),
        paidAt: data.paidAt,
        bankAccountId: data.bankAccountId,
      };
    });

    await receiveAccountsBatch(payload);
    setSelectedIds([]);
    await loadData(companyId);

    const companySettings = getCachedCompanySettings() || {};
    const receiptItems = chargesToReceive.map((ch) => {
      const paymentRecord: ChargePayment = {
        id: `pay_${Date.now()}_${ch.id}`,
        paidAt: data.paidAt,
        method: data.method,
        amountPaid: getChargeRemainingAmount(ch),
        interest: 0,
        discount: 0,
        note: null,
        paymentItems: null,
      };
      return {
        charge: {
          ...ch,
          status: "Paid" as const,
        },
        paymentRecord,
      };
    });

    if (receiptItems.length > 0) {
      generatePaymentReceiptBatch({
        receiptItems,
        companySettings,
        getPaymentMethodLabel,
        setPaymentFormError: (msg) => console.warn(msg),
      });

      setBatchReceiptSuccess({ items: receiptItems });
    }
  }

  async function handleSaveCharge(payload: {
    tenantId?: string | null;
    property: string;
    tenant: string;
    contractId?: string | null;
    amount: number;
    issueDate?: string | null;
    dueDate: string;
    launchType: ChargeLaunchType;
    installmentsCount?: number;
    downPaymentAmount?: number;
    installments?: Array<{
      installmentNumber?: number;
      installmentTotal?: number;
      amount: number;
      dueDate: string;
      isDownPayment?: boolean;
    }>;
  }) {
    if (!companyId) return;

    const createdCharges: Charge[] = [];

    if (selectedCharge) {
      await updateReceivableAccount(selectedCharge.id, {
        tenantId: payload.tenantId,
        tenant: payload.tenant,
        property: payload.property,
        contractId: payload.contractId,
        amount: payload.amount,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
      });
    } else if (payload.installments && payload.installments.length > 0) {
      // Salva parcelas customizadas e editadas individualmente pelo usuário no grid
      const groupId = `grp_${Date.now()}`;
      for (const inst of payload.installments) {
        const created = await createReceivableAccount({
          tenantId: payload.tenantId,
          tenant: payload.tenant,
          property: payload.property,
          contractId: payload.contractId,
          amount: inst.amount,
          issueDate: payload.issueDate,
          dueDate: inst.dueDate,
          installmentNumber: inst.installmentNumber,
          installmentTotal: inst.installmentTotal,
          installmentGroupId: groupId,
          isDownPayment: inst.isDownPayment,
        });
        if (created) {
          createdCharges.push(mapApiCharge(created));
        }
      }
    } else {
      if (payload.launchType === "single") {
        const created = await createReceivableAccount({
          tenantId: payload.tenantId,
          tenant: payload.tenant,
          property: payload.property,
          contractId: payload.contractId,
          amount: payload.amount,
          issueDate: payload.issueDate,
          dueDate: payload.dueDate,
        });
        if (created) {
          createdCharges.push(mapApiCharge(created));
        }
      } else if (payload.launchType === "installments") {
        const count = payload.installmentsCount || 2;
        const groupId = `grp_${Date.now()}`;
        const installmentAmount = Number((payload.amount / count).toFixed(2));
        const [yStr, mStr, dStr] = payload.dueDate.split("-");
        let curYear = Number(yStr);
        let curMonth = Number(mStr);
        const curDay = Number(dStr);

        for (let i = 1; i <= count; i++) {
          const installmentDate = new Date(curYear, curMonth - 1, curDay)
            .toISOString()
            .slice(0, 10);

          const created = await createReceivableAccount({
            tenantId: payload.tenantId,
            tenant: payload.tenant,
            property: payload.property,
            contractId: payload.contractId,
            amount: installmentAmount,
            issueDate: payload.issueDate,
            dueDate: installmentDate,
            installmentNumber: i,
            installmentTotal: count,
            installmentGroupId: groupId,
          });
          if (created) {
            createdCharges.push(mapApiCharge(created));
          }

          curMonth += 1;
          if (curMonth > 12) {
            curMonth = 1;
            curYear += 1;
          }
        }
      } else if (payload.launchType === "downPaymentPlusInstallments") {
        const downPayment = payload.downPaymentAmount || 0;
        const remainingBalance = payload.amount - downPayment;
        const count = payload.installmentsCount || 2;
        const groupId = `grp_${Date.now()}`;

        // Cria o sinal
        const createdDp = await createReceivableAccount({
          tenantId: payload.tenantId,
          tenant: payload.tenant,
          property: payload.property,
          contractId: payload.contractId,
          amount: downPayment,
          issueDate: payload.issueDate,
          dueDate: payload.dueDate,
          installmentNumber: 1,
          installmentTotal: count + 1,
          isDownPayment: true,
          installmentGroupId: groupId,
        });
        if (createdDp) {
          createdCharges.push(mapApiCharge(createdDp));
        }

        // Cria as parcelas do saldo
        const installmentAmount = Number((remainingBalance / count).toFixed(2));
        const [yStr, mStr, dStr] = payload.dueDate.split("-");
        let curYear = Number(yStr);
        let curMonth = Number(mStr) + 1;
        const curDay = Number(dStr);

        for (let i = 1; i <= count; i++) {
          if (curMonth > 12) {
            curMonth = 1;
            curYear += 1;
          }
          const installmentDate = new Date(curYear, curMonth - 1, curDay)
            .toISOString()
            .slice(0, 10);

          const created = await createReceivableAccount({
            tenantId: payload.tenantId,
            tenant: payload.tenant,
            property: payload.property,
            contractId: payload.contractId,
            amount: installmentAmount,
            issueDate: payload.issueDate,
            dueDate: installmentDate,
            installmentNumber: i + 1,
            installmentTotal: count + 1,
            installmentGroupId: groupId,
          });
          if (created) {
            createdCharges.push(mapApiCharge(created));
          }

          curMonth += 1;
        }
      }
    }

    await loadData(companyId);

    // Se estiver no fluxo de contrato:
    const savedSessionFlowId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("contrx_active_contract_flow_id")
        : null;
    const activeContractId =
      flowContractId ||
      (payload.contractId ? String(payload.contractId) : null) ||
      savedSessionFlowId;

    if (activeContractId && createdCharges.length > 0) {
      setIsFormModalOpen(false);
      setFlowContractId(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("contrx_active_contract_flow_id", activeContractId);
      }

      // Localiza a parcela de entrada/sinal
      const downPaymentCharge = createdCharges.find((c) => c.isDownPayment);

      setPendingContractCarnetFlow({
        contractId: activeContractId,
        charges: createdCharges,
      });

      if (downPaymentCharge) {
        // Tendo entrada, abre imediatamente a janela de abatimento / recebimento da parcela de entrada!
        setSelectedCharge(downPaymentCharge);
        setIsPaymentModalOpen(true);
      }
    } else {
      setIsFormModalOpen(false);
      setSelectedCharge(null);
    }
  }

  async function handleConfirmDeleteOrReversal() {
    if (!selectedCharge || !companyId) return;

    if (deleteModalMode === "delete") {
      await deleteReceivableAccount(selectedCharge.id);
    } else {
      await reverseReceivedAccount(selectedCharge.id);
    }

    await loadData(companyId);
  }

  function handlePrintReceipt(charge: Charge) {
    const lastPayment = charge.payments && charge.payments.length > 0
      ? charge.payments[0]
      : null;

    if (!lastPayment) return;

    const companySettings = getCachedCompanySettings() || {};
    generatePaymentReceipt({
      charge,
      paymentRecord: {
        id: lastPayment.id,
        paidAt: lastPayment.paidAt,
        method: lastPayment.method,
        amountPaid: lastPayment.amountPaid,
        interest: lastPayment.interest,
        discount: lastPayment.discount,
        note: lastPayment.note || undefined,
        paymentItems: lastPayment.paymentItems || undefined,
      },
      companySettings,
      getPaymentMethodLabel,
      setPaymentFormError: (msg) => alert(msg),
    });
  }

  function handlePrintCarnet(charge: Charge) {
    const companySettings = getCachedCompanySettings() || {};
    const relatedCharges = charge.installmentGroupId
      ? charges.filter((c) => c.installmentGroupId === charge.installmentGroupId)
      : [charge];

    generatePaymentCarnet({
      charges: relatedCharges.map((c) => ({
        id: c.id,
        property: c.propertyName,
        tenant: c.tenantName,
        amount: c.amount,
        dueDate: c.dueDate,
        status: c.status,
        installmentNumber: c.installmentNumber || undefined,
        installmentTotal: c.installmentTotal || undefined,
      })),
      companySettings,
      setChargeFormError: (msg) => alert(msg),
    });
  }

  async function handleShareReport(charge: Charge) {
    try {
      const res = await shareReceivableReport({
        tenantId: charge.tenantId || undefined,
        startDate,
        endDate,
      });

      const url = `${window.location.origin}/relatorio-receber-compartilhado/${res.id}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Ignora caso permissão de clipboard seja bloqueada
      }

      setShareModalCharge(charge);
      setShareModalUrl(url);
      setShareModalExpiresAt((res as any)?.expiresAt);
      setIsShareModalOpen(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível gerar o link de cobrança compartilhado."
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-slate-500">
          Carregando contas a receber...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Contas a Receber
            </h1>
            <button
              type="button"
              onClick={() => {
                if (companyId) {
                  setIsRefreshing(true);
                  loadData(companyId);
                }
              }}
              disabled={isRefreshing}
              className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 dark:border-slate-800 dark:hover:text-slate-200"
              title="Recarregar cobranças"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`}
              />
            </button>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Acompanhe recebíveis de locações, carnês, baixas em lote e repasses no padrão Contrx.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nova Cobrança
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* KPIs Interativos no Topo (Padrão Bens/Ativos) */}
      <ReceivableKpis
        charges={charges}
        selectedFilter={statusFilter}
        onSelectFilter={setStatusFilter}
        getChargeRemainingAmount={getChargeRemainingAmount}
        getChargePaidAmount={getChargePaidAmount}
      />

      {/* Card de Busca e Filtros Rápidos (Container rounded-3xl) */}
      <ReceivableFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedTenantId={selectedTenantId}
        onTenantChange={setSelectedTenantId}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={setSelectedPropertyId}
        periodShortcut={periodShortcut}
        onPeriodShortcutChange={handlePeriodShortcutChange}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        tenants={tenants}
        properties={properties}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedIds.length}
        onOpenBatchReceipt={() => setIsBatchModalOpen(true)}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        onOpenPersonSelectModal={() => setIsPersonFilterModalOpen(true)}
      />

      {/* Banner de Filtragem de Parcelas por Contrato (para finalização / abatimento) */}
      {filterContractId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-black text-amber-950">
                Filtrando parcelas em aberto deste contrato para abatimento
              </p>
              <p className="text-[11px] text-amber-800/80 font-semibold mt-0.5">
                Realize o recebimento ou baixa das parcelas pendentes abaixo para liberar o encerramento do contrato.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterContractId(null);
              handleResetFilters();
            }}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-white border border-amber-300 px-3.5 py-2 text-xs font-black text-amber-900 hover:bg-amber-100 transition shadow-sm shrink-0"
          >
            Limpar filtro e ver todas as contas
          </button>
        </div>
      )}

      {/* Visualização de Tabela Desktop vs Cards Mobile */}
      {viewMode === "table" ? (
        <>
          <div className="hidden lg:block">
            <ReceivableTable
              charges={filteredCharges}
              tenants={tenants}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onOpenPaymentModal={handleOpenPayment}
              onOpenEditModal={handleOpenEdit}
              onOpenDeleteModal={handleOpenDelete}
              onOpenReversalModal={handleOpenReversal}
              onPrintReceipt={handlePrintReceipt}
              onPrintCarnet={handlePrintCarnet}
              onShareReport={handleShareReport}
              onViewPayments={handleViewPayments}
              getChargeRemainingAmount={getChargeRemainingAmount}
              getChargePaidAmount={getChargePaidAmount}
            />
          </div>
          <div className="block lg:hidden">
            <ReceivableMobileCards
              charges={filteredCharges}
              tenants={tenants}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onOpenPaymentModal={handleOpenPayment}
              onOpenEditModal={handleOpenEdit}
              onOpenDeleteModal={handleOpenDelete}
              onShareReport={handleShareReport}
              getChargeRemainingAmount={getChargeRemainingAmount}
              getChargePaidAmount={getChargePaidAmount}
            />
          </div>
        </>
      ) : (
        <ReceivableMobileCards
          charges={filteredCharges}
          tenants={tenants}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onOpenPaymentModal={handleOpenPayment}
          onOpenEditModal={handleOpenEdit}
          onOpenDeleteModal={handleOpenDelete}
          onShareReport={handleShareReport}
          getChargeRemainingAmount={getChargeRemainingAmount}
          getChargePaidAmount={getChargePaidAmount}
        />
      )}

      {/* Modais */}
      <ReceivablePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedCharge(null);
        }}
        charge={selectedCharge}
        remainingAmount={
          selectedCharge ? getChargeRemainingAmount(selectedCharge) : 0
        }
        onConfirmPayment={handleConfirmPayment}
      />

      <ReceivableBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedCharges={selectedChargesList}
        getChargeRemainingAmount={getChargeRemainingAmount}
        onConfirmBatch={handleConfirmBatchPayment}
      />

      <ReceivableFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedCharge(null);
          setContractPayload(null);
        }}
        editingCharge={selectedCharge}
        initialContractPayload={contractPayload}
        tenants={tenants}
        properties={properties}
        contracts={contracts}
        onSave={async (payload) => {
          await handleSaveCharge(payload);
          setContractPayload(null);
        }}
      />

      <ReceivableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCharge(null);
        }}
        charge={selectedCharge}
        mode={deleteModalMode}
        onConfirm={handleConfirmDeleteOrReversal}
      />

      <ReceivableHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedCharge(null);
        }}
        charge={selectedCharge}
      />

      <PersonSelectModal
        isOpen={isPersonFilterModalOpen}
        onClose={() => setIsPersonFilterModalOpen(false)}
        tenants={tenants}
        selectedTenantId={selectedTenantId}
        companyId={companyId}
        onSelectTenant={(t) => {
          setSelectedTenantId(t ? t.id : "all");
        }}
        onPersonCreated={(newPerson) => {
          setTenants((prev) => [newPerson, ...prev]);
        }}
      />

      <ReceivableShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareModalCharge(null);
          setShareModalUrl("");
        }}
        charge={shareModalCharge}
        shareUrl={shareModalUrl}
        expiresAt={shareModalExpiresAt}
        tenantPhone={shareModalTenantPhone}
        tenants={tenants}
      />

      {/* Modal de Impressão de Carnê do Fluxo de Contrato (Etapa 4 de 5) */}
      {pendingContractCarnetFlow && !isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Header com Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Printer className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 mb-1">
                    Etapa 4 de 5 · Carnê de Pagamento
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Parcelas geradas com sucesso!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetContractId = pendingContractCarnetFlow.contractId;
                  setPendingContractCarnetFlow(null);
                  window.location.href = `/agenda?fromContract=1&contractId=${encodeURIComponent(targetContractId)}`;
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo / Resumo */}
            <div className="py-5 space-y-4">
              {(() => {
                const paidDp = pendingContractCarnetFlow.charges.find(
                  (c) => c.isDownPayment && c.status === "Paid"
                );
                if (!paidDp) return null;
                return (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-bold text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✅</span>
                      <span>
                        Sinal de entrada ({formatCurrency(paidDp.amount)}) abatido com sucesso!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(paidDp)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 transition shadow-sm"
                    >
                      <FileText className="h-3 w-3" />
                      Recibo do Sinal
                    </button>
                  </div>
                );
              })()}

              {(() => {
                const isDownPaymentPaid = pendingContractCarnetFlow.charges.some(
                  (c) => c.isDownPayment && c.status === "Paid"
                );
                const remainingCharges = pendingContractCarnetFlow.charges.filter(
                  (c) => c.status !== "Paid" && !c.isDownPayment
                );

                return (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isDownPaymentPaid ? (
                      <>
                        Foram geradas <strong>{pendingContractCarnetFlow.charges.length} parcelas</strong> para este contrato.
                        O sinal de entrada já foi abatido, restando <strong>{remainingCharges.length} demais parcela(s)</strong> a receber.
                        Deseja imprimir o carnê com as parcelas restantes agora antes de prosseguir para o agendamento?
                      </>
                    ) : (
                      <>
                        Foram geradas <strong>{pendingContractCarnetFlow.charges.length} parcela(s)</strong> para este contrato.
                        Deseja imprimir o carnê de cobrança com os códigos Pix agora antes de prosseguir para o agendamento?
                      </>
                    )}
                  </p>
                );
              })()}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  🗓️ Próxima Etapa no Fluxo:
                </div>
                <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  Após imprimir ou avançar, abriremos automaticamente o formulário de <strong>Agendamento (Vencimento de Contrato)</strong> com as informações preenchidas para controle.
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {(() => {
                const isDownPaymentPaid = pendingContractCarnetFlow.charges.some(
                  (c) => c.isDownPayment && c.status === "Paid"
                );
                const remainingCharges = pendingContractCarnetFlow.charges.filter(
                  (c) => c.status !== "Paid" && !c.isDownPayment
                );
                const printableList =
                  isDownPaymentPaid && remainingCharges.length > 0
                    ? remainingCharges
                    : pendingContractCarnetFlow.charges;

                return (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetContractId = pendingContractCarnetFlow.contractId;
                        const companySettings = getCachedCompanySettings() || {};
                        
                        // Executa impressão do carnê com as demais parcelas restantes
                        await generatePaymentCarnet({
                          charges: printableList.map((c) => ({
                            id: c.id,
                            contractId: targetContractId,
                            property: c.propertyName,
                            tenant: c.tenantName,
                            amount: c.amount,
                            dueDate: c.dueDate,
                            status: c.status,
                            installmentNumber: c.installmentNumber || undefined,
                            installmentTotal: c.installmentTotal || undefined,
                            installmentGroupId: c.installmentGroupId || undefined,
                            isDownPayment: c.isDownPayment,
                          })),
                          companySettings,
                          setChargeFormError: (msg) => alert(msg),
                        });

                        // Avança para a Agenda
                        if (typeof window !== "undefined") {
                          sessionStorage.removeItem("contrx_active_contract_flow_id");
                        }
                        setPendingContractCarnetFlow(null);
                        window.location.href = `/agenda?fromContract=1&contractId=${encodeURIComponent(targetContractId)}`;
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
                    >
                      <Printer className="h-4 w-4" />
                      {isDownPaymentPaid && remainingCharges.length > 0
                        ? `Imprimir Carnê (${remainingCharges.length} demais parcelas) e Avançar`
                        : `Imprimir Carnê e Avançar`}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetContractId = pendingContractCarnetFlow.contractId;
                        if (typeof window !== "undefined") {
                          sessionStorage.removeItem("contrx_active_contract_flow_id");
                        }
                        setPendingContractCarnetFlow(null);
                        window.location.href = `/agenda?fromContract=1&contractId=${encodeURIComponent(targetContractId)}`;
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Pular Impressão e Avançar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação com Botão de Impressão de Recibo Individual */}
      {paymentReceiptSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Recebimento confirmado!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O pagamento foi registrado com sucesso.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentReceiptSuccess(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-5 space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Inquilino:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{paymentReceiptSuccess.charge.tenantName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Imóvel/Referência:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{paymentReceiptSuccess.charge.propertyName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Forma de pagamento:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {paymentReceiptSuccess.paymentRecord.paymentItems?.length
                      ? paymentReceiptSuccess.paymentRecord.paymentItems
                          .map((item) => `${getPaymentMethodLabel(item.method)} (${formatCurrency(item.amount)})`)
                          .join(", ")
                      : getPaymentMethodLabel(paymentReceiptSuccess.paymentRecord.method)}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Valor Recebido:</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(paymentReceiptSuccess.paymentRecord.amountPaid)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Caso a janela de impressão não tenha aberto automaticamente, clique em <strong>Imprimir Recibo</strong> abaixo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentReceiptSuccess(null)}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Concluir
              </button>
              <button
                type="button"
                onClick={() => {
                  const companySettings = getCachedCompanySettings() || {};
                  generatePaymentReceipt({
                    charge: paymentReceiptSuccess.charge,
                    paymentRecord: paymentReceiptSuccess.paymentRecord,
                    companySettings,
                    getPaymentMethodLabel,
                    setPaymentFormError: (msg) => alert(msg),
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
              >
                <Printer className="h-4 w-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação com Botão de Impressão de Recibos em Lote */}
      {batchReceiptSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Recebimento em lote confirmado!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {batchReceiptSuccess.items.length} contas recebidas com sucesso.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchReceiptSuccess(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-5 space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total de Contas:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{batchReceiptSuccess.items.length}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Valor Total Recebido:</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(batchReceiptSuccess.items.reduce((acc, it) => acc + it.paymentRecord.amountPaid, 0))}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Caso a janela de impressão não tenha aberto automaticamente, clique em <strong>Imprimir Recibos</strong> abaixo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBatchReceiptSuccess(null)}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Concluir
              </button>
              <button
                type="button"
                onClick={() => {
                  const companySettings = getCachedCompanySettings() || {};
                  generatePaymentReceiptBatch({
                    receiptItems: batchReceiptSuccess.items,
                    companySettings,
                    getPaymentMethodLabel,
                    setPaymentFormError: (msg) => alert(msg),
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
              >
                <Printer className="h-4 w-4" />
                Imprimir Recibos ({batchReceiptSuccess.items.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
