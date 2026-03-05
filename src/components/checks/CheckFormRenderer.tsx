import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { FieldDefinition } from "../../data/checkRegistry";
import { ColumnSelector, ColumnMultiSelect } from "../fields/ColumnSelector";
import { ValueListEditor } from "../fields/ValueListEditor";
import { RegexBuilder } from "../fields/RegexBuilder";
import { DateFormatPicker } from "../fields/DateFormatPicker";
import { InfoTooltip } from "../ui/InfoTooltip";
import { validateField } from "../../lib/checkValidator";

interface CheckFormRendererProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  helpText?: string;
  validation?: { valid: boolean; error?: string };
  touched?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({ label, required, helpText, validation, touched, children }: FieldWrapperProps) {
  const showError = touched && validation && !validation.valid && validation.error;
  const showSuccess = touched && validation?.valid && required;

  return (
    <div className={`space-y-1.5 ${required ? "pl-2 border-l-2 border-accent/40" : ""}`}>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="text-error ml-1">*</span>}
          {!required && <span className="text-text-muted ml-1 text-xs font-normal">(optional)</span>}
        </label>
        {helpText && <InfoTooltip content={helpText} />}
        {showSuccess && <Check size={14} className="text-success" />}
      </div>
      <div className={showError ? "[&>.input-field]:border-error" : showSuccess ? "[&>.input-field]:border-success/50" : ""}>
        {children}
      </div>
      {showError && (
        <p className="text-xs text-error">{validation!.error}</p>
      )}
    </div>
  );
}

function renderField(
  field: FieldDefinition,
  value: unknown,
  isTouched: boolean,
  validation: { valid: boolean; error?: string },
  handleChange: (key: string, value: unknown) => void,
  markTouched: (key: string) => void,
) {
  switch (field.type) {
    case "column_select":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <ColumnSelector
            value={value as string}
            onChange={(v) => handleChange(field.key, v)}
            placeholder={field.placeholder}
            allowStar={field.placeholder?.includes("*")}
          />
        </FieldWrapper>
      );

    case "column_multi_select":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <ColumnMultiSelect
            value={(value as string[]) || []}
            onChange={(v) => handleChange(field.key, v)}
            placeholder={field.placeholder}
          />
        </FieldWrapper>
      );

    case "value_list":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <ValueListEditor
            value={(value as string[]) || []}
            onChange={(v) => handleChange(field.key, v)}
            placeholder={field.placeholder}
          />
        </FieldWrapper>
      );

    case "regex_builder":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <RegexBuilder
            value={value as string}
            onChange={(v) => handleChange(field.key, v)}
          />
        </FieldWrapper>
      );

    case "date_format":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <DateFormatPicker
            value={value as string}
            onChange={(v) => handleChange(field.key, v)}
            placeholder={field.placeholder}
          />
        </FieldWrapper>
      );

    case "boolean":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => handleChange(field.key, !value)}
              className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${
                value ? "bg-accent" : "bg-bg-elevated border border-border"
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                value ? "translate-x-5.5 ml-5" : "ml-0.5"
              }`} style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
            </div>
            <span className="text-sm text-text-secondary">
              {value ? "Aktiviert" : "Deaktiviert"}
            </span>
          </label>
        </FieldWrapper>
      );

    case "select":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <div className="relative">
            <select
              value={value as string}
              onChange={(e) => handleChange(field.key, e.target.value)}
              onBlur={() => markTouched(field.key)}
              className="input-field text-sm appearance-none pr-8"
            >
              {!value && <option value="">Bitte wählen…</option>}
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">▼</span>
          </div>
        </FieldWrapper>
      );

    case "number":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() => markTouched(field.key)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`input-field text-sm ${isTouched && !validation.valid ? "border-error" : isTouched && validation.valid && field.required ? "border-success/50" : ""}`}
          />
        </FieldWrapper>
      );

    case "schema_editor":
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <textarea
            value={value as string}
            onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => markTouched(field.key)}
            placeholder={field.placeholder}
            className="input-field text-sm font-mono resize-none h-24"
            spellCheck={false}
          />
        </FieldWrapper>
      );

    case "text":
    default:
      return (
        <FieldWrapper key={field.key} label={field.label} required={field.required} helpText={field.helpText} validation={validation} touched={isTouched}>
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => markTouched(field.key)}
            placeholder={field.placeholder}
            className={`input-field text-sm ${isTouched && !validation.valid ? "border-error" : isTouched && validation.valid && field.required ? "border-success/50" : ""}`}
          />
        </FieldWrapper>
      );
  }
}

export function CheckFormRenderer({ fields, values, onChange }: CheckFormRendererProps) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showOptional, setShowOptional] = useState(false);

  function markTouched(key: string) {
    setTouched(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function handleChange(key: string, value: unknown) {
    markTouched(key);
    onChange(key, value);
  }

  // Split fields into required and optional
  const requiredFields = fields.filter(f => f.required);
  const optionalFields = fields.filter(f => !f.required);

  // Count filled required fields
  const filledRequired = requiredFields.filter(f => {
    const v = values[f.key] ?? f.defaultValue ?? "";
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  // Count filled optional fields
  const filledOptional = optionalFields.filter(f => {
    const v = values[f.key] ?? f.defaultValue ?? "";
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Progress indicator for required fields */}
      {requiredFields.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="flex-1 bg-bg-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all duration-300"
              style={{ width: `${(filledRequired.length / requiredFields.length) * 100}%` }}
            />
          </div>
          <span>{filledRequired.length} von {requiredFields.length} Pflichtfeldern</span>
        </div>
      )}

      {/* Required fields — always visible */}
      {requiredFields.map((field) => {
        const value = values[field.key] ?? field.defaultValue ?? "";
        const isTouched = touched.has(field.key);
        const validation = validateField(field.key, value, field);
        return renderField(field, value, isTouched, validation, handleChange, markTouched);
      })}

      {/* Optional fields — behind collapsible (if there are any) */}
      {optionalFields.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
          >
            <ChevronRight size={12} className={`transition-transform ${showOptional ? "rotate-90" : ""}`} />
            Optionale Einstellungen ({optionalFields.length})
            {filledOptional.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                {filledOptional.length} gesetzt
              </span>
            )}
          </button>

          {showOptional && (
            <div className="space-y-4 mt-3">
              {optionalFields.map((field) => {
                const value = values[field.key] ?? field.defaultValue ?? "";
                const isTouched = touched.has(field.key);
                const validation = validateField(field.key, value, field);
                return renderField(field, value, isTouched, validation, handleChange, markTouched);
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
