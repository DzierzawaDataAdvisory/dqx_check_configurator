import { useState } from "react";
import { Trash2, GripVertical, ChevronDown, BarChart3, RefreshCw, Wand2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import type { ColumnInfo } from "../../types/dqx";
import { SchemaImport } from "./SchemaImport";
import { InfoTooltip } from "../ui/InfoTooltip";
import { QuickAddMenu } from "../checks/QuickAddMenu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateTableName(value: string): string | null {
  if (!value) return null;
  if (!TABLE_NAME_PATTERN.test(value)) {
    if (/^\d/.test(value)) return "Darf nicht mit einer Zahl beginnen";
    if (/\s/.test(value)) return "Darf keine Leerzeichen enthalten";
    if (/[^a-zA-Z0-9_]/.test(value)) return "Nur Buchstaben, Zahlen und _ erlaubt";
    return "Ungültiger Name";
  }
  return null;
}

const DATA_TYPES: ColumnInfo["dataType"][] = [
  "string", "integer", "long", "double", "float", "decimal",
  "boolean", "date", "timestamp", "binary", "array", "struct", "map",
];

const DATA_TYPE_LABELS: Record<string, string> = {
  string: "Text",
  integer: "Ganzzahl",
  long: "Große Ganzzahl",
  double: "Kommazahl",
  float: "Kommazahl (kurz)",
  decimal: "Dezimalzahl (exakt)",
  boolean: "Ja / Nein",
  date: "Datum",
  timestamp: "Datum & Uhrzeit",
  binary: "Binärdaten",
  array: "Liste",
  struct: "Struktur",
  map: "Zuordnung",
};

// ---- Type Inference ----

function inferDataType(values: string[]): ColumnInfo["dataType"] {
  const nonEmpty = values.filter(v => {
    const t = v.trim();
    return t !== "" && t.toLowerCase() !== "null" && t.toLowerCase() !== "na" && t !== "\\N";
  });
  if (nonEmpty.length === 0) return "string";

  const boolSet = new Set(["true", "false", "1", "0", "yes", "no", "ja", "nein"]);
  if (nonEmpty.every(v => boolSet.has(v.toLowerCase()))) return "boolean";

  if (nonEmpty.every(v => /^-?\d+$/.test(v.trim()))) {
    const max = Math.max(...nonEmpty.map(v => Math.abs(Number(v))));
    return max > 2_147_483_647 ? "long" : "integer";
  }

  if (nonEmpty.every(v => /^-?\d+[.,]\d+([eE][+-]?\d+)?$/.test(v.trim()))) return "double";

  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v.trim()))) return "date";

  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v.trim()))) return "timestamp";

  return "string";
}

function parseSampleRows(text: string, colCount: number): string[][] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  const sep = text.includes(";") ? ";" : ",";
  return lines.map(line => {
    const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ""));
    while (parts.length < colCount) parts.push("");
    return parts.slice(0, colCount);
  });
}

interface TypeDetectorProps {
  columns: ColumnInfo[];
  onApply: (updatedColumns: ColumnInfo[]) => void;
  onClose: () => void;
}

