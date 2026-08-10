import { animate, utils } from "animejs";
import { useLayoutEffect, useRef } from "react";

import Icon from "./Icon";
import useCountUp from "../hooks/useCountUp";
import { DURATION, EASE, onceVisible, prefersReducedMotion, pulse } from "../motion";
import { scoreTone, themeColor, withAlpha } from "../themeColors";

const CIRCUMFERENCE = 282.7;

function statusLabel(score, undetermined) {
  if (undetermined) return "Analyse incomplète";
  if (score >= 75) return "Système optimal";
  if (score >= 50) return "Surveillance requise";
  return "Action immédiate";
}

export default function ScoreGauge({
  score = 0,
  risk = "Inconnu",
  title = "Score de sécurité global",
  updatedAt,
}) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const undetermined = risk === "Indéterminé";
  const color = undetermined
    ? themeColor("outline", "#85948e")
    : scoreTone(value).color;
  const offset = undetermined ? CIRCUMFERENCE : CIRCUMFERENCE - (CIRCUMFERENCE * value) / 100;
  const status = statusLabel(value, undetermined);
  const scoreRef = useCountUp(undetermined ? NaN : Math.round(value), { onDone: pulse });
  const arcRef = useRef(null);

  // L'arc se remplit au rythme du compteur : les deux racontent la meme mesure.
  useLayoutEffect(() => {
    const arc = arcRef.current;
    if (!arc || prefersReducedMotion()) return undefined;

    utils.set(arc, { strokeDashoffset: CIRCUMFERENCE });

    return onceVisible(arc, () =>
      animate(arc, {
        strokeDashoffset: offset,
        duration: DURATION.figure,
        ease: EASE.out,
      })
    );
  }, [offset]);

  return (
    <div className="panel h-full">
      <div className="panel-veil" />
      <div className="relative z-10 flex h-full flex-col items-center p-md">
        <div className="mb-md flex w-full items-center justify-between border-b border-outline-variant/30 pb-xs">
          <h2 className="panel-title">{title}</h2>
          <Icon name="speed" className="text-on-surface-variant" />
        </div>

        <div className="relative mt-md flex h-48 w-48 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-outline-variant opacity-20"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              ref={arcRef}
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ filter: `drop-shadow(0 0 8px ${withAlpha(color, 0.35)})` }}
            />
          </svg>
          <div className="flex flex-col items-center text-center">
            <span
              ref={scoreRef}
              className="font-display-lg text-display-lg tracking-tighter text-primary"
            >
              {undetermined ? "?" : Math.round(value)}
            </span>
            <span className="mt-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
              /100
            </span>
          </div>
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-sm pt-md">
          <div
            className="rounded border px-sm py-xs font-label-caps text-label-caps uppercase tracking-widest"
            style={{
              color,
              borderColor: withAlpha(color, 0.2),
              backgroundColor: withAlpha(color, 0.1),
            }}
          >
            {status}
          </div>
          <p className="text-center font-data-mono text-[12px] text-on-surface-variant">
            Niveau de risque : {risk || "Inconnu"}
          </p>
          {updatedAt && (
            <p className="text-center font-data-mono text-[12px] text-on-surface-variant">
              Mis à jour : {updatedAt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
