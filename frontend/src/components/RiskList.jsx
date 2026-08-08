export default function RiskList({ items = [] }) {
  if (!items.length) {
    return <p className="text-slate-500 text-sm">Aucun risque listé pour le moment.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="rounded border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-primary">{item.title || item.type || "Risque"}</p>
            <span className="text-xs uppercase text-accent">{item.severity || "info"}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.description || item.risk || ""}</p>
        </li>
      ))}
    </ul>
  );
}
