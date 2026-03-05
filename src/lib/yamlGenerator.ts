import yaml from "js-yaml";
import type { CheckConfig } from "../types/dqx";

export function generateDqxYaml(checks: CheckConfig[]): string {
  const yamlChecks = checks.map((check) => buildCheckEntry(check));
  return yaml.dump(yamlChecks, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: "'",
  });
}

export function generateDqxJson(checks: CheckConfig[]): string {
  const jsonChecks = checks.map((check) => buildCheckEntry(check));
  return JSON.stringify(jsonChecks, null, 2);
}

function buildCheckEntry(check: CheckConfig): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    criticality: check.dqxCheck.criticality,
  };

  // Name nur setzen wenn explizit vergeben
  if (check.dqxCheck.name) {
    entry.name = check.dqxCheck.name;
  }

  // Filter nur setzen wenn vorhanden
  if (check.dqxCheck.filter) {
    entry.filter = check.dqxCheck.filter;
  }

  // user_metadata nur setzen wenn vorhanden
  if (check.dqxCheck.user_metadata && Object.keys(check.dqxCheck.user_metadata).length > 0) {
    entry.user_metadata = check.dqxCheck.user_metadata;
  }

  const checkEntry: Record<string, unknown> = {
    function: check.dqxCheck.check.function,
  };

  // Arguments nur setzen wenn vorhanden
  const args = check.dqxCheck.check.arguments;
  if (args) {
    const cleanedArgs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined && value !== null && value !== "") {
        // Typ-Konvertierung: numerische Strings als Zahlen
        if (typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "") {
          cleanedArgs[key] = Number(value);
        } else {
          cleanedArgs[key] = value;
        }
      }
    }
    if (Object.keys(cleanedArgs).length > 0) {
      checkEntry.arguments = cleanedArgs;
    }
  }

  // for_each_column statt column wenn Multi-Spalten
  if (check.dqxCheck.check.for_each_column && check.dqxCheck.check.for_each_column.length > 0) {
    // column aus arguments entfernen
    if (checkEntry.arguments && typeof checkEntry.arguments === "object") {
      const argsObj = checkEntry.arguments as Record<string, unknown>;
      delete argsObj.column;
      if (Object.keys(argsObj).length === 0) {
        delete checkEntry.arguments;
      }
    }
    checkEntry.for_each_column = check.dqxCheck.check.for_each_column;
  }

  entry.check = checkEntry;
  return entry;
}

