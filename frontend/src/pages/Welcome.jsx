import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api } from "../api/client";
import { useAuthUser } from "../hooks/useAuthUser";

/**
 * Page d'accueil connectée — premier écran après la connexion.
 *
 * Volontairement sobre : un message de bienvenue, l'état du compte et un
 * parcours en trois étapes (plateforme → propriété → audit) au lieu de
 * projeter l'utilisateur directement sur le tableau de bord complet.
 */

const STEPS = [
  {
    key: "platform",
    icon: "inventory_2",
    title: "Ajoutez une plateforme",
    caption: "Déclarez le domaine à surveiller.",
    detail: "Une plateforme = un domaine. C'est votre point d'entrée : la surface sera cartographiée avant toute analyse.",
    to: "/launch",
    cta: "Ajouter une plateforme",
  },
  {
    key: "verify",
    icon: "key",
    title: "Prouvez la propriété",
    caption: "Confirmez que le domaine est à vous.",
    detail: "ƉeƉeFIA génère un jeton à déposer dans un fichier public à la racine de votre domaine. Aucun scan sans cette preuve.",
    to: "/launch",
    cta: "Vérifier la propriété",
  },
  {
    key: "audit",
    icon: "neurology",
    title: "Lancez l'équipe d'agents",
    caption: "L'orchestrateur déploie les agents spécialisés.",
    detail: "Suivez chaque agent en direct dans le graphe d'orchestration, puis exploitez le rapport priorisé.",
    to: "/launch",
    cta: "Lancer un audit",
  },
];

