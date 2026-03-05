import { useState } from "react";
import {
  Download, Copy, Check, AlertCircle, AlertTriangle,
  Code, Terminal, Zap, Settings, Package, Users, Wrench
} from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { generateDqxYaml, generateDqxJson } from "../../lib/yamlGenerator";
import { validateAllChecks } from "../../lib/checkValidator";
import { RunConfigPanel } from "./RunConfigPanel";
import { toast } from "../../hooks/useToastStore";


// ─── Code template generators ─────────────────────────────────────
function getBatchCode(catalog: string, schema: string, table: string): string {
  const fullTable = [catalog, schema, table].filter(Boolean).join(".");
  const checksPath = table ? `checks/${table}_checks.yml` : "checks/dqx_checks.yml";
  return `from databricks.labs.dqx.engine import DQEngine
from databricks.sdk import WorkspaceClient

dq_engine = DQEngine(WorkspaceClient())

# Checks aus Datei laden
checks = dq_engine.load_checks_from_file(
    "/Workspace/path/to/${checksPath}"
)

# Eingabe-DataFrame lesen
input_df = spark.read.table("${fullTable || "catalog.schema.table"}")

# Checks anwenden → Ergebnis-DataFrame mit _errors und _warnings
result_df = dq_engine.apply_checks_by_metadata(input_df, checks)

# Optional: Valide und invalide Datensätze trennen
good_df, bad_df = dq_engine.apply_checks_by_metadata_and_split(
    input_df, checks
)

# Ergebnisse speichern
good_df.write.mode("append").saveAsTable("${fullTable || "catalog.schema.table"}_validated")
bad_df.write.mode("append").saveAsTable("${fullTable || "catalog.schema.table"}_quarantine")`;
}

function getStreamingCode(catalog: string, schema: string, table: string): string {
  const fullTable = [catalog, schema, table].filter(Boolean).join(".");
  const checksPath = table ? `checks/${table}_checks.yml` : "checks/dqx_checks.yml";
  return `from databricks.labs.dqx.engine import DQEngine
from databricks.sdk import WorkspaceClient

dq_engine = DQEngine(WorkspaceClient())
checks = dq_engine.load_checks_from_file(
    "/Workspace/path/to/${checksPath}"
)

# Streaming DataFrame
stream_df = spark.readStream.table("${fullTable || "catalog.schema.table"}")

# Checks auf Stream anwenden
result_df = dq_engine.apply_checks_by_metadata(stream_df, checks)

# Stream schreiben
(result_df.writeStream
    .trigger(availableNow=True)
    .option("checkpointLocation", "/path/to/checkpoint/${table || "table"}")
    .outputMode("append")
    .table("${fullTable || "catalog.schema.table"}_validated")
)`;
}

function getWorkflowConfig(catalog: string, schema: string, table: string): string {
  const fullTable = [catalog, schema, table].filter(Boolean).join(".");
  const tableName = table || "table";
  const checksPath = `checks/${tableName}_checks.yml`;
  return `run_configs:
  - name: "${tableName}_quality_checks"
    input_config:
      location: "${fullTable || "catalog.schema.table"}"
      format: delta
    output_config:
      location: "${fullTable || "catalog.schema.table"}_validated"
      format: delta
      mode: append
    quarantine_config:
      location: "${fullTable || "catalog.schema.table"}_quarantine"
      format: delta
      mode: append
    checks_location: "${checksPath}"`;
}

function getInstallCode(): string {
  return `# DQX installieren (einmalig pro Workspace)
databricks labs install dqx

# Optional: Installations-Ordner festlegen
databricks labs install dqx \\
  --install-folder /Workspace/Users/{user}/.dqx

# DQX Python-Paket im Notebook installieren
%pip install databricks-labs-dqx

# Oder via requirements.txt
databricks-labs-dqx>=0.6.0`;
}

// ─── Code block with copy button ──────────────────────────────────
function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <div className="bg-bg rounded-lg p-4 overflow-auto max-h-72">
        <pre className={`text-xs font-mono text-text-secondary whitespace-pre leading-relaxed language-${language}`}>
          {code}
        </pre>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary bg-bg-elevated hover:bg-bg-surface px-2 py-1 rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
        {copied ? "Kopiert!" : "Kopieren"}
      </button>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────
type ExportTab = "download" | "batch" | "streaming" | "workflow" | "install";

