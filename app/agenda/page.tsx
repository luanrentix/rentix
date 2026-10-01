"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItems,
  updateScheduleItem,
} from "@/services/schedule.service";
import { getPeople } from "@/services/people.service";
import { getProperties } from "@/services/properties.service";
import { openWhatsAppMessage } from "@/services/whatsapp.service";
import { getCompanyStorageItem, removeCompanyStorageItem } from "@/services/company-storage";
import { CONTRACT_SCHEDULE_DRAFT_KEY } from "@/components/contracts/contract-types";
import {
  ASSET_MAINTENANCE_SCHEDULE_DRAFT_KEY,
  type AssetMaintenanceScheduleDraft,
  getAssetCategoryLabel,
} from "@/components/assets/asset-types";

import { useCalendarNavigation } from "./hooks/useCalendarNavigation";
import { useAgendaFilters } from "./hooks/useAgendaFilters";

import {
  addDaysToInputValue,
  createDateFromInputValue,
  formatDateToInputValue,
  getPriorityBadgeClass,
  getReadableDate,
  getShortDate,
  getStatusBadgeClass,
  getTypeAccentClass,
  getWeekRangeLabel,
  mapApiPersonToAgendaPerson,
  mapApiPropertyToAgendaProperty,
  mapApiScheduleItemToScheduleItem,
  monthNames,
  priorityLabels,
  reminderOptions,
  responsibleOptions,
  statusLabels,
  typeOptions,
  type ActionMenuPosition,
  type AgendaPerson,
  type AgendaProperty,
  type CalendarViewMode,
  type ScheduleFormData,
  type ScheduleItem,
  type ScheduleStatus,
  type ThemeMode,
} from "@/components/agenda/agenda.types";
import { readThemeSettingsFromStorage } from "@/services/theme-storage";

import { AgendaHeader } from "@/components/agenda/agenda-header";
import { AgendaKpis } from "@/components/agenda/agenda-kpis";
import { AgendaFiltersBar } from "@/components/agenda/agenda-filters-bar";
import { AgendaCalendarMonth } from "@/components/agenda/agenda-calendar-month";
import { AgendaCalendarWeek } from "@/components/agenda/agenda-calendar-week";
import { AgendaCalendarDay } from "@/components/agenda/agenda-calendar-day";
import { AgendaSidePanel } from "@/components/agenda/agenda-side-panel";
import { AgendaFormModal } from "@/components/agenda/agenda-form-modal";
import { AgendaActionMenu } from "@/components/agenda/agenda-action-menu";
import { AgendaCompleteModal } from "@/components/agenda/agenda-complete-modal";
import { AgendaDeleteModal } from "@/components/agenda/agenda-delete-modal";