export default function Welcome() {
  const { user } = useAuthUser();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/platforms")
      .then((list) => {
        if (active) setPlatforms(list || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const verifiedCount = platforms.filter((p) => p.verification_status === "verified").length;
  const hasPlatform = platforms.length > 0;
  const hasVerified = verifiedCount > 0;

  const stepStates = {
    platform: hasPlatform ? "done" : "todo",
    verify: hasPlatform ? (hasVerified ? "done" : "active") : "todo",
    audit: hasVerified ? "active" : "todo",
  };

  const nextStep = hasVerified ? "audit" : hasPlatform ? "verify" : "platform";

  return (
    <AppShell>
      <div className="col-span-12">
        <PageHeader
          title={`Bienvenue${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} 👋`}
          subtitle="Votre équipe d'agents IA est prête. Suivez le parcours pour lancer votre premier audit."
          actions={
            <Link to="/launch" className="btn-primary px-sm py-base">
              <Icon name="play_arrow" size={16} />
              {hasVerified ? "Lancer un audit" : "Commencer le parcours"}
            </Link>
          }
        />
      </div>

      {error && (
        <div className="col-span-12">
          <p className="flex items-center gap-base rounded border border-warning/30 bg-warning/10 px-sm py-base font-data-mono text-[12px] text-warning">
            <Icon name="info" size={16} />
            {error}
          </p>
        </div>
      )}

      {/* État du compte — sobre, deux cartes max */}
      <div className="col-span-12 grid grid-cols-1 gap-gutter md:grid-cols-2">
        <div className="panel">
          <div className="panel-veil" />
          <div className="relative z-10 flex items-center gap-md p-md">
            <span className="rounded border border-primary-container/30 bg-primary-container/10 p-sm text-primary-container">
              <Icon name="inventory_2" size={22} />
            </span>
            <div className="min-w-0">
              <p className="panel-title">Plateformes</p>
              <p className="mt-xs truncate text-[22px] font-semibold leading-7 text-primary">
                {loading ? "…" : `${platforms.length} enregistrée(s)`}
              </p>
              <p className="mt-xs text-[13px] text-on-surface-variant">
                {loading
                  ? "Chargement…"
                  : hasVerified
                    ? `${verifiedCount} vérifiée(s) — prêtes à auditer`
                    : "Aucune vérifiée pour l'instant"}
              </p>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-veil" />
          <div className="relative z-10 flex items-center gap-md p-md">
            <span className="rounded border border-success/30 bg-success/10 p-sm text-success">
              <Icon name="neurology" size={22} />
            </span>
            <div className="min-w-0">
              <p className="panel-title">Moteur d'exécution</p>
              <p className="mt-xs truncate text-[22px] font-semibold leading-7 text-primary">
                Agents IA disponibles
              </p>
              <p className="mt-xs text-[13px] text-on-surface-variant">
                Orchestration en direct, graphe et rapport priorisé.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Parcours en trois étapes */}
      <div className="col-span-12 mt-md">
        <div className="panel">
          <div className="panel-veil" />
          <div className="relative z-10 p-md">
            <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
              <div>
                <h2 className="panel-title">Votre parcours</h2>
                <p className="mt-xs text-on-surface-variant">
                  Trois étapes du domaine au premier rapport. L'étape{" "}
                  {nextStep === "audit"
                    ? "3"
                    : nextStep === "verify"
                      ? "2"
                      : "1"}{" "}
                  vous attend.
                </p>
              </div>
              <StatusBadge value="info" label={`Étape ${nextStep === "audit" ? "3" : nextStep === "verify" ? "2" : "1"}`} />
            </div>

            <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
              {STEPS.map((step, index) => {
                const state = stepStates[step.key];
                const isNext = step.key === nextStep;
                return (
                  <div
                    key={step.key}
                    className={`relative flex flex-col rounded-lg border p-md transition-all duration-200 ${
                      isNext
                        ? "outer-glow-accent border-primary-container bg-primary-container/5"
                        : state === "done"
                          ? "border-success/30 bg-success/5"
                          : "border-outline-variant/30 bg-surface-container-low"
                    }`}
                  >
                    <div className="mb-sm flex items-center justify-between">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded border ${
                          state === "done"
                            ? "border-success/40 bg-success/10 text-success"
                            : isNext
                              ? "border-primary-container/40 bg-primary-container/15 text-primary-container"
                              : "border-outline-variant/40 bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {state === "done" ? (
                          <Icon name="check" size={18} />
                        ) : (
                          <Icon name={step.icon} size={18} />
                        )}
                      </span>
                      <span className="font-display-lg text-[26px] leading-none text-outline-variant/40">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                      {step.title}
                    </h3>
                    <p className="mt-xs flex-1 text-[13px] leading-5 text-on-surface-variant">
                      {step.detail}
                    </p>
                    <Link
                      to={step.to}
                      className={`mt-md flex items-center justify-center gap-sm rounded border px-md py-sm font-label-caps text-label-caps uppercase tracking-wider transition-colors ${
                        isNext
                          ? "border-primary-container bg-primary-container/10 text-primary-container hover:bg-primary-container hover:text-on-primary"
                          : state === "done"
                            ? "border-outline-variant/40 text-on-surface-variant hover:border-success/50 hover:text-success"
                            : "border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Icon name={state === "done" ? "replay" : "arrow_forward"} size={14} />
                      {state === "done" ? "Revoir" : step.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Accès secondaires — discrets */}
      <div className="col-span-12 mt-md">
        <div className="flex flex-wrap items-center justify-between gap-sm rounded-lg border border-outline-variant/30 bg-surface-container-low px-md py-sm">
          <p className="text-[13px] text-on-surface-variant">
            Envie d'aller plus vite ? Retrouvez toutes vos données dans le tableau de bord.
          </p>
          <div className="flex flex-wrap items-center gap-sm">
            <Link to="/dashboard" className="btn-ghost px-sm py-xs">
              <Icon name="dashboard" size={14} />
              Tableau de bord
            </Link>
            <Link to="/platforms" className="btn-ghost px-sm py-xs">
              <Icon name="inventory_2" size={14} />
              Plateformes
            </Link>
            <Link to="/reports" className="btn-ghost px-sm py-xs">
              <Icon name="assessment" size={14} />
              Rapports
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
