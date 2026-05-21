type WhatsAppMessageOptions = {
  phone: string;
  message: string;
  countryCode?: string;
};

export function normalizeWhatsAppPhone(phone: string, countryCode = "55") {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";
  if (
    digits.startsWith(countryCode) &&
    (digits.length === countryCode.length + 10 ||
      digits.length === countryCode.length + 11)
  ) {
    return digits;
  }

  return `${countryCode}${digits}`;
}

export function getWhatsAppUrl({
  phone,
  message,
  countryCode,
}: WhatsAppMessageOptions) {
  const normalizedPhone = normalizeWhatsAppPhone(phone, countryCode);

  if (!normalizedPhone) return "";

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppMessage(options: WhatsAppMessageOptions) {
  const whatsappUrl = getWhatsAppUrl(options);

  if (!whatsappUrl) {
    window.alert("Informe um telefone valido para abrir o WhatsApp.");
    return;
  }

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}
