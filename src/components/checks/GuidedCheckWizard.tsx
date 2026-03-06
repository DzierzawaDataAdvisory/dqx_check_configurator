import { useState, useMemo, useRef, useCallback } from "react";
import {
  X, ArrowLeft, ArrowRight, ChevronRight, Layers, FlaskConical,
  Search, Check, Trash2, BoxSelect, Columns3, Database,
  ShoppingBasket, Plus,
} from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";
import { toast } from "../../hooks/useToastStore";
import type { CheckConfig, DQXCheck, Criticality } from "../../types/dqx";
import { CHECK_REGISTRY } from "../../data/checkRegistry";
import type { CheckRegistryEntry, FieldDefinition } from "../../data/checkRegistry";
import { CheckFormRenderer } from "./CheckFormRenderer";
import { CriticalityToggle } from "../fields/CriticalityToggle";
import { FilterEditor } from "../fields/FilterEditor";
import { ColumnMultiSelect } from "../fields/ColumnSelector";
import { UserMetadataEditor } from "../fields/UserMetadataEditor";
import { validateCheck } from "../../lib/checkValidator";
import { generateDqxYaml } from "../../lib/yamlGenerator";
import { getIconForCheck } from "./CheckCard";
import {
  COMPLEXITY_LEVELS,
  CHECK_COMPLEXITY_MAP,
  type ComplexityLevel,
} from "../../data/checkComplexityLevels";

// ─── Types ───────────────────────────────────────────────────────
interface CollectedCheck {
  id: string;
  entry: CheckRegistryEntry;
  criticality: Criticality;
  args: Record<string, unknown>;
  checkName: string;
  filter: string;
  useForEach: boolean;
  forEachCols: string[];
  userMetadata: Record<string, string>;
}

type GuidedPhase = "browse" | "configure";

interface GuidedCheckWizardProps {
  onClose: () => void;
}

// ─── Level icons ─────────────────────────────────────────────────
function LevelIcon({ level, size = 16 }: { level: ComplexityLevel; size?: number }) {
  switch (level) {
    case "single_attribute":
      return <BoxSelect size={size} />;
    case "cross_column":
      return <Columns3 size={size} />;
    case "multi_source":
      return <Database size={size} />;
  }
}

const LEVEL_COLORS: Record<ComplexityLevel, { bg: string; text: string; border: string }> = {
  single_attribute: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  cross_column: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  multi_source: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
};

