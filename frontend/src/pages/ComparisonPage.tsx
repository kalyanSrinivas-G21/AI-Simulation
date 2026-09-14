import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../state/appStore";
import { FishWorld, FishMetrics } from "../fish/simulation/world";
import { PixiFishCanvas } from "../fish/rendering/PixiFishCanvas";
import { CarSim, CarMetrics } from "../car/simulation/CarSim";
import { CarCanvas } from "../car/rendering/CarCanvas";
import { Card } from "../design-system/Card";
import { Badge } from "../design-system/Badge";
import { MetricCounter } from "../design-system/MetricCounter";
import { LEVEL_COLORS, LEVEL_LABELS, IntelligenceLevel } from "../design-system/tokens";
import { GitCompare, RotateCcw, Sparkles, Fish, Car } from "lucide-react";

export const ComparisonPage: React.FC = () => {
  const { globalSeed, setGlobalSeed } = useAppStore();

  const [comparisonDomain, setComparisonDomain] = useState<"fish" | "car">("fish");
  const [leftLevel, setLeftLevel] = useState<IntelligenceLevel>(1); // Rules default
  const [rightLevel, setRightLevel] = useState<IntelligenceLevel>(3); // Learning default

  // --- FISH SIMULATIONS ---
  const leftFishWorld = useMemo(() => {
    const w = new FishWorld(470, 380, globalSeed, 150);
    w.setLevel(leftLevel);
    return w;
  }, [globalSeed, leftLevel]);

  const rightFishWorld = useMemo(() => {
    const w = new FishWorld(470, 380, globalSeed, 150);
    w.setLevel(rightLevel);
    return w;
  }, [globalSeed, rightLevel]);

  const [leftFishMetrics, setLeftFishMetrics] = useState<FishMetrics>(() => leftFishWorld.getMetrics());
  const [rightFishMetrics, setRightFishMetrics] = useState<FishMetrics>(() => rightFishWorld.getMetrics());

  // --- CAR SIMULATIONS ---
  const leftCarSim = useMemo(() => {
    const s = new CarSim(globalSeed);
    s.setLevel(leftLevel);
    return s;
  }, [globalSeed, leftLevel]);

  const rightCarSim = useMemo(() => {
    const s = new CarSim(globalSeed);
    s.setLevel(rightLevel);
    return s;
  }, [globalSeed, rightLevel]);

  const [leftCarMetrics, setLeftCarMetrics] = useState<CarMetrics>(() => leftCarSim.getMetrics());
  const [rightCarMetrics, setRightCarMetrics] = useState<CarMetrics>(() => rightCarSim.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      if (comparisonDomain === "fish") {
        setLeftFishMetrics(leftFishWorld.getMetrics());
        setRightFishMetrics(rightFishWorld.getMetrics());
      } else {
        setLeftCarMetrics(leftCarSim.getMetrics());
        setRightCarMetrics(rightCarSim.getMetrics());
      }
    }, 100);
    return () => clearInterval(interval);
  }, [comparisonDomain, leftFishWorld, rightFishWorld, leftCarSim, rightCarSim]);

  const handleResetBoth = () => {
    if (comparisonDomain === "fish") {
      leftFishWorld.reset(globalSeed, 150);
      rightFishWorld.reset(globalSeed, 150);
      setLeftFishMetrics(leftFishWorld.getMetrics());
      setRightFishMetrics(rightFishWorld.getMetrics());
    } else {
      leftCarSim.reset(globalSeed);
      rightCarSim.reset(globalSeed);
      setLeftCarMetrics(leftCarSim.getMetrics());
      setRightCarMetrics(rightCarSim.getMetrics());
    }
  };

  const handleNewSeed = () => {
    const newSeed = Math.floor(Math.random() * 9000 + 1000);
    setGlobalSeed(newSeed);
  };

  const selectableLevels: IntelligenceLevel[] = [0, 1, 2, 3];

  return (
    <div className="min-h-screen bg-grid-lab py-8 px-6 flex flex-col items-center">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-card bg-panel border border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-warning/20 border border-accent-warning/40 flex items-center justify-center text-accent-warning">
              <GitCompare size={22} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-textPrimary tracking-wide flex items-center gap-3">
                SIDE-BY-SIDE FAIR COMPARISON MODE
                <Badge variant="seed" seedNumber={globalSeed} />
              </h2>
              <p className="text-xs font-mono text-textSecondary">
                Identical deterministic starting positions, obstacle patterns, and environment RNG (§14)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Domain Switcher: Fish vs Car */}
            <div className="flex items-center bg-canvas p-1 rounded-card border border-subtle">
              <button
                onClick={() => setComparisonDomain("fish")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-mono font-medium transition-all ${
                  comparisonDomain === "fish"
                    ? "bg-accent-primary text-white font-semibold shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                <Fish size={14} />
                <span>Fish World (2D)</span>
              </button>
              <button
                onClick={() => setComparisonDomain("car")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-mono font-medium transition-all ${
                  comparisonDomain === "car"
                    ? "bg-level-2 text-white font-semibold shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                <Car size={14} />
                <span>Car World (3D)</span>
              </button>
            </div>

            <button
              onClick={handleResetBoth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-canvas border border-subtle hover:border-accent-primary text-xs font-mono text-textSecondary hover:text-textPrimary transition-colors"
            >
              <RotateCcw size={14} />
              <span>Re-run Seed</span>
            </button>
            <button
              onClick={handleNewSeed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-mono font-semibold transition-colors"
            >
              <Sparkles size={14} />
              <span>New Seed</span>
            </button>
          </div>
        </div>

        {/* Scientific Fairness Callout */}
        <div className="p-3.5 rounded-card bg-panel/70 border border-accent-warning/30 flex items-center gap-3 text-xs font-mono text-textSecondary">
          <span className="p-1 rounded bg-accent-warning/10 text-accent-warning font-bold">
            NOTE ON SCIENTIFIC RIGOR (§14):
          </span>
          <span>
            Both simulations share the identical PRNG seed #{globalSeed}. Any difference in performance
            is 100% attributable to controller policy intelligence, not environmental randomness.
          </span>
        </div>

        {/* Split Screen Layout (Left vs Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Simulation Side */}
          <Card className="p-5 flex flex-col gap-4 border-t-4 border-t-accent-warning">
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: LEVEL_COLORS[leftLevel] }}
                />
                <span className="font-heading font-bold text-sm text-textPrimary uppercase">
                  CONTROLLER A: {LEVEL_LABELS[leftLevel]}
                </span>
              </div>
              <select
                value={leftLevel}
                onChange={(e) => setLeftLevel(Number(e.target.value) as IntelligenceLevel)}
                className="bg-canvas border border-subtle rounded px-2.5 py-1 text-xs font-mono text-textPrimary"
              >
                {selectableLevels.map((l) => (
                  <option key={l} value={l}>
                    Level {l}: {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>

            {/* Canvas View */}
            {comparisonDomain === "fish" ? (
              <PixiFishCanvas
                world={leftFishWorld}
                width={470}
                height={350}
                className="w-full aspect-[470/350]"
              />
            ) : (
              <div className="w-full aspect-[470/350] rounded-card overflow-hidden">
                <CarCanvas sim={leftCarSim} cameraMode="topDown" className="w-full h-full" />
              </div>
            )}

            {/* Live Metrics */}
            {comparisonDomain === "fish" ? (
              <div className="grid grid-cols-3 gap-2">
                <MetricCounter
                  label="Survival"
                  value={leftFishMetrics.survivalRate}
                  unit="%"
                  decimals={1}
                  color={leftFishMetrics.survivalRate > 60 ? "#22C55E" : "#EF4444"}
                />
                <MetricCounter
                  label="Casualties"
                  value={leftFishMetrics.fishCaptured}
                  color="#EF4444"
                />
                <MetricCounter
                  label="Escape Rate"
                  value={leftFishMetrics.escapeSuccessRate}
                  unit="%"
                  color="#3E8EED"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <MetricCounter
                  label="Distance"
                  value={leftCarMetrics.distanceTravelled}
                  unit="m"
                  color="#3E8EED"
                />
                <MetricCounter
                  label="Crashes"
                  value={leftCarMetrics.crashCount}
                  color={leftCarMetrics.crashCount === 0 ? "#22C55E" : "#EF4444"}
                />
                <MetricCounter
                  label="Avg Speed"
                  value={leftCarMetrics.averageSpeed * 30}
                  unit="km/h"
                  decimals={1}
                  color="#10B981"
                />
              </div>
            )}
          </Card>

          {/* Right Simulation Side */}
          <Card className="p-5 flex flex-col gap-4 border-t-4 border-t-accent-primary">
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: LEVEL_COLORS[rightLevel] }}
                />
                <span className="font-heading font-bold text-sm text-textPrimary uppercase">
                  CONTROLLER B: {LEVEL_LABELS[rightLevel]}
                </span>
              </div>
              <select
                value={rightLevel}
                onChange={(e) => setRightLevel(Number(e.target.value) as IntelligenceLevel)}
                className="bg-canvas border border-subtle rounded px-2.5 py-1 text-xs font-mono text-textPrimary"
              >
                {selectableLevels.map((l) => (
                  <option key={l} value={l}>
                    Level {l}: {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>

            {/* Canvas View */}
            {comparisonDomain === "fish" ? (
              <PixiFishCanvas
                world={rightFishWorld}
                width={470}
                height={350}
                className="w-full aspect-[470/350]"
              />
            ) : (
              <div className="w-full aspect-[470/350] rounded-card overflow-hidden">
                <CarCanvas sim={rightCarSim} cameraMode="topDown" className="w-full h-full" />
              </div>
            )}

            {/* Live Metrics */}
            {comparisonDomain === "fish" ? (
              <div className="grid grid-cols-3 gap-2">
                <MetricCounter
                  label="Survival"
                  value={rightFishMetrics.survivalRate}
                  unit="%"
                  decimals={1}
                  color={rightFishMetrics.survivalRate > 60 ? "#22C55E" : "#EF4444"}
                />
                <MetricCounter
                  label="Casualties"
                  value={rightFishMetrics.fishCaptured}
                  color="#EF4444"
                />
                <MetricCounter
                  label="Escape Rate"
                  value={rightFishMetrics.escapeSuccessRate}
                  unit="%"
                  color="#3E8EED"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <MetricCounter
                  label="Distance"
                  value={rightCarMetrics.distanceTravelled}
                  unit="m"
                  color="#3E8EED"
                />
                <MetricCounter
                  label="Crashes"
                  value={rightCarMetrics.crashCount}
                  color={rightCarMetrics.crashCount === 0 ? "#22C55E" : "#EF4444"}
                />
                <MetricCounter
                  label="Avg Speed"
                  value={rightCarMetrics.averageSpeed * 30}
                  unit="km/h"
                  decimals={1}
                  color="#10B981"
                />
              </div>
            )}
          </Card>
        </div>

        {/* Live Delta Summary Card */}
        <Card className="p-5 bg-panel-raised flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-textSecondary uppercase font-bold">
              EMPIRICAL PERFORMANCE DELTA
            </div>
            {comparisonDomain === "fish" ? (
              <div className="text-sm font-mono text-textPrimary mt-1">
                Survival Advantage:{" "}
                <span
                  className={`font-bold tabular-nums ${
                    rightFishMetrics.survivalRate >= leftFishMetrics.survivalRate
                      ? "text-accent-success"
                      : "text-accent-danger"
                  }`}
                >
                  {(rightFishMetrics.survivalRate - leftFishMetrics.survivalRate).toFixed(1)}%
                </span>{" "}
                ({LEVEL_LABELS[rightLevel]} vs {LEVEL_LABELS[leftLevel]})
              </div>
            ) : (
              <div className="text-sm font-mono text-textPrimary mt-1">
                Distance Advantage:{" "}
                <span
                  className={`font-bold tabular-nums ${
                    rightCarMetrics.distanceTravelled >= leftCarMetrics.distanceTravelled
                      ? "text-accent-success"
                      : "text-accent-danger"
                  }`}
                >
                  +{(rightCarMetrics.distanceTravelled - leftCarMetrics.distanceTravelled).toFixed(0)}m
                </span>{" "}
                ({LEVEL_LABELS[rightLevel]} vs {LEVEL_LABELS[leftLevel]}) · Crashes Saved:{" "}
                <span className="text-accent-success font-bold">
                  {Math.max(0, leftCarMetrics.crashCount - rightCarMetrics.crashCount)}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs font-mono text-textSecondary text-right">
            Deterministic Seed: #{globalSeed} · Synchronous Evaluation Loops
          </div>
        </Card>
      </div>
    </div>
  );
};
