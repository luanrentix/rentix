// Validacao estrutural GS1; nao consulta titularidade ou registro comercial.
export function isValidGtin(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value))
    return false;
  let sum = 0;
  for (
    let index = value.length - 2, weight = 3;
    index >= 0;
    index--, weight = weight === 3 ? 1 : 3
  ) {
    sum += Number(value[index]) * weight;
  }
  return (10 - (sum % 10)) % 10 === Number(value.at(-1));
}

export function gtinAliases(value: string): string[] {
  const canonical = value.padStart(14, '0');
  return [8, 12, 13, 14]
    .map((size) => canonical.slice(-size))
    .filter((code) => code.padStart(14, '0') === canonical);
}
