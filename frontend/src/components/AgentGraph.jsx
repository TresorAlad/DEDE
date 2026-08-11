import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Icon from "./Icon";

const STATUS_META = {
  running: { cls: "border-primary-container/40 bg-primary-container/10", dot: "bg-primary-container animate-pulse", label: "En cours", spin: true },
  active: { cls: "border-primary-container/40 bg-primary-container/10", dot: "bg-primary-container animate-pulse", label: "En cours", spin: true },
  working: { cls: "border-primary-container/40 bg-primary-container/10", dot: "bg-primary-container animate-pulse", label: "Au travail", spin: true },
  completed: { cls: "border-success/40 bg-success/10", dot: "bg-success", label: "Terminé" },
  done: { cls: "border-success/40 bg-success/10", dot: "bg-success", label: "Terminé" },
  finished: { cls: "border-success/40 bg-success/10", dot: "bg-success", label: "Terminé" },
  failed: { cls: "border-critical/40 bg-critical/10", dot: "bg-critical", label: "Échec" },
  error: { cls: "border-critical/40 bg-critical/10", dot: "bg-critical", label: "Erreur" },
  crashed: { cls: "border-critical/40 bg-critical/10", dot: "bg-critical", label: "Planté" },
  idle: { cls: "border-outline-variant/40 bg-surface-container", dot: "bg-outline", label: "En attente" },
  pending: { cls: "border-outline-variant/40 bg-surface-container", dot: "bg-outline", label: "En attente" },
  stopped: { cls: "border-warning/40 bg-warning/10", dot: "bg-warning", label: "Arrêté" },
  cancelled: { cls: "border-warning/40 bg-warning/10", dot: "bg-warning", label: "Annulé" },
};

function normalizeStatus(status) {
  const s = String(status || "idle").toLowerCase();
  if (STATUS_META[s]) return s;
  if (["running", "active", "working"].includes(s)) return "running";
  if (["completed", "done", "finished"].includes(s)) return "completed";
  if (["failed", "error", "crashed"].includes(s)) return "failed";
  if (["stopped", "cancelled"].includes(s)) return "stopped";
  return "idle";
}

