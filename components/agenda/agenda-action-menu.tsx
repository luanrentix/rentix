"use client";

import type { ReactNode } from "react";
import {
  CheckCircle2,
  Copy,
  Edit3,
  MessageCircle,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import type { ActionMenuPosition, ScheduleItem, ScheduleStatus } from "./agenda.types";

type AgendaActionMenuProps = {
  item: ScheduleItem;
  position: ActionMenuPosition;
  onClose: () => void;
  onOpenCompleteModal: (item: ScheduleItem) => void;
  onQuickStatusChange: (item: ScheduleItem, status: ScheduleStatus) => void;
  onDuplicate: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (item: ScheduleItem) => void;
  onSendWhatsApp: (item: ScheduleItem) => void;
  isBlackTheme: boolean;
};

export function AgendaActionMenu({
  item,
  position,
  onClose,
  onOpenCompleteModal,
  onQuickStatusChange,
  onDuplicate,
  onEdit,
  onDelete,
  onSendWhatsApp,
  isBlackTheme,
}: AgendaActionMenuProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        data-schedule-action-menu
        className={`fixed z-[90] max-h-[calc(100vh-32px)] w-60 overflow-y-auto rounded-2xl border p-1 text-left shadow-2xl ring-1 animate-in fade-in zoom-in-95 duration-100 ${
          isBlackTheme
            ? "border-[#334155] bg-[#0f172a] ring-[#334155]"
            : "border-[#e2e8f0] bg-[#ffffff] ring-[#e2e8f0]"
        }`}
        style={{ top: position.top, left: position.left }}
      >
        {item.status !== "completed" && (
          <ActionMenuButton
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Concluir..."
            tone="green"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              onClose();
              onOpenCompleteModal(item);
            }}
          />
        )}

        {/* Botão de Envio de WhatsApp para o Cliente */}
        <ActionMenuButton
          icon={<MessageCircle className="h-4 w-4" />}
          label="Enviar WhatsApp"
          tone="green"
          isBlackTheme={isBlackTheme}
          onClick={() => {
            onClose();
            onSendWhatsApp(item);
          }}
        />

        {item.status !== "canceled" && (
          <ActionMenuButton
            icon={<XCircle className="h-4 w-4" />}
            label="Cancelar"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              onClose();
              onQuickStatusChange(item, "canceled");
            }}
          />
        )}

        {item.status !== "scheduled" && (
          <ActionMenuButton
            icon={<RotateCcw className="h-4 w-4" />}
            label="Voltar para agendado"
            isBlackTheme={isBlackTheme}
            onClick={() => {
              onClose();
              onQuickStatusChange(item, "scheduled");
            }}
          />
        )}

        <div className={`my-1 border-t ${isBlackTheme ? "border-slate-800" : "border-slate-100"}`} />

        <ActionMenuButton
          icon={<Copy className="h-4 w-4" />}
          label="Duplicar"
          isBlackTheme={isBlackTheme}
          onClick={() => {
            onClose();
            onDuplicate(item);
          }}
        />
        <ActionMenuButton
          icon={<Edit3 className="h-4 w-4" />}
          label="Editar"
          isBlackTheme={isBlackTheme}
          onClick={() => {
            onClose();
            onEdit(item);
          }}
        />

        <div className={`my-1 border-t ${isBlackTheme ? "border-slate-800" : "border-slate-100"}`} />

        <ActionMenuButton
          icon={<Trash2 className="h-4 w-4" />}
          label="Excluir"
          tone="red"
          isBlackTheme={isBlackTheme}
          onClick={() => {
            onClose();
            onDelete(item);
          }}
        />
      </div>
    </>
  );
}

function ActionMenuButton({
  icon,
  label,
  onClick,
  tone,
  isBlackTheme,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "green" | "red";
  isBlackTheme: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
      : tone === "red"
        ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        : isBlackTheme
          ? "text-[#cbd5e1] hover:bg-[#1e293b]"
          : "text-[#475569] hover:bg-[#f8fafc]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${toneClass}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
