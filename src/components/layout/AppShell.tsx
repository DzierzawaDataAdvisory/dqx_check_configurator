import { Database, ListChecks, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useCheckStore } from "../../hooks/useCheckStore";
import { useGlobalShortcuts } from "../../hooks/useGlobalShortcuts";
import type { View } from "../../types/dqx";
import { Header } from "./Header";
import { ProjectSidebar } from "../project/ProjectSidebar";

interface NavItem {
  view: View;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppShellProps {
  children: React.ReactNode;
  yamlPanel?: React.ReactNode;
}

export function AppShell({ children, yamlPanel }: AppShellProps) {
  useGlobalShortcuts();
  const { currentView, setCurrentView, checks, tableConfig, yamlPanelOpen, toggleYamlPanel } = useCheckStore();

  const navItems: NavItem[] = [
    {
      view: "table",
      label: "Tabelle & Schema",
      icon: <Database size={18} />,
      badge: tableConfig.columns.length || undefined,
    },
    {
      view: "checks",
      label: "Checks",
      icon: <ListChecks size={18} />,
      badge: checks.length || undefined,
    },
    {
      view: "export",
      label: "Export",
      icon: <Download size={18} />,
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-bg-surface border-r border-border flex flex-col flex-shrink-0">
          {/* Navigation */}
          <nav className="p-3 space-y-1 border-b border-border flex-shrink-0">
            <div className="section-title px-2 py-1.5 mb-1">Navigation</div>
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === item.view
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                }`}
              >
                <span className={currentView === item.view ? "text-accent" : "text-text-muted"}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                    currentView === item.view
                      ? "bg-accent/20 text-accent"
                      : "bg-bg-elevated text-text-muted"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Check-Set list (Project Sidebar) */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <ProjectSidebar />
          </div>

          {/* Footer with keyboard shortcuts */}
          <div className="p-3 border-t border-border flex-shrink-0 space-y-1.5">
            <div className="text-[10px] text-text-muted space-y-0.5">
              <div className="flex items-center justify-between">
                <span><kbd className="kbd">N</kbd> Neuer Check</span>
                <span><kbd className="kbd">?</kbd> Glossar</span>
              </div>
              <div className="text-center">
                <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Enter</kbd> Speichern
              </div>
            </div>
            <div className="text-xs text-text-muted text-center opacity-60">
              DQX Check Designer v1.0
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-bg">
          <div className="h-full">
            {children}
          </div>
        </main>

        {/* YAML Panel */}
        {yamlPanel && (
          <div className={`flex flex-col bg-bg-surface border-l border-border transition-all duration-200 ${
            yamlPanelOpen ? "w-96" : "w-8"
          } flex-shrink-0`}>
            <button
              onClick={toggleYamlPanel}
              className="flex items-center justify-center h-8 w-8 border-b border-border text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              title={yamlPanelOpen ? "YAML-Vorschau einklappen" : "YAML-Vorschau ausklappen"}
            >
              {yamlPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            {yamlPanelOpen && (
              <div className="flex-1 overflow-hidden">
                {yamlPanel}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
