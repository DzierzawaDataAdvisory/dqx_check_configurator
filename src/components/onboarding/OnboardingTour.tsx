import { useState, useEffect } from "react";
import { X, ArrowRight, ChevronLeft, ChevronRight, Sparkles, Users, Wrench } from "lucide-react";

type UserRole = "business" | "technical";

interface TourStep {
  title: string;
  description: string;
  /** Description override for business role */
  businessDescription?: string;
  location?: string;
  position: "center" | "bottom-left" | "bottom-right" | "top-left" | "top-right";
  highlight?: "nav-table" | "nav-checks" | "nav-export" | "yaml-panel" | "none";
  /** If set, show an action hint that the user should click */
  actionHint?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Willkommen beim DQX Check Designer!",
    description:
      "Dieser Assistent hilft dir, Datenqualitäts-Checks zu erstellen. In 4 kurzen Schritten lernst du die wichtigsten Funktionen kennen.",
    position: "center",
  },
  {
    title: "Schritt 1: Tabelle & Schema definieren",
    description:
      "Beginne damit, deine Tabelle zu konfigurieren. Gib Catalog, Schema und Tabellenname ein und importiere dein Spaltenmodell – per CSV, DDL, JSON oder direkt als DESCRIBE TABLE-Output.",
    businessDescription:
      "Beginne damit, deine Tabelle auszuwählen. Falls dir die technischen Details fehlen, bitte dein Data-Engineering-Team um den Tabellennamen und das Schema (z.B. als CSV-Datei).",
    location: "Tabelle & Schema (linke Navigation)",
    position: "bottom-left",
    highlight: "nav-table",
    actionHint: 'Tipp: Klicke auf "Schema importieren" um dein Spaltenmodell zu laden.',
  },
  {
    title: "Schritt 2: Checks konfigurieren",
    description:
      "Füge Data-Quality-Checks hinzu. Die Suche im Wizard findet Checks direkt nach Stichwort. Nutze Quick-Add (+) an jeder Spalte für schnelle Checks.",
    businessDescription:
      'Füge Prüfregeln für deine Daten hinzu. Die Suchfunktion findet passende Checks – oder starte mit einer Vorlage. Einfache Checks wie "darf nicht leer sein" lassen sich mit einem Klick erstellen.',
    location: "Checks (linke Navigation)",
    position: "bottom-left",
    highlight: "nav-checks",
    actionHint: "Tipp: Nutze die automatischen Vorschläge basierend auf deinen Spalten.",
  },
  {
    title: "Schritt 3: Live-Vorschau",
    description:
      "Rechts siehst du immer eine Live-Vorschau des generierten DQX-YAML. Wechsle zwischen YAML, JSON und der erklärten Ansicht.",
    businessDescription:
      'Rechts siehst du eine Zusammenfassung deiner Checks. Im Tab "Erklärt" werden alle Regeln in verständlicher Sprache angezeigt.',
    location: "Vorschau-Panel (rechte Seite)",
    position: "bottom-right",
    highlight: "yaml-panel",
  },
  {
    title: "Schritt 4: Exportieren",
    description:
      "Exportiere deine Checks als YAML/JSON. Du findest fertigen Python-Code für Batch- und Streaming-Pipelines sowie Konfigurationshilfe für DQX-Workflows.",
    businessDescription:
      "Lade deine Checks als Datei herunter und sende sie an dein Data-Engineering-Team. Eine Schritt-für-Schritt-Anleitung hilft dir dabei.",
    location: "Export (linke Navigation)",
    position: "bottom-left",
    highlight: "nav-export",
  },
  {
    title: "Du bist startklar!",
    description:
      "Viel Erfolg! Falls du Hilfe brauchst: Das Glossar (?) oben rechts erklärt alle Fachbegriffe. Unterstrichene Begriffe in der Oberfläche lassen sich direkt anklicken.",
    position: "center",
  },
];

const CARD_POSITION_CLASSES: Record<TourStep["position"], string> = {
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "bottom-left": "bottom-8 left-64",
  "bottom-right": "bottom-8 right-24",
  "top-left": "top-24 left-64",
  "top-right": "top-24 right-24",
};

