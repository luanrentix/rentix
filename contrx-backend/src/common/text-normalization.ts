export function toUpperText(value?: string | null) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.toLocaleUpperCase('pt-BR').trim();
}

export function normalizeEmail(value?: string | null) {
  const cleanValue = value?.trim().toLowerCase();

  return cleanValue || undefined;
}

export function uppercaseFields<TData extends object>(
  data: TData,
  fields: string[],
): TData {
  const normalizedData = { ...data } as Record<string, unknown>;

  fields.forEach((field) => {
    const value = normalizedData[field];

    if (typeof value === 'string') {
      normalizedData[field] = toUpperText(value);
    }
  });

  return normalizedData as TData;
}

export function uppercaseRecordFields(
  data: Record<string, unknown> | undefined,
  fields: string[],
) {
  if (!data) return data;

  const normalizedData = { ...data };

  fields.forEach((field) => {
    const value = normalizedData[field];

    if (typeof value === 'string') {
      normalizedData[field] = toUpperText(value);
    }
  });

  return normalizedData;
}