// ─── Component ───────────────────────────────────────────────────
export function GuidedCheckWizard({ onClose }: GuidedCheckWizardProps) {
  const dummyRef = useRef<() => void>(null);
  const handleCtrlEnter = useCallback(() => { dummyRef.current?.(); }, []);
  const modalRef = useModalKeyboard(onClose, handleCtrlEnter);
  const { addChecks, tableConfig } = useCheckStore();

  // ── Navigation state ───────────────────────────────────────────
  const [activeLevel, setActiveLevel] = useState<ComplexityLevel>("single_attribute");
  const [phase, setPhase] = useState<GuidedPhase>("browse");

  // ── Search ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Collected checks (basket) ──────────────────────────────────
  const [collected, setCollected] = useState<CollectedCheck[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);

  // ── Current check configuration state ──────────────────────────
  const [configEntry, setConfigEntry] = useState<CheckRegistryEntry | null>(null);
  const [criticality, setCriticality] = useState<Criticality>("error");
  const [checkName, setCheckName] = useState("");
  const [filter, setFilter] = useState("");
  const [args, setArgs] = useState<Record<string, unknown>>({});
  const [forEachCols, setForEachCols] = useState<string[]>([]);
  const [useForEach, setUseForEach] = useState(false);
  const [userMetadata, setUserMetadata] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [exampleLoaded, setExampleLoaded] = useState(false);

  // ── Checks filtered by active level ────────────────────────────
  const levelChecks = useMemo(() => {
    return CHECK_REGISTRY.filter(
      (entry) => CHECK_COMPLEXITY_MAP[entry.function] === activeLevel
    );
  }, [activeLevel]);

  const filteredChecks = useMemo(() => {
    if (!searchQuery.trim()) return levelChecks;
    const q = searchQuery.toLowerCase();
    return levelChecks.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.function.toLowerCase().includes(q)
    );
  }, [levelChecks, searchQuery]);

  // Group by category within the level
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, CheckRegistryEntry[]>();
    for (const entry of filteredChecks) {
      const cat = entry.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(entry);
    }
    return groups;
  }, [filteredChecks]);

  // ── Level metadata ─────────────────────────────────────────────
  const levelMeta = COMPLEXITY_LEVELS.find((l) => l.key === activeLevel)!;
  const levelIdx = COMPLEXITY_LEVELS.findIndex((l) => l.key === activeLevel);

  // ── Basket counts per level ────────────────────────────────────
  const basketCountByLevel = useMemo(() => {
    const counts: Record<ComplexityLevel, number> = {
      single_attribute: 0,
      cross_column: 0,
      multi_source: 0,
    };
    for (const c of collected) {
      const level = CHECK_COMPLEXITY_MAP[c.entry.function];
      counts[level]++;
    }
    return counts;
  }, [collected]);

  // ── Configuration helpers ──────────────────────────────────────
  function startConfigure(entry: CheckRegistryEntry) {
    setConfigEntry(entry);
    const defaults: Record<string, unknown> = {};
    for (const field of entry.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    }
    setArgs(defaults);
    setCriticality("error");
    setCheckName("");
    setFilter("");
    setForEachCols([]);
    setUseForEach(false);
    setUserMetadata({});
    setShowAdvanced(false);
    setShowMetadata(false);
    setPhase("configure");
  }

  function handleArgChange(key: string, value: unknown) {
    setArgs((prev) => ({ ...prev, [key]: value }));
  }

  function getExampleValue(field: FieldDefinition): unknown {
    const colNames = tableConfig.columns.map((c) => c.name);
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
    if (!configEntry) return;
    const example: Record<string, unknown> = {};
    for (const field of configEntry.fields) {
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
        function: configEntry!.function,
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

  // Validation for current configuration
  const previewCheck: CheckConfig | null =
    configEntry
      ? {
          id: "preview",
          dqxCheck: buildDqxCheck(),
          category: configEntry.category,
          isValid: false,
          description: "",
        }
      : null;

  const validation = previewCheck ? validateCheck(previewCheck) : null;
  const previewYaml = previewCheck ? generateDqxYaml([previewCheck]) : "";

  // ── Add to basket ──────────────────────────────────────────────
  function addToBasket() {
    if (!configEntry || !validation?.isValid) return;
    const newItem: CollectedCheck = {
      id: crypto.randomUUID(),
      entry: configEntry,
      criticality,
      args: { ...args },
      checkName,
      filter,
      useForEach,
      forEachCols: [...forEachCols],
      userMetadata: { ...userMetadata },
    };
    setCollected((prev) => [...prev, newItem]);
    toast(`"${configEntry.displayName}" zum Warenkorb hinzugefügt`, "success");
    setPhase("browse");
    setConfigEntry(null);
  }

  function removeFromBasket(id: string) {
    setCollected((prev) => prev.filter((c) => c.id !== id));
  }

  // ── Save all ───────────────────────────────────────────────────
  function handleSaveAll() {
    if (collected.length === 0) return;
    const checksToAdd = collected.map((c) => {
      const dqxCheck: DQXCheck = {
        criticality: c.criticality,
        check: {
          function: c.entry.function,
          arguments: { ...c.args },
        },
      };
      if (c.checkName.trim()) dqxCheck.name = c.checkName.trim();
      if (c.filter.trim()) dqxCheck.filter = c.filter.trim();
      if (Object.keys(c.userMetadata).length > 0) dqxCheck.user_metadata = { ...c.userMetadata };
      if (c.useForEach && c.forEachCols.length > 0) {
        dqxCheck.check.for_each_column = c.forEachCols;
        delete dqxCheck.check.arguments?.column;
      }
      return { dqxCheck, category: c.entry.category };
    });

    addChecks(checksToAdd);
    toast(`${collected.length} Check${collected.length !== 1 ? "s" : ""} hinzugefügt`, "success");
    onClose();
  }

  // Wire Ctrl+Enter to save all
  dummyRef.current = collected.length > 0 ? handleSaveAll : null;

  // ── Navigation ─────────────────────────────────────────────────
  function goToLevel(level: ComplexityLevel) {
    setActiveLevel(level);
    setSearchQuery("");
    setPhase("browse");
    setConfigEntry(null);
  }

  function goNext() {
    const nextIdx = levelIdx + 1;
    if (nextIdx < COMPLEXITY_LEVELS.length) {
      goToLevel(COMPLEXITY_LEVELS[nextIdx].key);
    }
  }

  function goPrev() {
    const prevIdx = levelIdx - 1;
    if (prevIdx >= 0) {
      goToLevel(COMPLEXITY_LEVELS[prevIdx].key);
    }
  }

  // Category labels
  const categoryLabels: Record<string, string> = {
    completeness: "Vollständigkeit",
    range: "Wertebereiche",
    allowed_values: "Erlaubte Werte",
    pattern: "Muster & Format",
    date_time: "Datum & Zeit",
    json: "JSON-Inhalt",
    uniqueness: "Eindeutigkeit",
    referential_integrity: "Verknüpfungen",
    schema: "Tabellenstruktur",
    aggregation: "Kennzahlen & Summen",
    network: "Netzwerk & IP",
    array: "Arrays & Listen",
    custom: "Eigene Regeln",
    comparison: "Datenvergleich",
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Geführter Check-Wizard"
    >
      <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-4xl my-4 shadow-2xl">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {phase === "configure" && (
              <button
                onClick={() => { setPhase("browse"); setConfigEntry(null); }}
                className="btn-ghost p-1.5"
                aria-label="Zurück"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Geführter Check-Wizard
              </h2>
              {/* Step indicator */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {COMPLEXITY_LEVELS.map((level, i) => {
                  const isActive = level.key === activeLevel;
                  const isPast =
                    COMPLEXITY_LEVELS.findIndex((l) => l.key === activeLevel) > i;
                  const count = basketCountByLevel[level.key];
                  return (
                    <div key={level.key} className="flex items-center gap-1">
                      {i > 0 && (
                        <ChevronRight size={10} className="text-text-muted" />
                      )}
                      <button
                        onClick={() => goToLevel(level.key)}
                        className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                          isActive
                            ? `${LEVEL_COLORS[level.key].bg} ${LEVEL_COLORS[level.key].text} font-medium`
                            : isPast
                              ? "text-text-secondary hover:text-text-primary"
                              : "text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        <LevelIcon level={level.key} size={11} />
                        {level.shortLabel}
                        {count > 0 && (
                          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${LEVEL_COLORS[level.key].bg} ${LEVEL_COLORS[level.key].text}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Basket indicator */}
            {collected.length > 0 && (
              <button
                onClick={() => setBasketOpen(!basketOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-sm ${
                  basketOpen
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg text-text-secondary hover:border-accent/50"
                }`}
              >
                <ShoppingBasket size={14} />
                <span className="font-medium">{collected.length}</span>
                <span className="text-xs">Check{collected.length !== 1 ? "s" : ""}</span>
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Schließen">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="flex gap-0 overflow-hidden">
          {/* Main area */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[calc(100vh-260px)]">
            {/* ── BROWSE PHASE ─────────────────────────────────────── */}
            {phase === "browse" && (
              <div className="space-y-4">
                {/* Level description */}
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${LEVEL_COLORS[activeLevel].border} ${LEVEL_COLORS[activeLevel].bg}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${LEVEL_COLORS[activeLevel].text}`}>
                    <LevelIcon level={activeLevel} size={20} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${LEVEL_COLORS[activeLevel].text}`}>
                      Schritt {levelMeta.step}: {levelMeta.label}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {levelMeta.description}
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Checks in "${levelMeta.shortLabel}" durchsuchen…`}
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

                {/* Checks grouped by category */}
                {filteredChecks.length > 0 ? (
                  <div className="space-y-4">
                    {Array.from(groupedByCategory.entries()).map(
                      ([category, entries]) => (
                        <div key={category}>
                          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                            {categoryLabels[category] || category}
                          </h4>
                          <div className="space-y-1.5">
                            {entries.map((entry) => {
                              const isInBasket = collected.some(
                                (c) => c.entry.function === entry.function
                              );
                              return (
                                <button
                                  key={entry.function}
                                  onClick={() => startConfigure(entry)}
                                  className={`w-full card text-left hover:border-accent/50 hover:bg-bg-elevated transition-all flex items-start gap-3 py-2.5 ${
                                    isInBasket ? "border-success/30 bg-success/5" : ""
                                  }`}
                                >
                                  <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center text-text-muted flex-shrink-0 mt-0.5">
                                    {getIconForCheck(entry.icon, 14)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-text-primary text-sm">
                                        {entry.displayName}
                                      </span>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                                          entry.level === "row"
                                            ? "bg-blue-500/10 text-blue-400"
                                            : "bg-purple-500/10 text-purple-400"
                                        }`}
                                      >
                                        {entry.level === "row" ? "Zeilen" : "Datensatz"}
                                      </span>
                                      {isInBasket && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success flex items-center gap-0.5">
                                          <Check size={9} />
                                          im Warenkorb
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                                      {entry.description}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0 mt-1">
                                    <Plus size={14} className="text-text-muted" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-muted">
                    <Search size={20} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Kein Check-Typ gefunden.</p>
                    <p className="text-xs mt-1">
                      Versuche einen anderen Suchbegriff.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── CONFIGURE PHASE ──────────────────────────────────── */}
            {phase === "configure" && configEntry && (
              <div className="space-y-5">
                {/* Check type header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center text-text-muted">
                    {getIconForCheck(configEntry.icon, 16)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {configEntry.displayName}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {configEntry.description}
                    </p>
                  </div>
                </div>

                {/* Criticality */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Schweregrad *
                  </label>
                  <CriticalityToggle value={criticality} onChange={setCriticality} />
                </div>

                {/* for_each_column toggle */}
                {configEntry.supportsForEachColumn && (
                  <div className="bg-bg rounded-lg p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setUseForEach(!useForEach)}
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                          useForEach
                            ? "bg-accent"
                            : "bg-bg-elevated border border-border"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform"
                          style={{
                            transform: useForEach
                              ? "translateX(22px)"
                              : "translateX(2px)",
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                          <Layers size={14} className="text-accent" />
                          Auf mehrere Spalten anwenden
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Der gleiche Check wird automatisch für jede gewählte
                          Spalte erstellt.
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

                {/* Parameters header with example button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    Parameter
                  </span>
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
                  fields={
                    useForEach
                      ? configEntry.fields.filter((f) => f.key !== "column")
                      : configEntry.fields
                  }
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
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                    />
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
                        <p className="text-xs text-text-muted mb-2">
                          Einschränkung per SQL-WHERE-Klausel.
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
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${showMetadata ? "rotate-90" : ""}`}
                    />
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
                        Hinterlege zusätzliche Informationen zu diesem Check.
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

          {/* ── Right panel: YAML preview or Basket ─────────────── */}
          {(phase === "configure" || basketOpen) && (
            <div className="w-72 border-l border-border bg-bg flex flex-col">
              {phase === "configure" && previewCheck && !basketOpen && (
                <>
                  <div className="px-4 py-3 border-b border-border">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      YAML-Vorschau
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto p-3">
                    <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                      {previewYaml}
                    </pre>
                  </div>
                  {validation && (
                    <div
                      className={`px-4 py-3 border-t border-border text-xs ${
                        validation.isValid ? "text-success" : "text-error"
                      }`}
                    >
                      {validation.isValid
                        ? "✓ Gültige Konfiguration"
                        : validation.errors[0]}
                    </div>
                  )}
                </>
              )}

              {basketOpen && (
                <>
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Warenkorb ({collected.length})
                    </span>
                    <button
                      onClick={() => setBasketOpen(false)}
                      className="text-text-muted hover:text-text-secondary"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-3 space-y-2">
                    {collected.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-4">
                        Noch keine Checks hinzugefügt.
                      </p>
                    ) : (
                      collected.map((c) => {
                        const level = CHECK_COMPLEXITY_MAP[c.entry.function];
                        return (
                          <div
                            key={c.id}
                            className="flex items-start gap-2 p-2 rounded-lg bg-bg-surface border border-border"
                          >
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${LEVEL_COLORS[level].bg} ${LEVEL_COLORS[level].text}`}
                            >
                              <LevelIcon level={level} size={10} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-text-primary block truncate">
                                {c.entry.displayName}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                {c.criticality === "error" ? "Fehler" : "Warnung"}
                                {c.args.column
                                  ? ` · ${c.args.column}`
                                  : ""}
                              </span>
                            </div>
                            <button
                              onClick={() => removeFromBasket(c.id)}
                              className="text-text-muted hover:text-error flex-shrink-0 mt-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            {/* Level navigation */}
            {phase === "browse" && levelIdx > 0 && (
              <button onClick={goPrev} className="btn-ghost flex items-center gap-1.5 text-sm">
                <ArrowLeft size={14} />
                {COMPLEXITY_LEVELS[levelIdx - 1].shortLabel}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Configure phase: add to basket */}
            {phase === "configure" && (
              <button
                onClick={addToBasket}
                disabled={!validation?.isValid}
                className="btn-primary flex items-center gap-2"
              >
                <ShoppingBasket size={14} />
                Zum Warenkorb hinzufügen
              </button>
            )}

            {/* Browse phase: next level or finish */}
            {phase === "browse" && (
              <>
                {levelIdx < COMPLEXITY_LEVELS.length - 1 && (
                  <button
                    onClick={goNext}
                    className="btn-ghost flex items-center gap-1.5 text-sm"
                  >
                    Weiter: {COMPLEXITY_LEVELS[levelIdx + 1].shortLabel}
                    <ArrowRight size={14} />
                  </button>
                )}
                {collected.length > 0 && (
                  <button
                    onClick={handleSaveAll}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Check size={14} />
                    {collected.length} Check{collected.length !== 1 ? "s" : ""}{" "}
                    übernehmen
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
