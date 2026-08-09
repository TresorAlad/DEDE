import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Skeleton } from "../components/Skeleton";
import { api } from "../api/client";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

export default function Reports() {
  const [audits, setAudits] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [a, p] = await Promise.all([api("/audits"), api("/platforms")]);
    setAudits(a);
    setPlatforms(p);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const pending = audits.some((a) => a.status === "queued" || a.status === "running");
    if (!pending) return undefined;
    const timer = setInterval(() => {
      load().catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [audits]);

  function platformName(platformId) {
    return platforms.find((p) => p.id === platformId)?.name || `Plateforme #${platformId}`;
  }

  return (
    <AppShell>
      <PageHeader title="Rapports" subtitle="Historique de vos audits de sécurité." />
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Audit</th>
                <th className="px-5 py-3">Plateforme</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Risque</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-5 py-4" colSpan={7}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading &&
                audits.map((audit) => (
                  <tr key={audit.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-medium text-primary">#{audit.id}</td>
                    <td className="px-5 py-4 text-slate-600">{platformName(audit.platform_id)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge value={audit.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {audit.score != null ? Math.round(audit.score) : "-"}
                    </td>
                    <td className="px-5 py-4">
                      {audit.risk_level ? <StatusBadge value={audit.risk_level} /> : "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(audit.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link to={`/reports/${audit.id}`} className="font-medium text-accent hover:underline">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              {!loading && !audits.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    Aucun audit pour le moment. Vérifiez une plateforme puis lancez un scan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
