import { useState } from "react";
import {
  ShieldCheck, ArrowLeftRight, ListChecks, Regex, Calendar,
  Braces, Fingerprint, Link, Table, TrendingUp,
  Globe, LayoutList, Code, GitCompare, ChevronDown, ChevronRight
} from "lucide-react";
import { CATEGORIES, getChecksByCategory } from "../../data/checkRegistry";
import type { CheckCategory } from "../../types/dqx";
import { GlossaryTerm } from "../ui/GlossaryTerm";

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck size={20} />,
  ArrowLeftRight: <ArrowLeftRight size={20} />,
  ListChecks: <ListChecks size={20} />,
  Regex: <Regex size={20} />,
  Calendar: <Calendar size={20} />,
  Braces: <Braces size={20} />,
  Fingerprint: <Fingerprint size={20} />,
  Link: <Link size={20} />,
  Table: <Table size={20} />,
  TrendingUp: <TrendingUp size={20} />,
  Globe: <Globe size={20} />,
  LayoutList: <LayoutList size={20} />,
  Code: <Code size={20} />,
  GitCompare: <GitCompare size={20} />,
};

// "Was bedeutet das?" details per category
const CATEGORY_DETAILS: Record<string, { when: string | React.ReactNode; examples: string[] }> = {
  completeness: {
    when: <>Wenn Felder nicht leer oder <GlossaryTerm definition="Ein fehlender oder unbekannter Wert – nicht dasselbe wie 0 oder ein leerer String." glossaryTerm="NULL">NULL</GlossaryTerm> sein dürfen – z.B. bei Pflichtfeldern.</>,
    examples: ["Kunden-ID muss immer vorhanden sein", "E-Mail darf nicht leer sein"],
  },
  range: {
    when: "Wenn Zahlenwerte innerhalb bestimmter Grenzen liegen sollen.",
    examples: ["Preis >= 0", "Alter zwischen 0 und 150", "Bewertung zwischen 1 und 5"],
  },
  allowed_values: {
    when: "Wenn nur bestimmte vordefinierte Werte erlaubt sind.",
    examples: ["Status: aktiv / inaktiv / gesperrt", "Land: DE / AT / CH"],
  },
  pattern: {
    when: "Wenn ein Wert einem bestimmten Format entsprechen muss.",
    examples: ["E-Mail-Format prüfen", "PLZ muss 5-stellig sein", "IBAN-Format"],
  },
  date_time: {
    when: "Wenn Datums- und Zeitfelder korrekt sein müssen.",
    examples: ["Bestelldatum darf nicht in der Zukunft liegen", "Daten müssen aktuell sein (<24h)"],
  },
  json: {
    when: "Wenn Spalten JSON-Daten enthalten.",
    examples: ["payload muss gültiges JSON sein", "Alle Pflichtfelder im JSON vorhanden"],
  },
  uniqueness: {
    when: "Wenn Werte eindeutig sein müssen (keine Duplikate erlaubt).",
    examples: ["Kunden-ID eindeutig", "Kombination IBAN + Buchungsdatum eindeutig"],
  },
  referential_integrity: {
    when: "Wenn Verweise auf andere Tabellen korrekt sein müssen.",
    examples: ["Jede Bestellung hat einen gültigen Kunden", "Produkt-ID existiert im Katalog"],
  },
  schema: {
    when: "Wenn die Tabellenstruktur selbst geprüft werden soll.",
    examples: ["Alle Pflicht-Spalten vorhanden", "Datentypen stimmen mit Schema überein"],
  },
  aggregation: {
    when: <>Wenn <GlossaryTerm definition="Zusammenfassende Berechnungen über mehrere Zeilen: Summe, Durchschnitt, Anzahl, Maximum." glossaryTerm="Aggregation">zusammengefasste Werte</GlossaryTerm> bestimmte Grenzen einhalten müssen.</>,
    examples: ["Gesamtumsatz >= Mindestumsatz", "Anzahl Datensätze zwischen 100 und 10000"],
  },
  network: {
    when: <>Wenn IP-Adressen auf Gültigkeit geprüft werden müssen – z.B. ob sie aus einem bestimmten <GlossaryTerm definition="Notation für IP-Adressbereiche, z.B. 192.168.1.0/24." glossaryTerm="CIDR-Block">CIDR-Block</GlossaryTerm> stammen.</>,
    examples: ["Server-IP muss gültige IPv4-Adresse sein", "IP muss aus internem CIDR-Block stammen"],
  },
  array: {
    when: "Wenn Array-Spalten nicht leer sein dürfen.",
    examples: ["tags-Array darf nicht leer sein", "items-Liste braucht mindestens einen Eintrag"],
  },
  custom: {
    when: "Wenn keine Standardprüfung ausreicht und eigene SQL-Logik benötigt wird.",
    examples: ["umsatz > 0 AND status != 'storniert'", "start_datum < end_datum"],
  },
  comparison: {
    when: "Wenn diese Tabelle mit einer anderen verglichen werden soll.",
    examples: ["Staging vs. Produktion vergleichen", "Tagesabschluss mit Quellsystem abgleichen"],
  },
};

interface CheckCategoryPickerProps {
  onSelect: (category: CheckCategory) => void;
}

export function CheckCategoryPicker({ onSelect }: CheckCategoryPickerProps) {
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-base font-semibold text-text-primary mb-1">Kategorie wählen</h3>
      <p className="text-xs text-text-muted mb-4">
        Klicke auf eine Kategorie um einen Check zu erstellen. Klappe mit dem Pfeil Details auf.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => {
          const checkCount = getChecksByCategory(cat.key).length;
          const details = CATEGORY_DETAILS[cat.key];
          const isExpanded = expandedDetails === cat.key;

          return (
            <div key={cat.key} className="card hover:border-accent/50 transition-all">
              {/* Main row – clicking this selects the category */}
              <button
                onClick={() => onSelect(cat.key)}
                className="flex items-start gap-3 w-full text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-bg flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors flex-shrink-0">
                  {ICON_MAP[cat.icon] ?? <ListChecks size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary text-sm">{cat.label}</span>
                    <span className="badge-neutral text-xs">{checkCount}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{cat.description}</p>
                </div>
              </button>

              {/* "Was bedeutet das?" expander */}
              {details && (
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDetails(isExpanded ? null : cat.key);
                    }}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown size={11} />
                      : <ChevronRight size={11} />
                    }
                    Was bedeutet das?
                  </button>

                  {isExpanded && (
                    <div className="mt-2 pl-1 space-y-2 border-l-2 border-accent/20 ml-1">
                      <p className="text-xs text-text-secondary leading-relaxed">
                        <span className="font-medium text-text-primary">Wann verwenden?</span>
                        <br />{details.when}
                      </p>
                      <div>
                        <span className="text-xs font-medium text-text-primary">Beispiele:</span>
                        <ul className="mt-1 space-y-0.5">
                          {details.examples.map((ex, i) => (
                            <li key={i} className="text-xs text-text-muted flex items-start gap-1">
                              <span className="text-accent mt-0.5">·</span>
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
