import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import StatusBadge from "../components/StatusBadge";
import { Skeleton } from "../components/Skeleton";
import { api } from "../api/client";
import { scoreTone, themeColor } from "../themeColors";

function formatDate(value) {
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
    return value;
  }
}

function scoreColor(score) {
  return scoreTone(score).color;
}

function auditReference(id) {
  return `AUD-${String(id).padStart(4, "0")}`;
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
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

  const completed = audits.filter((a) => a.status === "completed").length;

  const needle = query.toLowerCase();
  const visibleAudits = needle
    ? audits.filter((audit) =>
        [
          auditReference(audit.id),
          platformName(audit.platform_id),
          audit.status,
          audit.risk_level,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle))
      )
    : audits;

  return (
    <AppShell>
      <PageHeader
        title="Rapports d'audit"
        subtitle={`${completed} rapport(s) finalisé(s) sur ${audits.length} audit(s) lancé(s).`}
        actions={
          query ? (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="chip border-primary-container/30 bg-primary-container/10 text-primary-container transition-colors hover:text-primary"
            >
              <Icon name="search" size={16} />
              {query}
              <Icon name="close" size={16} />
            </button>
          ) : null
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

      <div className="col-span-12">
        <div className="panel">
          <div className="panel-veil" />
          <div className="relative z-10">
            <div className="flex items-center justify-between border-b border-outline-variant/30 p-md">
              <h2 className="panel-title">Historique des audits</h2>
              <Icon name="assessment" className="text-on-surface-variant" />
            </div>

            <div className="w-full overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Audit</th>
                    <th>Plateforme</th>
                    <th>Statut</th>
                    <th>Score</th>
                    <th>Risque</th>
                    <th>Date</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <Reveal as="tbody">
                  {loading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7}>
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))}

                  {!loading &&
                    visibleAudits.map((audit) => {
                      const critical = audit.status === "failed";
                      const warning = audit.score != null && audit.score < 50;
                      const strip = critical
                        ? themeColor("critical")
                        : warning
                          ? themeColor("warning")
                          : null;
                      return (
                        <tr key={audit.id} className="relative" data-reveal>
                          {strip && (
                            <td
                              className="absolute bottom-0 left-0 top-0 w-1 p-0"
                              style={{ backgroundColor: strip }}
                            />
                          )}
                          <td className={strip ? "pl-[calc(24px+4px)] text-primary" : "text-primary"}>
                            {auditReference(audit.id)}
                          </td>
                          <td className="text-on-surface">{platformName(audit.platform_id)}</td>
                          <td>
                            <StatusBadge value={audit.status} />
                          </td>
                          <td>
                            {audit.score != null ? (
                              <span className="font-bold" style={{ color: scoreColor(audit.score) }}>
                                {Math.round(audit.score)}
                              </span>
                            ) : (
                              <span className="text-on-surface-variant">-</span>
                            )}
                          </td>
                          <td>
                            {audit.risk_level ? (
                              <StatusBadge value={audit.risk_level} />
                            ) : (
                              <span className="text-on-surface-variant">-</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-on-surface-variant">
                            {formatDate(audit.created_at)}
                          </td>
                          <td className="text-right">
                            <Link
                              to={`/reports/${audit.id}`}
                              className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-primary-container transition-colors hover:text-primary"
                            >
                              Ouvrir <Icon name="arrow_forward" size={16} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}

                  {!loading && !visibleAudits.length && (
                    <tr>
                      <td colSpan={7} className="py-lg text-center text-on-surface-variant">
                        {query
                          ? `Aucun audit ne correspond à « ${query} ».`
                          : "Aucun audit pour le moment. Vérifiez une plateforme puis lancez un scan."}
                      </td>
                    </tr>
                  )}
                </Reveal>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