export function generateDescription(check: CheckConfig): string {
  const args = check.dqxCheck.check.arguments || {};
  const forEachCol = check.dqxCheck.check.for_each_column;

  // Use check name if provided
  if (check.dqxCheck.name) return check.dqxCheck.name;

  const fn = check.dqxCheck.check.function;

  if (forEachCol && forEachCol.length > 0) {
    const colList = forEachCol.join(", ");
    return `Spalten [${colList}]: ${getFunctionLabel(fn)}`;
  }

  const col = args.column as string | undefined;
  const cols = args.columns as string[] | undefined;

  switch (fn) {
    // Completeness
    case "is_null": return col ? `"${col}" muss NULL sein` : "NULL-Check";
    case "is_not_null": return col ? `"${col}" darf nicht NULL sein` : "Nicht-NULL-Check";
    case "is_empty": return col ? `"${col}" muss leer sein` : "Leer-Check";
    case "is_not_empty": return col ? `"${col}" darf nicht leer sein` : "Nicht-leer-Check";
    case "is_null_or_empty": return col ? `"${col}" muss NULL oder leer sein` : "NULL-oder-leer-Check";
    case "is_not_null_and_not_empty": return col ? `"${col}" muss befüllt sein (nicht NULL, nicht leer)` : "Vollständigkeitsprüfung";
    case "is_not_null_and_is_in_list": return col ? `"${col}" darf nicht NULL sein und muss erlaubten Wert enthalten` : "Pflichtfeld mit erlaubten Werten";
    // Range
    case "is_in_range": return col ? `"${col}" muss zwischen ${args.min_limit ?? "?"} und ${args.max_limit ?? "?"} liegen` : "Wertebereich";
    case "is_not_in_range": return col ? `"${col}" muss außerhalb von ${args.min_limit ?? "?"} und ${args.max_limit ?? "?"} liegen` : "Verbotener Bereich";
    case "is_not_less_than": return col ? `"${col}" ≥ ${args.limit ?? "?"}` : "Mindestwert";
    case "is_not_greater_than": return col ? `"${col}" ≤ ${args.limit ?? "?"}` : "Maximalwert";
    case "is_equal_to": return col ? `"${col}" muss gleich ${args.value ?? "?"} sein` : "Gleichheitsprüfung";
    case "is_not_equal_to": return col ? `"${col}" darf nicht ${args.value ?? "?"} sein` : "Ungleichheitsprüfung";
    case "has_no_outliers": return col ? `"${col}" darf keine statistischen Ausreißer enthalten` : "Ausreißer-Prüfung";
    // Allowed Values
    case "is_in_list": return col ? `"${col}" muss erlaubten Wert enthalten` : "Werteliste";
    case "is_not_in_list": return col ? `"${col}" darf keinen verbotenen Wert enthalten` : "Verbotene Werte";
    // Pattern
    case "regex_match": return col ? `"${col}" muss Muster entsprechen` : "Musterprüfung";
    // Date/Time
    case "is_valid_date": return col ? `"${col}" muss gültiges Datum sein` : "Datumsvalidierung";
    case "is_valid_timestamp": return col ? `"${col}" muss gültiger Zeitstempel sein` : "Zeitstempelvalidierung";
    case "is_not_in_future": return col ? `"${col}" darf nicht in der Zukunft liegen` : "Zukunftsprüfung";
    case "is_not_in_near_future": return col ? `"${col}" darf nicht in naher Zukunft liegen` : "Nahe-Zukunft-Prüfung";
    case "is_older_than_n_days": return col ? `"${col}" muss älter als ${args.days ?? "?"} Tage sein` : "Alterscheck";
    case "is_older_than_col2_for_n_days": return args.column1 ? `"${args.column1}" muss mindestens ${args.days ?? "?"} Tage älter sein als "${args.column2 ?? "?"}"` : "Spaltenvergleich (Alter)";
    case "is_data_fresh": return col ? `"${col}" darf nicht älter als ${args.max_age_minutes ?? "?"} Minuten sein` : "Aktualitätsprüfung";
    case "is_data_fresh_per_time_window": return col ? `"${col}": mind. ${args.min_records_per_window ?? "?"} Datensätze pro ${args.window_minutes ?? "?"}-Min.-Fenster` : "Zeitfenster-Frische";
    // JSON
    case "is_valid_json": return col ? `"${col}" muss gültiges JSON sein` : "JSON-Validierung";
    case "has_json_keys": return col ? `"${col}" muss JSON-Schlüssel enthalten` : "JSON-Schlüssel";
    case "has_valid_json_schema": return col ? `"${col}" muss JSON-Schema entsprechen` : "JSON-Schema-Validierung";
    // Network
    case "is_valid_ipv4_address": return col ? `"${col}" muss gültige IPv4-Adresse sein` : "IPv4-Validierung";
    case "is_ipv4_address_in_cidr": return col ? `"${col}" muss in CIDR-Block ${args.cidr_block ?? "?"} liegen` : "IPv4 CIDR-Prüfung";
    case "is_valid_ipv6_address": return col ? `"${col}" muss gültige IPv6-Adresse sein` : "IPv6-Validierung";
    case "is_ipv6_address_in_cidr": return col ? `"${col}" muss in CIDR-Block ${args.cidr_block ?? "?"} liegen` : "IPv6 CIDR-Prüfung";
    // Array
    case "is_not_null_and_not_empty_array": return col ? `"${col}" muss nicht-leeres Array enthalten` : "Array-Prüfung";
    // Custom
    case "sql_expression": return args.expression ? `Eigene Bedingung: ${String(args.expression).substring(0, 50)}${String(args.expression).length > 50 ? "…" : ""}` : "Eigene SQL-Bedingung";
    case "sql_query": return args.msg ? String(args.msg) : "Eigene SQL-Abfrage";
    // Dataset-Level
    case "is_unique": return cols ? `Eindeutigkeit: [${cols.join(", ")}]` : "Eindeutigkeitsprüfung";
    case "foreign_key": return cols ? `Foreign Key: [${cols.join(", ")}] → ${args.ref_table ?? "?"}` : "Referentielle Integrität";
    case "has_valid_schema": return "Schema-Validierung";
    case "is_aggr_not_greater_than": return `${args.aggr_type ?? "Aggregat"} ≤ ${args.limit ?? "?"}`;
    case "is_aggr_not_less_than": return `${args.aggr_type ?? "Aggregat"} ≥ ${args.limit ?? "?"}`;
    case "is_aggr_equal": return `${args.aggr_type ?? "Aggregat"} = ${args.limit ?? "?"}`;
    case "is_aggr_not_equal": return `${args.aggr_type ?? "Aggregat"} ≠ ${args.limit ?? "?"}`;
    case "compare_datasets": return args.ref_table ? `Datensatz-Vergleich mit ${args.ref_table}` : "Datensatz-Vergleich";
    default: return fn;
  }
}

