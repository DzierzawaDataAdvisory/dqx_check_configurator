import { useState, useRef, useEffect } from "react";
import { Plus, Check, Zap } from "lucide-react";
import { CHECK_REGISTRY } from "../../data/checkRegistry";
import type { CheckRegistryEntry } from "../../data/checkRegistry";
import type { ColumnInfo } from "../../types/dqx";
import { useCheckStore } from "../../hooks/useCheckStore";
import { getIconForCheck } from "./CheckCard";

/** Maps data types to the most relevant check categories & functions */
function getRelevantChecks(column: ColumnInfo): CheckRegistryEntry[] {
  const dt = column.dataType;
  const relevant: CheckRegistryEntry[] = [];

  // Always suggest completeness checks
  const notNull = CHECK_REGISTRY.find(c => c.function === "is_not_null");
  const notNullAndNotEmpty = CHECK_REGISTRY.find(c => c.function === "is_not_null_and_not_empty");
  if (!column.nullable && notNull) relevant.push(notNull);
  if (column.nullable && notNullAndNotEmpty) relevant.push(notNullAndNotEmpty);

  // Type-specific suggestions
  if (dt === "string") {
    const inList = CHECK_REGISTRY.find(c => c.function === "is_in_list");
    const regex = CHECK_REGISTRY.find(c => c.function === "regex_match");
    const notEmpty = CHECK_REGISTRY.find(c => c.function === "is_not_empty");
    if (notEmpty) relevant.push(notEmpty);
    if (inList) relevant.push(inList);
    if (regex) relevant.push(regex);
  }

  if (["integer", "long", "double", "float", "decimal"].includes(dt)) {
    const inRange = CHECK_REGISTRY.find(c => c.function === "is_in_range");
    const notLess = CHECK_REGISTRY.find(c => c.function === "is_not_less_than");
    if (inRange) relevant.push(inRange);
    if (notLess) relevant.push(notLess);
  }

  if (dt === "date") {
    const validDate = CHECK_REGISTRY.find(c => c.function === "is_valid_date");
    const notFuture = CHECK_REGISTRY.find(c => c.function === "is_not_in_future");
    if (validDate) relevant.push(validDate);
    if (notFuture) relevant.push(notFuture);
  }

  if (dt === "timestamp") {
    const validTs = CHECK_REGISTRY.find(c => c.function === "is_valid_timestamp");
    const notFuture = CHECK_REGISTRY.find(c => c.function === "is_not_in_future");
    const fresh = CHECK_REGISTRY.find(c => c.function === "is_data_fresh");
    if (validTs) relevant.push(validTs);
    if (notFuture) relevant.push(notFuture);
    if (fresh) relevant.push(fresh);
  }

  if (dt === "boolean") {
    const inList = CHECK_REGISTRY.find(c => c.function === "is_in_list");
    if (inList) relevant.push(inList);
  }

  if (dt === "array") {
    const notEmptyArr = CHECK_REGISTRY.find(c => c.function === "is_not_null_and_not_empty_array");
    if (notEmptyArr) relevant.push(notEmptyArr);
  }

  // Uniqueness is generally useful
  const unique = CHECK_REGISTRY.find(c => c.function === "is_unique");
  if (unique) relevant.push(unique);

  // Deduplicate and limit to 6
  const seen = new Set<string>();
  return relevant.filter(c => {
    if (seen.has(c.function)) return false;
    seen.add(c.function);
    return true;
  }).slice(0, 6);
}

/** Simple checks that can be instantly created (only need a column) */
const INSTANT_CHECKS = new Set([
  "is_not_null", "is_null", "is_not_empty", "is_empty",
  "is_not_null_and_not_empty", "is_null_or_empty",
  "is_not_null_and_not_empty_array",
  "is_not_in_future",
]);

interface QuickAddMenuProps {
  column: ColumnInfo;
}

export function QuickAddMenu({ column }: QuickAddMenuProps) {
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { addCheck, setCurrentView, setWizardOpen } = useCheckStore();

  const relevantChecks = getRelevantChecks(column);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleInstantAdd(entry: CheckRegistryEntry) {
    const args: Record<string, unknown> = { column: column.name };
    // Set defaults for required fields (other than column)
    for (const field of entry.fields) {
      if (field.key !== "column" && field.defaultValue !== undefined) {
        args[field.key] = field.defaultValue;
      }
    }

    addCheck({
      dqxCheck: {
        criticality: "error",
        check: {
          function: entry.function,
          arguments: args,
        },
      },
      category: entry.category,
    });

    setJustAdded(entry.function);
    setTimeout(() => setJustAdded(null), 1500);
  }

  function handleOpenWizard(entry: CheckRegistryEntry) {
    // Store a hint in sessionStorage so the wizard can pre-fill
    sessionStorage.setItem("quickAddContext", JSON.stringify({
      column: column.name,
      category: entry.category,
      function: entry.function,
    }));
    setOpen(false);
    setCurrentView("checks");
    // Small delay to let the view switch happen
    setTimeout(() => setWizardOpen(true), 50);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-text-muted hover:text-accent transition-colors p-1 rounded hover:bg-accent/10"
        title={`Check für "${column.name}" hinzufügen`}
      >
        <Plus size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-accent" />
              <span className="text-xs font-medium text-text-primary">
                Check für <code className="font-mono text-accent">{column.name}</code>
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {relevantChecks.map(entry => {
              const isInstant = INSTANT_CHECKS.has(entry.function);
              const wasAdded = justAdded === entry.function;

              return (
                <button
                  key={entry.function}
                  onClick={() => {
                    if (isInstant) {
                      handleInstantAdd(entry);
                    } else {
                      handleOpenWizard(entry);
                    }
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-bg-hover transition-colors flex items-start gap-2.5 group"
                >
                  <div className="w-6 h-6 rounded bg-bg flex items-center justify-center text-text-muted group-hover:text-accent flex-shrink-0 mt-0.5">
                    {wasAdded ? <Check size={13} className="text-success" /> : getIconForCheck(entry.icon, 13)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-text-primary group-hover:text-accent transition-colors">
                        {entry.displayName}
                      </span>
                      {isInstant && !wasAdded && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                          Sofort
                        </span>
                      )}
                      {wasAdded && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                          Hinzugefügt!
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{entry.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {relevantChecks.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-text-muted">
              Keine Vorschläge für diesen Datentyp
            </div>
          )}
        </div>
      )}
    </div>
  );
}
