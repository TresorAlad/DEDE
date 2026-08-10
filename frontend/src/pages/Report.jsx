import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import AuditProgress from "../components/AuditProgress";
import CategoryBreakdown from "../components/CategoryBreakdown";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import RiskList from "../components/RiskList";
import ScoreGauge from "../components/ScoreGauge";
import StatusBadge from "../components/StatusBadge";
import { CardSkeleton } from "../components/Skeleton";
import { api, downloadFile } from "../api/client";

function stepText(step) {
  const raw = typeof step === "string" ? step : step?.etape || step?.title || JSON.stringify(step);
  // L'IA renvoie parfois "1. Faire X" alors que la liste HTML numérote déjà.
  return String(raw).replace(/^\s*\d+[\.\)\-:]\s*/, "");
}

function stepCommand(step) {
  if (typeof step === "string") return "";
  return step?.commande || step?.command || "";
}

function stepDetails(step) {
  if (typeof step === "string") return "";
  return step?.details || step?.detail || "";
}

function stepWhere(step) {
  if (typeof step === "string") return "";
  return step?.ou_le_faire || step?.where || "";
}

function normalizeRecommendation(rec) {
  if (typeof rec === "string") {
    return { title: rec, priority: "", why: "", steps: [], command: "" };
  }
  const steps = Array.isArray(rec.etapes)
    ? rec.etapes
    : Array.isArray(rec.steps)
    ? rec.steps
    : [];
  const detail = rec.detail || rec.description || "";
  return {
    title: rec.titre || rec.title || detail || "Recommandation",
    priority: (rec.priorite || rec.priority || "").toLowerCase(),
    why: rec.pourquoi || rec.why || (steps.length ? detail : ""),
    steps: steps.length ? steps : detail && (rec.titre || rec.title) ? [detail] : [],
    command: rec.commande || rec.command || "",
  };
}

const PRIORITY_STYLES = {
  haute: "border-critical/30 bg-critical/10 text-critical",
  moyenne: "border-warning/30 bg-warning/10 text-warning",
  basse: "border-primary-container/30 bg-primary-container/10 text-primary-container",
};

