import { useState, useRef, useCallback } from "react";
import {
  X, Upload, ClipboardPaste, AlertCircle, AlertTriangle,
  CheckCircle, FileJson, FileText, ChevronRight, Trash2,
} from "lucide-react";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";
import { useCheckStore } from "../../hooks/useCheckStore";
import { parseDqxContent } from "../../lib/yamlParser";
import type { CheckConfig } from "../../types/dqx";
import type { ParseResult } from "../../lib/yamlParser";

type ImportMode = "append" | "replace";
type InputMode = "file" | "paste";

interface CheckImportProps {
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────
function getFileIcon(name: string) {
  if (name.endsWith(".json")) return <FileJson size={16} className="text-yellow-400" />;
  return <FileText size={16} className="text-blue-400" />;
}

function getFunctionShortLabel(fn: string): string {
  return fn.replace(/_/g, " ");
}

// ─── Preview list ─────────────────────────────────────────────────
function PreviewList({ checks }: { checks: CheckConfig[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? checks : checks.slice(0, 5);
  const rest = checks.length - 5;

  return (
    <div className="space-y-1">
      {visible.map((c, i) => (
        <div
          key={c.id}
          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-bg text-xs"
        >
          <span className="text-text-muted w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
          <div className="min-w-0 flex-1">
            <span className="text-text-primary font-medium block truncate">
              {c.description || getFunctionShortLabel(c.dqxCheck.check.function)}
            </span>
            <span className="text-text-muted">
              {c.dqxCheck.check.function}
              {" · "}
              <span className={c.dqxCheck.criticality === "error" ? "text-error" : "text-warning"}>
                {c.dqxCheck.criticality}
              </span>
            </span>
          </div>
          {!c.isValid && (
            <AlertTriangle size={12} className="text-warning flex-shrink-0 mt-0.5" />
          )}
        </div>
      ))}
      {!expanded && rest > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-accent hover:underline w-full text-left pl-3 py-1"
        >
          + {rest} weitere anzeigen
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export function CheckImport({ onClose }: CheckImportProps) {
  const modalRef = useModalKeyboard(onClose);
  const { checks: existingChecks, addChecks, clearChecks } = useCheckStore();

  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [isDragging, setIsDragging] = useState(false);
  const [imported, setImported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Parse helpers ────────────────────────────────────────────────
  function runParse(content: string) {
    const result = parseDqxContent(content, "auto");
    setParseResult(result);
  }

  function handleFileRead(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      runParse(text);
    };
    reader.readAsText(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, []);

  function handlePasteChange(text: string) {
    setPasteText(text);
    if (text.trim().length > 20) {
      runParse(text);
    } else {
      setParseResult(null);
    }
  }

  function handleClearFile() {
    setFileName(null);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Import action ─────────────────────────────────────────────────
  function handleImport() {
    if (!parseResult || parseResult.checks.length === 0) return;
    if (importMode === "replace") {
      clearChecks();
    }
    addChecks(
      parseResult.checks.map((c) => ({
        dqxCheck: c.dqxCheck,
        category: c.category,
      }))
    );
    setImported(true);
    setTimeout(() => onClose(), 1200);
  }

  // ── Derived state ────────────────────────────────────────────────
  const hasContent = parseResult !== null;
  const hasChecks = hasContent && parseResult.checks.length > 0;
  const hasErrors = hasContent && parseResult.errors.length > 0;
  const hasWarnings = hasContent && parseResult.warnings.length > 0;
  const canImport = hasChecks && !imported;
  const validCount = parseResult?.checks.filter((c) => c.isValid).length ?? 0;
  const invalidCount = (parseResult?.checks.length ?? 0) - validCount;

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true" aria-label="YAML / JSON importieren">
      <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-2xl my-4 shadow-2xl">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">YAML / JSON importieren</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Bestehende DQX-Check-Definitionen laden und in den Designer übernehmen
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Input-Modus-Tabs ──────────────────────────────────── */}
          <div className="flex gap-1 bg-bg rounded-lg p-1">
            {([
              { id: "file" as InputMode, label: "Datei hochladen", icon: <Upload size={13} /> },
              { id: "paste" as InputMode, label: "Text einfügen", icon: <ClipboardPaste size={13} /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setInputMode(tab.id); setParseResult(null); setFileName(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  inputMode === tab.id
                    ? "bg-bg-surface text-text-primary shadow-sm border border-border"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Datei-Upload ─────────────────────────────────────── */}
          {inputMode === "file" && (
            <div>
              {!fileName ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50 hover:bg-bg-elevated"
                  }`}
                >
                  <Upload size={28} className="mx-auto mb-3 text-text-muted" />
                  <p className="text-sm text-text-secondary font-medium">
                    Datei hier ablegen oder klicken
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Unterstützte Formate: .yml, .yaml, .json
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".yml,.yaml,.json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-bg rounded-lg border border-border">
                  {getFileIcon(fileName)}
                  <span className="text-sm text-text-primary font-mono flex-1 truncate">{fileName}</span>
                  <button onClick={handleClearFile} className="btn-ghost p-1">
                    <Trash2 size={14} className="text-text-muted" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Text-Einfügen ─────────────────────────────────────── */}
          {inputMode === "paste" && (
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={"- criticality: error\n  check:\n    function: is_not_null\n    arguments:\n      column: customer_id"}
                className="input-field w-full h-48 font-mono text-xs resize-none leading-relaxed"
                spellCheck={false}
              />
              {pasteText && (
                <button
                  onClick={() => { setPasteText(""); setParseResult(null); }}
                  className="text-xs text-text-muted hover:text-text-secondary mt-1.5 flex items-center gap-1"
                >
                  <X size={11} /> Inhalt löschen
                </button>
              )}
            </div>
          )}

          {/* ── Parse-Ergebnis ───────────────────────────────────── */}
          {hasContent && (
            <div className="space-y-3">

              {/* Fehler */}
              {hasErrors && (
                <div className="bg-error/5 border border-error/20 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-error mb-1">
                    <AlertCircle size={13} />
                    {parseResult.errors.length === 1 ? "Fehler" : `${parseResult.errors.length} Fehler`}
                  </div>
                  {parseResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-error/80 pl-5">{err}</p>
                  ))}
                </div>
              )}

              {/* Warnungen */}
              {hasWarnings && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-warning mb-1">
                    <AlertTriangle size={13} />
                    {parseResult.warnings.length === 1 ? "Hinweis" : `${parseResult.warnings.length} Hinweise`}
                  </div>
                  {parseResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-warning/80 pl-5">{w}</p>
                  ))}
                </div>
              )}

              {/* Erfolg-Zusammenfassung */}
              {hasChecks && (
                <div className="bg-bg rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-success" />
                    <span className="text-sm font-medium text-text-primary">
                      {parseResult.checks.length} Check{parseResult.checks.length !== 1 ? "s" : ""} erkannt
                    </span>
                    <div className="flex gap-2 ml-auto">
                      {validCount > 0 && (
                        <span className="badge-success text-xs">{validCount} vollständig</span>
                      )}
                      {invalidCount > 0 && (
                        <span className="badge-error text-xs">{invalidCount} unvollständig</span>
                      )}
                    </div>
                  </div>
                  <PreviewList checks={parseResult.checks} />
                </div>
              )}

              {/* Merge-Modus (nur wenn bereits Checks vorhanden) */}
              {hasChecks && existingChecks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">
                    Du hast bereits {existingChecks.length} Check{existingChecks.length !== 1 ? "s" : ""}. Was soll mit ihnen passieren?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      {
                        id: "append" as ImportMode,
                        label: "Zu bestehenden hinzufügen",
                        desc: `Ergebnis: ${existingChecks.length + parseResult.checks.length} Checks`,
                      },
                      {
                        id: "replace" as ImportMode,
                        label: "Bestehende ersetzen",
                        desc: `Alle ${existingChecks.length} bestehenden Checks werden gelöscht`,
                      },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setImportMode(opt.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          importMode === opt.id
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            importMode === opt.id ? "border-accent" : "border-border"
                          }`}>
                            {importMode === opt.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-text-primary">{opt.label}</span>
                        </div>
                        <p className={`text-xs pl-5 ${
                          opt.id === "replace" ? "text-error/70" : "text-text-muted"
                        }`}>
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Erfolgs-Feedback */}
          {imported && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-4 py-3">
              <CheckCircle size={16} />
              Checks erfolgreich importiert!
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <button onClick={onClose} className="btn-secondary">
            Abbrechen
          </button>

          <button
            onClick={handleImport}
            disabled={!canImport}
            className="btn-primary flex items-center gap-2"
          >
            <ChevronRight size={16} />
            {parseResult?.checks.length ?? 0} Check{(parseResult?.checks.length ?? 0) !== 1 ? "s" : ""} importieren
            {importMode === "replace" && existingChecks.length > 0 && " (ersetzen)"}
          </button>
        </div>
      </div>
    </div>
  );
}
