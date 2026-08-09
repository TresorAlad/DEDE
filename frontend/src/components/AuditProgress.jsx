import { AlertCircle, Check, Loader2 } from "lucide-react";

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

/**
 * Bande de suivi de l'audit, étape par étape (tour après tour).
 */
export default function AuditProgress({
  status = "queued",
  createdAt,
  startedAt,
  finishedAt,
  progress = [],
}) {
  const failed = status === "failed";
  const completed = status === "completed";
  const running = status === "running";

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
      {
        key: "received",
        label: "Reçu",
        time: formatTime(createdAt),
        state: "done",
        detail: "",
      },
      {
        key: "analysis",
        label: failed ? "Analyse interrompue" : "Analyse en cours",
        time: formatTime(startedAt),
        state: completed ? "done" : running ? "active" : failed ? "failed" : "pending",
        detail: "",
      },
      {
        key: "done",
        label: failed ? "Échec" : "Terminé",
        time: formatTime(finishedAt),
        state: completed ? "done" : failed ? "failed" : "pending",
        detail: "",
      },
    ];
  }

  // Si le statut global est terminé, toutes les étapes sont validées.
  if (completed && steps.length) {
    steps = steps.map((step) =>
      step.state === "failed" ? step : { ...step, state: "done" }
    );
  }

  const activeLabel =
    steps.find((s) => s.state === "active")?.label ||
    (completed ? "Terminé" : failed ? "Échec" : running ? "En cours" : "En file");

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-primary">Suivi de l'audit</p>
          <p className="text-xs text-slate-500">
            Étape actuelle : <span className="font-medium text-primary">{activeLabel}</span>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            completed
              ? "bg-emerald-100 text-emerald-700"
              : failed
              ? "bg-rose-100 text-rose-700"
              : "bg-sky-100 text-sky-700"
          }`}
        >
          {completed ? "Terminé" : failed ? "Échec" : running ? "En cours" : "En file"}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[640px] items-start">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const done = step.state === "done";
            const active = step.state === "active";
            const isFailed = step.state === "failed";
            return (
              <div key={step.key || index} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div className="flex flex-1 justify-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                        done
                          ? "border-primary bg-primary text-white"
                          : active
                          ? "border-accent bg-white text-accent"
                          : isFailed
                          ? "border-rose-500 bg-rose-500 text-white"
                          : "border-slate-200 bg-white text-slate-300"
                      }`}
                    >
                      {done ? (
                        <Check size={18} />
                      ) : active ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle size={18} />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      )}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`h-1 flex-[2] rounded-full ${
                        steps[index + 1].state === "done" ||
                        steps[index + 1].state === "active" ||
                        done
                          ? "bg-primary"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`mt-2 px-1 text-center text-[11px] font-medium leading-tight ${
                    done || active
                      ? "text-primary"
                      : isFailed
                      ? "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-center text-[10px] text-slate-400">{step.time}</p>
                )}
                {step.detail && (done || active || isFailed) && (
                  <p className="mt-0.5 max-w-[7.5rem] text-center text-[10px] leading-snug text-slate-500">
                    {step.detail}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
