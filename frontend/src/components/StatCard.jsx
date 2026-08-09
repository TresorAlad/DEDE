import { Bar, BarChart, ResponsiveContainer } from "recharts";

export default function StatCard({ label, value, hint, trend = [], color = "#007A8C" }) {
  const chartData = (trend.length ? trend : [2, 4, 3, 6, 5, 7, 4]).map((v, i) => ({ i, v }));

  return (
    <div className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold text-primary">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="h-12 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="v" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
