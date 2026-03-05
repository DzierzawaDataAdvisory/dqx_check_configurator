import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { YamlPreview } from "./YamlPreview";

interface PreviewModalProps {
  onClose: () => void;
}

export function PreviewModal({ onClose }: PreviewModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative flex flex-col bg-bg-surface border border-border rounded-xl shadow-2xl"
        style={{ width: "80vw", height: "80vh" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary">YAML-Vorschau</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <YamlPreview />
        </div>
      </div>
    </div>
  );
}
