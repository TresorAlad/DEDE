import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";

/**
 * Guide de parcours (onboarding tour).
 *
 * Affiche un panneau d'étapes qui met en évidence une zone de l'écran
 * (via un sélecteur CSS) ou, à défaut, s'affiche centré sans cible.
 *
 * - La première visite déclenche le tour automatiquement (localStorage).
 * - Il peut être relancé à tout moment via <OnboardingTourLauncher/>.
 * - Chaque étape peut pointer vers un élément `[data-tour="..."]`.
 */

const TOUR_KEY = "dede_tour_seen_v1";

const DEFAULT_STEPS = [
  {
    selector: null,
    icon: "waving_hand",
    title: "Bienvenue sur ƉeƉeFIA",
    text: "Un moteur d'audit cybersécurité orchestré par une équipe d'agents IA. Ce guide vous fait découvrir l'essentiel en quelques secondes.",
  },
  {
    selector: '[data-tour="launch"]',
    icon: "play_arrow",
    title: "Lancer un audit guidé",
    text: "C'est ici que tout commence : un parcours en quatre étapes (cible → propriété → moteur → suivi en direct) pour auditer votre premier domaine.",
  },
  {
    selector: '[data-tour="dashboard"]',
    icon: "dashboard",
    title: "Tableau de bord",
    text: "Une vue d'ensemble épurée : score global, plateformes vérifiées et activité récente. Les détails se déplient à la demande.",
  },
  {
    selector: '[data-tour="platforms"]',
    icon: "inventory_2",
    title: "Plateformes",
    text: "La liste des domaines que vous surveillez, avec leur statut de vérification de propriété.",
  },
  {
    selector: null,
    icon: "neurology",
    title: "L'équipe d'agents",
    text: "L'orchestrateur distribue les tâches entre agents spécialisés (reconnaissance, scan, TLS, analyse IA). Vous suivez chaque agent en direct dans le graphe.",
  },
];

export function useTourDismissed() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(TOUR_KEY) === "1";
    } catch {
      return false;
    }
  });
  return { dismissed, setDismissed };
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function OnboardingTour({
  open,
  onClose,
  steps = DEFAULT_STEPS,
  onDone,
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(null);

  const step = steps[Math.min(index, steps.length - 1)];

  // Positionne le cadre de focus sur l'élément ciblé par l'étape.
  useEffect(() => {
    if (!open) return;
    const selector = step?.selector;
    if (!selector) {
      setBox(null);
      return;
    }
    let raf;
    const update = () => {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setBox({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setBox(null);
      }
    };
    update();
    raf = requestAnimationFrame(update);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [open, step?.selector, index]);

  // Reset à la réouverture + fermeture par Échap.
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    function onKeyDown(event) {
      if (event.key === "Escape") skip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function next() {
    if (index < steps.length - 1) {
      setIndex(index + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  function finish() {
    markTourSeen();
    onDone?.();
    onClose?.();
  }

  function skip() {
    markTourSeen();
    onClose?.();
  }

  const position = useMemo(() => {
    if (!box) return null;
    const margin = 16;
    // Place le panneau sous la cible, en le gardant dans le viewport.
    const left = Math.min(Math.max(box.left, margin), window.innerWidth - 360);
    const top = Math.min(box.top + box.height + margin, window.innerHeight - 260);
    return { left, top };
  }, [box]);

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Voile cliquable qui laisse passer le focus visuel sur la cible */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" onClick={skip} />

      {/* Cadre de focus autour de la cible */}
      {box && (
        <div
          className="pointer-events-none absolute rounded-lg border-2 border-primary-container shadow-[0_0_0_4px_rgb(var(--color-primary-container)/0.25),0_0_40px_rgb(var(--color-primary-container)/0.35)] transition-all duration-300"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
          }}
        />
      )}

      {/* Panneau d'étape */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guide de parcours"
        className="w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-outline-variant/40 bg-surface-container-high p-md shadow-2xl"
        style={
          position
            ? { position: "absolute", left: position.left, top: position.top }
            : { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }
        }
      >
        <div className="mb-sm flex items-start justify-between gap-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded border border-primary-container/40 bg-primary-container/15 text-primary-container">
            <Icon name={step.icon || "info"} size={20} />
          </span>
          <button
            type="button"
            onClick={skip}
            className="rounded p-xs text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
            aria-label="Fermer le guide"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <h3 className="font-headline-sm text-primary" style={{ fontSize: "18px" }}>
          {step.title}
        </h3>
        <p className="mt-xs text-[13px] leading-5 text-on-surface-variant">{step.text}</p>

        <div className="mt-md flex items-center justify-between">
          <div className="flex items-center gap-xs">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-pill transition-all duration-300 ${
                  i === index ? "w-6 bg-primary-container" : "w-1.5 bg-outline-variant"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-xs">
            {index > 0 && (
              <button type="button" onClick={prev} className="btn-ghost px-sm py-xs">
                <Icon name="arrow_back" size={14} />
                Précédent
              </button>
            )}
            <button type="button" onClick={next} className="btn-primary px-sm py-xs">
              {index < steps.length - 1 ? "Suivant" : "C'est parti"}
              <Icon name="arrow_forward" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bouton discret pour relancer le guide depuis n'importe quelle page.
 * À placer dans la TopBar ou une page.
 */
export function OnboardingTourLauncher({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-10 w-10 scale-95 items-center justify-center rounded-full transition-colors hover:bg-surface-variant hover:text-primary active:scale-90"
      title="Guide de parcours"
      aria-label="Ouvrir le guide de parcours"
    >
      <Icon name="help" />
    </button>
  );
}
