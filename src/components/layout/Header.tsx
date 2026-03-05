import { useEffect } from "react";
import { Database, Code2, HelpCircle, MapPin } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { HelpGlossary } from "../help/HelpGlossary";

export function Header() {
  const { tableConfig, checks, glossaryTerm, openGlossary, closeGlossary } = useCheckStore();

  const tableName = [tableConfig.catalog, tableConfig.schema, tableConfig.table]
    .filter(Boolean)
    .join(".");

  // Listen for deep-link events from InfoTooltip
  useEffect(() => {
    function handleGlossaryEvent(e: Event) {
      const term = (e as CustomEvent<string>).detail;
      openGlossary(term);
    }
    window.addEventListener("dqx-open-glossary", handleGlossaryEvent);
    return () => window.removeEventListener("dqx-open-glossary", handleGlossaryEvent);
  }, [openGlossary]);

  function handleRestartTour() {
    localStorage.removeItem("dqx-tour-completed");
    window.dispatchEvent(new CustomEvent("dqx-restart-tour"));
  }

  return (
    <>
      <header className="h-14 bg-bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Code2 size={18} className="text-white" />
          </div>
          <div>
            <span className="font-semibold text-text-primary text-sm">DQX Check Designer</span>
            <span className="text-text-muted text-xs ml-2 hidden sm:inline">No-Code Data Quality</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Active table indicator */}
        {tableName && (
          <div className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-lg px-3 py-1.5">
            <Database size={14} className="text-accent" />
            <span className="text-text-secondary text-xs font-mono">{tableName}</span>
          </div>
        )}

        {/* Check stats */}
        <div className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-lg px-3 py-1.5">
          <span className="text-text-secondary text-xs">{checks.length} Check{checks.length !== 1 ? "s" : ""}</span>
          {checks.length > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-success text-xs">{checks.filter(c => c.isValid).length} gültig</span>
              {checks.filter(c => !c.isValid).length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-error text-xs">{checks.filter(c => !c.isValid).length} fehlerhaft</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Tour restart */}
        <button
          onClick={handleRestartTour}
          className="btn-ghost p-2 text-text-muted hover:text-text-secondary"
          title="Einführungstour neu starten"
          aria-label="Einführungstour neu starten"
        >
          <MapPin size={16} />
        </button>

        {/* Help / Glossary */}
        <button
          onClick={() => openGlossary()}
          className="btn-ghost p-2 text-text-muted hover:text-text-secondary"
          title="Glossar – Erklärungen zu DQ-Begriffen"
          aria-label="Glossar öffnen"
        >
          <HelpCircle size={16} />
        </button>
      </header>

      {glossaryTerm !== null && <HelpGlossary onClose={closeGlossary} initialSearch={glossaryTerm} />}
    </>
  );
}
