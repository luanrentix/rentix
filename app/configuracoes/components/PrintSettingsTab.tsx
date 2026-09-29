"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Eye,
  Download,
  Upload,
  RotateCcw,
  HelpCircle,
  Check,
  Copy,
  Search,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Building2,
  User,
  Home,
  DollarSign,
  Calendar,
} from "lucide-react";
import {
  type PrintDocumentKey,
  type PrintDocumentTemplate,
  type PrintTemplates,
} from "../types/settings.types";
import {
  friendlyPrintVariables,
  type FriendlyPrintVariable,
} from "../constants/print-templates";

interface PrintSettingsTabProps {
  printTemplates: PrintTemplates;
  downloadingPrintTemplateKey: PrintDocumentKey | null;
  isImportingPrintTemplate: boolean;
  onDownloadDocx: (documentKey: PrintDocumentKey) => void;
  onImportDocx: (documentKey: PrintDocumentKey, file: File) => void;
  onOpenPreview: (documentKey: PrintDocumentKey) => void;
  onOpenRestore: (documentKey: PrintDocumentKey) => void;
}

export const PrintSettingsTab: React.FC<PrintSettingsTabProps> = ({
  printTemplates,
  downloadingPrintTemplateKey,
  isImportingPrintTemplate,
  onDownloadDocx,
  onImportDocx,
  onOpenPreview,
  onOpenRestore,
}) => {
  // Controle de exibição do tutorial e busca de variáveis
  const [showTutorial, setShowTutorial] = useState(false);
  const [searchTag, setSearchTag] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Refs para inputs de arquivo por modelo
  const fileInputRefs = useRef<Partial<Record<PrintDocumentKey, HTMLInputElement | null>>>({});

  // Grupos de documentos
  const contractKeys: PrintDocumentKey[] = [
    "temporaryContract",
    "standardContract",
    "assetContract",
  ];

  const financialKeys: PrintDocumentKey[] = [
    "paymentBooklet",
    "accountsPayableReport",
  ];

  // Copiar tag para área de transferência
  const handleCopyTag = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 2000);
    } catch {
      // Fallback simples
      const textArea = document.createElement("textarea");
      textArea.value = tag;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 2000);
    }
  };

  // Filtragem de marcadores
  const filteredVariables = friendlyPrintVariables.filter((item: FriendlyPrintVariable) => {
    const matchesSearch =
      searchTag.trim() === "" ||
      item.tag.toLowerCase().includes(searchTag.toLowerCase()) ||
      item.label.toLowerCase().includes(searchTag.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTag.toLowerCase());

    const matchesCategory =
      selectedCategory === "todos" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "todos", label: "Todos", icon: null },
    { id: "locador", label: "Locador / Empresa", icon: Building2 },
    { id: "locatario", label: "Locatário", icon: User },
    { id: "imovel", label: "Imóvel / Bem", icon: Home },
    { id: "valores", label: "Valores & Prazos", icon: DollarSign },
    { id: "assinatura", label: "Assinatura", icon: Calendar },
  ];

  // Handler de seleção de arquivo
  const handleFileInputChange = (
    key: PrintDocumentKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportDocx(key, file);
      // Resetar o input para permitir selecionar o mesmo arquivo novamente se quiser
      e.target.value = "";
    }
  };

  const renderTemplateCard = (key: PrintDocumentKey) => {
    const template: PrintDocumentTemplate = printTemplates[key];
    if (!template) return null;

    const isDownloading = downloadingPrintTemplateKey === key;
    const isCustomized = Boolean(template.importedFileName);

    return (
      <div
        key={key}
        className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
      >
        <div>
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{template.title}</h3>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {template.moduleName}
                </span>
              </div>
            </div>

            {isCustomized ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10"
                title={`Importado de: ${template.importedFileName}${template.importedAt ? ` em ${template.importedAt}` : ""}`}
              >
                <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
                Personalizado
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Padrão do Sistema
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            {template.description}
          </p>

          {isCustomized && template.importedFileName && (
            <p className="mt-2 text-[11px] text-slate-400 truncate">
              Arquivo em uso: <span className="font-medium text-slate-600">{template.importedFileName}</span>
            </p>
          )}
        </div>

        {/* Input oculto para importação de arquivo .docx */}
        <input
          ref={(el) => {
            fileInputRefs.current[key] = el;
          }}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFileInputChange(key, e)}
          disabled={isImportingPrintTemplate}
        />

        {/* Barra de Ações */}
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          {/* Ações Primárias (Baixar e Importar) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDownloadDocx(key)}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              title="Baixar modelo em Word (.docx) para editar no seu computador"
            >
              <Download className="h-3.5 w-3.5 text-orange-600" />
              <span>{isDownloading ? "Baixando..." : "Baixar Word"}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRefs.current[key]?.click()}
              disabled={isImportingPrintTemplate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
              title="Importar arquivo Word (.docx) editado"
            >
              <Upload className="h-3.5 w-3.5 text-white" />
              <span>{isImportingPrintTemplate ? "Importando..." : "Importar Word"}</span>
            </button>
          </div>

          {/* Ações Secundárias (Visualizar e Restaurar) */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenPreview(key)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Visualizar prévia</span>
            </button>

            {isCustomized && (
              <button
                type="button"
                onClick={() => onOpenRestore(key)}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 transition hover:text-red-700"
                title="Restaurar o modelo padrão original do Contrx"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar padrão</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Modelos de impressos e contratos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Personalize os contratos do sistema pelo Word: baixe o modelo em .docx, faça as alterações e importe de volta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTutorial(!showTutorial)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition shadow-sm ${
            showTutorial
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <HelpCircle className="h-4 w-4 text-orange-500" />
          <span>{showTutorial ? "Ocultar Tutorial & Marcadores" : "Como funciona? (Tutorial e Marcadores)"}</span>
          {showTutorial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Seção de Tutorial e Dicionário de Marcadores (Colapsável) */}
      {showTutorial && (
        <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/20 p-5 sm:p-6 shadow-sm space-y-6">
          {/* Passo a Passo em 3 Etapas */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-black text-white">
                i
              </span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Como personalizar seus contratos em 3 passos simples
              </h3>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-black text-orange-700">
                    1
                  </span>
                  <p className="text-xs font-bold text-slate-900">Baixar o Modelo Word</p>
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Clique no botão <strong>Baixar Word</strong> do contrato desejado. O sistema gerará um arquivo <code>.docx</code> pré-formatado.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-black text-orange-700">
                    2
                  </span>
                  <p className="text-xs font-bold text-slate-900">Editar no Word ou Google Docs</p>
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Abra o arquivo no seu editor favorito. Altere as cláusulas livremente e mantenha os marcadores como <code>{"{{inquilino_nome}}"}</code> onde desejar dados automáticos.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-black text-orange-700">
                    3
                  </span>
                  <p className="text-xs font-bold text-slate-900">Importar de Volta</p>
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Salve como <code>.docx</code> e clique em <strong>Importar Word</strong>. O Contrx aplicará o novo modelo automaticamente em todos os novos contratos!
                </p>
              </div>
            </div>
          </div>

          {/* Dicionário de Marcadores com Busca e Cópia */}
          <div className="border-t border-orange-100/80 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Lista de Marcadores Dinâmicos (Tags para colar no Word)
                </h4>
                <p className="text-xs text-slate-500">
                  Clique no botão copiar para copiar o marcador e colar diretamente no Word.
                </p>
              </div>

              {/* Barra de Pesquisa */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  placeholder="Buscar marcador..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Categorias */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedCategory === cat.id
                      ? "bg-orange-500 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat.icon && <cat.icon className="h-3 w-3" />}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Grid de Tags */}
            <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredVariables.map((item) => {
                  const isCopied = copiedTag === item.tag;

                  return (
                    <div
                      key={item.tag}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-orange-100/70 px-1.5 py-0.5 font-mono text-[11px] font-bold text-orange-800">
                            {item.tag}
                          </code>
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {item.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                          {item.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyTag(item.tag)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                          isCopied
                            ? "bg-emerald-500 text-white"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Copiar marcador"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredVariables.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhum marcador encontrado para a busca informada.
                </p>
              )}
            </div>

            <div className="mt-3 rounded-lg bg-orange-50/80 px-3 py-2 text-[11px] text-orange-800">
              💡 <strong>Dica importante:</strong> O Contrx aceita tanto <code>{"{{marcador}}"}</code> quanto <code>{"{marcador}"}</code>. Evite colar textos como imagens dentro do Word, pois o sistema precisa ler o texto para substituir as variáveis.
            </div>
          </div>
        </div>
      )}

      {/* Grupo 1: Contratos de Locação */}
      <div>
        <div className="mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contratos de Locação
          </h3>
          <p className="text-xs text-slate-500">
            Minutas utilizadas na geração e assinatura de contratos de imóveis e ativos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {contractKeys.map((key) => renderTemplateCard(key))}
        </div>
      </div>

      {/* Grupo 2: Impressos Financeiros */}
      <div className="border-t border-slate-100 pt-6">
        <div className="mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Impressos Financeiros
          </h3>
          <p className="text-xs text-slate-500">
            Modelos de impressão de carnês de cobrança e relatórios.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {financialKeys.map((key) => renderTemplateCard(key))}
        </div>
      </div>
    </div>
  );
};