interface TabDef {
  id: ExportTab;
  label: string;
  icon: React.ReactNode;
  techOnly?: boolean;
}

const TABS: TabDef[] = [
  { id: "download", label: "Download", icon: <Download size={14} /> },
  { id: "batch", label: "Batch-Notebook", icon: <Code size={14} />, techOnly: true },
  { id: "streaming", label: "Streaming", icon: <Zap size={14} />, techOnly: true },
  { id: "workflow", label: "DQX-Workflow", icon: <Settings size={14} />, techOnly: true },
  { id: "install", label: "Installation", icon: <Package size={14} />, techOnly: true },
];

type ExportRole = "business" | "engineer";

// ─── Main component ───────────────────────────────────────────────
export function ExportPanel() {
  const { checks, tableConfig } = useCheckStore();
  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportTab>("download");
  const [role, setRole] = useState<ExportRole>("business");

  const { totalValid, totalInvalid, results } = validateAllChecks(checks);

  const content = format === "yaml"
    ? generateDqxYaml(checks)
    : generateDqxJson(checks);

  const { catalog, schema, table } = tableConfig;
  const fileName = table
    ? `${[catalog, schema, table].filter(Boolean).join("_")}_checks.${format === "yaml" ? "yml" : "json"}`
    : `dqx_checks.${format === "yaml" ? "yml" : "json"}`;

  function handleDownload() {
    const blob = new Blob([content], { type: format === "yaml" ? "text/yaml" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export heruntergeladen", "success");
  }

  async function handleCopyYaml() {
    await navigator.clipboard.writeText(content);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
    toast("In Zwischenablage kopiert", "info");
  }

  const invalidChecks = checks.filter(c => !c.isValid);
  const visibleTabs = role === "business" ? TABS.filter(t => !t.techOnly) : TABS;

  // Switch to download tab when switching to business role
  function handleRoleSwitch(newRole: ExportRole) {
    setRole(newRole);
    if (newRole === "business" && activeTab !== "download") {
      setActiveTab("download");
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Export & Integration</h2>
          <p className="text-sm text-text-secondary mt-1">
            {role === "business"
              ? "Lade die Check-Datei herunter und sende sie an dein Data-Engineering-Team."
              : "Exportiere Checks als YAML/JSON oder erhalte Copy-Paste-fähigen Code für deine Databricks-Pipeline."
            }
          </p>
        </div>

        {/* Role toggle */}
        <div className="flex gap-1 bg-bg rounded-lg p-0.5 border border-border flex-shrink-0">
          <button
            onClick={() => handleRoleSwitch("business")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              role === "business"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Users size={12} />
            Fachbereich
          </button>
          <button
            onClick={() => handleRoleSwitch("engineer")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              role === "engineer"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Wrench size={12} />
            Data Engineer
          </button>
        </div>
      </div>

      {/* Validation summary */}
      <div className="card">
        <h3 className="text-sm font-medium text-text-primary mb-3">Validierungsstatus</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">{checks.length}</div>
            <div className="text-xs text-text-muted mt-0.5">Checks gesamt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{totalValid}</div>
            <div className="text-xs text-text-muted mt-0.5">Gültig</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${totalInvalid > 0 ? "text-error" : "text-text-muted"}`}>
              {totalInvalid}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Fehlerhaft</div>
          </div>
        </div>

        {invalidChecks.length > 0 && (
          <div className="mt-4 space-y-2">
            {invalidChecks.map(check => {
              const result = results.get(check.id);
              return (
                <div key={check.id} className="flex items-start gap-2 bg-error/5 border border-error/20 rounded-lg p-3">
                  <AlertCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm text-text-primary font-medium">
                      {check.description || check.dqxCheck.check.function}
                    </div>
                    <div className="text-xs text-error mt-0.5">{result?.errors[0]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {checks.length === 0 && (
          <div className="mt-3 flex items-center gap-2 text-text-muted text-sm">
            <AlertTriangle size={14} />
            Noch keine Checks konfiguriert
          </div>
        )}
      </div>

      {/* Business role: step-by-step guide */}
      {role === "business" && (
        <div className="card bg-accent/5 border-accent/20">
          <h3 className="text-sm font-medium text-text-primary mb-3">So geht's weiter</h3>
          <ol className="space-y-2 text-sm text-text-secondary">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">1</span>
              <span>Wähle ein Format (YAML oder JSON) und lade die Datei herunter.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">2</span>
              <span>Sende die Datei an dein Data-Engineering-Team oder lade sie in den Databricks Workspace hoch.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">3</span>
              <span>Das Team integriert die Checks in die bestehende Datenpipeline.</span>
            </li>
          </ol>
        </div>
      )}

      {/* Tab navigation */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-accent text-accent bg-accent/5"
                  : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* ── Download tab ── */}
          {activeTab === "download" && (
            <>
              <div className="flex gap-2">
                {(["yaml", "json"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      format === f
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-bg border-border text-text-secondary hover:border-accent/50"
                    }`}
                  >
                    {f === "yaml" ? "YAML (.yml)" : "JSON (.json)"}
                  </button>
                ))}
              </div>

              <div className="bg-bg rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-mono text-text-secondary">{fileName}</span>
                <span className="text-xs text-text-muted">{content.length} Zeichen</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={checks.length === 0}
                  className="btn-primary flex items-center gap-2 flex-1"
                >
                  <Download size={16} />
                  Datei herunterladen
                </button>
                <button
                  onClick={handleCopyYaml}
                  disabled={checks.length === 0}
                  className="btn-secondary flex items-center gap-2"
                >
                  {copiedYaml ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  {copiedYaml ? "Kopiert!" : "Kopieren"}
                </button>
              </div>

              {/* Summary for business, preview for engineers */}
              {checks.length > 0 && role === "business" && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Zusammenfassung ({checks.length} Checks)</p>
                  <div className="bg-bg rounded-lg p-3 space-y-1.5 max-h-48 overflow-auto">
                    {checks.map(check => (
                      <div key={check.id} className="flex items-center gap-2 text-xs">
                        <span className={check.dqxCheck.criticality === "error" ? "text-error" : "text-warning"}>
                          {check.dqxCheck.criticality === "error" ? "E" : "W"}
                        </span>
                        <span className="text-text-secondary">{check.description || check.dqxCheck.check.function}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checks.length > 0 && role === "engineer" && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Vorschau</p>
                  <CodeBlock code={content} language="yaml" />
                </div>
              )}
            </>
          )}

          {/* ── Batch-Notebook tab ── */}
          {activeTab === "batch" && (
            <>
              <div className="flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-lg p-3">
                <Code size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <p>Python-Code für ein Databricks Batch-Notebook. Lädt den Check-YAML aus dem Workspace,
                  liest die Tabelle, wendet die Checks an und trennt valide von invaliden Datensätzen.</p>
                </div>
              </div>
              <CodeBlock code={getBatchCode(catalog, schema, table)} language="python" />
            </>
          )}

          {/* ── Streaming tab ── */}
          {activeTab === "streaming" && (
            <>
              <div className="flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-lg p-3">
                <Zap size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <p>Python-Code für eine Databricks Streaming-Pipeline (Structured Streaming).
                  Die Checks werden auf jeden Micro-Batch angewendet.</p>
                </div>
              </div>
              <CodeBlock code={getStreamingCode(catalog, schema, table)} language="python" />
            </>
          )}

          {/* ── DQX Workflow tab ── */}
          {activeTab === "workflow" && (
            <>
              <div className="flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-lg p-3">
                <Settings size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <p>DQX Workflow-Konfigurationsdatei (<code className="font-mono">config.yml</code>).
                  Definiert Input, Output, Quarantäne-Tabelle und den Pfad zur Checks-YAML.</p>
                </div>
              </div>
              <CodeBlock code={getWorkflowConfig(catalog, schema, table)} language="yaml" />
              <div className="border-t border-border pt-4">
                <RunConfigPanel />
              </div>
            </>
          )}

          {/* ── Installation tab ── */}
          {activeTab === "install" && (
            <>
              <div className="flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-lg p-3">
                <Terminal size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <p>Befehle zur Installation von DQX in deinem Databricks-Workspace.
                  Führe diese Befehle einmalig in deiner Databricks CLI aus.</p>
                </div>
              </div>
              <CodeBlock code={getInstallCode()} language="bash" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Weitere Ressourcen</p>
                <div className="space-y-1.5">
                  {[
                    ["DQX GitHub Repository", "https://github.com/databrickslabs/dqx"],
                    ["DQX Dokumentation", "https://databrickslabs.github.io/dqx/"],
                    ["Databricks Labs CLI", "https://docs.databricks.com/dev-tools/cli/databricks-cli.html"],
                  ].map(([label, url]) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                    >
                      {label} →
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
