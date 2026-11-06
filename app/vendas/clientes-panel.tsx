"use client";

import SalesPageHeader from "./sales-page-header";
import CustomerActions from "./cliente-acoes";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, FileText, MapPin, Paperclip, Plus, Search, ShoppingCart, Trash2, UploadCloud, UserRound, UsersRound, WalletCards, X } from "lucide-react";
import { checkSalesCustomerDocument, createSalesCustomer, getSalesCustomers, lookupSalesAddress, lookupSalesCompany, updateSalesCustomer, type SalesCustomer, type SalesCustomerInput } from "@/services/vendas.service";
import { api } from "@/services/api";

type CustomerForm = {
  referenceOnly: boolean;
  personType: "INDIVIDUAL" | "COMPANY"; name: string; alias: string; document: string;
  identityNumber: string; issuingAuthority: string; birthDate: string; sex: string;
  phone: string; phone2: string; email: string; zipCode: string; address: string;
  number: string; complement: string; neighborhood: string; city: string; state: string;
  notes: string; creditLimit: string; creditDays: string; creditBlocked: boolean;
};
type CustomerTab = "GERAL" | "ENDERECOS" | "CREDIARIO" | "ANEXOS";
const customerAttachmentsEnabled = false;
type CustomerAttachment = { id: string; originalName: string; type: string; size: number | null; url: string; createdAt: string };

const emptyForm: CustomerForm = {
  referenceOnly: false,
  personType: "INDIVIDUAL", name: "", alias: "", document: "", identityNumber: "", issuingAuthority: "",
  birthDate: "", sex: "", phone: "", phone2: "", email: "", zipCode: "", address: "", number: "",
  complement: "", neighborhood: "", city: "", state: "", notes: "", creditLimit: "0,00", creditDays: "", creditBlocked: false,
};
const field = "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)]";

function formatDocument(value: string, type: CustomerForm["personType"]) {
  if (type === "INDIVIDUAL") {
    const cpf = value.replace(/\D/g, "").slice(0, 11);
    return cpf.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
  return [cnpj.slice(0, 2), cnpj.slice(2, 5), cnpj.slice(5, 8), cnpj.slice(8, 12), cnpj.slice(12, 14)]
    .reduce((result, part, index) => result + (part ? `${index === 1 || index === 2 ? "." : index === 3 ? "/" : index === 4 ? "-" : ""}${part}` : ""), "");
}

function digits(value: string) { return value.replace(/\D/g, ""); }
function normalizedDocument(value: string, type: CustomerForm["personType"]) { return type === "COMPANY" ? value.replace(/[^A-Z0-9]/gi, "").toUpperCase() : digits(value); }
function parseMoney(value: string) { return Number(value.replace(/\./g, "").replace(",", ".")) || 0; }
function currency(value: string | number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0)); }

type SalesCustomersPanelProps = {
  selectionMode?: boolean;
  requireIdentifiedCustomer?: boolean;
  onSelectCustomer?: (customer: SalesCustomer) => void;
  onCancelSelection?: () => void;
};

