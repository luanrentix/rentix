"use client";

import React from "react";
import {
  type CompanySettings,
  type PixKeyType,
  type SettingsValidationErrors,
  pixKeyTypeOptions,
} from "../types/settings.types";

interface CompanySettingsTabProps {
  companySettings: CompanySettings;
  setCompanySettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  logoUploadError: string;
  companyLogoInputRef: React.RefObject<HTMLInputElement | null>;
  handleSelectCompanyLogo: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveCompanyLogo: () => void;
  documentLookupError: string;
  setDocumentLookupError: (error: string) => void;
  validationErrors: SettingsValidationErrors;
  onlyDigits: (value: string) => string;
  formatDocument: (value: string) => string;
  formatPhone: (value: string) => string;
  formatZipCode: (value: string) => string;
  formatPixKey: (value: string, pixKeyType: PixKeyType) => string;
  getPixKeyPlaceholder: (pixKeyType: PixKeyType) => string;
  handleSearchCompanyDocument: () => Promise<void>;
  isDocumentLookupLoading: boolean;
  zipCodeLookupError: string;
  setZipCodeLookupError: (error: string) => void;
  handleSearchCompanyZipCode: () => Promise<void>;
  isZipCodeLookupLoading: boolean;
  isSavingCompanySettings: boolean;
  hasCompanySettingsChanges: boolean;
  handleSaveCompanySettings: () => Promise<void>;
}

