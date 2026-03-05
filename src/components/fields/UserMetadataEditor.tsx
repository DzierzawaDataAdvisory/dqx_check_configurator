import { useState } from "react";
import { Plus, X, ChevronDown, Tag } from "lucide-react";

interface UserMetadataEditorProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

const SUGGESTED_KEYS: { key: string; label: string; placeholder: string }[] = [
  { key: "owner", label: "Verantwortlich (owner)", placeholder: "z.B. team-vertrieb" },
  { key: "sla", label: "SLA (%)", placeholder: "z.B. 99.5" },
  { key: "team", label: "Team", placeholder: "z.B. Data Engineering" },
  { key: "ticket", label: "Ticket / Jira-ID", placeholder: "z.B. DQ-1234" },
  { key: "priority", label: "Priorität", placeholder: "z.B. hoch, mittel, niedrig" },
  { key: "description_de", label: "Beschreibung (Deutsch)", placeholder: "Fachliche Beschreibung dieses Checks" },
];

export function UserMetadataEditor({ value, onChange }: UserMetadataEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const entries = Object.entries(value);

  function handleUpdate(key: string, newValue: string) {
    onChange({ ...value, [key]: newValue });
  }

  function handleRemove(key: string) {
    const updated = { ...value };
    delete updated[key];
    onChange(updated);
  }

  function handleAdd() {
    const k = newKey.trim();
    const v = newVal.trim();
    if (!k) return;
    onChange({ ...value, [k]: v });
    setNewKey("");
    setNewVal("");
  }

  function handleAddSuggested(key: string) {
    if (key in value) return;
    onChange({ ...value, [key]: "" });
    setShowSuggestions(false);
  }

  const availableSuggestions = SUGGESTED_KEYS.filter(s => !(s.key in value));

  return (
    <div className="space-y-3">
      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([key, val]) => {
            const suggestion = SUGGESTED_KEYS.find(s => s.key === key);
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 w-40 flex-shrink-0">
                  <Tag size={12} className="text-accent flex-shrink-0" />
                  <span className="text-xs font-mono text-text-secondary truncate" title={key}>
                    {key}
                  </span>
                </div>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleUpdate(key, e.target.value)}
                  placeholder={suggestion?.placeholder || "Wert eingeben"}
                  className="input-field text-xs flex-1 h-8 py-1"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(key)}
                  className="btn-ghost p-1 flex-shrink-0 text-text-muted hover:text-error transition-colors"
                  title="Entfernen"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="Schlüssel"
          className="input-field text-xs h-8 py-1 w-36 flex-shrink-0 font-mono"
        />
        <input
          type="text"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="Wert"
          className="input-field text-xs h-8 py-1 flex-1"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newKey.trim()}
          className="btn-ghost p-1 flex-shrink-0 text-accent disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          title="Hinzufügen"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Suggestions dropdown */}
      {availableSuggestions.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
            Vorschläge anzeigen ({availableSuggestions.length})
          </button>

          {showSuggestions && (
            <div className="absolute left-0 top-6 z-10 bg-bg-elevated border border-border rounded-lg shadow-xl py-1 w-72">
              {availableSuggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleAddSuggested(s.key)}
                  className="w-full text-left px-3 py-2 hover:bg-bg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Tag size={11} className="text-accent flex-shrink-0" />
                    <span className="text-xs font-mono text-text-secondary">{s.key}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 pl-5">{s.label} – {s.placeholder}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
