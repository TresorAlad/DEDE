import { useEffect, useRef, useState } from "react";

import Icon from "./Icon";

/**
 * Démonstration animée du paradigme agents pour la landing.
 *
 * Simule en boucle l'exécution d'une équipe d'agents : l'orchestrateur
 * distribue les tâches, chaque agent spécialisé travaille puis transmet le
 * relais, l'analyste IA consolide. Le graphe et la console avancent au même
 * rythme pour que le visiteur comprenne le mécanisme d'un coup d'œil.
 *
 * Pure présentation : aucun appel réseau, aucune dépendance au backend.
 *
 * La boucle est dérivée d'un seul compteur (`tick`) : aucune course de
 * minuteur possible, et chaque rendu est déterministe à partir de l'état.
 */

const AGENTS = [
  { id: "orchestrator", label: "Orchestrateur", icon: "hub", x: 400, y: 58 },
  { id: "recon", label: "Reconnaissance", icon: "dns", x: 130, y: 208 },
  { id: "scanner", label: "Scanner", icon: "radar", x: 400, y: 228 },
  { id: "ssl", label: "TLS / En-têtes", icon: "lock", x: 670, y: 208 },
  { id: "analyst", label: "Analyste IA", icon: "neurology", x: 400, y: 372 },
];

const EDGES = [
  { from: "orchestrator", to: "recon" },
  { from: "orchestrator", to: "scanner" },
  { from: "orchestrator", to: "ssl" },
  { from: "recon", to: "analyst" },
  { from: "scanner", to: "analyst" },
  { from: "ssl", to: "analyst" },
];

/**
 * Séquence de la boucle : [agent en cours, ligne de console].
 * Une phase supplémentaire (tous terminés) conclut chaque cycle.
 */
const PHASES = [
  { active: "orchestrator", log: "orchestrator$ Répartition des tâches entre 3 agents spécialisés" },
  { active: "recon", log: "recon$ Cartographie : 42 sous-domaines découverts" },
  { active: "scanner", log: "scanner$ 3 vulnérabilités détectées (CVE-2026-2147, ...)" },
  { active: "ssl", log: "ssl$ TLS 1.2 accepté · certificat valide · en-têtes HSTS manquants" },
  { active: "analyst", log: "analyst$ Priorisation IA : 1 critique · 2 moyennes" },
];

const PHASE_MS = 1700;

function statusOf(phaseInCycle, agentId) {
  const order = PHASES.map((p) => p.active);
  const position = order.indexOf(agentId);
  if (position < 0) return "idle";
  if (position < phaseInCycle) return "done";
  if (position === phaseInCycle) return "running";
  return "pending";
}

const NODE_META = {
  running: { cls: "border-primary-container/60 bg-primary-container/15", dot: "bg-primary-container animate-pulse", label: "EN COURS" },
  done: { cls: "border-success/50 bg-success/10", dot: "bg-success", label: "TERMINÉ" },
  pending: { cls: "border-outline-variant/40 bg-surface-container/80", dot: "bg-outline", label: "EN ATTENTE" },
  idle: { cls: "border-outline-variant/30 bg-surface-container/60", dot: "bg-outline/50", label: "EN ATTENTE" },
};

