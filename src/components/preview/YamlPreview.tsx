import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { generateDqxYaml, generateDqxJson } from "../../lib/yamlGenerator";
import { YamlAnnotated } from "./YamlAnnotated";

const DEBOUNCE_MS = 300;

type PreviewFormat = "yaml" | "json" | "explained";

export function YamlPreview() {
  const { checks } = useCheckStore();
  const [format, setFormat] = useState<PreviewFormat>("yaml");
  const [copied, setCopied] = useState(false);
  const [debouncedContent, setDebouncedContent] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced YAML/JSON generation
  useEffect(() => {
    if (format === "explained") return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (checks.length === 0) {
        setDebouncedContent(
          format === "yaml"
            ? "# Noch keine Checks konfiguriert.\n# Beispiel:\n#\n# checks:\n#   - criticality: error\n#     check:\n#       function: is_not_null\n#       arguments:\n#         column: customer_id"
            : "// Noch keine Checks konfiguriert.\n// Beispiel:\n//\n// { \"checks\": [{\n//     \"criticality\": \"error\",\n//     \"check\": {\n//       \"function\": \"is_not_null\",\n//       \"arguments\": {\n//         \"column\": \"customer_id\"\n//       }\n//     }\n//   }]\n// }"
        );
      } else {
        setDebouncedContent(
          format === "yaml" ? generateDqxYaml(checks) : generateDqxJson(checks)
        );
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [checks, format]);

  async function handleCopy() {
    const content = format === "yaml" ? generateDqxYaml(checks) : generateDqxJson(checks);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs: { id: PreviewFormat; label: string }[] = [
    { id: "yaml", label: "YAML" },
    { id: "json", label: "JSON" },
    { id: "explained", label: "Erklärt" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFormat(t.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                format === t.id
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {format !== "explained" && (
          <button
            onClick={handleCopy}
            disabled={checks.length === 0}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
            aria-label="YAML kopieren"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copied ? "Kopiert!" : "Kopieren"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {format === "explained" ? (
          <YamlAnnotated checks={checks} />
        ) : (
          <div className="p-3">
            <pre className="text-xs font-mono text-text-secondary whitespace-pre leading-relaxed">
              {debouncedContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
