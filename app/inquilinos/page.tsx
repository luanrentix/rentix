"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { Tenant, initialTenants } from "@/data/tenants";

const STORAGE_KEY = "rentix_tenants";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantDocument, setTenantDocument] = useState("");

  const isEditing = editingTenantId !== null;

  useEffect(() => {
    const storedTenants = localStorage.getItem(STORAGE_KEY);

    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants) as Tenant[];
      setTenants(parsedTenants.length > 0 ? parsedTenants : initialTenants);
    } else {
      setTenants(initialTenants);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  }, [tenants, isLoaded]);

  function resetForm() {
    setTenantName("");
    setTenantPhone("");
    setTenantDocument("");
    setEditingTenantId(null);
    setIsFormOpen(false);
  }

  function handleSubmitTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEditing) {
      setTenants((currentTenants) =>
        currentTenants.map((tenant) =>
          tenant.id === editingTenantId
            ? {
                ...tenant,
                name: tenantName,
                phone: tenantPhone,
                document: tenantDocument,
              }
            : tenant
        )
      );

      resetForm();
      return;
    }

    const newTenant: Tenant = {
      id: Date.now(),
      name: tenantName,
      phone: tenantPhone,
      document: tenantDocument,
    };

    setTenants((currentTenants) => [newTenant, ...currentTenants]);
    resetForm();
  }

  function handleEditTenant(tenant: Tenant) {
    setEditingTenantId(tenant.id);
    setTenantName(tenant.name);
    setTenantPhone(tenant.phone);
    setTenantDocument(tenant.document);
    setIsFormOpen(true);
  }

  function handleDeleteTenant(tenant: Tenant) {
    setTenantToDelete(tenant);
  }

  function handleConfirmDeleteTenant() {
    if (!tenantToDelete) return;

    setTenants((currentTenants) =>
      currentTenants.filter((t) => t.id !== tenantToDelete.id)
    );

    setTenantToDelete(null);
  }

  function handleCancelDeleteTenant() {
    setTenantToDelete(null);
  }

  return (
    <AppShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Inquilinos
            </h1>
            <p className="mt-2 text-slate-500">
              Gerencie os inquilinos cadastrados
            </p>
          </div>

          <button
            onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            {isFormOpen ? "Fechar" : "+ Novo inquilino"}
          </button>
        </div>

        {/* FORM */}
        {isFormOpen && (
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-950">
                {isEditing ? "Editar inquilino" : "Novo inquilino"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Preencha as informações do inquilino
              </p>
            </div>

            <form onSubmit={handleSubmitTenant}>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Nome completo"
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                <input
                  type="text"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  placeholder="Telefone"
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                <input
                  type="text"
                  value={tenantDocument}
                  onChange={(e) => setTenantDocument(e.target.value)}
                  placeholder="CPF/CNPJ"
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 hover:bg-orange-600"
                >
                  {isEditing ? "Salvar alterações" : "Cadastrar inquilino"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABLE */}
        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-2xl font-black text-slate-950">
              Lista de inquilinos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tenants.length} inquilino(s) cadastrado(s)
            </p>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Nome</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Telefone</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">CPF/CNPJ</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 font-black text-slate-900">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {tenant.phone}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {tenant.document}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditTenant(tenant)}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleDeleteTenant(tenant)}
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DELETE MODAL */}
        {tenantToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                🗑️
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Excluir inquilino?
                </h3>

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Esta ação removerá o inquilino do sistema.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">
                    {tenantToDelete.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tenantToDelete.document}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelDeleteTenant}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmDeleteTenant}
                  className="rounded-2xl bg-red-500 px-5 py-4 text-sm font-black text-white"
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}