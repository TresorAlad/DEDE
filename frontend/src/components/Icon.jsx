/**
 * Icone Material Symbols Outlined.
 *
 * La police est auto-hebergee et reduite aux seules icones referencees ici :
 * toute nouvelle icone impose de relancer `npm run icons`.
 */
export default function Icon({ name, size = 20, fill = false, className = "", ...rest }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined shrink-0 ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `"FILL" ${fill ? 1 : 0}, "wght" 400, "GRAD" 0, "opsz" ${size}`,
      }}
      {...rest}
    >
      {name}
    </span>
  );
}
