import Papa from "papaparse";
import type { ColumnInfo } from "../types/dqx";

const TYPE_MAP: Record<string, ColumnInfo["dataType"]> = {
  string: "string", str: "string", varchar: "string", char: "string", text: "string", nvarchar: "string", nchar: "string",
  int: "integer", integer: "integer", int4: "integer", int2: "integer", smallint: "integer", tinyint: "integer", byteint: "integer",
  bigint: "long", long: "long", int8: "long", int64: "long",
  double: "double", float8: "double", "double precision": "double",
  float: "float", float4: "float", real: "float",
  decimal: "decimal", numeric: "decimal", number: "decimal",
  boolean: "boolean", bool: "boolean",
  date: "date",
  timestamp: "timestamp", datetime: "timestamp", timestamp_ntz: "timestamp", timestamp_ltz: "timestamp", timestamp_tz: "timestamp",
  binary: "binary", bytes: "binary", varbinary: "binary",
  array: "array",
  struct: "struct",
  map: "map",
};

function normalizeType(raw: string): ColumnInfo["dataType"] {
  const cleaned = raw.toLowerCase().trim()
    .replace(/\s+/g, " ")
    .split("(")[0]
    .split("<")[0]
    .trim();
  return TYPE_MAP[cleaned] || "string";
}

function normalizeNullable(raw: string | boolean | undefined): boolean {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "boolean") return raw;
  const lower = String(raw).toLowerCase().trim();
  return lower !== "false" && lower !== "no" && lower !== "0" && lower !== "not null" && lower !== "nein";
}

export interface ParseResult {
  columns: ColumnInfo[];
  errors: string[];
  warnings: string[];
}

// ─── 1. CSV Parser ───────────────────────────────────
export function parseCSV(content: string): ParseResult {
  // Remove BOM
  const cleaned = content.replace(/^\uFEFF/, "");

  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  if (result.errors.length > 0) {
    warnings.push(...result.errors.slice(0, 3).map(e => e.message));
  }

  const data = result.data as Record<string, string>[];
  if (data.length === 0) {
    return { columns: [], errors: ["Keine Daten gefunden"], warnings };
  }

  // Detect column name headers
  const headers = result.meta.fields || [];
  const nameHeader = headers.find(h =>
    ["name", "column_name", "spaltenname", "spalte", "field", "column", "col_name"].includes(h.toLowerCase())
  );
  const typeHeader = headers.find(h =>
    ["data_type", "datentyp", "type", "typ", "dtype", "datatype"].includes(h.toLowerCase())
  );
  const nullableHeader = headers.find(h =>
    ["nullable", "null", "is_nullable", "pflicht", "required", "mandatory"].includes(h.toLowerCase())
  );
  const descHeader = headers.find(h =>
    ["description", "beschreibung", "desc", "comment", "kommentar", "remarks"].includes(h.toLowerCase())
  );

  if (!nameHeader) {
    return { columns: [], errors: ["Spaltenname-Header nicht gefunden. Erwartet: name, column_name, spaltenname, etc."], warnings };
  }

  const columns: ColumnInfo[] = [];
  const seenNames = new Set<string>();

  data.forEach((row, idx) => {
    const name = row[nameHeader]?.trim();
    if (!name) return;

    if (seenNames.has(name)) {
      warnings.push(`Zeile ${idx + 2}: Doppelter Spaltenname "${name}" übersprungen`);
      return;
    }
    seenNames.add(name);

    const rawType = typeHeader ? row[typeHeader]?.trim() : "";
    const rawNullable = nullableHeader ? row[nullableHeader]?.trim() : undefined;

    // Handle "required" columns: invert logic
    const isRequired = nullableHeader?.toLowerCase() === "required" || nullableHeader?.toLowerCase() === "pflicht" || nullableHeader?.toLowerCase() === "mandatory";
    let nullable: boolean;
    if (rawNullable === undefined) {
      nullable = true;
    } else if (isRequired) {
      nullable = !normalizeNullable(rawNullable);
    } else {
      nullable = normalizeNullable(rawNullable);
    }

    columns.push({
      name,
      dataType: normalizeType(rawType || "string"),
      nullable,
      description: descHeader ? row[descHeader]?.trim() : undefined,
    });
  });

  return { columns, errors, warnings };
}

