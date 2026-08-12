/**
 * Cadre des ecrans d'authentification : grille ambiante, halos et panneau vitre.
 */
import Reveal from "./Reveal";
import ThemeToggle from "./ThemeToggle";

export default function AuthLayout({ subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-margin-mobile">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-grid absolute inset-0" />
      </div>
      <div className="pointer-events-none absolute left-1/4 top-1/4 z-0 h-96 w-96 rounded-pill bg-primary-container/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 z-0 h-96 w-96 rounded-pill bg-primary-container/5 blur-[120px]" />

      <div className="absolute right-margin-mobile top-margin-mobile z-20 sm:right-md sm:top-md">
        <ThemeToggle className="border border-outline-variant/40 bg-surface/70 backdrop-blur-md" />
      </div>

      <Reveal as="main" delay={80} className="relative z-10 w-full max-w-md py-lg">
        <div className="mb-lg text-center" data-reveal>
          <img
            src="/logo.png"
            alt="ƉeƉeFIA"
            width={500}
            height={145}
            className="mx-auto mb-sm h-16 w-auto max-w-[280px] object-contain"
          />
          <p className="font-data-mono text-data-mono text-on-surface-variant">{subtitle}</p>
        </div>

        <div
          className="glass-panel relative overflow-hidden rounded-xl p-lg shadow-2xl"
          data-reveal
        >
          <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />
          {children}
        </div>

        {footer && (
          <div className="mt-md text-center" data-reveal>
            {footer}
          </div>
        )}
      </Reveal>
    </div>
  );
}
