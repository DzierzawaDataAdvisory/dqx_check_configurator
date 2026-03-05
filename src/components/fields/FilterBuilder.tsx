import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";

interface FilterCondition {
  column: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { value: "=", label: "ist gleich" },
  { value: "!=", label: "ist nicht gleich" },
  { value: ">", label: "größer als" },
  { value: "<", label: "kleiner als" },
  { value: ">=", label: "größer oder gleich" },
  { value: "<=", label: "kleiner oder gleich" },
  { value: "IS NULL", label: "ist leer (NULL)" },
  { value: "IS NOT NULL", label: "ist nicht leer" },
  { value: "LIKE", label: "enthält" },
  { value: "IN", label: "ist in Liste" },
];

const NO_VALUE_OPS = new Set(["IS NULL", "IS NOT NULL"]);

function parseConditions(sql: string): FilterCondition[] | null {
  if (!sql.trim()) return [];
  const parts = sql.split(/\s+AND\s+/i);
  const conditions: FilterCondition[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    // IS NULL / IS NOT NULL
    const nullMatch = trimmed.match(/^(\w+)\s+(IS\s+NOT\s+NULL|IS\s+NULL)$/i);
    if (nullMatch) {
      conditions.push({ column: nullMatch[1], operator: nullMatch[2].toUpperCase().replace(/\s+/g, " "), value: "" });
      continue;
    }
    // Standard operator
    const opMatch = trimmed.match(/^(\w+)\s*(!=|>=|<=|=|>|<|LIKE|IN)\s*(.+)$/i);
    if (opMatch) {
      conditions.push({ column: opMatch[1], operator: opMatch[2].toUpperCase(), value: opMatch[3].replace(/^'|'$/g, "") });
      continue;
    }
    return null; // Can't parse
  }
  return conditions;
}

function conditionsToSql(conditions: FilterCondition[]): string {
  return conditions
    .filter(c => c.column)
    .map(c => {
      if (NO_VALUE_OPS.has(c.operator)) return `${c.column} ${c.operator}`;
      if (c.operator === "LIKE") return `${c.column} LIKE '%${c.value}%'`;
      if (c.operator === "IN") return `${c.column} IN (${c.value})`;
      const needsQuote = isNaN(Number(c.value));
      return needsQuote
        ? `${c.column} ${c.operator} '${c.value}'`
        : `${c.column} ${c.operator} ${c.value}`;
    })
    .join(" AND ");
}

interface FilterBuilderProps {
  value: string;
  onChange: (value: string) => void;
}

export function FilterBuilder({ value, onChange }: FilterBuilderProps) {
  const { tableConfig } = useCheckStore();
  const columns = tableConfig.columns;
  const [conditions, setConditions] = useState<FilterCondition[]>(() => {
    const parsed = parseConditions(value);
    return parsed && parsed.length > 0 ? parsed : [{ column: "", operator: "=", value: "" }];
  });

  function updateCondition(index: number, update: Partial<FilterCondition>) {
    const next = conditions.map((c, i) => i === index ? { ...c, ...update } : c);
    setConditions(next);
    onChange(conditionsToSql(next));
  }

  function addCondition() {
    const next = [...conditions, { column: "", operator: "=", value: "" }];
    setConditions(next);
  }

  function removeCondition(index: number) {
    const next = conditions.filter((_, i) => i !== index);
    setConditions(next.length === 0 ? [{ column: "", operator: "=", value: "" }] : next);
    onChange(conditionsToSql(next));
  }

  return (
    <div className="space-y-2">
      {conditions.map((cond, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-xs text-accent font-medium w-8 text-center flex-shrink-0">UND</span>
          )}
          {i === 0 && conditions.length > 1 && <span className="w-8 flex-shrink-0" />}

          {/* Column */}
          <div className="relative flex-1 min-w-0">
            <select
              value={cond.column}
              onChange={e => updateCondition(i, { column: e.target.value })}
              className="input-field text-xs pr-6 appearance-none w-full"
            >
              <option value="">Spalte…</option>
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Operator */}
          <div className="relative flex-1 min-w-0">
            <select
              value={cond.operator}
              onChange={e => updateCondition(i, { operator: e.target.value })}
              className="input-field text-xs pr-6 appearance-none w-full"
            >
              {OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Value */}
          {!NO_VALUE_OPS.has(cond.operator) && (
            <input
              value={cond.value}
              onChange={e => updateCondition(i, { value: e.target.value })}
              placeholder="Wert…"
              className="input-field text-xs flex-1 min-w-0"
            />
          )}

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeCondition(i)}
            className="text-text-muted hover:text-error transition-colors p-1 flex-shrink-0"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCondition}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
      >
        <Plus size={12} />
        Bedingung hinzufügen
      </button>
    </div>
  );
}
