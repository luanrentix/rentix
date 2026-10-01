"use client";

import { useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type {
  AgendaPerson,
  AgendaProperty,
  ScheduleFormData,
  ScheduleItem,
  SchedulePriority,
  ScheduleStatus,
} from "./agenda.types";

type AgendaFormModalProps = {
  isOpen: boolean;
  editingScheduleId: string | null;
  formData: ScheduleFormData;
  setFormData: Dispatch<SetStateAction<ScheduleFormData>>;
  formError: string;
  setFormError: (error: string) => void;
  isSaving: boolean;
  people: AgendaPerson[];
  properties: AgendaProperty[];
  uniqueTypeOptions: string[];
  uniqueResponsibleOptions: string[];
  reminderOptions: string[];
  existingSchedules: ScheduleItem[];
  onClose: () => void;
  onSave: () => void;
  isBlackTheme: boolean;
  isContractFlow?: boolean;
  isMaintenanceFlow?: boolean;
};

export function AgendaFormModal({
  isOpen,
  editingScheduleId,
  formData,
  setFormData,
  formError,
  setFormError,
  isSaving,
  people,
  properties,
  uniqueTypeOptions,
  uniqueResponsibleOptions,
  reminderOptions,
  existingSchedules,
  onClose,
  onSave,
  isBlackTheme,
  isContractFlow = false,
  isMaintenanceFlow = false,
}: AgendaFormModalProps) {
  // Detector em tempo real de conflito de agenda (Double Booking)
  const scheduleConflict = useMemo(() => {
    if (!formData.date || !formData.time) return null;

    const conflict = existingSchedules.find((item) => {
      if (item.id === editingScheduleId) return false;
      if (item.status === "canceled") return false;
      if (item.date !== formData.date || item.time !== formData.time) return false;

      // Conflito por responsável
      if (
        formData.responsibleName &&
        item.responsibleName &&
        item.responsibleName.toLowerCase() === formData.responsibleName.toLowerCase()
      ) {
        return true;
      }

      // Conflito por imóvel
      if (formData.propertyId && item.propertyId && item.propertyId === formData.propertyId) {
        return true;
      }

      return false;
    });

    if (!conflict) return null;

    const isResponsibleConflict =
      Boolean(formData.responsibleName) &&
      Boolean(conflict.responsibleName) &&
      conflict.responsibleName.toLowerCase() === (formData.responsibleName || "").toLowerCase();

    const targetDescription = isResponsibleConflict
      ? `o responsável ${conflict.responsibleName}`
      : conflict.propertyName
      ? `o imóvel ${conflict.propertyName}`
      : "este mesmo horário";

    return {
      target: targetDescription,
      title: conflict.title,
    };
  }, [
    existingSchedules,
    editingScheduleId,
    formData.date,
    formData.time,
    formData.responsibleName,
    formData.propertyId,
  ]);

  if (!isOpen) return null;

  const pageThemeClass = isBlackTheme ? "theme-black" : "theme-light";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";
  const inputClass = isBlackTheme
    ? "w-full rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-semibold text-[#f8fafc] placeholder-[#64748b] transition focus:border-orange-500 focus:outline-none"
    : "w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] transition focus:border-orange-500 focus:bg-[#ffffff] focus:outline-none";
  const secondaryButtonClass = isBlackTheme
    ? "inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-bold text-[#f8fafc] transition hover:border-[#475569] hover:bg-[#0f172a]"
    : "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm ${pageThemeClass}`}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ${
          isBlackTheme
            ? "bg-[#0f172a] ring-[#334155]"
            : "bg-[#ffffff] ring-[#dbe4ef]"
        }`}
      >
        <div
          className={`border-b p-5 ${
            isBlackTheme
              ? "border-[#334155] bg-[#111827]"
              : "border-[#e2e8f0] bg-[#ffffff]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {isMaintenanceFlow ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 mb-1">
                  🔧 Manutenção de Bem / Ativo · Módulo Agenda
                </div>
              ) : isContractFlow ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 mb-1">
                  Etapa 5 de 5 · Agendamento do Contrato
                </div>
              ) : (
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                  {editingScheduleId ? "Editar agenda" : "Novo agendamento"}
                </p>
              )}
              <h2 className={`mt-1 text-2xl font-black ${strongTextClass}`}>
                {editingScheduleId
                  ? "Atualizar compromisso"
                  : isMaintenanceFlow
                  ? "Agendar Manutenção do Bem/Ativo"
                  : isContractFlow
                  ? "Registrar Vencimento de Contrato"
                  : "Criar compromisso"}
              </h2>
              <p className={`mt-1.5 text-sm leading-6 ${mutedTextClass}`}>
                {isMaintenanceFlow
                  ? "Informações do bem/ativo preenchidas automaticamente para agendamento de manutenção. Ajuste a data ou responsável e salve para registrar."
                  : isContractFlow
                  ? "Informações de vencimento do contrato preenchidas automaticamente. Salve para registrar na agenda e retornar aos contratos."
                  : "Preencha os dados para manter a rotina operacional organizada."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
                isBlackTheme
                  ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155]"
                  : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc]"
              }`}
              aria-label="Fechar agendamento"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {formError && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                isBlackTheme
                  ? "border-red-900/60 bg-red-950/30 text-red-300"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {formError}
            </div>
          )}

          {/* Alerta de conflito de agenda */}
          {scheduleConflict && (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold ${
                isBlackTheme
                  ? "border-amber-900/60 bg-amber-950/30 text-amber-300"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-black text-amber-600 dark:text-amber-400">
                  Possível conflito de horário
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed">
                  Já existe um compromisso agendado para{" "}
                  <strong>{scheduleConflict.target}</strong> às{" "}
                  <strong>{formData.time}</strong> do dia selecionado (
                  <em>&quot;{scheduleConflict.title}&quot;</em>).
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Título" isBlackTheme={isBlackTheme} className="md:col-span-2" required>
              <input
                type="text"
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex: Vistoria de saída, Entrega de chaves, Assinatura..."
                className={inputClass}
              />
            </FormField>

            <FormField label="Pessoa / cliente" isBlackTheme={isBlackTheme}>
              <select
                value={formData.personId || ""}
                onChange={(event) => {
                  const selectedPerson = people.find(
                    (p) => String(p.id) === String(event.target.value),
                  );

                  setFormError("");
                  setFormData((current) => ({
                    ...current,
                    personId: selectedPerson?.id,
                    customerName: selectedPerson?.name || "",
                  }));
                }}
                className={inputClass}
              >
                <option value="">Sem pessoa vinculada</option>
                {formData.personId &&
                  !people.some((p) => String(p.id) === String(formData.personId)) && (
                    <option value={formData.personId}>
                      {formData.customerName || "Pessoa selecionada"}
                    </option>
                  )}
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.document ? ` - ${person.document}` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Bem / Ativo" isBlackTheme={isBlackTheme}>
              <select
                value={formData.propertyId || ""}
                onChange={(event) => {
                  const selectedProperty = properties.find(
                    (p) => String(p.id) === String(event.target.value),
                  );

                  setFormError("");
                  setFormData((current) => ({
                    ...current,
                    propertyId: selectedProperty?.id,
                    propertyName: selectedProperty?.name || "",
                  }));
                }}
                className={inputClass}
              >
                <option value="">Sem bem/ativo vinculado</option>
                {formData.propertyId &&
                  !properties.some((p) => String(p.id) === String(formData.propertyId)) && (
                    <option value={formData.propertyId}>
                      {formData.propertyName || "Bem / Ativo selecionado"}
                    </option>
                  )}
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                    {property.address ? ` - ${property.address}` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Data" isBlackTheme={isBlackTheme} required>
              <input
                type="date"
                value={formData.date}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, date: event.target.value }))
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Horário" isBlackTheme={isBlackTheme} required>
              <input
                type="time"
                value={formData.time}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, time: event.target.value }))
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Tipo" isBlackTheme={isBlackTheme}>
              <select
                value={formData.type}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, type: event.target.value }))
                }
                className={inputClass}
              >
                {uniqueTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Responsável interno" isBlackTheme={isBlackTheme} required>
              <select
                value={formData.responsibleName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    responsibleName: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Selecione o responsável</option>
                {uniqueResponsibleOptions.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Status" isBlackTheme={isBlackTheme}>
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    status: event.target.value as ScheduleStatus,
                  }))
                }
                className={inputClass}
              >
                <option value="scheduled">Agendado</option>
                <option value="completed">Concluído</option>
                <option value="canceled">Cancelado</option>
              </select>
            </FormField>

            <FormField label="Prioridade" isBlackTheme={isBlackTheme}>
              <select
                value={formData.priority}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    priority: event.target.value as SchedulePriority,
                  }))
                }
                className={inputClass}
              >
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </FormField>

            <FormField label="Lembrete proativo" isBlackTheme={isBlackTheme} className="md:col-span-2">
              <select
                value={formData.reminder}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    reminder: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {reminderOptions.map((reminder) => (
                  <option key={reminder} value={reminder}>
                    {reminder}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Observações adicionais" isBlackTheme={isBlackTheme} className="md:col-span-2">
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Detalhes adicionais, orientações de atendimento..."
                className={inputClass}
              />
            </FormField>
          </div>
        </div>

        <div
          className={`flex flex-col-reverse justify-end gap-3 border-t p-5 sm:flex-row ${
            isBlackTheme
              ? "border-[#334155] bg-[#111827]"
              : "border-[#e2e8f0] bg-[#f8fafc]"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={secondaryButtonClass}
          >
            {isMaintenanceFlow
              ? "Voltar para Bens e Ativos"
              : isContractFlow
              ? "Concluir sem agendar"
              : "Cancelar"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 active:scale-95 ${
              isMaintenanceFlow
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : isContractFlow
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingScheduleId
              ? "Salvar alterações"
              : isMaintenanceFlow
              ? "Salvar Agendamento e Voltar aos Bens ➔"
              : isContractFlow
              ? "Salvar Agendamento e Concluir Fluxo ➔"
              : "Criar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  children,
  className = "",
  isBlackTheme,
  label,
  required = false,
}: {
  children: ReactNode;
  className?: string;
  isBlackTheme: boolean;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span
        className={`block text-xs font-black uppercase tracking-[0.14em] ${
          isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"
        }`}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
