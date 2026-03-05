import { useState } from "react";
import { ChevronDown, ChevronRight, XCircle, AlertTriangle, Filter, Columns } from "lucide-react";
import type { CheckConfig } from "../../types/dqx";
import { generateDqxYaml } from "../../lib/yamlGenerator";

interface YamlAnnotatedProps {
  checks: CheckConfig[];
}

export function YamlAnnotated({ checks }: YamlAnnotatedProps) {
  if (checks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm p-6">
        <p>Noch keine Checks konfiguriert.</p>
        <p className="text-xs mt-1">Erstelle einen Check, um hier eine Zusammenfassung zu sehen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {checks.map(check => (
        <AnnotatedCard key={check.id} check={check} />
      ))}
    </div>
  );
}

function AnnotatedCard({ check }: { check: CheckConfig }) {
  const [showYaml, setShowYaml] = useState(false);
  const isCritical = check.dqxCheck.criticality === "error";
  const args = check.dqxCheck.check.arguments || {};
  const forEachCols = check.dqxCheck.check.for_each_column;
  const hasForEach = forEachCols && forEachCols.length > 0;

  // Build human-readable summary lines
  const details: { label: string; value: string }[] = [];

  const col = args.column as string | undefined;
  if (col) details.push({ label: "Spalte", value: col });
  if (hasForEach) details.push({ label: "Spalten", value: forEachCols!.join(", ") });

  // Arguments
  const skipKeys = new Set(["column", "columns"]);
  const argLabels: Record<string, string> = {
    min_limit: "Minimum", max_limit: "Maximum", limit: "Grenzwert", value: "Wert",
    regex: "Muster", list: "Werteliste", days: "Tage", date_format: "Datumsformat",
    timestamp_format: "Zeitstempelformat", expression: "Ausdruck", query: "Abfrage",
    ref_table: "Referenz-Tabelle", ref_columns: "Referenz-Spalten",
    max_age_minutes: "Max. Alter (Min.)", cidr_block: "CIDR-Block",
    aggr_type: "Aggregatfunktion", window_minutes: "Zeitfenster (Min.)",
    min_records_per_window: "Min. Datensätze", json_schema: "JSON-Schema",
    json_keys: "JSON-Schlüssel", msg: "Fehlermeldung",
  };

  for (const [key, val] of Object.entries(args)) {
    if (skipKeys.has(key) || val === undefined || val === null || val === "") continue;
    const label = argLabels[key] || key;
    const displayVal = Array.isArray(val) ? val.join(", ") : String(val);
    details.push({ label, value: displayVal.length > 60 ? displayVal.substring(0, 57) + "…" : displayVal });
  }

  // Generate single-check YAML
  const singleYaml = generateDqxYaml([check]).trim();

  return (
    <div className={`rounded-lg border ${isCritical ? "border-error/20 bg-error/5" : "border-warning/20 bg-warning/5"} overflow-hidden`}>
      {/* Header */}
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 ${isCritical ? "text-error" : "text-warning"}`}>
            {isCritical ? <XCircle size={14} /> : <AlertTriangle size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary">
              {check.description || check.dqxCheck.check.function}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isCritical ? "bg-error/15 text-error" : "bg-warning/15 text-warning"}`}>
                {isCritical ? "Fehler" : "Warnung"}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {check.dqxCheck.check.function}
              </span>
              {check.dqxCheck.filter && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Filter size={10} /> Filter aktiv
                </span>
              )}
              {hasForEach && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Columns size={10} /> {forEachCols!.length} Spalten
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        {details.length > 0 && (
          <div className="mt-2 ml-6 space-y-0.5">
            {details.map((d, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-text-muted flex-shrink-0">{d.label}:</span>
                <span className="text-text-secondary font-mono truncate">{d.value}</span>
              </div>
            ))}
            {check.dqxCheck.filter && (
              <div className="flex gap-2 text-xs">
                <span className="text-text-muted flex-shrink-0">Filter:</span>
                <span className="text-text-secondary font-mono truncate">{check.dqxCheck.filter}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* YAML toggle */}
      <button
        type="button"
        onClick={() => setShowYaml(!showYaml)}
        className="w-full flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary border-t border-border/50 transition-colors"
      >
        {showYaml ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        YAML anzeigen
      </button>

      {showYaml && (
        <div className="px-3 pb-2.5">
          <pre className="text-xs font-mono text-text-secondary bg-bg rounded p-2 overflow-x-auto leading-relaxed">
            {singleYaml}
          </pre>
        </div>
      )}
    </div>
  );
}
