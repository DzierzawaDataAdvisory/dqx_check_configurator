import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "../../hooks/useToastStore";
import type { Toast } from "../../hooks/useToastStore";

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
} as const;

const COLOR_MAP = {
  success: "bg-success/10 border-success/30 text-success",
  error: "bg-error/10 border-error/30 text-error",
  info: "bg-accent/10 border-accent/30 text-accent",
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.removeToast);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => remove(toast.id), 280);
    return () => clearTimeout(timer);
  }, [exiting, remove, toast.id]);

  const Icon = ICON_MAP[toast.variant];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm ${
        COLOR_MAP[toast.variant]
      } ${exiting ? "animate-toast-out" : "animate-toast-in"}`}
      role="status"
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="text-sm text-text-primary flex-1">{toast.message}</span>
      {toast.undoAction && (
        <button
          onClick={() => {
            toast.undoAction!();
            setExiting(true);
          }}
          className="text-xs underline hover:no-underline flex-shrink-0"
        >
          Rückgängig
        </button>
      )}
      <button
        onClick={() => setExiting(true)}
        className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body
  );
}
