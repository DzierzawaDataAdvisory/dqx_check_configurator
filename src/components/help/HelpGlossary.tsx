import { useState, useMemo } from "react";
import { X, Search, BookOpen } from "lucide-react";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";

interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
  example?: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // DQX-Konzepte
  {
    term: "DQX (Data Quality eXtended)",
    category: "DQX-Konzepte",
    definition:
      "Open-Source-Framework von Databricks Labs für deklarative Data-Quality-Checks auf PySpark DataFrames. Checks werden als YAML/JSON definiert und zur Laufzeit vom DQEngine ausgeführt.",
    example: "DQX erkennt z.B. fehlende Kundennummern oder falsche E-Mail-Formate automatisch.",
  },
  {
    term: "DQEngine",
    category: "DQX-Konzepte",
    definition:
      "Die Kernkomponente von DQX, die Checks auf DataFrames anwendet. Sie erzeugt Ergebnisspalten _errors und _warnings, die Verletzungen pro Zeile enthalten.",
  },
  {
    term: "Criticality (Schweregrad)",
    category: "DQX-Konzepte",
    definition:
      "Gibt an, wie schwerwiegend eine Verletzung ist. 'error' bedeutet, der Datensatz enthält einen kritischen Fehler. 'warn' ist eine Warnung, der Datensatz wird trotzdem als valide behandelt.",
    example: "Eine fehlende Kundennummer wäre ein 'error', ein fehlendes optionales Feld eher ein 'warn'.",
  },
  {
    term: "Check-Set",
    category: "DQX-Konzepte",
    definition:
      "Eine Sammlung von Data-Quality-Checks für eine bestimmte Tabelle. Ein Check-Set wird als eine YAML-Datei exportiert.",
  },
  {
    term: "user_metadata",
    category: "DQX-Konzepte",
    definition:
      "Beliebige Key-Value-Paare, die einem Check zugeordnet werden können. Nützlich für Zuordnung zu Teams, SLAs oder Tickets. Erscheinen im YAML-Export unter 'user_metadata'.",
    example: "owner: team_vertrieb\nsla: '99.5'\nticket: DQ-123",
  },
  {
    term: "for_each_column",
    category: "DQX-Konzepte",
    definition:
      "Mit for_each_column kann ein Check auf mehrere Spalten gleichzeitig angewendet werden. DQX erstellt intern einen Check pro Spalte.",
    example: "is_not_null auf [kunde_id, name, email] erzeugt 3 separate Checks im Ergebnis.",
  },
  {
    term: "Row-Level Check",
    category: "DQX-Konzepte",
    definition:
      "Ein Check, der für jede Zeile einzeln ausgeführt wird. Prüft z.B. ob ein Wert nicht NULL ist oder einem Muster entspricht.",
  },
  {
    term: "Dataset-Level Check",
    category: "DQX-Konzepte",
    definition:
      "Ein Check, der den gesamten Datensatz betrachtet. Prüft z.B. ob Spaltenkombinationen eindeutig sind oder ob Aggregationswerte bestimmte Grenzen einhalten.",
  },
  // Datenqualitätsbegriffe
  {
    term: "NULL",
    category: "Datenqualität",
    definition:
      "Ein fehlender oder unbekannter Wert. NULL ist nicht dasselbe wie 0 oder ein leerer String! In SQL bedeutet NULL 'nicht vorhanden' oder 'unbekannt'.",
    example: "Wenn ein Bestelldatum nicht eingetragen wurde, ist es NULL – nicht leer.",
  },
  {
    term: "Leerstring (Empty String)",
    category: "Datenqualität",
    definition:
      "Ein String ohne Zeichen (''). Technisch gesehen vorhanden, aber ohne Inhalt. Unterschied zu NULL: ein Leerstring existiert, hat aber keinen Wert.",
    example: "name = '' ist ein Leerstring, name = NULL ist nicht vorhanden.",
  },
  {
    term: "Regex (Regulärer Ausdruck)",
    category: "Datenqualität",
    definition:
      "Ein Muster zur Beschreibung von Zeichenketten. Damit lässt sich prüfen ob ein Wert einem bestimmten Format entspricht, z.B. ob eine E-Mail-Adresse gültig ist.",
    example: "^[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z]{2,}$ prüft auf gültiges E-Mail-Format.",
  },
  {
    term: "Composite Key (Zusammengesetzter Schlüssel)",
    category: "Datenqualität",
    definition:
      "Ein eindeutiger Identifikator, der aus mehreren Spalten besteht. Nur die Kombination aller Spalten ist eindeutig, nicht jede Spalte einzeln.",
    example: "Bei Bestellpositionen: Bestellung_ID + Position_Nr zusammen sind eindeutig.",
  },
  {
    term: "Referentielle Integrität",
    category: "Datenqualität",
    definition:
      "Stellt sicher, dass Verweise (Foreign Keys) auf tatsächlich vorhandene Datensätze zeigen. Z.B. muss jede Bestellung auf einen existierenden Kunden verweisen.",
    example: "kunden_id in Bestellungen muss in der Kundentabelle vorhanden sein (foreign_key).",
  },
  {
    term: "Aggregation",
    category: "Datenqualität",
    definition:
      "Berechnung eines zusammenfassenden Wertes über mehrere Zeilen. Beispiele: Summe, Durchschnitt, Anzahl, Maximum. Wird für Dataset-Level Checks verwendet.",
    example: "is_aggr_not_less_than prüft: Summe aller Beträge >= Mindestumsatz.",
  },
  {
    term: "Ausreißer (Outlier)",
    category: "Datenqualität",
    definition:
      "Ein Datenwert, der stark vom typischen Wertebereich abweicht. DQX erkennt Ausreißer anhand der MAD-Methode (Median Absolute Deviation).",
    example: "Ein Bestellwert von 1.000.000€ in einer Tabelle mit typischen Werten von 10-500€.",
  },
  {
    term: "Filter",
    category: "Datenqualität",
    definition:
      "Ein Spark-SQL-Ausdruck, der bestimmt auf welche Zeilen ein Check angewendet wird. Zeilen, die den Filter nicht erfüllen, werden vom Check ausgeschlossen.",
    example: "filter: \"status = 'aktiv'\" – der Check wird nur für aktive Datensätze ausgeführt.",
  },
  // Technische Begriffe
  {
    term: "YAML",
    category: "Technisch",
    definition:
      "Ein menschenlesbares Dateiformat für Konfigurationsdaten. DQX-Checks werden als YAML-Dateien gespeichert und von der DQEngine geladen.",
  },
  {
    term: "PySpark DataFrame",
    category: "Technisch",
    definition:
      "Eine tabellarische Datenstruktur in Apache Spark, mit der große Datenmengen verarbeitet werden. DQX-Checks werden auf DataFrames angewendet.",
  },
  {
    term: "Unity Catalog",
    category: "Technisch",
    definition:
      "Das zentrale Datenverwaltungssystem für Databricks. Tabellen sind im Format catalog.schema.table organisiert.",
    example: "main.vertrieb.kunden ist eine Tabelle 'kunden' im Schema 'vertrieb' des Catalogs 'main'.",
  },
  {
    term: "DESCRIBE TABLE",
    category: "Technisch",
    definition:
      "SQL-Befehl in Databricks/Spark, der die Spaltenstruktur einer Tabelle anzeigt (Spaltenname, Datentyp, Kommentar). Der DQX Check Designer kann dieses Format direkt importieren.",
    example: "DESCRIBE TABLE main.schema.meine_tabelle",
  },
  {
    term: "Spark printSchema()",
    category: "Technisch",
    definition:
      "Python-Methode die das Schema eines DataFrames als Baumstruktur ausgibt. Kann direkt in den Schema-Import eingefügt werden.",
    example: "df.printSchema() gibt aus: |-- customer_id: string (nullable = true)",
  },
  {
    term: "Delta Lake / Delta Format",
    category: "Technisch",
    definition:
      "Ein Open-Source-Speicherformat für Databricks das ACID-Transaktionen und Zeitreisen unterstützt. Das empfohlene Format für DQX-Output-Tabellen.",
  },
  // Weitere Begriffe (Phase 5.3)
  {
    term: "Catalog",
    category: "Technisch",
    definition:
      "Die oberste Hierarchie-Ebene in Databricks Unity Catalog. Catalogs gruppieren Schemas und Tabellen – z.B. getrennt nach Umgebung (development, staging, production) oder Fachbereich.",
    example: "production.vertrieb.kunden – 'production' ist der Catalog.",
  },
  {
    term: "Schema (Databricks)",
    category: "Technisch",
    definition:
      "Die zweite Hierarchie-Ebene in Unity Catalog (auch Database genannt). Schemas gruppieren zusammengehörige Tabellen innerhalb eines Catalogs – z.B. nach Fachbereich oder Datendomäne.",
    example: "production.vertrieb.kunden – 'vertrieb' ist das Schema.",
  },
  {
    term: "Spark SQL",
    category: "Technisch",
    definition:
      "SQL-Dialekt in Apache Spark / Databricks. Wird in DQX-Filtern und Custom-Checks verwendet. Unterstützt Standardfunktionen wie YEAR(), CURRENT_DATE, CONCAT() etc.",
    example: "filter: \"status = 'aktiv' AND YEAR(created_at) = 2024\"",
  },
  {
    term: "CIDR-Block",
    category: "Technisch",
    definition:
      "Notation für IP-Adressbereiche (Classless Inter-Domain Routing). Wird in Netzwerk-Checks verwendet um zu prüfen, ob eine IP-Adresse in einem bestimmten Netzwerkbereich liegt.",
    example: "192.168.1.0/24 umfasst alle IPs von 192.168.1.0 bis 192.168.1.255.",
  },
  {
    term: "MAD (Median Absolute Deviation)",
    category: "Datenqualität",
    definition:
      "Statistische Methode zur Erkennung von Ausreißern, die robust gegen einzelne Extremwerte ist. DQX nutzt MAD im has_no_outliers-Check. Im Gegensatz zur Standardabweichung wird MAD nicht durch einzelne Extremwerte verzerrt.",
    example: "Ein Bestellwert von 50.000€ bei einem Median von 200€ und MAD von 100€ wäre ein klarer Ausreißer.",
  },
  {
    term: "Quarantine-Tabelle",
    category: "DQX-Konzepte",
    definition:
      "Eine separate Tabelle, in die fehlerhafte Datensätze verschoben werden. DQX kann Zeilen mit Fehlern automatisch in eine Quarantine-Tabelle umleiten, damit die Haupttabelle nur valide Daten enthält.",
    example: "Kunden mit fehlender E-Mail landen in 'production.dq.kunden_quarantine'.",
  },
  {
    term: "Workspace",
    category: "Technisch",
    definition:
      "Eine Databricks-Arbeitsumgebung, in der Notebooks, Jobs und Tabellen verwaltet werden. DQX-Checks werden typischerweise als Job in einem Workspace ausgeführt.",
  },
];