function getFunctionLabel(fn: string): string {
  const labels: Record<string, string> = {
    is_null: "Muss NULL sein",
    is_not_null: "Nicht NULL",
    is_empty: "Muss leer sein",
    is_not_empty: "Nicht leer",
    is_null_or_empty: "NULL oder leer",
    is_not_null_and_not_empty: "Vollständig",
    is_not_null_and_is_in_list: "Pflichtfeld mit erlaubten Werten",
    is_in_range: "Wertebereich",
    is_not_in_range: "Außerhalb Bereich",
    is_not_less_than: "Mindestwert",
    is_not_greater_than: "Maximalwert",
    is_equal_to: "Gleich",
    is_not_equal_to: "Ungleich",
    has_no_outliers: "Keine Ausreißer",
    is_in_list: "Erlaubte Werte",
    is_not_in_list: "Verbotene Werte",
    regex_match: "Musterprüfung",
    is_valid_date: "Gültiges Datum",
    is_valid_timestamp: "Gültiger Zeitstempel",
    is_not_in_future: "Nicht in Zukunft",
    is_not_in_near_future: "Nicht in naher Zukunft",
    is_older_than_n_days: "Älter als N Tage",
    is_older_than_col2_for_n_days: "Älter als Vergleichsspalte",
    is_data_fresh: "Datenaktualität",
    is_data_fresh_per_time_window: "Zeitfenster-Frische",
    is_valid_json: "Gültiges JSON",
    has_json_keys: "JSON-Schlüssel",
    has_valid_json_schema: "JSON-Schema",
    is_valid_ipv4_address: "IPv4-Adresse",
    is_ipv4_address_in_cidr: "IPv4 in Netzwerkbereich",
    is_valid_ipv6_address: "IPv6-Adresse",
    is_ipv6_address_in_cidr: "IPv6 in Netzwerkbereich",
    is_not_null_and_not_empty_array: "Array nicht leer",
    sql_expression: "Eigene Bedingung",
    sql_query: "Eigene SQL-Abfrage",
    is_unique: "Eindeutigkeit",
    foreign_key: "Referentielle Integrität",
    has_valid_schema: "Schema-Validierung",
    is_aggr_not_greater_than: "Aggregat ≤",
    is_aggr_not_less_than: "Aggregat ≥",
    is_aggr_equal: "Aggregat =",
    is_aggr_not_equal: "Aggregat ≠",
    compare_datasets: "Datensatz-Vergleich",
  };
  return labels[fn] || fn;
}