// ─── 2. JSON Parser ─────────────────────────────────
export function parseJSON(content: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    return { columns: [], errors: [`Ungültiges JSON: ${(e as Error).message}`], warnings };
  }

  // Format c) Spark JSON Schema: {type: "struct", fields: [...]}
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (obj.type === "struct" && Array.isArray(obj.fields)) {
      const columns = (obj.fields as Record<string, unknown>[]).map((f) => ({
        name: String(f.name || f.field_name || ""),
        dataType: normalizeType(typeof f.type === "string" ? f.type : (f.type as Record<string, unknown>)?.typeName as string || "string"),
        nullable: f.nullable !== false,
        description: typeof f.metadata === "object" && f.metadata !== null
          ? (f.metadata as Record<string, string>).comment
          : undefined,
      })).filter(c => c.name);
      return { columns, errors, warnings };
    }
  }

  if (!Array.isArray(parsed)) {
    return { columns: [], errors: ["Unbekanntes JSON-Format. Erwartet: Array oder Spark-Schema-Objekt."], warnings };
  }

  const arr = parsed as unknown[];

  // Format a) Simple string array: ["col1", "col2"]
  if (arr.length > 0 && typeof arr[0] === "string") {
    const columns = (arr as string[]).map(name => ({
      name: name.trim(),
      dataType: "string" as const,
      nullable: true,
    })).filter(c => c.name);
    warnings.push("Nur Spaltennamen erkannt – alle Typen als 'string' gesetzt.");
    return { columns, errors, warnings };
  }

  // Format b) Array of objects
  const columns: ColumnInfo[] = [];
  const seenNames = new Set<string>();

  (arr as Record<string, unknown>[]).forEach((item, idx) => {
    if (typeof item !== "object" || item === null) return;

    const name = String(
      item.name || item.column_name || item.field || item.col_name || ""
    ).trim();
    if (!name) {
      warnings.push(`Eintrag ${idx + 1}: Kein Spaltenname gefunden`);
      return;
    }
    if (seenNames.has(name)) {
      warnings.push(`Doppelter Spaltenname "${name}" übersprungen`);
      return;
    }
    seenNames.add(name);

    const rawType = String(item.data_type || item.type || item.dtype || item.dataType || "string");
    const rawNullable = item.nullable;

    columns.push({
      name,
      dataType: normalizeType(rawType),
      nullable: rawNullable !== false && rawNullable !== "false" && rawNullable !== 0,
      description: typeof item.description === "string" ? item.description
        : typeof item.comment === "string" ? item.comment
        : undefined,
    });
  });

  return { columns, errors, warnings };
}

// ─── 3. DDL Parser ──────────────────────────────────
export function parseDDL(content: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let ddlContent = content.trim();

  // Extract content inside CREATE TABLE parens
  const createMatch = ddlContent.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:EXTERNAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w.`"[\]]+\s*\(([\s\S]*)\)/i);
  if (createMatch) {
    ddlContent = createMatch[1];
  }

  // Remove trailing table options (USING, PARTITIONED BY, etc.)
  ddlContent = ddlContent
    .replace(/\bUSING\b[\s\S]*/i, "")
    .replace(/\bPARTITIONED\s+BY\b[\s\S]*/i, "")
    .replace(/\bCLUSTERED\s+BY\b[\s\S]*/i, "")
    .replace(/\bLOCATION\b[\s\S]*/i, "")
    .replace(/\bTBLPROPERTIES\b[\s\S]*/i, "")
    .replace(/\bSTORED\s+AS\b[\s\S]*/i, "")
    .trim();

  // Split by comma, but be careful of nested parens (e.g., STRUCT<...>, ARRAY<...>)
  const lines = splitDDLColumns(ddlContent);
  const columns: ColumnInfo[] = [];
  const seenNames = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip constraints and keywords
    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT|INDEX|KEY)\b/i.test(trimmed)) continue;

    // Extract column definition: name type [NOT NULL] [COMMENT '...']
    const colMatch = trimmed.match(/^[`"[\]]?(\w+)[`"[\]]?\s+(\S+(?:\s*\([^)]*\))?(?:\s*<[^>]*>)?)/i);
    if (!colMatch) continue;

    const name = colMatch[1];
    if (seenNames.has(name.toLowerCase())) {
      warnings.push(`Doppelter Spaltenname "${name}" übersprungen`);
      continue;
    }
    seenNames.add(name.toLowerCase());

    const rawType = colMatch[2];
    const nullable = !/\bNOT\s+NULL\b/i.test(trimmed);

    // Extract COMMENT
    const commentMatch = trimmed.match(/COMMENT\s+['"]([^'"]+)['"]/i);
    const description = commentMatch ? commentMatch[1] : undefined;

    columns.push({
      name,
      dataType: normalizeType(rawType),
      nullable,
      description,
    });
  }

  if (columns.length === 0) {
    return { columns: [], errors: ["Keine Spalten aus DDL extrahiert. Bitte prüfe das Format."], warnings };
  }

  return { columns, errors, warnings };
}