export default function SalesCustomersPanel({ selectionMode = false, requireIdentifiedCustomer = false, onSelectCustomer, onCancelSelection }: SalesCustomersPanelProps) {
  const [customers, setCustomers] = useState<SalesCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState<CustomerTab>("GERAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<CustomerAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentFeedback, setDocumentFeedback] = useState("");
  const [documentChecking, setDocumentChecking] = useState(false);
  const [lookingUpCnpj, setLookingUpCnpj] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const documentValueRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCustomers(await getSalesCustomers()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os clientes."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    const available = selectionMode && requireIdentifiedCustomer ? customers.filter((customer) => !customer.isSystem) : customers;
    if (!term) return available;
    return available.filter((customer) => `${customer.code} ${customer.name} ${customer.alias || ""} ${customer.document || ""} ${customer.email || ""} ${customer.phone || ""}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [customers, query, selectionMode, requireIdentifiedCustomer]);

  function startNew() { setEditingId(null); setForm(emptyForm); documentValueRef.current = ""; setDocumentFeedback(""); setTab("GERAL"); setFormOpen(true); setMessage(""); setError(""); }
  function startEdit(customer: SalesCustomer) {
    setEditingId(customer.id);
    documentValueRef.current = normalizedDocument(customer.document || "", customer.personType);
    setDocumentFeedback("");
    setForm({
      referenceOnly: Boolean(customer.referenceOnly),
      personType: customer.personType, name: customer.name, alias: customer.alias || "", document: customer.document ? formatDocument(customer.document, customer.personType) : "",
      identityNumber: customer.identityNumber || "", issuingAuthority: customer.issuingAuthority || "", birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : "", sex: customer.sex || "",
      phone: customer.phone || "", phone2: customer.phone2 || "", email: customer.email || "", zipCode: customer.zipCode || "", address: customer.address || "",
      number: customer.number || "", complement: customer.complement || "", neighborhood: customer.neighborhood || "", city: customer.city || "", state: customer.state || "",
      notes: customer.notes || "", creditLimit: Number(customer.creditLimit).toFixed(2).replace(".", ","), creditDays: customer.creditDays?.toString() || "", creditBlocked: customer.creditBlocked,
    });
    setTab("GERAL"); setFormOpen(true); setMessage(""); setError("");
  }

  async function verifyDocument(value = form.document, personType = form.personType) {
    const normalized = normalizedDocument(value, personType);
    documentValueRef.current = normalized;
    setDocumentFeedback("");
    setDocumentChecking(false);
    const expectedLength = personType === "COMPANY" ? 14 : 11;
    if (normalized.length !== expectedLength) return;
    setDocumentChecking(true);
    try {
      const result = await checkSalesCustomerDocument(normalized, editingId || undefined);
      if (documentValueRef.current !== normalized) return;
      setDocumentFeedback(result.exists ? "Já existe um cliente cadastrado com este CPF/CNPJ." : "Documento válido e disponível.");
    } catch (cause) {
      if (documentValueRef.current === normalized) setDocumentFeedback(cause instanceof Error ? cause.message : "Não foi possível verificar este documento.");
    } finally {
      if (documentValueRef.current === normalized) setDocumentChecking(false);
    }
  }

  async function lookupCompany() {
    const normalized = normalizedDocument(form.document, "COMPANY");
    if (normalized.length !== 14) { setError("Informe os 14 caracteres do CNPJ para consultar."); return; }
    documentValueRef.current = normalized;
    setLookingUpCnpj(true); setError("");
    try {
      const data = await lookupSalesCompany(normalized);
      if (documentValueRef.current !== normalized) return;
      setForm((current) => ({ ...current, personType: "COMPANY", document: formatDocument(data.document || normalized, "COMPANY"), name: data.name || current.name, alias: data.alias || current.alias, zipCode: data.zipCode || current.zipCode, address: data.address || current.address, number: data.number || current.number, complement: data.complement || current.complement, neighborhood: data.neighborhood || current.neighborhood, city: data.city || current.city, state: data.state || current.state, phone: data.phone || current.phone, email: data.email || current.email }));
      setDocumentFeedback("Dados da empresa e endereço preenchidos pela consulta pública.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar o CNPJ."); }
    finally { setLookingUpCnpj(false); }
  }

  async function lookupAddress(value = form.zipCode) {
    const normalized = digits(value);
    if (!normalized) return;
    if (normalized.length !== 8) { setError("Informe um CEP com 8 dígitos para consultar o endereço."); return; }
    setLookingUpCep(true); setError("");
    try {
      const data = await lookupSalesAddress(normalized);
      setForm((current) => current.zipCode.replace(/\D/g, "") === normalized ? ({ ...current, zipCode: data.zipCode || current.zipCode, address: data.address || current.address, complement: data.complement || current.complement, neighborhood: data.neighborhood || current.neighborhood, city: data.city || current.city, state: data.state || current.state }) : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar o CEP."); }
    finally { setLookingUpCep(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const document = normalizedDocument(form.document, form.personType);
    const documentPattern = form.personType === "COMPANY" ? /^[A-Z0-9]{12}\d{2}$/ : /^\d{11}$/;
    if ((!form.referenceOnly || document) && !documentPattern.test(document)) {
      setTab("GERAL"); setError(form.personType === "COMPANY" ? "Informe um CNPJ com 14 dígitos." : "Informe um CPF com 11 dígitos.");
      return;
    }
    if (!form.referenceOnly && !form.address.trim()) {
      setTab("ENDERECOS"); setError("O endereço do cliente é obrigatório.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    const payload: SalesCustomerInput = {
      referenceOnly: form.referenceOnly,
      personType: form.personType, name: form.name.trim().toLocaleUpperCase("pt-BR"), alias: form.alias.trim().toLocaleUpperCase("pt-BR") || null, document: form.document,
      identityNumber: form.identityNumber.trim().toLocaleUpperCase("pt-BR") || null, issuingAuthority: form.issuingAuthority.trim().toLocaleUpperCase("pt-BR") || null,
      birthDate: form.birthDate || null, sex: form.sex || null, email: form.email.trim() || null,
      phone: form.phone.trim() || null, phone2: form.phone2.trim() || null, zipCode: form.zipCode.trim() || null,
      address: form.address.trim().toLocaleUpperCase("pt-BR") || null, number: form.number.trim().toLocaleUpperCase("pt-BR") || null, complement: form.complement.trim().toLocaleUpperCase("pt-BR") || null,
      neighborhood: form.neighborhood.trim().toLocaleUpperCase("pt-BR") || null, city: form.city.trim().toLocaleUpperCase("pt-BR") || null, state: form.state.trim().toUpperCase() || null,
      notes: form.notes.trim().toLocaleUpperCase("pt-BR") || null, creditLimit: parseMoney(form.creditLimit), creditDays: Number(form.creditDays) || null, creditBlocked: form.creditBlocked,
    };
    try {
      const documentCheck = document ? await checkSalesCustomerDocument(document, editingId || undefined) : { exists: false };
      if (documentCheck.exists) {
        const duplicateMessage = "Já existe um cliente cadastrado com este CPF/CNPJ.";
        setDocumentFeedback(duplicateMessage); setError(duplicateMessage); setSaving(false); return;
      }
      const savedCustomer = editingId
        ? await updateSalesCustomer(editingId, payload)
        : await createSalesCustomer(payload);
      setMessage(editingId ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      setFormOpen(false); setForm(emptyForm); setEditingId(null); setDocumentFeedback("");
      if (selectionMode && onSelectCustomer) {
        onSelectCustomer(savedCustomer);
        return;
      }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o cliente."); }
    finally { setSaving(false); }
  }

  const tabs: { id: CustomerTab; label: string; icon: typeof UsersRound }[] = [
    { id: "GERAL", label: "Geral", icon: UsersRound }, { id: "ENDERECOS", label: "Endereços", icon: MapPin }, { id: "CREDIARIO", label: "Cliente/Crediário", icon: WalletCards }, { id: "ANEXOS", label: "Fotos / Anexos", icon: Paperclip },
  ];

  async function loadAttachments(customerId: string) {
    if (!customerAttachmentsEnabled) return;
    try { const response = await api.get<CustomerAttachment[]>(`/files/entity/OTHER/${encodeURIComponent(customerId)}`); setAttachments(response.data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os anexos."); }
  }

  async function uploadAttachments(files: FileList | null) {
    if (!customerAttachmentsEnabled) return;
    if (!editingId || !files?.length) return;
    setUploading(true); setError("");
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: o limite por arquivo é 10 MB.`);
        const data = new FormData(); data.append("file", file); data.append("entityType", "OTHER"); data.append("entityId", editingId);
        await api.post("/files/upload", data);
      }
      await loadAttachments(editingId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar o anexo."); }
    finally { setUploading(false); }
  }

  async function removeAttachment(file: CustomerAttachment) {
    if (!customerAttachmentsEnabled) return;
    if (!editingId || !window.confirm(`Excluir o anexo ${file.originalName}?`)) return;
    try { await api.delete(`/files/${encodeURIComponent(file.id)}`); await loadAttachments(editingId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir o anexo."); }
  }

  return <div className="space-y-6">
    <SalesPageHeader title="Clientes" description={selectionMode ? "Selecione um cliente cadastrado para usar nesta venda." : "Consulte os cadastros, os contatos e as condições de crediário dos clientes."} icon={UsersRound}><div className="flex items-center gap-2">{selectionMode && <button type="button" onClick={onCancelSelection} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"><ArrowLeft className="h-4 w-4"/>Voltar para venda</button>}<button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary-bg-light)] transition active:scale-95"><Plus className="h-4 w-4"/>Novo cliente</button></div></SalesPageHeader>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><span>{error}</span>{!formOpen && <button type="button" disabled={loading} onClick={() => void load()} className="shrink-0 rounded-xl border border-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100 disabled:opacity-50">{loading ? "Carregando…" : "Tentar novamente"}</button>}</div>}{message && <div role="status" className="rounded-xl border border-[var(--primary-border-light)] bg-[var(--primary-bg-light)] px-4 py-3 text-sm font-semibold text-[var(--primary-color)]">{message}</div>}
    {formOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
      <form onSubmit={(event) => void handleSubmit(event)} onKeyDown={(event) => { if (event.key === "Escape") setFormOpen(false); }} role="dialog" aria-modal="true" aria-label={editingId ? "Editar cliente" : "Novo cliente"} className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:max-h-[calc(100vh-3rem)]">
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-[var(--primary-bg-light)] p-2 text-[var(--primary-color)]"><UserRound className="h-5 w-5"/></span><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{editingId ? "Editar Cliente" : "Novo Cliente"}</h3><p className="text-sm text-slate-500 dark:text-slate-400">Preencha os dados do cliente e clique em Gravar.</p></div></div><button type="button" aria-label="Fechar formulário" onClick={() => setFormOpen(false)} className="rounded-xl p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
      <div className="flex flex-wrap gap-5 border-b border-slate-200 dark:border-slate-800 px-4 pt-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setTab(id); if (id === "ANEXOS" && customerAttachmentsEnabled && editingId) void loadAttachments(editingId); }} className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-bold ${tab === id ? "border-[var(--primary-color)] text-[var(--primary-color)]" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>
      {error && <div role="alert" className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {tab === "GERAL" && <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1 xl:col-span-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Tipo de pessoa</span><div className="grid grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5"><button type="button" onClick={() => setForm({ ...form, personType: "INDIVIDUAL", document: formatDocument(form.document, "INDIVIDUAL") })} className={`rounded-md px-2 py-2 text-xs font-bold ${form.personType === "INDIVIDUAL" ? "bg-[var(--primary-bg-light)] text-[var(--primary-color)]" : "text-slate-500 dark:text-slate-400"}`}>Física</button><button type="button" onClick={() => setForm({ ...form, personType: "COMPANY", document: formatDocument(form.document, "COMPANY") })} className={`rounded-md px-2 py-2 text-xs font-bold ${form.personType === "COMPANY" ? "bg-[var(--primary-bg-light)] text-[var(--primary-color)]" : "text-slate-500 dark:text-slate-400"}`}>Jurídica</button></div></div>
          <label className="space-y-1 xl:col-span-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Código</span><input readOnly className={`${field} bg-slate-100 font-bold text-slate-500`} value={editingId ? customers.find((customer) => customer.id === editingId)?.code ?? "" : "Gerado ao gravar"}/></label>
          <label className="space-y-1 xl:col-span-4"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Nome completo <b className="text-red-600">*</b></span><input required maxLength={160} className={field} autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Digite o nome completo ou razão social do cliente..."/></label>
          <label className="space-y-1 xl:col-span-3"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Apelido / Fantasia</span><input maxLength={160} className={field} value={form.alias} onChange={(event) => setForm({ ...form, alias: event.target.value })} placeholder="Nome fantasia (opcional)"/></label>
          <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{form.personType === "COMPANY" ? "CNPJ" : "CPF"} {!form.referenceOnly && <b className="text-red-600">*</b>}</span><div className="relative"><input required={!form.referenceOnly} className={`${field} ${form.personType === "COMPANY" ? "pr-24" : ""}`} value={form.document} onChange={(event) => { const next = formatDocument(event.target.value, form.personType); documentValueRef.current = normalizedDocument(next, form.personType); setDocumentFeedback(""); setDocumentChecking(false); setForm({ ...form, document: next }); }} onBlur={() => void verifyDocument()} placeholder={form.personType === "COMPANY" ? "00.000.000/0000-00" : "000.000.000-00"}/>{form.personType === "COMPANY" && <button type="button" onClick={() => void lookupCompany()} disabled={lookingUpCnpj || normalizedDocument(form.document, "COMPANY").length !== 14} className="absolute right-1 top-1 inline-flex h-[calc(100%-0.5rem)] items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 px-2 text-xs font-bold text-[var(--primary-color)] hover:bg-[var(--primary-bg-light)] disabled:opacity-50">{lookingUpCnpj ? "Buscando..." : <><Search className="h-3.5 w-3.5"/>Consultar</>}</button>}</div>{documentChecking && <span className="block text-xs text-slate-500 dark:text-slate-400">Verificando documento...</span>}{documentFeedback && <span className={`block text-xs font-semibold ${documentFeedback.includes("disponível") || documentFeedback.includes("preenchidos") ? "text-emerald-700" : "text-red-600"}`}>{documentFeedback}</span>}</label>
          <label className="space-y-1 xl:col-span-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{form.personType === "COMPANY" ? "Inscrição estadual" : "RG"}</span><input maxLength={30} className={field} value={form.identityNumber} onChange={(event) => setForm({ ...form, identityNumber: event.target.value })} placeholder="Identidade / Inscrição"/></label>
          {form.personType === "INDIVIDUAL" && <>
            <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Órgão expedidor</span><input maxLength={30} className={field} value={form.issuingAuthority} onChange={(event) => setForm({ ...form, issuingAuthority: event.target.value })} placeholder="SSP/UF"/></label>
            <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Data de nascimento</span><input type="date" className={field} value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })}/></label>
            <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Sexo</span><select className={field} value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}><option value="">Selecione...</option><option value="FEMININO">Feminino</option><option value="MASCULINO">Masculino</option><option value="OUTRO">Outro</option><option value="NAO_INFORMADO">Prefiro não informar</option></select></label>
          </>}
          <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Telefone / WhatsApp</span><input maxLength={30} className={field} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(00) 00000-0000"/></label>
          <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Telefone 2</span><input maxLength={30} className={field} value={form.phone2} onChange={(event) => setForm({ ...form, phone2: event.target.value })} placeholder="(00) 00000-0000"/></label>
          <label className="space-y-1 xl:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">E-mail</span><input type="email" maxLength={160} className={field} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@exemplo.com"/></label>
          <label className="space-y-1 sm:col-span-2 xl:col-span-6"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Observações</span><textarea maxLength={500} rows={4} className={field} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Informações adicionais sobre o cliente..."/><span className="block text-right text-xs text-slate-400">{form.notes.length}/500</span></label>
        </div>}
        {tab === "ENDERECOS" && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">CEP</span><div className="relative"><input maxLength={12} className={`${field} pr-24`} value={form.zipCode} onChange={(event) => setForm({ ...form, zipCode: event.target.value })} onBlur={() => void lookupAddress()} placeholder="00000-000"/><button type="button" onClick={() => void lookupAddress()} disabled={lookingUpCep || digits(form.zipCode).length !== 8} className="absolute right-1 top-1 inline-flex h-[calc(100%-0.5rem)] items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 px-2 text-xs font-bold text-[var(--primary-color)] hover:bg-[var(--primary-bg-light)] disabled:opacity-50">{lookingUpCep ? "Buscando..." : <><Search className="h-3.5 w-3.5"/>Buscar</>}</button></div><span className="block text-xs text-slate-500 dark:text-slate-400">O endereço será preenchido ao sair do campo ou clicar em Buscar.</span></label><label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Endereço</span><input required={!form.referenceOnly} maxLength={160} className={field} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Rua / Avenida"/></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Número</span><input maxLength={20} className={field} value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} placeholder="Nº"/></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Complemento</span><input maxLength={100} className={field} value={form.complement} onChange={(event) => setForm({ ...form, complement: event.target.value })} placeholder="Sala, bloco..."/></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Bairro</span><input maxLength={100} className={field} value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} placeholder="Bairro"/></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Cidade</span><input maxLength={100} className={field} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Cidade"/></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">UF</span><input maxLength={2} className={field} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} placeholder="UF"/></label></div>}
        {tab === "CREDIARIO" && <div className="grid max-w-3xl gap-4 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Limite de crédito</span><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-slate-400">R$</span><input inputMode="decimal" className={`${field} pl-10`} value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: event.target.value })} placeholder="0,00"/></div></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Prazo do crediário (dias)</span><input type="number" min={0} className={field} value={form.creditDays} onChange={(event) => setForm({ ...form, creditDays: event.target.value })} placeholder="Ex.: 30"/></label><label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2"><input type="checkbox" checked={form.creditBlocked} onChange={(event) => setForm({ ...form, creditBlocked: event.target.checked })} className="h-4 w-4 accent-[var(--primary-color)]"/>Bloquear compras no crediário para este cliente</label><p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">As informações de crediário ficam somente no cadastro de Vendas e não movimentam contas a receber.</p></div>}
        {tab === "ANEXOS" && !customerAttachmentsEnabled && <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/75 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50"><Paperclip className="mx-auto h-9 w-9 text-slate-400"/><h3 className="mt-3 text-lg font-black text-slate-700 dark:text-slate-200">EM BREVE</h3><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">A função de fotos e anexos de clientes estará disponível em breve.</p></section>}
        {tab === "ANEXOS" && customerAttachmentsEnabled && <div className="space-y-4"><div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 p-6 text-center"><UploadCloud className="mx-auto h-8 w-8 text-slate-400"/><p className="mt-2 font-bold text-slate-700 dark:text-slate-200">Fotos e documentos do cliente</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Imagens e documentos de até 10 MB por arquivo.</p><label className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-bold text-white ${!editingId || uploading ? "pointer-events-none opacity-50" : ""}`}><Paperclip className="h-4 w-4"/>{uploading ? "Enviando..." : "Adicionar arquivos"}<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" disabled={!editingId || uploading} onChange={(event) => { void uploadAttachments(event.target.files); event.currentTarget.value = ""; }}/></label>{!editingId && <p className="mt-2 text-xs text-amber-700">Grave o cliente antes de incluir anexos.</p>}</div><div className="divide-y rounded-xl border border-slate-200 dark:border-slate-800">{attachments.map((file) => <div key={file.id} className="flex items-center gap-3 px-3 py-2.5"><FileText className="h-4 w-4 shrink-0 text-[var(--primary-color)]"/><a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[var(--primary-color)]">{file.originalName}</a><span className="text-xs text-slate-400">{file.size ? `${(file.size / 1024).toFixed(0)} KB` : ""}</span><button type="button" onClick={() => void removeAttachment(file)} title="Excluir anexo" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div>)}{editingId && attachments.length === 0 && <p className="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum arquivo anexado.</p>}</div></div>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 px-4 py-3"><label className="mr-auto inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.referenceOnly} onChange={(event) => { setForm({ ...form, referenceOnly: event.target.checked }); setError(""); }} className="h-4 w-4 accent-[var(--primary-color)]"/>Apenas referência<span className="hidden font-normal text-slate-500 sm:inline">(sem vendas a prazo)</span></label><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancelar</button><button disabled={saving} className="rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 shadow-lg shadow-[var(--primary-bg-light)] transition active:scale-95">{saving ? "Gravando..." : "Gravar"}</button></div>
      </form>
    </div>}
    <section className="space-y-6"><div className="flex flex-wrap items-center gap-3 p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[var(--primary-color)]"/><strong>Lista de clientes</strong><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{customers.length}</span></div><label className="relative ml-auto w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input className={`${field} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..."/></label></div>
      {loading ? <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Carregando clientes...</p> : filtered.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">CPF / CNPJ</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((customer) => <tr key={customer.id} className="hover:bg-slate-50/70"><td className="px-4 py-3 text-slate-500 dark:text-slate-400">{customer.code}</td><td className="px-4 py-3"><span className="block font-bold text-slate-800 dark:text-slate-100">{customer.name}</span>{customer.alias && <span className="block text-xs text-slate-500 dark:text-slate-400">{customer.alias}</span>}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{customer.document || "—"}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{customer.phone || "—"}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{customer.email || "—"}</td><td className="px-4 py-3"><div className="flex justify-end gap-1">{selectionMode && <button type="button" onClick={() => onSelectCustomer?.(customer)} className="inline-flex items-center gap-1.5 rounded-2xl bg-[var(--primary-color)] px-3 py-2 text-xs font-black text-white hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary-bg-light)] transition active:scale-95"><ShoppingCart className="h-3.5 w-3.5"/>Selecionar</button>}{!selectionMode && <CustomerActions customer={customer} onEdit={() => startEdit(customer)} onChanged={async (message) => { setMessage(message); await load(); }} />}</div></td></tr>)}</tbody></table></div> : <div className="px-4 py-12 text-center"><UsersRound className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-bold text-slate-700 dark:text-slate-200">{query ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{query ? "Tente outro termo de busca." : "Cadastre clientes para agilizar o preenchimento das vendas."}</p>{!query && <button type="button" onClick={startNew} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-2 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"><Plus className="h-4 w-4"/>Cadastrar primeiro cliente</button>}</div>}
    </section>
  </div>;
}
