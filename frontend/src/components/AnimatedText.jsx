import { animate, splitText, stagger, utils } from "animejs";
import { useLayoutEffect, useRef } from "react";

import { DURATION, EASE, onceVisible, prefersReducedMotion } from "../motion";

/**
 * Texte dont les caractères se composent un à un à l'entrée dans la fenêtre.
 *
 * Deux allures : `rise` fait monter chaque lettre pour les titres, `type`
 * les fait simplement apparaître dans l'ordre, ce qui imite une saisie au
 * clavier dans les blocs de console.
 *
 * Les lettres ne sont pas rognées : les accents des majuscules françaises
 * seraient tronqués par un masquage à la ligne de base.
 */
export default function AnimatedText({
  as: Tag = "h2",
  mode = "rise",
  delay = 0,
  speed = mode === "type" ? 14 : 26,
  className = "",
  children,
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return undefined;

    let animation = null;
    const split = splitText(element, { chars: true });

    // addEffect rejoue la mise en place si la police arrive apres coup, et
    // permet a revert() de tout defaire d'un seul appel.
    split.addEffect(({ chars }) => {
      const shift = mode === "type" ? "0%" : "70%";
      utils.set(chars, { opacity: 0, y: shift });
      animation = animate(chars, {
        opacity: [0, 1],
        y: [shift, "0%"],
        duration: mode === "type" ? DURATION.fast : DURATION.slow,
        ease: EASE.out,
        delay: stagger(speed, { start: delay }),
        autoplay: false,
      });
      return animation;
    });

    const stop = onceVisible(element, () => animation?.play());

    return () => {
      stop();
      split.revert();
    };
    // Le texte de ces libelles est statique : inutile de resplitter a chaque rendu.
  }, [delay, mode, speed]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
