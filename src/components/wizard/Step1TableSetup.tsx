import { useRef, useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, User, Settings } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { parseExcelFile } from "../../lib/excelParser";
import type { ColumnInfo } from "../../types/dqx";

export function Step1TableSetup() {
  const {
    tableConfig,
    setTableMeta,
    setColumns,
    userMode,
    setUserMode,
    uploadedFromExcel,
    setUploadedFromExcel,
  } = useCheckStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{ tableName: string; columns: string[] } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploadPreview(null);
    try {
      const result = await parseExcelFile(file);
      setUploadPreview(result);
      // Apply to store
      setTableMeta("", "", result.tableName);
      const cols: ColumnInfo[] = result.columns.map((name) => ({
        name,
        dataType: "string",
        nullable: true,
      }));
      setColumns(cols);
      setUploadedFromExcel(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unbekannter Fehler beim Lesen der Datei.");
      setUploadedFromExcel(false);
    }
  }, [setTableMeta, setColumns, setUploadedFromExcel]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function clearUpload() {
    setUploadPreview(null);
    setUploadedFromExcel(false);
    setUploadError(null);
    setTableMeta(tableConfig.catalog, tableConfig.schema, "");
    setColumns([]);
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* User mode toggle */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-primary">Benutzermodus</label>
        <div className="flex gap-3">
          <button
            onClick={() => setUserMode("technical")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              userMode === "technical"
                ? "bg-accent/10 border-accent text-accent"
                : "bg-bg-elevated border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            <Settings size={15} />
            Technischer Benutzer
          </button>
          <button
            onClick={() => setUserMode("business")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              userMode === "business"
                ? "bg-accent/10 border-accent text-accent"
                : "bg-bg-elevated border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            <User size={15} />
            Business User
          </button>
        </div>
        <p className="text-xs text-text-muted">
          {userMode === "technical"
            ? "Geben Sie Katalog, Schema und Tabellenname an."
            : "Geben Sie nur den Namen der Tabelle an."}
        </p>
      </div>

      {/* Manual input */}
      {!uploadedFromExcel && (
        <div className="space-y-4">
          {userMode === "technical" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Katalog
                </label>
                <input
                  type="text"
                  value={tableConfig.catalog}
                  onChange={(e) => setTableMeta(e.target.value, tableConfig.schema, tableConfig.table)}
                  placeholder="z.B. my_catalog"
                  className="input-field w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Schema
                </label>
                <input
                  type="text"
                  value={tableConfig.schema}
                  onChange={(e) => setTableMeta(tableConfig.catalog, e.target.value, tableConfig.table)}
                  placeholder="z.B. my_schema"
                  className="input-field w-full"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
              Tabellenname <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={tableConfig.table}
              onChange={(e) => setTableMeta(tableConfig.catalog, tableConfig.schema, e.target.value)}
              placeholder="z.B. orders"
              className="input-field w-full"
            />
          </div>
        </div>
      )}

      {/* Divider */}
      {!uploadedFromExcel && (
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-muted font-medium uppercase tracking-wide">oder</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Excel upload */}
      {!uploadedFromExcel ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-primary">
            Excel-Datei hochladen
          </label>
          <p className="text-xs text-text-muted">
            Format pro Zeile: <code className="bg-bg-elevated px-1 py-0.5 rounded text-accent">Tabellenname-Attributname</code>
            {" "}(z.B. <code className="bg-bg-elevated px-1 py-0.5 rounded">orders-customer_id</code>)
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50 hover:bg-bg-elevated"
            }`}
          >
            <FileSpreadsheet size={32} className="text-text-muted" />
            <div className="text-center">
              <p className="text-sm text-text-secondary font-medium">Excel-Datei hier ablegen</p>
              <p className="text-xs text-text-muted mt-1">oder klicken zum Auswählen (.xlsx, .xls)</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-1.5 text-xs rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <Upload size={13} />
              Datei auswählen
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
          />

          {uploadError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        /* Uploaded state */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-text-primary">Excel-Datei</label>
            <button
              onClick={clearUpload}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red-400 transition-colors"
            >
              <X size={13} />
              Entfernen
            </button>
          </div>

          {uploadPreview && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle2 size={16} />
                Erfolgreich eingelesen
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-text-secondary">
                  Tabellenname: <span className="text-text-primary font-medium">{uploadPreview.tableName}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {uploadPreview.columns.length} Attribute erkannt:
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {uploadPreview.columns.map((col) => (
                    <span key={col} className="px-2 py-0.5 bg-bg-elevated border border-border rounded text-xs text-text-primary">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Schritt 2 (Attribute anlegen) wird übersprungen.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
