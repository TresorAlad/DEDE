import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Download, Info, MessageSquare, RefreshCw } from "lucide-react";
import AppShell from "../components/AppShell";
import PageHeader from "../components/PageHeader";
import AuditProgress from "../components/AuditProgress";
import ScoreGauge from "../components/ScoreGauge";
import CategoryBreakdown from "../components/CategoryBreakdown";
import RiskList from "../components/RiskList";
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
  haute: "bg-rose-100 text-rose-700",
  moyenne: "bg-amber-100 text-amber-700",
  basse: "bg-sky-100 text-sky-700",
};

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

  return (
    <AppShell>
      <Link to="/reports" className="mb-3 inline-block text-sm text-accent hover:underline">
        &larr; Retour aux rapports
      </Link>
      <PageHeader
        title={`Rapport d'audit #${auditId}`}
        subtitle={
          report
            ? `Statut : ${report.status}${report.risk_level ? ` - risque ${report.risk_level}` : ""}`
            : "Chargement du rapport..."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={reanalyzing || !report || report.status !== "completed"}
              className="btn-ghost"
              title="Régénère les recommandations et le plan détaillés sans relancer le scan"
            >
              <RefreshCw size={16} className={reanalyzing ? "animate-spin" : ""} />
              {reanalyzing ? "Analyse..." : "Régénérer l'analyse"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || !report || report.status !== "completed"}
              className="btn-ghost"
            >
              <Download size={16} />
              {downloading ? "Génération..." : "Télécharger le PDF"}
            </button>
            <Link to={`/reports/${auditId}/chat`} className="btn-accent">
              <MessageSquare size={16} />
              Ouvrir le chatbot
            </Link>
          </div>
        }
      />

      {report && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <StatusBadge value={report.status} />
          {report.risk_level && <StatusBadge value={report.risk_level} />}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading && (
        <div className="grid gap-4 xl:grid-cols-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          <AuditProgress
            status={report.status}
            createdAt={report.created_at}
            startedAt={report.started_at}
            finishedAt={report.finished_at}
            progress={report.progress}
          />

          {report.note && (
            <div className="flex items-start gap-3 rounded-card border-l-4 border-amber-400 bg-amber-50 p-4">
              <Info size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-sm leading-relaxed text-amber-800">{report.note}</p>
            </div>
          )}

          {report.status === "completed" && (
            <section className="grid gap-4 xl:grid-cols-2">
              <ScoreGauge score={report.score || 0} risk={report.risk_level || "Inconnu"} />
              <CategoryBreakdown categories={report.categories || {}} />
            </section>
          )}

          {report.status === "completed" && (report.surface_hosts || []).length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold text-primary">Surface découverte</h2>
              <p className="mt-1 text-sm text-slate-500">
                Hôtes du domaine identifiés et pris en compte dans l'audit.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {(report.surface_hosts || []).map((host) => (
                  <li
                    key={host}
                    className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-slate-100"
                  >
                    {host}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.status === "completed" && (
          <section className="card">
            <h2 className="text-lg font-semibold text-primary">Résumé</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {report.summary || "Résumé non encore généré."}
            </p>
          </section>
          )}

          {report.status === "completed" && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-primary">Risques détectés</h2>
            <RiskList items={report.findings || []} />
          </section>
          )}

          {report.status === "completed" && (
          <section className="card">
            <h2 className="text-lg font-semibold text-primary">Recommandations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chaque recommandation est détaillée étape par étape. Si un point n'est pas clair,
              cliquez sur « Demander à l'IA ».
            </p>
            <ul className="mt-4 space-y-4">
              {(report.recommendations || []).map((raw, i) => {
                const rec = normalizeRecommendation(raw);
                const question = `Peux-tu m'expliquer en détail, étape par étape, comment appliquer la recommandation : "${rec.title}" ?`;
                return (
                  <li key={i} className="rounded-2xl border border-slate-100 bg-surface px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" />
                        <p className="font-medium text-primary">{rec.title}</p>
                      </div>
                      {rec.priority && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
                            PRIORITY_STYLES[rec.priority] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rec.priority}
                        </span>
                      )}
                    </div>

                    {rec.why && (
                      <p className="mt-2 pl-8 text-sm text-slate-600">{rec.why}</p>
                    )}

                    {rec.steps.length > 0 && (
                      <ol className="mt-3 list-decimal space-y-1.5 pl-12 text-sm text-slate-600">
                        {rec.steps.map((step, s) => (
                          <li key={s}>{typeof step === "string" ? step : stepText(step)}</li>
                        ))}
                      </ol>
                    )}

                    {rec.command && (
                      <code className="mt-3 ml-8 block overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-emerald-300">
                        {rec.command}
                      </code>
                    )}

                    <div className="mt-3 pl-8">
                      <Link
                        to={`/reports/${auditId}/chat?q=${encodeURIComponent(question)}`}
                        className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                      >
                        <MessageSquare size={14} />
                        Demander à l'IA
                      </Link>
                    </div>
                  </li>
                );
              })}
              {!(report.recommendations || []).length && (
                <li className="text-sm text-slate-500">Aucune recommandation pour le moment.</li>
              )}
            </ul>
          </section>
          )}

          {report.status === "completed" && (
          <section className="card">
            <h2 className="text-lg font-semibold text-primary">Plan de correction</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chaque étape précise où agir et quelle commande utiliser.
            </p>
            <ol className="mt-4 space-y-4">
              {(report.plan_correction || []).map((step, i) => {
                const command = stepCommand(step);
                const details = stepDetails(step);
                const where = stepWhere(step);
                const question = `Peux-tu détailler davantage cette étape du plan de correction : "${stepText(step)}" ? Explique où le faire et quelles commandes utiliser.`;
                return (
                  <li key={i} className="rounded-2xl border border-slate-100 bg-surface px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-primary">{stepText(step)}</p>
                        {where && (
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-accent">
                            Où : {where}
                          </p>
                        )}
                        {details && <p className="mt-2 text-sm text-slate-600">{details}</p>}
                        {command && (
                          <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-emerald-300">
                            {command}
                          </code>
                        )}
                        <div className="mt-3">
                          <Link
                            to={`/reports/${auditId}/chat?q=${encodeURIComponent(question)}`}
                            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                          >
                            <MessageSquare size={14} />
                            Demander à l'IA
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
              {!(report.plan_correction || []).length && (
                <li className="text-sm text-slate-500">Aucun plan de correction pour le moment.</li>
              )}
            </ol>
          </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