function TypeDetector({ columns, onApply, onClose }: TypeDetectorProps) {
  const [sampleInput, setSampleInput] = useState("");

  const rows = sampleInput.trim() ? parseSampleRows(sampleInput, columns.length) : [];
  const detectedTypes: ColumnInfo["dataType"][] = columns.map((_, colIdx) => {
    const vals = rows.map(row => row[colIdx] ?? "");
    return inferDataType(vals);
  });

  const changes = columns
    .map((col, i) => ({ col, detected: detectedTypes[i], changed: detectedTypes[i] !== col.dataType }))
    .filter(x => x.changed);

  function handleApply() {
    const updated = columns.map((col, i) => ({ ...col, dataType: detectedTypes[i] }));
    onApply(updated);
    onClose();
  }

  return (
    <div className="mt-4 border border-accent/30 rounded-xl bg-bg-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-accent" />
          <span className="text-sm font-medium text-text-primary">Typ aus Beispieldaten ermitteln</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-xs px-2 py-1 rounded hover:bg-bg-hover transition-colors">
          Schließen
        </button>
      </div>

      <p className="text-xs text-text-muted">
        Einige Datenzeilen einfügen (Komma- oder Semikolon-getrennt, gleiche Spaltenreihenfolge wie oben, ohne Kopfzeile):
      </p>

      <textarea
        value={sampleInput}
        onChange={e => setSampleInput(e.target.value)}
        placeholder={"42,max@example.com,2024-01-15,3.14,true\n7,anne@example.com,2023-11-02,1.99,false"}
        className="input-field font-mono text-xs resize-none h-28 w-full"
        spellCheck={false}
      />

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-text-muted">
            {rows.length} Zeile{rows.length !== 1 ? "n" : ""} analysiert —&nbsp;
            {changes.length === 0
              ? <span className="text-success font-medium">Keine Typänderungen erkannt</span>
              : <span className="text-accent font-medium">{changes.length} Typ{changes.length !== 1 ? "en" : ""} würde{changes.length !== 1 ? "n" : ""} aktualisiert</span>
            }
          </div>

          {changes.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th className="text-left text-text-muted font-medium px-3 py-1.5">Spalte</th>
                    <th className="text-left text-text-muted font-medium px-3 py-1.5">Aktuell</th>
                    <th className="w-6" />
                    <th className="text-left text-text-muted font-medium px-3 py-1.5">Erkannt</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map(({ col, detected }) => (
                    <tr key={col.name} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-1.5 font-mono text-text-primary">{col.name}</td>
                      <td className="px-3 py-1.5 text-text-muted">{DATA_TYPE_LABELS[col.dataType] ?? col.dataType}</td>
                      <td className="text-center text-text-muted"><ArrowRight size={12} /></td>
                      <td className="px-3 py-1.5 text-accent font-medium">{DATA_TYPE_LABELS[detected] ?? detected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {changes.length > 0 ? (
              <button onClick={handleApply} className="btn-primary text-xs flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                {changes.length} Typ{changes.length !== 1 ? "en" : ""} übernehmen
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 size={13} />
                Alle Typen bereits korrekt
              </div>
            )}
            <button onClick={onClose} className="btn-ghost text-xs">Abbrechen</button>
          </div>
        </div>
      )}

      {sampleInput.trim() && rows.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-warning">
          <AlertCircle size={13} />
          Keine gültigen Zeilen erkannt
        </div>
      )}
    </div>
  );
}

// ---- /Type Inference ----

interface SortableRowProps {
  id: string;
  column: ColumnInfo;
  index: number;
  onUpdate: (index: number, col: ColumnInfo) => void;
  onRemove: (index: number) => void;
}

function SortableRow({ id, column, index, onUpdate, onRemove }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`border-b border-border/50 ${isDragging ? "bg-bg-hover" : "hover:bg-bg-hover/30"} transition-colors`}>
      <td className="w-8 py-2 pl-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-1 rounded">
          <GripVertical size={14} />
        </button>
      </td>
      <td className="py-2 pr-2">
        <input
          value={column.name}
          onChange={(e) => onUpdate(index, { ...column, name: e.target.value })}
          className="bg-transparent border-0 text-text-primary text-sm w-full font-mono focus:outline-none focus:bg-bg-elevated rounded px-1 py-0.5"
        />
      </td>
      <td className="py-2 pr-2">
        <div className="relative">
          <select
            value={column.dataType}
            onChange={(e) => onUpdate(index, { ...column, dataType: e.target.value as ColumnInfo["dataType"] })}
            className="bg-bg-elevated border border-border rounded text-xs text-text-secondary px-2 py-1 pr-6 focus:outline-none focus:border-accent appearance-none w-full"
          >
            {DATA_TYPES.map(t => (
              <option key={t} value={t}>{DATA_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </td>
      <td className="py-2 pr-2 text-center">
        <input
          type="checkbox"
          checked={column.nullable}
          onChange={(e) => onUpdate(index, { ...column, nullable: e.target.checked })}
          className="rounded accent-accent"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          value={column.description || ""}
          onChange={(e) => onUpdate(index, { ...column, description: e.target.value || undefined })}
          placeholder="Beschreibung…"
          className="bg-transparent border-0 text-text-secondary text-xs w-full focus:outline-none focus:bg-bg-elevated rounded px-1 py-0.5 placeholder-text-muted"
        />
      </td>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-0.5">
          <QuickAddMenu column={column} />
          <button
            onClick={() => onRemove(index)}
            className="text-text-muted hover:text-error transition-colors p-1 rounded"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function TableConfigView() {
  const {
    tableConfig,
    setTableMeta,
    updateColumn,
    removeColumn,
    reorderColumns,
    setColumns,
  } = useCheckStore();
  const [showImport, setShowImport] = useState(tableConfig.columns.length === 0);
  const [showTypeDetector, setShowTypeDetector] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tableConfig.columns.findIndex((_, i) => `col-${i}` === active.id);
    const newIndex = tableConfig.columns.findIndex((_, i) => `col-${i}` === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderColumns(oldIndex, newIndex);
    }
  }

  // Statistics
  const typeCounts = tableConfig.columns.reduce<Record<string, number>>((acc, col) => {
    acc[col.dataType] = (acc[col.dataType] || 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Table metadata */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Tabelle & Schema</h2>
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Tabellen-Metadaten</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "catalog", label: "Catalog", placeholder: "z.B. production", help: "Oberste Ebene in Databricks Unity Catalog – z.B. eine Umgebung wie 'production' oder 'development'." },
              { key: "schema", label: "Schema", placeholder: "z.B. customer_data", help: "Fachlicher Bereich innerhalb des Catalogs – z.B. 'vertrieb' oder 'finanzen'." },
              { key: "table", label: "Tabelle", placeholder: "z.B. customers", help: "Der Name der Tabelle, deren Datenqualität geprüft werden soll." },
            ].map(({ key, label, placeholder, help }) => {
              const val = tableConfig[key as "catalog" | "schema" | "table"];
              const nameError = validateTableName(val);
              return (
                <div key={key}>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs text-text-muted">{label}</label>
                    <InfoTooltip content={help} glossaryTerm={key === "catalog" ? "Unity Catalog" : undefined} />
                  </div>
                  <input
                    value={val}
                    onChange={(e) => {
                      const vals = {
                        catalog: tableConfig.catalog,
                        schema: tableConfig.schema,
                        table: tableConfig.table,
                        [key]: e.target.value,
                      };
                      setTableMeta(vals.catalog, vals.schema, vals.table);
                    }}
                    placeholder={placeholder}
                    className={`input-field text-sm font-mono ${nameError ? "border-error" : ""}`}
                  />
                  {nameError && (
                    <p className="text-xs text-error mt-1">{nameError}</p>
                  )}
                </div>
              );
            })}
          </div>
          {/* Fully qualified name preview */}
          {(tableConfig.catalog || tableConfig.schema || tableConfig.table) && (
            <p className="text-xs text-text-muted mt-2 font-mono">
              Vollständiger Name: <span className="text-accent">{[tableConfig.catalog, tableConfig.schema, tableConfig.table].filter(Boolean).join(".")}</span>
            </p>
          )}
        </div>
      </div>

      {/* Import section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-accent transition-colors"
          >
            <RefreshCw size={14} />
            {showImport ? "Import ausblenden" : "Schema importieren / neu importieren"}
          </button>
        </div>
        {showImport && <SchemaImport />}
      </div>

      {/* Schema editor table */}
      {tableConfig.columns.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-text-primary">
                Spalten ({tableConfig.columns.length})
              </h3>
              {/* Stats */}
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-text-muted" />
                <div className="flex gap-1.5">
                  {topTypes.map(([type, count]) => (
                    <span key={type} className="badge-neutral">{count}× {type}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTypeDetector(v => !v)}
                className={`btn-ghost text-xs flex items-center gap-1.5 ${showTypeDetector ? "text-accent" : ""}`}
              >
                <Wand2 size={12} />
                Typ aus Beispieldaten ermitteln
              </button>
              <button
                onClick={() => setColumns(tableConfig.columns.map(c => ({ ...c, nullable: true })))}
                className="btn-ghost text-xs"
              >
                Alle als optional markieren
              </button>
              <button
                onClick={() => {
                  if (confirm("Alle Spalten löschen?")) setColumns([]);
                }}
                className="btn-ghost text-xs text-error hover:text-error"
              >
                Alle löschen
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8" />
                  <th className="text-left text-xs text-text-muted font-medium pb-2 pr-2">Spaltenname</th>
                  <th className="text-left text-xs text-text-muted font-medium pb-2 pr-2 w-32">Datentyp</th>
                  <th className="text-center text-xs text-text-muted font-medium pb-2 pr-2 w-28">
                    <span className="inline-flex items-center gap-1">
                      Kann NULL sein
                      <InfoTooltip content="Wenn aktiviert, darf diese Spalte leere Werte (NULL) enthalten. Wenn deaktiviert, muss immer ein Wert vorhanden sein." glossaryTerm="NULL" />
                    </span>
                  </th>
                  <th className="text-left text-xs text-text-muted font-medium pb-2 pr-2">Beschreibung</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={tableConfig.columns.map((_, i) => `col-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tableConfig.columns.map((col, index) => (
                      <SortableRow
                        key={`col-${index}`}
                        id={`col-${index}`}
                        column={col}
                        index={index}
                        onUpdate={updateColumn}
                        onRemove={removeColumn}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>

          {showTypeDetector && (
            <TypeDetector
              columns={tableConfig.columns}
              onApply={(updated) => setColumns(updated)}
              onClose={() => setShowTypeDetector(false)}
            />
          )}
        </div>
      )}

      {tableConfig.columns.length === 0 && !showImport && (
        <div className="py-10">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-bg-elevated mx-auto mb-3 flex items-center justify-center">
              <BarChart3 size={24} className="text-text-muted" />
            </div>
            <h3 className="text-base font-medium text-text-primary mb-1">Noch keine Spalten definiert</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Importiere dein Spaltenmodell, damit der Designer passende Checks vorschlagen kann.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            {[
              { label: "CSV / DDL importieren", desc: "Spalten aus einer Datei oder DDL-Statement laden" },
              { label: "DESCRIBE TABLE einfügen", desc: "Output von Databricks DESCRIBE TABLE direkt einfügen" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setShowImport(true)}
                className="card p-4 text-left hover:border-accent/50 transition-all space-y-1"
              >
                <span className="text-sm font-medium text-text-primary">{item.label}</span>
                <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
