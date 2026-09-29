"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPeople } from "@/services/people.service";
import {
  clearMinimizedModalState,
  getMinimizedModalState,
  setMinimizedModalState,
  CLOSE_MINIMIZED_MODAL_EVENT,
  RESTORE_MINIMIZED_MODAL_EVENT,
} from "@/services/minimized-modal.service";

import {
  type Person,
  type PersonFormData,
  type PersonStatusFilter,
  type PersonTypeFilter,
  type PersonTenantFilter,
  type PersonModalDraft,
  emptyFormData,
  normalizeSearchText,
  mapApiPersonToPerson,
} from "@/components/people/person-types";
import { PersonKpis } from "@/components/people/person-kpis";
import { PersonFilters } from "@/components/people/person-filters";
import { PersonTable } from "@/components/people/person-table";
import { PersonMobileCards } from "@/components/people/person-mobile-cards";
import { PersonFormModal } from "@/components/people/person-form-modal";
import { PersonHistoryModal } from "@/components/people/person-history-modal";

function getCurrentCompanyId(): string {
  if (typeof window === "undefined") return "";

  const possibleCompanyIdKeys = [
    "contrx_company_id",
    "contrx_companyId",
    "companyId",
    "contrx_active_company_id",
    "active_company_id",
  ];

  for (const key of possibleCompanyIdKeys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  const storedUser = window.localStorage.getItem("contrx_user");
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser) as { companyId?: string };
      if (parsedUser.companyId) return parsedUser.companyId;
    } catch {
      return "";
    }
  }

  return "";
}

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function PeoplePage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PersonStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<PersonTypeFilter>("all");
  const [tenantFilter, setTenantFilter] = useState<PersonTenantFilter>("all");

  // Estado dos Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFormModalMinimized, setIsFormModalMinimized] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formDraft, setFormDraft] = useState<PersonFormData | null>(null);

  const [historyPerson, setHistoryPerson] = useState<Person | null>(null);

  const companyId = useMemo(() => {
    return user?.companyId || getCurrentCompanyId();
  }, [user?.companyId]);

  // Carregar dados de pessoas
  const loadPeople = useCallback(async (cid: string) => {
    try {
      setIsLoadingPeople(true);
      setPageError(null);
      const res = await getPeople(cid);
      setPeople(res.map(mapApiPersonToPerson));
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Não foi possível carregar as pessoas."
      );
    } finally {
      setIsLoadingPeople(false);
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      loadPeople(companyId);
    }
  }, [companyId, loadPeople]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Gerenciamento de Modal Minimizável
  const closeFormModal = useCallback(() => {
    clearMinimizedModalState("people");
    setIsFormModalOpen(false);
    setIsFormModalMinimized(false);
    setEditingPerson(null);
    setFormDraft(null);
  }, []);

  useEffect(() => {
    const stored = getMinimizedModalState<PersonModalDraft>();
    if (stored?.tool === "people" && stored.draft) {
      setFormDraft(stored.draft);
      if (stored.draft.editingPersonId) {
        const found = people.find((p) => p.id === stored.draft?.editingPersonId);
        setEditingPerson(found || null);
      } else {
        setEditingPerson(null);
      }
      setIsFormModalOpen(true);
      setIsFormModalMinimized(false);
      clearMinimizedModalState("people");
    }

    function handleRestore(event: Event) {
      const customEvent = event as CustomEvent<{ tool?: string }>;
      if (customEvent.detail?.tool && customEvent.detail.tool !== "people") return;
      setIsFormModalOpen(true);
      setIsFormModalMinimized(false);
      clearMinimizedModalState("people");
    }

    function handleClose(event: Event) {
      const customEvent = event as CustomEvent<{ tool?: string }>;
      if (customEvent.detail?.tool && customEvent.detail.tool !== "people") return;
      closeFormModal();
    }

    window.addEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestore);
    window.addEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleClose);

    return () => {
      window.removeEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestore);
      window.removeEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleClose);
    };
  }, [closeFormModal, people]);

  function handleMinimizeModal(draftToSave?: PersonFormData) {
    const draft = draftToSave || formDraft || emptyFormData;
    setMinimizedModalState<PersonModalDraft>({
      tool: "people",
      title: editingPerson ? `Editando: ${editingPerson.name}` : "Nova pessoa",
      route: "/pessoas",
      draft: {
        ...draft,
        editingPersonId: editingPerson?.id || null,
      },
    });
    setFormDraft(draft);
    setIsFormModalMinimized(true);
  }

  // Abertura de Modais
  function handleOpenCreateModal() {
    clearMinimizedModalState("people");
    setEditingPerson(null);
    setFormDraft(null);
    setIsFormModalMinimized(false);
    setIsFormModalOpen(true);
  }

  function handleOpenEditModal(person: Person) {
    clearMinimizedModalState("people");
    setEditingPerson(person);
    setFormDraft(null);
    setIsFormModalMinimized(false);
    setIsFormModalOpen(true);
  }

  function handleOpenHistoryModal(person: Person) {
    setHistoryPerson(person);
  }

  // Callback de Salvamento com Sucesso (Criação, Edição, Inativação ou Reativação)
  function handleSaveSuccess(
    savedPerson: Person,
    isEdit: boolean,
    actionType?: "create" | "update" | "inactivate" | "reactivate"
  ) {
    if (isEdit) {
      setPeople((prev) =>
        prev.map((p) => (p.id === savedPerson.id ? savedPerson : p))
      );
      let message = "Pessoa atualizada com sucesso.";
      if (actionType === "inactivate") {
        message = "Pessoa inativada com sucesso.";
      } else if (actionType === "reactivate") {
        message = "Pessoa reativada com sucesso.";
      }

      setToast({
        type: "success",
        message,
      });
    } else {
      setPeople((prev) => [savedPerson, ...prev]);
      setToast({
        type: "success",
        message: "Pessoa cadastrada com sucesso.",
      });
    }
  }

  // Callback de Exclusão com Sucesso
  function handleDeleteSuccess(deletedPersonId: string) {
    setPeople((prev) => prev.filter((p) => p.id !== deletedPersonId));
    setToast({
      type: "success",
      message: "Cadastro de pessoa excluído com sucesso.",
    });
  }

  // Filtragem Otimizada em Memória
  const filteredPeople = useMemo(() => {
    const searchNormalized = normalizeSearchText(searchTerm);

    return people.filter((p) => {
      // Filtro de Busca
      if (searchNormalized) {
        const matchName = normalizeSearchText(p.name).includes(searchNormalized);
        const matchDoc = normalizeSearchText(p.document).includes(searchNormalized);
        const matchPhone = normalizeSearchText(p.phone).includes(searchNormalized);
        const matchEmail = normalizeSearchText(p.email).includes(searchNormalized);
        const matchCity = normalizeSearchText(p.city).includes(searchNormalized);
        if (!matchName && !matchDoc && !matchPhone && !matchEmail && !matchCity) {
          return false;
        }
      }

      // Filtro de Situação
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }

      // Filtro de Tipo
      if (typeFilter !== "all" && p.type !== typeFilter) {
        return false;
      }

      // Filtro de Inquilino
      if (tenantFilter === "tenant" && !p.isTenant) return false;
      if (tenantFilter === "non_tenant" && p.isTenant) return false;

      return true;
    });
  }, [people, searchTerm, statusFilter, typeFilter, tenantFilter]);

  return (
    <>
      <div className="contrx-module-page contrx-properties-page space-y-6 print:hidden">
        {/* Toast Notifier */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl transition-all duration-300 animate-in slide-in-from-top-3 ${
              toast.type === "success"
                ? "bg-emerald-600 shadow-emerald-500/20"
                : "bg-red-600 shadow-red-500/20"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* 1. KPIs no Padrão de Bens/Ativos */}
        <PersonKpis
          people={people}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          onSelectStatusFilter={setStatusFilter}
          onSelectTypeFilter={setTypeFilter}
        />

        {/* Mensagem de Erro de Página se houver */}
        {pageError && (
          <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
            {pageError}
          </div>
        )}

        {/* 2. Painel Principal de Filtros e Listagens */}
        <section className="contrx-module-panel rounded-3xl border border-orange-100 bg-white p-6 shadow-sm space-y-5">
          <PersonFilters
            search={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            tenantFilter={tenantFilter}
            onTenantFilterChange={setTenantFilter}
            onNewPerson={handleOpenCreateModal}
            totalCount={people.length}
            filteredCount={filteredPeople.length}
          />

          {/* 3. Tabela Desktop */}
          <PersonTable
            people={filteredPeople}
            isLoading={isLoadingPeople}
            onOpenHistory={handleOpenHistoryModal}
            onOpenEdit={handleOpenEditModal}
          />

          {/* 4. Cards Mobile */}
          <PersonMobileCards
            people={filteredPeople}
            isLoading={isLoadingPeople}
            onOpenHistory={handleOpenHistoryModal}
            onOpenEdit={handleOpenEditModal}
          />
        </section>
      </div>

      {/* 5. Modal de Formulário Unificado (Criação e Edição com Inativação/Exclusão no Rodapé) */}
      <PersonFormModal
        isOpen={isFormModalOpen && !isFormModalMinimized}
        editingPerson={editingPerson}
        companyId={companyId}
        people={people}
        initialDraft={formDraft}
        onMinimize={handleMinimizeModal}
        onClose={closeFormModal}
        onSaveSuccess={handleSaveSuccess}
        onDeleteSuccess={handleDeleteSuccess}
      />

      {/* 6. Modal 360° de Histórico da Pessoa com Carga Sob Demanda */}
      <PersonHistoryModal
        isOpen={Boolean(historyPerson)}
        person={historyPerson}
        companyId={companyId}
        onClose={() => setHistoryPerson(null)}
        onOpenEdit={handleOpenEditModal}
      />
    </>
  );
}
