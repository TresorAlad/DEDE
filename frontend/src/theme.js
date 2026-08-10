/**
 * Gestion du thème clair / sombre.
 *
 * La préférence est stockée dans localStorage. Sans choix explicite, on
 * respecte la préférence système (prefers-color-scheme).
 */

export const THEME_STORAGE_KEY = "dede-theme";

export function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage indisponible (navigation privée stricte, etc.)
  }
  return null;
}

export function resolveTheme(preference = getStoredTheme()) {
  return preference || getSystemTheme();
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = theme === "light" ? "light" : "dark";
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;
  return resolved;
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  return applyTheme(theme);
}
