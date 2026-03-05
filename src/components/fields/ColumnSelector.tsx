import { ChevronDown } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";

interface ColumnSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowStar?: boolean;
}

export function ColumnSelector({ value, onChange, placeholder = "Spalte wählen…", allowStar = false }: ColumnSelectorProps) {
  const { tableConfig } = useCheckStore();
  const columns = tableConfig.columns;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field text-sm pr-8 appearance-none"
      >
        <option value="">{placeholder}</option>
        {allowStar && <option value="*">* (alle Zeilen)</option>}
        {columns.map((col) => (
          <option key={col.name} value={col.name}>
            {col.name} ({col.dataType})
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  );
}

interface ColumnMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function ColumnMultiSelect({ value, onChange, placeholder = "Spalten wählen…" }: ColumnMultiSelectProps) {
  const { tableConfig } = useCheckStore();
  const columns = tableConfig.columns;

  function toggleColumn(name: string) {
    if (value.includes(name)) {
      onChange(value.filter(v => v !== name));
    } else {
      onChange([...value, name]);
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(col => (
            <span
              key={col}
              className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-1 rounded-md"
            >
              <span className="font-mono">{col}</span>
              <button
                onClick={() => onChange(value.filter(v => v !== col))}
                className="hover:text-white transition-colors leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
        {columns.length === 0 ? (
          <div className="p-3 text-xs text-text-muted text-center">
            Keine Spalten definiert. Bitte zuerst Schema importieren.
          </div>
        ) : (
          columns.map(col => (
            <label
              key={col.name}
              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                value.includes(col.name)
                  ? "bg-accent/10"
                  : "hover:bg-bg-elevated"
              }`}
            >
              <input
                type="checkbox"
                checked={value.includes(col.name)}
                onChange={() => toggleColumn(col.name)}
                className="rounded accent-accent"
              />
              <span className="font-mono text-sm text-text-primary">{col.name}</span>
              <span className="text-xs text-text-muted ml-auto">{col.dataType}</span>
            </label>
          ))
        )}
      </div>
      {columns.length === 0 && (
        <p className="text-xs text-text-muted">{placeholder}</p>
      )}
    </div>
  );
}
