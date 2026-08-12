import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AgentActivity from "../components/AgentActivity";
import AgentGraph from "../components/AgentGraph";
import AppShell from "../components/AppShell";
import AuditProgress from "../components/AuditProgress";
import CategoryBreakdown from "../components/CategoryBreakdown";
import Icon from "../components/Icon";
import ScoreGauge from "../components/ScoreGauge";
import StatusBadge from "../components/StatusBadge";
import { api } from "../api/client";
import { useAuthUser } from "../hooks/useAuthUser";

const STEPS = [
  { key: "target", label: "Cible", icon: "add_link", caption: "Domaine à auditer" },
  { key: "verify", label: "Propriété", icon: "key", caption: "Preuve de propriété" },
  { key: "engine", label: "Moteur", icon: "neurology", caption: "Équipe d'exécution" },
  { key: "live", label: "Suivi", icon: "hub", caption: "Graphe en direct" },
];

const ENGINES = [
  {
    value: "agents",
    label: "Agents IA",
    caption: "Équipe d'agents IA orchestrée : graphe d'exécution, suivi en direct, analyse assistée.",
    icon: "neurology",
    features: ["Orchestration visible en direct", "Analyse et priorisation IA", "Journal de chaque agent"],
  },
  {
    value: "scanners",
    label: "Scanners classiques",
    caption: "Pipeline d'audit déterministe : surface d'attaque, vulnérabilités, SSL/TLS et en-têtes HTTP.",
    icon: "radar",
    features: ["Exécution déterministe", "Rapide sur cibles stables", "Rapport détaillé"],
  },
];