function splitDDLColumns(ddl: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of ddl) {
    if (ch === "(" || ch === "<") depth++;
    else if (ch === ")" || ch === ">") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ─── 4. Paste/Freitext Parser ───────────────────────
export function parseFreeText(content: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = content.split("\n").map(l => l.trim()).filter(l => l);

  if (lines.length === 0) {
    return { columns: [], errors: ["Kein Inhalt erkannt"], warnings };
  }

  const columns: ColumnInfo[] = [];
  const seenNames = new Set<string>();

  // Try Spark printSchema format: |-- col: type (nullable = true/false)
  const sparkMatches = lines.filter(l => /\|--\s+\w+/.test(l));
  if (sparkMatches.length > lines.length * 0.5) {
    for (const line of lines) {
      const m = line.match(/\|--\s+(\w+):\s+(\w+)\s*\(nullable\s*=\s*(true|false)\)/i);
      if (m) {
        const name = m[1];
        if (!seenNames.has(name)) {
          seenNames.add(name);
          columns.push({
            name,
            dataType: normalizeType(m[2]),
            nullable: m[3].toLowerCase() === "true",
          });
        }
      }
    }
    if (columns.length > 0) return { columns, errors, warnings };
  }

  for (const line of lines) {
    if (!line || line.startsWith("root") || line.startsWith("--") || line.startsWith("//") || line.startsWith("#")) continue;

    // Tab-separated: name\tTYPE\tnullable\tdescription
    if (line.includes("\t")) {
      const parts = line.split("\t").map(p => p.trim());
      const name = parts[0];
      if (!name || seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
      const rawType = parts[1] || "string";
      const nullable = parts[2] ? normalizeNullable(parts[2]) : true;
      columns.push({
        name,
        dataType: normalizeType(rawType),
        nullable,
        description: parts[3] || undefined,
      });
      continue;
    }

    // Comma separated: name, name, name
    if (line.includes(",") && !line.match(/\w+\s+\w+/)) {
      const parts = line.split(",").map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (!seenNames.has(part.toLowerCase())) {
          seenNames.add(part.toLowerCase());
          columns.push({ name: part, dataType: "string", nullable: true });
        }
      }
      continue;
    }

    // name:type or name TYPE format
    const colonMatch = line.match(/^(\w+)\s*:\s*(\w+)/);
    const spaceMatch = line.match(/^(\w+)\s+(\w+)(?:\s+(NOT\s+NULL|NULL))?/i);

    if (colonMatch) {
      const name = colonMatch[1];
      if (!seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        columns.push({
          name,
          dataType: normalizeType(colonMatch[2]),
          nullable: true,
        });
      }
    } else if (spaceMatch) {
      const name = spaceMatch[1];
      if (!seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        columns.push({
          name,
          dataType: normalizeType(spaceMatch[2]),
          nullable: spaceMatch[3] ? !/NOT\s+NULL/i.test(spaceMatch[3]) : true,
        });
      }
    } else {
      // Plain name
      const name = line.trim().replace(/[^a-zA-Z0-9_]/, "");
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        columns.push({ name, dataType: "string", nullable: true });
      }
    }
  }

  if (columns.length === 0) {
    return { columns: [], errors: ["Keine Spalten erkannt. Bitte überprüfe das Format."], warnings };
  }

  return { columns, errors, warnings };
}

// ─── 5. DESCRIBE TABLE Parser ────────────────────────
/** Parses Unity Catalog / Hive `DESCRIBE TABLE` tab-separated output */
export function parseDescribeTable(content: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = content.split("\n");

  // Find header line (contains col_name and data_type)
  const headerIdx = lines.findIndex(l => /col_?name[\t ]+data_?type/i.test(l));
  if (headerIdx === -1) {
    return { columns: [], errors: ["Kein gültiges DESCRIBE TABLE-Format erkannt"], warnings };
  }

  const headerParts = lines[headerIdx].split("\t").map(h => h.trim().toLowerCase());
  const nameIdx = headerParts.findIndex(h => h === "col_name" || h === "colname");
  const typeIdx = headerParts.findIndex(h => h === "data_type" || h === "datatype");
  const commentIdx = headerParts.findIndex(h => h === "comment");

  if (nameIdx === -1 || typeIdx === -1) {
    return { columns: [], errors: ["Spalten 'col_name' und 'data_type' nicht gefunden"], warnings };
  }

  const columns: ColumnInfo[] = [];
  const seenNames = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Stop at partition info section
    if (/^#/.test(trimmed)) continue;

    const parts = line.split("\t").map(p => p.trim());
    const name = parts[nameIdx];
    if (!name || name.startsWith("#")) continue;

    if (seenNames.has(name.toLowerCase())) {
      warnings.push(`Doppelter Spaltenname "${name}" übersprungen`);
      continue;
    }
    seenNames.add(name.toLowerCase());

    const rawType = parts[typeIdx] || "string";
    const comment = commentIdx !== -1 ? parts[commentIdx] : undefined;

    columns.push({
      name,
      dataType: normalizeType(rawType),
      nullable: true,
      description: comment && comment !== "null" ? comment : undefined,
    });
  }

  if (columns.length === 0) {
    return { columns: [], errors: ["Keine Spalten aus DESCRIBE TABLE extrahiert"], warnings };
  }
  return { columns, errors, warnings };
}

