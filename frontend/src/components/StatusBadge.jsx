// Palette d'etats reprise des maquettes : vert operationnel, ambre, rouge critique.
const SUCCESS = "border-success/30 bg-success/10 text-success";
const WARNING = "border-warning/30 bg-warning/10 text-warning";
const CRITICAL = "border-critical/30 bg-critical/10 text-critical";
const NEUTRAL = "border-outline-variant/30 bg-surface-variant/30 text-on-surface-variant";
const ACCENT = "border-primary-container/30 bg-primary-container/10 text-primary-container";

const STYLES = {
  pending: WARNING,
  verified: SUCCESS,
  queued: NEUTRAL,
  running: ACCENT,
  completed: SUCCESS,
  failed: CRITICAL,
  critical: CRITICAL,
  high: WARNING,
  medium: WARNING,
  low: ACCENT,
  info: NEUTRAL,
  // L'IA renvoie parfois les sévérités en français.
  critique: CRITICAL,
  haute: WARNING,
  élevée: WARNING,
  moyenne: WARNING,
  modérée: WARNING,
  basse: ACCENT,
  faible: ACCENT,
  Faible: SUCCESS,
  Moyen: WARNING,
  Modéré: WARNING,
  Élevé: WARNING,
  Critique: CRITICAL,
  Indéterminé: NEUTRAL,
};

const LABELS = {
  pending: "En attente",
  verified: "Vérifiée",
  queued: "En file",
  running: "En cours",
  completed: "Terminé",
  failed: "Échoué",
};

export default function StatusBadge({ value, label }) {
  const key = value || "info";
  const style = STYLES[key] || NEUTRAL;
  const text = label || LABELS[key] || key;
  const pulsing = key === "running" || key === "queued";
  const dangerous = style === CRITICAL;

  return (
    <span className={`chip ${style}`}>
      <span
        className={`h-1.5 w-1.5 rounded-pill bg-current ${pulsing ? "animate-pulse" : ""} ${
          dangerous ? "outer-glow-critical" : ""
        }`}
      />
      {text}
    </span>
  );
}
