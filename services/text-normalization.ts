export function toUpperText(value: string) {
  return value.toLocaleUpperCase('pt-BR');
}

export function uppercaseFields<TData extends Record<string, unknown>>(
  data: TData,
  fields: Array<keyof TData>,
): TData {
  const normalizedData = { ...data };

  fields.forEach((field) => {
    const value = normalizedData[field];

    if (typeof value === 'string') {
      normalizedData[field] = toUpperText(value).trim() as TData[keyof TData];
    }
  });

  return normalizedData;
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
      normalizedData[field] = toUpperText(value).trim();
    }
  });

  return normalizedData;
}
