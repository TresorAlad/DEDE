/**
 * Lit une couleur du thème courant (variables CSS --color-*).
 * Utile pour les styles inline (SVG, barres de score).
 */
export function themeColor(name, fallback = "#006b58") {
  if (typeof window === "undefined" || !document?.documentElement) return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
  if (!raw) return fallback;
  return `rgb(${raw})`;
}

/** Ajoute une opacité a une couleur rgb(...) du thème. */
export function withAlpha(color, alpha) {
  if (typeof color === "string" && color.startsWith("rgb(") && color.endsWith(")")) {
    return `${color.slice(0, -1)} / ${alpha})`;
  }
  return color;
}

export function scoreTone(score) {
  if (score == null || Number.isNaN(score) || score <= 0) {
    return { color: themeColor("outline", "#85948e"), label: "Indéterminé" };
  }
  if (score >= 75) {
    return { color: themeColor("surface-tint", "#006b58"), label: "Optimal" };
  }
  if (score >= 50) {
    return { color: themeColor("warning", "#d97706"), label: "À surveiller" };
  }
  return { color: themeColor("critical", "#e11d48"), label: "Critique" };
}
