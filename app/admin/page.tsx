"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleOff,
  Clock3,
  Database,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminCompanies,
  getAdminSummary,
  getAdminUsers,
  type AdminCompany,
  type AdminSummary,
  type AdminUser,
} from "@/services/admin.service";

const roleLabels: Record<string, string> = {
  SYSTEM_OWNER: "Dono do sistema",
  OWNER: "Dono da empresa",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Usuário",
};

type StatusFilter = "all" | "active" | "inactive";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCompanyName(company: AdminCompany | AdminUser["company"]) {
  return company.tradeName || company.companyName || "Empresa sem nome";
}

function getTotalCompanyRecords(company: AdminCompany) {
  return (
    company._count.users +
    company._count.people +
    company._count.properties +
    company._count.contracts
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const isSystemOwner = user?.role === "SYSTEM_OWNER";
  const normalizedSearchTerm = normalizeText(searchTerm);

  useEffect(() => {
    if (!isSystemOwner) {
      setIsLoading(false);
      return;
    }

    loadAdminData();
  }, [isSystemOwner]);

  async function loadAdminData() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [nextSummary, nextUsers, nextCompanies] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(),
        getAdminCompanies(),
      ]);

      setSummary(nextSummary);
      setUsers(nextUsers);
      setCompanies(nextCompanies);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o painel administrativo.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const roleOptions = useMemo(() => {
    const roles = new Set<string>();

    summary?.usersByRole.forEach((item) => roles.add(item.role));
    users.forEach((item) => roles.add(item.role));

    return Array.from(roles);
  }, [summary, users]);

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      if (roleFilter !== "all" && item.role !== roleFilter) return false;
      if (!normalizedSearchTerm) return true;

      return [
        item.name,
        item.email,
        item.role,
        getCompanyName(item.company),
        item.company.email || "",
      ].some((value) => normalizeText(value).includes(normalizedSearchTerm));
    });
  }, [normalizedSearchTerm, roleFilter, statusFilter, users]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (statusFilter === "active" && !company.isActive) return false;
      if (statusFilter === "inactive" && company.isActive) return false;
      if (!normalizedSearchTerm) return true;

      return [
        company.tradeName,
        company.companyName || "",
        company.email || "",
        company.document || "",
        company.phone || "",
      ].some((value) => normalizeText(value).includes(normalizedSearchTerm));
    });
  }, [companies, normalizedSearchTerm, statusFilter]);

  const recentUsers = useMemo(() => {
    return [...filteredUsers]
      .sort(
        (firstUser, secondUser) =>
          new Date(secondUser.createdAt).getTime() -
          new Date(firstUser.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [filteredUsers]);

  const topCompanies = useMemo(() => {
    return [...filteredCompanies].sort(
      (firstCompany, secondCompany) =>
        getTotalCompanyRecords(secondCompany) -
        getTotalCompanyRecords(firstCompany),
    );
  }, [filteredCompanies]);

  const inactiveTotal =
    (summary?.inactiveUsers ?? 0) + (summary?.inactiveCompanies ?? 0);
  const totalOperationalRecords = companies.reduce(
    (total, company) => total + getTotalCompanyRecords(company),
    0,
  );
  const configuredCompaniesPercent = summary?.totalCompanies
    ? Math.round(((summary.totalSettings ?? 0) / summary.totalCompanies) * 100)
    : 0;

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-5 border-b border-slate-100 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Painel master
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {summary?.activeCompanies ?? 0} empresas ativas
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Contas criadas no Contrx
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Visão global de empresas, usuários, configurações e volume de uso
                da plataforma.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAdminData}
              disabled={!isSystemOwner || isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar dados
            </button>
          </div>

          <div className="grid gap-3 bg-slate-50/70 p-4 md:grid-cols-3">
            <HeaderSignal
              icon={<Database className="h-4 w-4" />}
              label="Registros operacionais"
              value={totalOperationalRecords}
            />
            <HeaderSignal
              icon={<Settings2 className="h-4 w-4" />}
              label="Empresas configuradas"
              value={`${configuredCompaniesPercent}%`}
            />
            <HeaderSignal
              icon={<CircleOff className="h-4 w-4" />}
              label="Inativos no ambiente"
              value={inactiveTotal}
              tone="red"
            />
          </div>
        </section>

        {!isSystemOwner ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-xl font-black">Acesso restrito</h2>
                <p className="mt-2 text-sm font-bold">
                  Apenas usuários com perfil Dono do sistema podem acessar esta visão.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            {errorMessage && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {errorMessage}
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<UsersRound className="h-5 w-5" />}
                label="Usuários"
                value={summary?.totalUsers ?? 0}
                detail={`${summary?.activeUsers ?? 0} ativos no sistema`}
                tone="sky"
              />
              <MetricCard
                icon={<Building2 className="h-5 w-5" />}
                label="Empresas"
                value={summary?.totalCompanies ?? 0}
                detail={`${summary?.activeCompanies ?? 0} contas ativas`}
                tone="orange"
              />
              <MetricCard
                icon={<Settings2 className="h-5 w-5" />}
                label="Configurações"
                value={summary?.totalSettings ?? 0}
                detail={`${configuredCompaniesPercent}% das empresas`}
                tone="emerald"
              />
              <MetricCard
                icon={<XCircle className="h-5 w-5" />}
                label="Inativos"
                value={inactiveTotal}
                detail="Usuários e empresas"
                tone="red"
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex items-center gap-2 text-sm font-black text-slate-700 xl:w-40">
                  <SlidersHorizontal className="h-4 w-4 text-orange-600" />
                  Filtros
                </div>

                <label className="relative block min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar empresa, usuário, e-mail, documento ou telefone"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-11 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 xl:w-48"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Somente ativos</option>
                  <option value="inactive">Somente inativos</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 xl:w-48"
                >
                  <option value="all">Todos os perfis</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role] || role}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                <Pill>{filteredUsers.length} usuários</Pill>
                <Pill>{filteredCompanies.length} empresas</Pill>
                <Pill>{roleOptions.length} perfis</Pill>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-8">
                <PanelHeader
                  title="Empresas"
                  subtitle="Contas cadastradas e volume por módulo"
                  action={<StatusSummary active={summary?.activeCompanies ?? 0} inactive={summary?.inactiveCompanies ?? 0} />}
                />

                <div className="grid max-h-[560px] gap-3 overflow-y-auto p-4 md:grid-cols-2">
                  {isLoading ? (
                    <EmptyPanel message="Carregando empresas..." />
                  ) : topCompanies.length === 0 ? (
                    <EmptyPanel message="Nenhuma empresa encontrada." />
                  ) : (
                    topCompanies.map((company) => (
                      <CompanyCard key={company.id} company={company} />
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-5 xl:col-span-4">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <PanelHeader
                    title="Usuários recentes"
                    subtitle="Últimos cadastros encontrados"
                    action={<UserRoundCheck className="h-5 w-5 text-sky-600" />}
                  />

                  <div className="space-y-2 p-4">
                    {isLoading ? (
                      <EmptyPanel message="Carregando usuários..." />
                    ) : recentUsers.length === 0 ? (
                      <EmptyPanel message="Nenhum usuário encontrado." />
                    ) : (
                      recentUsers.map((item) => (
                        <UserCompactCard key={item.id} user={item} />
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <PanelHeader
                    title="Perfis de acesso"
                    subtitle="Distribuição de usuários"
                    action={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
                  />

                  <div className="space-y-3 p-4">
                    {(summary?.usersByRole ?? []).length === 0 ? (
                      <EmptyPanel message="Nenhum perfil encontrado." />
                    ) : (
                      (summary?.usersByRole ?? []).map((item) => (
                        <RoleRow key={item.role} role={item.role} total={item.total} />
                      ))
                    )}
                  </div>
                </section>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <PanelHeader
                title="Usuários cadastrados"
                subtitle={`Total atual: ${users.length}`}
                action={<StatusSummary active={summary?.activeUsers ?? 0} inactive={summary?.inactiveUsers ?? 0} />}
              />

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-y border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Usuário</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3">Perfil</th>
                      <th className="px-5 py-3">Criado em</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <TableState colSpan={5} message="Carregando usuários..." />
                    ) : filteredUsers.length === 0 ? (
                      <TableState colSpan={5} message="Nenhum usuário encontrado." />
                    ) : (
                      filteredUsers.map((item) => (
                        <tr key={item.id} className="bg-white transition hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {item.email}
                            </p>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-600">
                            {getCompanyName(item.company)}
                          </td>
                          <td className="px-5 py-4">
                            <RoleBadge role={item.role} />
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-500">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge active={item.isActive} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

type MetricTone = "orange" | "sky" | "emerald" | "red";

type MetricCardProps = {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: MetricTone;
  value: number;
};

function MetricCard({ detail, icon, label, tone, value }: MetricCardProps) {
  const toneClassNames: Record<MetricTone, string> = {
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClassNames[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-500">{detail}</p>
    </div>
  );
}

function HeaderSignal({
  icon,
  label,
  tone = "default",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "default" | "red";
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            tone === "red" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <strong className="text-lg font-black text-slate-950">{value}</strong>
    </div>
  );
}

function PanelHeader({
  action,
  subtitle,
  title,
}: {
  action?: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function StatusSummary({ active, inactive }: { active: number; inactive: number }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-black">
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {active} ativos
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-red-100">
        <XCircle className="h-3.5 w-3.5" />
        {inactive} inativos
      </span>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-red-50 text-red-700 ring-red-100"
      }`}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
      {roleLabels[role] || role}
    </span>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function TableState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
        {message}
      </td>
    </tr>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {message}
    </div>
  );
}

function CompanyCard({ company }: { company: AdminCompany }) {
  const totalRecords = getTotalCompanyRecords(company);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">
            {getCompanyName(company)}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {company.companyName || "Razão social não informada"}
          </p>
        </div>
        <StatusBadge active={company.isActive} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
        <InfoLine icon={<Mail className="h-3.5 w-3.5" />} value={company.email || "Sem e-mail"} />
        <InfoLine icon={<Phone className="h-3.5 w-3.5" />} value={company.phone || "Sem telefone"} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-black text-slate-600">
        <SmallCount label="Usuários" value={company._count.users} />
        <SmallCount label="Pessoas" value={company._count.people} />
        <SmallCount label="Imóveis" value={company._count.properties} />
        <SmallCount label="Contratos" value={company._count.contracts} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-orange-600" />
          Criada em {formatDate(company.createdAt)}
        </span>
        <strong className="shrink-0 text-slate-800">{totalRecords} registros</strong>
      </div>
    </article>
  );
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2 py-2">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function UserCompactCard({ user }: { user: AdminUser }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {user.email}
          </p>
        </div>
        <StatusBadge active={user.isActive} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RoleBadge role={user.role} />
        <span className="text-xs font-bold text-slate-500">
          {formatDate(user.createdAt)}
        </span>
      </div>
    </article>
  );
}

function RoleRow({ role, total }: { role: string; total: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
      <span className="text-sm font-black text-slate-700">
        {roleLabels[role] || role}
      </span>
      <strong className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-950 ring-1 ring-slate-200">
        {total}
      </strong>
    </div>
  );
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-black text-slate-400">{label}</p>
    </div>
  );
}
