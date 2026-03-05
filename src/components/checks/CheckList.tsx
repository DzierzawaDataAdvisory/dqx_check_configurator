import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import {
  Plus, ChevronDown, ChevronRight, Trash2, AlertTriangle,
  Search, X, Layout, CheckSquare, Square, AlertCircle, CheckCircle,
  Filter, BookOpen, Upload,
} from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import type { CheckConfig, CheckCategory, Criticality } from "../../types/dqx";
import { CATEGORIES } from "../../data/checkRegistry";
import { CheckCard } from "./CheckCard";
import { CheckSuggestions } from "../suggestions/CheckSuggestions";
import { toast } from "../../hooks/useToastStore";

// Lazy-loaded heavy modals
const CheckWizard = lazy(() => import("./CheckWizard").then(m => ({ default: m.CheckWizard })));
const TemplateGallery = lazy(() => import("../templates/TemplateGallery").then(m => ({ default: m.TemplateGallery })));
const CheckImport = lazy(() => import("../import/CheckImport").then(m => ({ default: m.CheckImport })));
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Sortable wrapper ─────────────────────────────────────────────
function SortableCheckCard({
  check,
  onEdit,
  onDuplicate,
  onRemove,
  selected,
  onToggleSelect,
}: {
  check: CheckConfig;
  onEdit: (c: CheckConfig) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: check.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      {/* Checkbox */}
      <button
        onClick={() => onToggleSelect(check.id)}
        className="mt-3 flex-shrink-0 text-text-muted hover:text-accent transition-colors"
        title={selected ? "Abwählen" : "Auswählen"}
      >
        {selected
          ? <CheckSquare size={16} className="text-accent" />
          : <Square size={16} />
        }
      </button>
      {/* Card */}
      <div className="flex-1">
        <CheckCard
          check={check}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          dragHandleProps={{ ...attributes, ...listeners }}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}

// ─── Filter chip component ────────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "bg-bg-elevated text-text-muted hover:bg-bg-elevated hover:text-text-secondary border border-border"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main CheckList component ─────────────────────────────────────
export function CheckList() {
  const {
    checks,
    removeCheck,
    duplicateCheck,
    reorderChecks,
    clearChecks,
    bulkRemoveChecks,
    bulkUpdateChecks,
    insertCheckAt,
    insertChecksAt,
  } = useCheckStore();

  const [editingCheck, setEditingCheck] = useState<CheckConfig | undefined>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState<CheckCategory | undefined>();
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<CheckCategory | "">("");
  const [filterCriticality, setFilterCriticality] = useState<Criticality | "">("");

  // Listen for global "N" shortcut
  useEffect(() => {
    function handleShortcut() {
      setEditingCheck(undefined);
      setPreselectedCategory(undefined);
      setWizardOpen(true);
    }
    window.addEventListener("dqx-shortcut-new-check", handleShortcut);
    return () => window.removeEventListener("dqx-shortcut-new-check", handleShortcut);
  }, []);
  const [filterValidity, setFilterValidity] = useState<"valid" | "invalid" | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Filtered checks ──────────────────────────────────────────────
  const filteredChecks = useMemo(() => {
    return checks.filter(c => {
      if (filterCategory && c.category !== filterCategory) return false;
      if (filterCriticality && c.dqxCheck.criticality !== filterCriticality) return false;
      if (filterValidity === "valid" && !c.isValid) return false;
      if (filterValidity === "invalid" && c.isValid) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchFn = c.dqxCheck.check.function.toLowerCase().includes(q);
        const matchName = (c.dqxCheck.name || "").toLowerCase().includes(q);
        const matchDesc = (c.description || "").toLowerCase().includes(q);
        const matchCol = Object.values(c.dqxCheck.check.arguments || {})
          .some(v => typeof v === "string" && v.toLowerCase().includes(q));
        if (!matchFn && !matchName && !matchDesc && !matchCol) return false;
      }
      return true;
    });
  }, [checks, filterCategory, filterCriticality, filterValidity, searchQuery]);

  const hasActiveFilters = filterCategory !== "" || filterCriticality !== "" || filterValidity !== "" || searchQuery !== "";

  // ── Grouped filtered checks ──────────────────────────────────────
  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    checks: filteredChecks.filter(c => c.category === cat.key),
  })).filter(g => g.checks.length > 0);

  const uncategorized = filteredChecks.filter(c => !CATEGORIES.find(cat => cat.key === c.category));

  // ── Stats ────────────────────────────────────────────────────────
  const validCount = checks.filter(c => c.isValid).length;
  const invalidCount = checks.length - validCount;

  // ── DnD ─────────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = checks.findIndex(c => c.id === active.id);
    const newIndex = checks.findIndex(c => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) reorderChecks(oldIndex, newIndex);
  }

  // ── Category collapse ────────────────────────────────────────────
  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleEdit(check: CheckConfig) {
    setEditingCheck(check);
    setWizardOpen(true);
  }

  // ── Selection helpers ────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFilteredSelected =
    filteredChecks.length > 0 && filteredChecks.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChecks.map(c => c.id)));
    }
  }

  // ── Bulk actions ─────────────────────────────────────────────────
  function handleBulkDelete() {
    const removed = checks
      .map((c, i) => ({ check: c, index: i }))
      .filter(({ check }) => selectedIds.has(check.id));
    bulkRemoveChecks([...selectedIds]);
    setSelectedIds(new Set());
    toast(
      `${removed.length} Check${removed.length !== 1 ? "s" : ""} gelöscht`,
      "success",
      () => insertChecksAt(removed),
    );
  }

  function handleRemoveWithUndo(id: string) {
    const index = checks.findIndex((c) => c.id === id);
    const check = checks[index];
    if (!check) return;
    removeCheck(id);
    const label = check.description || check.dqxCheck.check.function;
    toast(`"${label}" gelöscht`, "success", () => insertCheckAt(check, index));
  }

  function handleBulkSetCriticality(criticality: Criticality) {
    bulkUpdateChecks([...selectedIds], { criticality });
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterCategory("");
    setFilterCriticality("");
    setFilterValidity("");
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Data-Quality-Checks</h2>
          {checks.length > 0 && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-text-secondary">{checks.length} Check{checks.length !== 1 ? "s" : ""}</span>
              {validCount > 0 && <span className="badge-success">{validCount} gültig</span>}
              {invalidCount > 0 && <span className="badge-error">{invalidCount} fehlerhaft</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {checks.length > 0 && (
            <button
              onClick={() => { if (confirm("Alle Checks löschen?")) clearChecks(); }}
              className="btn-ghost text-sm text-error hover:text-error flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Alle löschen
            </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="btn-secondary flex items-center gap-2"
            title="YAML / JSON importieren"
          >
            <Upload size={15} />
            Importieren
          </button>
          <button
            onClick={() => setTemplateGalleryOpen(true)}
            className="btn-secondary flex items-center gap-2"
            title="Vorlage anwenden"
          >
            <BookOpen size={15} />
            Vorlage
          </button>
          <button
            onClick={() => { setEditingCheck(undefined); setPreselectedCategory(undefined); setWizardOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Check hinzufügen
          </button>
        </div>
      </div>

      {/* ── Suggestions ────────────────────────────────────────── */}
      <CheckSuggestions />

      {/* ── Search + Filter bar ─────────────────────────────────── */}
      {checks.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Checks durchsuchen…"
                className="input-field pl-9 pr-8 text-sm w-full"
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
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`btn-ghost flex items-center gap-1.5 text-sm ${showFilters || hasActiveFilters ? "text-accent" : ""}`}
            >
              <Filter size={14} />
              Filter
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                  {[filterCategory, filterCriticality, filterValidity].filter(Boolean).length + (searchQuery ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter chips */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap p-3 bg-bg rounded-lg border border-border">
              <span className="text-xs text-text-muted font-medium">Kategorie:</span>
              {CATEGORIES.slice(0, 6).map(cat => (
                <FilterChip
                  key={cat.key}
                  label={cat.label}
                  active={filterCategory === cat.key}
                  onClick={() => setFilterCategory(prev => prev === cat.key ? "" : cat.key as CheckCategory)}
                />
              ))}
              <span className="text-xs text-text-muted font-medium ml-2">Schweregrad:</span>
              <FilterChip
                label="Fehler"
                active={filterCriticality === "error"}
                onClick={() => setFilterCriticality(prev => prev === "error" ? "" : "error")}
              />
              <FilterChip
                label="Warnung"
                active={filterCriticality === "warn"}
                onClick={() => setFilterCriticality(prev => prev === "warn" ? "" : "warn")}
              />
              <span className="text-xs text-text-muted font-medium ml-2">Status:</span>
              <FilterChip
                label="Gültig"
                active={filterValidity === "valid"}
                onClick={() => setFilterValidity(prev => prev === "valid" ? "" : "valid")}
              />
              <FilterChip
                label="Fehlerhaft"
                active={filterValidity === "invalid"}
                onClick={() => setFilterValidity(prev => prev === "invalid" ? "" : "invalid")}
              />
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-text-muted hover:text-error ml-auto flex items-center gap-1">
                  <X size={12} />
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bulk action bar ──────────────────────────────────────── */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
          <span className="text-sm font-medium text-accent">
            {selectedIds.size} ausgewählt
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleBulkSetCriticality("error")}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 flex items-center gap-1.5 transition-colors"
            >
              <AlertCircle size={12} />
              → Fehler
            </button>
            <button
              onClick={() => handleBulkSetCriticality("warn")}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle size={12} />
              → Warnung
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={12} />
              Löschen
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state with 3-step guide ─────────────────────────── */}
      {checks.length === 0 && (
        <div className="py-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-bg-elevated mx-auto mb-4 flex items-center justify-center">
              <CheckSquare size={28} className="text-text-muted" />
            </div>
            <h3 className="text-base font-medium text-text-primary mb-1">Noch keine Checks konfiguriert</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              In 3 Schritten zu deinem ersten Data-Quality-Check:
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            {[
              {
                step: "1",
                title: "Schema definieren",
                desc: 'Importiere dein Spaltenmodell im Reiter "Tabelle & Schema".',
                done: useCheckStore.getState().tableConfig.columns.length > 0,
              },
              {
                step: "2",
                title: "Check erstellen",
                desc: "Nutze den Wizard, eine Vorlage oder die automatischen Vorschläge.",
                done: false,
              },
              {
                step: "3",
                title: "Exportieren",
                desc: "Lade dein YAML/JSON herunter oder kopiere den Pipeline-Code.",
                done: false,
              },
            ].map(item => (
              <div key={item.step} className="card p-4 text-center space-y-2">
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-bold ${
                  item.done ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                }`}>
                  {item.done ? <CheckCircle size={16} /> : item.step}
                </div>
                <h4 className="text-sm font-medium text-text-primary">{item.title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setImportOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload size={15} />
              YAML importieren
            </button>
            <button
              onClick={() => setTemplateGalleryOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Layout size={15} />
              Vorlage wählen
            </button>
            <button
              onClick={() => { setEditingCheck(undefined); setPreselectedCategory(undefined); setWizardOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Ersten Check erstellen
            </button>
          </div>
        </div>
      )}

      {/* ── No results state ─────────────────────────────────────── */}
      {checks.length > 0 && filteredChecks.length === 0 && (
        <div className="text-center py-10 text-text-muted">
          <Search size={24} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Keine Checks gefunden.</p>
          <button onClick={clearFilters} className="text-xs text-accent mt-2 hover:underline">
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* ── Check list ───────────────────────────────────────────── */}
      {filteredChecks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={checks.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {/* Select all row */}
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {allFilteredSelected
                    ? <CheckSquare size={14} className="text-accent" />
                    : <Square size={14} />
                  }
                  {allFilteredSelected ? "Alle abwählen" : "Alle auswählen"}
                </button>
                {filteredChecks.length !== checks.length && (
                  <span className="text-xs text-text-muted">
                    ({filteredChecks.length} von {checks.length} angezeigt)
                  </span>
                )}
                {/* Validity summary */}
                <div className="ml-auto flex items-center gap-2">
                  {filteredChecks.filter(c => c.isValid).length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle size={12} />
                      {filteredChecks.filter(c => c.isValid).length}
                    </span>
                  )}
                  {filteredChecks.filter(c => !c.isValid).length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-error">
                      <AlertCircle size={12} />
                      {filteredChecks.filter(c => !c.isValid).length}
                    </span>
                  )}
                </div>
              </div>

              {/* Grouped by category */}
              {grouped.map(({ category, checks: catChecks }) => (
                <div key={category.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCategory(category.key)}
                      className="flex items-center gap-2 text-left group flex-1"
                    >
                      {collapsedCategories.has(category.key)
                        ? <ChevronRight size={14} className="text-text-muted" />
                        : <ChevronDown size={14} className="text-text-muted" />
                      }
                      <span className="section-title">{category.label}</span>
                      <span className="badge-neutral">{catChecks.length}</span>
                      {catChecks.some(c => !c.isValid) && (
                        <AlertTriangle size={12} className="text-warning" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCheck(undefined);
                        setPreselectedCategory(category.key as CheckCategory);
                        setWizardOpen(true);
                      }}
                      className="text-text-muted hover:text-accent transition-colors p-1 rounded hover:bg-accent/10"
                      title={`Check in "${category.label}" hinzufügen`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {!collapsedCategories.has(category.key) && (
                    <div className="space-y-2 pl-2">
                      {catChecks.map(check => (
                        <SortableCheckCard
                          key={check.id}
                          check={check}
                          onEdit={handleEdit}
                          onDuplicate={duplicateCheck}
                          onRemove={handleRemoveWithUndo}
                          selected={selectedIds.has(check.id)}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Uncategorized */}
              {uncategorized.length > 0 && (
                <div className="space-y-2">
                  <span className="section-title">Sonstige</span>
                  {uncategorized.map(check => (
                    <SortableCheckCard
                      key={check.id}
                      check={check}
                      onEdit={handleEdit}
                      onDuplicate={duplicateCheck}
                      onRemove={handleRemoveWithUndo}
                      selected={selectedIds.has(check.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Modals (lazy-loaded) ────────────────────────────────── */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-bg-surface border border-border rounded-xl px-5 py-4 shadow-xl">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Wird geladen...</span>
          </div>
        </div>
      }>
        {wizardOpen && (
          <CheckWizard
            editingCheck={editingCheck}
            preselectedCategory={preselectedCategory}
            onClose={() => {
              setWizardOpen(false);
              setEditingCheck(undefined);
              setPreselectedCategory(undefined);
            }}
          />
        )}
        {templateGalleryOpen && (
          <TemplateGallery onClose={() => setTemplateGalleryOpen(false)} />
        )}
        {importOpen && (
          <CheckImport onClose={() => setImportOpen(false)} />
        )}
      </Suspense>
    </div>
  );
}
