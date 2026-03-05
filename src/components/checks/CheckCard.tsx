import {
  ShieldCheck, TextCursor, ShieldAlert, ArrowLeftRight, ArrowUpFromLine,
  ArrowDownFromLine, Equal, EqualNot, ListChecks, ListX, Regex, Calendar,
  Clock, CalendarOff, Timer, Braces, KeyRound, Fingerprint, Link, Table,
  TrendingDown, TrendingUp, Edit2, Copy, Trash2, AlertTriangle, XCircle, AlertCircle
} from "lucide-react";
import type { CheckConfig } from "../../types/dqx";
import { validateCheck } from "../../lib/checkValidator";

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck, TextCursor, ShieldAlert, ArrowLeftRight, ArrowUpFromLine,
  ArrowDownFromLine, Equal, EqualNot, ListChecks, ListX, Regex, Calendar,
  Clock, CalendarOff, Timer, Braces, KeyRound, Fingerprint, Link, Table,
  TrendingDown, TrendingUp,
};

export function getIconForCheck(iconName: string, size = 16): React.ReactNode {
  const Icon = ICON_MAP[iconName] || ShieldCheck;
  return <Icon size={size} />;
}

interface CheckCardProps {
  check: CheckConfig;
  onEdit: (check: CheckConfig) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export function CheckCard({ check, onEdit, onDuplicate, onRemove, dragHandleProps, isDragging }: CheckCardProps) {
  const { isValid, errors } = validateCheck(check);
  const isCritical = check.dqxCheck.criticality === "error";
  const forEachCols = check.dqxCheck.check.for_each_column;
  const hasForEach = forEachCols && forEachCols.length > 0;

  return (
    <div className={`card group transition-all ${
      isDragging ? "opacity-50 shadow-2xl" : ""
    } ${!isValid ? "border-error/30" : "hover:border-border-focus/30"}`}>
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary mt-0.5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            ⣿
          </button>
        )}

        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isCritical ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
        }`}>
          {/* icon from registry */}
          <span className="text-xs">{isCritical ? "E" : "W"}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-text-primary text-sm truncate">
                  {check.description || check.dqxCheck.name || check.dqxCheck.check.function}
                </span>
                <span className={`badge-neutral text-xs flex-shrink-0`}>
                  {check.dqxCheck.check.function}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Criticality */}
                <span className={isCritical ? "badge-error" : "badge-warning"}>
                  {isCritical ? (
                    <span className="flex items-center gap-1"><XCircle size={10} /> Fehler</span>
                  ) : (
                    <span className="flex items-center gap-1"><AlertTriangle size={10} /> Warnung</span>
                  )}
                </span>

                {/* Level */}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  "bg-blue-500/10 text-blue-400"
                }`}>
                  {/* Row vs dataset from registry - simplified */}
                  Zeilen
                </span>

                {/* for_each_column */}
                {hasForEach && (
                  <span className="badge-info">
                    {forEachCols!.length} Spalten
                  </span>
                )}

                {/* Filter */}
                {check.dqxCheck.filter && (
                  <span className="badge-neutral" title={`Filter: ${check.dqxCheck.filter}`}>
                    Filter
                  </span>
                )}
              </div>

              {/* Validation errors */}
              {!isValid && errors.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <AlertCircle size={12} className="text-error flex-shrink-0" />
                  <span className="text-xs text-error">{errors[0]}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEdit(check)}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                title="Bearbeiten"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDuplicate(check.id)}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                title="Duplizieren"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => onRemove(check.id)}
                className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                title="Löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
