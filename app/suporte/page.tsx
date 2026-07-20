"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Plus, Send, Clock, User, Building, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getChamados, criarChamado, clienteAcaoChamado, type SupportTicket } from "@/services/chamados.service";
import { getCompanyStorageItem } from "@/services/company-storage";
import { useSupportTickets } from "./hooks/useSupportTickets";
import { useSupportForm } from "./hooks/useSupportForm";

function parseMessageWithAttachment(messageText: string) {
  const attachmentRegex = /--- ATTACHMENT: (.*?) \| (.*?) ---/;
  const match = messageText.match(attachmentRegex);

  if (match) {
    const cleanMessage = messageText.replace(attachmentRegex, "").trim();
    const fileName = match[1];
    const base64 = match[2];
    
    return {
      message: cleanMessage,
      attachment: {
        name: fileName,
        content: base64,
        isImage: base64.startsWith("data:image/"),
      }
    };
  }

  return {
    message: messageText,
    attachment: null,
  };
}

export default function SuportePage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [themeMode, setThemeMode] = useState("light");
  const [view, setView] = useState<"list" | "new">("list");

  useEffect(() => {
    if (!companyId) return;
    const mode = getCompanyStorageItem(companyId, "contrx_theme_mode") || "light";
    setThemeMode(mode);
  }, [companyId]);

  const isSystemOwner = user?.role === "SYSTEM_OWNER" || user?.role === "DONO_SISTEMA";
  const {
    chamados,
    loading,
    respondingTicketId,
    setRespondingTicketId,
    ticketResponse,
    setTicketResponse,
    isReplying,
    fetchTickets,
    handleClienteAcao,
  } = useSupportTickets(companyId);

  const {
    subject,
    setSubject,
    message,
    setMessage,
    error,
    setError,
    success,
    setSuccess,
    submitting,
    attachmentBase64,
    attachmentName,
    attachmentPreview,
    handleFileChange,
    removeAttachment,
    handleSubmit,
  } = useSupportForm({
    onSubmitSuccess: () => setView("list"),
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div data-contrx-theme={themeMode} className="mx-auto max-w-4xl px-4 py-8">
      {view === "list" ? (
        <div>
          {/* Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-slate-900">
                <MessageSquare className="h-6 w-6 text-orange-600" />
                {isSystemOwner ? "Chamados do Sistema" : "Meus chamados"}
              </h1>
              <p className="text-sm text-slate-500">
                {isSystemOwner 
                  ? "Gerencie e visualize todos os chamados abertos pelos clientes da plataforma." 
                  : "Acompanhe e envie chamados de suporte técnico diretamente para o desenvolvedor."
                }
              </p>
            </div>

            {!isSystemOwner && (
              <button
                onClick={() => setView("new")}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition shadow-md hover:opacity-90"
                style={{ backgroundColor: "var(--primary-color)", color: "#ffffff" }}
              >
                <Plus className="h-4 w-4" />
                Novo chamado
              </button>
            )}
          </div>

          {/* List content */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>
            </div>
          ) : chamados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Nenhum chamado</h3>
              <p className="mt-1 text-sm text-slate-500">
                {isSystemOwner 
                  ? "Nenhum cliente abriu chamado até o momento." 
                  : "Você não possui chamados de suporte abertos."
                }
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chamados.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          ticket.status === "ABERTO"
                            ? "bg-orange-50 text-orange-700"
                            : ticket.status === "RESPONDIDO"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {ticket.status === "ABERTO"
                          ? "Aberto"
                          : ticket.status === "RESPONDIDO"
                          ? "Respondido"
                          : "Fechado"}
                      </span>
                      <h4 className="mt-2 text-lg font-bold text-slate-900">
                        {ticket.subject}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(ticket.createdAt)}
                    </div>
                  </div>

                  {(() => {
                    const parsed = parseMessageWithAttachment(ticket.message);
                    return (
                      <>
                        <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {parsed.message}
                        </p>
                        {parsed.attachment && (
                          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 max-w-sm">
                            <span className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Anexo</span>
                            {parsed.attachment.isImage ? (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <img
                                  src={parsed.attachment.content}
                                  alt={parsed.attachment.name}
                                  className="max-h-48 w-full object-contain cursor-pointer transition hover:opacity-90"
                                  onClick={() => {
                                    const win = window.open();
                                    if (win) {
                                      win.document.write(`<img src="${parsed.attachment?.content}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <a
                                href={parsed.attachment.content}
                                download={parsed.attachment.name}
                                className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:underline"
                              >
                                📥 {parsed.attachment.name}
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {ticket.response && (
                    <div className="mt-4 rounded-2xl bg-orange-50/50 border border-orange-100 p-4">
                      <p className="text-xs font-black uppercase text-orange-600">Resposta do Desenvolvedor</p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {ticket.response}
                      </p>
                    </div>
                  )}

                   {/* Actions for customer */}
                  {!isSystemOwner && ticket.status !== "FECHADO" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      {ticket.status === "RESPONDIDO" && (
                        <button
                          onClick={() => {
                            setRespondingTicketId(respondingTicketId === ticket.id ? null : ticket.id);
                            setTicketResponse("");
                          }}
                          className="rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                          style={{ backgroundColor: "var(--primary-color)" }}
                        >
                          {respondingTicketId === ticket.id ? "Cancelar" : "Responder"}
                        </button>
                      )}
                      <button
                        onClick={() => handleClienteAcao(ticket.id, "close")}
                        disabled={isReplying}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Encerrar chamado
                      </button>
                    </div>
                  )}

                  {respondingTicketId === ticket.id && (
                    <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                      <label className="block text-xs font-bold text-slate-500 mb-2">
                        Sua resposta
                      </label>
                      <textarea
                        value={ticketResponse}
                        onChange={(e) => setTicketResponse(e.target.value)}
                        placeholder="Escreva sua resposta para o desenvolvedor..."
                        className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm font-medium focus:border-orange-500 focus:outline-none"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleClienteAcao(ticket.id, "reply")}
                          disabled={isReplying || !ticketResponse.trim()}
                          className="rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "var(--primary-color)" }}
                        >
                          {isReplying ? "Enviando..." : "Enviar Resposta"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Metadata display for Admin / System Owner */}
                  {isSystemOwner && (
                    <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      {ticket.company && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <strong>Empresa:</strong> {ticket.company.tradeName}
                        </span>
                      )}
                      {ticket.user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <strong>Usuário:</strong> {ticket.user.name} ({ticket.user.email})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* New Ticket Form */
        <div>
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => {
                setView("list");
                setError("");
                setSuccess("");
              }}
              className="rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Novo chamado
              </h1>
              <p className="text-sm text-slate-500">
                Descreva suas dúvidas ou problemas técnicos para análise.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md"
          >
            {error && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                {success}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="subject" className="mb-2 block text-sm font-bold text-slate-800">
                Assunto *
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Resuma o assunto"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-medium focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="message" className="mb-2 block text-sm font-bold text-slate-800">
                Mensagem *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva o problema ou dúvida"
                rows={6}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-medium focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div className="mb-8">
              <span className="mb-2 block text-sm font-bold text-slate-800">
                Anexar evidência (opcional)
              </span>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="attachment"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                  >
                    📎 Selecionar arquivo (Max 5MB)
                  </label>
                  <input
                    type="file"
                    id="attachment"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                  />
                  {attachmentName && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <span>{attachmentName}</span>
                      <button
                        type="button"
                        onClick={removeAttachment}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {attachmentPreview && attachmentPreview !== "document" && (
                  <div className="mt-2 h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img
                      src={attachmentPreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none hover:opacity-90"
                style={submitting ? {} : { backgroundColor: "var(--primary-color)", color: "#ffffff" }}
              >
                {submitting ? "Enviando..." : "Enviar"}
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
