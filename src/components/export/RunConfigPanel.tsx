import { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { InfoTooltip } from "../ui/InfoTooltip";

type DeltaFormat = "delta" | "parquet" | "csv" | "json";
type WriteMode = "append" | "overwrite";

interface RunConfig {
  inputTable: string;
  outputTable: string;
  quarantineTable: string;
  format: DeltaFormat;
  mode: WriteMode;
  isStreaming: boolean;
  checksPath: string;
  runConfigName: string;
}

function generateConfigYml(cfg: RunConfig): string {
  const streamBlock = cfg.isStreaming
    ? `    is_streaming: true\n`
    : "";

  return `run_configs:
  - name: "${cfg.runConfigName}"
    input_config:
      location: "${cfg.inputTable}"
      format: ${cfg.format}${cfg.isStreaming ? "\n      is_streaming: true" : ""}
    output_config:
      location: "${cfg.outputTable}"
      format: ${cfg.format}
      mode: ${cfg.mode}
    quarantine_config:
      location: "${cfg.quarantineTable}"
      format: ${cfg.format}
      mode: ${cfg.mode}
    checks_location: "${cfg.checksPath}"
${streamBlock}`;
}

const FORMAT_OPTIONS: { value: DeltaFormat; label: string }[] = [
  { value: "delta", label: "Delta Lake" },
  { value: "parquet", label: "Parquet" },
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
];

const MODE_OPTIONS: { value: WriteMode; label: string; description: string }[] = [
  { value: "append", label: "Append", description: "Zeilen anhängen" },
  { value: "overwrite", label: "Overwrite", description: "Tabelle überschreiben" },
];

export function RunConfigPanel() {
  const { tableConfig } = useCheckStore();

  const fullTable = [tableConfig.catalog, tableConfig.schema, tableConfig.table]
    .filter(Boolean).join(".");
  const tableName = tableConfig.table || "table";

  const [cfg, setCfg] = useState<RunConfig>({
    inputTable: fullTable || "catalog.schema.table",
    outputTable: fullTable ? `${fullTable}_validated` : "catalog.schema.table_validated",
    quarantineTable: fullTable ? `${fullTable}_quarantine` : "catalog.schema.table_quarantine",
    format: "delta",
    mode: "append",
    isStreaming: false,
    checksPath: `/Workspace/path/to/checks/${tableName}_checks.yml`,
    runConfigName: `${tableName}_quality_checks`,
  });

  const [copied, setCopied] = useState(false);

  const configYml = generateConfigYml(cfg);

  function update<K extends keyof RunConfig>(key: K, value: RunConfig[K]) {
    setCfg(prev => ({ ...prev, [key]: value }));
  }

  function resetFromTableConfig() {
    const ft = [tableConfig.catalog, tableConfig.schema, tableConfig.table].filter(Boolean).join(".");
    const tn = tableConfig.table || "table";
    setCfg(prev => ({
      ...prev,
      inputTable: ft || prev.inputTable,
      outputTable: ft ? `${ft}_validated` : prev.outputTable,
      quarantineTable: ft ? `${ft}_quarantine` : prev.quarantineTable,
      checksPath: `/Workspace/path/to/checks/${tn}_checks.yml`,
      runConfigName: `${tn}_quality_checks`,
    }));
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(configYml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">Workflow-Konfiguration anpassen</p>
        <button
          onClick={resetFromTableConfig}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
          title="Werte aus Tabellenconfig übernehmen"
        >
          <RefreshCw size={12} />
          Aus Tabelle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Run Config Name */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Run-Config-Name
          </label>
          <input
            type="text"
            value={cfg.runConfigName}
            onChange={e => update("runConfigName", e.target.value)}
            className="input-field text-sm w-full"
            placeholder="z.B. customers_quality_checks"
          />
        </div>

        {/* Input Table */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Input-Tabelle
          </label>
          <input
            type="text"
            value={cfg.inputTable}
            onChange={e => update("inputTable", e.target.value)}
            className="input-field text-sm w-full font-mono"
            placeholder="catalog.schema.table"
          />
        </div>

        {/* Output + Quarantine in a row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Output-Tabelle
            </label>
            <input
              type="text"
              value={cfg.outputTable}
              onChange={e => update("outputTable", e.target.value)}
              className="input-field text-xs w-full font-mono"
              placeholder="…_validated"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-text-secondary mb-1">
              Quarantäne-Tabelle
              <InfoTooltip content="Fehlerhafte Datensätze werden hierhin verschoben, damit die Haupttabelle nur valide Daten enthält." glossaryTerm="Quarantine-Tabelle" />
            </label>
            <input
              type="text"
              value={cfg.quarantineTable}
              onChange={e => update("quarantineTable", e.target.value)}
              className="input-field text-xs w-full font-mono"
              placeholder="…_quarantine"
            />
          </div>
        </div>

        {/* Checks Path */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-text-secondary mb-1">
            Checks-Dateipfad (im Workspace)
            <InfoTooltip content="Der Pfad innerhalb deines Databricks Workspace, unter dem die Checks-Datei gespeichert wird." glossaryTerm="Workspace" />
          </label>
          <input
            type="text"
            value={cfg.checksPath}
            onChange={e => update("checksPath", e.target.value)}
            className="input-field text-sm w-full font-mono"
            placeholder="/Workspace/path/to/checks.yml"
          />
        </div>

        {/* Format + Mode */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Format</label>
            <select
              value={cfg.format}
              onChange={e => update("format", e.target.value as DeltaFormat)}
              className="input-field text-sm w-full"
            >
              {FORMAT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Schreibmodus</label>
            <select
              value={cfg.mode}
              onChange={e => update("mode", e.target.value as WriteMode)}
              className="input-field text-sm w-full"
            >
              {MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} – {o.description}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Streaming toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => update("isStreaming", !cfg.isStreaming)}
            className={`relative w-9 h-5 rounded-full transition-colors ${cfg.isStreaming ? "bg-accent" : "bg-bg-elevated"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.isStreaming ? "translate-x-4" : ""}`} />
          </div>
          <div>
            <span className="text-sm text-text-primary">Streaming-Pipeline</span>
            <span className="block text-xs text-text-muted">Aktiviere für Structured-Streaming-Jobs</span>
          </div>
        </label>
      </div>

      {/* Generated config preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-text-secondary">Generierte config.yml</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copied ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
        <div className="bg-bg rounded-lg p-4 overflow-auto max-h-48">
          <pre className="text-xs font-mono text-text-secondary whitespace-pre leading-relaxed">
            {configYml}
          </pre>
        </div>
      </div>
    </div>
  );
}
