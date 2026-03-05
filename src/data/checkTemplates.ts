import type { CheckCategory } from "../types/dqx";
import type { Criticality } from "../types/dqx";
import type { CheckFunction } from "../types/dqx";

export interface TemplateCheck {
  category: CheckCategory;
  criticality: Criticality;
  checkFunction: CheckFunction;
  arguments: Record<string, unknown>;
  /** Spaltennamen, die beim Anwenden gemappt werden müssen */
  placeholderColumns: string[];
}

export interface CheckTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  checks: TemplateCheck[];
}

export const CHECK_TEMPLATES: CheckTemplate[] = [
  {
    id: "customer_master",
    name: "Kunden-Stammdaten",
    description: "Standardprüfungen für Kunden-Stammdatentabellen: Pflichtfelder, E-Mail-Format, PLZ-Format und Eindeutigkeit.",
    category: "Vertrieb",
    icon: "Users",
    checks: [
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null_and_not_empty",
        arguments: { column: "customer_id" },
        placeholderColumns: ["customer_id"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null_and_not_empty",
        arguments: { column: "name" },
        placeholderColumns: ["name"],
      },
      {
        category: "uniqueness",
        criticality: "error",
        checkFunction: "is_unique",
        arguments: { columns: ["customer_id"], nulls_distinct: true },
        placeholderColumns: ["customer_id"],
      },
      {
        category: "pattern",
        criticality: "warn",
        checkFunction: "regex_match",
        arguments: { column: "email", regex: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$" },
        placeholderColumns: ["email"],
      },
      {
        category: "pattern",
        criticality: "warn",
        checkFunction: "regex_match",
        arguments: { column: "plz", regex: "^[0-9]{5}$" },
        placeholderColumns: ["plz"],
      },
    ],
  },
  {
    id: "financial_transactions",
    name: "Finanztransaktionen",
    description: "Prüfungen für Buchungs- und Transaktionsdaten: Pflichtfelder, positive Beträge, keine Zukunftsdaten und Eindeutigkeit.",
    category: "Finanzen",
    icon: "Receipt",
    checks: [
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null",
        arguments: { column: "transaction_id" },
        placeholderColumns: ["transaction_id"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null",
        arguments: { column: "amount" },
        placeholderColumns: ["amount"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null",
        arguments: { column: "transaction_date" },
        placeholderColumns: ["transaction_date"],
      },
      {
        category: "uniqueness",
        criticality: "error",
        checkFunction: "is_unique",
        arguments: { columns: ["transaction_id"], nulls_distinct: true },
        placeholderColumns: ["transaction_id"],
      },
      {
        category: "range",
        criticality: "error",
        checkFunction: "is_not_less_than",
        arguments: { column: "amount", limit: 0 },
        placeholderColumns: ["amount"],
      },
      {
        category: "date_time",
        criticality: "warn",
        checkFunction: "is_not_in_future",
        arguments: { column: "transaction_date" },
        placeholderColumns: ["transaction_date"],
      },
    ],
  },
  {
    id: "product_catalog",
    name: "Produkt-Katalog",
    description: "Qualitätsprüfungen für Produktstammdaten: Pflichtfelder, Preisvalidierung, Lagerbestand und Kategorien.",
    category: "Einkauf",
    icon: "ShoppingBag",
    checks: [
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null_and_not_empty",
        arguments: { column: "product_id" },
        placeholderColumns: ["product_id"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null_and_not_empty",
        arguments: { column: "product_name" },
        placeholderColumns: ["product_name"],
      },
      {
        category: "uniqueness",
        criticality: "error",
        checkFunction: "is_unique",
        arguments: { columns: ["product_id"], nulls_distinct: true },
        placeholderColumns: ["product_id"],
      },
      {
        category: "range",
        criticality: "error",
        checkFunction: "is_not_less_than",
        arguments: { column: "price", limit: 0 },
        placeholderColumns: ["price"],
      },
      {
        category: "range",
        criticality: "warn",
        checkFunction: "is_not_less_than",
        arguments: { column: "stock_quantity", limit: 0 },
        placeholderColumns: ["stock_quantity"],
      },
      {
        category: "aggregation",
        criticality: "warn",
        checkFunction: "is_aggr_not_less_than",
        arguments: { aggr_type: "count", limit: 1 },
        placeholderColumns: [],
      },
    ],
  },
  {
    id: "iot_sensor_data",
    name: "IoT-Sensordaten",
    description: "Prüfungen für Zeitreihendaten aus Sensoren: Aktualität, Wertebereich und Datenlücken.",
    category: "IoT",
    icon: "Cpu",
    checks: [
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null",
        arguments: { column: "sensor_id" },
        placeholderColumns: ["sensor_id"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null",
        arguments: { column: "timestamp" },
        placeholderColumns: ["timestamp"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null",
        arguments: { column: "value" },
        placeholderColumns: ["value"],
      },
      {
        category: "date_time",
        criticality: "error",
        checkFunction: "is_not_in_future",
        arguments: { column: "timestamp" },
        placeholderColumns: ["timestamp"],
      },
      {
        category: "date_time",
        criticality: "error",
        checkFunction: "is_data_fresh",
        arguments: { column: "timestamp", max_age_minutes: 60 },
        placeholderColumns: ["timestamp"],
      },
      {
        category: "range",
        criticality: "warn",
        checkFunction: "has_no_outliers",
        arguments: { column: "value" },
        placeholderColumns: ["value"],
      },
    ],
  },
  {
    id: "employee_data",
    name: "Mitarbeiter-Daten",
    description: "Stammdaten-Prüfungen für HR-Systeme: Pflichtfelder, Datumslogik und Abteilungszuordnung.",
    category: "HR",
    icon: "UserCheck",
    checks: [
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null_and_not_empty",
        arguments: { column: "employee_id" },
        placeholderColumns: ["employee_id"],
      },
      {
        category: "completeness",
        criticality: "error",
        checkFunction: "is_not_null_and_not_empty",
        arguments: { column: "last_name" },
        placeholderColumns: ["last_name"],
      },
      {
        category: "uniqueness",
        criticality: "error",
        checkFunction: "is_unique",
        arguments: { columns: ["employee_id"], nulls_distinct: true },
        placeholderColumns: ["employee_id"],
      },
      {
        category: "date_time",
        criticality: "error",
        checkFunction: "is_not_in_future",
        arguments: { column: "hire_date" },
        placeholderColumns: ["hire_date"],
      },
      {
        category: "completeness",
        criticality: "warn",
        checkFunction: "is_not_null",
        arguments: { column: "department" },
        placeholderColumns: ["department"],
      },
    ],
  },
];

/** Alle Platzhalter-Spalten einer Vorlage – dedupliziert */
export function getTemplatePlaceholderColumns(template: CheckTemplate): string[] {
  const all = template.checks.flatMap((c) => c.placeholderColumns);
  return [...new Set(all)];
}
