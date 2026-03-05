import { useCheckStore } from "../../hooks/useCheckStore";
import type { ColumnInfo } from "../../types/dqx";

export function Step3QuickChecks() {
  const { tableConfig, checks, addCheck, removeCheck } = useCheckStore();

  if (tableConfig.columns.length === 0) {
    return (
      <div className="max-w-2xl p-8 text-center text-text-muted text-sm border border-dashed border-border rounded-xl">
        Keine Attribute definiert. Gehen Sie zurück zu Schritt {tableConfig.table ? "2" : "1"} und legen Sie Attribute an.
      </div>
    );
  }

  function getCheckForColumn(fn: "is_not_null" | "is_not_empty", colName: string) {
    return checks.find(
      (c) =>
        c.dqxCheck.check.function === fn &&
        c.dqxCheck.check.arguments?.["column"] === colName
    );
  }

  function toggleCheck(fn: "is_not_null" | "is_not_empty", col: ColumnInfo) {
    const existing = getCheckForColumn(fn, col.name);
    if (existing) {
      removeCheck(existing.id);
    } else {
      addCheck({
        category: "completeness",
        dqxCheck: {
          criticality: "error",
          check: {
            function: fn,
            arguments: { column: col.name },
          },
        },
      });
    }
  }

  const notNullCount = tableConfig.columns.filter((c) => getCheckForColumn("is_not_null", c.name)).length;
  const notEmptyCount = tableConfig.columns.filter((c) => getCheckForColumn("is_not_empty", c.name)).length;

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-text-secondary">
        Legen Sie schnell Basis-Checks per Klick fest. Jeder aktivierte Check wird mit Kritikalität <strong>Error</strong> angelegt.
      </p>

      <div className="flex gap-6 text-xs text-text-muted">
        <span>{notNullCount} Not-Null-Checks</span>
        <span>{notEmptyCount} Not-Empty-Checks</span>
      </div>

      {/* Quick-select header buttons */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">Alle auswählen:</span>
        <button
          onClick={() => tableConfig.columns.forEach((c) => {
            if (!getCheckForColumn("is_not_null", c.name)) toggleCheck("is_not_null", c);
          })}
          className="px-3 py-1 text-xs rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-colors"
        >
          Alle Not Null
        </button>
        <button
          onClick={() => tableConfig.columns.forEach((c) => {
            if (!getCheckForColumn("is_not_empty", c.name)) toggleCheck("is_not_empty", c);
          })}
          className="px-3 py-1 text-xs rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-colors"
        >
          Alle Not Empty
        </button>
        <button
          onClick={() => {
            const allNotNull = tableConfig.columns.map((c) => getCheckForColumn("is_not_null", c.name)).filter(Boolean);
            const allNotEmpty = tableConfig.columns.map((c) => getCheckForColumn("is_not_empty", c.name)).filter(Boolean);
            [...allNotNull, ...allNotEmpty].forEach((c) => c && removeCheck(c.id));
          }}
          className="px-3 py-1 text-xs rounded bg-bg-elevated border border-border text-red-400/70 hover:text-red-400 transition-colors"
        >
          Alle entfernen
        </button>
      </div>

      {/* Attribute table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-elevated border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary uppercase tracking-wide">
                Attribut
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary uppercase tracking-wide">
                Typ
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-text-secondary uppercase tracking-wide">
                Not Null
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-text-secondary uppercase tracking-wide">
                Not Empty
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tableConfig.columns.map((col) => {
              const hasNotNull = !!getCheckForColumn("is_not_null", col.name);
              const hasNotEmpty = !!getCheckForColumn("is_not_empty", col.name);

              return (
                <tr key={col.name} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-text-primary text-xs">{col.name}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{col.dataType}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleCheck("is_not_null", col)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        hasNotNull
                          ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                          : "bg-bg-elevated border border-border text-text-muted hover:border-green-500/40 hover:text-green-400"
                      }`}
                    >
                      {hasNotNull ? "✓ Aktiv" : "Aktivieren"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleCheck("is_not_empty", col)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        hasNotEmpty
                          ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                          : "bg-bg-elevated border border-border text-text-muted hover:border-green-500/40 hover:text-green-400"
                      }`}
                    >
                      {hasNotEmpty ? "✓ Aktiv" : "Aktivieren"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
