import { useEffect, useRef, useCallback } from "react";

/**
 * Hook für Modal-Keyboard-Handling:
 * - Escape schließt den Dialog
 * - Fokus bleibt im Dialog gefangen (Tab / Shift+Tab)
 */
export function useModalKeyboard(onClose: () => void, onSave?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+Enter / Cmd+Enter → speichern
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onSave) {
        e.preventDefault();
        onSave();
        return;
      }

      // Escape → schließen
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab → Fokus-Trapping
      if (e.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose, onSave]
  );

  useEffect(() => {
    // Vorherigen Fokus merken
    const previousFocus = document.activeElement as HTMLElement;

    // Ersten fokussierbaren Element fokussieren
    if (containerRef.current) {
      const first = containerRef.current.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      first?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Fokus zurückgeben
      previousFocus?.focus?.();
    };
  }, [handleKeyDown]);

  return containerRef;
}
