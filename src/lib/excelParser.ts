import * as XLSX from "xlsx";

export interface ExcelParseResult {
  tableName: string;
  columns: string[];
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel-Datei enthält kein Sheet.");

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const tableNames = new Set<string>();
  const columns: string[] = [];

  for (const row of rows) {
    const cell = row[0];
    if (typeof cell !== "string" || !cell.trim()) continue;

    const separatorIndex = cell.indexOf("-");
    if (separatorIndex < 1) continue;

    const tablePart = cell.slice(0, separatorIndex).trim();
    const attributePart = cell.slice(separatorIndex + 1).trim();

    if (tablePart) tableNames.add(tablePart);
    if (attributePart && !columns.includes(attributePart)) {
      columns.push(attributePart);
    }
  }

  if (tableNames.size === 0) {
    throw new Error('Keine gültigen Einträge gefunden. Erwartet: "Tabellenname-Attributname"');
  }

  const tableName = [...tableNames][0];
  return { tableName, columns };
}
