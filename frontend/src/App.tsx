import React from "react";
import { useAppStore } from "./state/appStore";
import { Navigation } from "./components/Navigation";
import { DemoModeManager } from "./components/DemoModeManager";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { FishWorldPage } from "./pages/FishWorldPage";
import { CarWorldPage } from "./pages/CarWorldPage";
import { AILabPage } from "./pages/AILabPage";
import { ComparisonPage } from "./pages/ComparisonPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

export const App: React.FC = () => {
  const { currentPage } = useAppStore();

  const renderActivePage = () => {
    switch (currentPage) {
      case "landing":
        return <LandingPage />;
      case "fish":
        return <FishWorldPage />;
      case "car":
        return <CarWorldPage />;
      case "ailab":
        return <AILabPage />;
      case "comparison":
        return <ComparisonPage />;
      case "analytics":
        return <AnalyticsPage />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-textPrimary selection:bg-accent-primary/30">
      <Navigation />
      <DemoModeManager />

      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Application View Recovery">
          {renderActivePage()}
        </ErrorBoundary>
      </main>

      {/* Lab Blueprint Footer */}
      <footer className="border-t border-subtle bg-panel py-4 px-6 text-center text-xs font-mono text-textSecondary flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1440px] mx-auto w-full">
        <div>
          <span className="text-textPrimary font-semibold">Evolution of Intelligence</span> · B.Tech Science Day Exhibition
        </div>
        <div className="text-[11px] text-textDisabled">
          Self-contained · 100% Offline Resilience (§17) · Non-hallucinatory Metrics
        </div>
      </footer>
    </div>
  );
};

export default App;
