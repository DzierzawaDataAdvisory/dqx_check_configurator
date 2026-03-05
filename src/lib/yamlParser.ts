import yaml from "js-yaml";
import { v4 as uuidv4 } from "uuid";
import type { CheckConfig, CheckCategory, DQXCheck, CheckFunction } from "../types/dqx";
import { validateCheck } from "./checkValidator";
import { generateDescription } from "./yamlGenerator";

// ─── Kategorie-Inferenz ───────────────────────────────────────────
const FUNCTION_CATEGORY: Record<string, CheckCategory> = {
  // Completeness
  is_null: "completeness",
  is_not_null: "completeness",
  is_empty: "completeness",
  is_not_empty: "completeness",
  is_null_or_empty: "completeness",
  is_not_null_and_not_empty: "completeness",
  is_not_null_and_is_in_list: "completeness",
  // Range
  is_in_range: "range",
  is_not_in_range: "range",
  is_not_less_than: "range",
  is_not_greater_than: "range",
  is_equal_to: "range",
  is_not_equal_to: "range",
  has_no_outliers: "range",
  // Allowed values
  is_in_list: "allowed_values",
  is_not_in_list: "allowed_values",
  // Pattern
  regex_match: "pattern",
  // Date / Time
  is_valid_date: "date_time",
  is_valid_timestamp: "date_time",
  is_not_in_future: "date_time",
  is_not_in_near_future: "date_time",
  is_older_than_n_days: "date_time",
  is_older_than_col2_for_n_days: "date_time",
  is_data_fresh: "date_time",
  is_data_fresh_per_time_window: "date_time",
  // JSON
  is_valid_json: "json",
  has_json_keys: "json",
  has_valid_json_schema: "json",
  // Network
  is_valid_ipv4_address: "network",
  is_ipv4_address_in_cidr: "network",
  is_valid_ipv6_address: "network",
  is_ipv6_address_in_cidr: "network",
  // Array
  is_not_null_and_not_empty_array: "array",
  // Custom
  sql_expression: "custom",
  sql_query: "custom",
  // Dataset
  is_unique: "uniqueness",
  foreign_key: "referential_integrity",
  has_valid_schema: "schema",
  is_aggr_not_greater_than: "aggregation",
  is_aggr_not_less_than: "aggregation",
  is_aggr_equal: "aggregation",
  is_aggr_not_equal: "aggregation",
  compare_datasets: "comparison",
};

function inferCategory(fn: string): CheckCategory {
  return FUNCTION_CATEGORY[fn] ?? "custom";
}

function isValidCriticality(val: unknown): val is "error" | "warn" {
  return val === "error" || val === "warn";
}

// ─── Public types ─────────────────────────────────────────────────
export interface ParseResult {
  checks: CheckConfig[];
  /** Parse- oder Strukturfehler, die den Import blockieren */
  errors: string[];
  /** Warnungen (Check importiert, aber mit Einschränkungen) */
  warnings: string[];
}

// ─── Parser ───────────────────────────────────────────────────────
/**
 * Parst einen YAML- oder JSON-String und gibt ein Array von CheckConfig-Objekten zurück.
 * Format "auto" erkennt JSON anhand des ersten Zeichens, sonst YAML.
 */
