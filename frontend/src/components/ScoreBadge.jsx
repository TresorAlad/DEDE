export default function ScoreBadge({ score = 0, risk = "Inconnu" }) {
  let color = "bg-slate-500";
  if (score >= 80) color = "bg-emerald-600";
  else if (score >= 50) color = "bg-amber-500";
  else if (score > 0) color = "bg-rose-600";

  return (
    <div className={`inline-flex flex-col rounded-lg ${color} px-4 py-3 text-white`}>
      <span className="text-xs uppercase tracking-wide opacity-90">Score DEDE</span>
      <span className="text-3xl font-bold">{score}/100</span>
      <span className="text-sm">Risque : {risk}</span>
    </div>
  );
}
