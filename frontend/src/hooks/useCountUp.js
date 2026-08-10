import { useLayoutEffect, useRef } from "react";

import { countUp, onceVisible, prefersReducedMotion } from "../motion";

/**
 * Fait défiler un nombre de zéro jusqu'à sa valeur, une fois visible.
 *
 * Le JSX doit rendre la valeur finale : elle reste affichée si le script
 * échoue, et le hook la remplace par le compteur avant le premier rendu.
 */
export default function useCountUp(value, { format, onDone } = {}) {
  const ref = useRef(null);
  const optionsRef = useRef({ format, onDone });
  optionsRef.current = { format, onDone };

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || !Number.isFinite(value)) return undefined;

    const render = optionsRef.current.format ?? String;
    node.textContent = render(0);

    return onceVisible(node, () =>
      countUp(node, value, {
        format: render,
        onDone: (element) => optionsRef.current.onDone?.(element),
      })
    );
  }, [value]);

  return ref;
}
