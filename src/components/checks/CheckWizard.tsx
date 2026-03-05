import { useState, useMemo, useRef, useCallback } from "react";
import { X, ArrowLeft, ChevronRight, Layers, FlaskConical, Search, Clock } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";
import { toast } from "../../hooks/useToastStore";
import type { CheckCategory, CheckConfig, DQXCheck } from "../../types/dqx";
import { CHECK_REGISTRY, getChecksByCategory, getCheckByFunction } from "../../data/checkRegistry";
import type { CheckRegistryEntry, FieldDefinition } from "../../data/checkRegistry";
import { CheckCategoryPicker } from "./CheckCategoryPicker";
import { CheckFormRenderer } from "./CheckFormRenderer";
import { CriticalityToggle } from "../fields/CriticalityToggle";
import { FilterEditor } from "../fields/FilterEditor";
import { ColumnMultiSelect } from "../fields/ColumnSelector";
import { UserMetadataEditor } from "../fields/UserMetadataEditor";
import { validateCheck } from "../../lib/checkValidator";
import { generateDqxYaml } from "../../lib/yamlGenerator";
import { getIconForCheck } from "./CheckCard";

type WizardStep = "category" | "type" | "configure";

const RECENT_CHECKS_KEY = "dqx-recent-checks";
const MAX_RECENT = 5;