function getInitialFormData(todayValue: string): ScheduleFormData {
  return {
    title: "",
    customerName: "",
    propertyName: "",
    date: todayValue,
    time: "08:00",
    type: "Vistoria",
    status: "scheduled",
    priority: "medium",
    responsibleName: "",
    reminder: "30 minutos antes",
    notes: "",
  };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [todayInputValue] = useState(() => formatDateToInputValue(new Date()));
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [people, setPeople] = useState<AgendaPerson[]>([]);
  const [properties, setProperties] = useState<AgendaProperty[]>([]);

  const {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    currentCalendarDate,
    calendarDays,
    weekDays,
    handlePreviousPeriod,
    handleNextPeriod,
    handleSelectDate,
    handleTodayClick,
    handleDateInputChange,
  } = useCalendarNavigation(todayInputValue);

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    responsibleFilter,
    setResponsibleFilter,
    priorityFilter,
    setPriorityFilter,
    filteredItems,
    selectedDateItems,
    weekItems,
    monthItems,
    nextSevenDaysItems,
    scheduledCount,
    completedCount,
    todayCount,
    highPriorityCount,
    overdueCount,
    activeFilterCount,
    calendarSubtitle,
    handleClearFilters,
  } = useAgendaFilters({
    scheduleItems,
    selectedDate,
    weekDays,
    currentCalendarDate,
    todayInputValue,
    viewMode: viewMode as CalendarViewMode,
    createDateFromInputValue,
    formatDateToInputValue,
    getWeekRangeLabel,
  });

  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(() =>
    getInitialFormData(todayInputValue),
  );
  const [formError, setFormError] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleItem | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [completeModalItem, setCompleteModalItem] = useState<ScheduleItem | null>(null);
  const [isContractFlow, setIsContractFlow] = useState(false);
  const [isMaintenanceFlow, setIsMaintenanceFlow] = useState(false);

  // Menus de contexto e ações
  const [actionMenuSchedule, setActionMenuSchedule] = useState<ScheduleItem | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dateValue: string;
  } | null>(null);

  // Tema
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return readThemeSettingsFromStorage().mode;
    }
    return "light";
  });
  useEffect(() => {
    function syncTheme() {
      const stored = readThemeSettingsFromStorage(companyId);
      setThemeMode(stored.mode);
    }

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("contrx-theme-change", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("contrx-theme-change", syncTheme);
    };
  }, [companyId]);

  const isBlackTheme = themeMode === "black" || themeMode === "graphite";
  const pageThemeClass = isBlackTheme ? "theme-black" : "theme-light";
  const cardClass = isBlackTheme
    ? "border-[#334155] bg-[#0f172a]"
    : "border-[#e2e8f0] bg-[#ffffff]";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";
  const secondaryButtonClass = isBlackTheme
    ? "inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-bold text-[#f8fafc] transition hover:border-[#475569] hover:bg-[#0f172a]"
    : "inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]";
  const dateInputClass = isBlackTheme
    ? "h-11 rounded-xl border border-[#334155] bg-[#020617] px-3 text-xs font-black text-[#f8fafc] transition focus:border-orange-500 focus:outline-none"
    : "h-11 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-black text-[#0f172a] shadow-sm transition focus:border-orange-500 focus:bg-[#ffffff] focus:outline-none";

  // Carregamento inicial de dados
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingSchedules(true);
    setLoadError("");

    try {
      const [apiItems, apiPeople, apiProperties] = await Promise.all([
        getScheduleItems(),
        getPeople(companyId).catch(() => []),
        getProperties(companyId).catch(() => []),
      ]);

      setScheduleItems(apiItems.map(mapApiScheduleItemToScheduleItem));
      setPeople(apiPeople.map(mapApiPersonToAgendaPerson));
      setProperties(apiProperties.map(mapApiPropertyToAgendaProperty));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Erro ao carregar dados da agenda.",
      );
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Suporte a abertura automática via fluxo de contrato (?fromContract=1&contractId=...) ou manutenção (?fromMaintenance=1&propertyId=...)
  useEffect(() => {
    if (typeof window === "undefined" || !companyId || isLoadingSchedules) return;

    const queryParams = new URLSearchParams(window.location.search);
    const cameFromContract = queryParams.get("fromContract") === "1";
    const contractIdFromQuery = queryParams.get("contractId");

    if (cameFromContract && contractIdFromQuery) {
      setIsContractFlow(true);

      const rawDraft = getCompanyStorageItem(
        companyId,
        CONTRACT_SCHEDULE_DRAFT_KEY,
        CONTRACT_SCHEDULE_DRAFT_KEY
      );

      let draftData: any = null;
      if (rawDraft) {
        try {
          draftData = JSON.parse(rawDraft);
        } catch {
          draftData = null;
        }
      }

      const propertyTitle = draftData?.propertyName || "";
      const tenantName = draftData?.tenantName || "";
      const isTemp = Boolean(draftData?.isTemporaryRental);
      const defaultTitle = `Vencimento de Contrato - ${propertyTitle || "Bem/Ativo"} (${tenantName || "Locatário"})`;

      const dueDate = draftData?.endDate
        ? draftData.endDate.slice(0, 10)
        : todayInputValue;
      const dueTime = draftData?.checkOutTime || "08:00";

      const formattedDueDate = draftData?.endDate
        ? draftData.endDate.slice(0, 10).split("-").reverse().join("/")
        : "";

      setEditingScheduleId(null);
      setFormData({
        title: defaultTitle,
        customerName: tenantName,
        propertyName: propertyTitle,
        personId: draftData?.tenantId || undefined,
        propertyId: draftData?.propertyId || undefined,
        date: dueDate,
        time: dueTime,
        type: "Contrato",
        status: "scheduled",
        priority: "high",
        responsibleName: user?.name || "Administrativo",
        reminder: "1 dia antes",
        notes: [
          `Lembrete de vencimento de contrato (${isTemp ? "Temporada" : "Locação Padrão"}).`,
          `Bem/Ativo: ${propertyTitle}`,
          `Locatário: ${tenantName}`,
          formattedDueDate ? `Vencimento em: ${formattedDueDate}` : "",
          draftData?.contractId ? `Contrato: ${draftData.contractId}` : "",
          draftData?.contractId ? `contract-due:${draftData.contractId}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });

      setFormError("");
      setIsScheduleModalOpen(true);

      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const cameFromMaintenance = queryParams.get("fromMaintenance") === "1";
    const propertyIdFromQuery = queryParams.get("propertyId");

    if (cameFromMaintenance && propertyIdFromQuery) {
      setIsMaintenanceFlow(true);

      const rawDraft = getCompanyStorageItem(
        companyId,
        ASSET_MAINTENANCE_SCHEDULE_DRAFT_KEY,
        ASSET_MAINTENANCE_SCHEDULE_DRAFT_KEY
      );

      let draftData: AssetMaintenanceScheduleDraft | null = null;
      if (rawDraft) {
        try {
          draftData = JSON.parse(rawDraft);
        } catch {
          draftData = null;
        }
      }

      const foundProperty = properties.find(
        (p) => String(p.id) === String(propertyIdFromQuery)
      );
      const propertyTitle =
        draftData?.propertyName || foundProperty?.name || "Bem / Ativo";
      const ownerName = draftData?.ownerName || "";
      const defaultTitle = `MANUTENÇÃO - ${propertyTitle}`;
      const dueDate = draftData?.defaultDate || todayInputValue;
      const dueTime = draftData?.defaultTime || "08:00";

      const categoryLabel = draftData?.assetCategory
        ? getAssetCategoryLabel(draftData.assetCategory as any)
        : "";
      const brandModel = [draftData?.brand, draftData?.model]
        .filter(Boolean)
        .join(" - ");
      const serialOrPlate = [
        draftData?.serialNumber ? `S/N: ${draftData.serialNumber}` : "",
        draftData?.licensePlate ? `Placa: ${draftData.licensePlate}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const notesLines = [
        `[AGENDAMENTO DE MANUTENÇÃO DE BEM / ATIVO]`,
        `Bem/Ativo: ${propertyTitle}`,
        draftData?.code || draftData?.patrimonyCode
          ? `Código/Patrimônio: ${draftData.code || draftData.patrimonyCode}`
          : "",
        categoryLabel ? `Categoria: ${categoryLabel}` : "",
        brandModel ? `Marca/Modelo: ${brandModel}` : "",
        serialOrPlate ? `Identificação: ${serialOrPlate}` : "",
        draftData?.address ? `Localização: ${draftData.address}` : "",
        ownerName ? `Proprietário: ${ownerName}` : "",
        draftData?.reason ? `Motivo / Detalhes: ${draftData.reason}` : "",
        draftData?.description ? `Ficha Técnica: ${draftData.description}` : "",
        propertyIdFromQuery ? `asset-maintenance:${propertyIdFromQuery}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      setEditingScheduleId(null);
      setFormData({
        title: defaultTitle,
        customerName: ownerName,
        propertyName: propertyTitle,
        personId: draftData?.ownerId || undefined,
        propertyId: propertyIdFromQuery,
        date: dueDate,
        time: dueTime,
        type: "Manutenção",
        status: "scheduled",
        priority: "high",
        responsibleName: "Manutenção",
        reminder: "1 dia antes",
        notes: notesLines,
      });

      setFormError("");
      setIsScheduleModalOpen(true);

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [companyId, isLoadingSchedules, properties, todayInputValue, user?.name]);

  // Opções únicas para filtros
  const uniqueTypeOptions = useMemo(() => {
    const fromItems = scheduleItems.map((item) => item.type).filter(Boolean);
    return Array.from(new Set([...typeOptions, ...fromItems])).sort();
  }, [scheduleItems]);

  const uniqueResponsibleOptions = useMemo(() => {
    const fromItems = scheduleItems
      .map((item) => item.responsibleName)
      .filter(Boolean);
    return Array.from(new Set([...responsibleOptions, ...fromItems])).sort();
  }, [scheduleItems]);

  // Modais de Criação e Edição
  const handleOpenCreateModal = useCallback(
    (targetDate = selectedDate) => {
      setEditingScheduleId(null);
      setFormData({
        ...getInitialFormData(todayInputValue),
        date: targetDate,
      });
      setFormError("");
      setIsScheduleModalOpen(true);
    },
    [selectedDate, todayInputValue],
  );

  const handleOpenEditModal = useCallback((item: ScheduleItem) => {
    setEditingScheduleId(item.id);
    setFormData({
      title: item.title,
      personId: item.personId || undefined,
      propertyId: item.propertyId || undefined,
      customerName: item.customerName,
      propertyName: item.propertyName,
      date: item.date,
      time: item.time,
      type: item.type,
      status: item.status,
      priority: item.priority,
      responsibleName: item.responsibleName,
      reminder: item.reminder,
      notes: item.notes || "",
    });
    setFormError("");
    setIsScheduleModalOpen(true);
  }, []);

  const handleSaveSchedule = async () => {
    if (!formData.title.trim()) {
      setFormError("Informe o título do agendamento.");
      return;
    }
    if (!formData.date) {
      setFormError("Informe a data.");
      return;
    }
    if (!formData.time) {
      setFormError("Informe o horário.");
      return;
    }
    if (!formData.responsibleName.trim()) {
      setFormError("Selecione o responsável.");
      return;
    }

    setIsSavingSchedule(true);
    setFormError("");

    try {
      if (editingScheduleId) {
        const updated = await updateScheduleItem(editingScheduleId, formData);
        setScheduleItems((prev) =>
          prev.map((item) =>
            item.id === editingScheduleId
              ? mapApiScheduleItemToScheduleItem(updated)
              : item,
          ),
        );
      } else {
        const created = await createScheduleItem(formData);
        setScheduleItems((prev) => [
          ...prev,
          mapApiScheduleItemToScheduleItem(created),
        ]);
      }
      setIsScheduleModalOpen(false);

      if (isContractFlow) {
        if (companyId) {
          removeCompanyStorageItem(companyId, CONTRACT_SCHEDULE_DRAFT_KEY);
        }
        window.location.href = "/contratos?flowCompleted=1";
        return;
      }

      if (isMaintenanceFlow) {
        if (companyId) {
          removeCompanyStorageItem(companyId, ASSET_MAINTENANCE_SCHEDULE_DRAFT_KEY);
        }
        window.location.href = "/imoveis?maintenanceScheduled=1";
        return;
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Erro ao salvar compromisso.",
      );
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleCloseScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    setEditingScheduleId(null);
    if (isContractFlow) {
      if (companyId) {
        removeCompanyStorageItem(companyId, CONTRACT_SCHEDULE_DRAFT_KEY);
      }
      window.location.href = "/contratos?flowCompleted=1";
      return;
    }
    if (isMaintenanceFlow) {
      if (companyId) {
        removeCompanyStorageItem(companyId, ASSET_MAINTENANCE_SCHEDULE_DRAFT_KEY);
      }
      window.location.href = "/imoveis";
      return;
    }
  }, [isContractFlow, isMaintenanceFlow, companyId]);

  // Exclusão
  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    setDeletingScheduleId(scheduleToDelete.id);
    setOperationError("");

    try {
      await deleteScheduleItem(scheduleToDelete.id);
      setScheduleItems((prev) =>
        prev.filter((item) => item.id !== scheduleToDelete.id),
      );
      setScheduleToDelete(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Erro ao excluir agendamento.",
      );
    } finally {
      setDeletingScheduleId(null);
    }
  };

  // Alteração Rápida de Status
  const handleQuickStatusChange = async (
    item: ScheduleItem,
    status: ScheduleStatus,
  ) => {
    setOperationError("");

    try {
      const updated = await updateScheduleItem(item.id, { status });
      setScheduleItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? mapApiScheduleItemToScheduleItem(updated) : i,
        ),
      );
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Erro ao atualizar status.",
      );
    }
  };

  // Conclusão com Nota de Desfecho
  const handleConfirmCompleteWithNote = async (
    item: ScheduleItem,
    outcomeNote: string,
  ) => {
    let nextNotes = item.notes || "";
    if (outcomeNote) {
      const timestamp = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const noteEntry = `[Concluído em ${timestamp}]: ${outcomeNote}`;
      nextNotes = nextNotes ? `${nextNotes}\n\n${noteEntry}` : noteEntry;
    }

    const updated = await updateScheduleItem(item.id, {
      status: "completed",
      notes: nextNotes,
    });
    setScheduleItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? mapApiScheduleItemToScheduleItem(updated) : i,
      ),
    );
  };

  // Duplicar agendamento
  const handleDuplicateSchedule = async (item: ScheduleItem) => {
    setOperationError("");

    try {
      const created = await createScheduleItem({
        title: `${item.title} (Cópia)`,
        personId: item.personId,
        propertyId: item.propertyId,
        customerName: item.customerName,
        propertyName: item.propertyName,
        date: addDaysToInputValue(item.date, 1),
        time: item.time,
        type: item.type,
        status: "scheduled",
        priority: item.priority,
        responsibleName: item.responsibleName,
        reminder: item.reminder,
        notes: item.notes,
      });

      setScheduleItems((prev) => [
        ...prev,
        mapApiScheduleItemToScheduleItem(created),
      ]);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Erro ao duplicar agendamento.",
      );
    }
  };

  // Disparo de mensagem no WhatsApp
  const handleSendWhatsApp = (item: ScheduleItem) => {
    const person = people.find((p) => p.id === item.personId);
    const phone = item.person?.phone || person?.phone;

    if (!phone) {
      window.alert(
        `Nenhum telefone cadastrado para ${item.customerName || "este cliente"}.\nAtualize o cadastro em Pessoas para enviar mensagens.`,
      );
      return;
    }

    const message = `Olá ${item.customerName || ""}, confirmamos o seu agendamento de *${item.title}* para o dia *${getReadableDate(item.date)}* às *${item.time}*${item.propertyName ? ` no endereço/imóvel *${item.propertyName}*` : ""}. Em caso de imprevisto ou necessidade de alteração, favor nos avisar.`;
    openWhatsAppMessage({ phone, message });
  };

  // Renderizador do Card do Agendamento
  const renderScheduleCard = (item: ScheduleItem, compact = false) => {
    const isOverdue = item.date < todayInputValue && item.status === "scheduled";

    return (
      <article
        key={item.id}
        className={`${compact ? "rounded-xl p-3" : "rounded-2xl p-4"} border border-l-4 shadow-sm transition hover:shadow-md ${getTypeAccentClass(
          item.type,
          isBlackTheme,
        )} ${isBlackTheme ? "border-[#334155]" : "border-[#e2e8f0]"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`${compact ? "text-xs" : "text-sm"} font-black text-orange-600`}>
              {item.time} · {getShortDate(item.date)}
            </p>
            <h3
              className={`mt-1 break-words ${compact ? "text-sm" : "text-base"} font-black ${strongTextClass}`}
            >
              {item.title}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex flex-col items-end gap-1">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getStatusBadgeClass(
                  item.status,
                  isBlackTheme,
                )}`}
              >
                {statusLabels[item.status]}
              </span>
              {isOverdue && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black text-white">
                  Atrasado
                </span>
              )}
            </div>

            {/* Ação rápida WhatsApp */}
            <button
              type="button"
              onClick={() => handleSendWhatsApp(item)}
              title="Confirmar via WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>

            {/* Menu 3 pontinhos */}
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActionMenuPosition({
                  top: Math.min(rect.bottom + 4, window.innerHeight - 280),
                  left: Math.min(rect.left, window.innerWidth - 250),
                });
                setActionMenuSchedule(item);
              }}
              aria-label="Opções"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition ${
                isBlackTheme
                  ? "border-[#334155] bg-[#020617] text-[#cbd5e1] hover:bg-[#1e293b]"
                  : "border-[#dbe4ef] bg-[#ffffff] text-[#475569] hover:bg-[#f8fafc]"
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={`mt-2.5 grid gap-1.5 ${compact ? "text-xs" : "text-sm"} font-semibold ${
            isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"
          } ${compact ? "" : "sm:grid-cols-2"}`}
        >
          <p className="flex min-w-0 items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-orange-600" />
            <span className="truncate">{item.customerName || "Sem cliente vinculado"}</span>
          </p>
          <p className="min-w-0 truncate">
            Bem/Ativo: {item.propertyName || "Sem bem/ativo vinculado"}
          </p>
          <p className="min-w-0 truncate">Responsável: {item.responsibleName}</p>
          <p className="flex min-w-0 items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-orange-600" />
            <span className="truncate">{item.reminder}</span>
          </p>
        </div>

        {!compact && item.notes && (
          <p className={`mt-2.5 text-xs font-medium leading-relaxed whitespace-pre-line ${mutedTextClass}`}>
            {item.notes}
          </p>
        )}

        <div className={`${compact ? "mt-2.5" : "mt-3.5"} flex flex-wrap gap-1.5`}>
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${
              isBlackTheme
                ? "bg-[#1e293b] text-[#cbd5e1]"
                : "bg-[#ffffff] text-[#475569] shadow-sm ring-1 ring-[#e2e8f0]"
            }`}
          >
            {item.type}
          </span>
          <span
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-black ${getPriorityBadgeClass(
              item.priority,
              isBlackTheme,
            )}`}
          >
            Prioridade {priorityLabels[item.priority]}
          </span>
        </div>
      </article>
    );
  };

  return (
    <div className={`space-y-6 pb-12 ${pageThemeClass}`}>
      <AgendaHeader
        onTodayClick={handleTodayClick}
        onNewScheduleClick={() => handleOpenCreateModal()}
        isBlackTheme={isBlackTheme}
      />

      <AgendaKpis
        todayCount={todayCount}
        scheduledCount={scheduledCount}
        completedCount={completedCount}
        highPriorityCount={highPriorityCount}
        overdueCount={overdueCount}
        isBlackTheme={isBlackTheme}
      />

      {(loadError || operationError) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            isBlackTheme
              ? "border-red-900/60 bg-red-950/30 text-red-300"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {loadError || operationError}
        </div>
      )}

      <AgendaFiltersBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        responsibleFilter={responsibleFilter}
        setResponsibleFilter={setResponsibleFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        uniqueTypeOptions={uniqueTypeOptions}
        uniqueResponsibleOptions={uniqueResponsibleOptions}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredItems.length}
        onClearFilters={handleClearFilters}
        isBlackTheme={isBlackTheme}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        <div
          className={`md:col-span-2 rounded-2xl border p-4 shadow-sm md:p-5 w-full ${cardClass}`}
        >
          <div
            className={`flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between ${
              isBlackTheme ? "border-[#334155]" : "border-[#e2e8f0]"
            }`}
          >
            <div>
              <h2 className={`text-lg font-black ${strongTextClass}`}>
                {viewMode === "month"
                  ? `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`
                  : viewMode === "week"
                    ? `Semana ${getWeekRangeLabel(weekDays)}`
                    : `Dia ${getReadableDate(selectedDate)}`}
              </h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                {calendarSubtitle} no filtro atual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateInputChange(event.target.value)}
                className={dateInputClass}
              />
              <button
                type="button"
                onClick={handlePreviousPeriod}
                className={`flex h-11 w-11 items-center justify-center ${secondaryButtonClass}`}
                aria-label="Período anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextPeriod}
                className={`flex h-11 w-11 items-center justify-center ${secondaryButtonClass}`}
                aria-label="Próximo período"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div
                className={
                  isBlackTheme
                    ? "flex rounded-xl bg-[#020617] p-1 ring-1 ring-[#334155]"
                    : "flex rounded-xl bg-[#f1f5f9] p-1 ring-1 ring-[#e2e8f0]"
                }
              >
                {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                      viewMode === mode
                        ? "bg-orange-500 text-white shadow-sm"
                        : isBlackTheme
                          ? "text-[#cbd5e1] hover:bg-[#1e293b]"
                          : "text-[#475569] hover:bg-[#ffffff]"
                    }`}
                  >
                    {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoadingSchedules ? (
            <div
              className={`mt-5 flex items-center justify-center rounded-2xl border border-dashed p-10 text-sm font-bold ${
                isBlackTheme
                  ? "border-[#334155] text-[#94a3b8]"
                  : "border-[#e2e8f0] text-[#64748b]"
              }`}
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-500" />
              Carregando agenda...
            </div>
          ) : (
            <>
              {viewMode === "month" && (
                <AgendaCalendarMonth
                  calendarDays={calendarDays}
                  currentCalendarDate={currentCalendarDate}
                  selectedDate={selectedDate}
                  todayInputValue={todayInputValue}
                  filteredItems={filteredItems}
                  onSelectDate={handleSelectDate}
                  onContextMenu={(e, dateValue) => {
                    e.preventDefault();
                    setSelectedDate(dateValue);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      dateValue,
                    });
                  }}
                  isBlackTheme={isBlackTheme}
                />
              )}

              {viewMode === "week" && (
                <AgendaCalendarWeek
                  weekDays={weekDays}
                  selectedDate={selectedDate}
                  todayInputValue={todayInputValue}
                  weekItems={weekItems}
                  onSelectDate={setSelectedDate}
                  onOpenEdit={handleOpenEditModal}
                  isBlackTheme={isBlackTheme}
                />
              )}

              {viewMode === "day" && (
                <AgendaCalendarDay
                  selectedDate={selectedDate}
                  selectedDateItems={selectedDateItems}
                  renderScheduleCard={(item) => renderScheduleCard(item)}
                  onCreateSchedule={() => handleOpenCreateModal(selectedDate)}
                  isBlackTheme={isBlackTheme}
                />
              )}
            </>
          )}
        </div>

        <AgendaSidePanel
          selectedDate={selectedDate}
          selectedDateItems={selectedDateItems}
          nextSevenDaysItems={nextSevenDaysItems}
          monthItems={monthItems}
          viewMode={viewMode as CalendarViewMode}
          onCreateSchedule={handleOpenCreateModal}
          onOpenEdit={handleOpenEditModal}
          onSelectDate={setSelectedDate}
          renderScheduleCard={renderScheduleCard}
          uniqueTypeOptions={uniqueTypeOptions}
          isBlackTheme={isBlackTheme}
        />
      </section>

      {/* Modal de Formulário (Criação/Edição) com Verificação de Conflitos */}
      <AgendaFormModal
        isOpen={isScheduleModalOpen}
        editingScheduleId={editingScheduleId}
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        setFormError={setFormError}
        isSaving={isSavingSchedule}
        people={people}
        properties={properties}
        uniqueTypeOptions={uniqueTypeOptions}
        uniqueResponsibleOptions={uniqueResponsibleOptions}
        reminderOptions={reminderOptions}
        existingSchedules={scheduleItems}
        onClose={handleCloseScheduleModal}
        onSave={handleSaveSchedule}
        isBlackTheme={isBlackTheme}
        isContractFlow={isContractFlow}
        isMaintenanceFlow={isMaintenanceFlow}
      />

      {/* Menu Flutuante de Ações Rápidas */}
      {actionMenuSchedule && actionMenuPosition && (
        <AgendaActionMenu
          item={actionMenuSchedule}
          position={actionMenuPosition}
          onClose={() => setActionMenuSchedule(null)}
          onOpenCompleteModal={(item) => setCompleteModalItem(item)}
          onQuickStatusChange={handleQuickStatusChange}
          onDuplicate={handleDuplicateSchedule}
          onEdit={handleOpenEditModal}
          onDelete={(item) => setScheduleToDelete(item)}
          onSendWhatsApp={handleSendWhatsApp}
          isBlackTheme={isBlackTheme}
        />
      )}

      {/* Modal de Conclusão com Desfecho/Notas */}
      <AgendaCompleteModal
        isOpen={Boolean(completeModalItem)}
        item={completeModalItem}
        onClose={() => setCompleteModalItem(null)}
        onConfirmComplete={handleConfirmCompleteWithNote}
        isBlackTheme={isBlackTheme}
      />

      {/* Modal de Exclusão */}
      <AgendaDeleteModal
        item={scheduleToDelete}
        isDeleting={Boolean(deletingScheduleId)}
        operationError={operationError}
        onClose={() => setScheduleToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
        isBlackTheme={isBlackTheme}
      />

      {/* Menu Contextual ao Clicar com Botão Direito no Calendário */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className={`fixed z-50 w-60 overflow-hidden rounded-2xl border p-1.5 shadow-2xl animate-fade-in ${
              isBlackTheme
                ? "border-[#334155] bg-[#0d1b2e] text-[#f8fafc]"
                : "border-orange-100 bg-white text-slate-900 shadow-orange-100/50"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                const targetDate = contextMenu.dateValue;
                setContextMenu(null);
                handleOpenCreateModal(targetDate);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-black text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition"
            >
              <Plus className="h-4 w-4 shrink-0 text-orange-500" />
              <span>Novo agendamento nesta data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
