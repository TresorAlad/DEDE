import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import CategoryBreakdown from "../components/CategoryBreakdown";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import ScoreGauge from "../components/ScoreGauge";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { CardSkeleton } from "../components/Skeleton";
import { api } from "../api/client";
import { scoreTone, themeColor } from "../themeColors";

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

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
  const runningAudits = audits.filter((a) => a.status === "running" || a.status === "queued");
  const scoredAudits = completedAudits.filter((a) => a.score != null);
  const averageScore = scoredAudits.length
    ? scoredAudits.reduce((sum, a) => sum + a.score, 0) / scoredAudits.length
    : 0;
  const recentPlatforms = platforms.slice(0, 4);
  const recentAudits = audits.slice(0, 5);
  const chatAuditId = latestReport?.audit_id || completedAudits[0]?.id;

  const platformById = Object.fromEntries(platforms.map((p) => [p.id, p]));

  return (
    <AppShell>
      <PageHeader
        title="Vue d'ensemble"
        subtitle="Posture de sécurité et état de vos plateformes en temps réel."
        actions={
          <div className="flex flex-wrap items-center gap-sm">
            <div
              className={`chip ${
                runningAudits.length
                  ? "border-primary-container/30 bg-primary-container/10 text-primary-container"
                  : "border-success/30 bg-success/10 text-success"
              }`}
            >
              <Icon
                name={runningAudits.length ? "radar" : "check_circle"}
                size={16}
                className="animate-pulse"
              />
              {runningAudits.length
                ? `${runningAudits.length} audit(s) en cours`
                : "Surveillance active"}
            </div>
            <Link to="/launch" className="btn-primary px-sm py-base">
              <Icon name="play_arrow" size={16} />
              Lancer un audit
            </Link>
          </div>
        }
      />

      {error && (
        <div className="col-span-12">
          <p className="flex items-center gap-base rounded border border-critical/30 bg-critical/10 px-sm py-base font-data-mono text-data-mono text-critical">
            <Icon name="error" size={16} />
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <>
          <div className="col-span-12 lg:col-span-4">
            <CardSkeleton lines={5} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <CardSkeleton lines={5} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <CardSkeleton lines={5} />
          </div>
        </>
      ) : (
        <>
          <div className="col-span-12 lg:col-span-4">
            <ScoreGauge
              score={latestReport?.score || 0}
              risk={latestReport?.risk_level || "Indéterminé"}
              title="Score de sécurité global"
              updatedAt={latestReport ? formatDateTime(latestReport.created_at) : null}
            />
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-gutter lg:col-span-8">
            <StatCard
              label="Score moyen"
              value={scoredAudits.length ? Math.round(averageScore) : "-"}
              hint={
                scoredAudits.length
                  ? `${scoredAudits.length} audit(s) noté(s)`
                  : "Aucun score disponible"
              }
              icon="speed"
              tone="accent"
            />
            <StatCard
              label="Plateformes vérifiées"
              value={`${verifiedCount}/${platforms.length}`}
              hint="Prêtes à être auditées"
              icon="verified_user"
              tone={verifiedCount === platforms.length && platforms.length ? "success" : "warning"}
            />
            <div className="col-span-2">
              <CategoryBreakdown
                categories={latestReport?.categories || {}}
                engine={latestReport?.engine}
              />
            </div>
          </div>

          <div className="col-span-12 mt-md">
            <div className="panel">
              <div className="panel-veil" />
              <div className="relative z-10">
                <div className="flex items-center justify-between border-b border-outline-variant/30 p-md">
                  <h2 className="panel-title">Activité récente et journal d'audits</h2>
                  <Link
                    to="/reports"
                    className="flex items-center gap-xs font-label-caps text-label-caps uppercase text-primary-container transition-colors hover:text-primary"
                  >
                    Tout afficher <Icon name="arrow_forward" size={16} />
                  </Link>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Audit</th>
                        <th>Horodatage</th>
                        <th>Cible</th>
                        <th>Score</th>
                        <th className="text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAudits.map((audit) => {
                        const platform = platformById[audit.platform_id];
                        const critical = audit.status === "failed";
                        const warning = audit.score != null && audit.score < 50;
                        const strip = critical
                          ? themeColor("critical")
                          : warning
                            ? themeColor("warning")
                            : null;
                        return (
                          <tr key={audit.id} className="relative">
                            {strip && (
                              <td
                                className="absolute bottom-0 left-0 top-0 w-1 p-0"
                                style={{ backgroundColor: strip }}
                              />
                            )}
                            <td className={strip ? "pl-[calc(24px+4px)] text-primary" : "text-primary"}>
                              <Link to={`/reports/${audit.id}`} className="hover:text-primary-container">
                                AUD-{String(audit.id).padStart(4, "0")}
                              </Link>
                            </td>
                            <td className="text-on-surface-variant">{formatDateTime(audit.created_at)}</td>
                            <td className="text-primary">{platform?.name || `Plateforme #${audit.platform_id}`}</td>
                            <td>
                              {audit.score != null ? (
                                <span
                                  className="font-bold"
                                  style={{ color: scoreTone(audit.score).color }}
                                >
                                  {Math.round(audit.score)}/100
                                </span>
                              ) : (
                                <span className="text-on-surface-variant">En attente</span>
                              )}
                            </td>
                            <td className="text-right">
                              <StatusBadge value={audit.status} />
                            </td>
                          </tr>
                        );
                      })}
                      {!recentAudits.length && (
                        <tr>
                          <td colSpan={5} className="py-md text-center text-on-surface-variant">
                            Aucun audit lancé pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-gutter">
            {recentPlatforms.map((platform) => {
              const verified = platform.verification_status === "verified";
              return (
                <div key={platform.id} className="panel flex flex-col">
                  <div className="panel-veil" />
                  <div className="relative z-10 flex h-full flex-col p-md">
                    <div className="mb-sm flex items-start justify-between border-b border-outline-variant/30 pb-xs">
                      <div className="flex items-center gap-sm">
                        <span
                          className={`rounded border p-xs ${
                            verified
                              ? "border-primary-container/30 bg-primary-container/10 text-primary-container"
                              : "border-warning/30 bg-warning/10 text-warning"
                          }`}
                        >
                          <Icon name={verified ? "verified_user" : "gpp_maybe"} size={20} />
                        </span>
                        <div className="min-w-0">
                          <h3
                            className="truncate font-headline-sm text-primary"
                            style={{ fontSize: "18px", lineHeight: "24px" }}
                          >
                            {platform.name}
                          </h3>
                          <span className="font-data-mono text-[12px] text-on-surface-variant">
                            {platform.domain}
                          </span>
                        </div>
                      </div>
                      <StatusBadge value={platform.verification_status} />
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-sm">
                      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                        {audits.filter((a) => a.platform_id === platform.id).length} audit(s)
                      </span>
                      <Link
                        to="/platforms"
                        className="flex items-center gap-xs font-label-caps text-label-caps uppercase text-primary-container transition-colors hover:text-primary"
                      >
                        Gérer <Icon name="arrow_forward" size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {!recentPlatforms.length && (
              <div className="col-span-2">
                <div className="panel">
                  <div className="panel-veil" />
                  <div className="relative z-10 flex flex-col items-center gap-sm p-lg text-center">
                    <Icon name="inventory_2" size={32} className="text-outline" />
                    <p className="text-on-surface-variant">
                      Aucune plateforme enregistrée pour l'instant.
                    </p>
                    <Link to="/platforms/new" className="btn-primary">
                      <Icon name="add" size={18} />
                      Ajouter une plateforme
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-12">
            <div className="panel">
              <div className="panel-veil" />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-md p-md">
                <div className="flex items-start gap-md">
                  <span className="rounded border border-primary-container/30 bg-primary-container/10 p-sm text-primary-container">
                    <Icon name="neurology" size={24} />
                  </span>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-primary">Assistant IA ƉEƉE</h2>
                    <p className="mt-xs max-w-2xl text-on-surface-variant">
                      Interrogez vos résultats d'audit en langage naturel : risques prioritaires,
                      recommandations et plan de correction.
                    </p>
                  </div>
                </div>
                {chatAuditId ? (
                  <Link to={`/reports/${chatAuditId}/chat`} className="btn-primary">
                    <Icon name="forum" size={18} />
                    Ouvrir l'assistant
                  </Link>
                ) : (
                  <span className="chip border-outline-variant/30 bg-surface-variant/30 text-on-surface-variant">
                    Lancez un audit pour activer l'assistant
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
