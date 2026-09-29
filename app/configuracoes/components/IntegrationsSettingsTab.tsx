"use client";

import React from "react";
import { MessageCircle, Mail, CreditCard } from "lucide-react";
import { type IntegrationSettings } from "../types/settings.types";

interface IntegrationsSettingsTabProps {
  integrationSettings: IntegrationSettings;
  setIntegrationSettings: React.Dispatch<React.SetStateAction<IntegrationSettings>>;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export const IntegrationsSettingsTab: React.FC<IntegrationsSettingsTabProps> = ({
  integrationSettings,
  setIntegrationSettings,
  isSaving,
  onSave,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Integrações & Comunicação
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Configure modelos de mensagens para WhatsApp, notificações de e-mail e conexões com gateways de cobrança.
        </p>
      </div>

      {/* Card 1: Mensagens de WhatsApp */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Modelos de Mensagens WhatsApp
            </h3>
            <p className="text-xs text-slate-500">
              Variáveis dinâmicas disponíveis: <code className="text-emerald-700 font-bold">{"{nome}"}</code>, <code className="text-emerald-700 font-bold">{"{imovel}"}</code>, <code className="text-emerald-700 font-bold">{"{valor}"}</code>, <code className="text-emerald-700 font-bold">{"{data}"}</code>
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Mensagem de Cobrança / Envio de Chave Pix
            </label>
            <textarea
              rows={3}
              value={integrationSettings.whatsappBillingMessage || ""}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  whatsappBillingMessage: e.target.value,
                }))
              }
              placeholder="Ex: Olá, {nome}. Segue a cobrança do aluguel referente ao imóvel {imovel} no valor de {valor}."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Aviso de Vencimento de Contrato
            </label>
            <textarea
              rows={3}
              value={integrationSettings.whatsappContractDueMessage || ""}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  whatsappContractDueMessage: e.target.value,
                }))
              }
              placeholder="Ex: Olá, {nome}. Lembramos que seu contrato de locação do imóvel {imovel} vence em {data}."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white resize-none"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Gateway de Cobrança Automatizada (Boletos / Pix com Baixa Automática) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Gateway de Pagamentos & Boletos/Pix
            </h3>
            <p className="text-xs text-slate-500">
              Conecte sua conta para emissão de cobranças registradas com conciliação bancária automática.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Provedor de Pagamento
            </label>
            <select
              value={integrationSettings.paymentGatewayProvider || "manual"}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  paymentGatewayProvider: e.target.value as any,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            >
              <option value="manual">Manual / Transferência e Pix Direto</option>
              <option value="asaas">Asaas (Boletos e Pix Automáticos)</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Ambiente de Conexão
            </label>
            <select
              value={integrationSettings.paymentGatewayEnvironment || "sandbox"}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  paymentGatewayEnvironment: e.target.value as any,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            >
              <option value="sandbox">Sandbox (Ambiente de Testes / Homologação)</option>
              <option value="production">Produção (Cobranças Reais)</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Chave de API / Token de Acesso
            </label>
            <input
              type="password"
              value={integrationSettings.paymentGatewayApiKey || ""}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  paymentGatewayApiKey: e.target.value,
                }))
              }
              placeholder="Cole sua chave de API secreta fornecida pelo provedor..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Sua chave é criptografada e utilizada exclusivamente para autenticação de webhooks e emissão.
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Notificações por E-mail */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Notificações por E-mail
            </h3>
            <p className="text-xs text-slate-500">
              Defina o nome exibido nos envios de relatórios e faturas.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Nome do Remetente
            </label>
            <input
              type="text"
              value={integrationSettings.emailSenderName || ""}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  emailSenderName: e.target.value,
                }))
              }
              placeholder="Ex: Contrx Imobiliária"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Cópia Oculta (BCC)
            </label>
            <input
              type="email"
              value={integrationSettings.emailBcc || ""}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  emailBcc: e.target.value,
                }))
              }
              placeholder="financeiro@suaempresa.com.br"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Botão de Salvar */}
      <div className="flex items-center justify-end pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-2xl bg-orange-600 px-6 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition active:scale-[0.99] disabled:opacity-50"
        >
          {isSaving ? "Salvando Integrações..." : "Salvar Configurações de Integração"}
        </button>
      </div>
    </div>
  );
};
