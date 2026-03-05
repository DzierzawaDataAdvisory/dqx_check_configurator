import type { CheckConfig } from "../types/dqx";
import { getCheckByFunction } from "../data/checkRegistry";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCheck(check: CheckConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const registryEntry = getCheckByFunction(check.dqxCheck.check.function);
  if (!registryEntry) {
    return { isValid: false, errors: ["Unbekannte Check-Funktion"], warnings };
  }

  const args = check.dqxCheck.check.arguments || {};
  const forEachCols = check.dqxCheck.check.for_each_column;
  const isForEach = forEachCols && forEachCols.length > 0;

  for (const field of registryEntry.fields) {
    if (!field.required) continue;

    // Skip column field validation if for_each_column is used
    if (field.key === "column" && isForEach) continue;

    const value = args[field.key];

    if (value === undefined || value === null || value === "") {
      errors.push(`Pflichtfeld "${field.label}" ist nicht ausgefüllt`);
      continue;
    }

    // Value list: must have at least one item
    if (field.type === "value_list") {
      if (!Array.isArray(value) || (value as unknown[]).length === 0) {
        errors.push(`Pflichtfeld "${field.label}": Mindestens ein Wert erforderlich`);
      }
    }

    // Column multi select: must have at least one column
    if (field.type === "column_multi_select") {
      if (!Array.isArray(value) || (value as string[]).length === 0) {
        errors.push(`Pflichtfeld "${field.label}": Mindestens eine Spalte erforderlich`);
      }
    }

    // Number validation
    if (field.type === "number" && field.validation) {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`Feld "${field.label}": Muss eine Zahl sein`);
      } else {
        if (field.validation.min !== undefined && num < field.validation.min) {
          errors.push(`Feld "${field.label}": Muss ≥ ${field.validation.min} sein`);
        }
        if (field.validation.max !== undefined && num > field.validation.max) {
          errors.push(`Feld "${field.label}": Muss ≤ ${field.validation.max} sein`);
        }
      }
    }
  }

  // for_each_column: must have at least 1 column
  if (isForEach && forEachCols!.length === 0) {
    errors.push("Für 'Auf mehrere Spalten anwenden' muss mindestens eine Spalte gewählt werden");
  }

  // Warn if name is set but empty
  if (check.dqxCheck.name === "") {
    warnings.push("Leerer Check-Name wird ignoriert (DQX generiert automatisch einen)");
  }

  // Warn about filter syntax
  if (check.dqxCheck.filter && check.dqxCheck.filter.includes(";")) {
    warnings.push("Filter enthält Semikolon – bitte Spark SQL ohne Semikolon verwenden");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Per-field validation ─────────────────────────────────────────
export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}

export function validateField(
  _fieldKey: string,
  value: unknown,
  field: { type: string; required?: boolean; label: string; validation?: { min?: number; max?: number } }
): FieldValidationResult {
  // Required check
  if (field.required) {
    if (value === undefined || value === null || value === "") {
      return { valid: false, error: `${field.label} ist erforderlich` };
    }
    if (field.type === "value_list" && (!Array.isArray(value) || (value as unknown[]).length === 0)) {
      return { valid: false, error: "Mindestens ein Wert erforderlich" };
    }
    if (field.type === "column_multi_select" && (!Array.isArray(value) || (value as string[]).length === 0)) {
      return { valid: false, error: "Mindestens eine Spalte erforderlich" };
    }
  }

  // Skip further validation if empty and not required
  if (value === undefined || value === null || value === "") {
    return { valid: true };
  }

  // Number validation
  if (field.type === "number" && field.validation) {
    const num = Number(value);
    if (isNaN(num)) return { valid: false, error: "Muss eine Zahl sein" };
    if (field.validation.min !== undefined && num < field.validation.min) {
      return { valid: false, error: `Muss mindestens ${field.validation.min} sein` };
    }
    if (field.validation.max !== undefined && num > field.validation.max) {
      return { valid: false, error: `Darf höchstens ${field.validation.max} sein` };
    }
  }

  // Regex validation
  if (field.type === "regex_builder" && typeof value === "string" && value) {
    try { new RegExp(value); } catch {
      return { valid: false, error: "Ungültiger regulärer Ausdruck" };
    }
  }

  return { valid: true };
}

export function validateAllChecks(checks: CheckConfig[]): {
  totalValid: number;
  totalInvalid: number;
  results: Map<string, ValidationResult>;
} {
  const results = new Map<string, ValidationResult>();
  let totalValid = 0;
  let totalInvalid = 0;

  for (const check of checks) {
    const result = validateCheck(check);
    results.set(check.id, result);
    if (result.isValid) totalValid++;
    else totalInvalid++;
  }

  return { totalValid, totalInvalid, results };
}
