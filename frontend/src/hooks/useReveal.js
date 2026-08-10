import { useEffect, useLayoutEffect, useRef } from "react";

import { hide, onceVisible, revealSeries } from "../motion";

/**
 * Fait apparaître en cascade les descendants d'un conteneur.
 *
 * La cascade démarre quand le conteneur entre dans la fenêtre. Les écrans
 * authentifiés remplacent leurs squelettes de chargement par les données de
 * l'API : les éléments montés après coup sont donc animés à leur tour, sans
 * rejouer ceux déjà affichés.
 */
export default function useReveal({ delay = 0, selector = "[data-reveal]" } = {}) {
  const ref = useRef(null);
  const visible = useRef(false);
  const pending = useRef([]);

  // Sans tableau de dependances : chaque rendu peut apporter de nouveaux
  // elements, et le marquage `data-revealed` evite de les animer deux fois.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const fresh = [...root.querySelectorAll(selector)].filter(
      (element) => !element.dataset.revealed
    );
    if (!fresh.length) return;

    fresh.forEach((element) => {
      element.dataset.revealed = "true";
    });
    hide(fresh);

    if (visible.current) {
      revealSeries(fresh);
    } else {
      pending.current.push(...fresh);
    }
  });

  useEffect(() => {
    return onceVisible(ref.current, () => {
      visible.current = true;
      const targets = pending.current;
      pending.current = [];
      if (targets.length) revealSeries(targets, { delay });
    });
  }, [delay]);

  return ref;
}