export function parseDqxContent(
  content: string,
  format: "yaml" | "json" | "auto" = "auto"
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: CheckConfig[] = [];

  if (!content.trim()) {
    return { checks: [], errors: ["Kein Inhalt zum Parsen."], warnings: [] };
  }

  // ── Format bestimmen ────────────────────────────────────────────
  const effectiveFormat: "yaml" | "json" =
    format === "auto"
      ? content.trim().startsWith("{") || content.trim().startsWith("[")
        ? "json"
        : "yaml"
      : format;

  // ── Raw parsen ──────────────────────────────────────────────────
  let rawData: unknown;
  try {
    rawData =
      effectiveFormat === "json" ? JSON.parse(content) : yaml.load(content);
  } catch (e) {
    return {
      checks: [],
      errors: [`Parsing-Fehler: ${(e as Error).message}`],
      warnings: [],
    };
  }

  // ── Array extrahieren ───────────────────────────────────────────
  if (!Array.isArray(rawData)) {
    if (rawData && typeof rawData === "object") {
      const obj = rawData as Record<string, unknown>;
      // Suche nach einem Array-Wert (z.B. { checks: [...], quality_checks: [...] })
      const candidate = Object.values(obj).find((v) => Array.isArray(v));
      if (candidate) {
        rawData = candidate;
        warnings.push(
          "Checks wurden aus dem Objekt-Wrapper extrahiert (erster Array-Wert)."
        );
      } else {
        return {
          checks: [],
          errors: [
            "Ungültiges Format: Erwartet eine Liste von Checks auf oberster Ebene.",
          ],
          warnings: [],
        };
      }
    } else {
      return {
        checks: [],
        errors: [
          "Ungültiges Format: Erwartet eine Liste von Checks auf oberster Ebene.",
        ],
        warnings: [],
      };
    }
  }

  const rawArray = rawData as unknown[];
  if (rawArray.length === 0) {
    return { checks: [], errors: ["Die Liste enthält keine Einträge."], warnings: [] };
  }

  // ── Einträge verarbeiten ─────────────────────────────────────────
  for (let i = 0; i < rawArray.length; i++) {
    const raw = rawArray[i];
    const label = `Eintrag ${i + 1}`;

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`${label}: Kein gültiges Objekt – übersprungen.`);
      continue;
    }

    const entry = raw as Record<string, unknown>;

    // check-Block prüfen
    if (!entry.check || typeof entry.check !== "object" || Array.isArray(entry.check)) {
      errors.push(`${label}: Fehlendes oder ungültiges 'check'-Feld – übersprungen.`);
      continue;
    }

    const checkBlock = entry.check as Record<string, unknown>;

    if (!checkBlock.function || typeof checkBlock.function !== "string") {
      errors.push(`${label}: Fehlendes oder ungültiges 'check.function' – übersprungen.`);
      continue;
    }

    const fn = checkBlock.function as string;

    if (!FUNCTION_CATEGORY[fn]) {
      warnings.push(
        `${label}: Unbekannte Funktion '${fn}' – wird als Kategorie 'custom' importiert.`
      );
    }

    // Criticality
    const criticality = isValidCriticality(entry.criticality)
      ? entry.criticality
      : "error";
    if (!isValidCriticality(entry.criticality)) {
      warnings.push(
        `${label}: Ungültiger criticality-Wert '${String(entry.criticality)}' – 'error' wird verwendet.`
      );
    }

    // DQXCheck zusammenbauen
    const dqxCheck: DQXCheck = {
      criticality,
      check: { function: fn as CheckFunction },
    };

    if (entry.name && typeof entry.name === "string" && entry.name.trim()) {
      dqxCheck.name = entry.name.trim();
    }
    if (entry.filter && typeof entry.filter === "string" && entry.filter.trim()) {
      dqxCheck.filter = entry.filter.trim();
    }
    if (
      entry.user_metadata &&
      typeof entry.user_metadata === "object" &&
      !Array.isArray(entry.user_metadata)
    ) {
      dqxCheck.user_metadata = entry.user_metadata as Record<string, string>;
    }
    if (checkBlock.arguments && typeof checkBlock.arguments === "object" && !Array.isArray(checkBlock.arguments)) {
      dqxCheck.check.arguments = checkBlock.arguments as Record<string, unknown>;
    }
    if (Array.isArray(checkBlock.for_each_column) && checkBlock.for_each_column.length > 0) {
      dqxCheck.check.for_each_column = checkBlock.for_each_column as string[];
    }

    // CheckConfig bauen
    const checkConfig: CheckConfig = {
      id: uuidv4(),
      dqxCheck,
      category: inferCategory(fn),
      isValid: false,
      description: "",
    };

    const validation = validateCheck(checkConfig);
    checkConfig.isValid = validation.isValid;
    checkConfig.description = generateDescription(checkConfig);

    if (!validation.isValid) {
      warnings.push(
        `${label} (${fn}): Unvollständig – ${validation.errors[0]}. Check wird trotzdem importiert.`
      );
    }

    checks.push(checkConfig);
  }

  return { checks, errors, warnings };
}
