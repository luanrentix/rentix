"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
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

export default function AdminPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isSystemOwner = user?.role === "SYSTEM_OWNER";

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

  const latestUsers = useMemo(() => users.slice(0, 12), [users]);
  const latestCompanies = useMemo(() => companies.slice(0, 8), [companies]);

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-orange-600">
              Painel master
            </p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-slate-950">
                  Contas criadas no Rentix
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                  Visão global de empresas e usuários cadastrados. Esta área é
                  restrita ao dono do sistema.
                </p>
              </div>

              <button
                type="button"
                onClick={loadAdminData}
                disabled={!isSystemOwner || isLoading}
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Atualizar
              </button>
            </div>
          </section>

          {!isSystemOwner ? (
            <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-700">
              <h2 className="text-xl font-black">Acesso restrito</h2>
              <p className="mt-2 text-sm font-bold">
                Apenas usuários com perfil Dono do sistema podem acessar esta
                visão.
              </p>
            </section>
          ) : (
            <>
              {errorMessage && (
                <section className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
                  {errorMessage}
                </section>
              )}

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Usuários"
                  value={summary?.totalUsers ?? 0}
                  detail={`${summary?.activeUsers ?? 0} ativos`}
                />
                <MetricCard
                  label="Empresas"
                  value={summary?.totalCompanies ?? 0}
                  detail={`${summary?.activeCompanies ?? 0} ativas`}
                />
                <MetricCard
                  label="Configurações"
                  value={summary?.totalSettings ?? 0}
                  detail="Empresas configuradas"
                />
                <MetricCard
                  label="Inativos"
                  value={(summary?.inactiveUsers ?? 0) + (summary?.inactiveCompanies ?? 0)}
                  detail="Usuários + empresas"
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-12">
                <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-7">
                  <h2 className="text-xl font-black text-slate-950">
                    Usuários cadastrados
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Total atual: {users.length}
                  </p>

                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-orange-50 text-xs font-black uppercase tracking-wide text-orange-700">
                        <tr>
                          <th className="px-4 py-3">Usuário</th>
                          <th className="px-4 py-3">Empresa</th>
                          <th className="px-4 py-3">Perfil</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {latestUsers.map((item) => (
                          <tr key={item.id} className="bg-white">
                            <td className="px-4 py-3">
                              <p className="font-black text-slate-900">{item.name}</p>
                              <p className="text-xs font-semibold text-slate-500">
                                {item.email}
                              </p>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-600">
                              {item.company.tradeName || item.company.companyName}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-600">
                              {roleLabels[item.role] || item.role}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge active={item.isActive} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm xl:col-span-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Empresas
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Últimas empresas cadastradas
                  </p>

                  <div className="mt-5 space-y-3">
                    {latestCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">
                              {company.tradeName || company.companyName}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {company.email || "Sem e-mail informado"}
                            </p>
                          </div>
                          <StatusBadge active={company.isActive} />
                        </div>

                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-black text-slate-600">
                          <SmallCount label="Usuários" value={company._count.users} />
                          <SmallCount label="Pessoas" value={company._count.people} />
                          <SmallCount label="Imóveis" value={company._count.properties} />
                          <SmallCount label="Contratos" value={company._count.contracts} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  detail: string;
};

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2">
      <p className="text-sm text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
    </div>
  );
}
