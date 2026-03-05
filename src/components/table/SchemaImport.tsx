import { useState, useRef } from "react";
import { Upload, FileJson, FileText, ClipboardPaste, Plus, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { DEMO_SCHEMAS } from "../../lib/sampleColumns";
import { parseCSV, parseJSON, parseDDL, parseFreeText, autoDetectAndParse } from "../../lib/schemaParser";
import type { ParseResult } from "../../lib/schemaParser";
import type { ColumnInfo } from "../../types/dqx";

type ImportTab = "csv" | "json" | "ddl" | "paste" | "manual";

export function SchemaImport() {
  const { setColumns, tableConfig, setTableMeta } = useCheckStore();
  const [activeTab, setActiveTab] = useState<ImportTab>("paste");
  const [textInput, setTextInput] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string>("");
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: ImportTab; label: string; icon: React.ReactNode }[] = [
    { id: "paste", label: "Einfügen", icon: <ClipboardPaste size={14} /> },
    { id: "csv", label: "CSV", icon: <FileText size={14} /> },
    { id: "json", label: "JSON", icon: <FileJson size={14} /> },
    { id: "ddl", label: "DDL / SQL", icon: <FileText size={14} /> },
    { id: "manual", label: "Manuell", icon: <Plus size={14} /> },
  ];

  function handleTextChange(value: string) {
    setTextInput(value);
    if (!value.trim()) {
      setParseResult(null);
      return;
    }

    let result: ParseResult;
    let format = "";

    if (activeTab === "paste") {
      const detected = autoDetectAndParse(value);
      result = detected.result;
      format = detected.format;
    } else if (activeTab === "csv") {
      result = parseCSV(value);
      format = "CSV";
    } else if (activeTab === "json") {
      result = parseJSON(value);
      format = "JSON";
    } else if (activeTab === "ddl") {
      result = parseDDL(value);
      format = "DDL";
    } else {
      result = parseFreeText(value);
      format = "Freitext";
    }

    setParseResult(result);
    setDetectedFormat(format);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setTextInput(content);
      handleTextChange(content);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function applyImport() {
    if (!parseResult || parseResult.columns.length === 0) return;

    if (tableConfig.columns.length > 0) {
      if (!confirm(`Aktuelle ${tableConfig.columns.length} Spalten überschreiben?`)) return;
    }
    setColumns(parseResult.columns);
    setTextInput("");
    setParseResult(null);
  }

  function loadDemoSchema(id: string) {
    const demo = DEMO_SCHEMAS.find(d => d.id === id);
    if (!demo) return;

    if (tableConfig.columns.length > 0) {
      if (!confirm(`Aktuelle Spalten überschreiben und Demo-Schema "${demo.label}" laden?`)) return;
    }

    setColumns(demo.table.columns);
    setTableMeta(demo.table.catalog, demo.table.schema, demo.table.table);
    setShowDemoDropdown(false);
  }

  return (
    <div className="space-y-4">
      {/* Demo data button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Schema importieren</h3>
        <div className="relative">
          <button
            onClick={() => setShowDemoDropdown(!showDemoDropdown)}
            className="flex items-center gap-2 btn-secondary text-sm"
          >
            Demo laden
            <ChevronDown size={14} />
          </button>
          {showDemoDropdown && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-bg-elevated border border-border rounded-xl shadow-xl z-50">
              {DEMO_SCHEMAS.map(demo => (
                <button
                  key={demo.id}
                  onClick={() => loadDemoSchema(demo.id)}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setTextInput(""); setParseResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-bg-elevated text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "manual" ? (
        <ManualEntry />
      ) : (
        <div className="space-y-3">
          {/* File upload for CSV/JSON */}
          {(activeTab === "csv" || activeTab === "json") && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={activeTab === "csv" ? ".csv,.txt" : ".json"}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 hover:border-accent transition-colors group"
              >
                <Upload size={20} className="text-text-muted group-hover:text-accent" />
                <span className="text-sm text-text-secondary group-hover:text-text-primary">
                  {activeTab === "csv" ? "CSV-Datei hochladen" : "JSON-Datei hochladen"}
                </span>
                <span className="text-xs text-text-muted">Drag & Drop oder klicken</span>
              </button>
              <div className="text-center text-xs text-text-muted my-2">— oder direkt einfügen —</div>
            </div>
          )}

          {/* Placeholder text */}
          <div>
            <textarea
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={getPlaceholder(activeTab)}
              className="input-field font-mono text-xs resize-none h-48"
              spellCheck={false}
            />
          </div>

          {/* Parse result feedback */}
          {parseResult && (
            <div className={`rounded-lg p-3 text-sm ${
              parseResult.errors.length > 0 ? "bg-error/10 border border-error/20" : "bg-success/10 border border-success/20"
            }`}>
              {parseResult.errors.length > 0 ? (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-error mt-0.5 flex-shrink-0" />
                  <div>
                    {parseResult.errors.map((e, i) => (
                      <div key={i} className="text-error">{e}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="text-success font-medium">
                    {parseResult.columns.length} Spalte{parseResult.columns.length !== 1 ? "n" : ""} erkannt
                    {detectedFormat && ` (Format: ${detectedFormat})`}
                  </span>
                </div>
              )}
              {parseResult.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {parseResult.warnings.map((w, i) => (
                    <div key={i} className="text-warning text-xs flex items-center gap-1">
                      <AlertCircle size={12} />
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Apply button */}
          {parseResult && parseResult.columns.length > 0 && (
            <button onClick={applyImport} className="btn-primary w-full">
              {parseResult.columns.length} Spalte{parseResult.columns.length !== 1 ? "n" : ""} übernehmen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ManualEntry() {
  const { addColumn } = useCheckStore();
  const [quickInput, setQuickInput] = useState("");
  const DATA_TYPES: ColumnInfo["dataType"][] = [
    "string", "integer", "long", "double", "float", "decimal",
    "boolean", "date", "timestamp", "binary", "array", "struct", "map",
  ];

  const [newCol, setNewCol] = useState<ColumnInfo>({
    name: "",
    dataType: "string",
    nullable: true,
    description: "",
  });

  function handleQuickInput() {
    const trimmed = quickInput.trim();
    if (!trimmed) return;

    const colonMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)/);
    const spaceMatch = trimmed.match(/^(\w+)\s+(\w+)/);

    if (colonMatch) {
      addColumn({ name: colonMatch[1], dataType: getDataType(colonMatch[2]), nullable: true });
    } else if (spaceMatch) {
      addColumn({ name: spaceMatch[1], dataType: getDataType(spaceMatch[2]), nullable: true });
    } else {
      addColumn({ name: trimmed, dataType: "string", nullable: true });
    }
    setQuickInput("");
  }

  function getDataType(raw: string): ColumnInfo["dataType"] {
    const map: Record<string, ColumnInfo["dataType"]> = {
      str: "string", string: "string", varchar: "string",
      int: "integer", integer: "integer",
      long: "long", bigint: "long",
      double: "double", float: "float", decimal: "decimal",
      bool: "boolean", boolean: "boolean",
      date: "date", timestamp: "timestamp", ts: "timestamp",
    };
    return map[raw.toLowerCase()] || "string";
  }

  function handleAddColumn() {
    if (!newCol.name.trim()) return;
    addColumn({ ...newCol, description: newCol.description || undefined });
    setNewCol({ name: "", dataType: "string", nullable: true, description: "" });
  }

  return (
    <div className="space-y-4">
      {/* Quick input */}
      <div>
        <label className="block text-xs text-text-secondary mb-1">Schnell-Eingabe (name:typ)</label>
        <div className="flex gap-2">
          <input
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickInput()}
            placeholder="z.B. customer_id:int oder email:string"
            className="input-field text-sm flex-1"
          />
          <button onClick={handleQuickInput} className="btn-primary px-3">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Detailed form */}
      <div className="border border-border rounded-lg p-3 space-y-3">
        <div className="text-xs text-text-secondary font-medium">Detaillierte Eingabe</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">Spaltenname *</label>
            <input
              value={newCol.name}
              onChange={(e) => setNewCol({ ...newCol, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
              placeholder="z.B. customer_id"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Datentyp</label>
            <select
              value={newCol.dataType}
              onChange={(e) => setNewCol({ ...newCol, dataType: e.target.value as ColumnInfo["dataType"] })}
              className="input-field text-sm"
            >
              {DATA_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Beschreibung (optional)</label>
          <input
            value={newCol.description || ""}
            onChange={(e) => setNewCol({ ...newCol, description: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
            placeholder="Fachliche Beschreibung"
            className="input-field text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={newCol.nullable}
              onChange={(e) => setNewCol({ ...newCol, nullable: e.target.checked })}
              className="rounded"
            />
            Nullable (Wert kann fehlen)
          </label>
          <button
            onClick={handleAddColumn}
            disabled={!newCol.name.trim()}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <Plus size={14} />
            Spalte hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

function getPlaceholder(tab: ImportTab): string {
  switch (tab) {
    case "paste":
      return `Spaltennamen einfügen – ein Name pro Zeile, komma-getrennt, oder Spark printSchema()-Output:

root
 |-- customer_id: integer (nullable = false)
 |-- email: string (nullable = true)
 |-- created_at: timestamp (nullable = false)`;
    case "csv":
      return `column_name;data_type;nullable;description
customer_id;integer;false;Eindeutige Kundennummer
email;string;true;E-Mail-Adresse
revenue;double;true;Umsatz in EUR`;
    case "json":
      return `[
  {"name": "customer_id", "data_type": "integer", "nullable": false},
  {"name": "email", "data_type": "string", "nullable": true},
  {"name": "status", "data_type": "string", "nullable": false}
]`;
    case "ddl":
      return `CREATE TABLE production.customer_data.customers (
  customer_id INT NOT NULL,
  email STRING,
  status STRING NOT NULL COMMENT 'aktiv/inaktiv/gesperrt',
  created_at TIMESTAMP NOT NULL
)`;
    default:
      return "";
  }
}
