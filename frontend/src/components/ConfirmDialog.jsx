import { useEffect, useRef } from "react";
import Icon from "./Icon";

const TONES = {
  danger: {
    iconWrapper: "border-critical/30 bg-critical/10 text-critical",
    confirmButton: "btn-danger",
    accent: "via-critical",
  },
  primary: {
    iconWrapper: "border-primary-container/30 bg-primary-container/10 text-primary-container",
    confirmButton: "btn-primary",
    accent: "via-primary-container",
  },
};

/**
 * Boîte de dialogue de confirmation.
 *
 * Remplace `window.confirm`, dont l'apparence dépend du navigateur et sort
 * complètement de la charte graphique du produit.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loadingLabel,
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loading) {
        onCancel?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    // Empêche l'arrière-plan de défiler pendant que la boîte est ouverte.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const palette = TONES[tone] || TONES.danger;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={() => !loading && onCancel?.()}
        className="absolute inset-0 animate-fade-in cursor-default bg-surface-container-lowest/70 backdrop-blur-sm"
      />

      <div className="glass-panel relative w-full max-w-md animate-scale-in overflow-hidden rounded-xl p-md shadow-2xl">
        <div
          className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent to-transparent opacity-50 ${palette.accent}`}
        />

        <button
          type="button"
          onClick={() => !loading && onCancel?.()}
          disabled={loading}
          className="absolute right-md top-md rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary disabled:opacity-40"
          aria-label="Fermer"
        >
          <Icon name="close" size={18} />
        </button>

        <div className="flex gap-md pt-xs">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded border ${palette.iconWrapper}`}
          >
            <Icon name="warning" size={20} />
          </span>
          <div className="min-w-0 flex-1 pr-md">
            <h2 id="confirm-dialog-title" className="font-headline-sm text-headline-sm text-primary">
              {title}
            </h2>
            {description && <p className="mt-sm text-on-surface-variant">{description}</p>}
            {details && (
              <p className="mt-sm rounded border border-outline-variant/30 bg-surface-container-lowest px-sm py-base font-data-mono text-[12px] leading-relaxed text-on-surface-variant">
                {details}
              </p>
            )}
          </div>
        </div>

        <div className="mt-md flex flex-wrap justify-end gap-sm">
          <button type="button" onClick={() => onCancel?.()} disabled={loading} className="btn-ghost">
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={() => onConfirm?.()}
            disabled={loading}
            className={palette.confirmButton}
          >
            {loading ? loadingLabel || "Traitement..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
