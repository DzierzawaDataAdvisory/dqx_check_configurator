import { useState } from "react";
import type { KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

interface ValueListEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function ValueListEditor({ value, onChange, placeholder = "Wert eingeben und Enter drücken" }: ValueListEditorProps) {
  const [input, setInput] = useState("");

  function addValue() {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function removeValue(val: string) {
    onChange(value.filter(v => v !== val));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue();
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeValue(value[value.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="min-h-[42px] flex flex-wrap gap-1.5 items-center border border-border rounded-lg px-2 py-1.5 bg-bg-surface focus-within:border-accent transition-colors">
        {value.map(val => (
          <span
            key={val}
            className="inline-flex items-center gap-1 bg-bg-elevated border border-border text-text-primary text-xs px-2 py-1 rounded-md"
          >
            <span className="font-mono">{val}</span>
            <button
              type="button"
              onClick={() => removeValue(val)}
              className="text-text-muted hover:text-error transition-colors leading-none"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : "Weiterer Wert…"}
          className="bg-transparent border-0 outline-none text-text-primary text-sm placeholder-text-muted flex-1 min-w-[120px]"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={addValue}
            className="text-accent hover:text-accent-hover transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{value.length} Wert{value.length !== 1 ? "e" : ""}</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-text-muted hover:text-error transition-colors"
          >
            Alle entfernen
          </button>
        </div>
      )}
    </div>
  );
}
