import Icon from "./Icon";
import useCountUp from "../hooks/useCountUp";

export default function StatCard({ label, value, hint, icon = "monitoring", tone = "accent" }) {
  // Seules les valeurs purement numeriques defilent : un ratio ou un tiret
  // reste affiche tel quel.
  const countRef = useCountUp(typeof value === "number" ? value : NaN);
  const tones = {
    accent: "text-primary-container border-primary-container/30 bg-primary-container/10",
    success: "text-success border-success/30 bg-success/10",
    warning: "text-warning border-warning/30 bg-warning/10",
    critical: "text-critical border-critical/30 bg-critical/10",
    neutral: "text-secondary border-secondary/30 bg-secondary/10",
  };

  return (
    <div className="panel h-full">
      <div className="panel-veil" />
      <div className="relative z-10 flex h-full flex-col p-md">
        <div className="mb-sm flex items-start justify-between border-b border-outline-variant/30 pb-xs">
          <span className="panel-title">{label}</span>
          <span className={`rounded border p-xs ${tones[tone] || tones.accent}`}>
            <Icon name={icon} size={18} />
          </span>
        </div>
        <p
          ref={countRef}
          className="font-display-lg tracking-tighter text-primary"
          style={{ fontSize: "32px", lineHeight: "40px" }}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-auto pt-sm font-data-mono text-[12px] text-on-surface-variant">{hint}</p>
        )}
      </div>
    </div>
  );
}
