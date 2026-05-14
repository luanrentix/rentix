export function getCompanyStorageKey(companyId: string | undefined, key: string) {
  return companyId ? `rentix:${companyId}:${key}` : key;
}

export function getCompanyStorageItem(
  companyId: string | undefined,
  key: string,
  legacyKey?: string,
) {
  if (typeof window === 'undefined') return null;

  const scopedKey = getCompanyStorageKey(companyId, key);
  const scopedValue = localStorage.getItem(scopedKey);

  if (scopedValue !== null || !legacyKey || !companyId) {
    return scopedValue;
  }

  const legacyValue = localStorage.getItem(legacyKey);

  if (legacyValue !== null) {
    localStorage.setItem(scopedKey, legacyValue);
  }

  return legacyValue;
}

export function setCompanyStorageItem(
  companyId: string | undefined,
  key: string,
  value: string,
) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(getCompanyStorageKey(companyId, key), value);
}

export function removeCompanyStorageItem(companyId: string | undefined, key: string) {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(getCompanyStorageKey(companyId, key));
}
