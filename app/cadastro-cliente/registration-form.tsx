"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import {
  getPublicSalesCustomerRegistration,
  lookupSalesAddress,
  submitPublicSalesCustomerRegistration,
  type PublicSalesCustomerRegistrationInput,
  type SalesCustomerRegistrationInfo,
} from "@/services/vendas.service";

type PersonType = "INDIVIDUAL" | "COMPANY";

type FormState = Omit<
  PublicSalesCustomerRegistrationInput,
  "token" | "consented" | "phone" | "address"
> & { phone: string; address: string };

const initialForm: FormState = {
  personType: "INDIVIDUAL",
  name: "",
  document: "",
  phone: "",
  email: "",
  zipCode: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

function formatDocument(value: string, personType: PersonType) {
  if (personType === "INDIVIDUAL") {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
  return `${cnpj.slice(0, 2)}${cnpj.length > 2 ? `.${cnpj.slice(2, 5)}` : ""}${cnpj.length > 5 ? `.${cnpj.slice(5, 8)}` : ""}${cnpj.length > 8 ? `/${cnpj.slice(8, 12)}` : ""}${cnpj.length > 12 ? `-${cnpj.slice(12, 14)}` : ""}`;
}

export default function CustomerRegistrationPage({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState("");
  const [company, setCompany] = useState<SalesCustomerRegistrationInfo | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpZipCode, setLookingUpZipCode] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const linkToken = initialToken || window.location.hash.replace(/^#/, "");
    if (!linkToken) {
      setError("O link de cadastro está incompleto. Solicite um novo à empresa.");
      setLoading(false);
      return;
    }

    setToken(linkToken);
    getPublicSalesCustomerRegistration(linkToken)
      .then(setCompany)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Este link é inválido ou expirou. Solicite um novo à empresa.",
        ),
      )
      .finally(() => setLoading(false));
  }, [initialToken]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function lookupZipCode(value: string) {
    const zipCode = value.replace(/\D/g, "");
    if (zipCode.length !== 8) return;

    setLookingUpZipCode(true);
    try {
      const address = await lookupSalesAddress(zipCode);
      setForm((current) =>
        (current.zipCode || "").replace(/\D/g, "") === zipCode
          ? {
              ...current,
              zipCode: address.zipCode || current.zipCode,
              address: address.address || current.address,
              complement: address.complement || current.complement,
              neighborhood: address.neighborhood || current.neighborhood,
              city: address.city || current.city,
              state: address.state || current.state,
            }
          : current,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar o CEP.",
      );
    } finally {
      setLookingUpZipCode(false);
    }
  }

  function handleZipCodeChange(value: string) {
    update("zipCode", value);
    void lookupZipCode(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await submitPublicSalesCustomerRegistration({
        ...form,
        token,
        consented,
      });
      setComplete(true);
      window.history.replaceState(null, "", window.location.pathname);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível enviar os dados. Confira as informações e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <header className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-3">
            {company?.logo ? <img src={company.logo} alt={`Logo de ${company.companyName}`} className="h-14 max-w-36 rounded-xl bg-white p-1 object-contain" /> : <span className="rounded-2xl bg-white/15 p-3"><UserRound className="h-6 w-6" aria-hidden="true" /></span>}
            <div>
              <p className="text-sm font-semibold text-orange-50">Cadastro de cliente</p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                {company?.companyName || "Seus dados"}
              </h1>
            </div>
          </div>
          {company && <div className="mt-3 text-xs text-orange-50">{[company.companyDocument, company.companyPhone, company.companyEmail, company.website].filter(Boolean).join(" · ")}</div>}
          <p className="mt-4 max-w-xl text-sm leading-6 text-orange-50">
            Preencha as informações abaixo para concluir seu cadastro.
          </p>
        </header>

        <section className="p-5 sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Validando link de cadastro…
            </div>
          ) : complete ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="mt-4 text-xl font-black text-slate-900">Cadastro enviado</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Seus dados foram recebidos por {company?.companyName || "a empresa"}.
                Você já pode fechar esta página.
              </p>
            </div>
          ) : error && !company ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-800">
              {error}
            </div>
          ) : (
            <form onSubmit={(event) => void submit(event)} className="space-y-5">
              <div>
                <span className="mb-2 block text-sm font-bold text-slate-800">Tipo de cadastro</span>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {([
                    ["INDIVIDUAL", "Pessoa física · CPF"],
                    ["COMPANY", "Pessoa jurídica · CNPJ"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        update("personType", value);
                        update("document", "");
                      }}
                      className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${form.personType === value ? "bg-white text-orange-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-sm font-bold text-slate-800">
                    {form.personType === "COMPANY" ? "Razão social" : "Nome completo"} <b className="text-red-600">*</b>
                  </span>
                  <input className={fieldClass} autoComplete="name" maxLength={160} required value={form.name} onChange={(event) => update("name", event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-sm font-bold text-slate-800">
                    {form.personType === "COMPANY" ? "CNPJ" : "CPF"} <b className="text-red-600">*</b>
                  </span>
                  <input
                    className={fieldClass}
                    autoComplete="off"
                    inputMode={form.personType === "COMPANY" ? "text" : "numeric"}
                    maxLength={form.personType === "COMPANY" ? 18 : 14}
                    required
                    value={form.document}
                    onChange={(event) => update("document", formatDocument(event.target.value, form.personType))}
                    placeholder={form.personType === "COMPANY" ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-sm font-bold text-slate-800">Telefone / WhatsApp <b className="text-red-600">*</b></span>
                  <input className={fieldClass} autoComplete="tel" inputMode="tel" maxLength={30} required value={form.phone || ""} onChange={(event) => update("phone", event.target.value)} placeholder="(00) 00000-0000" />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-sm font-bold text-slate-800">E-mail</span>
                  <input className={fieldClass} autoComplete="email" type="email" maxLength={160} value={form.email || ""} onChange={(event) => update("email", event.target.value)} placeholder="voce@exemplo.com" />
                </label>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h2 className="mb-4 text-base font-black text-slate-900">Endereço</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-800">CEP {lookingUpZipCode && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-orange-600" aria-label="Buscando endereço" />}</span>
                    <input className={fieldClass} autoComplete="postal-code" inputMode="numeric" maxLength={12} value={form.zipCode || ""} onChange={(event) => handleZipCodeChange(event.target.value)} />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="block text-sm font-bold text-slate-800">Logradouro <b className="text-red-600">*</b></span>
                    <input className={fieldClass} autoComplete="street-address" maxLength={160} required value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Rua, avenida, estrada…" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-sm font-bold text-slate-800">Número</span>
                    <input className={fieldClass} maxLength={20} value={form.number || ""} onChange={(event) => update("number", event.target.value)} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-sm font-bold text-slate-800">Complemento</span>
                    <input className={fieldClass} maxLength={100} value={form.complement || ""} onChange={(event) => update("complement", event.target.value)} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-sm font-bold text-slate-800">Bairro</span>
                    <input className={fieldClass} autoComplete="address-level3" maxLength={100} value={form.neighborhood || ""} onChange={(event) => update("neighborhood", event.target.value)} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-sm font-bold text-slate-800">Cidade</span>
                    <input className={fieldClass} autoComplete="address-level2" maxLength={100} value={form.city || ""} onChange={(event) => update("city", event.target.value)} />
                  </label>
                  <label className="space-y-1.5 sm:max-w-40">
                    <span className="block text-sm font-bold text-slate-800">UF</span>
                    <input className={fieldClass} autoComplete="address-level1" maxLength={2} value={form.state || ""} onChange={(event) => update("state", event.target.value.toUpperCase())} />
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <input className="mt-1 h-4 w-4 accent-orange-600" type="checkbox" required checked={consented} onChange={(event) => setConsented(event.target.checked)} />
                <span>
                  Autorizo {company?.companyName || "a empresa"} a utilizar os dados informados para identificar meu cadastro e entrar em contato sobre seus serviços.
                </span>
              </label>

              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

              <button type="submit" disabled={saving || !consented} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Enviando cadastro…</> : "Enviar cadastro"}
              </button>
              <p className="text-center text-xs text-slate-400">O link é individual, válido por 7 dias e pode ser usado uma única vez.</p>
            </form>
          )}
        </section>
      </div>
      <p className="mx-auto mt-5 max-w-lg text-center text-xs text-slate-400">Cadastro seguro enviado por {company?.companyName || "a loja"}</p>
    </main>
  );
}
