"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { toolPermissionOptions } from "@/services/tool-permissions";
import { moduleActions, actionLabels } from "@/services/access-actions";
import type { CompanyUser } from "@/services/company-users.service";

type AccessForm = {
  emailLoginEnabled: boolean;
  userLoginEnabled: boolean;
  username: string;
  maxConcurrentSessions: number;
  actionPermissions: string[] | null;
  confirmPassword: string;
  permissions: string[];
  role: string;
};
const fieldClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400";
export function UserAccessFields({
  form,
  onChange,
}: {
  form: AccessForm;
  onChange: (
    patch: Partial<
      Pick<
        AccessForm,
        | "username"
        | "maxConcurrentSessions"
        | "actionPermissions"
        | "confirmPassword"
      >
    >,
  ) => void;
}) {
  const all = toolPermissionOptions
    .filter((m) => form.permissions.includes(m.key))
    .flatMap((m) => (moduleActions[m.key] || []).map((a) => `${m.key}:${a}`));
  const selected = form.actionPermissions ?? all;
  function group(keys: string[], checked: boolean) {
    onChange({
      actionPermissions: checked
        ? [...new Set([...selected, ...keys])]
        : selected.filter((k) => !keys.includes(k)),
    });
  }
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold">
          Usuário de acesso
          <input
            className={fieldClass}
            value={form.username}
            onChange={(e) =>
              onChange({ username: e.target.value.toLowerCase() })
            }
            pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{1,59}"
            maxLength={60}
            required={form.userLoginEnabled && !form.emailLoginEnabled}
            disabled={!form.userLoginEnabled}
            placeholder="Ex.: caixa01"
          />
          <span className="block text-xs font-normal text-slate-500">
            Único nesta empresa. Obrigatório para acesso de usuário sem e-mail.
          </span>
        </label>
        <label className="space-y-2 text-sm font-bold">
          Quantidade máxima de acessos simultâneos
          <input
            type="number"
            min={1}
            max={20}
            required
            className={fieldClass}
            value={form.maxConcurrentSessions}
            onChange={(e) =>
              onChange({ maxConcurrentSessions: Number(e.target.value) })
            }
          />
        </label>
        <label className="space-y-2 text-sm font-bold">
          Confirmar senha
          <input
            type="password"
            className={fieldClass}
            value={form.confirmPassword}
            onChange={(e) => onChange({ confirmPassword: e.target.value })}
            autoComplete="new-password"
            placeholder="Repita a senha informada"
          />
        </label>
      </div>
      <h4 className="font-bold">Permissões de acesso</h4>
      {["ADMIN", "OWNER", "SYSTEM_OWNER"].includes(form.role) && (
        <p className="text-xs text-slate-500">
          Este perfil mantém acesso administrativo completo. Restrições por ação
          são aplicadas aos perfis operacionais.
        </p>
      )}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.actionPermissions !== null}
          onChange={(e) =>
            onChange({ actionPermissions: e.target.checked ? all : null })
          }
        />
        Configurar permissões por ação
      </label>
      {form.actionPermissions === null ? (
        <p className="text-xs text-slate-500">
          Mantém as permissões atuais dos módulos selecionados.
        </p>
      ) : (
        toolPermissionOptions
          .filter((m) => form.permissions.includes(m.key))
          .map((module) => {
            const keys = (moduleActions[module.key] || []).map(
              (a) => `${module.key}:${a}`,
            );
            return (
              <fieldset
                key={module.key}
                className="rounded-xl border border-slate-100 p-3"
              >
                <legend className="px-1 text-sm font-bold">
                  {module.label}
                </legend>
                <div className="mb-2 flex gap-3 text-xs">
                  <button type="button" onClick={() => group(keys, true)}>
                    Selecionar grupo
                  </button>
                  <button type="button" onClick={() => group(keys, false)}>
                    Limpar grupo
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {keys.map((key) => (
                    <label key={key} className="flex gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selected.includes(key)}
                        onChange={(e) => group([key], e.target.checked)}
                      />
                      {actionLabels[key.split(":")[1]]}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })
      )}
    </div>
  );
}

export function UserLoginMethods({
  form,
  onChange,
}: {
  form: { emailLoginEnabled: boolean; userLoginEnabled: boolean };
  onChange: (patch: {
    emailLoginEnabled?: boolean;
    userLoginEnabled?: boolean;
  }) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <legend className="px-2 text-sm font-bold">
        Formas de login permitidas
      </legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.emailLoginEnabled}
          onChange={(e) => onChange({ emailLoginEnabled: e.target.checked })}
        />
        Acesso administrativo — e-mail e senha
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.userLoginEnabled}
          onChange={(e) => onChange({ userLoginEnabled: e.target.checked })}
        />
        Acesso de usuário — código da empresa, usuário e senha
      </label>
      <p className="text-xs text-slate-500">
        Marque uma ou ambas as opções. O tipo de login não altera a função nem
        as permissões do usuário.
      </p>
      {!form.emailLoginEnabled && !form.userLoginEnabled && (
        <p role="alert" className="text-xs text-red-600">
          Selecione ao menos uma forma de login.
        </p>
      )}
    </fieldset>
  );
}

