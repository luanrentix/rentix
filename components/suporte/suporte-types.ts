import type { SupportTicket } from "@/services/chamados.service";

export type TicketStatusFilter = "ALL" | "ABERTO" | "RESPONDIDO" | "FECHADO";
export type TicketSortOption = "recent" | "oldest" | "waiting_first";

export interface ParsedAttachment {
  name: string;
  content: string;
  isImage: boolean;
}

export interface ParsedTicketMessage {
  cleanMessage: string;
  attachment: ParsedAttachment | null;
}

export function parseMessageWithAttachment(messageText: string): ParsedTicketMessage {
  if (!messageText) return { cleanMessage: "", attachment: null };

  const attachmentRegex = /--- ATTACHMENT: (.*?) \| (.*?) ---/;
  const match = messageText.match(attachmentRegex);

  if (match) {
    const cleanMessage = messageText.replace(attachmentRegex, "").trim();
    const fileName = match[1];
    const base64 = match[2];

    return {
      cleanMessage,
      attachment: {
        name: fileName,
        content: base64,
        isImage: base64.startsWith("data:image/"),
      },
    };
  }

  return {
    cleanMessage: messageText,
    attachment: null,
  };
}

export function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Agora há pouco";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Há ${hours} ${hours === 1 ? "hora" : "horas"}`;
    }
    if (diffInSeconds < 172800) return "Ontem";

    const days = Math.floor(diffInSeconds / 86400);
    if (days < 7) return `Há ${days} dias`;

    return formatDateTime(dateString);
  } catch {
    return dateString;
  }
}