function getRecentChecks(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_CHECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentCheck(fn: string) {
  const recent = getRecentChecks().filter(f => f !== fn);
  recent.unshift(fn);
  localStorage.setItem(RECENT_CHECKS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface QuickAddContext {
  column?: string;
  category?: CheckCategory;
  function?: string;
}

function consumeQuickAddContext(): QuickAddContext | null {
  try {
    const raw = sessionStorage.getItem("quickAddContext");
    if (!raw) return null;
    sessionStorage.removeItem("quickAddContext");
    return JSON.parse(raw);
  } catch { return null; }
}

interface CheckWizardProps {
  editingCheck?: CheckConfig;
  preselectedCategory?: CheckCategory;
  onClose: () => void;
}

export function CheckWizard({ editingCheck, preselectedCategory, onClose }: CheckWizardProps) {
  const saveRef = useRef<() => void>(null);
  const handleCtrlEnter = useCallback(() => { saveRef.current?.(); }, []);
  const modalRef = useModalKeyboard(onClose, handleCtrlEnter);
  const { addCheck, updateCheck, tableConfig } = useCheckStore();
  const isEditing = !!editingCheck;

  // Context-sensitive opening: check for quickAddContext or preselectedCategory
  const [quickCtx] = useState<QuickAddContext | null>(() => {
    if (isEditing) return null;
    return consumeQuickAddContext();
  });

  // Determine initial state based on context
  const [step, setStep] = useState<WizardStep>(() => {
    if (isEditing) return "configure";
    if (quickCtx?.function) return "configure";
    if (quickCtx?.category || preselectedCategory) return "type";
    return "category";
  });

  const [selectedCategory, setSelectedCategory] = useState<CheckCategory | null>(() => {
    if (editingCheck) return editingCheck.category;
    if (quickCtx?.category) return quickCtx.category;
    if (preselectedCategory) return preselectedCategory;
    return null;
  });

  const [selectedEntry, setSelectedEntry] = useState<CheckRegistryEntry | null>(() => {
    if (editingCheck) return getCheckByFunction(editingCheck.dqxCheck.check.function) || null;
    if (quickCtx?.function) return getCheckByFunction(quickCtx.function as Parameters<typeof getCheckByFunction>[0]) || null;
    return null;
  });

  // Form state
  const [criticality, setCriticality] = useState(editingCheck?.dqxCheck.criticality || "error");
  const [checkName, setCheckName] = useState(editingCheck?.dqxCheck.name || "");
  const [filter, setFilter] = useState(editingCheck?.dqxCheck.filter || "");
  const [args, setArgs] = useState<Record<string, unknown>>(() => {
    if (editingCheck) return editingCheck.dqxCheck.check.arguments || {};
    // Pre-fill column from quickAddContext
    if (quickCtx?.column && quickCtx.function) {
      const entry = getCheckByFunction(quickCtx.function as Parameters<typeof getCheckByFunction>[0]);
      const defaults: Record<string, unknown> = {};
      if (entry) {
        for (const field of entry.fields) {
          if (field.key === "column") {
            defaults.column = quickCtx.column;
          } else if (field.defaultValue !== undefined) {
            defaults[field.key] = field.defaultValue;
          }
        }
      }
      return defaults;
    }
    return {};
  });
  const [forEachCols, setForEachCols] = useState<string[]>(
    editingCheck?.dqxCheck.check.for_each_column || []
  );
  const [useForEach, setUseForEach] = useState(
    !!(editingCheck?.dqxCheck.check.for_each_column?.length)
  );
  const [userMetadata, setUserMetadata] = useState<Record<string, string>>(
    editingCheck?.dqxCheck.user_metadata || {}
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMetadata, setShowMetadata] = useState(
    !!(editingCheck?.dqxCheck.user_metadata && Object.keys(editingCheck.dqxCheck.user_metadata).length > 0)
  );
  const [exampleLoaded, setExampleLoaded] = useState(false);

  // Search state for category step
  const [searchQuery, setSearchQuery] = useState("");


  // Search results: filter check types by query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return CHECK_REGISTRY.filter(entry =>
      entry.displayName.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.function.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Recently used checks
  const recentEntries = useMemo(() => {
    const recent = getRecentChecks();
    return recent
      .map(fn => CHECK_REGISTRY.find(e => e.function === fn))
      .filter((e): e is CheckRegistryEntry => !!e);
  }, []);

  function handleArgChange(key: string, value: unknown) {
    setArgs(prev => ({ ...prev, [key]: value }));
  }

  function selectEntry(entry: CheckRegistryEntry) {
    setSelectedEntry(entry);
    setSelectedCategory(entry.category);
    const defaults: Record<string, unknown> = {};
    for (const field of entry.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    }
    setArgs(defaults);
    setStep("configure");
  }

  function getExampleValue(field: FieldDefinition): unknown {
    const colNames = tableConfig.columns.map(c => c.name);
    const firstCol = colNames[0] || "customer_id";
    switch (field.type) {
      case "column_select":
        return firstCol;
      case "column_multi_select":
        return colNames.slice(0, 2).length > 0 ? colNames.slice(0, 2) : ["customer_id", "email"];
      case "value_list":
        return ["A", "B", "C"];
      case "number":
        if (field.validation?.min !== undefined) return field.validation.min;
        if (field.key.includes("max")) return 100;
        if (field.key.includes("min")) return 0;
        if (field.key.includes("percent") || field.key.includes("ratio")) return 0.95;
        return 0;
      case "boolean":
        return field.defaultValue !== undefined ? field.defaultValue : false;
      case "select":
        return field.options?.[0]?.value ?? "";
      case "regex_builder":
        return "^[a-zA-Z0-9_]+$";
      case "date_format":
        return "yyyy-MM-dd";
      case "date":
        return "2024-01-01";
      case "timestamp":
        return "2024-01-01T00:00:00";
      case "schema_editor":
        return [{ column: firstCol, type: "string" }];
      case "key_mapping":
        return colNames.length >= 2
          ? { [colNames[0]]: colNames[1] }
          : { customer_id: "kunden_id" };
      case "text":
        if (field.key === "name") return "mein_check";
        if (field.key.includes("table")) return "catalog.schema.referenz_tabelle";
        if (field.key.includes("column")) return firstCol;
        return field.placeholder || "beispiel_wert";
      default:
        return field.defaultValue ?? "";
    }
  }

  function fillExampleArgs() {
    if (!selectedEntry) return;
    const example: Record<string, unknown> = {};
    for (const field of selectedEntry.fields) {
      if (useForEach && field.key === "column") continue;
      example[field.key] = getExampleValue(field);
    }
    setArgs(example);
    setExampleLoaded(true);
    setTimeout(() => setExampleLoaded(false), 2000);
  }

  function buildDqxCheck(): DQXCheck {
    const check: DQXCheck = {
      criticality,
      check: {
        function: selectedEntry!.function,
        arguments: { ...args },
      },
    };
    if (checkName.trim()) check.name = checkName.trim();
    if (filter.trim()) check.filter = filter.trim();
    if (Object.keys(userMetadata).length > 0) check.user_metadata = { ...userMetadata };
    if (useForEach && forEachCols.length > 0) {
      check.check.for_each_column = forEachCols;
      delete check.check.arguments?.column;
    }
    return check;
  }

  function handleSave() {
    if (!selectedEntry) return;
    const dqxCheck = buildDqxCheck();

    // Save to recently used
    saveRecentCheck(selectedEntry.function);

    if (isEditing && editingCheck) {
      updateCheck(editingCheck.id, {
        dqxCheck,
        category: selectedCategory!,
      });
      toast("Check aktualisiert", "success");
    } else {
      addCheck({
        dqxCheck,
        category: selectedCategory!,
      });
      toast("Check hinzugefügt", "success");
    }
    onClose();
  }

  // Preview YAML
  const previewCheck: CheckConfig | null = selectedEntry ? {
    id: editingCheck?.id || "preview",
    dqxCheck: buildDqxCheck(),
    category: selectedCategory!,
    isValid: false,
    description: "",
  } : null;

  const validation = previewCheck ? validateCheck(previewCheck) : null;
  saveRef.current = validation?.isValid ? handleSave : null;
  const previewYaml = previewCheck ? generateDqxYaml([previewCheck]) : "";

  const checksInCategory = selectedCategory ? getChecksByCategory(selectedCategory) : [];

  function handleBack() {
    if (step === "configure") {
      // If we jumped directly (quickCtx), go back to category
      if (quickCtx?.function) {
        setStep("category");
        setSelectedEntry(null);
        setSelectedCategory(null);
      } else {
        setStep("type");
      }
    } else if (step === "type") {
      setStep("category");
      setSelectedCategory(null);
    }
  }

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true" aria-label={isEditing ? "Check bearbeiten" : "Neuen Check erstellen"}>
      <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-3xl my-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step !== "category" && !isEditing && (
              <button
                onClick={handleBack}
                className="btn-ghost p-1.5"
                aria-label="Zurück"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {isEditing ? "Check bearbeiten" : "Neuen Check erstellen"}
              </h2>
              {!isEditing && (
                <div className="flex items-center gap-2 mt-0.5">
                  {["Kategorie", "Check-Typ", "Konfigurieren"].map((s, i) => {
                    const stepKeys = ["category", "type", "configure"];
                    const current = stepKeys.indexOf(step);
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        {i > 0 && <ChevronRight size={12} className="text-text-muted" />}
                        <span className={`text-xs ${i <= current ? "text-accent" : "text-text-muted"}`}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-0 overflow-hidden">
          {/* Main form */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[calc(100vh-220px)]">
            {step === "category" && (
              <div className="space-y-4">
                {/* Search field */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='Check suchen, z.B. "NULL", "Wertebereich", "Datum"...'
                    className="input-field pl-9 text-sm w-full"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search results — directly jump to configure */}
                {searchQuery.trim() && searchResults.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-text-muted mb-2">Suchergebnisse</h3>
                    <div className="space-y-1.5">
                      {searchResults.map(entry => (
                        <button
                          key={entry.function}
                          onClick={() => selectEntry(entry)}
                          className="w-full card text-left hover:border-accent/50 hover:bg-bg-elevated transition-all flex items-start gap-3 py-2.5"
                        >
                          <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center text-text-muted flex-shrink-0 mt-0.5">
                            {getIconForCheck(entry.icon, 14)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary text-sm">{entry.displayName}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                entry.level === "row" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                              }`}>
                                {entry.level === "row" ? "Zeilen" : "Datensatz"}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{entry.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="text-center py-6 text-text-muted">
                    <Search size={20} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Kein Check-Typ gefunden.</p>
                    <p className="text-xs mt-1">Versuche einen anderen Suchbegriff oder wähle eine Kategorie.</p>
                  </div>
                )}

                {/* Recently used (only when not searching) */}
                {!searchQuery.trim() && recentEntries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                      <Clock size={11} />
                      Zuletzt verwendet
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {recentEntries.map(entry => (
                        <button
                          key={entry.function}
                          onClick={() => selectEntry(entry)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:border-accent/50 hover:bg-bg-elevated transition-all text-sm"
                        >
                          <span className="text-text-muted">{getIconForCheck(entry.icon, 12)}</span>
                          <span className="text-text-primary">{entry.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category picker (only when not searching, or search has no results) */}
                {!searchQuery.trim() && (
                  <CheckCategoryPicker
                    onSelect={(cat) => {
                      setSelectedCategory(cat);
                      setStep("type");
                    }}
                  />
                )}
              </div>
            )}

            {step === "type" && selectedCategory && (
              <div>
                <h3 className="text-base font-semibold text-text-primary mb-4">Check-Typ wählen</h3>
                <div className="space-y-2">
                  {checksInCategory.map((entry) => (
                    <button
                      key={entry.function}
                      onClick={() => selectEntry(entry)}
                      className="w-full card text-left hover:border-accent/50 hover:bg-bg-elevated transition-all flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center text-text-muted flex-shrink-0 mt-0.5">
                        {getIconForCheck(entry.icon, 16)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary text-sm">{entry.displayName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            entry.level === "row" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                          }`}>
                            {entry.level === "row" ? "Zeilen" : "Datensatz"}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{entry.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "configure" && selectedEntry && (
              <div className="space-y-5">
                {/* Criticality */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Schweregrad *
                  </label>
                  <CriticalityToggle value={criticality} onChange={setCriticality} />
                </div>

                {/* for_each_column toggle */}
                {selectedEntry.supportsForEachColumn && (
                  <div className="bg-bg rounded-lg p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setUseForEach(!useForEach)}
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                          useForEach ? "bg-accent" : "bg-bg-elevated border border-border"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform`}
                          style={{ transform: useForEach ? "translateX(22px)" : "translateX(2px)" }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                          <Layers size={14} className="text-accent" />
                          Auf mehrere Spalten anwenden
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Der gleiche Check wird automatisch für jede gewählte Spalte erstellt – du musst ihn nicht einzeln anlegen.
                        </p>
                      </div>
                    </label>

                    {useForEach && (
                      <div className="mt-3">
                        <ColumnMultiSelect
                          value={forEachCols}
                          onChange={setForEachCols}
                          placeholder="Welche Spalten sollen geprüft werden?"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Check parameters header with example button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Parameter</span>
                  <button
                    type="button"
                    onClick={fillExampleArgs}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      exampleLoaded
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-bg text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/5"
                    }`}
                    title="Felder mit Beispielwerten befüllen"
                  >
                    <FlaskConical size={12} />
                    {exampleLoaded ? "Geladen!" : "Beispiel laden"}
                  </button>
                </div>

                {/* Dynamic form fields */}
                <CheckFormRenderer
                  fields={useForEach
                    ? selectedEntry.fields.filter(f => f.key !== "column")
                    : selectedEntry.fields}
                  values={args}
                  onChange={handleArgChange}
                />

                {/* Advanced options */}
                <div className="border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
                  >
                    <ChevronRight size={12} className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                    Weitere Optionen (Name & Einschränkung)
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                          Check-Name (optional)
                        </label>
                        <input
                          value={checkName}
                          onChange={(e) => setCheckName(e.target.value)}
                          placeholder="Wenn leer, generiert DQX automatisch einen Namen"
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                          Nur bestimmte Zeilen prüfen (optional)
                        </label>
                        <p className="text-xs text-text-muted mb-1">
                          Manchmal soll eine Regel nicht für alle Datensätze gelten – nur für eine bestimmte Teilmenge.
                        </p>
                        <p className="text-xs text-text-muted mb-2">
                          {'Beispiel: "Der Umsatz muss größer als 0 sein" \u2013 aber nur für '}
                          <em>abgeschlossene</em>
                          {' Bestellungen, nicht für stornierte. Dann filtere auf: '}
                          <code className="bg-bg px-1 rounded font-mono">{"status = 'abgeschlossen'"}</code>
                        </p>
                        <FilterEditor value={filter} onChange={setFilter} />
                      </div>
                    </div>
                  )}
                </div>

                {/* User Metadata */}
                <div className="border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMetadata(!showMetadata)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
                  >
                    <ChevronRight size={12} className={`transition-transform ${showMetadata ? "rotate-90" : ""}`} />
                    Metadaten
                    {Object.keys(userMetadata).length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                        {Object.keys(userMetadata).length}
                      </span>
                    )}
                  </button>

                  {showMetadata && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-text-muted">
                        Hinterlege zusätzliche Informationen zu diesem Check – z.B. wer verantwortlich ist, welches Ticket damit verknüpft ist oder welches SLA gilt. Diese Angaben erscheinen im YAML-Export unter <code className="bg-bg px-1 rounded font-mono text-xs">user_metadata</code>.
                      </p>
                      <UserMetadataEditor
                        value={userMetadata}
                        onChange={setUserMetadata}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* YAML preview panel */}
          {step === "configure" && previewCheck && (
            <div className="w-64 border-l border-border bg-bg flex flex-col">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">YAML-Vorschau</span>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                  {previewYaml}
                </pre>
              </div>
              {validation && (
                <div className={`px-4 py-3 border-t border-border text-xs ${
                  validation.isValid ? "text-success" : "text-error"
                }`}>
                  {validation.isValid ? "✓ Gültige Konfiguration" : validation.errors[0]}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <button onClick={onClose} className="btn-secondary">
            Abbrechen
          </button>
          {step === "configure" && (
            <button
              onClick={handleSave}
              disabled={!validation?.isValid}
              className="btn-primary"
            >
              {isEditing ? "Änderungen speichern" : "Check hinzufügen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
