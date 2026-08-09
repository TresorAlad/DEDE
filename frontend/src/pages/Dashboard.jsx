import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, Plus } from "lucide-react";
import AppShell from "../components/AppShell";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ScoreGauge from "../components/ScoreGauge";
import CategoryBreakdown from "../components/CategoryBreakdown";
import StatusBadge from "../components/StatusBadge";
import { CardSkeleton } from "../components/Skeleton";
import { api } from "../api/client";

export default function Dashboard() {
  const [platforms, setPlatforms] = useState([]);
  const [audits, setAudits] = useState([]);
  const [latestReport, setLatestReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer;

    async function load(isPoll = false) {
      try {
        const [p, a] = await Promise.all([api("/platforms"), api("/audits")]);
        if (!active) return;
        setPlatforms(p);
        setAudits(a);

        const completed = a.find((audit) => audit.status === "completed" && audit.score != null);
        if (completed) {
          const report = await api(`/reports/${completed.id}`);
          if (active) setLatestReport(report);
        } else if (active) {
          setLatestReport(null);
        }

        const pending = a.some((audit) => audit.status === "queued" || audit.status === "running");
        clearInterval(timer);
        if (pending) {
          timer = setInterval(() => load(true), 4000);
        }
      } catch (err) {
        if (active && !isPoll) setError(err.message);
      } finally {
        if (active && !isPoll) setLoading(false);
      }
    }

    load(false);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const verifiedCount = platforms.filter((p) => p.verification_status === "verified").length;
  const completedAudits = audits.filter((a) => a.status === "completed");
  const scoredAudits = completedAudits.filter((a) => a.score != null);
  const averageScore = scoredAudits.length
    ? scoredAudits.reduce((sum, a) => sum + a.score, 0) / scoredAudits.length
    : 0;
  const recentPlatforms = platforms.slice(0, 3);
  const recentAudits = audits.slice(0, 3);
  const chatAuditId = latestReport?.audit_id || completedAudits[0]?.id;

  return (
    <AppShell>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de vos plateformes, audits et score de sécurité."
        actions={
          <Link to="/platforms/new" className="btn-primary">
            <Plus size={16} />
            Ajouter une plateforme
          </Link>
        }
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Score moyen"
              value={scoredAudits.length ? Math.round(averageScore) : "-"}
              hint={scoredAudits.length ? `${scoredAudits.length} audit(s) noté(s)` : "Aucun score disponible"}
              color="#1B3A5C"
              trend={scoredAudits.slice(0, 7).map((a) => a.score || 0).reverse()}
            />
            <StatCard
              label="Plateformes"
              value={`${verifiedCount}/${platforms.length}`}
              hint="Vérifiées / total"
              color="#007A8C"
              trend={[platforms.length, verifiedCount, platforms.length - verifiedCount, verifiedCount + 1]}
            />
            <StatCard
              label="Audits terminés"
              value={`${completedAudits.length}/${audits.length}`}
              hint="Terminés / total"
              color="#2ECC71"
              trend={[audits.length, completedAudits.length, audits.filter((a) => a.status === "failed").length]}
            />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <ScoreGauge
              score={latestReport?.score || 0}
              risk={latestReport?.risk_level || "Inconnu"}
              title="Dernier score de sécurité"
            />
            <CategoryBreakdown categories={latestReport?.categories || {}} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-primary">Plateformes récentes</h2>
                <Link to="/platforms" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                  Voir tout <ArrowRight size={14} />
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {recentPlatforms.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                    <div>
                      <p className="font-medium text-primary">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.domain}</p>
                    </div>
                    <StatusBadge value={p.verification_status} />
                  </li>
                ))}
                {!recentPlatforms.length && (
                  <li className="text-sm text-slate-500">Aucune plateforme enregistrée.</li>
                )}
              </ul>
            </div>

            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-primary">Audits récents</h2>
                <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                  Voir tout <ArrowRight size={14} />
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {recentAudits.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                    <div>
                      <p className="font-medium text-primary">Audit #{a.id}</p>
                      <p className="text-xs text-slate-500">
                        {a.score != null ? `Score ${Math.round(a.score)}` : "Score en attente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={a.status} />
                      <Link to={`/reports/${a.id}`} className="text-sm text-accent hover:underline">
                        Voir
                      </Link>
                    </div>
                  </li>
                ))}
                {!recentAudits.length && (
                  <li className="text-sm text-slate-500">Aucun audit lancé.</li>
                )}
              </ul>
            </div>
          </section>

          <section className="mt-6 rounded-card bg-primary p-6 text-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Assistant IA ƉEƉE</h2>
                <p className="mt-1 max-w-2xl text-sm text-white/75">
                  Interrogez vos résultats d'audit en langage naturel : risques prioritaires,
                  recommandations et plan de correction.
                </p>
              </div>
              {chatAuditId ? (
                <Link
                  to={`/reports/${chatAuditId}/chat`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-primary"
                >
                  <MessageSquare size={16} />
                  Ouvrir le chatbot
                </Link>
              ) : (
                <span className="rounded-full bg-white/10 px-5 py-2.5 text-sm text-white/80">
                  Lancez un audit pour activer l'assistant
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