const CATEGORIES = [...new Set(GLOSSARY_TERMS.map(t => t.category))];

interface HelpGlossaryProps {
  onClose: () => void;
  initialSearch?: string;
}

export function HelpGlossary({ onClose, initialSearch = "" }: HelpGlossaryProps) {
  const modalRef = useModalKeyboard(onClose);
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState<string>("Alle");

  const filtered = useMemo(() => {
    return GLOSSARY_TERMS.filter(term => {
      const matchCat = activeCategory === "Alle" || term.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || term.term.toLowerCase().includes(q) || term.definition.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end overflow-hidden" role="dialog" aria-modal="true" aria-label="Glossar – Begriffe erklärt">
      <div className="bg-bg-surface border-l border-border h-full w-full max-w-lg flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen size={16} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Glossar</h2>
            <p className="text-xs text-text-muted">Erklärungen zu Datenqualitäts- und DQX-Begriffen</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 ml-auto" aria-label="Glossar schließen">
            <X size={18} />
          </button>
        </div>

        {/* Search + category filter */}
        <div className="p-4 space-y-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Begriff suchen…"
              className="input-field pl-9 text-sm w-full"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["Alle", ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-text-muted hover:text-text-secondary border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Terms list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Search size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Kein Begriff gefunden</p>
            </div>
          ) : (
            filtered.map(term => (
              <div key={term.term} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-primary leading-tight">{term.term}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-bg text-text-muted border border-border flex-shrink-0">
                    {term.category}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{term.definition}</p>
                {term.example && (
                  <div className="bg-bg rounded-lg p-2.5">
                    <span className="text-xs text-text-muted font-medium block mb-1">Beispiel:</span>
                    <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">{term.example}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <p className="text-xs text-text-muted text-center">
            {GLOSSARY_TERMS.length} Begriffe · {filtered.length} angezeigt
          </p>
        </div>
      </div>
    </div>
  );
}
