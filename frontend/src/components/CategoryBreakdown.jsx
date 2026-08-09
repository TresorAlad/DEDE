const COLORS = ["#1B3A5C", "#007A8C", "#2ECC71", "#F59E0B", "#E57373"];

const DEFAULT_CATEGORIES = {
  Configuration: null,
  "Exposition réseau": null,
  "Sécurité Web": null,
  "Gestion des accès": null,
  "Protection des données": null,
};

export default function CategoryBreakdown({ categories = {}, title = "Répartition par catégorie" }) {
  const entries = Object.entries({ ...DEFAULT_CATEGORIES, ...categories });
  const evaluated = entries.filter(([, score]) => score !== null && score !== undefined);

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-primary">{title}</p>
        <p className="text-xs text-slate-400">
          Couverture : {evaluated.length}/{entries.length} catégories analysées
        </p>
      </div>
      <ul className="mt-5 space-y-4">
        {entries.map(([name, score], index) => {
          const notEvaluated = score === null || score === undefined;
          const value = notEvaluated ? 0 : Math.max(0, Math.min(100, Number(score) || 0));
          const color = notEvaluated ? "#CBD5E1" : COLORS[index % COLORS.length];
          return (
            <li key={name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className={notEvaluated ? "text-slate-400" : "text-slate-600"}>{name}</span>
                </div>
                {notEvaluated ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Non évalué
                  </span>
                ) : (
                  <span className="font-semibold text-primary">{Math.round(value)}%</span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                {notEvaluated ? (
                  <div className="h-full w-full rounded-full bg-[repeating-linear-gradient(45deg,#E2E8F0,#E2E8F0_6px,#F1F5F9_6px,#F1F5F9_12px)]" />
                ) : (
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, backgroundColor: color }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
