/**
 * Vocabulaire d'animation de la plateforme.
 *
 * Le mouvement guide le regard et rend les changements d'état lisibles. Les
 * amplitudes sont franches pour que l'entrée d'un écran se remarque, mais une
 * seule courbe de sortie est utilisée partout afin que l'ensemble reste
 * cohérent plutôt que tape-à-l'œil.
 *
 * Toute animation passe par ce module afin que `prefers-reduced-motion` reste
 * respecté en un seul endroit.
 */
import { animate, stagger, utils } from "animejs";

export const DURATION = {
  fast: 240,
  base: 520,
  slow: 950,
  /** Jauges et compteurs : assez lent pour que la valeur se lise défiler. */
  figure: 1600,
};

export const EASE = {
  out: "out(4)",
  inOut: "inOut(3)",
};

/** Décalage entre deux éléments d'une même série. */
export const STAGGER = 110;

/** Amplitude de déplacement d'une apparition, en pixels. */
export const SHIFT = 38;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}

/**
 * Rend au CSS la main sur les propriétés qu'une apparition a pilotées.
 *
 * `cleanInlineStyles` restaurerait l'état inline d'avant l'animation, donc
 * l'état masqué : on retire nous-mêmes les deux propriétés concernées pour que
 * les classes de survol reprennent effet.
 */
function releaseStyles(targets) {
  targets.forEach((element) => {
    element.style.removeProperty("opacity");
    element.style.removeProperty("transform");
  });
}

/**
 * Masque des éléments avant leur apparition.
 *
 * A appeler dans un `useLayoutEffect` : l'état initial est posé en JavaScript
 * plutôt qu'en CSS pour qu'une erreur de script laisse le contenu visible.
 */
export function hide(targets) {
  if (prefersReducedMotion()) return;
  utils.set(targets, { opacity: 0, translateY: SHIFT });
  const scalable = targets.filter(canScale);
  if (scalable.length) utils.set(scalable, { scale: SCALE_FROM });
}

const SCALE_FROM = 0.96;

// Une ligne de tableau supporte mal la mise a l'echelle : elle est decalee
// sans etre redimensionnee.
function canScale(element) {
  return element.tagName !== "TR";
}

function entryScale(element) {
  return canScale(element) ? [SCALE_FROM, 1] : [1, 1];
}

/** Apparition d'une série d'éléments, du premier au dernier. */
export function revealSeries(targets, { delay = 0, from = SHIFT } = {}) {
  if (prefersReducedMotion() || !targets.length) {
    releaseStyles(targets);
    return null;
  }
  return animate(targets, {
    opacity: [0, 1],
    translateY: [from, 0],
    scale: entryScale,
    duration: DURATION.slow,
    ease: EASE.out,
    delay: stagger(STAGGER, { start: delay }),
    onComplete: () => releaseStyles(targets),
  });
}

/**
 * Compte de 0 jusqu'à `value`.
 *
 * `format` reçoit l'entier courant, ce qui permet d'afficher un suffixe ou un
 * séparateur sans réécrire l'animation.
 */
export function countUp(
  node,
  value,
  { format = (n) => String(n), duration = DURATION.figure, onDone } = {}
) {
  if (!node) return null;
  if (prefersReducedMotion() || !Number.isFinite(value)) {
    node.textContent = format(Number.isFinite(value) ? value : 0);
    return null;
  }
  const counter = { current: 0 };
  return animate(counter, {
    current: value,
    duration,
    ease: EASE.out,
    modifier: utils.round(0),
    onUpdate: () => {
      node.textContent = format(counter.current);
    },
    onComplete: () => onDone?.(node),
  });
}

/** Bref rebond marquant qu'une valeur vient de se stabiliser. */
export function pulse(node) {
  if (!node || prefersReducedMotion()) return null;
  return animate(node, {
    scale: [1, 1.14, 1],
    duration: DURATION.base,
    ease: EASE.inOut,
    onComplete: () => node.style.removeProperty("transform"),
  });
}

/**
 * Déclenche `run` la première fois que l'élément entre dans la fenêtre.
 *
 * Les pages authentifiées défilent dans un conteneur interne : on s'appuie sur
 * l'IntersectionObserver, qui observe la fenêtre quelle que soit la hiérarchie
 * de scroll, plutôt que sur un conteneur nommé.
 */
export function onceVisible(element, run, { threshold = 0.15 } = {}) {
  if (!element) return () => {};
  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    run();
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      run();
    },
    { threshold }
  );
  observer.observe(element);
  return () => observer.disconnect();
}
