import StatusBadge from "./StatusBadge";

export default function RiskList({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">Aucun risque listé pour le moment.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const command = item.fix_command || item.commande;
        return (
          <li key={index} className="rounded-card border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-primary">{item.title || item.type || "Risque"}</p>
              <StatusBadge value={(item.severity || "info").toLowerCase()} />
            </div>
            {item.host && <p className="mt-1 text-xs text-slate-400">Cible : {item.host}</p>}
            <p className="mt-2 text-sm text-slate-600">{item.description || item.risk || ""}</p>
            {item.solution && (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-primary">Correction : </span>
                {item.solution}
              </p>
            )}
            {command && (
              <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-emerald-300">
                {command}
              </code>
            )}
          </li>
        );
      })}
    </ul>
  );
}
