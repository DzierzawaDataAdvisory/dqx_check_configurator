import { useState } from "react";
import { Eye } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { PreviewModal } from "../preview/PreviewModal";
import { Step1TableSetup } from "./Step1TableSetup";
import { Step2AttributeEntry } from "./Step2AttributeEntry";
import { Step3QuickChecks } from "./Step3QuickChecks";
import { Step4AttributeOverview } from "./Step4AttributeOverview";
import { Step5FinalOverview } from "./Step5FinalOverview";
import { ToastContainer } from "../ui/Toast";

const STEPS: { label: string; short: string }[] = [
  { label: "Tabelle definieren", short: "Tabelle" },
  { label: "Attribute anlegen", short: "Attribute" },
  { label: "Basis-Checks", short: "Basis" },
  { label: "Checks konfigurieren", short: "Checks" },
  { label: "Übersicht", short: "Fertig" },
];

export function WizardShell() {
  const { wizardStep, setWizardStep, tableConfig, uploadedFromExcel } = useCheckStore();
  const [previewOpen, setPreviewOpen] = useState(false);

  const totalSteps = STEPS.length;
  const canGoNext = wizardStep < totalSteps;
  const canGoBack = wizardStep > 1;

  function handleNext() {
    if (!canGoNext) return;
    let next = wizardStep + 1;
    // Skip Step 2 if Excel was uploaded
    if (wizardStep === 1 && uploadedFromExcel) next = 3;
    setWizardStep(next as 1 | 2 | 3 | 4 | 5);
  }

  function handleBack() {
    if (!canGoBack) return;
    let prev = wizardStep - 1;
    // Skip Step 2 backwards if Excel was uploaded
    if (wizardStep === 3 && uploadedFromExcel) prev = 1;
    setWizardStep(prev as 1 | 2 | 3 | 4 | 5);
  }

  const nextDisabled = wizardStep === 1 && !tableConfig.table.trim();

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-bg-surface border-b border-border flex-shrink-0">
        <span className="text-sm font-bold text-accent tracking-wide">DQX Check Configurator</span>
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bg-elevated hover:bg-accent/10 text-text-secondary hover:text-accent border border-border transition-colors"
        >
          <Eye size={15} />
          Vorschau
        </button>
      </header>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 px-6 py-4 bg-bg-surface border-b border-border flex-shrink-0">
        {STEPS.map((step, i) => {
          const num = i + 1;
          const isActive = num === wizardStep;
          const isDone = num < wizardStep;
          // Visually skip Step 2 indicator if uploaded from Excel
          const isSkipped = uploadedFromExcel && num === 2;

          return (
            <div key={num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    isActive
                      ? "bg-accent border-accent text-white"
                      : isDone
                      ? "bg-accent/20 border-accent/40 text-accent"
                      : isSkipped
                      ? "bg-bg-elevated border-border text-text-muted opacity-40"
                      : "bg-bg-elevated border-border text-text-muted"
                  }`}
                >
                  {isDone ? "✓" : num}
                </div>
                <span className={`text-[10px] mt-1 whitespace-nowrap ${
                  isActive ? "text-accent font-medium" : isSkipped ? "text-text-muted opacity-40" : "text-text-muted"
                }`}>
                  {step.short}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mb-4 mx-1 transition-colors ${
                  num < wizardStep ? "bg-accent/40" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step title */}
      <div className="px-8 pt-6 pb-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-text-primary">
          Schritt {wizardStep}: {STEPS[wizardStep - 1].label}
        </h1>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto px-8 py-4">
        {wizardStep === 1 && <Step1TableSetup />}
        {wizardStep === 2 && <Step2AttributeEntry />}
        {wizardStep === 3 && <Step3QuickChecks />}
        {wizardStep === 4 && <Step4AttributeOverview />}
        {wizardStep === 5 && <Step5FinalOverview />}
      </main>

      {/* Navigation footer */}
      <footer className="flex items-center justify-between px-8 py-4 bg-bg-surface border-t border-border flex-shrink-0">
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Zurück
        </button>

        <span className="text-xs text-text-muted">
          {wizardStep} / {totalSteps}
        </span>

        {wizardStep < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={nextDisabled}
            className="px-5 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Weiter →
          </button>
        ) : (
          <button
            onClick={() => setWizardStep(1)}
            className="px-5 py-2 text-sm rounded-lg bg-bg-elevated border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Neu starten
          </button>
        )}
      </footer>

      {previewOpen && <PreviewModal onClose={() => setPreviewOpen(false)} />}
      <ToastContainer />
    </div>
  );
}
