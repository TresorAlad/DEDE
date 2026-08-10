import { animate, utils } from "animejs";
import { useLayoutEffect, useRef } from "react";

import Icon from "./Icon";
import Reveal from "./Reveal";
import { DURATION, EASE, prefersReducedMotion } from "../motion";
import { themeColor } from "../themeColors";

const CIRCUMFERENCE = 283;

// Icone et sous-titre associes aux cles d'etape renvoyees par le worker.
// Les cles heritees couvrent les audits enregistres avant le renommage.
const MODULE_META = {
  queued: { icon: "inbox", caption: "Réception de la demande" },
  surface: { icon: "dns", caption: "Cartographie de la surface exposée" },
  nuclei: { icon: "radar", caption: "Recherche de vulnérabilités" },
  ssl: { icon: "lock", caption: "Analyse de la configuration TLS" },
  headers: { icon: "http", caption: "Contrôle des en-têtes de sécurité" },
  score: { icon: "speed", caption: "Calcul du score" },
  ai: { icon: "neurology", caption: "Analyse par l'IA" },
  done: { icon: "task_alt", caption: "Audit finalisé" },
  received: { icon: "inbox", caption: "Réception de la demande" },
  resolve: { icon: "dns", caption: "Résolution DNS" },
  subdomains: { icon: "dns", caption: "Cartographie de la surface exposée" },
  scoring: { icon: "speed", caption: "Calcul du score" },
  analysis: { icon: "radar", caption: "Analyse en cours" },
  // Moteur agents IA
  orchestration: { icon: "hub", caption: "Répartition des tâches entre agents" },
  agents: { icon: "neurology", caption: "Agents IA en orchestration" },
  report: { icon: "assessment", caption: "Consolidation des résultats" },
};

