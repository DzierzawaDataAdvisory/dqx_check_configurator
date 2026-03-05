import { useState } from "react";
import { Sparkles, Plus, X, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { suggestChecks } from "../../lib/columnAnalyzer";
import type { SuggestedCheck } from "../../lib/columnAnalyzer";
import { useCheckStore } from "../../hooks/useCheckStore";
import type { CheckFunction } from "../../types/dqx";
import type { CheckCategory } from "../../types/dqx";
import type { Criticality } from "../../types/dqx";

function getCategoryLabel(cat: CheckCategory): string {
  const labels: Record<CheckCategory, string> = {
    completeness: "Vollständigkeit",
    range: "Wertebereich",
    allowed_values: "Erlaubte Werte",
    pattern: "Format/Muster",
    date_time: "Datum/Zeit",
    json: "JSON",
    uniqueness: "Eindeutigkeit",
    referential_integrity: "Referenzintegrität",
    schema: "Schema",
    aggregation: "Aggregation",
    network: "Netzwerk",
    array: "Array",
    custom: "Benutzerdefiniert",
    comparison: "Vergleich",
  };
  return labels[cat] ?? cat;
}

function getCriticalityLabel(c: Criticality): string {
  return c === "error" ? "Fehler" : "Warnung";
}

interface SuggestionCardProps {
  suggestion: SuggestedCheck;
  onAccept: () => void;
  onDismiss: () => void;
}

function SuggestionCard({ suggestion, onAccept, onDismiss }: SuggestionCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-bg rounded-lg border border-border hover:border-accent/30 transition-colors group">
      <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <CheckCircle2 size={13} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs text-text-primary font-medium">{suggestion.checkFunction}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            suggestion.criticality === "error"
              ? "bg-error/10 text-error"
              : "bg-warning/10 text-warning"
          }`}>
            {getCriticalityLabel(suggestion.criticality)}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
            {getCategoryLabel(suggestion.category)}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{suggestion.reason}</p>
        {suggestion.column && (
          <p className="text-xs text-text-secondary mt-0.5">
            Spalte: <span className="font-mono text-accent">{suggestion.column}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onAccept}
          title="Check übernehmen"
          className="w-7 h-7 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent flex items-center justify-center transition-colors"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onDismiss}
          title="Vorschlag verwerfen"
          className="w-7 h-7 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-secondary flex items-center justify-center transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function CheckSuggestions() {
  const { tableConfig, addChecks } = useCheckStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const allSuggestions = suggestChecks(tableConfig.columns);
  const suggestionKey = (s: SuggestedCheck) => `${s.checkFunction}:${s.column}`;
  const visible = allSuggestions.filter(s => !dismissed.has(suggestionKey(s)));

  if (tableConfig.columns.length === 0 || visible.length === 0) return null;

  function handleAccept(suggestion: SuggestedCheck) {
    addChecks([{
      category: suggestion.category as CheckCategory,
      dqxCheck: {
        criticality: suggestion.criticality as Criticality,
        check: {
          function: suggestion.checkFunction as CheckFunction,
          arguments: suggestion.arguments,
        },
      },
    }]);
    setDismissed(prev => new Set([...prev, suggestionKey(suggestion)]));
  }

  function handleDismiss(suggestion: SuggestedCheck) {
    setDismissed(prev => new Set([...prev, suggestionKey(suggestion)]));
  }

  function handleAcceptAll() {
    addChecks(visible.map(s => ({
      category: s.category as CheckCategory,
      dqxCheck: {
        criticality: s.criticality as Criticality,
        check: {
          function: s.checkFunction as CheckFunction,
          arguments: s.arguments,
        },
      },
    })));
    setDismissed(prev => new Set([...prev, ...visible.map(suggestionKey)]));
  }

  function handleDismissAll() {
    setDismissed(prev => new Set([...prev, ...visible.map(suggestionKey)]));
  }

  return (
    <div className="mb-6 border border-accent/20 rounded-xl bg-accent/5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-accent" />
          <span className="text-sm font-semibold text-text-primary">
            Automatische Check-Vorschläge
          </span>
          <span className="px-2 py-0.5 rounded-full bg-accent text-white text-xs font-medium">
            {visible.length}
          </span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-text-muted">
            Basierend auf deinen Spalten-Definitionen wurden folgende Checks vorgeschlagen.
            Übernimm einzelne Vorschläge oder alle auf einmal.
          </p>

          <div className="space-y-2">
            {visible.map(suggestion => (
              <SuggestionCard
                key={suggestionKey(suggestion)}
                suggestion={suggestion}
                onAccept={() => handleAccept(suggestion)}
                onDismiss={() => handleDismiss(suggestion)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleAcceptAll} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} className="mr-1" />
              Alle {visible.length} übernehmen
            </button>
            <button onClick={handleDismissAll} className="btn-ghost text-xs text-text-muted">
              Alle verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
