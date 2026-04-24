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

  function handleDeleteTenant(tenantId: number) {
    const shouldDelete = confirm("Deseja excluir este inquilino?");

    if (!shouldDelete) return;

    setTenants((currentTenants) =>
      currentTenants.filter((tenant) => tenant.id !== tenantId)
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inquilinos</h1>
            <p className="mt-2 text-slate-600">
              Gerencie os inquilinos cadastrados
            </p>
          </div>

          <button
            type="button"
            onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {isFormOpen ? "Fechar" : "+ Novo Inquilino"}
          </button>
        </div>

        {isFormOpen && (
          <form
            onSubmit={handleSubmitTenant}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? "Editar Inquilino" : "Novo Inquilino"}
              </h2>
              <p className="text-sm text-slate-500">
                Preencha as informações do inquilino
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="Nome completo"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                required
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Telefone"
                value={tenantPhone}
                onChange={(event) => setTenantPhone(event.target.value)}
                required
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="CPF/CNPJ"
                value={tenantDocument}
                onChange={(event) => setTenantDocument(event.target.value)}
                required
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {isEditing ? "Salvar Alterações" : "Salvar Inquilino"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Lista de Inquilinos
            </h2>
            <p className="text-sm text-slate-500">
              {tenants.length} inquilino(s) cadastrado(s)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4">CPF/CNPJ</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {tenant.name}
                    </td>

                    <td className="px-6 py-4">{tenant.phone}</td>

                    <td className="px-6 py-4">{tenant.document}</td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTenant(tenant)}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTenant(tenant.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tenants.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Nenhum inquilino cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}