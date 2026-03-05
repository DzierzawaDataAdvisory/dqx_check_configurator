import { useState, lazy, Suspense } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";

const CheckWizard = lazy(() =>
  import("../checks/CheckWizard").then((m) => ({ default: m.CheckWizard }))
);

export function Step4AttributeOverview() {
  const { tableConfig, checks } = useCheckStore();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [_activeColumn, setActiveColumn] = useState<string | null>(null);

  function getChecksForColumn(colName: string) {
    return checks.filter((c) => {
      const args = c.dqxCheck.check.arguments;
      const forEach = c.dqxCheck.check.for_each_column;
      return (
        args?.["column"] === colName ||
        (forEach && forEach.includes(colName))
      );
    });
  }

  function openWizardForColumn(colName: string) {
    sessionStorage.setItem("quickAddContext", JSON.stringify({ column: colName }));
    setActiveColumn(colName);
    setWizardOpen(true);
  }

  if (tableConfig.columns.length === 0) {
    return (
      <div className="max-w-3xl p-8 text-center text-text-muted text-sm border border-dashed border-border rounded-xl">
        Keine Attribute definiert. Gehen Sie zurück und legen Sie Attribute an.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <p className="text-sm text-text-secondary">
        Klicken Sie auf eine Kachel, um Checks für das jeweilige Attribut zu konfigurieren.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tableConfig.columns.map((col) => {
          const colChecks = getChecksForColumn(col.name);
          const checkCount = colChecks.length;
          const hasErrors = colChecks.some((c) => !c.isValid);

          return (
            <button
              key={col.name}
              onClick={() => openWizardForColumn(col.name)}
              className={`group flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-md ${
                checkCount > 0
                  ? "bg-accent/5 border-accent/30 hover:border-accent/60 hover:bg-accent/10"
                  : "bg-bg-elevated border-border hover:border-accent/40 hover:bg-bg-surface"
              } ${hasErrors ? "border-red-500/40" : ""}`}
            >
              {/* Column name */}
              <div className="w-full">
                <div className="font-mono text-sm font-medium text-text-primary truncate">{col.name}</div>
                <div className="text-xs text-text-muted mt-0.5">{col.dataType}</div>
              </div>

              {/* Check count badge + add hint */}
              <div className="w-full flex items-center justify-between">
                {checkCount > 0 ? (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    hasErrors
                      ? "bg-red-500/20 text-red-400"
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    <CheckSquare size={11} />
                    {checkCount} Check{checkCount !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">Keine Checks</span>
                )}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} className="text-accent" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex gap-6 text-xs text-text-muted pt-2 border-t border-border">
        <span>{tableConfig.columns.length} Attribute</span>
        <span>{checks.length} Checks gesamt</span>
        <span>{tableConfig.columns.filter((c) => getChecksForColumn(c.name).length > 0).length} Attribute mit Checks</span>
      </div>

      {/* Lazy-loaded CheckWizard */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-bg-surface border border-border rounded-xl px-5 py-4 shadow-xl">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Wird geladen...</span>
          </div>
        </div>
      }>
        {wizardOpen && (
          <CheckWizard
            onClose={() => {
              setWizardOpen(false);
              setActiveColumn(null);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