type Session = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  reason: string | null;
  device: string | null;
};
export function CompanySessionSettings({ users }: { users: CompanyUser[] }) {
  const [company, setCompany] = useState<{
    code: string;
    tradeName: string;
  } | null>(null);
  const [selected, setSelected] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<{
    userId: string;
    sessionId?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    apiFetch<{ code: string; tradeName: string }>(
      "/autenticacao/empresa-codigo",
      { skipCache: true },
    )
      .then((value) => {
        if (active) setCompany(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setSessions([]);
    setError("");
    setBusy(false);
    if (!selected) return;
    let active = true;
    setBusy(true);
    apiFetch<Session[]>(`/autenticacao/usuarios/${selected}/sessoes`, {
      skipCache: true,
    })
      .then((value) => {
        if (active) setSessions(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [selected]);
  async function refresh(id: string) {
    setSessions(
      await apiFetch<Session[]>(`/autenticacao/usuarios/${id}/sessoes`, {
        skipCache: true,
      }),
    );
  }
  async function revoke() {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiFetch(
        `/autenticacao/usuarios/${confirm.userId}/sessoes${confirm.sessionId ? "/" + confirm.sessionId : ""}/encerrar`,
        { method: "POST" },
      );
      await refresh(confirm.userId);
      setConfirm(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao encerrar sessão.",
      );
    } finally {
      setBusy(false);
    }
  }
  const currentUser = users.find((u) => u.id === selected);
  const activeCount = sessions.filter(
    (s) => !s.revokedAt && new Date(s.expiresAt) > new Date(),
  ).length;
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold">Identificação da empresa e sessões</h3>
      {company && (
        <div className="space-y-2">
          <p className="text-sm">
            {company.tradeName} — Código da empresa:{" "}
            <strong className="break-all">{company.code}</strong>
          </p>
          <button
            type="button"
            className="text-sm font-bold text-orange-600"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(company.code);
                setCopied(true);
              } catch {
                setError(
                  "Não foi possível copiar. Selecione o código para copiá-lo.",
                );
              }
            }}
          >
            {copied ? "Código copiado!" : "Copiar código"}
          </button>
        </div>
      )}
      <label className="block text-sm font-bold">
        Consultar sessões do usuário
        <select
          disabled={busy || !!confirm}
          className={fieldClass}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecione um usuário</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.username || u.email}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              {activeCount} sessão(ões) ativa(s) / limite{" "}
              {currentUser?.maxConcurrentSessions || 1}
            </span>
            <button
              disabled={busy}
              type="button"
              onClick={() => {
                setBusy(true);
                refresh(selected)
                  .catch((err) => setError(err.message))
                  .finally(() => setBusy(false));
              }}
            >
              Atualizar
            </button>
            <button
              disabled={busy || !activeCount}
              type="button"
              className="text-red-600"
              onClick={() => setConfirm({ userId: selected })}
            >
              Encerrar todas
            </button>
          </div>
          {busy && <p className="text-sm">Carregando...</p>}
          <p className="text-xs text-slate-500">
            Todas as sessões ativas e até 100 registros recentes do histórico.
          </p>
          <div className="max-h-80 space-y-2 overflow-auto">
            {sessions.map((session) => {
              const active =
                !session.revokedAt && new Date(session.expiresAt) > new Date();
              return (
                <div
                  className="rounded-xl border border-slate-100 p-3 text-xs"
                  key={session.id}
                >
                  <p className="break-all font-bold">{session.device}</p>
                  <p>
                    Login: {new Date(session.createdAt).toLocaleString("pt-BR")}{" "}
                    · Última atividade:{" "}
                    {new Date(session.lastSeenAt).toLocaleString("pt-BR")}
                  </p>
                  <p>
                    Identificação: {session.id.slice(-8)} · Expiração:{" "}
                    {new Date(session.expiresAt).toLocaleString("pt-BR")}
                  </p>
                  <p>
                    Status:{" "}
                    {active
                      ? "Ativa"
                      : session.revokedAt
                        ? "Encerrada"
                        : "Expirada"}
                  </p>
                  {active && (
                    <button
                      type="button"
                      disabled={busy}
                      className="mt-2 font-bold text-red-600"
                      onClick={() =>
                        setConfirm({ userId: selected, sessionId: session.id })
                      }
                    >
                      Encerrar sessão
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {confirm && (
        <div
          role="group"
          aria-label="Confirmar encerramento"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          <p>
            Encerrar{" "}
            {confirm.sessionId
              ? "esta sessão"
              : "todas as sessões deste usuário"}
            ? O acesso será bloqueado e será necessário entrar novamente.
          </p>
          <div className="mt-3 flex gap-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              className="font-bold text-red-600"
              onClick={revoke}
            >
              Confirmar encerramento
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
