import { useState } from "react";
import { X, ChevronRight, CheckCircle2, Users, Receipt, ShoppingBag, Cpu, UserCheck, Layout } from "lucide-react";
import { CHECK_TEMPLATES, getTemplatePlaceholderColumns } from "../../data/checkTemplates";
import type { CheckTemplate } from "../../data/checkTemplates";
import { useCheckStore } from "../../hooks/useCheckStore";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";
import { toast } from "../../hooks/useToastStore";
import type { CheckCategory } from "../../types/dqx";
import type { Criticality } from "../../types/dqx";
import type { CheckFunction } from "../../types/dqx";

interface TemplateGalleryProps {
  onClose: () => void;
}

function getTemplateIcon(icon: string, size = 20) {
  const props = { size, className: "text-accent" };
  switch (icon) {
    case "Users": return <Users {...props} />;
    case "Receipt": return <Receipt {...props} />;
    case "ShoppingBag": return <ShoppingBag {...props} />;
    case "Cpu": return <Cpu {...props} />;
    case "UserCheck": return <UserCheck {...props} />;
    default: return <Layout {...props} />;
  }
}

type Step = "gallery" | "mapping";

export function TemplateGallery({ onClose }: TemplateGalleryProps) {
  const modalRef = useModalKeyboard(onClose);
  const { tableConfig, addChecks } = useCheckStore();
  const [step, setStep] = useState<Step>("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<CheckTemplate | null>(null);
  // Map: placeholderColumn → actual table column name
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const tableColumns = tableConfig.columns.map(c => c.name);

  function handleSelectTemplate(template: CheckTemplate) {
    setSelectedTemplate(template);
    // Initialize mapping: if column name matches, pre-fill it
    const placeholders = getTemplatePlaceholderColumns(template);
    const initialMapping: Record<string, string> = {};
    for (const placeholder of placeholders) {
      // Try exact match first, then case-insensitive
      const exact = tableColumns.find(c => c === placeholder);
      const ci = tableColumns.find(c => c.toLowerCase() === placeholder.toLowerCase());
      initialMapping[placeholder] = exact || ci || "";
    }
    setColumnMapping(initialMapping);
    setStep("mapping");
  }

  function handleApply() {
    if (!selectedTemplate) return;

    const checks = selectedTemplate.checks.map(tc => {
      // Replace placeholder column names with mapped names
      const mappedArgs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(tc.arguments)) {
        if (typeof value === "string" && tc.placeholderColumns.includes(value)) {
          mappedArgs[key] = columnMapping[value] || value;
        } else if (Array.isArray(value)) {
          mappedArgs[key] = value.map(v =>
            typeof v === "string" && tc.placeholderColumns.includes(v)
              ? (columnMapping[v] || v)
              : v
          );
        } else {
          mappedArgs[key] = value;
        }
      }

      return {
        category: tc.category as CheckCategory,
        dqxCheck: {
          criticality: tc.criticality as Criticality,
          check: {
            function: tc.checkFunction as CheckFunction,
            arguments: mappedArgs,
          },
        },
      };
    });

    addChecks(checks);
    toast(`Vorlage angewendet: ${checks.length} Check${checks.length !== 1 ? "s" : ""} hinzugefügt`, "success");
    onClose();
  }

  const placeholders = selectedTemplate ? getTemplatePlaceholderColumns(selectedTemplate) : [];
  const allMapped = placeholders.every(p => columnMapping[p]);

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true" aria-label="Check-Vorlage auswählen">
      <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step === "mapping" && (
              <button onClick={() => setStep("gallery")} className="btn-ghost p-1.5" aria-label="Zurück zur Übersicht">
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {step === "gallery" ? "Check-Vorlage auswählen" : `Vorlage anwenden: ${selectedTemplate?.name}`}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {step === "gallery"
                  ? "Vorgefertigte Check-Pakete für typische Anwendungsfälle"
                  : "Weise den Platzhalter-Spalten deine Tabellenspalten zu"
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === "gallery" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHECK_TEMPLATES.map(template => {
                const checkCount = template.checks.length;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="card text-left hover:border-accent/50 hover:bg-bg-elevated transition-all flex items-start gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {getTemplateIcon(template.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-text-primary text-sm">{template.name}</span>
                        <span className="text-xs text-text-muted flex-shrink-0">{checkCount} Checks</span>
                      </div>
                      <span className="text-xs text-accent mb-1 block">{template.category}</span>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{template.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === "mapping" && selectedTemplate && (
            <div className="space-y-5">
              {/* Check preview */}
              <div className="bg-bg rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-text-secondary mb-2">Enthaltene Checks ({selectedTemplate.checks.length})</p>
                {selectedTemplate.checks.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-text-muted">
                    <CheckCircle2 size={12} className="text-success flex-shrink-0" />
                    <span className="font-mono">{tc.checkFunction}</span>
                    <span className="text-text-muted/60">—</span>
                    <span>{tc.placeholderColumns.join(", ")}</span>
                  </div>
                ))}
              </div>

              {/* Column mapping */}
              {placeholders.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text-primary">Spalten-Zuordnung</p>
                  <p className="text-xs text-text-muted">
                    Weise die Vorlagen-Platzhalter den Spalten deiner Tabelle zu.
                  </p>
                  {placeholders.map(placeholder => (
                    <div key={placeholder} className="flex items-center gap-3">
                      <div className="flex-1 bg-bg rounded-lg px-3 py-2 font-mono text-xs text-text-secondary border border-border">
                        {placeholder}
                      </div>
                      <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
                      <div className="flex-1">
                        {tableColumns.length > 0 ? (
                          <select
                            value={columnMapping[placeholder] || ""}
                            onChange={e => setColumnMapping(prev => ({ ...prev, [placeholder]: e.target.value }))}
                            className="input-field text-sm w-full"
                          >
                            <option value="">Bitte wählen…</option>
                            {tableColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={columnMapping[placeholder] || ""}
                            onChange={e => setColumnMapping(prev => ({ ...prev, [placeholder]: e.target.value }))}
                            placeholder={`Spaltenname für ${placeholder}`}
                            className="input-field text-sm w-full"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {!allMapped && (
                    <p className="text-xs text-warning">Bitte alle Spalten zuordnen, um die Vorlage anzuwenden.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Diese Vorlage enthält keine Spalten-Platzhalter und kann direkt angewendet werden.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          {step === "mapping" && (
            <button
              onClick={handleApply}
              disabled={placeholders.length > 0 && !allMapped}
              className="btn-primary"
            >
              {selectedTemplate?.checks.length} Checks hinzufügen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
