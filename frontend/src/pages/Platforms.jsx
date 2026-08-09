import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Pencil, Play, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { CardSkeleton } from "../components/Skeleton";
import { api } from "../api/client";

function normalizeDomain(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
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
      const audit = await api(`/audits/platform/${platformId}`, { method: "POST" });
      setMessage(`Audit #${audit.id} mis en file d'attente.`);
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

  return (
    <AppShell>
      <PageHeader
        title="Plateformes"
        subtitle="Vérifiez la propriété puis lancez un audit de sécurité."
        actions={
          <Link to="/platforms/new" className="btn-primary">
            <Plus size={16} />
            Ajouter une plateforme
          </Link>
        }
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {message && <p className="mb-4 text-sm text-emerald-600">{message}</p>}

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <ul className="space-y-4">
          {platforms.map((platform) => {
            const related = auditsFor(platform.id);
            const latest = related[0];
            const verified = platform.verification_status === "verified";
            const isEditing = editingId === platform.id;
            const busy = busyId === platform.id;
            return (
              <li key={platform.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-primary">{platform.name}</h2>
                      <StatusBadge value={platform.verification_status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{platform.domain}</p>
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      {platform.url}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isEditing && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(platform)}
                          className="btn-ghost"
                          title="Modifier"
                        >
                          <Pencil size={16} />
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPlatformToDelete(platform)}
                          className="btn-ghost text-danger hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                          Supprimer
                        </button>
                        {!verified && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => verifyPlatform(platform.id)}
                            className="btn-accent"
                          >
                            <ShieldCheck size={16} />
                            Vérifier la propriété
                          </button>
                        )}
                        {verified && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startAudit(platform.id)}
                            className="btn-primary"
                          >
                            <Play size={16} />
                            Lancer un audit
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <form
                    className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-surface px-4 py-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveEdit(platform.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-primary">Modifier la plateforme</p>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-ghost shrink-0 px-3 py-1.5"
                        title="Annuler"
                      >
                        <X size={16} />
                        Annuler
                      </button>
                    </div>
                    <label className="block text-sm text-slate-600">
                      Nom
                      <input
                        className="input-field"
                        type="text"
                        value={editForm.name}
                        onChange={(e) => updateEditField("name", e.target.value)}
                        required
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      Domaine
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
                      <span className="mt-1 block text-xs text-slate-400">
                        Un changement de domaine ou d'URL réinitialise la vérification de propriété.
                      </span>
                    </label>
                    <label className="block text-sm text-slate-600">
                      URL principale
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
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="submit" disabled={busy} className="btn-primary">
                        {busy ? "Enregistrement..." : "Enregistrer"}
                      </button>
                      <button type="button" onClick={cancelEdit} className="btn-ghost">
                        Annuler
                      </button>
                    </div>
                  </form>
                )}

                {!verified && platform.verification_token && !isEditing && (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-surface px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-primary">Preuve de propriété requise</p>
                    <p className="mt-1">
                      Déposez un fichier accessible publiquement à l'adresse suivante, contenant
                      exactement le jeton ci-dessous, puis cliquez sur « Vérifier la propriété ».
                    </p>
                    <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                      https://{platform.domain}/.well-known/dede-verification.txt
                    </code>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                        {platform.verification_token}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToken(platform.verification_token)}
                        className="btn-ghost shrink-0"
                        title="Copier le jeton"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-slate-600">
                    {latest ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                          Dernier audit #{latest.id} - {latest.status}
                          {latest.score != null ? ` - score ${Math.round(latest.score)}` : ""}
                        </span>
                        <Link to={`/reports/${latest.id}`} className="text-accent hover:underline">
                          Voir le rapport
                        </Link>
                      </div>
                    ) : (
                      <span>Aucun audit pour cette plateforme.</span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {!platforms.length && (
            <li className="card text-center text-sm text-slate-500">
              Aucune plateforme pour le moment.{" "}
              <Link to="/platforms/new" className="text-accent hover:underline">
                Ajoutez-en une
              </Link>
              .
            </li>
          )}
        </ul>
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
