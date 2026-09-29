"use client";

import React from "react";
import {
  type CompanyUser,
  type EditCompanyUserForm,
  type NewCompanyUserForm,
  type PasswordSettings,
  type UserSettings,
  type CompanyAccessProfileKey,
  type SettingsValidationErrors,
  companyAccessProfiles,
  companyUserRoleOptions,
  roleLabels,
  type UserToolPermission,
} from "../types/settings.types";
import { toolPermissionOptions } from "@/services/tool-permissions";

interface UserSettingsTabProps {
  userSettings: UserSettings;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  lockedUserEmail: string;
  currentUserRoleLabel: string;
  companySettingsLogo?: string;
  companyDisplayName: string;
  companyLogoFallbackText: string;
  passwordError: string;
  isUserSettingsEditing: boolean;
  handleStartUserSettingsEdit: () => void;
  handleCancelUserSettingsEdit: () => void;
  passwordSettings: PasswordSettings;
  setPasswordSettings: React.Dispatch<React.SetStateAction<PasswordSettings>>;
  validationErrors: SettingsValidationErrors;
  isSavingUserSettings: boolean;
  handleSaveUserSettings: () => Promise<void>;
  
  // Company Users management
  canManageCompanyUsers: boolean;
  companyUsers: CompanyUser[];
  isLoadingCompanyUsers: boolean;
  companyUserError: string;
  activeCompanyUsersTab: "list" | "new";
  setActiveCompanyUsersTab: (tab: "list" | "new") => void;
  newCompanyUserForm: NewCompanyUserForm;
  setNewCompanyUserForm: React.Dispatch<React.SetStateAction<NewCompanyUserForm>>;
  isCreatingCompanyUser: boolean;
  handleCreateCompanyUser: (event: React.FormEvent) => Promise<void>;
  handleApplyNewUserAccessProfile: (profileKey: CompanyAccessProfileKey) => void;
  handleToggleCompanyUserPermission: (permission: UserToolPermission) => void;
  
  // Edit Company User Modal State
  editingCompanyUser: CompanyUser | null;
  editCompanyUserForm: EditCompanyUserForm;
  setEditCompanyUserForm: React.Dispatch<React.SetStateAction<EditCompanyUserForm>>;
  isUpdatingCompanyUser: boolean;
  handleStartEditCompanyUser: (user: CompanyUser) => void;
  handleCancelEditCompanyUser: () => void;
  handleUpdateCompanyUser: (event: React.FormEvent) => Promise<void>;
  handleApplyEditUserAccessProfile: (profileKey: CompanyAccessProfileKey) => void;
  handleToggleEditCompanyUserPermission: (permission: UserToolPermission) => void;
}

