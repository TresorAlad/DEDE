import { Link } from "react-router-dom";
import Icon from "./Icon";

export default function LegalLayout({ title, updatedAt, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-margin-mobile py-lg">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-grid absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <Link
          to="/signup"
          className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" size={16} />
          Retour à l'inscription
        </Link>

        <div className="panel mt-md">
          <div className="panel-veil" />
          <div className="relative z-10 p-lg">
            <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
            <p className="mt-xs font-data-mono text-data-mono text-on-surface-variant">
              Dernière mise à jour : {updatedAt}
            </p>
            <div className="mt-md space-y-sm leading-relaxed text-on-surface-variant">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