const STATE_STYLE = {
  done: {
    strip: "bg-surface-tint",
    wrapper: "border-outline-variant/30 bg-surface-container",
    icon: "text-surface-tint",
    chip: "border-surface-tint/20 bg-surface-tint/10 text-surface-tint",
    label: "Terminé",
  },
  active: {
    strip: "bg-primary-container animate-pulse",
    wrapper: "border-primary-container/30 bg-primary-container/5 shadow-[0_0_8px_rgba(95,251,214,0.1)]",
    icon: "text-primary-container",
    chip: "border-primary-container/20 bg-primary-container/10 text-primary-container",
    label: "En cours",
  },
  failed: {
    strip: "bg-critical",
    wrapper: "border-critical/30 bg-critical/5",
    icon: "text-critical",
    chip: "border-critical/30 bg-critical/10 text-critical",
    label: "Échec",
  },
  pending: {
    strip: "bg-outline-variant",
    wrapper: "border-outline-variant/30 bg-surface-container opacity-60",
    icon: "text-on-surface-variant",
    chip: "border-outline-variant/30 bg-surface-variant text-on-surface-variant",
    label: "En attente",
  },
};

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AuditProgress({
  status = "queued",
  createdAt,
  startedAt,
  finishedAt,
  progress = [],
}) {
  const failed = status === "failed";
  const cancelled = status === "cancelled";
  const completed = status === "completed";
  const running = status === "running";
  const interrupted = failed || cancelled;

  let steps;
  if (Array.isArray(progress) && progress.length > 0) {
    steps = progress.map((step) => ({
      key: step.key,
      label: step.label || step.key,
      detail: step.detail || "",
      time: formatTime(step.at),
      state: step.status || "pending",
    }));
  } else {
    // Anciens audits sans progress_json : repli sur 3 étapes.
    steps = [
      { key: "received", label: "Reçu", time: formatTime(createdAt), state: "done", detail: "" },
      {
        key: "analysis",
        label: interrupted ? "Analyse interrompue" : "Analyse",
        time: formatTime(startedAt),
        state: completed ? "done" : running ? "active" : interrupted ? "failed" : "pending",
        detail: "",
      },
      {
        key: "done",
        label: cancelled ? "Annulé" : failed ? "Échec" : "Terminé",
        time: formatTime(finishedAt),
        state: completed ? "done" : interrupted ? "failed" : "pending",
        detail: "",
      },
    ];
  }

  if (completed && steps.length) {
    steps = steps.map((step) => (step.state === "failed" ? step : { ...step, state: "done" }));
  }

  const doneCount = steps.filter((s) => s.state === "done").length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;
  const ringColor = interrupted ? themeColor("critical") : themeColor("surface-tint");

  const activeLabel =
    steps.find((s) => s.state === "active")?.label ||
    (completed
      ? "Terminé"
      : cancelled
        ? "Annulé"
        : failed
          ? "Échec"
          : running
            ? "En cours"
            : "En file");

  const ringRef = useRef(null);
  const ringMounted = useRef(false);

  // L'anneau progresse d'une etape a l'autre pendant que l'audit tourne : on
  // anime depuis la valeur affichee, et depuis zero au tout premier rendu.
  useLayoutEffect(() => {
    const ring = ringRef.current;
    if (!ring || prefersReducedMotion()) return;

    if (!ringMounted.current) {
      ringMounted.current = true;
      utils.set(ring, { strokeDashoffset: CIRCUMFERENCE });
    }

    animate(ring, {
      strokeDashoffset: offset,
      duration: DURATION.figure,
      ease: EASE.out,
    });
  }, [offset]);

  const logs = steps
    .filter((step) => step.time)
    .map((step) => ({
      time: step.time,
      level: step.state === "failed" ? "ERREUR" : step.state === "active" ? "EN COURS" : "INFO",
      state: step.state,
      text: step.detail || step.label,
    }));

  return (
    <div className="grid grid-cols-12 gap-gutter">
      <div className="relative col-span-12 flex flex-col items-center overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-low p-md lg:col-span-4">
        <div className="pointer-events-none absolute inset-0 -translate-y-1/2 rounded-full bg-primary/5 opacity-20 blur-3xl" />
        <h3 className="mb-lg w-full border-b border-outline-variant/30 pb-sm text-left font-headline-sm text-headline-sm text-primary">
          Progression globale
        </h3>

        <div className="relative mb-lg flex h-64 w-64 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              className="text-outline-variant opacity-30"
              strokeWidth="2"
            />
            <circle
              ref={ringRef}
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={ringColor}
              strokeWidth="2"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display-lg text-display-lg text-primary">{percent}%</span>
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              {activeLabel}
            </span>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-md border-t border-outline-variant/30 pt-md">
          <div className="text-center">
            <div className="mb-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
              Démarré
            </div>
            <div className="font-data-mono text-data-mono text-primary">
              {formatTime(startedAt) || formatTime(createdAt) || "--:--:--"}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
              Étapes
            </div>
            <div className="font-data-mono text-data-mono text-primary opacity-70">
              {doneCount}/{steps.length}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 flex flex-col rounded-lg border border-outline-variant/50 bg-surface-container-low p-md lg:col-span-8">
        <h3 className="mb-md border-b border-outline-variant/30 pb-sm font-headline-sm text-headline-sm text-primary">
          Modules d'exécution
        </h3>
        <Reveal className="flex-1 space-y-md">
          {steps.map((step, index) => {
            const style = STATE_STYLE[step.state] || STATE_STYLE.pending;
            const meta = MODULE_META[step.key] || { icon: "bolt", caption: step.detail || "Étape d'audit" };
            return (
              <div
                key={step.key || index}
                data-reveal
                className={`relative flex items-center justify-between overflow-hidden rounded border p-sm ${style.wrapper}`}
              >
                <span className={`absolute bottom-0 left-0 top-0 w-1 ${style.strip}`} />
                <div className="flex items-center gap-md pl-2">
                  <Icon
                    name={meta.icon}
                    className={`${style.icon} ${step.state === "active" ? "animate-spin" : ""}`}
                  />
                  <div>
                    <div className="font-body-md font-medium text-primary">{step.label}</div>
                    <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                      {meta.caption}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  {step.time && (
                    <span className="font-data-mono text-[12px] text-on-surface-variant">
                      {step.time}
                    </span>
                  )}
                  <span className={`chip ${style.chip}`}>{style.label}</span>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>

      <div className="col-span-12 flex h-64 flex-col overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-sm">
        <div className="mb-2 flex items-center justify-between border-b border-outline-variant/30 px-2 pb-2">
          <h3 className="flex items-center gap-base font-label-caps text-label-caps uppercase text-primary">
            <Icon name="terminal" size={16} />
            Journal d'exécution
          </h3>
          <div className="flex gap-base">
            <span className="h-2 w-2 rounded-pill bg-error" />
            <span className="h-2 w-2 rounded-pill bg-outline" />
            <span className="h-2 w-2 rounded-pill bg-primary-container" />
          </div>
        </div>
        <Reveal className="flex-1 space-y-1 overflow-y-auto p-2 font-data-mono text-[12px] leading-5">
          {logs.length === 0 && (
            <p className="text-on-surface-variant opacity-70">En attente du démarrage de l'audit...</p>
          )}
          {logs.map((log, index) => (
            <div key={index} data-reveal className="flex items-start gap-base">
              <span className="text-outline-variant">[{log.time}]</span>
              <span
                className={
                  log.state === "failed"
                    ? "text-critical"
                    : log.state === "active"
                    ? "text-primary-container"
                    : "text-surface-tint"
                }
              >
                [{log.level}]
              </span>
              <span className={log.state === "failed" ? "text-critical" : "text-on-surface-variant"}>
                {log.text}
              </span>
            </div>
          ))}
          {running && (
            <div className="mt-md flex animate-pulse items-start gap-base">
              <span className="text-primary-container">_</span>
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}
