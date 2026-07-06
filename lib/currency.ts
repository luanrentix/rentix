/**
 * Formata um valor de entrada em tempo real para máscara de moeda brasileira R$ 0,00.
 */
export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "R$ 0,00";
  const numValue = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(numValue);
}

/**
 * Converte uma string formatada em moeda brasileira de volta para número decimal.
 */
export function parseCurrencyToNumber(value: string): number {
  const normalizedValue = value
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
