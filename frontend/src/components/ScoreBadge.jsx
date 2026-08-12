import { scoreTone, withAlpha } from "../themeColors";

export default function ScoreBadge({ score = 0, risk = "Inconnu" }) {
  const value = Math.round(Number(score) || 0);
  const { color, label } = scoreTone(value);

  return (
    <div
      className="inline-flex flex-col rounded border px-md py-sm"
      style={{
        borderColor: withAlpha(color, 0.2),
        backgroundColor: withAlpha(color, 0.08),
      }}
    >
      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
        Score ƉeƉeFIA
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
