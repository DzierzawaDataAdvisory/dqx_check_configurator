export interface FilterValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateFilter(filter: string, availableColumns?: string[]): FilterValidationResult {
  if (!filter.trim()) return { valid: true };

  // Semicolon check
  if (filter.includes(";")) {
    return {
      valid: false,
      error: "Semikolon nicht erlaubt",
      suggestion: "Entferne das Semikolon – Spark SQL Filter brauchen kein Semikolon am Ende.",
    };
  }

  // Common SQL mistake: == instead of =
  if (/[^!=<>]==[^=]/.test(filter) || filter.startsWith("==")) {
    return {
      valid: false,
      error: "Doppeltes Gleichheitszeichen (==) erkannt",
      suggestion: "Verwende ein einfaches = für Vergleiche in SQL.",
    };
  }

  // Unbalanced parentheses
  let parenDepth = 0;
  for (const ch of filter) {
    if (ch === "(") parenDepth++;
    if (ch === ")") parenDepth--;
    if (parenDepth < 0) {
      return {
        valid: false,
        error: "Schließende Klammer ohne öffnende Klammer",
        suggestion: "Prüfe die Klammerung – es fehlt eine öffnende Klammer.",
      };
    }
  }
  if (parenDepth > 0) {
    return {
      valid: false,
      error: `${parenDepth} Klammer${parenDepth > 1 ? "n" : ""} nicht geschlossen`,
      suggestion: `Füge ${parenDepth} schließende Klammer${parenDepth > 1 ? "n" : ""} hinzu.`,
    };
  }

  // Unbalanced single quotes
  const singleQuotes = (filter.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    return {
      valid: false,
      error: "Anführungszeichen nicht geschlossen",
      suggestion: "Prüfe ob alle Zeichenketten mit ' … ' eingeschlossen sind.",
    };
  }

  // Check for column references against available columns
  if (availableColumns && availableColumns.length > 0) {
    // Extract potential column names (words not inside quotes, not SQL keywords)
    const sqlKeywords = new Set([
      "AND", "OR", "NOT", "IN", "LIKE", "IS", "NULL", "BETWEEN",
      "TRUE", "FALSE", "SELECT", "WHERE", "FROM", "AS", "YEAR",
      "MONTH", "DAY", "CURRENT_DATE", "CURRENT_TIMESTAMP",
    ]);

    // Remove quoted strings
    const withoutQuotes = filter.replace(/'[^']*'/g, "''");
    // Remove numbers
    const withoutNumbers = withoutQuotes.replace(/\b\d+(\.\d+)?\b/g, "");
    // Extract identifiers
    const identifiers = withoutNumbers.match(/\b[a-zA-Z_]\w*\b/g) || [];

    const unknownCols = identifiers.filter(
      id => !sqlKeywords.has(id.toUpperCase()) && !availableColumns.includes(id)
    );

    if (unknownCols.length > 0) {
      const unique = [...new Set(unknownCols)];
      return {
        valid: true, // Warning, not error — column might be valid but not in schema
        error: `Unbekannte Spalte${unique.length > 1 ? "n" : ""}: ${unique.join(", ")}`,
        suggestion: "Diese Spalte ist nicht im Schema definiert. Prüfe die Schreibweise.",
      };
    }
  }

  return { valid: true };
}
