"use client";

import { useRef, useState, type FormEvent } from "react";
import { Building2, MapPin, Search, X } from "lucide-react";
import { lookupSalesSupplierCompany, type SalesSupplierInput } from "@/services/vendas.service";

const field = "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)]";
const label = "space-y-1 text-xs font-bold uppercase text-slate-600 dark:text-slate-300";
const normalize = (value: string) => value.replace(/[^A-Z0-9]/gi, "").toUpperCase();

export default function SupplierModal({ form, onChange, code, saving, error, onSubmit, onClose }: {
  form: SalesSupplierInput;
  onChange: (update: (current: SalesSupplierInput) => SalesSupplierInput) => void;
  code?: number;
  saving: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("GERAL");
  const [company, setCompany] = useState(normalize(form.document || "").length !== 11);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [feedback, setFeedback] = useState("");
  const version = useRef(0);
  const set = (key: keyof SalesSupplierInput, value: string) => onChange((current) => ({ ...current, [key]: value }));
  function close() { if (!saving) { version.current++; onClose(); } }
  async function lookup() {
    const document = normalize(form.document || "");
    if (document.length !== 14) { setLookupError("Informe um CNPJ com 14 caracteres."); return; }
    const request = ++version.current;
    setSearching(true); setLookupError(""); setFeedback("");
    try {
      const data = await lookupSalesSupplierCompany(document);
      if (version.current !== request) return;
      const address = [data.address, data.number, data.complement, data.neighborhood, data.city, data.state, data.zipCode].filter(Boolean).join(", ");
      if (address.length > 300) throw new Error("O endereço consultado excede o limite. Preencha o endereço manualmente.");
      onChange((current) => ({ ...current, name: data.name || current.name, phone: data.phone || current.phone, email: data.email || current.email, address: address || current.address }));
      setFeedback("Dados da empresa e endereço preenchidos pela consulta pública. Confira antes de gravar.");
    } catch (cause) {
      if (version.current === request) setLookupError(cause instanceof Error ? cause.message : "Não foi possível consultar o CNPJ. Preencha os dados manualmente.");
    } finally { if (version.current === request) setSearching(false); }
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <form onSubmit={onSubmit} onInvalidCapture={() => setTab("GERAL")} onKeyDown={(event) => { if (event.key === "Escape") close(); }} role="dialog" aria-modal="true" aria-label={code ? "Editar fornecedor" : "Novo fornecedor"} className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-h-[calc(100vh-3rem)]">
      <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div className="flex items-start gap-3"><span className="rounded-xl bg-[var(--primary-bg-light)] p-2 text-[var(--primary-color)]"><Building2 className="h-5 w-5"/></span><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{code ? "Editar Fornecedor" : "Novo Fornecedor"}</h3><p className="text-sm text-slate-500 dark:text-slate-400">Preencha os dados do fornecedor e clique em Gravar.</p></div></div><button type="button" disabled={saving} onClick={close} aria-label="Fechar formulário" className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></header>
      <div className="flex gap-5 border-b border-slate-200 px-4 pt-2 dark:border-slate-800">{[{ id: "GERAL", name: "Geral", icon: Building2 }, { id: "ENDERECO", name: "Endereço", icon: MapPin }].map(({ id, name, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-bold ${tab === id ? "border-[var(--primary-color)] text-[var(--primary-color)]" : "border-transparent text-slate-500 dark:text-slate-400"}`}><Icon className="h-4 w-4"/>{name}</button>)}</div>
      {(error || lookupError) && <div role="alert" className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error || lookupError}</div>}
      {feedback && <div role="status" className="mx-4 mt-3 rounded-xl bg-[var(--primary-bg-light)] px-3 py-2 text-sm text-[var(--primary-color)]">{feedback}</div>}
      <fieldset disabled={saving || searching} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className={`${tab === "GERAL" ? "grid" : "hidden"} gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-6`}>
          <div className={label}><span>Tipo de pessoa</span><div className="grid grid-cols-2 rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">{[false, true].map((value) => <button key={String(value)} type="button" onClick={() => { version.current++; setCompany(value); set("document", ""); setLookupError(""); setFeedback(""); }} className={`rounded-md px-2 py-2 text-xs ${company === value ? "bg-[var(--primary-bg-light)] text-[var(--primary-color)]" : "text-slate-500"}`}>{value ? "Jurídica" : "Física"}</button>)}</div></div>
          <label className={label}><span>Código</span><input readOnly className={`${field} bg-slate-100`} value={code ?? "Gerado ao gravar"}/></label>
          <label className={`${label} xl:col-span-4`}><span>Nome / Razão social <b className="text-red-600">*</b></span><input autoFocus required maxLength={160} className={field} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Digite o nome ou razão social do fornecedor..."/></label>
          <label className={`${label} xl:col-span-3`}><span>{company ? "CNPJ" : "CPF"}</span><div className="relative"><input maxLength={company ? 18 : 14} className={`${field} ${company ? "pr-28" : ""}`} value={form.document || ""} onChange={(event) => { version.current++; set("document", event.target.value.toUpperCase()); setLookupError(""); setFeedback(""); }} placeholder={company ? "00.000.000/0000-00" : "000.000.000-00"}/>{company && <button type="button" disabled={normalize(form.document || "").length !== 14} onClick={() => void lookup()} className="absolute right-1 top-1 inline-flex h-[calc(100%-0.5rem)] items-center gap-1 rounded-md border border-slate-200 px-2 text-xs text-[var(--primary-color)] disabled:opacity-50"><Search className="h-3.5 w-3.5"/>{searching ? "Buscando..." : "Consultar"}</button>}</div></label>
          <label className={`${label} xl:col-span-3`}><span>Pessoa de contato</span><input maxLength={160} className={field} value={form.contact || ""} onChange={(event) => set("contact", event.target.value)} placeholder="Nome do contato"/></label>
          <label className={`${label} xl:col-span-3`}><span>Telefone / WhatsApp</span><input maxLength={30} className={field} value={form.phone || ""} onChange={(event) => set("phone", event.target.value)} placeholder="(00) 00000-0000"/></label>
          <label className={`${label} xl:col-span-3`}><span>E-mail</span><input type="email" maxLength={160} className={`${field} normal-case`} value={form.email || ""} onChange={(event) => set("email", event.target.value)} placeholder="EMAIL@EXEMPLO.COM"/></label>
          <label className={`${label} sm:col-span-2 xl:col-span-6`}><span>Observações</span><textarea rows={3} maxLength={500} className={field} value={form.notes || ""} onChange={(event) => set("notes", event.target.value)} placeholder="Informações adicionais sobre o fornecedor..."/><span className="block text-right text-[10px] text-slate-400">{form.notes?.length || 0}/500</span></label>
        </div>
        <div className={`${tab === "ENDERECO" ? "block" : "hidden"} space-y-4`}><h4 className="text-sm font-bold">Endereço do fornecedor</h4><label className={`${label} block`}><span>Endereço completo</span><textarea rows={4} maxLength={300} className={field} value={form.address || ""} onChange={(event) => set("address", event.target.value)} placeholder="Logradouro, número, complemento, bairro, cidade, UF e CEP"/><span className="block text-right text-[10px] text-slate-400">{form.address?.length || 0}/300</span></label><p className="text-xs text-slate-500">A consulta de CNPJ preenche o endereço quando disponível. Confira e complemente os dados antes de gravar.</p></div>
      </fieldset>
      <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30"><button type="button" disabled={saving} onClick={close} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</button><button disabled={saving || searching} className="rounded-2xl bg-[var(--primary-color)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--primary-bg-light)] hover:bg-[var(--primary-hover)] disabled:opacity-50">{saving ? "Gravando..." : "Gravar"}</button></footer>
    </form>
  </div>;
}
