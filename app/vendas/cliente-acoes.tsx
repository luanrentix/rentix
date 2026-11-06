"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, MoreVertical, Pencil, Trash2 } from "lucide-react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { archiveSalesCustomer, deleteSalesCustomer, type SalesCustomer } from "@/services/vendas.service";

export default function CustomerActions({ customer, onEdit, onChanged }: { customer: SalesCustomer; onEdit: () => void; onChanged: (message: string) => Promise<void> }) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [action, setAction] = useState<"delete" | "archive" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setMenu(null); };
    const close = () => setMenu(null);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { close(); triggerRef.current?.focus(); } };
    document.addEventListener("mousedown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); window.removeEventListener("keydown", key); };
  }, [menu]);
  async function confirm() {
    if (!action || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      if (action === "delete") await deleteSalesCustomer(customer.id);
      else await archiveSalesCustomer(customer.id);
      await onChanged(action === "delete" ? "Cliente excluído." : "Cliente inativado.");
      setAction(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação."); }
    finally { locked.current = false; setBusy(false); }
  }
  if (customer.isSystem) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800">Padrão do sistema</span>;
  return <>
    <button ref={triggerRef} type="button" aria-label={`Ações de ${customer.name}`} title="Ações" aria-expanded={Boolean(menu)} aria-haspopup="menu" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] dark:border-slate-700" onClick={() => { const rect = triggerRef.current!.getBoundingClientRect(); setMenu(menu ? null : { left: Math.max(8, Math.min(rect.right - 184, window.innerWidth - 192)), top: rect.bottom + 148 > window.innerHeight ? Math.max(8, rect.top - 148) : rect.bottom + 4 }); }}><MoreVertical className="h-4 w-4"/></button>
    {menu && createPortal(<div ref={menuRef} role="menu" style={menu} className="fixed z-[150] w-46 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <button role="menuitem" type="button" onClick={() => { setMenu(null); onEdit(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={15}/>Editar</button>
      <button role="menuitem" type="button" onClick={() => { setMenu(null); setError(""); setAction("archive"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><Archive size={15}/>Inativar cadastro</button>
      <button role="menuitem" type="button" onClick={() => { setMenu(null); setError(""); setAction("delete"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-red-600 hover:bg-red-50"><Trash2 size={15}/>Excluir</button>
    </div>, document.body)}
    {action && <ConfirmationModal title={action === "delete" ? "Excluir cliente" : "Inativar cliente"} description={action === "delete" ? `Excluir ${customer.name}? A exclusão é definitiva e só é permitida para cadastros sem movimentações, inclusive documentos cancelados ou estornados.` : `Inativar ${customer.name}? O cadastro ficará indisponível para novas vendas e seu histórico será preservado.`} confirmLabel={action === "delete" ? "Excluir cliente" : "Inativar cliente"} busyLabel={action === "delete" ? "Excluindo..." : "Inativando..."} busy={busy} error={error} onConfirm={() => void confirm()} onCancel={() => { if (!busy) setAction(null); }}/>}
  </>;
}
