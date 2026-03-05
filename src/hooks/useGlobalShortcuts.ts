import { useEffect, useCallback } from "react";
import { useCheckStore } from "./useCheckStore";

export function useGlobalShortcuts() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const inEditable =
      tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
      (e.target as HTMLElement)?.isContentEditable;

    const modalOpen = document.querySelector('[role="dialog"]') !== null;

    // Remaining shortcuts: only when NOT in editable field and NO modal open
    if (inEditable || modalOpen) return;

    // N → neuer Check
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      const store = useCheckStore.getState();
      if (store.currentView !== "checks") {
        store.setCurrentView("checks");
      }
      window.dispatchEvent(new CustomEvent("dqx-shortcut-new-check"));
      return;
    }

    // ? → Glossar öffnen
    if (e.key === "?") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("dqx-open-glossary"));
      return;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
