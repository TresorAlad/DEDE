import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

function scoreColor(score, risk) {
  if (risk === "Indéterminé") return "#94A3B8";
  if (score >= 90) return "#2ECC71";
  if (score >= 75) return "#F59E0B";
  if (score >= 50) return "#FB923C";
  if (score > 0) return "#E57373";
  return "#94A3B8";
}

export default function ScoreGauge({ score = 0, risk = "Inconnu", title = "Score de sécurité" }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const undetermined = risk === "Indéterminé";
  const color = scoreColor(value, risk);
  // On affiche 0 pour l'arc quand le score est indéterminé (arc vide + "?").
  const arcValue = undetermined ? 0 : value;
  const data = [{ name: "score", value: arcValue, fill: color }];

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <p className="text-sm font-semibold text-primary">{title}</p>
      <div className="relative mx-auto mt-2 h-52 w-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={210}
            endAngle={-30}
            data={data}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "#E2E8F0" }}
              dataKey="value"
              cornerRadius={12}
              angleAxisId={0}
              clockwise
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {undetermined ? (
            <span className="text-3xl font-bold text-slate-400">?</span>
          ) : (
            <>
              <span className="text-4xl font-bold text-primary">{Math.round(value)}</span>
              <span className="text-xs uppercase tracking-wide text-slate-400">/ 100</span>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-slate-600">
        Niveau de risque : <span className="font-semibold text-primary">{risk || "Inconnu"}</span>
      </p>
      {undetermined && (
        <p className="mt-1 text-center text-xs text-slate-400">
          Analyse insuffisante pour attribuer un score fiable.
        </p>
      )}
    </div>
  );
}
