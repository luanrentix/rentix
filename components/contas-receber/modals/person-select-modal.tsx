"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  X,
  User,
  Check,
  Phone,
  FileText,
  Building2,
  Users,
  Plus,
  Sparkles,
} from "lucide-react";
import { Tenant } from "../receivable-types";
import { useAuth } from "@/context/AuthContext";
import { PersonFormModal } from "@/components/people/person-form-modal";
import { type Person } from "@/components/people/person-types";

interface PersonSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  people?: Tenant[];
  tenants?: Tenant[];
  companyId?: string;
  selectedPersonId?: string | null;
  selectedTenantId?: string | null;
  onSelectPerson?: (person: Tenant | null) => void;
  onSelectTenant?: (tenant: Tenant | null) => void;
  onPersonCreated?: (person: Tenant) => void;
  title?: string;
  allowClear?: boolean;
}

export function PersonSelectModal({
  isOpen,
  onClose,
  people,
  tenants,
  companyId,
  selectedPersonId,
  selectedTenantId,
  onSelectPerson,
  onSelectTenant,
  onPersonCreated,
  title = "Selecionar Pessoa",
  allowClear = true,
}: PersonSelectModalProps) {
  const { user } = useAuth();
  const baseList = people || tenants || [];
  const activeId = selectedPersonId || selectedTenantId;
  const handleSelect = onSelectPerson || onSelectTenant || (() => {});

  const [search, setSearch] = useState("");
  const [isCreatePersonModalOpen, setIsCreatePersonModalOpen] = useState(false);
  const [createdPeople, setCreatedPeople] = useState<Tenant[]>([]);

  // Resolver o companyId com fallback seguro
  const resolvedCompanyId = useMemo(() => {
    if (companyId) return companyId;
    if (user?.companyId) return user.companyId;
    if (typeof window !== "undefined") {
      return (
        window.localStorage.getItem("contrx_company_id") ||
        window.localStorage.getItem("companyId") ||
        ""
      );
    }
    return "";
  }, [companyId, user?.companyId]);

  // Lista combinada de pessoas (incluindo pessoas cadastradas na sessão atual no topo)
  const peopleList = useMemo(() => {
    const createdIds = new Set(createdPeople.map((p) => p.id));
    return [...createdPeople, ...baseList.filter((p) => !createdIds.has(p.id))];
  }, [createdPeople, baseList]);

  // Filtro de busca em tempo real
  const filteredPeople = useMemo(() => {
    if (!search.trim()) return peopleList;
    const term = search.toLowerCase().trim();
    return peopleList.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const docMatch = p.document?.toLowerCase().includes(term);
      const phoneMatch = p.phone?.replace(/\D/g, "").includes(term);
      const emailMatch = p.email?.toLowerCase().includes(term);
      return nameMatch || docMatch || phoneMatch || emailMatch;
    });
  }, [peopleList, search]);

  // Lista adaptada de pessoas para o PersonFormModal (validação de duplicidades)
  const asPersonList = useMemo<Person[]>(() => {
    return peopleList.map((t) => ({
      id: t.id,
      companyId: resolvedCompanyId,
      name: t.name,
      type: "individual",
      document: t.document || "",
      stateRegistration: "",
      identityNumber: "",
      email: t.email || "",
      phone: t.phone || "",
      zipCode: "",
      city: "",
      state: "",
      address: "",
      isTenant: true,
      status: "active",
      createdAt: new Date().toISOString(),
    }));
  }, [peopleList, resolvedCompanyId]);

  // Callback de sucesso ao salvar nova pessoa pelo PersonFormModal oficial
  function handleSavePersonSuccess(newPerson: Person) {
    const mappedTenant: Tenant = {
      id: newPerson.id,
      name: newPerson.name,
      document: newPerson.document,
      phone: newPerson.phone,
      email: newPerson.email,
    };

    setCreatedPeople((prev) => [mappedTenant, ...prev]);

    if (onPersonCreated) {
      onPersonCreated(mappedTenant);
    }

    handleSelect(mappedTenant);
    setIsCreatePersonModalOpen(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Selecione ou cadastre uma pessoa vinculada ao módulo de Pessoas.
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

          {/* Barra de Busca + Botão Rápido de Cadastro */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..."
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-xs font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCreatePersonModalOpen(true)}
              title="Cadastrar nova pessoa no sistema"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-xs font-black text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Pessoa</span>
            </button>
          </div>

          {/* Lista de Pessoas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  handleSelect(null);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                  !activeId || activeId === "all"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-dashed border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Todas as Pessoas (Sem filtro)</p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Limpar o filtro e exibir cobranças de qualquer pessoa
                    </p>
                  </div>
                </div>
                {(!activeId || activeId === "all") && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            )}

            {filteredPeople.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center justify-center gap-3">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p>Nenhuma pessoa encontrada com o termo &quot;{search}&quot;.</p>
                <button
                  type="button"
                  onClick={() => setIsCreatePersonModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar Nova Pessoa
                </button>
              </div>
            ) : (
              filteredPeople.map((person) => {
                const isSelected = activeId === person.id;
                const initials = person.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0]?.toUpperCase())
                  .join("");

                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      handleSelect(person);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/60 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/40"
                        : "border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {initials || <User className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`truncate text-xs font-black uppercase ${
                            isSelected
                              ? "text-emerald-900 dark:text-emerald-300"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {person.name}
                        </p>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-400">
                          {person.document && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {person.document}
                            </span>
                          )}
                          {person.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {person.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-3 shrink-0">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white">
                          <Check className="h-3 w-3" />
                          Selecionado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Escolher
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs font-bold text-slate-400 dark:border-slate-800">
            <span>{filteredPeople.length} pessoa(s) disponível(is)</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition active:scale-95"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Oficial de Cadastro do Módulo de Pessoas */}
      <PersonFormModal
        isOpen={isCreatePersonModalOpen}
        editingPerson={null}
        companyId={resolvedCompanyId}
        people={asPersonList}
        zIndex="z-[70]"
        onClose={() => setIsCreatePersonModalOpen(false)}
        onSaveSuccess={handleSavePersonSuccess}
      />
    </>
  );
}
