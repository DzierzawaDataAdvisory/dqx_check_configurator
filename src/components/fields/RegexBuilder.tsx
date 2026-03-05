import { useState } from "react";
import { Check, X, ChevronDown, Code, LayoutGrid, Plus, Trash2 } from "lucide-react";

// ─── Templates ───────────────────────────────────────────────────
const REGEX_TEMPLATES = [
  { id: "email", label: "E-Mail-Adresse", regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", example: "user@example.com" },
  { id: "german_plz", label: "Deutsche PLZ (5-stellig)", regex: "^[0-9]{5}$", example: "70173" },
  { id: "iban_de", label: "Deutsche IBAN", regex: "^DE[0-9]{2}[0-9]{18}$", example: "DE89370400440532013000" },
  { id: "phone_de", label: "Deutsche Telefonnummer", regex: "^\\+?49[0-9\\s/-]{7,15}$", example: "+49 711 1234567" },
  { id: "url", label: "URL", regex: "^https?://[^\\s/$.?#].[^\\s]*$", example: "https://example.com" },
  { id: "uuid", label: "UUID", regex: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", example: "550e8400-e29b-41d4-a716-446655440000" },
  { id: "iso_date", label: "ISO Datum (YYYY-MM-DD)", regex: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", example: "2024-01-15" },
  { id: "numeric", label: "Nur Zahlen", regex: "^[0-9]+$", example: "12345" },
  { id: "alpha", label: "Nur Buchstaben", regex: "^[a-zA-ZäöüÄÖÜß]+$", example: "Straße" },
  { id: "alphanumeric", label: "Buchstaben und Zahlen", regex: "^[a-zA-Z0-9äöüÄÖÜß]+$", example: "ABC123" },
];

// ─── Structured pattern rules ────────────────────────────────────
interface PatternRule {
  type: "starts_with" | "ends_with" | "contains" | "only_chars" | "length_min" | "length_max" | "length_exact";
  value: string;
}

const RULE_TYPES = [
  { value: "starts_with", label: "Beginnt mit" },
  { value: "ends_with", label: "Endet mit" },
  { value: "contains", label: "Enthält" },
  { value: "only_chars", label: "Enthält nur" },
  { value: "length_exact", label: "Exakte Länge" },
  { value: "length_min", label: "Mindestlänge" },
  { value: "length_max", label: "Maximale Länge" },
] as const;

const ONLY_CHARS_PRESETS = [
  { label: "Buchstaben (a-z)", value: "a-zA-Z" },
  { label: "Zahlen (0-9)", value: "0-9" },
  { label: "Buchstaben + Zahlen", value: "a-zA-Z0-9" },
  { label: "Buchstaben + Umlaute", value: "a-zA-ZäöüÄÖÜß" },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rulesToRegex(rules: PatternRule[]): string {
  if (rules.length === 0) return "";

  const parts: string[] = [];
  let hasStart = false;
  let hasEnd = false;
  let onlyChars = "";
  let lengthMin = "";
  let lengthMax = "";
  let lengthExact = "";

  for (const rule of rules) {
    if (!rule.value) continue;
    switch (rule.type) {
      case "starts_with":
        parts.push(`^${escapeRegex(rule.value)}`);
        hasStart = true;
        break;
      case "ends_with":
        parts.push(`${escapeRegex(rule.value)}$`);
        hasEnd = true;
        break;
      case "contains":
        parts.push(escapeRegex(rule.value));
        break;
      case "only_chars":
        onlyChars = rule.value;
        break;
      case "length_exact":
        lengthExact = rule.value;
        break;
      case "length_min":
        lengthMin = rule.value;
        break;
      case "length_max":
        lengthMax = rule.value;
        break;
    }
  }

  // If only_chars is set, it overrides parts-based approach
  if (onlyChars) {
    let quantifier = "+";
    if (lengthExact) quantifier = `{${lengthExact}}`;
    else if (lengthMin && lengthMax) quantifier = `{${lengthMin},${lengthMax}}`;
    else if (lengthMin) quantifier = `{${lengthMin},}`;
    else if (lengthMax) quantifier = `{0,${lengthMax}}`;
    return `^[${onlyChars}]${quantifier}$`;
  }

  // Combine parts with .*
  if (parts.length === 0) {
    // Only length constraints
    if (lengthExact) return `^.{${lengthExact}}$`;
    if (lengthMin || lengthMax) return `^.{${lengthMin || "0"},${lengthMax || ""}}$`;
    return "";
  }

  let regex = parts.join(".*");
  if (!hasStart) regex = regex;
  if (!hasEnd) regex = regex;

  // Add length assertion if needed alongside other rules
  if (lengthExact || lengthMin || lengthMax) {
    const lenPart = lengthExact ? `.{${lengthExact}}` : `.{${lengthMin || "0"},${lengthMax || ""}}`;
    regex = `(?=${hasStart ? "" : "^"}${lenPart}$)${regex}`;
  }

  return regex;
}

// ─── Component ───────────────────────────────────────────────────
interface RegexBuilderProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegexBuilder({ value, onChange }: RegexBuilderProps) {
  const [mode, setMode] = useState<"template" | "builder" | "expert">("template");
  const [testValue, setTestValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [rules, setRules] = useState<PatternRule[]>([{ type: "only_chars", value: "" }]);

  function handleTemplateSelect(template: typeof REGEX_TEMPLATES[0]) {
    onChange(template.regex);
    setShowDropdown(false);
  }

  function updateRule(index: number, update: Partial<PatternRule>) {
    const next = rules.map((r, i) => i === index ? { ...r, ...update } : r);
    setRules(next);
    const regex = rulesToRegex(next);
    if (regex) onChange(regex);
  }

  function addRule() {
    setRules([...rules, { type: "contains", value: "" }]);
  }

  function removeRule(index: number) {
    const next = rules.filter((_, i) => i !== index);
    setRules(next.length === 0 ? [{ type: "only_chars", value: "" }] : next);
    onChange(rulesToRegex(next));
  }

  function testRegex(): boolean | null {
    if (!testValue || !value) return null;
    try {
      return new RegExp(value).test(testValue);
    } catch {
      return null;
    }
  }

  const testResult = testRegex();
  const isValidRegex = !value || (() => {
    try { new RegExp(value); return true; } catch { return false; }
  })();

  function getRegexErrorDetail(): string | null {
    if (!value || isValidRegex) return null;
    try {
      new RegExp(value);
      return null;
    } catch (e) {
      const msg = (e as Error).message;
      // Extract position info from error
      const posMatch = msg.match(/position (\d+)/i);
      if (posMatch) {
        return `Fehler an Position ${posMatch[1]}: ${msg.replace(/.*: /, "")}. Prüfe Klammern und Sonderzeichen an dieser Stelle.`;
      }
      if (msg.includes("Unterminated")) return "Nicht abgeschlossene Klammer oder Gruppe. Prüfe ob alle ( ) und [ ] geschlossen sind.";
      if (msg.includes("quantifier")) return "Ungültiger Wiederholungsoperator. Prüfe Zeichen wie *, +, ? und { }.";
      if (msg.includes("escape")) return "Ungültige Escape-Sequenz. Sonderzeichen wie . * + müssen mit \\\\ escaped werden.";
      return `Syntaxfehler: ${msg.replace(/.*: /, "")}`;
    }
  }

  // Determine which template matches current value
  const matchedTemplate = REGEX_TEMPLATES.find(t => t.regex === value);

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-bg rounded-lg p-0.5 border border-border">
        <button
          type="button"
          onClick={() => setMode("template")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            mode === "template" ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Vorlage
        </button>
        <button
          type="button"
          onClick={() => setMode("builder")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            mode === "builder" ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <LayoutGrid size={12} />
          Baukasten
        </button>
        <button
          type="button"
          onClick={() => setMode("expert")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            mode === "expert" ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Code size={12} />
          Regex
        </button>
      </div>

      {/* ── Template mode ── */}
      {mode === "template" && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="input-field flex items-center justify-between text-sm w-full"
          >
            <span className={matchedTemplate ? "text-text-primary" : "text-text-muted"}>
              {matchedTemplate ? matchedTemplate.label : "Vorlage wählen…"}
            </span>
            <ChevronDown size={14} className="text-text-muted flex-shrink-0 ml-2" />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
              {REGEX_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-bg-hover transition-colors ${
                    matchedTemplate?.id === template.id ? "bg-accent/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{template.label}</span>
                    {template.example && (
                      <span className="text-xs text-text-muted font-mono ml-4">{template.example}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchedTemplate && (
            <div className="mt-2 bg-bg rounded-lg px-3 py-2 border border-border">
              <span className="text-xs text-text-muted">Beispiel: </span>
              <code className="text-xs font-mono text-success">{matchedTemplate.example}</code>
            </div>
          )}
        </div>
      )}

      {/* ── Builder mode ── */}
      {mode === "builder" && (
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              {/* Rule type */}
              <div className="relative flex-shrink-0 w-36">
                <select
                  value={rule.type}
                  onChange={e => updateRule(i, { type: e.target.value as PatternRule["type"] })}
                  className="input-field text-xs pr-6 appearance-none w-full"
                >
                  {RULE_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>

              {/* Value input — context-dependent */}
              {rule.type === "only_chars" ? (
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {ONLY_CHARS_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => updateRule(i, { value: preset.value })}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        rule.value === preset.value
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-bg border-border text-text-muted hover:text-text-primary hover:border-accent/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={rule.value}
                  onChange={e => updateRule(i, { value: e.target.value })}
                  placeholder={
                    rule.type.startsWith("length") ? "z.B. 5" :
                    rule.type === "starts_with" ? "z.B. DE" :
                    rule.type === "ends_with" ? "z.B. @firma.de" :
                    "Text…"
                  }
                  className="input-field text-xs flex-1 min-w-0"
                  type={rule.type.startsWith("length") ? "number" : "text"}
                />
              )}

              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-text-muted hover:text-error transition-colors p-1 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
          >
            <Plus size={12} />
            Regel hinzufügen
          </button>

          {value && (
            <div className="bg-bg rounded-lg px-3 py-2 border border-border">
              <span className="text-xs text-text-muted">Generierter Ausdruck: </span>
              <code className="text-xs font-mono text-text-secondary">{value}</code>
            </div>
          )}
        </div>
      )}

      {/* ── Expert mode ── */}
      {mode === "expert" && (
        <div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="^[a-z]+$"
            className={`input-field font-mono text-sm ${!isValidRegex ? "border-error" : ""}`}
            spellCheck={false}
          />
          {!isValidRegex && (
            <p className="text-xs text-error mt-1">{getRegexErrorDetail()}</p>
          )}
        </div>
      )}

      {/* Test area — shown in all modes when there's a value */}
      {value && isValidRegex && (
        <div className="bg-bg rounded-lg p-3 space-y-2">
          <label className="block text-xs text-text-muted">Testwert eingeben:</label>
          <div className="flex gap-2 items-center">
            <input
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder={matchedTemplate?.example || "Testwert eingeben…"}
              className="input-field text-sm flex-1"
            />
            {testValue && testResult !== null && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${testResult ? "text-success" : "text-error"}`}>
                {testResult ? <Check size={16} /> : <X size={16} />}
                <span>{testResult ? "Passt" : "Passt nicht"}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
