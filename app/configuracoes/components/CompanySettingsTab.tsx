"use client";

import React from "react";
import {
  type CompanySettings,
  type PixKeyType,
  type SettingsValidationErrors,
  pixKeyTypeOptions,
} from "../types/settings.types";
import { Building2, MapPin, QrCode, Upload, Trash2 } from "lucide-react";

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
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Cadastro da empresa</h2>
        <p className="mt-1 text-sm font-normal text-slate-500">
          Essas informações fiscais e cadastrais serão usadas em contratos, recibos e documentos do Contrx.
        </p>
      </div>

      {/* Card: Logo da Empresa */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
              {companySettings.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={companySettings.logo}
                  alt="Logo da empresa"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-2xl font-black text-slate-400">
                  {(companySettings.tradeName || companySettings.companyName || "C")
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "C"}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">
                Logotipo da Empresa
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-md">
                Formatos aceitos: PNG, JPG, WebP ou SVG (máx. 2 MB). Essa imagem é impressa em recibos e cabeçalhos de contratos.
              </p>
              {logoUploadError && (
                <p className="mt-2 text-xs font-bold text-red-600">{logoUploadError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Escolher logo</span>
            </button>
            {companySettings.logo && (
              <button
                type="button"
                onClick={handleRemoveCompanyLogo}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card: Dados Fiscais */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Dados Cadastrais & Fiscais</h3>
            <p className="text-xs text-slate-500">Razão social, inscrições e canais oficiais da empresa</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-bold text-slate-600">
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

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
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

          <div className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
              CPF/CNPJ <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-2">
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
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
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

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
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

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
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

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
              Telefone de contato
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

          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-bold text-slate-600">
              E-mail principal
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
      </div>

      {/* Card: Dados Pix */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chave Pix da Empresa</h3>
              <p className="text-xs text-slate-500">Chave utilizada para emissão de cobranças e recibos</p>
            </div>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-200">
            Pix
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
              Tipo de chave
            </span>
            <select
              value={companySettings.pixKeyType}
              onChange={(event) => {
                const nextPixKeyType = event.target.value as PixKeyType;
                setCompanySettings({
                  ...companySettings,
                  pixKeyType: nextPixKeyType,
                  pixKey: formatPixKey(companySettings.pixKey, nextPixKeyType),
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

          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-bold text-slate-600">
              Chave Pix
            </span>
            <input
              type="text"
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

      {/* Card: Endereço & Minutas */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Endereço da Empresa</h3>
            <p className="text-xs text-slate-500">Localização física que constará no cabeçalho dos contratos</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
              CEP
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
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              {onlyDigits(companySettings.zipCode).length === 8 && (
                <button
                  type="button"
                  onClick={handleSearchCompanyZipCode}
                  disabled={isZipCodeLookupLoading}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
                >
                  {isZipCodeLookupLoading ? "..." : "CEP"}
                </button>
              )}
            </div>
            {zipCodeLookupError && (
              <p className="text-xs font-bold text-red-600">{zipCodeLookupError}</p>
            )}
          </div>

          <label className="space-y-1.5 lg:col-span-3">
            <span className="text-xs font-bold text-slate-600">
              Logradouro
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
              placeholder="Rua, Avenida, etc."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
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
              placeholder="123"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
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

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
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

          <label className="space-y-1.5 lg:col-span-1">
            <span className="text-xs font-bold text-slate-600">
              UF
            </span>
            <input
              type="text"
              value={companySettings.state}
              onChange={(event) =>
                setCompanySettings({
                  ...companySettings,
                  state: event.target.value.toUpperCase().slice(0, 2),
                })
              }
              placeholder="UF"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="space-y-1.5 lg:col-span-4">
            <span className="text-xs font-bold text-slate-600">
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

      {/* Ação Salvar */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveCompanySettings}
          disabled={isSavingCompanySettings || !hasCompanySettingsChanges}
          className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingCompanySettings ? "Salvando..." : "Salvar cadastro da empresa"}
        </button>
      </div>
    </div>
  );
};
