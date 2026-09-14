import React from "react";
import { useAppStore, AppPage } from "../state/appStore";
import { Badge } from "../design-system/Badge";
import { Activity, Play, Code2, Sparkles, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";

export const Navigation: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    technicalMode,
    toggleTechnicalMode,
    globalSeed,
    setGlobalSeed,
    demoMode,
    toggleDemoMode,
  } = useAppStore();

  const navItems: { id: AppPage; label: string }[] = [
    { id: "landing", label: "Overview" },
    { id: "fish", label: "Fish World (2D)" },
    { id: "car", label: "Car World (3D)" },
    { id: "ailab", label: "AI Lab" },
    { id: "comparison", label: "Comparison" },
    { id: "analytics", label: "Analytics" },
  ];

  const randomizeSeed = () => {
    const nextSeed = Math.floor(Math.random() * 9000 + 1000);
    setGlobalSeed(nextSeed);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-subtle bg-panel/90 backdrop-blur-md px-6 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        {/* Logo and title */}
        <div
          onClick={() => setCurrentPage("landing")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/30 transition-colors">
            <Activity size={18} />
          </div>
          <div>
            <div className="font-heading font-bold text-base tracking-wide text-textPrimary flex items-center gap-2">
              EVOLUTION OF INTELLIGENCE
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-textSecondary">
                v2.0 LAB
              </span>
            </div>
            <div className="text-[11px] font-mono text-textSecondary">
              B.Tech Science Day Exhibition
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-canvas p-1 rounded-card border border-subtle">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={clsx(
                  "px-3.5 py-1.5 rounded-btn text-xs font-mono font-medium transition-all",
                  isActive
                    ? "bg-panel-raised text-textPrimary border border-subtle shadow-sm font-semibold"
                    : "text-textSecondary hover:text-textPrimary hover:bg-panel/50"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Tools: Seed + Demo Mode + Technical Mode */}
        <div className="flex items-center gap-3">
          {/* Seed indicator button */}
          <button
            onClick={randomizeSeed}
            title="Click to randomize global seed"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-subtle bg-canvas hover:border-accent-warning/50 text-xs font-mono text-textSecondary transition-colors"
          >
            <span className="text-accent-warning font-semibold">SEED</span>
            <span className="text-textPrimary font-bold">#{globalSeed}</span>
          </button>

          {/* Attract / Demo Mode button per §15 */}
          <button
            onClick={toggleDemoMode}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-btn border text-xs font-mono transition-all",
              demoMode
                ? "bg-accent-warning/20 border-accent-warning text-accent-warning animate-pulse"
                : "bg-canvas border-subtle text-textSecondary hover:border-textDisabled hover:text-textPrimary"
            )}
          >
            <Play size={13} fill={demoMode ? "currentColor" : "none"} />
            <span>{demoMode ? "DEMO ACTIVE" : "AUTO DEMO"}</span>
          </button>

          {/* Technical Mode toggle per §11.7 */}
          <button
            onClick={toggleTechnicalMode}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-btn border text-xs font-mono transition-all",
              technicalMode
                ? "bg-accent-primary/20 border-accent-primary text-accent-primary font-semibold shadow-[0_0_12px_rgba(62,142,237,0.25)]"
                : "bg-canvas border-subtle text-textSecondary hover:border-textDisabled hover:text-textPrimary"
            )}
          >
            <Code2 size={14} />
            <span>TECHNICAL MODE</span>
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                technicalMode ? "bg-accent-primary" : "bg-textDisabled"
              )}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
