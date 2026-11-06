"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  archiveSalesSeller,
  deleteSalesSeller,
  type SalesSeller,
} from "@/services/vendas.service";

export default function SellerActions({
  seller,
  onEdit,
  onView,
  onChanged,
}: {
  seller: SalesSeller;
  onEdit: () => void;
  onView: () => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [action, setAction] = useState<"archive" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
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
  async function confirm() {
    if (!action || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (action === "delete") await deleteSalesSeller(seller.id);
      else await archiveSalesSeller(seller.id);
      await onChanged(
        action === "delete" ? "Vendedor excluído." : "Vendedor inativado.",
      );
      setAction(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a operação.",
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
        aria-label={`Ações de ${seller.name}`}
        aria-expanded={Boolean(menu)}
        aria-haspopup="menu"
        onClick={() => {
          const rect = triggerRef.current!.getBoundingClientRect();
          setMenu(
            menu
              ? null
              : {
                  left: Math.max(
                    8,
                    Math.min(rect.right - 184, window.innerWidth - 192),
                  ),
                  top:
                    rect.bottom + 190 > window.innerHeight
                      ? Math.max(8, rect.top - 190)
                      : rect.bottom + 4,
                },
          );
        }}
        className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-700"
      >
        <MoreVertical size={16} />
      </button>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Ações de ${seller.name}`}
            style={menu}
            className="fixed z-[150] w-46 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {[
              { label: "Visualizar", icon: Eye, run: onView },
              { label: "Editar", icon: Pencil, run: onEdit },
              {
                label: "Inativar cadastro",
                icon: Archive,
                run: () => setAction("archive"),
              },
              {
                label: "Excluir",
                icon: Trash2,
                run: () => setAction("delete"),
              },
            ].map(({ label, icon: Icon, run }, index) => (
              <button
                key={label}
                autoFocus={index === 0}
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setMenu(null);
                  setError("");
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
      {action && (
        <ConfirmationModal
          title={action === "delete" ? "Excluir vendedor" : "Inativar vendedor"}
          description={
            action === "delete"
              ? `Excluir ${seller.name}? Somente cadastros sem histórico podem ser excluídos.`
              : `Inativar ${seller.name}? Os vínculos históricos serão preservados.`
          }
          confirmLabel="Confirmar"
          busyLabel="Processando..."
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={() => {
            if (!busy) setAction(null);
          }}
        />
      )}
    </>
  );
}
