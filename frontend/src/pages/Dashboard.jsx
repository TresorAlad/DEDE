import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ScoreBadge from "../components/ScoreBadge";
import { api } from "../api/client";

export default function Dashboard() {
  const [platforms, setPlatforms] = useState([]);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [p, a] = await Promise.all([
          api("/platforms"),
          api("/audits"),
        ]);
        setPlatforms(p);
        setAudits(a);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  const latestScore = audits.find((a) => a.score != null);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Tableau de bord</h1>
            <p className="text-sm text-slate-500">Suivez vos plateformes et audits.</p>
          </div>
          <Link to="/platforms/new" className="rounded bg-accent px-4 py-2 text-white text-sm">
            Ajouter une plateforme
          </Link>
        </div>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        <div className="mt-6">
          {latestScore ? (
            <ScoreBadge score={latestScore.score} risk={latestScore.risk_level} />
          ) : (
            <p className="text-sm text-slate-500">Aucun score disponible pour le moment.</p>
          )}
        </div>
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-primary">Plateformes</h2>
          <ul className="mt-3 space-y-2">
            {platforms.map((p) => (
              <li key={p.id} className="rounded border bg-white px-4 py-3 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-slate-500"> - {p.domain}</span>
                <span className="ml-2 text-xs uppercase text-accent">{p.verification_status}</span>
              </li>
            ))}
            {!platforms.length && (
              <li className="text-sm text-slate-500">Aucune plateforme enregistrée.</li>
            )}
          </ul>
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-primary">Audits récents</h2>
          <ul className="mt-3 space-y-2">
            {audits.map((a) => (
              <li key={a.id} className="rounded border bg-white px-4 py-3 text-sm flex justify-between">
                <span>
                  Audit #{a.id} - {a.status}
                </span>
                <Link className="text-accent" to={`/reports/${a.id}`}>
                  Voir le rapport
                </Link>
              </li>
            ))}
            {!audits.length && (
              <li className="text-sm text-slate-500">Aucun audit lancé.</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
