import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { CardSkeleton } from "../components/Skeleton";
import { api } from "../api/client";
import { scoreTone } from "../themeColors";

function normalizeDomain(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

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

function scoreColor(score) {
  return scoreTone(score).color;
}

export default function Platforms() {
  const [platforms, setPlatforms] = useState([]);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", domain: "", url: "" });
  const [urlTouched, setUrlTouched] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [engineChoice, setEngineChoice] = useState({});

  const ENGINES = [
    {
      value: "scanners",
      label: "Scanners classiques",
      caption: "Surface, vulnérabilités, SSL, en-têtes",
      icon: "radar",
    },
    {
      value: "agents",
      label: "Agents IA",
      caption: "Équipe d'agents IA",
      icon: "neurology",
    },
  ];

  function engineFor(platformId) {
    return engineChoice[platformId] || "scanners";
  }

  async function load() {
    const [p, a] = await Promise.all([api("/platforms"), api("/audits")]);
    setPlatforms(p);
    setAudits(a);
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

  async function verifyPlatform(platformId) {
    setBusyId(platformId);
    setError("");
    setMessage("");
    try {
      await api(`/platforms/${platformId}/verify`, { method: "POST" });
      setMessage("Propriété vérifiée. Vous pouvez maintenant lancer un audit.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function startAudit(platformId) {
    setBusyId(platformId);
    setError("");
    setMessage("");
    try {
      const audit = await api(`/audits/platform/${platformId}`, {
        method: "POST",
        body: JSON.stringify({ engine: engineFor(platformId) }),
      });
      setMessage(
        `Audit #${audit.id} mis en file d'attente (${
          audit.engine === "agents" ? "agents IA" : "scanners classiques"
        }).`
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(platform) {
    setEditingId(platform.id);
    setEditForm({
      name: platform.name,
      domain: platform.domain,
      url: platform.url,
    });
    setUrlTouched(true);
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", domain: "", url: "" });
    setUrlTouched(false);
  }

  function updateEditField(key, value) {
    setEditForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "domain" && !urlTouched) {
        const domain = normalizeDomain(value);
        next.url = domain ? `https://${domain}` : "";
      }
      return next;
    });
  }

  async function saveEdit(platformId) {
    setBusyId(platformId);
    setError("");
    setMessage("");
    try {
      const domain = normalizeDomain(editForm.domain);
      const url = editForm.url.trim() || (domain ? `https://${domain}` : "");
      await api(`/platforms/${platformId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          domain,
          url,
        }),
      });
      setMessage("Plateforme mise à jour.");
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const platform = platformToDelete;
    if (!platform) return;

    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await api(`/platforms/${platform.id}`, { method: "DELETE" });
      if (editingId === platform.id) cancelEdit();
      setMessage(`Plateforme « ${platform.name} » supprimée.`);
      setPlatformToDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function auditsFor(platformId) {
    return audits.filter((a) => a.platform_id === platformId);
  }

  function copyToken(token) {
    navigator.clipboard?.writeText(token).catch(() => {});
    setMessage("Jeton copié dans le presse-papiers.");
  }

  const verifiedCount = platforms.filter((p) => p.verification_status === "verified").length;

  return (
    <AppShell>
      <PageHeader
        title="Gestion des plateformes"
        subtitle={`${verifiedCount} plateforme(s) vérifiée(s) sur ${platforms.length} enregistrée(s).`}
        actions={
          <Link
            to="/platforms/new"
            className="btn-primary shadow-[0_0_8px_rgba(56,222,187,0.2)] hover:shadow-[0_0_12px_rgba(56,222,187,0.4)]"
          >
            <Icon name="add_link" size={16} />
            Nouvelle plateforme
          </Link>
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
      {message && (
        <div className="col-span-12">
          <p className="flex items-center gap-base rounded border border-success/30 bg-success/10 px-sm py-base font-data-mono text-data-mono text-success">
            <Icon name="check_circle" size={16} />
            {message}
          </p>
        </div>
      )}

      {loading ? (
        <>
          <div className="col-span-12 lg:col-span-4">
            <CardSkeleton />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <CardSkeleton />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <CardSkeleton />
          </div>
        </>
      ) : (
        <>
          {platforms.map((platform) => {
            const related = auditsFor(platform.id);
            const latest = related[0];
            const verified = platform.verification_status === "verified";
            const isEditing = editingId === platform.id;
            const busy = busyId === platform.id;

            return (
              <div
                key={platform.id}
                className={`group relative overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container transition-colors hover:border-primary/50 ${
                  isEditing ? "col-span-12" : "col-span-12 md:col-span-6 lg:col-span-4"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="flex items-center justify-between border-b border-outline-variant/50 bg-surface-container-high/50 p-md">
                  <div className="flex min-w-0 items-center gap-sm">
                    <Icon name={verified ? "dns" : "vpn_lock"} className="text-primary" />
                    <h3 className="truncate font-body-lg text-body-lg font-semibold text-primary">
                      {platform.name}
                    </h3>
                  </div>
                  <StatusBadge value={platform.verification_status} />
                </div>

                <div className="relative z-10 flex flex-col gap-md p-md">
                  <div className="flex items-center justify-between gap-sm">
                    <span className="font-data-mono text-data-mono text-on-surface-variant">Domaine</span>
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-data-mono text-data-mono text-primary transition-colors hover:text-primary-container"
                    >
                      {platform.domain}
                    </a>
                  </div>

                  <div className="flex items-center justify-between gap-sm">
                    <span className="font-data-mono text-data-mono text-on-surface-variant">
                      Dernier audit
                    </span>
                    <span className="font-data-mono text-data-mono text-primary">
                      {latest ? formatDateTime(latest.created_at) : "Jamais"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-sm">
                    <span className="font-data-mono text-data-mono text-on-surface-variant">Score</span>
                    {latest?.score != null ? (
                      <div className="flex items-center gap-base">
                        <span
                          className="font-display-lg leading-none"
                          style={{ fontSize: "20px", color: scoreColor(latest.score) }}
                        >
                          {Math.round(latest.score)}
                        </span>
                        <span className="font-data-mono text-[12px] text-on-surface-variant">/100</span>
                      </div>
                    ) : (
                      <span className="font-data-mono text-data-mono text-on-surface-variant">
                        {latest ? "En attente" : "-"}
                      </span>
                    )}
                  </div>

                  {!verified && platform.verification_token && !isEditing && (
                    <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-sm">
                      <p className="flex items-center gap-base font-label-caps text-label-caps uppercase text-warning">
                        <Icon name="gpp_maybe" size={16} />
                        Preuve de propriété requise
                      </p>
                      <p className="mt-base text-[14px] leading-5 text-on-surface-variant">
                        Déposez un fichier public contenant exactement ce jeton, puis lancez la
                        vérification.
                      </p>
                      <code className="mt-base block break-all rounded border border-outline-variant/30 bg-background px-sm py-base font-data-mono text-[12px] text-on-surface-variant">
                        https://{platform.domain}/.well-known/dede-verification.txt
                      </code>
                      <div className="mt-base flex items-center gap-base">
                        <code className="flex-1 break-all rounded border border-outline-variant/30 bg-background px-sm py-base font-data-mono text-[12px] text-primary-container">
                          {platform.verification_token}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToken(platform.verification_token)}
                          className="shrink-0 rounded border border-outline-variant p-base text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                          title="Copier le jeton"
                        >
                          <Icon name="content_copy" size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <form
                      className="space-y-sm rounded border border-outline-variant/50 bg-surface-container-lowest p-md"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveEdit(platform.id);
                      }}
                    >
                      <p className="font-label-caps text-label-caps uppercase text-primary-container">
                        Modifier la plateforme
                      </p>

                      <div>
                        <label className="field-label">Nom</label>
                        <input
                          className="input-field"
                          type="text"
                          value={editForm.name}
                          onChange={(e) => updateEditField("name", e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="field-label">Domaine</label>
                        <input
                          className="input-field"
                          type="text"
                          value={editForm.domain}
                          onChange={(e) => {
                            setUrlTouched(false);
                            updateEditField("domain", e.target.value);
                          }}
                          required
                        />
                        <span className="mt-base block font-data-mono text-[12px] text-on-surface-variant">
                          Un changement de domaine ou d'URL réinitialise la vérification de propriété.
                        </span>
                      </div>

                      <div>
                        <label className="field-label">URL principale</label>
                        <input
                          className="input-field"
                          type="url"
                          value={editForm.url}
                          onChange={(e) => {
                            setUrlTouched(true);
                            updateEditField("url", e.target.value);
                          }}
                          required
                        />
                      </div>

                      <div className="flex flex-wrap gap-sm pt-xs">
                        <button type="submit" disabled={busy} className="btn-primary">
                          <Icon name="save" size={16} />
                          {busy ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button type="button" onClick={cancelEdit} className="btn-ghost">
                          <Icon name="close" size={16} />
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {!isEditing && (
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant/50 bg-surface-container-high/30 px-md py-sm">
                    <div className="flex items-center gap-base">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(platform)}
                        className="rounded border border-outline-variant p-base text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                        title="Modifier"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPlatformToDelete(platform)}
                        className="rounded border border-critical/40 p-base text-critical transition-colors hover:bg-critical hover:text-surface-container-lowest disabled:opacity-40"
                        title="Supprimer"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                      {latest && (
                        <Link
                          to={`/reports/${latest.id}`}
                          className="rounded border border-outline-variant p-base text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                          title="Voir le dernier rapport"
                        >
                          <Icon name="assessment" size={16} />
                        </Link>
                      )}
                    </div>

                    {verified ? (
                      <div className="flex items-center gap-base">
                        <div className="relative">
                          <select
                            value={engineFor(platform.id)}
                            onChange={(e) =>
                              setEngineChoice((prev) => ({
                                ...prev,
                                [platform.id]: e.target.value,
                              }))
                            }
                            disabled={busy}
                            aria-label="Moteur d'audit"
                            className="h-8 appearance-none rounded border border-outline-variant bg-surface-container-lowest pl-base pr-lg font-data-mono text-[11px] text-on-surface-variant transition-colors hover:border-primary/50 focus:border-primary focus:outline-none disabled:opacity-40"
                            title={ENGINES.find((e) => e.value === engineFor(platform.id))?.caption}
                          >
                            {ENGINES.map((engine) => (
                              <option key={engine.value} value={engine.value}>
                                {engine.label}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute inset-y-0 right-base flex items-center">
                            <Icon name="chevron_right" size={14} className="rotate-90 text-on-surface-variant" />
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startAudit(platform.id)}
                          className="btn-primary px-sm py-base"
                        >
                          <Icon name="play_arrow" size={16} />
                          {busy ? "Lancement..." : "Lancer un audit"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => verifyPlatform(platform.id)}
                        className="btn-ghost px-sm py-base"
                      >
                        <Icon name="verified_user" size={16} />
                        {busy ? "Vérification..." : "Vérifier la propriété"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!platforms.length && (
            <div className="col-span-12">
              <div className="panel">
                <div className="panel-veil" />
                <div className="relative z-10 flex flex-col items-center gap-sm p-lg text-center">
                  <Icon name="inventory_2" size={32} className="text-outline" />
                  <p className="text-on-surface-variant">
                    Aucune plateforme enregistrée pour le moment.
                  </p>
                  <Link to="/platforms/new" className="btn-primary">
                    <Icon name="add_link" size={18} />
                    Ajouter une plateforme
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(platformToDelete)}
        tone="danger"
        title="Supprimer cette plateforme ?"
        description={
          platformToDelete
            ? `« ${platformToDelete.name} » (${platformToDelete.domain}) sera retirée de votre espace.`
            : ""
        }
        details="Tous les audits, scores et rapports associés seront définitivement effacés. Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        loadingLabel="Suppression..."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPlatformToDelete(null)}
      />
    </AppShell>
  );
}
