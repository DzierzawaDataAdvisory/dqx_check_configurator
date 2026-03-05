import { useState, lazy, Suspense } from "react";
import { Download, Eye, Edit2, CheckSquare, AlertTriangle } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { PreviewModal } from "../preview/PreviewModal";
import { generateDqxYaml } from "../../lib/yamlGenerator";

const CheckWizard = lazy(() =>
  import("../checks/CheckWizard").then((m) => ({ default: m.CheckWizard }))
);

export function Step5FinalOverview() {
  const { tableConfig, checks, setWizardStep } = useCheckStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [_editingColumnForWizard, setEditingColumnForWizard] = useState<string | null>(null);

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

  const checksWithoutColumn = checks.filter((c) => {
    const args = c.dqxCheck.check.arguments;
    const forEach = c.dqxCheck.check.for_each_column;
    if (forEach && forEach.length > 0) return false;
    const col = args?.["column"] as string | undefined;
    if (!col) return true;
    return !tableConfig.columns.some((tc) => tc.name === col);
  });

  function handleDownloadYaml() {
    const content = generateDqxYaml(checks);
    const blob = new Blob([content], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableConfig.table || "checks"}_dqx.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEditForColumn(colName: string) {
    sessionStorage.setItem("quickAddContext", JSON.stringify({ column: colName }));
    setEditingColumnForWizard(colName);
    setEditWizardOpen(true);
  }

  const totalValid = checks.filter((c) => c.isValid).length;
  const totalInvalid = checks.filter((c) => !c.isValid).length;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-6 p-4 bg-bg-elevated border border-border rounded-xl text-sm">
        <div>
          <span className="text-text-muted">Tabelle: </span>
          <span className="text-text-primary font-medium font-mono">
            {[tableConfig.catalog, tableConfig.schema, tableConfig.table].filter(Boolean).join(".")}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-text-muted">Attribute: </span>
          <span className="text-text-primary font-medium">{tableConfig.columns.length}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-text-muted">Checks gesamt: </span>
          <span className="text-text-primary font-medium">{checks.length}</span>
        </div>
        {totalInvalid > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle size={14} />
              <span>{totalInvalid} ungültig</span>
            </div>
          </>
        )}
        {totalValid === checks.length && checks.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <CheckSquare size={14} />
              Alle Checks gültig
            </div>
          </>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-colors"
          >
            <Eye size={13} />
            Vorschau
          </button>
          <button
            onClick={handleDownloadYaml}
            disabled={checks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            YAML exportieren
          </button>
        </div>
      </div>

      {/* Attribute cards */}
      {tableConfig.columns.length === 0 ? (
        <div className="p-8 text-center text-text-muted text-sm border border-dashed border-border rounded-xl">
          Keine Attribute konfiguriert.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tableConfig.columns.map((col) => {
            const colChecks = getChecksForColumn(col.name);
            const hasInvalid = colChecks.some((c) => !c.isValid);

            return (
              <div
                key={col.name}
                className={`p-4 rounded-xl border space-y-3 ${
                  hasInvalid
                    ? "border-yellow-500/40 bg-yellow-500/5"
                    : colChecks.length > 0
                    ? "border-accent/30 bg-accent/5"
                    : "border-border bg-bg-elevated"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-sm font-medium text-text-primary">{col.name}</div>
                    <div className="text-xs text-text-muted">{col.dataType}</div>
                  </div>
                  <button
                    onClick={() => openEditForColumn(col.name)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent/40 transition-colors flex-shrink-0"
                    title="Check hinzufügen"
                  >
                    <Edit2 size={11} />
                    Check hinzufügen
                  </button>
                </div>

                {colChecks.length === 0 ? (
                  <p className="text-xs text-text-muted italic">Keine Checks konfiguriert</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {colChecks.map((c) => (
                      <span
                        key={c.id}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          !c.isValid
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : c.dqxCheck.criticality === "error"
                            ? "bg-red-500/15 text-red-400 border border-red-500/25"
                            : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
                        }`}
                      >
                        {!c.isValid && <AlertTriangle size={10} />}
                        {c.dqxCheck.check.function}
                        <span className="opacity-60">({c.dqxCheck.criticality})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Checks without specific column (dataset-level or unmatched) */}
      {checksWithoutColumn.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Weitere Checks (kein spezifisches Attribut)
          </h3>
          <div className="p-4 bg-bg-elevated border border-border rounded-xl flex flex-wrap gap-2">
            {checksWithoutColumn.map((c) => (
              <span
                key={c.id}
                className="px-2 py-0.5 rounded-full text-xs bg-bg-surface border border-border text-text-secondary"
              >
                {c.dqxCheck.check.function}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Go back to edit */}
      <div className="pt-2 border-t border-border">
        <button
          onClick={() => setWizardStep(4)}
          className="text-xs text-text-muted hover:text-accent transition-colors underline"
        >
          ← Zurück zu Schritt 4 (Checks konfigurieren)
        </button>
      </div>

      {previewOpen && <PreviewModal onClose={() => setPreviewOpen(false)} />}

      <Suspense fallback={null}>
        {editWizardOpen && (
          <CheckWizard
            onClose={() => {
              setEditWizardOpen(false);
              setEditingColumnForWizard(null);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
