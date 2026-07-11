import { apiFetch } from './api';

export type SupportTicket = {
  id: string;
  userId: string;
  companyId: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  response?: string | null;
  user?: {
    name: string;
    email: string;
  };
  company?: {
    tradeName: string;
  };
};

export type CriarChamadoPayload = {
  subject: string;
  message: string;
  targetUserId?: string;
  targetCompanyId?: string;
};

export async function getChamados() {
  return apiFetch<SupportTicket[]>('/chamados');
}

export async function criarChamado(data: CriarChamadoPayload) {
  return apiFetch<SupportTicket>('/chamados', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function responderChamado(id: string, response: string) {
  return apiFetch<SupportTicket>(`/chamados/${id}/responder`, {
    method: 'PATCH',
    body: JSON.stringify({ response }),
  });
}

export async function clienteAcaoChamado(
  id: string,
  action: "reply" | "close",
  replyText?: string,
) {
  return apiFetch<SupportTicket>(`/chamados/${id}/cliente-acao`, {
    method: "PATCH",
    body: JSON.stringify({ action, replyText }),
  });
}
