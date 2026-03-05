import type { ColumnInfo } from "../types/dqx";
import type { CheckCategory } from "../types/dqx";
import type { CheckFunction } from "../types/dqx";
import type { Criticality } from "../types/dqx";

export interface SuggestedCheck {
  checkFunction: CheckFunction;
  category: CheckCategory;
  criticality: Criticality;
  arguments: Record<string, unknown>;
  reason: string;
  column: string;
}

/** Analysiert Spaltendefinitionen und schlägt passende Checks vor */
export function suggestChecks(columns: ColumnInfo[]): SuggestedCheck[] {
  const suggestions: SuggestedCheck[] = [];
  const seenSuggestions = new Set<string>();

  function add(s: SuggestedCheck) {
    const key = `${s.checkFunction}:${s.column}`;
    if (seenSuggestions.has(key)) return;
    seenSuggestions.add(key);
    suggestions.push(s);
  }

  for (const col of columns) {
    const name = col.name.toLowerCase();

    // ── Pflichtfelder → is_not_null ──────────────────────────────
    if (!col.nullable) {
      add({
        checkFunction: "is_not_null",
        category: "completeness",
        criticality: "error",
        arguments: { column: col.name },
        reason: `Spalte ist als Pflichtfeld (NOT NULL) definiert`,
        column: col.name,
      });
    }

    // ── ID-Spalten → is_unique ────────────────────────────────────
    if (/_id$/i.test(col.name) || col.name.toLowerCase() === "id") {
      add({
        checkFunction: "is_unique",
        category: "uniqueness",
        criticality: "error",
        arguments: { columns: [col.name], nulls_distinct: true },
        reason: `ID-Spalte "${col.name}" sollte eindeutige Werte enthalten`,
        column: col.name,
      });
      if (!col.nullable) {
        add({
          checkFunction: "is_not_null_and_not_empty",
          category: "completeness",
          criticality: "error",
          arguments: { column: col.name },
          reason: `ID-Spalte "${col.name}" darf nicht leer sein`,
          column: col.name,
        });
      }
    }

    // ── E-Mail-Spalten → regex_match ──────────────────────────────
    if (/e?mail/i.test(name)) {
      add({
        checkFunction: "regex_match",
        category: "pattern",
        criticality: "warn",
        arguments: {
          column: col.name,
          regex: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$",
        },
        reason: `Spaltenname deutet auf E-Mail-Adresse hin`,
        column: col.name,
      });
    }

    // ── Telefon-Spalten → regex_match ─────────────────────────────
    if (/phone|telefon|tel|mobile|mobil/i.test(name)) {
      add({
        checkFunction: "regex_match",
        category: "pattern",
        criticality: "warn",
        arguments: {
          column: col.name,
          regex: "^[+0-9][0-9\\s\\-().]{6,20}$",
        },
        reason: `Spaltenname deutet auf Telefonnummer hin`,
        column: col.name,
      });
    }

    // ── PLZ-Spalten → regex_match ─────────────────────────────────
    if (/^(plz|postleitzahl|zip|zip_code|postal_code)$/i.test(name)) {
      add({
        checkFunction: "regex_match",
        category: "pattern",
        criticality: "warn",
        arguments: { column: col.name, regex: "^[0-9]{5}$" },
        reason: `Spaltenname deutet auf deutsche Postleitzahl hin`,
        column: col.name,
      });
    }

    // ── IBAN → regex_match ────────────────────────────────────────
    if (/iban/i.test(name)) {
      add({
        checkFunction: "regex_match",
        category: "pattern",
        criticality: "error",
        arguments: {
          column: col.name,
          regex: "^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$",
        },
        reason: `Spaltenname deutet auf IBAN hin`,
        column: col.name,
      });
    }

    // ── IP-Adressen ───────────────────────────────────────────────
    if (/ip_?addr|ip_?address/i.test(name)) {
      add({
        checkFunction: "is_valid_ipv4_address",
        category: "network",
        criticality: "warn",
        arguments: { column: col.name },
        reason: `Spaltenname deutet auf IP-Adresse hin`,
        column: col.name,
      });
    }

    // ── Zeitstempel/Datum → is_not_in_future ─────────────────────
    if (col.dataType === "timestamp" || col.dataType === "date") {
      if (/created|erstellt|datum|date|time|timestamp|at$/i.test(name)) {
        add({
          checkFunction: "is_not_in_future",
          category: "date_time",
          criticality: "warn",
          arguments: { column: col.name },
          reason: `Zeitstempel-Spalte sollte nicht in der Zukunft liegen`,
          column: col.name,
        });
      }
      if (/created|updated|modified|loaded|inserted/i.test(name)) {
        add({
          checkFunction: "is_data_fresh",
          category: "date_time",
          criticality: "warn",
          arguments: { column: col.name, max_age_minutes: 1440 },
          reason: `Lade-Zeitstempel sollte aktuell sein (max. 24h alt)`,
          column: col.name,
        });
      }
      add({
        checkFunction: "is_valid_timestamp",
        category: "date_time",
        criticality: "error",
        arguments: { column: col.name },
        reason: `Zeitstempel-Spalte muss gültiges Format haben`,
        column: col.name,
      });
    }

    if (col.dataType === "date") {
      add({
        checkFunction: "is_valid_date",
        category: "date_time",
        criticality: "error",
        arguments: { column: col.name },
        reason: `Datum-Spalte muss gültiges Format haben`,
        column: col.name,
      });
    }

    // ── Numerische Spalten: Preis/Betrag → >= 0 ───────────────────
    if (["integer", "long", "double", "float", "decimal"].includes(col.dataType)) {
      if (/price|preis|amount|betrag|cost|kosten|fee|gebuehr|salary|gehalt/i.test(name)) {
        add({
          checkFunction: "is_not_less_than",
          category: "range",
          criticality: "warn",
          arguments: { column: col.name, limit: 0 },
          reason: `Betragsfeld sollte nicht negativ sein`,
          column: col.name,
        });
      }
      if (/quantity|menge|count|anzahl|stock|lager/i.test(name)) {
        add({
          checkFunction: "is_not_less_than",
          category: "range",
          criticality: "warn",
          arguments: { column: col.name, limit: 0 },
          reason: `Mengenfeld sollte nicht negativ sein`,
          column: col.name,
        });
      }
    }

    // ── JSON-Spalten ──────────────────────────────────────────────
    if (col.dataType === "string" && /json|payload|body|data|metadata/i.test(name)) {
      add({
        checkFunction: "is_valid_json",
        category: "json",
        criticality: "warn",
        arguments: { column: col.name },
        reason: `Spaltenname deutet auf JSON-Inhalt hin`,
        column: col.name,
      });
    }

    // ── Array-Spalten ─────────────────────────────────────────────
    if (col.dataType === "array" && !col.nullable) {
      add({
        checkFunction: "is_not_null_and_not_empty_array",
        category: "array",
        criticality: "warn",
        arguments: { column: col.name },
        reason: `Array-Pflichtfeld sollte nicht leer sein`,
        column: col.name,
      });
    }

    // ── Status-Felder → is_in_list ────────────────────────────────
    if (/^(status|state|zustand|typ|type|kind|art)$/i.test(name)) {
      add({
        checkFunction: "is_not_null",
        category: "completeness",
        criticality: "warn",
        arguments: { column: col.name },
        reason: `Status-Feld sollte immer gesetzt sein`,
        column: col.name,
      });
    }
  }

  return suggestions;
}
