import { getCompanyStorageItem, setCompanyStorageItem } from "./company-storage";
import { setCachedAppSettings } from "./settings-cache";

export type ThemeMode = "light" | "black" | "graphite";

export type ThemeSettings = {
  mode: ThemeMode;
  accent?: string;
};

export const defaultThemeSettings: ThemeSettings = {
  mode: "light",
  accent: "orange",
};

export const allowedAccents = [
  "orange",
  "cobalt",
  "emerald",
  "violet",
  "gray",
  "rose",
] as const;

export function normalizeThemeMode(value: unknown): ThemeMode {
  const normalizedValue = String(value || "").toLowerCase();

  if (normalizedValue === "graphite" || normalizedValue === "grafite") {
    return "graphite";
  }

  return normalizedValue === "black" || normalizedValue === "dark"
    ? "black"
    : "light";
}

export function normalizeThemeSettings(
  settings?: Partial<ThemeSettings> | null,
): ThemeSettings {
  let rawAccent = settings?.accent;
  if (rawAccent === "amber") {
    rawAccent = "gray";
  }
  const accent =
    rawAccent && (allowedAccents as readonly string[]).includes(rawAccent)
      ? rawAccent
      : "orange";

  return {
    ...defaultThemeSettings,
    ...(settings || {}),
    mode: normalizeThemeMode(settings?.mode),
    accent,
  };
}

export function readThemeSettingsFromStorage(companyId?: string): ThemeSettings {
  if (typeof window === "undefined") return defaultThemeSettings;

  const storageKeys = [
    "contrx_theme_settings",
    "contrx_theme",
    "contrx_current_theme",
    "theme",
  ];

  // 1. Try company-scoped keys first
  for (const storageKey of storageKeys) {
    const storedValue = getCompanyStorageItem(
      companyId,
      storageKey,
      storageKey,
    );

    if (!storedValue) continue;

    try {
      const parsedValue = JSON.parse(storedValue) as Partial<ThemeSettings> | string;
      if (typeof parsedValue === "string") {
        return { mode: normalizeThemeMode(parsedValue), accent: "orange" };
      }
      return normalizeThemeSettings(parsedValue);
    } catch {
      return { mode: normalizeThemeMode(storedValue), accent: "orange" };
    }
  }

  // 2. Try iterating localStorage for any key with contrx_theme_settings
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === "contrx_theme_settings" || k.includes(":contrx_theme_settings"))) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const parsed = JSON.parse(val) as Partial<ThemeSettings>;
            if (parsed && (parsed.mode || parsed.accent)) {
              return normalizeThemeSettings(parsed);
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 3. Try cookie fallback
  try {
    const match = document.cookie.match(/(?:^|; )contrx_theme=([^;]*)/);
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<ThemeSettings>;
      if (parsed) {
        return normalizeThemeSettings(parsed);
      }
    }
  } catch {}

  return defaultThemeSettings;
}

export function applyThemeToDom(themeSettings: ThemeSettings) {
  if (typeof document === "undefined") return;

  const isDarkMode = themeSettings.mode !== "light";
  document.documentElement.classList.toggle("dark", isDarkMode);
  document.body.classList.toggle("dark", isDarkMode);
  document.documentElement.dataset.contrxTheme = themeSettings.mode;
  document.body.dataset.contrxTheme = themeSettings.mode;

  const activeAccent = themeSettings.accent || "orange";
  document.documentElement.dataset.contrxAccent = activeAccent;
  document.body.dataset.contrxAccent = activeAccent;
}

export function saveThemeSettingsLocally(
  settings: Partial<ThemeSettings>,
  companyId?: string,
): ThemeSettings {
  if (typeof window === "undefined") return defaultThemeSettings;

  const normalized = normalizeThemeSettings(settings);

  setCompanyStorageItem(
    companyId,
    "contrx_theme_settings",
    JSON.stringify(normalized),
  );
  setCompanyStorageItem(companyId, "contrx_theme", normalized.mode);

  try {
    localStorage.setItem("contrx_theme_settings", JSON.stringify(normalized));
    localStorage.setItem("contrx_theme", normalized.mode);
    document.cookie = `contrx_theme=${encodeURIComponent(
      JSON.stringify(normalized),
    )}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}

  setCachedAppSettings({ themeSettings: normalized });
  applyThemeToDom(normalized);
  window.dispatchEvent(new Event("contrx-theme-change"));

  return normalized;
}
