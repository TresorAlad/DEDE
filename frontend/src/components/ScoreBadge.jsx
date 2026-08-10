function palette(score) {
  if (score >= 75) return { color: "#5ffbd6", label: "Optimal" };
  if (score >= 50) return { color: "#f59e0b", label: "À surveiller" };
  if (score > 0) return { color: "#f43f5e", label: "Critique" };
  return { color: "#85948e", label: "Indéterminé" };
}

export default function ScoreBadge({ score = 0, risk = "Inconnu" }) {
  const value = Math.round(Number(score) || 0);
  const { color, label } = palette(value);

  return (
    <div
      className="inline-flex flex-col rounded border px-md py-sm"
      style={{ borderColor: `${color}33`, backgroundColor: `${color}14` }}
    >
      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
        Score ƉEƉE
      </span>
      <span className="font-display-lg tracking-tighter" style={{ color, fontSize: "32px", lineHeight: "40px" }}>
        {value}
        <span className="font-data-mono text-data-mono text-on-surface-variant">/100</span>
      </span>
      <span className="mt-xs font-data-mono text-[12px] text-on-surface-variant">
        {risk || label}
      </span>
    </div>
  );
}