export default function AgentTeamShowcase() {
  const [tick, setTick] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), PHASE_MS);
    return () => clearInterval(timer);
  }, []);

  const phaseInCycle = tick % (PHASES.length + 1);
  const cycleDone = phaseInCycle >= PHASES.length;
  const running = !cycleDone;
  const logs = phaseInCycle === 0 ? [] : PHASES.slice(0, phaseInCycle).map((p) => p.log);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-2xl">
      {/* Barre de fenêtre */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-md py-sm">
        <div className="flex items-center gap-base font-label-caps text-label-caps uppercase text-primary">
          <Icon name="neurology" size={16} />
          Mission control · équipe dede-agent
        </div>
        <div className="flex gap-base">
          <span className="h-2 w-2 rounded-pill bg-error" />
          <span className="h-2 w-2 rounded-pill bg-outline" />
          <span className="h-2 w-2 rounded-pill bg-primary-container" />
        </div>
      </div>

      {/* Graphe d'orchestration */}
      <div className="tech-grid relative border-b border-outline-variant/30">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-surface-container-lowest/60" />
        <svg viewBox="0 0 800 440" className="relative block w-full" role="img" aria-label="Graphe d'orchestration d'une équipe d'agents">
          <defs>
            <marker id="dede-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--color-primary-container))" />
            </marker>
          </defs>
          {EDGES.map((edge) => {
            const from = AGENTS.find((a) => a.id === edge.from);
            const to = AGENTS.find((a) => a.id === edge.to);
            const targetStatus = statusOf(phaseInCycle, edge.to);
            const active = targetStatus === "running" || targetStatus === "done";
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y + 26}
                x2={to.x}
                y2={to.y - 26}
                stroke={active ? "rgb(var(--color-primary-container))" : "rgb(var(--color-outline-variant))"}
                strokeOpacity={active ? 0.9 : 0.8}
                strokeWidth={active ? 2 : 1.2}
                strokeDasharray={active ? "6 4" : "2 4"}
                style={{ transition: "stroke 300ms ease, stroke-width 300ms ease" }}
              />
            );
          })}
          {AGENTS.map((agent) => {
            const status = statusOf(phaseInCycle, agent.id);
            const meta = NODE_META[status];
            const isRoot = agent.id === "orchestrator";
            return (
              <g key={agent.id}>
                <rect
                  x={agent.x - (isRoot ? 74 : 82)}
                  y={agent.y - 26}
                  width={isRoot ? 148 : 164}
                  height={52}
                  rx="10"
                  fill="rgb(var(--color-surface-container-low))"
                  stroke="rgb(var(--color-outline-variant))"
                  strokeOpacity="0.5"
                />
                <circle
                  cx={agent.x - (isRoot ? 56 : 64)}
                  cy={agent.y}
                  r="4"
                  fill={
                    status === "running"
                      ? "rgb(var(--color-primary-container))"
                      : status === "done"
                        ? "rgb(var(--color-success))"
                        : "rgb(var(--color-outline))"
                  }
                  opacity={status === "pending" ? 0.6 : 1}
                />
                <text
                  x={agent.x - (isRoot ? 40 : 48)}
                  y={agent.y + 4}
                  fill="rgb(var(--color-on-surface))"
                  fontSize="13"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                >
                  {agent.label}
                </text>
                <text
                  x={agent.x - (isRoot ? 40 : 48)}
                  y={agent.y + 18}
                  fill="rgb(var(--color-on-surface-variant))"
                  fontSize="9.5"
                  fontFamily="Inter, sans-serif"
                  letterSpacing="1"
                >
                  {meta.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Console live */}
      <div className="bg-surface-container-lowest p-md">
        <div className="mb-sm flex items-center justify-between">
          <span className="flex items-center gap-base font-data-mono text-[11px] text-on-surface-variant">
            <Icon name="terminal" size={14} className="text-primary-container" />
            console · flux d'exécution
          </span>
          <span className="chip border-primary-container/30 bg-primary-container/10 text-primary-container">
            <span className={`h-1.5 w-1.5 rounded-pill bg-current ${running ? "animate-pulse" : ""}`} />
            {running ? "EN DIRECT" : "TERMINÉ"}
          </span>
        </div>
        <div
          ref={scrollRef}
          className="h-32 space-y-1 overflow-y-auto rounded border border-outline-variant/30 bg-background p-sm font-data-mono text-[11.5px] leading-5"
        >
          {logs.length === 0 && (
            <p className="text-on-surface-variant/60">
              $ dede-agent --target exemple.com
              <span className="ml-1 inline-block h-3 w-2 translate-y-0.5 animate-pulse bg-primary-container" />
            </p>
          )}
          {logs.map((line, index) => {
            const [who, ...rest] = line.split("$ ");
            const message = rest.join("$ ");
            const isActive = index === logs.length - 1 && running;
            return (
              <p key={`${phaseInCycle}-${index}`} className="flex items-start gap-base">
                <span className="shrink-0 text-primary-container">{who}$</span>
                <span className={isActive ? "text-primary" : "text-on-surface-variant/80"}>
                  {message}
                </span>
              </p>
            );
          })}
          {running && (
            <p className="flex items-center gap-1 text-primary-container">
              <span className="inline-block h-3 w-2 animate-pulse bg-current" />
              _
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
