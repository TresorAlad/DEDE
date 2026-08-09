export default function ScoreBadge({ score = 0, risk = "Inconnu" }) {
  let color = "bg-slate-500";
  if (score >= 80) color = "bg-emerald-600";
  else if (score >= 50) color = "bg-amber-500";
  else if (score > 0) color = "bg-rose-500";

  return (
    <div className={`inline-flex flex-col rounded-card ${color} px-5 py-4 text-white shadow-card`}>
      <span className="text-xs uppercase tracking-wide opacity-90">Score ƉEƉE</span>
      <span className="text-3xl font-bold">{Math.round(score || 0)}/100</span>
      <span className="mt-1 text-sm">Risque : {risk}</span>
    </div>
  );
}