export const CompanySettingsTab: React.FC<CompanySettingsTabProps> = ({
  companySettings,
  setCompanySettings,
  logoUploadError,
  companyLogoInputRef,
  handleSelectCompanyLogo,
  handleRemoveCompanyLogo,
  documentLookupError,
  setDocumentLookupError,
  validationErrors,
  onlyDigits,
  formatDocument,
  formatPhone,
  formatZipCode,
  formatPixKey,
  getPixKeyPlaceholder,
  handleSearchCompanyDocument,
  isDocumentLookupLoading,
  zipCodeLookupError,
  setZipCodeLookupError,
  handleSearchCompanyZipCode,
  isZipCodeLookupLoading,
  isSavingCompanySettings,
  hasCompanySettingsChanges,
  handleSaveCompanySettings,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-950">Cadastro da empresa</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Essas informações serão usadas em contratos, recibos, cobranças e documentos do Contrx.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-xl font-black text-slate-400">
            {companySettings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companySettings.logo}
                alt="Logo da empresa"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span>
                {(companySettings.tradeName || companySettings.companyName || "L")
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "L"}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
              Logo da empresa
            </h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Envie uma imagem PNG, JPG ou SVG com até 2 MB para aparecer nos documentos e relatórios.
            </p>
            {logoUploadError && (
              <p className="mt-2 text-xs font-bold text-red-600">{logoUploadError}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={companyLogoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleSelectCompanyLogo}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => companyLogoInputRef.current?.click()}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            Escolher logo
          </button>
          {companySettings.logo && (
            <button
              type="button"
              onClick={handleRemoveCompanyLogo}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <label className="space-y-2 lg:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Razão social <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={companySettings.companyName}
            onChange={(event) =>
              setCompanySettings({
                ...companySettings,
                companyName: event.target.value,
              })
            }
            placeholder="Ex: Contrx Gestão de Locações LTDA"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Nome fantasia <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={companySettings.tradeName}
            onChange={(event) =>
              setCompanySettings({
                ...companySettings,
                tradeName: event.target.value,
              })
            }
            placeholder="Ex: Contrx"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <div className="space-y-2 lg:col-span-1">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            CPF/CNPJ <span className="text-red-500">*</span>
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={companySettings.document}
              onChange={(event) => {
                setDocumentLookupError("");
                setCompanySettings({
                  ...companySettings,
                  document: formatDocument(event.target.value),
                });
              }}
              onBlur={() => {
                if (onlyDigits(companySettings.document).length === 14) {
                  void handleSearchCompanyDocument();
                }
              }}
              placeholder="00.000.000/0000-00"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            {onlyDigits(companySettings.document).length === 14 && (
              <button
                type="button"
                onClick={handleSearchCompanyDocument}
                disabled={isDocumentLookupLoading}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDocumentLookupLoading ? "Buscando..." : "Buscar CNPJ"}
              </button>
            )}
          </div>
          {(documentLookupError || validationErrors.document) && (
            <p className="text-xs font-bold text-red-600">
              {documentLookupError || validationErrors.document}
            </p>
          )}
        </div>

        <label className="space-y-2 lg:col-span-1">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Inscrição estadual
          </span>
          <input
            type="text"
            value={companySettings.stateRegistration}
            onChange={(event) =>
              setCompanySettings({
                ...companySettings,
                stateRegistration: event.target.value,
              })
            }
            placeholder="Isento ou número da inscrição"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Inscrição municipal
          </span>
          <input
            type="text"
            value={companySettings.municipalRegistration}
            onChange={(event) =>
              setCompanySettings({
                ...companySettings,
                municipalRegistration: event.target.value,
              })
            }
            placeholder="Número da inscrição municipal"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Telefone
          </span>
          <input
            type="text"
            value={companySettings.phone}
            onChange={(event) =>
              setCompanySettings({
                ...companySettings,
                phone: formatPhone(event.target.value),
              })
            }
            placeholder="(00) 00000-0000"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            E-mail
          </span>
          <input
            type="email"
            value={companySettings.email}
            onChange={(event) =>
              setCompanySettings({
                ...companySettings,
                email: event.target.value,
              })
            }
            placeholder="empresa@contrx.com.br"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
              Dados Pix da empresa
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Informe a chave Pix que será usada em cobranças, recibos e documentos financeiros.
            </p>
          </div>

          <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700 shadow-sm">
            Pix
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Tipo da chave Pix
            </span>
            <select
              value={companySettings.pixKeyType}
              onChange={(event) => {
                const pixKeyType = event.target.value as PixKeyType;

                setCompanySettings({
                  ...companySettings,
                  pixKeyType,
                  pixKey: formatPixKey(companySettings.pixKey, pixKeyType),
                });
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {pixKeyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Chave Pix opcional
            </span>
            <input
              type={companySettings.pixKeyType === "email" ? "email" : "text"}
              value={companySettings.pixKey}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  pixKey: formatPixKey(event.target.value, companySettings.pixKeyType),
                })
              }
              placeholder={getPixKeyPlaceholder(companySettings.pixKeyType)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
          Endereço da empresa
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              CEP opcional
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={companySettings.zipCode}
                onChange={(event) => {
                  setZipCodeLookupError("");
                  setCompanySettings({
                    ...companySettings,
                    zipCode: formatZipCode(event.target.value),
                  });
                }}
                onBlur={() => {
                  if (onlyDigits(companySettings.zipCode).length === 8) {
                    void handleSearchCompanyZipCode();
                  }
                }}
                placeholder="00000-000"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              {onlyDigits(companySettings.zipCode).length === 8 && (
                <button
                  type="button"
                  onClick={handleSearchCompanyZipCode}
                  disabled={isZipCodeLookupLoading}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isZipCodeLookupLoading ? "..." : "Buscar CEP"}
                </button>
              )}
            </div>
            {zipCodeLookupError && (
              <p className="text-xs font-bold text-red-600">{zipCodeLookupError}</p>
            )}
          </div>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Endereço / Logradouro
            </span>
            <input
              type="text"
              value={companySettings.address}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  address: event.target.value,
                })
              }
              placeholder="Rua, Avenida, Alameda"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-2 md:col-span-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Número
            </span>
            <input
              type="text"
              value={companySettings.number}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  number: event.target.value,
                })
              }
              placeholder="123 ou S/N"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Bairro
            </span>
            <input
              type="text"
              value={companySettings.neighborhood}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  neighborhood: event.target.value,
                })
              }
              placeholder="Bairro"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-2 md:col-span-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Cidade
            </span>
            <input
              type="text"
              value={companySettings.city}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  city: event.target.value,
                })
              }
              placeholder="Cidade"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-2 md:col-span-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Estado (UF)
            </span>
            <input
              type="text"
              maxLength={2}
              value={companySettings.state}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  state: event.target.value.toUpperCase(),
                })
              }
              placeholder="UF"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
          Configurações de contratos
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Cidade padrão de assinatura nos contratos
            </span>
            <input
              type="text"
              value={companySettings.contractCity}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  contractCity: event.target.value,
                })
              }
              placeholder="Ex: São Paulo"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Observações padrão dos contratos
            </span>
            <textarea
              rows={3}
              value={companySettings.contractDefaultNotes}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  contractDefaultNotes: event.target.value,
                })
              }
              placeholder="Texto adicional que aparecerá ao final dos contratos..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSaveCompanySettings}
          disabled={isSavingCompanySettings || !hasCompanySettingsChanges}
          className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingCompanySettings ? "Salvando..." : "Salvar cadastro da empresa"}
        </button>
      </div>
    </div>
  );
};