function AgentNode({ data }) {
  const meta = STATUS_META[normalizeStatus(data.status)] || STATUS_META.idle;
  return (
    <div
      title={`${data.label || data.id} · ${meta.label}`}
      className={`relative flex min-w-[160px] flex-col gap-sm rounded-lg border px-sm py-base shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-transform duration-150 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)] ${meta.cls}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-outline-variant" />
      <div className="flex items-center gap-base">
        <Icon
          name={meta.spin ? "progress_activity" : "neurology"}
          size={14}
          className={`${meta.dot.split(" ")[0]} ${meta.spin ? "animate-spin" : ""}`}
        />
        <span className="truncate font-data-mono text-[12px] font-medium text-primary">
          {data.label || data.id}
        </span>
      </div>
      <div className="flex items-center gap-base">
        <span className={`h-1.5 w-1.5 rounded-pill ${meta.dot}`} />
        <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
          {meta.label}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-outline-variant" />
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

// Layout hiérarchique : profondeur = colonne, ordre dans la profondeur = ligne.
function computeLayout(agents) {
  const childrenOf = new Map();
  const roots = [];
  for (const agent of agents) {
    const parent = agent.parent_id || agent.parent;
    if (parent && agents.some((a) => a.id === parent)) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(agent);
    } else {
      roots.push(agent);
    }
  }

  const depthOf = new Map();
  const order = [];
  const queue = roots.map((agent) => ({ agent, depth: 0 }));
  while (queue.length) {
    const { agent, depth } = queue.shift();
    depthOf.set(agent.id, depth);
    order.push(agent);
    for (const child of childrenOf.get(agent.id) || []) {
      queue.push({ agent: child, depth: depth + 1 });
    }
  }
  // Agents non atteignables (orchestre désordonné) : dernière colonne.
  for (const agent of agents) {
    if (!depthOf.has(agent.id)) {
      depthOf.set(agent.id, Math.max(0, ...depthOf.values()) + 1);
      order.push(agent);
    }
  }

  const maxDepth = Math.max(0, ...depthOf.values());
  const countAt = new Map();
  const positions = new Map();
  for (const agent of order) {
    const depth = depthOf.get(agent.id);
    const index = countAt.get(depth) || 0;
    countAt.set(depth, index + 1);
    const total = order.filter((a) => depthOf.get(a.id) === depth).length;
    const columnGap = 240;
    const rowGap = 96;
    const offset = ((total - 1) / 2 - index) * rowGap;
    positions.set(agent.id, {
      x: 24 + depth * columnGap,
      y: 160 + offset,
    });
  }
  return { positions, maxDepth };
}

export default function AgentGraph({ agents = [], events = [], height = 380 }) {
  const { nodes, edges } = useMemo(() => {
    const { positions, maxDepth } = computeLayout(agents);
    const n = agents.map((agent) => ({
      id: agent.id,
      type: "agentNode",
      position: positions.get(agent.id) || { x: 24, y: 160 },
      data: {
        id: agent.id,
        label: agent.name || agent.id,
        status: agent.status || "idle",
      },
    }));
    const e = [];
    for (const agent of agents) {
      const parent = agent.parent_id || agent.parent;
      if (parent && agents.some((a) => a.id === parent)) {
        e.push({
          id: `e-${parent}-${agent.id}`,
          source: parent,
          target: agent.id,
          animated: ["running", "active", "working"].includes(
            String(agent.status || "").toLowerCase()
          ),
          style: { stroke: "#5a6f6a", strokeWidth: 1.5 },
        });
      }
    }
    return { nodes: n, edges: e, maxDepth };
  }, [agents]);

  const [nodesState, setNodesState, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdgesState, onEdgesChange] = useEdgesState(edges);

  // Le graphe est "live" : quand les agents arrivent (polling pendant le run),
  // on fusionne les nouveaux nœuds/arêtes sans écraser les positions manuelles.
  useEffect(() => {
    setNodesState((prev) => {
      const known = new Map(prev.map((n) => [n.id, n]));
      for (const node of nodes) {
        known.set(node.id, { ...known.get(node.id), ...node });
      }
      return Array.from(known.values());
    });
    setEdgesState((prev) => {
      const known = new Map(prev.map((e) => [e.id, e]));
      for (const edge of edges) known.set(edge.id, edge);
      return Array.from(known.values());
    });
  }, [nodes, edges, setNodesState, setEdgesState]);

  const summary = useMemo(() => {
    const counts = { running: 0, completed: 0, failed: 0, idle: 0 };
    for (const agent of agents) {
      const key = normalizeStatus(agent.status);
      if (key === "running") counts.running += 1;
      else if (key === "completed") counts.completed += 1;
      else if (key === "failed") counts.failed += 1;
      else counts.idle += 1;
    }
    return counts;
  }, [agents]);

  const totalAgents = agents.length;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center gap-md">
        <span className="chip border-primary-container/30 bg-primary-container/10 text-primary-container">
          <Icon name="neurology" size={14} />
          {totalAgents} agent(s)
        </span>
        {summary.running > 0 && (
          <span className="chip border-primary-container/30 bg-primary-container/10 text-primary-container">
            <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-current" />
            {summary.running} en cours
          </span>
        )}
        {summary.completed > 0 && (
          <span className="chip border-success/30 bg-success/10 text-success">
            <Icon name="check_circle" size={14} />
            {summary.completed} terminé(s)
          </span>
        )}
        {summary.failed > 0 && (
          <span className="chip border-critical/30 bg-critical/10 text-critical">
            <Icon name="error" size={14} />
            {summary.failed} échec(s)
          </span>
        )}
        {events.length > 0 && (
          <span className="chip border-outline-variant/30 bg-surface-variant/30 text-on-surface-variant">
            <Icon name="terminal" size={14} />
            {events.length} événement(s)
          </span>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest"
        style={{ height }}
      >
        {totalAgents === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-sm text-center">
            <Icon name="hub" size={32} className="text-outline" />
            <p className="font-data-mono text-[12px] text-on-surface-variant">
              En attente de la topologie des agents…
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodesState}
            edges={edgesState}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#3a4a46"
            />
            <Controls className="!rounded-lg !border !border-outline-variant/50 !bg-surface-container !text-on-surface-variant" />
          </ReactFlow>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
          Légende
        </span>
        {Object.entries(STATUS_META)
          .filter(([key]) => ["running", "completed", "failed", "idle", "stopped"].includes(key))
          .map(([key, meta]) => (
            <span
              key={key}
              className="flex items-center gap-base rounded-full border border-outline-variant/30 bg-surface-container px-sm py-xs font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant"
            >
              <span className={`h-1.5 w-1.5 rounded-pill ${meta.dot}`} />
              {meta.label}
            </span>
          ))}
      </div>
    </div>
  );
}
