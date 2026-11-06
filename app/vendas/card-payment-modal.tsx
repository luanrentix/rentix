"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Plus, Save, X } from "lucide-react";
import {
  createCardAdministrator,
  listCardAdministrators,
  type CardAdministrator,
  type SalesCardPayment,
} from "@/services/sales-cards";

const field =
  "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[var(--primary-color)]";
export default function CardPaymentModal({
  method,
  amount,
  initial,
  onSave,
  onClose,
}: {
  method: SalesCardPayment["method"];
  amount: number;
  initial?: SalesCardPayment;
  onSave: (value: SalesCardPayment) => void;
  onClose: () => void;
}) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [admins, setAdmins] = useState<CardAdministrator[]>([]);
  const [form, setForm] = useState({
    administratorId: initial?.administratorId || "",
    brand: initial?.brand || "",
    lastFour: initial?.lastFour || "",
    holderName: initial?.holderName || "",
    nsu: initial?.nsu || "",
    authorizationCode: initial?.authorizationCode || "",
    installments: method === "CARTAO_DEBITO" ? 1 : initial?.installments || 1,
  });
  const [loading, setLoading] = useState(true),
    [creating, setCreating] = useState(false),
    [newName, setNewName] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    listCardAdministrators()
      .then((values) => {
        if (active) {
          setAdmins(values);
          if (values.length === 1)
            setForm((current) => ({
              ...current,
              administratorId: current.administratorId || values[0].id,
            }));
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Falha ao carregar administradoras.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function create() {
    if (newName.trim().length < 2 || creating) return;
    setCreating(true);
    setError("");
    try {
      const admin = await createCardAdministrator(newName.trim());
      setAdmins((current) => [
        ...current.filter((item) => item.id !== admin.id),
        admin,
      ]);
      setForm((current) => ({ ...current, administratorId: admin.id }));
      setNewName("");
      setShowAdminForm(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível cadastrar a administradora.",
      );
    } finally {
      setCreating(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-title"
        onSubmit={(event) => {
          event.preventDefault();
          const admin = admins.find((item) => item.id === form.administratorId);
          if (
            !admin ||
            !form.brand.trim() ||
            !form.nsu.trim() ||
            (form.lastFour && !/^\d{4}$/.test(form.lastFour)) ||
            amount <= 0 ||
            !Number.isFinite(amount)
          ) {
            setError(
              "Confira a administradora, bandeira, NSU, últimos quatro dígitos e valor do pagamento.",
            );
            return;
          }
          onSave({
            ...form,
            method,
            amount,
            administratorName: admin.name,
            lastFour: form.lastFour || undefined,
            holderName: form.holderName || undefined,
            authorizationCode: form.authorizationCode || undefined,
          });
        }}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
      >
        <header className="flex items-start justify-between border-b p-5">
          <div className="flex gap-3">
            <span className="rounded-2xl bg-[var(--primary-bg-light)] p-2.5 text-[var(--primary-color)]">
              <CreditCard size={24} />
            </span>
            <div>
              <h2 id="card-title" className="text-lg font-black text-slate-900 dark:text-white">
                Cartão de {method === "CARTAO_CREDITO" ? "crédito" : "débito"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Selecione a administradora e informe os dados do comprovante.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar dados do cartão"
            disabled={creating}
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400"
          >
            <X size={19} />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50/75 dark:bg-slate-800/50 p-4">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              Valor no cartão
            </span>
            <strong className="text-xl text-[var(--primary-color)]">
              {amount.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              Administradora *
            </span>
            <select
              autoFocus
              required
              disabled={loading || creating}
              className={field}
              value={form.administratorId}
              onChange={(e) =>
                setForm({ ...form, administratorId: e.target.value })
              }
            >
              <option value="">
                {loading ? "Carregando…" : "Selecione a administradora"}
              </option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" aria-label="Cadastrar administradora" title="Cadastrar administradora" aria-expanded={showAdminForm} aria-controls="new-card-administrator" disabled={loading || creating} onClick={() => setShowAdminForm((current) => !current)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-[var(--primary-color)] hover:bg-[var(--primary-bg-light)] disabled:opacity-40 dark:border-slate-700"><Plus size={18}/></button>
          </div>
          {showAdminForm && <div id="new-card-administrator" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 p-3">
            <label className="min-w-40 flex-1 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Cadastrar administradora
              </span>
              <input
                className={field}
                autoFocus
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void create(); } }}
                placeholder="Nome da administradora / maquininha"
                maxLength={120}
                value={newName}
                disabled={creating}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => void create()}
              disabled={creating || newName.trim().length < 2}
              className="inline-flex h-11 items-center gap-1 rounded-xl border bg-white dark:bg-slate-900 px-3 text-xs font-bold text-[var(--primary-color)] disabled:opacity-40"
            >
              {creating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              Cadastrar
            </button>
            <button type="button" disabled={creating} onClick={() => { setShowAdminForm(false); setNewName(""); }} aria-label="Cancelar cadastro da administradora" title="Cancelar cadastro" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-slate-700"><X size={16}/></button>
          </div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Bandeira *
              </span>
              <input
                required
                list="card-brands"
                maxLength={40}
                className={field}
                placeholder="Selecione ou informe"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
              <datalist id="card-brands">
                {[
                  "Visa",
                  "Mastercard",
                  "Elo",
                  "American Express",
                  "Hipercard",
                  "Outras",
                ].map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Últimos 4 dígitos
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                className={field}
                placeholder="0000"
                value={form.lastFour}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lastFour: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Nome do titular (opcional)
              </span>
              <input
                maxLength={120}
                className={field}
                value={form.holderName}
                onChange={(e) =>
                  setForm({ ...form, holderName: e.target.value })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                NSU / número da transação *
              </span>
              <input
                required
                maxLength={80}
                className={field}
                value={form.nsu}
                onChange={(e) => setForm({ ...form, nsu: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Código de autorização
              </span>
              <input
                maxLength={80}
                className={field}
                value={form.authorizationCode}
                onChange={(e) =>
                  setForm({ ...form, authorizationCode: e.target.value })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Parcelas no cartão
              </span>
              <input
                required
                type="number"
                min="1"
                max={method === "CARTAO_DEBITO" ? "1" : "60"}
                disabled={method === "CARTAO_DEBITO"}
                className={field}
                value={form.installments}
                onChange={(e) =>
                  setForm({ ...form, installments: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Dados do comprovante da maquininha. A aprovação é confirmada na
            operadora. Informe apenas os últimos quatro dígitos do cartão.
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t bg-slate-50 p-4">
          <button
            type="button"
            disabled={creating}
            onClick={onClose}
            className="rounded-xl border bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            disabled={loading || creating}
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
          >
            <Save size={16} />
            Confirmar cartão
          </button>
        </footer>
      </form>
    </div>
  );
}
