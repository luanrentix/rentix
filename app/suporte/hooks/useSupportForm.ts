import { useState, useCallback } from "react";
import { criarChamado } from "@/services/chamados.service";

interface UseSupportFormParams {
  onSubmitSuccess: () => void;
}

export function useSupportForm({ onSubmitSuccess }: UseSupportFormParams) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Attachment states
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  const handleFileChange = useCallback((file: File) => {
    setError("");

    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo não pode exceder o tamanho limite de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachmentBase64(base64);
      setAttachmentName(file.name);
      
      if (file.type.startsWith("image/")) {
        setAttachmentPreview(base64);
      } else {
        setAttachmentPreview("document");
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachmentBase64(null);
    setAttachmentName("");
    setAttachmentPreview(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!subject.trim()) {
      setError("O assunto é obrigatório.");
      return;
    }
    if (!message.trim()) {
      setError("A mensagem é obrigatória.");
      return;
    }

    try {
      setSubmitting(true);

      // Concatena de forma invisível/estruturada o anexo no final do corpo da mensagem
      // para garantir a persistência em qualquer modelo do banco de dados do cliente
      let finalMessage = message;
      if (attachmentBase64) {
        finalMessage += `\n\n--- ATTACHMENT: ${attachmentName} | ${attachmentBase64} ---`;
      }

      await criarChamado({
        subject,
        message: finalMessage,
      });

      setSuccess("Chamado enviado com sucesso para o proprietário do sistema!");
      setSubject("");
      setMessage("");
      removeAttachment();

      setTimeout(() => {
        onSubmitSuccess();
        setSuccess("");
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro ao enviar o chamado.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [subject, message, attachmentBase64, attachmentName, removeAttachment, onSubmitSuccess]);

  return {
    subject,
    setSubject,
    message,
    setMessage,
    error,
    setError,
    success,
    setSuccess,
    submitting,
    setSubmitting,
    attachmentBase64,
    attachmentName,
    attachmentPreview,
    handleFileChange,
    removeAttachment,
    handleSubmit,
  };
}
