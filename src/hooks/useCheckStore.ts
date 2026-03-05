import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { CheckConfig, TableConfig, ColumnInfo, View, CheckSet } from "../types/dqx";
import { validateCheck } from "../lib/checkValidator";
import { generateDescription } from "../lib/yamlGenerator";

// ─── Persisted slice shape ────────────────────────────────────────
interface PersistedState {
  tableConfig: TableConfig;
  checks: CheckConfig[];
  checkSets: CheckSet[];
  activeCheckSetId: string;
}

const EMPTY_TABLE_CONFIG: TableConfig = { catalog: "", schema: "", table: "", columns: [] };

function makeDefaultCheckSet(tableConfig: TableConfig, checks: CheckConfig[]): CheckSet {
  return {
    id: uuidv4(),
    name: tableConfig.table || "Standard",
    tableConfig,
    checks,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Store interface ──────────────────────────────────────────────
interface CheckStore {
  // Table config (active check set's working state)
  tableConfig: TableConfig;
  setTableMeta: (catalog: string, schema: string, table: string) => void;
  setColumns: (columns: ColumnInfo[]) => void;
  addColumn: (column: ColumnInfo) => void;
  updateColumn: (index: number, column: ColumnInfo) => void;
  removeColumn: (index: number) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;

  // Checks (active check set's working state)
  checks: CheckConfig[];
  addCheck: (check: Omit<CheckConfig, "id" | "isValid" | "description">) => void;
  addChecks: (checks: Omit<CheckConfig, "id" | "isValid" | "description">[]) => void;
  updateCheck: (id: string, check: Partial<CheckConfig>) => void;
  bulkUpdateChecks: (ids: string[], update: Partial<Pick<CheckConfig, "category"> & { criticality?: "error" | "warn"; filter?: string }>) => void;
  removeCheck: (id: string) => void;
  bulkRemoveChecks: (ids: string[]) => void;
  insertCheckAt: (check: CheckConfig, index: number) => void;
  insertChecksAt: (items: { check: CheckConfig; index: number }[]) => void;
  duplicateCheck: (id: string) => void;
  reorderChecks: (fromIndex: number, toIndex: number) => void;
  clearChecks: () => void;

  // Multi-table / check-set management
  checkSets: CheckSet[];
  activeCheckSetId: string;
  syncActiveCheckSet: () => void;
  createCheckSet: (name?: string) => void;
  switchCheckSet: (id: string) => void;
  deleteCheckSet: (id: string) => void;
  renameCheckSet: (id: string, name: string) => void;

  // UI state
  currentView: View;
  setCurrentView: (view: View) => void;
  yamlPanelOpen: boolean;
  toggleYamlPanel: () => void;
  editingCheckId: string | null;
  setEditingCheckId: (id: string | null) => void;
  wizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;
  glossaryTerm: string | null;
  openGlossary: (term?: string) => void;
  closeGlossary: () => void;
}

// ─── Store ───────────────────────────────────────────────────────
export const useCheckStore = create<CheckStore>()(
  persist(
    (set, get) => ({
      tableConfig: EMPTY_TABLE_CONFIG,

      setTableMeta: (catalog, schema, table) =>
        set((state) => ({ tableConfig: { ...state.tableConfig, catalog, schema, table } })),

      setColumns: (columns) =>
        set((state) => ({ tableConfig: { ...state.tableConfig, columns } })),

      addColumn: (column) =>
        set((state) => ({
          tableConfig: { ...state.tableConfig, columns: [...state.tableConfig.columns, column] },
        })),

      updateColumn: (index, column) =>
        set((state) => {
          const cols = [...state.tableConfig.columns];
          cols[index] = column;
          return { tableConfig: { ...state.tableConfig, columns: cols } };
        }),

      removeColumn: (index) =>
        set((state) => ({
          tableConfig: {
            ...state.tableConfig,
            columns: state.tableConfig.columns.filter((_, i) => i !== index),
          },
        })),

      reorderColumns: (fromIndex, toIndex) =>
        set((state) => {
          const cols = [...state.tableConfig.columns];
          const [moved] = cols.splice(fromIndex, 1);
          cols.splice(toIndex, 0, moved);
          return { tableConfig: { ...state.tableConfig, columns: cols } };
        }),

      checks: [],

      addCheck: (checkData) => {
        const id = uuidv4();
        const fullCheck: CheckConfig = { ...checkData, id, isValid: false, description: "" };
        fullCheck.isValid = validateCheck(fullCheck).isValid;
        fullCheck.description = generateDescription(fullCheck);
        set((state) => ({ checks: [...state.checks, fullCheck] }));
      },

      addChecks: (checksData) => {
        const newChecks: CheckConfig[] = checksData.map((checkData) => {
          const id = uuidv4();
          const fullCheck: CheckConfig = { ...checkData, id, isValid: false, description: "" };
          fullCheck.isValid = validateCheck(fullCheck).isValid;
          fullCheck.description = generateDescription(fullCheck);
          return fullCheck;
        });
        set((state) => ({ checks: [...state.checks, ...newChecks] }));
      },

      updateCheck: (id, update) =>
        set((state) => {
          const checks = state.checks.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...update };
            if (update.dqxCheck) updated.dqxCheck = { ...c.dqxCheck, ...update.dqxCheck };
            updated.isValid = validateCheck(updated).isValid;
            updated.description = generateDescription(updated);
            return updated;
          });
          return { checks };
        }),

      bulkUpdateChecks: (ids, update) =>
        set((state) => ({
          checks: state.checks.map((c) => {
            if (!ids.includes(c.id)) return c;
            const updatedDqx = { ...c.dqxCheck };
            if (update.criticality !== undefined) updatedDqx.criticality = update.criticality;
            if (update.filter !== undefined) updatedDqx.filter = update.filter;
            const updated = { ...c, dqxCheck: updatedDqx };
            updated.description = generateDescription(updated);
            return updated;
          }),
        })),

      removeCheck: (id) =>
        set((state) => ({ checks: state.checks.filter((c) => c.id !== id) })),

      bulkRemoveChecks: (ids) =>
        set((state) => ({ checks: state.checks.filter((c) => !ids.includes(c.id)) })),

      insertCheckAt: (check, index) =>
        set((state) => {
          const checks = [...state.checks];
          checks.splice(Math.min(index, checks.length), 0, check);
          return { checks };
        }),

      insertChecksAt: (items) =>
        set((state) => {
          const checks = [...state.checks];
          // Insert in reverse index order to preserve positions
          const sorted = [...items].sort((a, b) => a.index - b.index);
          for (const { check, index } of sorted) {
            checks.splice(Math.min(index, checks.length), 0, check);
          }
          return { checks };
        }),

      duplicateCheck: (id) =>
        set((state) => {
          const original = state.checks.find((c) => c.id === id);
          if (!original) return state;
          const copy: CheckConfig = {
            ...original,
            id: uuidv4(),
            dqxCheck: {
              ...original.dqxCheck,
              name: original.dqxCheck.name ? `${original.dqxCheck.name} (Kopie)` : undefined,
            },
          };
          const idx = state.checks.findIndex((c) => c.id === id);
          const checks = [...state.checks];
          checks.splice(idx + 1, 0, copy);
          return { checks };
        }),

      reorderChecks: (fromIndex, toIndex) =>
        set((state) => {
          const checks = [...state.checks];
          const [moved] = checks.splice(fromIndex, 1);
          checks.splice(toIndex, 0, moved);
          return { checks };
        }),

      clearChecks: () => set({ checks: [] }),

      // ── Multi-table / Check-Set management ──────────────────────
      checkSets: [],
      activeCheckSetId: "",

      /** Persists the current working state back into the active CheckSet */
      syncActiveCheckSet: () => {
        const { activeCheckSetId, checkSets, tableConfig, checks } = get();
        if (!activeCheckSetId) return;
        set({
          checkSets: checkSets.map((cs) =>
            cs.id === activeCheckSetId
              ? { ...cs, tableConfig, checks, updatedAt: Date.now() }
              : cs
          ),
        });
      },

      createCheckSet: (name?: string) => {
        get().syncActiveCheckSet();
        const newId = uuidv4();
        const newSet: CheckSet = {
          id: newId,
          name: name || "Neue Tabelle",
          tableConfig: EMPTY_TABLE_CONFIG,
          checks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          checkSets: [...state.checkSets, newSet],
          activeCheckSetId: newId,
          tableConfig: EMPTY_TABLE_CONFIG,
          checks: [],
          currentView: "table",
        }));
      },

      switchCheckSet: (id) => {
        const { activeCheckSetId, syncActiveCheckSet, checkSets } = get();
        if (id === activeCheckSetId) return;
        syncActiveCheckSet();
        const target = checkSets.find((cs) => cs.id === id);
        if (!target) return;
        set({
          activeCheckSetId: id,
          tableConfig: target.tableConfig,
          checks: target.checks,
          currentView: "table",
        });
      },

      deleteCheckSet: (id) => {
        const { activeCheckSetId, checkSets } = get();
        if (checkSets.length <= 1) return; // Keep at least one
        const remaining = checkSets.filter((cs) => cs.id !== id);
        if (id === activeCheckSetId) {
          const next = remaining[0];
          set({ checkSets: remaining, activeCheckSetId: next.id, tableConfig: next.tableConfig, checks: next.checks, currentView: "table" });
        } else {
          set({ checkSets: remaining });
        }
      },

      renameCheckSet: (id, name) =>
        set((state) => ({
          checkSets: state.checkSets.map((cs) =>
            cs.id === id ? { ...cs, name, updatedAt: Date.now() } : cs
          ),
        })),

      // ── UI state ─────────────────────────────────────────────────
      currentView: "table",
      setCurrentView: (view) => set({ currentView: view }),
      yamlPanelOpen: true,
      toggleYamlPanel: () => set((state) => ({ yamlPanelOpen: !state.yamlPanelOpen })),
      editingCheckId: null,
      setEditingCheckId: (id) => set({ editingCheckId: id }),
      wizardOpen: false,
      setWizardOpen: (open) => set({ wizardOpen: open }),
      glossaryTerm: null,
      openGlossary: (term) => set({ glossaryTerm: term ?? "" }),
      closeGlossary: () => set({ glossaryTerm: null }),
    }),
    {
      name: "dqx-check-designer-state",
      version: 2,
      migrate: (persistedState: unknown, version: number): PersistedState => {
        const old = persistedState as Partial<PersistedState>;
        if (version < 2) {
          const tc = old.tableConfig ?? EMPTY_TABLE_CONFIG;
          const ch = old.checks ?? [];
          const defaultSet = makeDefaultCheckSet(tc, ch);
          return { tableConfig: tc, checks: ch, checkSets: [defaultSet], activeCheckSetId: defaultSet.id };
        }
        return {
          tableConfig: old.tableConfig ?? EMPTY_TABLE_CONFIG,
          checks: old.checks ?? [],
          checkSets: old.checkSets ?? [],
          activeCheckSetId: old.activeCheckSetId ?? "",
        };
      },
      partialize: (state): PersistedState => ({
        tableConfig: state.tableConfig,
        checks: state.checks,
        checkSets: state.checkSets,
        activeCheckSetId: state.activeCheckSetId,
      }),
      onRehydrateStorage: () => (state) => {
        // Bootstrap: if no checkSets exist after rehydration, create one from current data
        if (state && state.checkSets.length === 0) {
          const defaultSet = makeDefaultCheckSet(state.tableConfig, state.checks);
          state.checkSets = [defaultSet];
          state.activeCheckSetId = defaultSet.id;
        }
      },
    }
  )
);
