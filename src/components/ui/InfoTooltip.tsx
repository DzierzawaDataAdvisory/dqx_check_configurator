import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, BookOpen } from "lucide-react";

interface InfoTooltipProps {
  content: string;
  glossaryTerm?: string;
}

export function InfoTooltip({ content, glossaryTerm }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.right + 8 });
  }

  function handleClick() {
    if (pinned) {
      setPinned(false);
      setVisible(false);
    } else {
      updatePosition();
      setPinned(true);
      setVisible(true);
    }
  }

  function handleMouseEnter() {
    if (!pinned) {
      updatePosition();
      setVisible(true);
    }
  }

  function handleMouseLeave() {
    if (!pinned) {
      setVisible(false);
    }
  }

  // Close pinned tooltip on outside click
  useEffect(() => {
    if (!pinned) return;
    function handleOutside(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      ) return;
      setPinned(false);
      setVisible(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [pinned]);

  function openGlossary() {
    if (glossaryTerm) {
      window.dispatchEvent(new CustomEvent("dqx-open-glossary", { detail: glossaryTerm }));
      setPinned(false);
      setVisible(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`transition-colors ${
          pinned ? "text-accent" : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <HelpCircle size={14} />
      </button>
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[100] w-64 bg-bg-elevated border border-border rounded-lg p-3 text-xs text-text-secondary shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
            {glossaryTerm && (
              <button
                onClick={openGlossary}
                className="flex items-center gap-1 mt-2 text-accent hover:text-accent/80 transition-colors text-xs"
              >
                <BookOpen size={11} />
                Im Glossar nachschlagen
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
