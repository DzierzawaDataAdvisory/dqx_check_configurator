import { AlertTriangle, XCircle } from "lucide-react";
import type { Criticality } from "../../types/dqx";

interface CriticalityToggleProps {
  value: Criticality;
  onChange: (value: Criticality) => void;
}

export function CriticalityToggle({ value, onChange }: CriticalityToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange("error")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
          value === "error"
            ? "bg-error/15 border-error text-error"
            : "bg-bg border-border text-text-secondary hover:border-error/50 hover:text-error/70"
        }`}
      >
        <XCircle size={16} />
        Fehler
        <span className="text-xs opacity-70">(Zeile wird als fehlerhaft markiert)</span>
      </button>
      <button
        onClick={() => onChange("warn")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
          value === "warn"
            ? "bg-warning/15 border-warning text-warning"
            : "bg-bg border-border text-text-secondary hover:border-warning/50 hover:text-warning/70"
        }`}
      >
        <AlertTriangle size={16} />
        Warnung
        <span className="text-xs opacity-70">(Zeile wird trotzdem verarbeitet)</span>
      </button>
    </div>
  );
}