// ─── 6. Sample-Data CSV Parser ───────────────────────
/** Infers a dataType from an array of sample string values */
function inferDataType(values: string[]): ColumnInfo["dataType"] {
  const nonEmpty = values.filter(v => v !== "" && v !== "null" && v !== "NULL" && v !== "None");
  if (nonEmpty.length === 0) return "string";

  if (nonEmpty.every(v => /^(true|false|yes|no|1|0)$/i.test(v))) return "boolean";
  if (nonEmpty.every(v => /^-?\d+$/.test(v))) {
    const max = Math.max(...nonEmpty.map(v => Math.abs(Number(v))));
    return max > 2147483647 ? "long" : "integer";
  }
  if (nonEmpty.every(v => /^-?\d+[.,]\d+$/.test(v))) return "double";
  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return "date";
  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v))) return "timestamp";
  return "string";
}

/** Parses an actual data CSV and infers column types from sample values */
export function parseSampleDataCsv(content: string): ParseResult {
  const cleaned = content.replace(/^\uFEFF/, "");
  const warnings: string[] = ["Spaltentypen wurden aus Beispieldaten inferiert – bitte überprüfen"];

  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  if (result.errors.length > 0) {
    warnings.push(...result.errors.slice(0, 3).map(e => e.message));
  }

  const data = result.data as Record<string, string>[];
  const headers = result.meta.fields || [];

  if (headers.length === 0 || data.length === 0) {
    return { columns: [], errors: ["Keine Daten gefunden"], warnings };
  }

  const columns: ColumnInfo[] = headers
    .filter(h => h.trim() !== "")
    .map(header => {
      const values = data.map(row => row[header] ?? "").slice(0, 100);
      const hasNulls = values.some(v => v === "" || v === "null" || v === "NULL" || v === "None");
      return {
        name: header,
        dataType: inferDataType(values),
        nullable: hasNulls,
      };
    });

  return { columns, errors: [], warnings };
}

// ─── 7. Auto-Detect ─────────────────────────────────
export function autoDetectAndParse(content: string): { format: string; result: ParseResult } {
  const trimmed = content.trim().replace(/^\uFEFF/, "");

  if (!trimmed) return { format: "empty", result: { columns: [], errors: ["Kein Inhalt"], warnings: [] } };

  // JSON detection
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return { format: "JSON", result: parseJSON(trimmed) };
  }

  // DDL detection
  if (/CREATE\s+(?:OR\s+REPLACE\s+)?(?:EXTERNAL\s+)?TABLE/i.test(trimmed)) {
    return { format: "DDL (CREATE TABLE)", result: parseDDL(trimmed) };
  }

  // DESCRIBE TABLE detection: first non-empty line has col_name + data_type (tab-separated)
  const firstNonEmpty = trimmed.split("\n").find(l => l.trim() !== "");
  if (firstNonEmpty && /col_?name[\t ]+data_?type/i.test(firstNonEmpty)) {
    return { format: "DESCRIBE TABLE", result: parseDescribeTable(trimmed) };
  }

  // Spark printSchema
  if (/\|--\s+\w+/.test(trimmed)) {
    return { format: "Spark printSchema()", result: parseFreeText(trimmed) };
  }

  // Schema CSV: header row with known schema column names
  const firstLine = trimmed.split("\n")[0];
  const hasCsvHeaders = ["name", "column_name", "field", "spaltenname", "data_type", "type"].some(h =>
    firstLine.toLowerCase().includes(h)
  );
  if (hasCsvHeaders && (firstLine.includes(",") || firstLine.includes(";") || firstLine.includes("\t"))) {
    return { format: "CSV", result: parseCSV(trimmed) };
  }

  // Sample data CSV: multiple comma/semicolon-delimited lines, no spaces in first line
  const dataLines = trimmed.split("\n").filter(l => l.trim());
  if (
    dataLines.length >= 2 &&
    (firstLine.includes(",") || firstLine.includes(";")) &&
    !/\s{2,}/.test(firstLine)
  ) {
    return { format: "CSV (Beispieldaten)", result: parseSampleDataCsv(trimmed) };
  }

  // Spark DDL string: "col1 TYPE, col2 TYPE"
  if (/^\w+\s+\w+(?:\s*,\s*\w+\s+\w+)+/.test(trimmed)) {
    return { format: "DDL-String", result: parseDDL(trimmed) };
  }

  // Fallback: free text
  return { format: "Freitext", result: parseFreeText(trimmed) };
}
