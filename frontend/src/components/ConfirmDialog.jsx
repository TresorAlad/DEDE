import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

const TONES = {
  danger: {
    iconWrapper: "bg-rose-50 text-danger",
    confirmButton: "bg-danger text-white hover:bg-danger/90",
  },
  primary: {
    iconWrapper: "bg-sky-50 text-accent",
    confirmButton: "bg-primary text-white hover:bg-primary/90",
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
        className="absolute inset-0 cursor-default bg-primary/40 backdrop-blur-sm animate-fade-in"
      />

      <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-card">
        <button
          type="button"
          onClick={() => !loading && onCancel?.()}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <div className="flex gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${palette.iconWrapper}`}
          >
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 flex-1 pr-6">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold leading-snug text-primary"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            )}
            {details && (
              <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs leading-relaxed text-slate-500">
                {details}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={loading}
            className="btn-ghost"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={() => onConfirm?.()}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50 ${palette.confirmButton}`}
          >
            {loading ? loadingLabel || "Traitement..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
