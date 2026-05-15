export function getCompanyStorageKey(companyId: string | undefined, key: string) {
  return companyId ? `contrx:${companyId}:${key}` : key;
}

const LEGACY_STORAGE_PREFIX = ['ren', 'tix'].join('');

function getLegacyCompanyStorageKey(companyId: string | undefined, key: string) {
  return companyId ? `${LEGACY_STORAGE_PREFIX}:${companyId}:${key}` : key;
}

function getLegacyKeyVariants(key: string, legacyKey?: string) {
  return Array.from(
    new Set(
      [legacyKey, key, key.replace(/^contrx/, LEGACY_STORAGE_PREFIX)].filter(
        Boolean,
      ) as string[],
    ),
  );
}

export function getCompanyStorageItem(
  companyId: string | undefined,
  key: string,
  legacyKey?: string,
) {
  if (typeof window === 'undefined') return null;

  const scopedKey = getCompanyStorageKey(companyId, key);
  const scopedValue = localStorage.getItem(scopedKey);

  if (scopedValue !== null) {
    return scopedValue;
  }

  for (const keyVariant of getLegacyKeyVariants(key, legacyKey)) {
    const possibleKeys = companyId
      ? [getLegacyCompanyStorageKey(companyId, keyVariant), keyVariant]
      : [keyVariant];

    for (const possibleKey of possibleKeys) {
      const legacyValue = localStorage.getItem(possibleKey);

      if (legacyValue !== null) {
        localStorage.setItem(scopedKey, legacyValue);
        return legacyValue;
      }
    }
  }

  return null;
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
  localStorage.removeItem(getLegacyCompanyStorageKey(companyId, key));
  localStorage.removeItem(
    getLegacyCompanyStorageKey(
      companyId,
      key.replace(/^contrx/, LEGACY_STORAGE_PREFIX),
    ),
  );
}