export const UserSettingsTab: React.FC<UserSettingsTabProps> = ({
  userSettings,
  setUserSettings,
  lockedUserEmail,
  currentUserRoleLabel,
  companySettingsLogo,
  companyDisplayName,
  companyLogoFallbackText,
  passwordError,
  isUserSettingsEditing,
  handleStartUserSettingsEdit,
  handleCancelUserSettingsEdit,
  passwordSettings,
  setPasswordSettings,
  validationErrors,
  isSavingUserSettings,
  handleSaveUserSettings,
  canManageCompanyUsers,
  companyUsers,
  isLoadingCompanyUsers,
  companyUserError,
  activeCompanyUsersTab,
  setActiveCompanyUsersTab,
  newCompanyUserForm,
  setNewCompanyUserForm,
  isCreatingCompanyUser,
  handleCreateCompanyUser,
  handleApplyNewUserAccessProfile,
  handleToggleCompanyUserPermission,
  editingCompanyUser,
  editCompanyUserForm,
  setEditCompanyUserForm,
  isUpdatingCompanyUser,
  handleStartEditCompanyUser,
  handleCancelEditCompanyUser,
  handleUpdateCompanyUser,
  handleApplyEditUserAccessProfile,
  handleToggleEditCompanyUserPermission,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Usuários e equipe</h2>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Gerencie seu perfil de acesso e os membros da sua equipe com permissões personalizadas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartUserSettingsEdit}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
        >
          Editar usuário
        </button>
      </div>

      {/* User Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-base font-bold text-white shadow-inner">
              {companyLogoFallbackText}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                {userSettings.name || "Usuário sem nome"}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {lockedUserEmail || "E-mail não informado"}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20 self-start sm:self-auto">
            {currentUserRoleLabel}
          </span>
        </div>
      </div>

      {passwordError && !isUserSettingsEditing && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {passwordError}
        </div>
      )}

      {/* Modal de edição de usuário logado */}
      {isUserSettingsEditing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                    Edição de usuário
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">Dados do usuário</h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    Altere o nome exibido no sistema ou preencha os campos de senha quando precisar trocar o acesso.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCancelUserSettingsEdit}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                  aria-label="Fechar edição do usuário"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-5 bg-slate-50 p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Nome <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={userSettings.name}
                    onChange={(event) =>
                      setUserSettings({
                        ...userSettings,
                        name: event.target.value,
                      })
                    }
                    placeholder="Nome do usuário"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    E-mail <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="email"
                    value={lockedUserEmail}
                    readOnly
                    disabled
                    placeholder="usuario@contrx.com.br"
                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 outline-none"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                  Alterar senha
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Preencha somente se quiser trocar a senha deste usuário.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Senha atual
                    </span>
                    <input
                      type="password"
                      value={passwordSettings.currentPassword}
                      onChange={(event) =>
                        setPasswordSettings({
                          ...passwordSettings,
                          currentPassword: event.target.value,
                        })
                      }
                      placeholder="Sua senha atual"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Nova senha
                    </span>
                    <input
                      type="password"
                      value={passwordSettings.newPassword}
                      onChange={(event) =>
                        setPasswordSettings({
                          ...passwordSettings,
                          newPassword: event.target.value,
                        })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Confirmar nova senha
                    </span>
                    <input
                      type="password"
                      value={passwordSettings.confirmPassword}
                      onChange={(event) =>
                        setPasswordSettings({
                          ...passwordSettings,
                          confirmPassword: event.target.value,
                        })
                      }
                      placeholder="Repita a nova senha"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelUserSettingsEdit}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveUserSettings}
                disabled={isSavingUserSettings}
                className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-50"
              >
                {isSavingUserSettings ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seção Gestão de Usuários da Empresa */}
      {canManageCompanyUsers && (
        <div className="space-y-6 pt-6 border-t border-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">Usuários da Empresa</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Gerencie quem pode acessar esta empresa e quais permissões cada usuário possui.
              </p>
            </div>

            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveCompanyUsersTab("list")}
                className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeCompanyUsersTab === "list"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lista ({companyUsers.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveCompanyUsersTab("new")}
                className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeCompanyUsersTab === "new"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Novo Usuário
              </button>
            </div>
          </div>

          {companyUserError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {companyUserError}
            </div>
          )}

          {activeCompanyUsersTab === "list" && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {isLoadingCompanyUsers ? (
                <div className="p-8 text-center text-sm font-semibold text-slate-500">
                  Carregando usuários...
                </div>
              ) : companyUsers.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-slate-500">
                  Nenhum usuário cadastrado para esta empresa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4">Função</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {companyUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-950">{u.name}</p>
                            <p className="text-xs font-medium text-slate-500">{u.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {roleLabels[u.role] || u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                u.isActive
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                  : "bg-red-50 text-red-700 ring-1 ring-red-100"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  u.isActive ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              {u.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleStartEditCompanyUser(u)}
                              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeCompanyUsersTab === "new" && (
            <form onSubmit={handleCreateCompanyUser} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-base font-black text-slate-950">Cadastrar Novo Usuário</h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">Nome *</span>
                  <input
                    type="text"
                    required
                    value={newCompanyUserForm.name}
                    onChange={(e) =>
                      setNewCompanyUserForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">E-mail *</span>
                  <input
                    type="email"
                    required
                    value={newCompanyUserForm.email}
                    onChange={(e) =>
                      setNewCompanyUserForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">Senha *</span>
                  <input
                    type="password"
                    required
                    value={newCompanyUserForm.password}
                    onChange={(e) =>
                      setNewCompanyUserForm((f) => ({ ...f, password: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">Função</span>
                  <select
                    value={newCompanyUserForm.role}
                    onChange={(e) =>
                      setNewCompanyUserForm((f) => ({
                        ...f,
                        role: e.target.value as NewCompanyUserForm["role"],
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    {companyUserRoleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase text-slate-500">Perfis Rápidos</span>
                <div className="flex flex-wrap gap-2">
                  {companyAccessProfiles.map((prof) => (
                    <button
                      key={prof.key}
                      type="button"
                      onClick={() => handleApplyNewUserAccessProfile(prof.key)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      {prof.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase text-slate-500">Permissões de Ferramentas</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {toolPermissionOptions.map((perm) => {
                    const isChecked = newCompanyUserForm.permissions.includes(perm.key as UserToolPermission);
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => handleToggleCompanyUserPermission(perm.key as UserToolPermission)}
                        className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
                          isChecked
                            ? "border-orange-500 bg-orange-50/60 text-orange-950"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs font-black ${
                            isChecked
                              ? "border-orange-500 bg-orange-500 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isChecked && "✓"}
                        </span>
                        <span className="text-xs font-bold">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isCreatingCompanyUser}
                  className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {isCreatingCompanyUser ? "Criando..." : "Cadastrar Usuário"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal de edição de usuário da empresa */}
      {editingCompanyUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">Editar Usuário da Empresa</h3>
                <p className="text-xs font-semibold text-slate-500">{editingCompanyUser.email}</p>
              </div>
              <button
                type="button"
                onClick={handleCancelEditCompanyUser}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-500 shadow-sm hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCompanyUser} className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">Nome *</span>
                  <input
                    type="text"
                    required
                    value={editCompanyUserForm.name}
                    onChange={(e) =>
                      setEditCompanyUserForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">Nova Senha (opcional)</span>
                  <input
                    type="password"
                    value={editCompanyUserForm.password}
                    onChange={(e) =>
                      setEditCompanyUserForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Deixe em branco para manter"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500">Função</span>
                  <select
                    value={editCompanyUserForm.role}
                    onChange={(e) =>
                      setEditCompanyUserForm((f) => ({
                        ...f,
                        role: e.target.value as EditCompanyUserForm["role"],
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    {companyUserRoleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    checked={editCompanyUserForm.isActive}
                    onChange={(e) =>
                      setEditCompanyUserForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                  />
                  <span className="text-sm font-bold text-slate-900">Usuário Ativo</span>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase text-slate-500">Perfis Rápidos</span>
                <div className="flex flex-wrap gap-2">
                  {companyAccessProfiles.map((prof) => (
                    <button
                      key={prof.key}
                      type="button"
                      onClick={() => handleApplyEditUserAccessProfile(prof.key)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      {prof.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase text-slate-500">Permissões de Ferramentas</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {toolPermissionOptions.map((perm) => {
                    const isChecked = editCompanyUserForm.permissions.includes(perm.key as UserToolPermission);
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => handleToggleEditCompanyUserPermission(perm.key as UserToolPermission)}
                        className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
                          isChecked
                            ? "border-orange-500 bg-orange-50/60 text-orange-950"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs font-black ${
                            isChecked
                              ? "border-orange-500 bg-orange-500 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isChecked && "✓"}
                        </span>
                        <span className="text-xs font-bold">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEditCompanyUser}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingCompanyUser}
                  className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {isUpdatingCompanyUser ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
