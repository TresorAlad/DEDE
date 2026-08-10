import Icon from "./Icon";
import StatusBadge from "./StatusBadge";

const SEVERITY_STRIP = {
  critical: "#f43f5e",
  critique: "#f43f5e",
  high: "#f59e0b",
  haute: "#f59e0b",
  élevée: "#f59e0b",
  medium: "#f59e0b",
  moyenne: "#f59e0b",
  low: "#5ffbd6",
  basse: "#5ffbd6",
  faible: "#5ffbd6",
};

export default function RiskList({ items = [] }) {
  if (!items.length) {
    return (
      <p className="flex items-center gap-base font-data-mono text-data-mono text-on-surface-variant">
        <Icon name="check_circle" size={18} className="text-success" />
        Aucun risque listé pour le moment.
      </p>
    );
  }

  return (
    <ul className="space-y-sm">
      {items.map((item, index) => {
        const command = item.fix_command || item.commande;
        const severity = (item.severity || "info").toLowerCase();
        const strip = SEVERITY_STRIP[severity] || "#3c4a45";

        return (
          <li key={index} className="panel">
            <div className="panel-veil" />
            <span
              className="absolute bottom-0 left-0 top-0 z-10 w-1"
              style={{ backgroundColor: strip }}
            />
            <div className="relative z-10 p-md pl-[calc(24px+4px)]">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <p className="font-headline-sm text-primary" style={{ fontSize: "18px", lineHeight: "24px" }}>
                  {item.title || item.type || "Risque"}
                </p>
                <StatusBadge value={severity} />
              </div>

              {item.host && (
                <p className="mt-xs font-data-mono text-[12px] text-on-surface-variant">
                  Cible : {item.host}
                </p>
              )}

              {(item.description || item.risk) && (
                <p className="mt-sm text-on-surface-variant">{item.description || item.risk}</p>
              )}

              {item.solution && (
                <p className="mt-sm text-on-surface-variant">
                  <span className="font-label-caps text-label-caps uppercase text-primary-container">
                    Correction :{" "}
                  </span>
                  {item.solution}
                </p>
              )}

              {command && (
                <code className="mt-sm block overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-lowest px-sm py-base font-data-mono text-[12px] text-primary-container">
                  {command}
                </code>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
