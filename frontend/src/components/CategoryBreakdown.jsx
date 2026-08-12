import Icon from "./Icon";
import { scoreTone, themeColor } from "../themeColors";

const DEFAULT_CATEGORIES = {
  Configuration: null,
  "Exposition réseau": null,
  "Sécurité Web": null,
  "Gestion des accès": null,
  "Protection des données": null,
};

const SEVERITY_KEYS = new Set(["critical", "high", "medium", "low", "critique", "haute", "moyenne", "basse", "élevée", "elevee"]);

const SEVERITY_ORDER = [
  ["critical", "Critique"],
  ["critique", "Critique"],
  ["high", "Haute"],
  ["haute", "Haute"],
  ["élevée", "Élevée"],
  ["elevee", "Élevée"],
  ["medium", "Moyenne"],
  ["moyenne", "Moyenne"],
  ["low", "Faible"],
  ["basse", "Faible"],
];

function isSeverityBreakdown(categories) {
  const keys = Object.keys(categories || {});
  if (!keys.length) return false;
  return keys.every((key) => SEVERITY_KEYS.has(key.toLowerCase()));
}

function severityColor(label) {
  const map = {
    Critique: themeColor("critical"),
    Haute: themeColor("critical"),
    Élevée: themeColor("warning"),
    Moyenne: themeColor("warning"),
    Faible: themeColor("primary-container"),
  };
  return map[label] || themeColor("outline-variant");
}

function normalizeSeverityEntries(categories) {
  const normalized = {};
  for (const [key, count] of Object.entries(categories || {})) {
    const lower = key.toLowerCase();
    const match = SEVERITY_ORDER.find(([alias]) => alias === lower);
    const label = match ? match[1] : key;
    normalized[label] = (normalized[label] || 0) + Number(count || 0);
  }
  const order = ["Critique", "Haute", "Élevée", "Moyenne", "Faible"];
  return order.filter((label) => normalized[label]).map((label) => [label, normalized[label]]);
}

export default function CategoryBreakdown({
  categories = {},
  title,
  engine,
}) {
  const severityMode = engine === "agents" || isSeverityBreakdown(categories);

  if (severityMode && Object.keys(categories || {}).length > 0) {
    const entries = normalizeSeverityEntries(categories);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    return (
      <div className="panel h-full">
        <div className="panel-veil" />
        <div className="relative z-10 flex h-full flex-col p-md">
          <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
            <h2 className="panel-title">{title || "Répartition par sévérité"}</h2>
            <span className="font-data-mono text-[12px] text-on-surface-variant">
              {total} vulnérabilité(s)
            </span>
          </div>

          <ul className="space-y-md">
            {entries.map(([label, count]) => {
              const color = severityColor(label);
              const width = total ? Math.max(8, Math.round((count / total) * 100)) : 0;
              return (
                <li key={label}>
                  <div className="mb-xs flex items-center justify-between gap-sm">
                    <div className="flex items-center gap-base">
                      <span
                        className="h-1.5 w-1.5 rounded-pill"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-data-mono text-data-mono text-on-surface">{label}</span>
                    </div>
                    <span className="font-data-mono text-data-mono" style={{ color }}>
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-surface-variant/60">
                    <div
                      className="bar-fill h-full rounded-pill"
                      style={{ width: `${width}%`, "--bar-w": `${width}%`, backgroundColor: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-auto flex items-center gap-base pt-md font-data-mono text-[12px] text-on-surface-variant">
            <Icon name="info" size={16} />
            Audit par agents IA : comptage par sévérité, pas les 5 axes scanners.
          </p>
        </div>
      </div>
    );
  }

  const entries = Object.entries({ ...DEFAULT_CATEGORIES, ...categories });
  const evaluated = entries.filter(([, score]) => score !== null && score !== undefined);
  const categoryAverage = evaluated.length
    ? evaluated.reduce((sum, [, score]) => sum + Number(score), 0) / evaluated.length
    : null;

  return (
    <div className="panel h-full">
      <div className="panel-veil" />
      <div className="relative z-10 flex h-full flex-col p-md">
        <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
          <h2 className="panel-title">{title || "Répartition par catégorie"}</h2>
          <span className="font-data-mono text-[12px] text-on-surface-variant">
            {evaluated.length}/{entries.length} analysées
            {categoryAverage != null ? ` · moy. ${Math.round(categoryAverage)}%` : ""}
          </span>
        </div>

        <ul className="space-y-md">
          {entries.map(([name, score]) => {
            const notEvaluated = score === null || score === undefined;
            const value = notEvaluated ? 0 : Math.max(0, Math.min(100, Number(score) || 0));
            const color = notEvaluated
              ? themeColor("outline-variant", "#c5d0cb")
              : scoreTone(value || 1).color;
            return (
              <li key={name}>
                <div className="mb-xs flex items-center justify-between gap-sm">
                  <div className="flex items-center gap-base">
                    <span
                      className="h-1.5 w-1.5 rounded-pill"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className={
                        notEvaluated
                          ? "font-data-mono text-data-mono text-outline"
                          : "font-data-mono text-data-mono text-on-surface"
                      }
                    >
                      {name}
                    </span>
                  </div>
                  {notEvaluated ? (
                    <span className="font-label-caps text-label-caps uppercase text-outline">
                      Non évalué
                    </span>
                  ) : (
                    <span className="font-data-mono text-data-mono" style={{ color }}>
                      {Math.round(value)}%
                    </span>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-pill bg-surface-variant/60">
                  {notEvaluated ? (
                    <div className="h-full w-full bg-[repeating-linear-gradient(45deg,rgb(var(--color-surface-variant)),rgb(var(--color-surface-variant))_6px,rgb(var(--color-surface-container-high))_6px,rgb(var(--color-surface-container-high))_12px)]" />
                  ) : (
                    <div
                      className="bar-fill h-full rounded-pill"
                      style={{ width: `${value}%`, "--bar-w": `${value}%`, backgroundColor: color }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {!evaluated.length && (
          <p className="mt-auto flex items-center gap-base pt-md font-data-mono text-[12px] text-on-surface-variant">
            <Icon name="info" size={16} />
            Lancez un audit pour alimenter ces indicateurs.
          </p>
        )}
      </div>
    </div>
  );
}
