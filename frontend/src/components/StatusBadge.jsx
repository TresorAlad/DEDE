const STYLES = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  queued: "bg-slate-100 text-slate-600",
  running: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  critical: "bg-rose-100 text-rose-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-sky-100 text-sky-700",
  info: "bg-slate-100 text-slate-600",
  // L'IA renvoie parfois les sévérités en français.
  critique: "bg-rose-100 text-rose-700",
  haute: "bg-orange-100 text-orange-700",
  élevée: "bg-orange-100 text-orange-700",
  moyenne: "bg-amber-100 text-amber-700",
  modérée: "bg-amber-100 text-amber-700",
  basse: "bg-sky-100 text-sky-700",
  faible: "bg-sky-100 text-sky-700",
  Faible: "bg-emerald-100 text-emerald-700",
  Moyen: "bg-amber-100 text-amber-700",
  Modéré: "bg-amber-100 text-amber-700",
  Élevé: "bg-orange-100 text-orange-700",
  Critique: "bg-rose-100 text-rose-700",
  Indéterminé: "bg-slate-200 text-slate-600",
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
  const style = STYLES[key] || "bg-slate-100 text-slate-600";
  const text = label || LABELS[key] || key;
  const pulsing = key === "running" || key === "queued";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${style}`}
    >
      {pulsing && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {text}
    </span>
  );
}
