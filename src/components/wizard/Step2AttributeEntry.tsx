import { useState } from "react";
import { Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import type { ColumnInfo } from "../../types/dqx";

const DATA_TYPES: ColumnInfo["dataType"][] = [
  "string", "integer", "long", "double", "float", "decimal",
  "boolean", "date", "timestamp", "binary", "array", "struct", "map",
];

export function Step2AttributeEntry() {
  const { tableConfig, addColumn, updateColumn, removeColumn, uploadedFromExcel, setUploadedFromExcel, setColumns } = useCheckStore();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ColumnInfo["dataType"]>("string");
  const [forceEdit, setForceEdit] = useState(false);

  const showInfoBanner = uploadedFromExcel && !forceEdit;

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (tableConfig.columns.some((c) => c.name === trimmed)) return;
    addColumn({ name: trimmed, dataType: newType, nullable: true });
    setNewName("");
    setNewType("string");
  }

  function handleEnableEdit() {
    setForceEdit(true);
  }

  function handleResetToExcel() {
    setForceEdit(false);
  }

  function handleClearAll() {
    setColumns([]);
    setUploadedFromExcel(false);
    setForceEdit(false);
  }

  if (showInfoBanner) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-text-primary">Attribute aus Excel-Datei geladen</p>
              <p className="text-xs text-text-muted mt-1">
                {tableConfig.columns.length} Attribute wurden aus der Excel-Datei übernommen. Dieser Schritt wird übersprungen.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tableConfig.columns.map((col) => (
              <span key={col.name} className="px-2 py-0.5 bg-bg-elevated border border-border rounded text-xs text-text-primary">
                {col.name}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleEnableEdit}
              className="px-4 py-2 text-xs rounded-lg bg-bg-elevated border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Trotzdem bearbeiten
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-xs rounded-lg text-red-400 border border-red-400/30 hover:bg-red-500/10 transition-colors"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {uploadedFromExcel && forceEdit && (
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
          <FileSpreadsheet size={14} />
          Bearbeitung aktiv — Änderungen überschreiben die Excel-Daten.
          <button onClick={handleResetToExcel} className="ml-auto underline hover:no-underline">Abbrechen</button>
        </div>
      )}

      {/* Attribute list */}
      <div className="space-y-2">
        {tableConfig.columns.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm border border-dashed border-border rounded-xl">
            Noch keine Attribute angelegt. Fügen Sie unten ein Attribut hinzu.
          </div>
        ) : (
          <div className="space-y-2">
            {tableConfig.columns.map((col, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-bg-elevated border border-border rounded-lg">
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => updateColumn(i, { ...col, name: e.target.value })}
                  className="input-field flex-1 text-sm"
                  placeholder="Attributname"
                />
                <select
                  value={col.dataType}
                  onChange={(e) => updateColumn(i, { ...col, dataType: e.target.value as ColumnInfo["dataType"] })}
                  className="input-field text-xs w-32"
                >
                  {DATA_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeColumn(i)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add row */}
      <div className="flex items-center gap-3 p-3 bg-bg-surface border border-dashed border-border rounded-lg">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Neues Attribut..."
          className="input-field flex-1 text-sm"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as ColumnInfo["dataType"])}
          className="input-field text-xs w-32"
        >
          {DATA_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={13} />
          Hinzufügen
        </button>
      </div>

      {tableConfig.columns.length > 0 && (
        <p className="text-xs text-text-muted">
          {tableConfig.columns.length} Attribute definiert
        </p>
      )}
    </div>
  );
}
