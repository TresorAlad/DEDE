import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import { api } from "../api/client";

const MODULES = [
  { icon: "dns", name: "Surface exposée", caption: "Cartographie des sous-domaines" },
  { icon: "radar", name: "Vulnérabilités", caption: "Failles connues et configurations à risque" },
  { icon: "lock", name: "Chiffrement", caption: "Analyse de la configuration TLS" },
  { icon: "http", name: "En-têtes HTTP", caption: "Contrôle des en-têtes de sécurité" },
];

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
      <div className="col-span-12">
        <Link
          to="/platforms"
          className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" size={16} />
          Retour aux plateformes
        </Link>
      </div>

      <PageHeader
        title="Ajouter une plateforme"
        subtitle="Le domaine est le point d'entrée de l'audit : la surface est cartographiée avant l'analyse des cibles découvertes."
      />

      {error && (
        <div className="col-span-12">
          <p className="flex items-center gap-base rounded border border-critical/30 bg-critical/10 px-sm py-base font-data-mono text-data-mono text-critical">
            <Icon name="error" size={16} />
            {error}
          </p>
        </div>
      )}

      <div className="col-span-12 lg:col-span-7">
        <div className="panel">
          <div className="panel-veil" />
          <form onSubmit={handleSubmit} className="relative z-10 space-y-md p-md">
            <div>
              <label className="field-label" htmlFor="platform-name">
                Nom de la plateforme
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                  <Icon name="label" size={18} className="text-outline" />
                </span>
                <input
                  id="platform-name"
                  className="input-field pl-xl"
                  type="text"
                  placeholder="Site institutionnel"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="platform-domain">
                Domaine
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                  <Icon name="dns" size={18} className="text-outline" />
                </span>
                <input
                  id="platform-domain"
                  className="input-field pl-xl"
                  type="text"
                  placeholder="exemple.com"
                  value={form.domain}
                  onChange={(e) => updateField("domain", e.target.value)}
                  required
                />
              </div>
              <span className="mt-base block font-data-mono text-[12px] text-on-surface-variant">
                L'audit couvre ce domaine et les sous-domaines découverts.
              </span>
            </div>

            <div>
              <label className="field-label" htmlFor="platform-url">
                URL principale
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                  <Icon name="link" size={18} className="text-outline" />
                </span>
                <input
                  id="platform-url"
                  className="input-field pl-xl"
                  type="url"
                  placeholder="https://exemple.com"
                  value={form.url}
                  onChange={(e) => {
                    setUrlTouched(true);
                    updateField("url", e.target.value);
                  }}
                  required
                />
              </div>
              <span className="mt-base block font-data-mono text-[12px] text-on-surface-variant">
                Cible prioritaire du scan, préremplie à partir du domaine.
              </span>
            </div>

            <div className="flex flex-wrap gap-sm pt-xs">
              <button type="submit" disabled={loading} className="btn-primary">
                <Icon name="add_link" size={16} />
                {loading ? "Enregistrement..." : "Enregistrer la plateforme"}
              </button>
              <Link to="/platforms" className="btn-ghost">
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <div className="panel h-full">
          <div className="panel-veil" />
          <div className="relative z-10 flex h-full flex-col p-md">
            <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
              <h2 className="panel-title">Modules d'audit exécutés</h2>
              <Icon name="conversion_path" className="text-on-surface-variant" />
            </div>

            <div className="space-y-sm">
              {MODULES.map((module) => (
                <div
                  key={module.name}
                  className="relative flex items-center gap-md overflow-hidden rounded border border-outline-variant/30 bg-surface-container p-sm"
                >
                  <span className="absolute bottom-0 left-0 top-0 w-1 bg-outline-variant" />
                  <Icon name={module.icon} className="ml-2 text-on-surface-variant" />
                  <div>
                    <div className="font-body-md font-medium text-primary">{module.name}</div>
                    <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                      {module.caption}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-auto flex items-start gap-base pt-md font-data-mono text-[12px] leading-5 text-on-surface-variant">
              <Icon name="info" size={16} className="text-primary-container" />
              Une preuve de propriété sera demandée avant le premier audit.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
