import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ScoreBadge from "../components/ScoreBadge";
import RiskList from "../components/RiskList";
import { api } from "../api/client";

export default function Report() {
  const { auditId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api(`/reports/${auditId}`);
        setReport(data);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [auditId]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-primary">Rapport d'audit #{auditId}</h1>
          <Link
            to={`/reports/${auditId}/chat`}
            className="rounded bg-accent px-4 py-2 text-sm text-white"
          >
            Ouvrir le chatbot
          </Link>
        </div>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        {!report && !error && <p className="mt-4 text-sm text-slate-500">Chargement...</p>}
        {report && (
          <div className="mt-6 space-y-6">
            <ScoreBadge score={report.score} risk={report.risk_level} />
            <section>
              <h2 className="text-lg font-semibold text-primary">Résumé</h2>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                {report.summary || "Résumé non encore généré."}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-primary">Risques détectés</h2>
              <div className="mt-3">
                <RiskList items={report.findings || []} />
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-primary">Recommandations</h2>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                {(report.recommendations || []).map((rec, i) => (
                  <li key={i}>{typeof rec === "string" ? rec : rec.title || JSON.stringify(rec)}</li>
                ))}
                {!(report.recommendations || []).length && (
                  <li>Aucune recommandation pour le moment.</li>
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
