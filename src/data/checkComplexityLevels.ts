import type { CheckFunction } from "../types/dqx";

/**
 * Complexity levels for the Guided Check Wizard.
 * Checks are organized by how many data sources / columns they reference.
 */
export type ComplexityLevel = "single_attribute" | "cross_column" | "multi_source";

export interface ComplexityLevelMeta {
  key: ComplexityLevel;
  step: number;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  color: string;
}

export const COMPLEXITY_LEVELS: ComplexityLevelMeta[] = [
  {
    key: "single_attribute",
    step: 1,
    label: "Einzelattribut-Prüfungen",
    shortLabel: "Einzelattribut",
    description:
      "Checks, die sich auf eine einzelne Spalte beziehen: Wertebereiche, Formate, Vollständigkeit, Datentypen.",
    icon: "BoxSelect",
    color: "blue",
  },
  {
    key: "cross_column",
    step: 2,
    label: "Spaltenübergreifende Abhängigkeiten",
    shortLabel: "Spaltenübergreifend",
    description:
      "Checks, die mehrere Spalten innerhalb derselben Tabelle miteinander vergleichen oder in Beziehung setzen.",
    icon: "Columns",
    color: "amber",
  },
  {
    key: "multi_source",
    step: 3,
    label: "Tabellenübergreifende Prüfungen",
    shortLabel: "Tabellenübergreifend",
    description:
      "Checks, die Daten aus mehreren Tabellen oder Quellen miteinander vergleichen.",
    icon: "Database",
    color: "purple",
  },
];

/**
 * Maps each check function to its complexity level.
 */
export const CHECK_COMPLEXITY_MAP: Record<CheckFunction, ComplexityLevel> = {
  // ── Single Attribute ─────────────────────────────────────────────
  // Completeness
  is_not_null: "single_attribute",
  is_null: "single_attribute",
  is_not_empty: "single_attribute",
  is_empty: "single_attribute",
  is_not_null_and_not_empty: "single_attribute",
  is_null_or_empty: "single_attribute",
  is_not_null_and_is_in_list: "single_attribute",

  // Range
  is_in_range: "single_attribute",
  is_not_in_range: "single_attribute",
  is_not_less_than: "single_attribute",
  is_not_greater_than: "single_attribute",
  is_equal_to: "single_attribute",
  is_not_equal_to: "single_attribute",

  // Allowed Values
  is_in_list: "single_attribute",
  is_not_in_list: "single_attribute",

  // Pattern
  regex_match: "single_attribute",

  // Date/Time (single column)
  is_valid_date: "single_attribute",
  is_valid_timestamp: "single_attribute",
  is_not_in_future: "single_attribute",
  is_not_in_near_future: "single_attribute",
  is_older_than_n_days: "single_attribute",

  // JSON
  is_valid_json: "single_attribute",
  has_json_keys: "single_attribute",
  has_valid_json_schema: "single_attribute",

  // Network
  is_valid_ipv4_address: "single_attribute",
  is_ipv4_address_in_cidr: "single_attribute",
  is_valid_ipv6_address: "single_attribute",
  is_ipv6_address_in_cidr: "single_attribute",

  // Array
  is_not_null_and_not_empty_array: "single_attribute",

  // Single-column outliers
  has_no_outliers: "single_attribute",

  // ── Cross-Column (Inline Dependencies) ───────────────────────────
  is_older_than_col2_for_n_days: "cross_column",
  sql_expression: "cross_column",
  is_unique: "cross_column",
  is_aggr_not_greater_than: "cross_column",
  is_aggr_not_less_than: "cross_column",
  is_aggr_equal: "cross_column",
  is_aggr_not_equal: "cross_column",
  is_data_fresh: "cross_column",
  is_data_fresh_per_time_window: "cross_column",

  // ── Multi-Table / Multi-Source ───────────────────────────────────
  foreign_key: "multi_source",
  compare_datasets: "multi_source",
  has_valid_schema: "multi_source",
  sql_query: "multi_source",
};

/**
 * Returns the complexity level for a given check function.
 */
export function getComplexityLevel(fn: CheckFunction): ComplexityLevel {
  return CHECK_COMPLEXITY_MAP[fn];
}

/**
 * Returns the metadata for a complexity level.
 */
export function getComplexityMeta(level: ComplexityLevel): ComplexityLevelMeta {
  return COMPLEXITY_LEVELS.find((l) => l.key === level)!;
}
