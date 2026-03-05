import { useState } from "react";
import { Code, LayoutGrid, AlertCircle } from "lucide-react";
import { FilterBuilder } from "./FilterBuilder";
import { validateFilter } from "../../lib/filterValidator";
import { useCheckStore } from "../../hooks/useCheckStore";

interface FilterEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function FilterEditor({ value, onChange }: FilterEditorProps) {
  const [mode, setMode] = useState<"visual" | "raw">("visual");
  const { tableConfig } = useCheckStore();
  const columnNames = tableConfig.columns.map(c => c.name);

  const validation = validateFilter(value, columnNames);

  const examples = [
    { label: "Nur aktive Kunden", filter: "status = 'aktiv'" },
    { label: "Kunden aus Deutschland", filter: "country_code = 'DE'" },
    { label: "Mit Bestellungen", filter: "order_count > 0" },
    { label: "Letztes Jahr", filter: "YEAR(created_at) = YEAR(CURRENT_DATE) - 1" },
  ];

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-bg rounded-lg p-0.5 border border-border">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "visual"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <LayoutGrid size={12} />
            Visuell
          </button>
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "raw"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Code size={12} />
            SQL
          </button>
        </div>
        {value && !validation.error && (
          <span className="text-xs text-success font-medium">Filter aktiv</span>
        )}
      </div>

      {mode === "visual" ? (
        <FilterBuilder value={value} onChange={onChange} />
      ) : (
        <div className="space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Spark SQL Expression, z.B. status = 'aktiv'"
            className={`input-field text-sm font-mono ${!validation.valid ? "border-error" : ""}`}
          />
          <div className="flex flex-wrap gap-1.5">
            {examples.map(ex => (
              <button
                key={ex.filter}
                type="button"
                onClick={() => onChange(ex.filter)}
                className="text-xs bg-bg border border-border rounded px-2 py-1 text-text-muted hover:text-text-primary hover:border-accent transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation feedback */}
      {value && validation.error && (
        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
          validation.valid ? "bg-warning/5 border border-warning/20 text-warning" : "bg-error/5 border border-error/20 text-error"
        }`}>
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">{validation.error}</span>
            {validation.suggestion && (
              <p className="mt-0.5 opacity-80">{validation.suggestion}</p>
            )}
          </div>
        </div>
      )}

      {/* Show generated SQL in visual mode for transparency */}
      {mode === "visual" && value && !validation.error && (
        <div className="bg-bg rounded-lg px-3 py-2 border border-border">
          <span className="text-xs text-text-muted">Generiertes SQL: </span>
          <code className="text-xs font-mono text-text-secondary">{value}</code>
        </div>
      )}
    </div>
  );
}
