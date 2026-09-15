import React, { useEffect, useRef } from "react";
import { useAppStore } from "../state/appStore";
import { IntelligenceLevel } from "../design-system/tokens";

export const DemoModeManager: React.FC = () => {
  const { demoMode, currentPage, setCurrentPage, fishLevel, setFishLevel, carLevel, setCarLevel } =
    useAppStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut listener per §15: spacebar pauses/toggles, arrow keys skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        useAppStore.getState().toggleDemoMode();
      } else if (e.code === "ArrowRight") {
        // Skip to next level
        if (currentPage === "fish") {
          const nextLvl = ((fishLevel + 1) % 4) as IntelligenceLevel;
          setFishLevel(nextLvl);
        } else if (currentPage === "car") {
          const nextLvl = ((carLevel + 1) % 5) as IntelligenceLevel;
          setCarLevel(nextLvl);
        }
      } else if (e.code === "ArrowLeft") {
        // Previous level
        if (currentPage === "fish") {
          const prevLvl = ((fishLevel + 3) % 4) as IntelligenceLevel;
          setFishLevel(prevLvl);
        } else if (currentPage === "car") {
          const prevLvl = ((carLevel + 4) % 5) as IntelligenceLevel;
          setCarLevel(prevLvl);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, fishLevel, carLevel, setFishLevel, setCarLevel]);

  // Demo auto-advance loop per §15
  useEffect(() => {
    if (!demoMode) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Level durations from §15: L0=20s, L1=20s, L2=25s, L3=30s, L4=30s
    const getDuration = (lvl: IntelligenceLevel) => {
      switch (lvl) {
        case 0:
          return 20000;
        case 1:
          return 20000;
        case 2:
          return 25000;
        case 3:
          return 30000;
      }
    };

    const currentLvl = currentPage === "car" ? carLevel : fishLevel;
    const duration = getDuration(currentLvl);

    timerRef.current = setTimeout(() => {
      const nextLvl = ((currentLvl + 1) % 5) as IntelligenceLevel;
      if (currentPage === "car") {
        setCarLevel(nextLvl);
      } else {
        setFishLevel(nextLvl);
      }
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [demoMode, currentPage, fishLevel, carLevel, setFishLevel, setCarLevel]);

  return null;
};
