"use client";
import { useRef, useState, type FormEvent } from "react";
import { BadgePercent, MapPin, Search, UserRound, X } from "lucide-react";
import { checkSalesSellerDocument, lookupSalesCompany, lookupSalesAddress } from "@/services/vendas.service";

export type SellerForm = {
  personType: "INDIVIDUAL" | "COMPANY";
  name: string; alias: string; document: string; phone: string; phone2: string; email: string; commission: string;
  identityNumber: string; issuingAuthority: string; birthDate: string; sex: string;
  zipCode: string; address: string; number: string; complement: string; neighborhood: string; city: string; state: string; notes: string;
};
export const emptySellerForm: SellerForm = { personType: "INDIVIDUAL", name: "", alias: "", document: "", phone: "", phone2: "", email: "", commission: "", identityNumber: "", issuingAuthority: "", birthDate: "", sex: "", zipCode: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "" };
export const sellerDigits = (value: string) => value.replace(/\D/g, "");
export const formatSellerDocument = (value: string, company: boolean) => company
  ? sellerDigits(value).slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2")
  : sellerDigits(value).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const field = "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold uppercase text-slate-800 outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function SellerModal({ form, setForm, editingId, code, saving, error, checking, feedback, onDocumentChange, verifyDocument, onSubmit, onClose }: {
  form: SellerForm; setForm: (update: (current: SellerForm) => SellerForm) => void;
  editingId: string | null; code?: number; saving: boolean; error: string; checking: boolean; feedback: string;
  onDocumentChange: (value: string) => void; verifyDocument: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"GERAL" | "ENDERECOS">("GERAL");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const requestVersion = useRef(0);
  const company = form.personType === "COMPANY";
  const documentLabel = company ? "CNPJ" : "CPF";
  const set = (key: keyof SellerForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  function close() { if (!saving) { requestVersion.current++; onClose(); } }
  async function lookup(kind: "company" | "address") {
    const version = ++requestVersion.current;
    const document = sellerDigits(form.document);
    setLookingUp(true); setLookupError(""); setLookupMessage("");
    try {
      if (kind === "company") {
        const check = await checkSalesSellerDocument(document, editingId || undefined);
        if (check.exists) throw new Error("Já existe um vendedor com este CNPJ.");
        const data = await lookupSalesCompany(document);
        if (version !== requestVersion.current) return;
        setForm(current => sellerDigits(current.document) !== document ? current : ({ ...current,
          name: data.name || current.name, alias: data.alias || current.alias,
          phone: data.phone || current.phone, email: data.email || current.email,
          zipCode: data.zipCode || current.zipCode, address: data.address || current.address,
          number: data.number || current.number, complement: data.complement || current.complement,
          neighborhood: data.neighborhood || current.neighborhood, city: data.city || current.city, state: data.state || current.state,
        }));
      } else {
        const data = await lookupSalesAddress(sellerDigits(form.zipCode));
        if (version !== requestVersion.current) return;
        setForm(current => ({ ...current, address: data.address || current.address, neighborhood: data.neighborhood || current.neighborhood, city: data.city || current.city, state: data.state || current.state }));
      }
      setLookupMessage("Dados consultados. Confira as informações antes de gravar.");
    } catch (cause) { if (version === requestVersion.current) setLookupError(cause instanceof Error ? cause.message : "Não foi possível consultar os dados."); }
    finally { if (version === requestVersion.current) setLookingUp(false); }
  }
  const input = (label: string, key: keyof SellerForm, maxLength: number, type = "text", required = false) => <label className="block space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{label}{required && <b className="text-red-600"> *</b>}</span><input type={type} required={required} maxLength={maxLength} className={field} value={form[key]} onChange={event => set(key, event.target.value)} /></label>;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-2 sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <form role="dialog" aria-modal="true" aria-label={editingId ? "Editar vendedor" : "Novo vendedor"} onSubmit={onSubmit} onKeyDown={event => { if (event.key === "Escape") close(); }} className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div className="flex items-start gap-3"><span className="rounded-xl bg-[var(--primary-bg-light)] p-2 text-[var(--primary-color)]"><UserRound className="h-5 w-5" /></span><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{editingId ? "Editar Vendedor" : "Novo Vendedor"}</h3><p className="text-sm text-slate-500">Preencha os dados do vendedor e clique em Gravar.</p></div></div><button type="button" aria-label="Fechar formulário" disabled={saving} onClick={close} className="rounded-lg p-2 text-slate-500"><X className="h-5 w-5" /></button></header>
      <div className="flex gap-4 border-b border-slate-200 px-4 pt-2 dark:border-slate-800">{([{ id: "GERAL", label: "Geral", icon: UserRound }, { id: "ENDERECOS", label: "Endereços", icon: MapPin }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-semibold ${tab === id ? "border-[var(--primary-color)] text-[var(--primary-color)]" : "border-transparent text-slate-500"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
      {(error || lookupError) && <p role="alert" className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || lookupError}</p>}
      {lookupMessage && <p role="status" className="mx-4 mt-3 rounded-xl bg-[var(--primary-bg-light)] p-3 text-sm text-[var(--primary-color)]">{lookupMessage}</p>}
      <fieldset disabled={saving || lookingUp} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className={`${tab === "GERAL" ? "grid" : "hidden"} gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Tipo de pessoa</span><select className={field} value={form.personType} onChange={event => { requestVersion.current++; onDocumentChange(""); setForm(current => ({ ...current, personType: event.target.value as SellerForm["personType"], identityNumber: "", issuingAuthority: "", birthDate: "", sex: "" })); setLookupError(""); setLookupMessage(""); }}><option value="INDIVIDUAL">Física</option><option value="COMPANY">Jurídica</option></select></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Código</span><input readOnly className={`${field} bg-slate-100`} value={code ?? "GERADO AO GRAVAR"} /></label>
          <div className="sm:col-span-2">{input(company ? "Nome / Razão social" : "Nome completo", "name", 160, "text", true)}</div>
          {input(company ? "Nome fantasia" : "Apelido", "alias", 160)}
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{documentLabel}</span><div className="relative"><input inputMode="numeric" className={`${field} ${company ? "pr-24" : ""}`} value={form.document} onChange={event => { requestVersion.current++; onDocumentChange(formatSellerDocument(event.target.value, company)); setLookupError(""); setLookupMessage(""); }} onBlur={verifyDocument} placeholder={company ? "00.000.000/0000-00" : "000.000.000-00"} aria-describedby="seller-document-feedback" />{company && <button type="button" disabled={sellerDigits(form.document).length !== 14} onClick={() => void lookup("company")} className="absolute right-1 top-1 flex h-[calc(100%-0.5rem)] items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-[var(--primary-color)] disabled:opacity-50"><Search className="h-3.5 w-3.5" />Consultar</button>}</div><small id="seller-document-feedback" role="status" className={`block text-xs ${feedback && !feedback.includes("disponível") ? "text-red-600" : "text-slate-500"}`}>{checking ? `Verificando ${documentLabel}…` : feedback}</small></label>
          {input("Telefone / WhatsApp", "phone", 30)}{input("Telefone adicional", "phone2", 30)}
          {input("E-mail", "email", 160, "email")}
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Comissão (%)</span><div className="relative"><input inputMode="decimal" className={`${field} pr-9`} value={form.commission} onChange={event => set("commission", event.target.value)} /><BadgePercent className="absolute right-3 top-3 h-4 w-4 text-slate-400" /></div></label>
          {!company && <>{input("RG", "identityNumber", 30)}{input("Órgão emissor", "issuingAuthority", 30)}{input("Data de nascimento", "birthDate", 10, "date")}<label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Sexo</span><select className={field} value={form.sex} onChange={event => set("sex", event.target.value)}><option value="">Não informado</option><option value="F">Feminino</option><option value="M">Masculino</option><option value="OUTRO">Outro</option></select></label></>}
          <label className="space-y-1 sm:col-span-2 xl:col-span-4"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Observações</span><textarea rows={3} maxLength={500} className={field} value={form.notes} onChange={event => set("notes", event.target.value)} /></label>
        </div>
        <div className={`${tab === "ENDERECOS" ? "grid" : "hidden"} gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">CEP</span><div className="relative"><input maxLength={9} className={`${field} pr-24`} value={form.zipCode} onChange={event => set("zipCode", event.target.value)} onBlur={() => { if (sellerDigits(form.zipCode).length === 8) void lookup("address"); }} /><button type="button" disabled={sellerDigits(form.zipCode).length !== 8} onClick={() => void lookup("address")} className="absolute right-1 top-1 h-[calc(100%-0.5rem)] rounded-lg border border-slate-200 px-2 text-xs text-[var(--primary-color)] disabled:opacity-50">Buscar</button></div></label>
          <div className="sm:col-span-2">{input("Endereço", "address", 160)}</div>{input("Número", "number", 20)}{input("Complemento", "complement", 100)}{input("Bairro", "neighborhood", 100)}{input("Cidade", "city", 100)}{input("UF", "state", 2)}
        </div>
      </fieldset>
      <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30"><button type="button" disabled={saving} onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</button><button disabled={saving || lookingUp || checking} className="rounded-2xl bg-[var(--primary-color)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{saving ? "Gravando..." : "Gravar"}</button></footer>
    </form>
  </div>;
}
