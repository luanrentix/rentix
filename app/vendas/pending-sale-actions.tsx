"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, FolderOpen, MoreVertical, Printer, Trash2 } from "lucide-react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { discardSalesOrder, type SalesOrder } from "@/services/vendas.service";

export default function PendingSaleActions({
  order,
  onOpen,
  onDetails,
  onReceipt,
  onDeleted,
}: {
  order: SalesOrder;
  onOpen: () => void;
  onDetails: () => void;
  onReceipt: () => void;
  onDeleted: (order: SalesOrder) => void;
}) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const outside = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      )
        close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
  async function remove() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const deleted = await discardSalesOrder(order.id);
      onDeleted(deleted);
      setConfirmOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível excluir a venda. Tente novamente.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações da venda ${order.number}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        onClick={() => {
          const rect = triggerRef.current!.getBoundingClientRect();
          setMenu(
            menu
              ? null
              : {
                  left: Math.max(
                    8,
                    Math.min(rect.right - 208, window.innerWidth - 216),
                  ),
                  top:
                    rect.bottom + 190 > window.innerHeight
                      ? Math.max(8, rect.top - 190)
                      : rect.bottom + 4,
                },
          );
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <MoreVertical size={16} />
        Ações
      </button>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Ações da venda ${order.number}`}
            style={menu}
            className="fixed z-[150] w-52 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {[
              { label: "Abrir", icon: FolderOpen, run: onOpen },
              { label: "Detalhes / pagamentos", icon: Eye, run: onDetails },
              { label: "Comprovante", icon: Printer, run: onReceipt },
              {
                label: "Excluir",
                icon: Trash2,
                run: () => {
                  setError("");
                  setConfirmOpen(true);
                },
              },
            ].map(({ label, icon: Icon, run }, index) => (
              <button
                key={label}
                autoFocus={index === 0}
                role="menuitem"
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left ${label === "Excluir" ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                onClick={() => {
                  setMenu(null);
                  run();
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
      {confirmOpen && (
        <ConfirmationModal
          title="Excluir venda em andamento"
          description={`Deseja excluir a venda #${order.number} de ${order.customerName}? Ela será retirada de Em andamento, mantendo o histórico de cancelamento.`}
          confirmLabel="Excluir venda"
          busyLabel="Excluindo…"
          busy={busy}
          error={error}
          onConfirm={() => void remove()}
          onCancel={() => {
            if (!busy) setConfirmOpen(false);
          }}
        />
      )}
    </>
  );
}
