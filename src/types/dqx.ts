// Criticality-Level wie in DQX
export type Criticality = "error" | "warn";

// Alle unterstützten Check-Funktionen
export type CheckFunction =
  // Completeness
  | "is_not_null"
  | "is_null"
  | "is_not_empty"
  | "is_empty"
  | "is_not_null_and_not_empty"
  | "is_null_or_empty"
  | "is_not_null_and_is_in_list"
  // Range & Comparison
  | "is_in_range"
  | "is_not_in_range"
  | "is_not_less_than"
  | "is_not_greater_than"
  | "is_equal_to"
  | "is_not_equal_to"
  // Allowed/Forbidden Values
  | "is_in_list"
  | "is_not_in_list"
  // Pattern
  | "regex_match"
  // Date/Time
  | "is_valid_date"
  | "is_valid_timestamp"
  | "is_not_in_future"
  | "is_not_in_near_future"
  | "is_older_than_n_days"
  | "is_older_than_col2_for_n_days"
  | "is_data_fresh"
  // JSON
  | "is_valid_json"
  | "has_json_keys"
  | "has_valid_json_schema"
  // Network
  | "is_valid_ipv4_address"
  | "is_ipv4_address_in_cidr"
  | "is_valid_ipv6_address"
  | "is_ipv6_address_in_cidr"
  // Array
  | "is_not_null_and_not_empty_array"
  // Custom
  | "sql_expression"
  | "sql_query"
  // Dataset-Level
  | "is_unique"
  | "foreign_key"
  | "has_valid_schema"
  | "is_aggr_not_greater_than"
  | "is_aggr_not_less_than"
  | "is_aggr_equal"
  | "is_aggr_not_equal"
  | "has_no_outliers"
  | "is_data_fresh_per_time_window"
  | "compare_datasets";

// Entspricht dem DQX-Metadata-Format (Ziel-Output!)
export interface DQXCheck {
  name?: string;
  criticality: Criticality;
  filter?: string;
  user_metadata?: Record<string, string>;
  check: {
    function: CheckFunction;
    arguments?: Record<string, unknown>;
    for_each_column?: string[];
  };
}

// UI-State für einen Check (erweitert um UI-spezifische Felder)
export interface CheckConfig {
  id: string; // UUID für UI-Tracking
  dqxCheck: DQXCheck;
  // UI-only:
  description?: string; // Menschenlesbare Beschreibung
  category: CheckCategory;
  isValid: boolean;
}

export type CheckCategory =
  | "completeness"
  | "range"
  | "allowed_values"
  | "pattern"
  | "date_time"
  | "json"
  | "uniqueness"
  | "referential_integrity"
  | "schema"
  | "aggregation"
  | "network"
  | "array"
  | "custom"
  | "comparison";

// Spalten-Metadaten
export interface ColumnInfo {
  name: string;
  dataType: "string" | "integer" | "long" | "double" | "float" | "decimal" | "boolean" | "date" | "timestamp" | "binary" | "array" | "struct" | "map";
  nullable: boolean;
  description?: string;
}

// Tabellen-Kontext
export interface TableConfig {
  catalog: string;
  schema: string;
  table: string;
  columns: ColumnInfo[];
}

export type View = "table" | "checks" | "export";

// Check-Set: alle Checks und das Schema für eine Tabelle
export interface CheckSet {
  id: string;
  name: string;
  tableConfig: TableConfig;
  checks: CheckConfig[];
  createdAt: number;
  updatedAt: number;
}
