import { useState, useRef, useEffect } from "react";

interface GlossaryTermProps {
  /** The visible text */
  children: React.ReactNode;
  /** Short definition shown on hover */
  definition: string;
  /** Term to search in glossary on click */
  glossaryTerm: string;
}

export function GlossaryTerm({ children, definition, glossaryTerm }: GlossaryTermProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleMouseEnter() {
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 300);
  }

  function handleMouseLeave() {
    clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  }

  function handleClick() {
    window.dispatchEvent(new CustomEvent("dqx-open-glossary", { detail: glossaryTerm }));
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <span
      ref={ref}
      className="relative inline border-b border-dashed border-text-muted/40 cursor-help hover:border-accent hover:text-accent transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {showTooltip && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-bg-surface border border-border rounded-lg shadow-xl p-2.5 pointer-events-none">
          <span className="text-xs text-text-secondary leading-relaxed block">{definition}</span>
          <span className="text-[10px] text-accent mt-1 block">Klick für Details im Glossar</span>
        </span>
      )}
    </span>
  );
}
