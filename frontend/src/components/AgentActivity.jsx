/**
 * Journal des événements produits par les agents (messages et appels d'outils).
 *
 * Utilisé dans le rapport d'audit et dans le suivi en direct du flux de
 * lancement : mêmes données, même rendu console.
 */
import { useEffect, useRef } from "react";

export function formatEventTime(value) {
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

export default function AgentActivity({ events = [], agents = [], limit = 200, live = false }) {
  const scrollRef = useRef(null);
  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));

  // En mode live, le journal reste collé en bas quand de nouveaux événements arrivent.
  useEffect(() => {
    if (live && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, live]);

  // En mode live, on garde l'ordre chronologique (nouveaux événements en bas,
  // alignés avec l'auto-scroll et le curseur). Dans le rapport, on affiche le
  // plus récent en premier.
  const source = live ? events || [] : (events || []).slice().reverse();
  const rows = source.slice(0, limit).map((event) => {
      const agent = agentById[event.agent_id];
      const name = agent?.name || event.agent_id || "agent";
      if (event.type === "tool") {
        const toolName = event.data?.tool_name || "outil";
        const input = event.data?.input;
        let command = "";
        if (typeof input === "string" && input.trim()) command = input.trim();
        else if (input && typeof input === "object") {
          command = input.command || input.cmd || input.description || input.query || "";
        }
        return {
          key: event.id || `${name}-${event.timestamp}`,
          time: formatEventTime(event.timestamp),
          kind: "tool",
          text: `⚙ ${toolName}`,
          command: typeof command === "string" ? command.slice(0, 220) : "",
          agent: name,
        };
      }
      const content = event.data?.content;
      const text =
        typeof content === "string"
          ? content
          : content && typeof content === "object"
            ? JSON.stringify(content)
            : "";
      return {
        key: event.id || `${name}-${event.timestamp}`,
        time: formatEventTime(event.timestamp),
        kind: "chat",
        text: (text || "(message vide)").slice(0, 300),
        command: "",
        agent: name,
      };
    });

  return (
    <div
      ref={scrollRef}
      className="max-h-96 space-y-1 overflow-y-auto rounded border border-outline-variant/30 bg-surface-container-lowest p-sm font-data-mono text-[12px] leading-5"
    >
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col">
          <div className="flex items-start gap-base">
            <span className="shrink-0 text-outline-variant">[{row.time}]</span>
            <span className="shrink-0 text-primary-container">{row.agent}</span>
            <span className={row.kind === "tool" ? "text-warning" : "text-surface-tint"}>
              {row.text}
            </span>
          </div>
          {row.command && (
            <div className="ml-12 whitespace-pre-wrap break-all text-success/80">$ {row.command}</div>
          )}
        </div>
      ))}
      {!rows.length && <p className="text-on-surface-variant">Aucun événement enregistré.</p>}
      {live && rows.length > 0 && (
        <div className="flex items-center gap-base text-on-surface-variant">
          <span className="text-success">$</span>
          <span className="cursor-blink">▊</span>
        </div>
      )}
    </div>
  );
}
