# DQX Check Designer

Ein visueller Editor zum Erstellen von [Databricks DQX](https://databrickslabs.github.io/dqx/) Data-Quality-Checks — ohne Code schreiben zu müssen.

## Wozu dient dieses Tool?

Databricks DQX prüft Datensätze anhand von YAML/JSON-Konfigurationsdateien. Diese Konfigurationen von Hand zu schreiben ist fehleranfällig und setzt technisches Wissen voraus. Der DQX Check Designer bietet eine grafische Oberfläche, die sowohl für Data Engineers als auch für nicht-technische Stakeholder (Data Stewards, Fachbereich) geeignet ist.

**Kernfunktionen:**

- **Tabellen- & Schemakonfiguration** — Catalog, Schema, Tabelle definieren; Spalten manuell anlegen, per CSV importieren oder aus einem bestehenden YAML laden
- **Check-Wizard** — geführter 3-Schritte-Assistent (Kategorie → Check-Typ → Parameter) mit 40+ vordefinierten Check-Typen
- **Mehrere Check-Sets** — gleichzeitig mehrere Tabellen verwalten, zwischen Sets wechseln
- **Vorlagen-Galerie** — vorgefertigte Prüfpakete für häufige Szenarien (PII, Finanzdaten, Referentielle Integrität …)
- **Echtzeit-YAML-Vorschau** — ausgeklapptes Panel zeigt den generierten DQX-Output live
- **Export** — Download als YAML oder ZIP, Copy-to-Clipboard
- **Undo-fähiges Löschen** — Checks können per Toast-Benachrichtigung sofort rückgängig gemacht werden

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 (Dark Theme) |
| State | Zustand 5 (mit `persist`) |
| Drag & Drop | dnd-kit |
| Icons | Lucide React |
| YAML | js-yaml |
| CSV-Import | PapaParse |
| Container | Docker (nginx:stable-alpine) |

## Lokale Entwicklung

**Voraussetzungen:** Node.js 22+

```bash
npm install
npm run dev
```

Die App läuft unter `http://localhost:5173`.

## Build & Deployment

**Produktions-Build:**
```bash
npm run build       # TypeScript-Kompilierung + Vite-Build → dist/
npm run preview     # Lokale Vorschau des dist/-Ordners
```

**Docker (empfohlen für Deployment):**
```bash
docker compose up --build   # Build + Start auf Port 8080
```

Die App ist dann unter `http://localhost:8080` erreichbar. Das Docker-Image nutzt ein Multi-Stage-Build (Node 22 Builder → nginx Server) und ist damit minimal in der Größe.

## Projektstruktur

```
src/
├── components/
│   ├── checks/       # Check-Wizard, CheckList, CheckCard, QuickAdd
│   ├── export/       # Export-Panel, Run-Config
│   ├── fields/       # Formular-Felder (Filter, Regex, Schema-Editor …)
│   ├── help/         # Glossar
│   ├── layout/       # AppShell, Header
│   ├── onboarding/   # Interaktive Tour
│   ├── preview/      # YAML-Vorschau (Raw / Erklärt)
│   ├── project/      # Check-Set-Sidebar
│   ├── table/        # Tabellen- & Spaltenkonfiguration
│   ├── templates/    # Vorlagen-Galerie
│   └── ui/           # Toast, InfoTooltip, GlossaryTerm …
├── data/
│   ├── checkRegistry.ts    # Alle Check-Definitionen + Formular-Schema
│   └── checkTemplates.ts   # Vorlagen-Pakete
├── hooks/
│   ├── useCheckStore.ts    # Globaler Zustand (Zustand + persist)
│   ├── useToastStore.ts    # Toast-Benachrichtigungen
│   ├── useGlobalShortcuts.ts
│   └── useModalKeyboard.ts
├── lib/
│   ├── yamlGenerator.ts    # CheckConfig → DQX YAML/JSON
│   ├── yamlParser.ts       # DQX YAML → CheckConfig
│   ├── checkValidator.ts   # Validierungslogik
│   └── filterValidator.ts  # SQL-Filter-Validierung
└── types/
    └── dqx.ts              # Zentrale TypeScript-Typen
```

## Keyboard-Shortcuts

| Taste | Aktion |
|-------|--------|
| `N` | Neuer Check (Wizard öffnen) |
| `?` | Glossar öffnen |
| `Ctrl`+`Enter` | Check speichern (im Wizard) |
| `Escape` | Dialog schließen |

Shortcuts sind in Eingabefeldern und offenen Dialogen deaktiviert.

## Neuen Check-Typ hinzufügen

Alle Check-Definitionen leben in `src/data/checkRegistry.ts`. Ein neuer Eintrag braucht:

```typescript
{
  function: "is_not_null",          // DQX-Funktionsname
  category: "completeness",         // Kategorie-Gruppe
  level: "row",                     // "row" | "dataset"
  displayName: "Darf nicht leer sein",
  description: "...",
  icon: "✓",
  fields: [                         // Formularfelder (werden automatisch gerendert)
    { key: "col_name", label: "Spalte", type: "column_select", required: true }
  ]
}
```

Der Rest (Formular-Rendering, YAML-Generierung, Validierung) passiert automatisch.

## Lizenz

Forschungsprototyp — kein Produktiveinsatz ohne Rücksprache.
