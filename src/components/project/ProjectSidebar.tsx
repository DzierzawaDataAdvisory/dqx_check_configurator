import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Download, Archive, Check } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import type { CheckSet } from "../../types/dqx";
import { generateDqxYaml } from "../../lib/yamlGenerator";
import JSZip from "jszip";

// ─── ZIP export for all check sets ───────────────────────────────
async function exportAllAsZip(checkSets: CheckSet[], activeId: string, currentChecks: import("../../types/dqx").CheckConfig[]) {
  const zip = new JSZip();
  const folder = zip.folder("dqx-checks");
  if (!folder) return;

  for (const cs of checkSets) {
    const checks = cs.id === activeId ? currentChecks : cs.checks;
    const yaml = generateDqxYaml(checks);
    const tableName = cs.tableConfig.table || cs.name.replace(/\s+/g, "_");
    const fileName = `${tableName}_checks.yml`;
    folder.file(fileName, yaml);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dqx-checks.zip";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Editable label ───────────────────────────────────────────────
function EditableLabel({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="bg-bg border border-accent rounded px-1 py-0 text-xs text-text-primary outline-none w-full"
        onClick={e => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={className}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Doppelklick zum Umbenennen"
    >
      {value}
    </span>
  );
}

// ─── Single check-set row ─────────────────────────────────────────
function CheckSetRow({
  cs,
  isActive,
  onSwitch,
  onDelete,
  onRename,
  onDownload,
  canDelete,
}: {
  cs: CheckSet;
  isActive: boolean;
  onSwitch: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDownload: () => void;
  canDelete: boolean;
}) {
  const fullTable = [cs.tableConfig.catalog, cs.tableConfig.schema, cs.tableConfig.table]
    .filter(Boolean).join(".");

  return (
    <div
      onClick={onSwitch}
      className={`group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-accent/10 text-accent"
          : "hover:bg-bg-elevated text-text-secondary"
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent rounded-r" />
      )}

      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-1">
          <EditableLabel
            value={cs.name}
            onSave={onRename}
            className={`text-xs font-medium truncate block ${isActive ? "text-accent" : "text-text-primary"}`}
          />
          {isActive && <Check size={10} className="text-accent flex-shrink-0" />}
        </div>
        {fullTable && (
          <span className="text-xs font-mono text-text-muted truncate block">{fullTable}</span>
        )}
        <span className="text-xs text-text-muted">
          {cs.checks.length} Check{cs.checks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Actions */}
      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onDownload(); }}
          className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          title="YAML herunterladen"
        >
          <Download size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          disabled={!canDelete}
          className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={canDelete ? "Check-Set löschen" : "Letztes Check-Set kann nicht gelöscht werden"}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Main ProjectSidebar ──────────────────────────────────────────
export function ProjectSidebar() {
  const {
    checkSets,
    activeCheckSetId,
    checks,
    switchCheckSet,
    deleteCheckSet,
    renameCheckSet,
    createCheckSet,
    syncActiveCheckSet,
  } = useCheckStore();

  const [zipping, setZipping] = useState(false);

  function handleDownloadOne(cs: CheckSet) {
    const yamlChecks = cs.id === activeCheckSetId ? checks : cs.checks;
    const yaml = generateDqxYaml(yamlChecks);
    const tableName = cs.tableConfig.table || cs.name.replace(/\s+/g, "_");
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}_checks.yml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportAll() {
    setZipping(true);
    try {
      // Ensure current state is synced before exporting
      syncActiveCheckSet();
      await exportAllAsZip(checkSets, activeCheckSetId, checks);
    } finally {
      setZipping(false);
    }
  }

  function handleDelete(id: string) {
    const cs = checkSets.find(s => s.id === id);
    if (!cs) return;
    if (confirm(`Check-Set "${cs.name}" löschen? Dies kann nicht rückgängig gemacht werden.`)) {
      deleteCheckSet(id);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="section-title">Check-Sets</span>
        <button
          onClick={() => createCheckSet()}
          className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
          title="Neues Check-Set erstellen"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1 space-y-0.5 min-h-0">
        {checkSets.map(cs => (
          <CheckSetRow
            key={cs.id}
            cs={cs.id === activeCheckSetId ? { ...cs, checks } : cs}
            isActive={cs.id === activeCheckSetId}
            onSwitch={() => switchCheckSet(cs.id)}
            onDelete={() => handleDelete(cs.id)}
            onRename={(name) => renameCheckSet(cs.id, name)}
            onDownload={() => handleDownloadOne(cs)}
            canDelete={checkSets.length > 1}
          />
        ))}
      </div>

      {/* Export all */}
      {checkSets.length > 1 && (
        <div className="px-2 py-2 border-t border-border">
          <button
            onClick={handleExportAll}
            disabled={zipping}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-text-muted hover:text-text-secondary py-1.5 rounded-lg hover:bg-bg-elevated transition-colors disabled:opacity-50"
          >
            <Archive size={12} />
            {zipping ? "Wird gepackt…" : "Alle als ZIP"}
          </button>
        </div>
      )}
    </div>
  );
}
