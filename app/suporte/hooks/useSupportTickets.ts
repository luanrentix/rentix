import { useState, useEffect, useCallback } from "react";
import { getChamados, clienteAcaoChamado, type SupportTicket } from "@/services/chamados.service";

export function useSupportTickets(companyId?: string) {
  const [chamados, setChamados] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTicketId, setRespondingTicketId] = useState<string | null>(null);
  const [ticketResponse, setTicketResponse] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getChamados();
      setChamados(data);
    } catch (err) {
      console.error("Erro ao buscar chamados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClienteAcao = useCallback(async (ticketId: string, action: "reply" | "close") => {
    if (action === "reply" && !ticketResponse.trim()) {
      alert("Por favor, digite sua resposta.");
      return;
    }

    try {
      setIsReplying(true);
      await clienteAcaoChamado(ticketId, action, action === "reply" ? ticketResponse : undefined);
      setRespondingTicketId(null);
      setTicketResponse("");
      await fetchTickets();
    } catch (err) {
      console.error("Erro ao realizar ação no chamado:", err);
    } finally {
      setIsReplying(false);
    }
  }, [ticketResponse, fetchTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    chamados,
    setChamados,
    loading,
    setLoading,
    respondingTicketId,
    setRespondingTicketId,
    ticketResponse,
    setTicketResponse,
    isReplying,
    fetchTickets,
    handleClienteAcao,
  };
}