function normalizeDomain(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function StepIndicator({ current }) {
  return (
    <ol className="flex w-full items-center gap-0 overflow-x-auto">
      {STEPS.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-col items-center gap-xs text-center">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  state === "done"
                    ? "border-success bg-success/10 text-success"
                    : state === "active"
                      ? "outer-glow-accent border-primary-container bg-primary-container/15 text-primary-container"
                      : "border-outline-variant/40 bg-surface-container text-on-surface-variant"
                }`}
              >
                {state === "done" ? (
                  <Icon name="check" size={16} />
                ) : (
                  <Icon name={step.icon} size={16} />
                )}
              </span>
              <span
                className={`hidden font-label-caps text-[10px] uppercase tracking-wider md:block ${
                  state === "active" ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-sm h-px flex-1 ${
                  index < current ? "bg-success/60" : "bg-outline-variant/40"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Feedback({ error, message }) {
  if (!error && !message) return null;
  return (
    <p
      className={`flex items-start gap-base rounded border px-sm py-base font-data-mono text-[12px] leading-5 ${
        error
          ? "border-critical/30 bg-critical/10 text-critical"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      <Icon name={error ? "error" : "check_circle"} size={16} className="mt-0.5 shrink-0" />
      {error || message}
    </p>
  );
}

function StepBody({ title, subtitle, children, footer }) {
  return (
    <div className="panel">
      <div className="panel-veil" />
      <div className="relative z-10 flex flex-col p-md">
        <div className="mb-md border-b border-outline-variant/30 pb-xs">
          <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
          {subtitle && <p className="mt-xs text-on-surface-variant">{subtitle}</p>}
        </div>
        <div className="flex-1">{children}</div>
        {footer && <div className="mt-md border-t border-outline-variant/30 pt-md">{footer}</div>}
      </div>
    </div>
  );
}

export default function Launch() {
  const { user } = useAuthUser();
  const canBypass = Boolean(user?.can_bypass_ownership_verification);
  const [step, setStep] = useState(0);
  const [platforms, setPlatforms] = useState([]);
  const [form, setForm] = useState({ name: "", domain: "" });
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Plateforme active du parcours.
  const [platform, setPlatform] = useState(null);
  const [engine, setEngine] = useState("scanners");
  const [auditId, setAuditId] = useState(null);
  const [report, setReport] = useState(null);
  const [launching, setLaunching] = useState(false);
  const pollTimer = useRef(null);

  const loadPlatforms = useCallback(async () => {
    const list = await api("/platforms");
    setPlatforms(list);
    return list;
  }, []);

  useEffect(() => {
    loadPlatforms().catch((err) => setError(err.message));
    return () => clearInterval(pollTimer.current);
  }, [loadPlatforms]);

  async function createPlatform(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const domain = normalizeDomain(form.domain);
    if (!domain) {
      setError("Renseignez un domaine valide (exemple : exemple.com).");
      return;
    }
    setCreating(true);
    try {
      const created = await api("/platforms", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim() || domain,
          domain,
          url: `https://${domain}`,
        }),
      });
      setPlatform(created);
      await loadPlatforms();
      setMessage(`Plateforme « ${created.name} » créée.`);
      setStep(canBypass ? 2 : 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function verifyOwnership() {
    if (!platform) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await api(`/platforms/${platform.id}/verify`, { method: "POST" });
      setPlatform(updated);
      setMessage(
        canBypass
          ? "Compte équipe : vérification contournée. Vous pouvez lancer l'audit."
          : "Propriété vérifiée. Vous pouvez lancer l'audit."
      );
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function continueAsTeam() {
    if (!platform || !canBypass) return;
    await verifyOwnership();
  }

  async function launchAudit() {
    if (!platform || !engine) return;
    setLaunching(true);
    setError("");
    setMessage("");
    try {
      const audit = await api(`/audits/platform/${platform.id}`, {
        method: "POST",
        body: JSON.stringify({ engine }),
      });
      setAuditId(audit.id);
      setLaunching(false);
      setStep(3);
    } catch (err) {
      setError(err.message);
      setLaunching(false);
    }
  }

  // Suivi en direct pendant l'exécution.
  const refreshReport = useCallback(async () => {
    if (!auditId) return;
    try {
      const data = await api(`/reports/${auditId}`);
      setReport(data);
      if (data.status !== "queued" && data.status !== "running") {
        clearInterval(pollTimer.current);
        setLaunching(false);
      }
    } catch {
      /* le polling reprendra au prochain tick */
    }
  }, [auditId]);

  useEffect(() => {
    if (!auditId) return undefined;
    refreshReport();
    pollTimer.current = setInterval(refreshReport, 2500);
    return () => clearInterval(pollTimer.current);
  }, [auditId, refreshReport]);

  const running = report?.status === "queued" || report?.status === "running";
  const completed = report?.status === "completed";
  const verified = platform?.verification_status === "verified";

  const verifiedPlatforms = platforms.filter((p) => p.verification_status === "verified");

  function chooseExisting(selected) {
    setPlatform(selected);
    setError("");
    setMessage("");
    if (selected.verification_status === "verified" || canBypass) {
      setStep(2);
    } else {
      setStep(1);
    }
  }

  return (
    <AppShell>
      <div className="col-span-12">
        <div className="panel">
          <div className="panel-veil" />
          <div className="relative z-10 p-md">
            <div className="mb-md flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant/30 pb-sm">
              <div className="flex items-center gap-sm">
                <Icon name="play_arrow" className="text-primary-container" />
                <div>
                  <h1 className="font-headline-md text-headline-md text-primary">
                    Lancer un audit guidé
                  </h1>
                  <p className="font-data-mono text-[12px] text-on-surface-variant">
                    {auditId
                      ? `Audit AUD-${String(auditId).padStart(4, "0")}`
                      : platform
                        ? `${platform.name} · ${platform.domain}`
                        : "Domaine → propriété → moteur → suivi en direct"}
                  </p>
                </div>
              </div>
              {auditId && (
                <Link
                  to={`/reports/${auditId}`}
                  className="btn-ghost px-sm py-base"
                  title="Ouvrir le rapport complet"
                >
                  <Icon name="assessment" size={16} />
                  Rapport complet
                </Link>
              )}
            </div>
            <StepIndicator current={step} />
          </div>
        </div>
      </div>

      {(error || message) && (
        <div className="col-span-12">
          <Feedback error={error} message={message} />
        </div>
      )}

      {/* Étape 1 — Cible */}
      {step === 0 && (
        <>
          <div className="col-span-12 lg:col-span-6">
            <StepBody
              title="Nouvelle plateforme"
              subtitle="Le domaine est le point d'entrée : la surface sera cartographiée avant l'analyse."
              footer={
                <button
                  type="submit"
                  form="launch-new-platform"
                  disabled={creating}
                  className="btn-primary w-full"
                >
                  <Icon name="arrow_forward" size={16} />
                  {creating ? "Création..." : "Créer et continuer"}
                </button>
              }
            >
              <form
                id="launch-new-platform"
                onSubmit={createPlatform}
                className="space-y-md"
              >
                <div>
                  <label className="field-label" htmlFor="launch-name">
                    Nom (optionnel)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                      <Icon name="label" size={18} className="text-outline" />
                    </span>
                    <input
                      id="launch-name"
                      className="input-field pl-xl"
                      type="text"
                      placeholder="Site institutionnel"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="launch-domain">
                    Domaine
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                      <Icon name="dns" size={18} className="text-outline" />
                    </span>
                    <input
                      id="launch-domain"
                      className="input-field pl-xl"
                      type="text"
                      required
                      placeholder="exemple.com"
                      value={form.domain}
                      onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    />
                  </div>
                  <span className="mt-base block font-data-mono text-[12px] text-on-surface-variant">
                    L'audit couvre ce domaine et les sous-domaines découverts.
                  </span>
                </div>
              </form>
            </StepBody>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <StepBody
              title="Plateformes déjà vérifiées"
              subtitle="Réutilisez une cible déjà enregistrée et vérifiée pour aller plus vite."
              footer={
                verifiedPlatforms.length > 0 ? (
                  <p className="font-data-mono text-[12px] text-on-surface-variant">
                    {verifiedPlatforms.length} plateforme(s) prête(s) à auditer.
                  </p>
                ) : null
              }
            >
              {platforms.length === 0 ? (
                <div className="flex flex-col items-center gap-sm py-lg text-center">
                  <Icon name="inventory_2" size={32} className="text-outline" />
                  <p className="text-on-surface-variant">
                    Aucune plateforme enregistrée pour l'instant. Créez la première à gauche.
                  </p>
                </div>
              ) : (
                <ul className="space-y-sm">
                  {platforms.map((p) => {
                    const pVerified = p.verification_status === "verified";
                    return (
                      <li
                        key={p.id}
                        className={`group relative overflow-hidden rounded border p-sm transition-all duration-200 hover:border-primary/50 ${
                          pVerified
                            ? "border-outline-variant/50 bg-surface-container"
                            : "border-outline-variant/30 bg-surface-container/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-sm">
                          <div className="flex min-w-0 items-center gap-sm">
                            <Icon
                              name={pVerified ? "verified_user" : "gpp_maybe"}
                              size={18}
                              className={
                                pVerified ? "text-success" : "text-warning"
                              }
                            />
                            <div className="min-w-0">
                              <p className="truncate font-body-md font-medium text-primary">
                                {p.name}
                              </p>
                              <p className="truncate font-data-mono text-[11px] text-on-surface-variant">
                                {p.domain}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-base">
                            <StatusBadge value={p.verification_status} />
                            <button
                              type="button"
                              onClick={() => chooseExisting(p)}
                              disabled={!pVerified && !canBypass}
                              className="rounded border border-primary-container/40 px-sm py-base font-label-caps text-[10px] uppercase tracking-wider text-primary-container transition-colors hover:bg-primary-container hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                pVerified
                                  ? "Utiliser cette plateforme"
                                  : canBypass
                                    ? "Compte équipe : démarrer sans preuve de propriété"
                                    : "Vérifiez d'abord la propriété"
                              }
                            >
                              Utiliser
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </StepBody>
          </div>
        </>
      )}

      {/* Étape 2 — Propriété */}
      {step === 1 && platform && (
        <div className="col-span-12">
          <StepBody
            title="Preuve de propriété"
            subtitle="Avant tout scan, ƉEƉE doit confirmer que vous contrôlez ce domaine."
            footer={
              verified ? (
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <p className="flex items-center gap-base font-data-mono text-[12px] text-success">
                    <Icon name="verified_user" size={16} />
                    Propriété vérifiée — vous pouvez choisir le moteur d'exécution.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-primary"
                  >
                    <Icon name="arrow_forward" size={16} />
                    Choisir le moteur
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div className="flex flex-wrap gap-sm">
                    <button
                      type="button"
                      onClick={verifyOwnership}
                      disabled={busy}
                      className="btn-primary"
                    >
                      <Icon name="verified_user" size={16} />
                      {busy ? "Vérification..." : "Vérifier la propriété"}
                    </button>
                    {canBypass && (
                      <button
                        type="button"
                        onClick={continueAsTeam}
                        disabled={busy}
                        className="btn-ghost"
                        title="Réservé à l'équipe ƉEƉE"
                      >
                        <Icon name="admin_panel_settings" size={16} />
                        Contourner (équipe)
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="btn-ghost"
                  >
                    <Icon name="arrow_back" size={16} />
                    Changer de cible
                  </button>
                </div>
              )
            }
          >
            {!verified ? (
              <div className="space-y-md">
                <div className="rounded border border-outline-variant/30 bg-surface-container-lowest p-md">
                  <p className="mb-sm font-label-caps text-label-caps uppercase text-warning">
                    <Icon name="gpp_maybe" size={14} className="mr-1" />
                    Fichier de preuve à déposer
                  </p>
                  <code className="block break-all rounded border border-outline-variant/30 bg-background px-sm py-base font-data-mono text-[12px] text-on-surface-variant">
                    https://{platform.domain}/.well-known/dede-verification.txt
                  </code>
                  <div className="mt-base flex items-center gap-base">
                    <code className="flex-1 break-all rounded border border-outline-variant/30 bg-background px-sm py-base font-data-mono text-[12px] text-primary-container">
                      {platform.verification_token}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(platform.verification_token || "").catch(() => {});
                        setMessage("Jeton copié dans le presse-papiers.");
                      }}
                      className="shrink-0 rounded border border-outline-variant p-base text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                      title="Copier le jeton"
                    >
                      <Icon name="content_copy" size={16} />
                    </button>
                  </div>
                  <p className="mt-base text-[14px] leading-5 text-on-surface-variant">
                    Déposez un fichier public contenant exactement ce jeton à l'adresse
                    ci-dessus, puis lancez la vérification.
                  </p>
                </div>
                <div className="flex items-start gap-base rounded border border-primary-container/20 bg-primary-container/5 px-sm py-base">
                  <Icon name="info" size={16} className="mt-0.5 text-primary-container" />
                  <p className="text-[13px] leading-5 text-on-surface-variant">
                    {canBypass
                      ? "Compte équipe : vous pouvez contourner la preuve de propriété pour un audit interne. Les utilisateurs standards doivent déposer le fichier de preuve."
                      : "Aucun scan ne démarre tant que la propriété n'est pas confirmée."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-sm py-md text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
                  <Icon name="verified_user" size={32} className="text-success" />
                </span>
                <p className="font-headline-sm text-primary">
                  {platform.name} · {platform.domain}
                </p>
                <p className="max-w-md text-on-surface-variant">
                  Cette plateforme est prête. Vous pouvez choisir le moteur
                  d'exécution de l'audit.
                </p>
              </div>
            )}
          </StepBody>
        </div>
      )}

      {/* Étape 3 — Moteur */}
      {step === 2 && platform && (
        <div className="col-span-12">
          <StepBody
            title="Choisir le moteur d'exécution"
            subtitle="Les agents IA offrent une orchestration visible en direct ; les scanners classiques, une exécution déterministe."
            footer={
              <button
                type="button"
                onClick={launchAudit}
                disabled={launching}
                className="btn-primary w-full"
              >
                <Icon name="play_arrow" size={16} />
                {launching ? "Lancement..." : `Lancer l'audit (${engine === "agents" ? "agents IA" : "scanners"})`}
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              {ENGINES.map((option) => {
                const selected = engine === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEngine(option.value)}
                    className={`relative flex flex-col gap-sm rounded-lg border p-md text-left transition-all duration-200 ${
                      selected
                        ? "outer-glow-accent border-primary-container bg-primary-container/10"
                        : "border-outline-variant/30 bg-surface-container hover:border-primary/50"
                    }`}
                  >
                    <span className="absolute right-md top-md flex h-5 w-5 items-center justify-center rounded-pill border">
                      {selected && (
                        <span className="h-3 w-3 rounded-pill bg-primary-container" />
                      )}
                    </span>
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded border ${
                        selected
                          ? "border-primary-container/40 bg-primary-container/15 text-primary-container"
                          : "border-outline-variant/40 bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      <Icon name={option.icon} size={20} />
                    </span>
                    <div>
                      <h3 className="font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                        {option.label}
                      </h3>
                      <p className="mt-xs text-[13px] leading-5 text-on-surface-variant">
                        {option.caption}
                      </p>
                    </div>
                    <ul className="space-y-xs">
                      {option.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-base text-[13px] text-on-surface-variant"
                        >
                          <Icon
                            name="check"
                            size={14}
                            className="mt-0.5 shrink-0 text-primary-container"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </StepBody>
        </div>
      )}

      {/* Étape 4 — Suivi en direct */}
      {step === 3 && auditId && (
        <>
          {engine === "scanners" && (
            <div className="col-span-12">
              <p className="flex items-center gap-base rounded border border-outline-variant/30 bg-surface-container px-sm py-base font-data-mono text-[12px] text-on-surface-variant">
                <Icon name="radar" size={16} className="text-primary-container" />
                Exécution déterministe des scanners classiques — les modules avancent
                dans l'ordre, sans graphe d'orchestration.
              </p>
            </div>
          )}
          <div className="col-span-12">
            <AuditProgress
              status={report?.status || "queued"}
              createdAt={report?.created_at}
              startedAt={report?.started_at}
              finishedAt={report?.finished_at}
              progress={report?.progress || []}
            />
          </div>

          {engine === "agents" && (
            <div className="col-span-12">
              <div className="panel">
                <div className="panel-veil" />
                <div className="relative z-10 p-md">
                  <div className="mb-md flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant/30 pb-xs">
                    <div>
                      <h2 className="panel-title">Graphe d'orchestration des agents</h2>
                      <p className="mt-xs font-data-mono text-[12px] text-on-surface-variant">
                        Chaque nœud est un agent, chaque arête une délégation parent → enfant.
                      </p>
                    </div>
                    <Icon name="hub" className="text-on-surface-variant" />
                  </div>
                  <AgentGraph
                    agents={report?.agent_graph?.agents || []}
                    events={report?.agent_graph?.events || []}
                    height={380}
                  />
                </div>
              </div>
            </div>
          )}

          {(report?.agent_graph?.events || []).length > 0 && (
            <div className="col-span-12">
              <div className="panel">
                <div className="panel-veil" />
                <div className="relative z-10 p-md">
                  <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
                    <div>
                      <h2 className="panel-title">Activité des agents</h2>
                      <p className="mt-xs font-data-mono text-[12px] text-on-surface-variant">
                        Journal des messages et appels d'outils des agents IA.
                      </p>
                    </div>
                    <Icon name="terminal" className="text-on-surface-variant" />
                  </div>
                  <AgentActivity
                    events={report?.agent_graph?.events || []}
                    agents={report?.agent_graph?.agents || []}
                  />
                </div>
              </div>
            </div>
          )}

          {completed && (
            <>
              <div className="col-span-12 lg:col-span-4">
                <ScoreGauge
                  score={report?.score || 0}
                  risk={report?.risk_level || "Inconnu"}
                  title="Score de l'audit"
                />
              </div>
              {engine !== "agents" && (
                <div className="col-span-12 lg:col-span-8">
                  <div className="panel h-full">
                    <div className="panel-veil" />
                    <div className="relative z-10 p-md">
                      <h2 className="mb-md border-b border-outline-variant/30 pb-xs panel-title">
                        Répartition par catégorie
                      </h2>
                      <CategoryBreakdown categories={report?.categories || {}} />
                    </div>
                  </div>
                </div>
              )}
              <div className="col-span-12">
                <div className="panel">
                  <div className="panel-veil" />
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-md p-md">
                    <div className="flex items-start gap-md">
                      <span className="rounded border border-success/30 bg-success/10 p-sm text-success">
                        <Icon name="task_alt" size={24} />
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-primary">
                          Audit terminé — rapport disponible
                        </h2>
                        <p className="mt-xs max-w-2xl text-on-surface-variant">
                          Le rapport complet contient les vulnérabilités, les
                          recommandations priorisées et le plan de correction.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-sm">
                      <Link to={`/reports/${auditId}/chat`} className="btn-ghost">
                        <Icon name="forum" size={16} />
                        Assistant IA
                      </Link>
                      <Link to={`/reports/${auditId}`} className="btn-primary">
                        <Icon name="assessment" size={16} />
                        Voir le rapport
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!running && !completed && report && (
            <div className="col-span-12">
              <Feedback error={`Audit terminé avec le statut « ${report.status} ».`} />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