function HighlightMarker({ type }: { type: TourStep["highlight"] }) {
  if (!type || type === "none") return null;

  const markerMap: Record<string, { style: React.CSSProperties; label: string }> = {
    "nav-table": { style: { top: 110, left: 10, width: 220, height: 44 }, label: "Tabelle & Schema" },
    "nav-checks": { style: { top: 160, left: 10, width: 220, height: 44 }, label: "Checks" },
    "nav-export": { style: { top: 210, left: 10, width: 220, height: 44 }, label: "Export" },
    "yaml-panel": { style: { top: 56, right: 0, width: 400, bottom: 0 }, label: "Vorschau" },
  };

  const m = markerMap[type];
  if (!m) return null;

  return (
    <div
      className="absolute border-2 border-accent rounded-lg pointer-events-none animate-pulse"
      style={{ ...m.style, position: "fixed", zIndex: 51 }}
    >
      <div className="absolute -top-5 left-2 text-xs text-accent font-medium bg-bg-surface px-1 rounded">
        {m.label}
      </div>
    </div>
  );
}

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [role, setRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem("dqx-user-role");
    return saved === "business" || saved === "technical" ? saved : null;
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  // Role selection screen
  if (!role) {
    return (
      <div className="fixed inset-0 z-[60] pointer-events-none">
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" />
        <div className="absolute z-[61] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] bg-bg-surface border border-border rounded-2xl shadow-2xl pointer-events-auto">
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary">Willkommen!</h2>
                <p className="text-xs text-text-muted">Wie arbeitest du hauptsächlich mit Daten?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setRole("business");
                  localStorage.setItem("dqx-user-role", "business");
                }}
                className="card hover:border-accent/50 transition-all text-left p-4 space-y-2"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users size={18} className="text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-text-primary block">Fachbereich</span>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    Ich definiere Datenqualitäts-Regeln, bin aber kein Entwickler.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setRole("technical");
                  localStorage.setItem("dqx-user-role", "technical");
                }}
                className="card hover:border-accent/50 transition-all text-left p-4 space-y-2"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Wrench size={18} className="text-purple-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-text-primary block">Technisch</span>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    Ich bin Data Engineer und arbeite mit YAML, SQL und Pipelines.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onComplete}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Tour überspringen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const description = role === "business" && step.businessDescription
    ? step.businessDescription
    : step.description;

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setStepIndex(i => i + 1);
    }
  }

  function handleSkip() {
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleSkip} />
      <HighlightMarker type={step.highlight} />

      <div
        className={`absolute z-[61] w-96 bg-bg-surface border border-border rounded-2xl shadow-2xl pointer-events-auto ${CARD_POSITION_CLASSES[step.position]}`}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === stepIndex
                    ? "w-4 h-1.5 bg-accent"
                    : i < stepIndex
                    ? "w-1.5 h-1.5 bg-accent/40"
                    : "w-1.5 h-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-text-muted hover:text-text-secondary transition-colors"
            title="Tour überspringen"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 pt-3 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary leading-tight">{step.title}</h3>
              {step.location && (
                <div className="flex items-center gap-1 mt-0.5">
                  <ArrowRight size={11} className="text-accent" />
                  <span className="text-xs text-accent font-medium">{step.location}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>

          {/* Action hint */}
          {step.actionHint && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
              <p className="text-xs text-accent leading-relaxed">{step.actionHint}</p>
            </div>
          )}

          {/* Step counter + buttons */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-muted">
              {stepIndex + 1} von {TOUR_STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={() => setStepIndex(i => i - 1)}
                  className="btn-ghost text-xs flex items-center gap-1 py-1.5 px-2.5"
                >
                  <ChevronLeft size={13} />
                  Zurück
                </button>
              )}
              <button
                onClick={handleNext}
                className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3"
              >
                {isLast ? "Los geht's!" : "Weiter"}
                {!isLast && <ChevronRight size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
