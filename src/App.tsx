import { useState, useEffect } from "react";
import { useCheckStore } from "./hooks/useCheckStore";
import { AppShell } from "./components/layout/AppShell";
import { TableConfigView } from "./components/table/TableConfig";
import { CheckList } from "./components/checks/CheckList";
import { ExportPanel } from "./components/export/ExportPanel";
import { YamlPreview } from "./components/preview/YamlPreview";
import { OnboardingTour } from "./components/onboarding/OnboardingTour";
import { ToastContainer } from "./components/ui/Toast";

const TOUR_STORAGE_KEY = "dqx-tour-completed";

export default function App() {
  const { currentView } = useCheckStore();

  // Show tour on first visit; allow restart via custom event from Header
  const [tourActive, setTourActive] = useState(
    () => !localStorage.getItem(TOUR_STORAGE_KEY)
  );

  useEffect(() => {
    function handleRestart() {
      setTourActive(true);
    }
    window.addEventListener("dqx-restart-tour", handleRestart);
    return () => window.removeEventListener("dqx-restart-tour", handleRestart);
  }, []);

  function handleTourComplete() {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setTourActive(false);
  }

  function renderContent() {
    switch (currentView) {
      case "table":
        return <TableConfigView />;
      case "checks":
        return <CheckList />;
      case "export":
        return <ExportPanel />;
      default:
        return <TableConfigView />;
    }
  }

  return (
    <AppShell yamlPanel={<YamlPreview />}>
      {renderContent()}
      {tourActive && <OnboardingTour onComplete={handleTourComplete} />}
      <ToastContainer />
    </AppShell>
  );
}
