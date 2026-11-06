"use client";

import SellerActions from "./vendedor-acoes";
import SellerModal, { emptySellerForm, formatSellerDocument, type SellerForm } from "./vendedor-modal";
import SalesPageHeader from "./sales-page-header";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import { checkSalesSellerDocument, createSalesSeller, getSalesSellers, updateSalesSeller, type SalesSeller, type SalesSellerInput } from "@/services/vendas.service";

const digits = (value: string) => value.replace(/\D/g, "");
const field = "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold uppercase text-slate-800 outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const formatCpf = (value: string) => formatSellerDocument(value, digits(value).length === 14);

const emptyForm: SellerForm = emptySellerForm;

export default function SalesSellersPanel() {
  const [sellers, setSellers] = useState<SalesSeller[]>([]);
  const [viewing, setViewing] = useState<SalesSeller | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<SellerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingCpf, setCheckingCpf] = useState(false);
  const [cpfFeedback, setCpfFeedback] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const cpfRef = useRef("");
  const cpfRequest = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSellers(await getSalesSellers()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os vendedores."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return term ? sellers.filter((seller) => `${seller.code} ${seller.name} ${seller.alias || ""} ${seller.document || ""} ${seller.phone || ""} ${seller.email || ""}`.toLocaleLowerCase("pt-BR").includes(term)) : sellers;
  }, [sellers, query]);

  function startNew() { cpfRequest.current++; setCheckingCpf(false); setForm(emptyForm); setEditingId(null); setCpfFeedback(""); cpfRef.current = ""; setError(""); setMessage(""); setOpen(true); }
  function startEdit(seller: SalesSeller) {
    const personType = seller.personType || (digits(seller.document || "").length === 14 ? "COMPANY" : "INDIVIDUAL");
    setForm({ ...emptyForm, personType, name: seller.name, document: seller.document ? formatSellerDocument(seller.document, personType === "COMPANY") : "", phone: seller.phone || "", email: seller.email || "", commission: Number(seller.commission).toFixed(2).replace(".", ","), alias: seller.alias || "", identityNumber: seller.identityNumber || "", issuingAuthority: seller.issuingAuthority || "", birthDate: seller.birthDate?.slice(0,10) || "", sex: seller.sex || "", phone2: seller.phone2 || "", zipCode: seller.zipCode || "", address: seller.address || "", number: seller.number || "", complement: seller.complement || "", neighborhood: seller.neighborhood || "", city: seller.city || "", state: seller.state || "", notes: seller.notes || "" });
    cpfRequest.current++; setCheckingCpf(false); setEditingId(seller.id); cpfRef.current = digits(seller.document || ""); setCpfFeedback(""); setError(""); setMessage(""); setOpen(true);
  }

  async function verifyCpf(value = form.document) {
    const normalized = digits(value); const label = form.personType === "COMPANY" ? "CNPJ" : "CPF";
    const request = ++cpfRequest.current; cpfRef.current = normalized;
    setCpfFeedback(""); setCheckingCpf(false);
    if (!normalized) return;
    if (normalized.length !== (form.personType === "COMPANY" ? 14 : 11)) { setCpfFeedback(`Informe um ${label} completo.`); return; }
    setCheckingCpf(true);
    try {
      const result = await checkSalesSellerDocument(normalized, editingId || undefined);
      if (request === cpfRequest.current) setCpfFeedback(result.exists ? `Documento já cadastrado para outro vendedor: ${label}.` : `${label} válido e disponível.`);
    } catch (cause) { if (request === cpfRequest.current) setCpfFeedback(cause instanceof Error ? cause.message : "Falha ao verificar CPF/CNPJ."); }
    finally { if (request === cpfRequest.current) setCheckingCpf(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const cpf = digits(form.document);
    if (cpf && cpf.length !== (form.personType === "COMPANY" ? 14 : 11)) { setError("Informe um CPF ou CNPJ completo ou deixe o campo vazio."); setCpfFeedback("Confira o CPF/CNPJ informado."); return; }
    const commission = Number(form.commission.includes(",") ? form.commission.replace(/\./g, "").replace(",", ".") : form.commission);
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) { setError("A comissão deve estar entre 0 e 100%."); return; }
    setSaving(true); setError("");
    const data: SalesSellerInput = { ...Object.fromEntries(["alias", "identityNumber", "issuingAuthority", "birthDate", "sex", "phone2", "zipCode", "address", "number", "complement", "neighborhood", "city", "state", "notes"].map(key => [key, form[key as keyof SellerForm].trim() || null])), personType: form.personType, name: form.name.trim().toLocaleUpperCase("pt-BR"), document: cpf || null, phone: form.phone.trim() || null, email: form.email.trim().toLowerCase() || null, commission };
    try {
      if (cpf) {
        const result = await checkSalesSellerDocument(cpf, editingId || undefined);
        if (result.exists) { const duplicate = "Já existe um vendedor cadastrado com este CPF/CNPJ."; setCpfFeedback(duplicate); setError(duplicate); setSaving(false); return; }
      }
      if (editingId) await updateSalesSeller(editingId, data); else await createSalesSeller(data);
      setMessage(editingId ? "Vendedor atualizado com sucesso." : "Vendedor cadastrado com sucesso."); setOpen(false); setForm(emptyForm); setEditingId(null); setCpfFeedback(""); await load();
    } catch (cause) { const text = cause instanceof Error ? cause.message : "Não foi possível salvar o vendedor."; setError(text); if (cpf) setCpfFeedback(text); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <SalesPageHeader title="Vendedores" description="Gerencie a equipe de vendas e as comissões dos vendedores." icon={UserRound}><button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary-bg-light)] transition active:scale-95"><Plus className="h-4 w-4"/>Novo vendedor</button></SalesPageHeader>
    {error && !open && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}{message && <div role="status" className="rounded-xl border border-[var(--primary-border-light)] bg-[var(--primary-bg-light)] px-4 py-3 text-sm font-semibold text-[var(--primary-color)]">{message}</div>}
    <section className="space-y-6"><div className="flex flex-wrap items-center gap-3 p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-[var(--primary-color)]"/><strong>Lista de vendedores</strong><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{sellers.length}</span></div><label className="relative ml-auto w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input className={`${field} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar vendedor..."/></label></div>
      {loading ? <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Carregando vendedores...</p> : filtered.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Vendedor</th><th className="px-4 py-3">CPF / CNPJ</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3 text-right">Comissão</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((seller) => <tr key={seller.id} className="hover:bg-slate-50/70"><td className="px-4 py-3 text-slate-500 dark:text-slate-400">{seller.code}</td><td className="px-4 py-3"><span className="block font-bold text-slate-800 dark:text-slate-100">{seller.name}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{seller.email || "Sem e-mail"}</span></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{seller.document ? formatCpf(seller.document) : "—"}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{seller.phone || "—"}</td><td className="px-4 py-3 text-right font-semibold">{Number(seller.commission).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%</td><td className="px-4 py-3"><div className="flex justify-end"><SellerActions seller={seller} onEdit={() => startEdit(seller)} onView={() => setViewing(seller)} onChanged={async (message) => { setMessage(message); await load(); }}/></div></td></tr>)}</tbody></table></div> : <div className="px-4 py-12 text-center"><UserRound className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-bold text-slate-700 dark:text-slate-200">{query ? "Nenhum vendedor encontrado" : "Nenhum vendedor cadastrado"}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{query ? "Tente outro termo de busca." : "Cadastre vendedores para associá-los às vendas."}</p>{!query && <button type="button" onClick={startNew} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-2 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"><Plus className="h-4 w-4"/>Cadastrar primeiro vendedor</button>}</div>}
    </section>
    {viewing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-label="Visualizar vendedor" className="w-full max-w-lg space-y-3 rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900"><h2 className="text-xl font-black">{viewing.name}</h2><p>Código: {viewing.code}</p><p>CPF / CNPJ: {viewing.document ? formatCpf(viewing.document) : "Não informado"}</p><p>Telefone: {viewing.phone || "Não informado"}</p><p>E-mail: {viewing.email || "Não informado"}</p><p>Comissão: {Number(viewing.commission).toLocaleString("pt-BR")}%</p><button autoFocus type="button" className="rounded-xl border px-4 py-2" onClick={() => setViewing(null)}>Fechar</button></section></div>}
    {open && <SellerModal form={form} setForm={setForm} editingId={editingId} code={sellers.find(seller => seller.id === editingId)?.code} saving={saving} error={error} checking={checkingCpf} feedback={cpfFeedback} onDocumentChange={value => { cpfRequest.current++; cpfRef.current = digits(value); setCheckingCpf(false); setCpfFeedback(""); setForm(current => ({ ...current, document: value })); }} verifyDocument={() => void verifyCpf()} onSubmit={event => void submit(event)} onClose={() => { cpfRequest.current++; setOpen(false); }} />}
  </div>;
}
