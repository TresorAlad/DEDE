import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import PageHeader from "../components/PageHeader";
import { api } from "../api/client";

function normalizeDomain(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export default function AddPlatform() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", domain: "", url: "" });
  const [urlTouched, setUrlTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "domain" && !urlTouched) {
        const domain = normalizeDomain(value);
        next.url = domain ? `https://${domain}` : "";
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const domain = normalizeDomain(form.domain);
      const url = form.url.trim() || (domain ? `https://${domain}` : "");
      await api("/platforms", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          domain,
          url,
        }),
      });
      navigate("/platforms");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <Link to="/platforms" className="mb-3 inline-block text-sm text-accent hover:underline">
        &larr; Retour aux plateformes
      </Link>
      <PageHeader
        title="Ajouter une plateforme"
        subtitle="Le domaine est le point d'entrée de l'audit : Amass cartographie la surface, puis Nuclei, sslyze et les en-têtes HTTP analysent les cibles découvertes."
      />
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      <form onSubmit={handleSubmit} className="card max-w-lg space-y-4">
        <label className="block text-sm text-slate-600">
          Nom
          <input
            className="input-field"
            type="text"
            placeholder="Ex. Site institutionnel"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
        </label>

        <label className="block text-sm text-slate-600">
          Domaine
          <input
            className="input-field"
            type="text"
            placeholder="exemple.com"
            value={form.domain}
            onChange={(e) => updateField("domain", e.target.value)}
            required
          />
          <span className="mt-1 block text-xs text-slate-400">
            Ex. exemple.com - l'audit couvre ce domaine et ses sous-domaines découverts.
          </span>
        </label>

        <label className="block text-sm text-slate-600">
          URL principale
          <input
            className="input-field"
            type="url"
            placeholder="https://exemple.com"
            value={form.url}
            onChange={(e) => {
              setUrlTouched(true);
              updateField("url", e.target.value);
            }}
            required
          />
          <span className="mt-1 block text-xs text-slate-400">
            Cible prioritaire du scan. Préremplie automatiquement à partir du domaine.
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </AppShell>
  );
}
