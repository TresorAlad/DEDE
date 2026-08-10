import Icon from "./Icon";

const DEFAULT_CATEGORIES = {
  Configuration: null,
  "Exposition réseau": null,
  "Sécurité Web": null,
  "Gestion des accès": null,
  "Protection des données": null,
};

function barColor(value) {
  if (value >= 75) return "#5ffbd6";
  if (value >= 50) return "#f59e0b";
  return "#f43f5e";
}

export default function CategoryBreakdown({ categories = {}, title = "Répartition par catégorie" }) {
  const entries = Object.entries({ ...DEFAULT_CATEGORIES, ...categories });
  const evaluated = entries.filter(([, score]) => score !== null && score !== undefined);

  return (
    <div className="panel h-full">
      <div className="panel-veil" />
      <div className="relative z-10 flex h-full flex-col p-md">
        <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
          <h2 className="panel-title">{title}</h2>
          <span className="font-data-mono text-[12px] text-on-surface-variant">
            {evaluated.length}/{entries.length} analysées
          </span>
        </div>

        <ul className="space-y-md">
          {entries.map(([name, score]) => {
            const notEvaluated = score === null || score === undefined;
            const value = notEvaluated ? 0 : Math.max(0, Math.min(100, Number(score) || 0));
            const color = notEvaluated ? "#3c4a45" : barColor(value);
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
                    <div className="h-full w-full bg-[repeating-linear-gradient(45deg,#2f3633,#2f3633_6px,#242c29_6px,#242c29_12px)]" />
                  ) : (
                    <div
                      className="h-full rounded-pill transition-all duration-700"
                      style={{ width: `${value}%`, backgroundColor: color }}
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
