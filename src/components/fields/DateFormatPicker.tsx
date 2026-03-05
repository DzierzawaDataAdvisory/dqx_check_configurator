import { useState } from "react";
import { ChevronDown } from "lucide-react";

const DATE_FORMATS = [
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd", example: "2024-01-15" },
  { value: "dd.MM.yyyy", label: "dd.MM.yyyy", example: "15.01.2024" },
  { value: "MM/dd/yyyy", label: "MM/dd/yyyy", example: "01/15/2024" },
  { value: "dd/MM/yyyy", label: "dd/MM/yyyy", example: "15/01/2024" },
  { value: "yyyyMMdd", label: "yyyyMMdd", example: "20240115" },
  { value: "yyyy-MM-dd HH:mm:ss", label: "yyyy-MM-dd HH:mm:ss", example: "2024-01-15 13:45:00" },
  { value: "yyyy-MM-dd'T'HH:mm:ss", label: "ISO 8601", example: "2024-01-15T13:45:00" },
  { value: "yyyy-MM-dd'T'HH:mm:ssZ", label: "ISO 8601 mit Timezone", example: "2024-01-15T13:45:00+01:00" },
  { value: "dd-MMM-yyyy", label: "dd-MMM-yyyy", example: "15-Jan-2024" },
];

interface DateFormatPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateFormatPicker({ value, onChange, placeholder = "z.B. yyyy-MM-dd (optional)" }: DateFormatPickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedFormat = DATE_FORMATS.find(f => f.value === value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="input-field flex items-center justify-between text-sm"
        >
          <span className={value ? "text-text-primary font-mono" : "text-text-muted"}>
            {value || placeholder}
          </span>
          <ChevronDown size={14} className="text-text-muted flex-shrink-0 ml-2" />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <button
              type="button"
              onClick={() => { onChange(""); setShowDropdown(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-bg-hover transition-colors text-sm text-text-muted"
            >
              Automatisch erkennen (leer lassen)
            </button>
            {DATE_FORMATS.map((format) => (
              <button
                key={format.value}
                type="button"
                onClick={() => { onChange(format.value); setShowDropdown(false); }}
                className={`w-full text-left px-4 py-2.5 hover:bg-bg-hover transition-colors ${
                  value === format.value ? "bg-accent/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-text-primary">{format.label}</span>
                  <span className="text-xs text-text-muted ml-4">{format.example}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual input */}
      <div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Oder eigenes Format eingeben…"
          className="input-field text-sm font-mono"
        />
        {selectedFormat && (
          <p className="text-xs text-text-muted mt-1">Beispiel: {selectedFormat.example}</p>
        )}
      </div>
    </div>
  );
}