function Section({ title, subtitle, icon, children }) {
  return (
    <div className="col-span-12">
      <div className="panel">
        <div className="panel-veil" />
        <div className="relative z-10 p-md">
          <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
            <div>
              <h2 className="panel-title">{title}</h2>
              {subtitle && (
                <p className="mt-xs font-data-mono text-[12px] text-on-surface-variant">{subtitle}</p>
              )}
            </div>
            {icon && <Icon name={icon} className="text-on-surface-variant" />}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Report() {
  const { auditId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function handleReanalyze() {
    setReanalyzing(true);
    setError("");
    try {
      const data = await api(`/reports/${auditId}/reanalyze`, { method: "POST" });
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    setError("");
    try {
      await downloadFile(`/reports/${auditId}/pdf`, `dede-rapport-audit-${auditId}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await api(`/reports/${auditId}`);
        if (!active) return;
        setReport(data);
        setError("");
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [auditId]);

  useEffect(() => {
    if (!report || (report.status !== "queued" && report.status !== "running")) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/reports/${auditId}`);
        setReport(data);
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [auditId, report?.status]);

  const completed = report?.status === "completed";

  return (
    <AppShell>
      <div className="col-span-12">
        <Link
          to="/reports"
          className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" size={16} />
          Retour aux rapports
        </Link>
      </div>

      <PageHeader
        title={`Audit AUD-${String(auditId).padStart(4, "0")}`}
        subtitle={
          report
            ? `Analyse de sécurité${report.risk_level ? ` - risque ${report.risk_level}` : ""}`
            : "Chargement du rapport..."
        }
        actions={
          <div className="flex flex-wrap items-center gap-sm">
            {report && <StatusBadge value={report.status} />}
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={reanalyzing || !completed}
              className="btn-ghost"
              title="Régénère les recommandations sans relancer le scan"
            >
              <Icon name="refresh" size={16} className={reanalyzing ? "animate-spin" : ""} />
              {reanalyzing ? "Analyse..." : "Régénérer"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || !completed}
              className="btn-ghost"
            >
              <Icon name="download" size={16} />
              {downloading ? "Génération..." : "PDF"}
            </button>
            <Link to={`/reports/${auditId}/chat`} className="btn-primary">
              <Icon name="forum" size={16} />
              Assistant IA
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

      {loading && (
        <>
          <div className="col-span-12 lg:col-span-6">
            <CardSkeleton lines={5} />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <CardSkeleton lines={5} />
          </div>
        </>
      )}

      {report && !loading && (
        <>
          <div className="col-span-12">
            <AuditProgress
              status={report.status}
              createdAt={report.created_at}
              startedAt={report.started_at}
              finishedAt={report.finished_at}
              progress={report.progress}
            />
          </div>

          {report.note && (
            <div className="col-span-12">
              <div className="flex items-start gap-sm rounded border-l-4 border-warning bg-warning/10 p-md">
                <Icon name="info" size={18} className="mt-0.5 text-warning" />
                <p className="leading-relaxed text-warning">{report.note}</p>
              </div>
            </div>
          )}

          {completed && (
            <>
              <div className="col-span-12 lg:col-span-4">
                <ScoreGauge
                  score={report.score || 0}
                  risk={report.risk_level || "Inconnu"}
                  title="Score de l'audit"
                />
              </div>
              <div className="col-span-12 lg:col-span-8">
                <CategoryBreakdown categories={report.categories || {}} />
              </div>

              {(report.surface_hosts || []).length > 0 && (
                <Section
                  title="Surface découverte"
                  subtitle="Hôtes identifiés et pris en compte dans l'audit"
                  icon="hub"
                >
                  <ul className="flex flex-wrap gap-base">
                    {(report.surface_hosts || []).map((host) => (
                      <li
                        key={host}
                        className="rounded border border-outline-variant/30 bg-surface-container-lowest px-sm py-base font-data-mono text-[12px] text-on-surface"
                      >
                        {host}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="Synthèse" icon="description">
                <p className="whitespace-pre-wrap leading-relaxed text-on-surface-variant">
                  {report.summary || "Synthèse non encore générée."}
                </p>
              </Section>

              <div className="col-span-12">
                <h2 className="mb-sm panel-title">Risques détectés</h2>
                <RiskList items={report.findings || []} />
              </div>

              <Section
                title="Recommandations"
                subtitle="Chaque recommandation est détaillée étape par étape"
                icon="lightbulb"
              >
                <ul className="space-y-sm">
                  {(report.recommendations || []).map((raw, i) => {
                    const rec = normalizeRecommendation(raw);
                    const question = `Peux-tu m'expliquer en détail, étape par étape, comment appliquer la recommandation : "${rec.title}" ?`;
                    return (
                      <li
                        key={i}
                        className="rounded border border-outline-variant/30 bg-surface-container p-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-sm">
                          <div className="flex items-start gap-sm">
                            <Icon name="check_circle" size={18} className="mt-0.5 text-primary-container" />
                            <p className="font-medium text-primary">{rec.title}</p>
                          </div>
                          {rec.priority && (
                            <span
                              className={`chip ${
                                PRIORITY_STYLES[rec.priority] ||
                                "border-outline-variant/30 bg-surface-variant/30 text-on-surface-variant"
                              }`}
                            >
                              {rec.priority}
                            </span>
                          )}
                        </div>

                        {rec.why && <p className="mt-sm pl-lg text-on-surface-variant">{rec.why}</p>}

                        {rec.steps.length > 0 && (
                          <ol className="mt-sm list-decimal space-y-base pl-xl text-on-surface-variant">
                            {rec.steps.map((step, s) => (
                              <li key={s}>{typeof step === "string" ? step : stepText(step)}</li>
                            ))}
                          </ol>
                        )}

                        {rec.command && (
                          <code className="ml-lg mt-sm block overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-lowest px-sm py-base font-data-mono text-[12px] text-primary-container">
                            {rec.command}
                          </code>
                        )}

                        <div className="mt-sm pl-lg">
                          <Link
                            to={`/reports/${auditId}/chat?q=${encodeURIComponent(question)}`}
                            className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-primary-container transition-colors hover:text-primary"
                          >
                            <Icon name="forum" size={14} />
                            Demander à l'IA
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                  {!(report.recommendations || []).length && (
                    <li className="text-on-surface-variant">Aucune recommandation pour le moment.</li>
                  )}
                </ul>
              </Section>

              <Section
                title="Plan de correction"
                subtitle="Chaque étape précise où agir et quelle commande utiliser"
                icon="construction"
              >
                <ol className="space-y-sm">
                  {(report.plan_correction || []).map((step, i) => {
                    const command = stepCommand(step);
                    const details = stepDetails(step);
                    const where = stepWhere(step);
                    const question = `Peux-tu détailler davantage cette étape du plan de correction : "${stepText(
                      step
                    )}" ? Explique où le faire et quelles commandes utiliser.`;
                    return (
                      <li
                        key={i}
                        className="rounded border border-outline-variant/30 bg-surface-container p-md"
                      >
                        <div className="flex items-start gap-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-primary-container/30 bg-primary-container/10 font-data-mono text-[12px] text-primary-container">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-primary">{stepText(step)}</p>
                            {where && (
                              <p className="mt-xs font-label-caps text-label-caps uppercase text-primary-container">
                                Où : {where}
                              </p>
                            )}
                            {details && <p className="mt-sm text-on-surface-variant">{details}</p>}
                            {command && (
                              <code className="mt-sm block overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-lowest px-sm py-base font-data-mono text-[12px] text-primary-container">
                                {command}
                              </code>
                            )}
                            <div className="mt-sm">
                              <Link
                                to={`/reports/${auditId}/chat?q=${encodeURIComponent(question)}`}
                                className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-primary-container transition-colors hover:text-primary"
                              >
                                <Icon name="forum" size={14} />
                                Demander à l'IA
                              </Link>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {!(report.plan_correction || []).length && (
                    <li className="text-on-surface-variant">Aucun plan de correction pour le moment.</li>
                  )}
                </ol>
              </Section>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
