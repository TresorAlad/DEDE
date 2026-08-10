import useReveal from "../hooks/useReveal";

/**
 * Conteneur dont les descendants marqués `data-reveal` apparaissent en cascade
 * lorsqu'il atteint la fenêtre.
 *
 * Utiliser `as` pour conserver la sémantique du bloc enveloppé (`section`,
 * `header`, `ul`...) plutôt que d'ajouter un `div` intermédiaire.
 */
export default function Reveal({ as: Tag = "div", delay = 0, selector, children, ...rest }) {
  const ref = useReveal({ delay, selector });

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
}
