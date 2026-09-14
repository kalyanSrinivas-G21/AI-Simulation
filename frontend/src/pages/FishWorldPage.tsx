import React, { useEffect, useState, useMemo } from "react";
import { useAppStore } from "../state/appStore";
import { FishWorld, FishMetrics } from "../fish/simulation/world";
import { PixiFishCanvas } from "../fish/rendering/PixiFishCanvas";
import { LevelPill } from "../design-system/LevelPill";
import { MetricCounter } from "../design-system/MetricCounter";
import { Badge } from "../design-system/Badge";
import { EducationalDrawer } from "../components/EducationalDrawer";
import { ActiveRulesDrawer } from "../components/ActiveRulesDrawer";
import { FISH_RULES } from "../fish/controllers/RuleFishController";
import { DecisionFlow } from "../components/DecisionFlow";
import { TechnicalDrawer } from "../components/TechnicalDrawer";
import { LEVEL_COLORS, LEVEL_LABELS, IntelligenceLevel } from "../design-system/tokens";
import { RotateCcw, FastForward } from "lucide-react";

export const FishWorldPage: React.FC = () => {
  const { fishLevel, setFishLevel, globalSeed } = useAppStore();
  const [fps, setFps] = useState<number>(60);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);

  // Instantiate Fish World with global seed
  const world = useMemo(() => {
    return new FishWorld(980, 580, globalSeed, 220);
  }, [globalSeed]);

  const [metrics, setMetrics] = useState<FishMetrics>(() => world.getMetrics());

  // Keep world level in sync
  useEffect(() => {
    world.setLevel(fishLevel);
  }, [world, fishLevel]);

  // Keep speed in sync
  useEffect(() => {
    world.setSpeedMultiplier(speedMultiplier);
  }, [world, speedMultiplier]);

  // Metric polling loop (every 100ms for UI smoothness)
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(world.getMetrics());
    }, 100);
    return () => clearInterval(interval);
  }, [world]);

  const handleReset = () => {
    world.reset(globalSeed, 220);
    setMetrics(world.getMetrics());
  };

  const levels: IntelligenceLevel[] = [0, 1, 2, 3];
  
  const FISH_LABELS: Record<number, string> = {
    0: "Random Agent",
    1: "Rule-Based",
    2: "Swarm (Boids)",
    3: "Lateral Line Instinct",
  };
  
  const FISH_SHORT_LABELS: Record<number, string> = {
    0: "Random",
    1: "Rules",
    2: "Swarm",
    3: "Predictive Instinct",
  };

  const activeFish = world.fishList.find((f) => f.isAlive) || world.fishList[0];
  const activeRuleIndex = activeFish ? activeFish.activeRuleIndex : -1;

  // Observation vector and actions for DecisionFlow in Level 3
  const neuralObs = world.neuralCtrl.lastObservation;
  const neuralAction = world.neuralCtrl.lastAction;

  return (
    <div className="min-h-screen bg-grid-lab py-6 px-6 flex flex-col items-center">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-6">
        {/* Top Title & Level Switcher Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-card bg-panel border border-subtle">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: LEVEL_COLORS[fishLevel] }}
            />
            <div>
              <h2 className="text-lg font-heading font-bold text-textPrimary tracking-wide flex items-center gap-2.5">
                FISH WORLD: LEVEL {fishLevel} — {FISH_LABELS[fishLevel].toUpperCase()}
                <Badge
                  variant={fishLevel >= 3 ? "trained" : "live"}
                  label={fishLevel >= 3 ? "BIOLOGICAL" : "LIVE SIM"}
                />
              </h2>
              <p className="text-xs font-mono text-textSecondary">
                Emergent collective dynamics vs. individual policies under FSM predator pressure
              </p>
            </div>
          </div>

          {/* Level Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {levels.map((lvl) => (
              <LevelPill
                key={lvl}
                level={lvl}
                isActive={fishLevel === lvl}
                onClick={() => setFishLevel(lvl)}
                labelOverride={FISH_SHORT_LABELS[lvl]}
              />
            ))}
            <button
              onClick={handleReset}
              title="Reset simulation with current seed"
              className="p-2 rounded-btn border border-subtle bg-canvas hover:border-accent-primary text-textSecondary hover:text-textPrimary transition-colors ml-1"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Main Canvas + Metrics Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Simulation Canvas Viewport (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative w-full aspect-[16/9]">
              <PixiFishCanvas
                world={world}
                onFpsUpdate={setFps}
                className="w-full h-full"
              />

              {/* Canvas Overlays */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-accent-success font-semibold">
                  FPS: {fps}
                </span>
                <span className="px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-textSecondary">
                  AGENTS: {metrics.aliveFish} / {metrics.totalFish}
                </span>
              </div>

              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-accent-danger/40 text-[11px] font-mono text-accent-danger font-semibold">
                  PREDATOR: {metrics.sharkState}
                </span>
              </div>
            </div>

            {/* If Level 1: Active Rules Drawer */}
            {fishLevel === 1 && (
              <ActiveRulesDrawer
                rules={FISH_RULES}
                activeRuleIndex={activeRuleIndex}
                worldName="Fish World"
              />
            )}

            {/* Collapsible Educational Drawer */}
            <EducationalDrawer level={fishLevel} worldType="fish" />
          </div>

          {/* Right Metrics Rail (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-textSecondary px-1 flex items-center justify-between">
              <span>LIVE TELEMETRY</span>
              <span className="text-accent-primary">{metrics.elapsedSeconds.toFixed(1)}s ELAPSED</span>
            </div>
            
            {/* Speed Control Slider */}
            <div className="p-4 rounded-card bg-panel border border-subtle flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-textSecondary">
                <span className="flex items-center gap-1"><FastForward size={14}/> SIMULATION SPEED</span>
                <span className="text-accent-primary font-bold">{speedMultiplier.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.25" 
                max="2.5" 
                step="0.25"
                value={speedMultiplier} 
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="w-full accent-accent-primary"
              />
            </div>

            <MetricCounter
              label="Survival Rate"
              value={metrics.survivalRate}
              unit="%"
              decimals={1}
              color={metrics.survivalRate > 70 ? "#22C55E" : metrics.survivalRate > 40 ? "#F5A623" : "#EF4444"}
              subtext="Percentage of population evading predator"
            />

            <MetricCounter
              label="Fish Captured"
              value={metrics.fishCaptured}
              color="#EF4444"
              subtext="Total casualties claimed by shark"
            />

            <MetricCounter
              label="Escape Success Rate"
              value={metrics.escapeSuccessRate}
              unit="%"
              decimals={0}
              color="#3E8EED"
              subtext="Evasions / total predator attack charges"
            />

            <MetricCounter
              label="Avg Distance to Shark"
              value={metrics.avgDistanceToShark}
              unit="px"
              color="#8B5CF6"
              subtext="Mean spatial clearance from predator"
            />

            <MetricCounter
              label="Group Cohesion Index"
              value={metrics.groupCohesionIndex}
              unit="px"
              color="#10B981"
              subtext="Mean nearest-3 neighbor distance (Boids)"
            />

            <div className="p-4 rounded-card bg-panel/70 border border-subtle text-xs font-mono text-textSecondary mt-2">
              <span className="text-accent-warning font-semibold block mb-1">OBSERVABLE DIFFERENCE:</span>
              {fishLevel === 0 && "Notice how Level 0 fish wander aimlessly straight into the shark's path."}
              {fishLevel === 1 && "Notice how rules react only when shark is <120px, causing rigid corner entrapment."}
              {fishLevel === 2 && "Notice the signature PANIC WAVE propagating outwards across the school!"}
              {fishLevel >= 3 && "Notice how the trained neural agent maintains safe clearance while avoiding corners."}
            </div>
          </div>
        </div>

        {/* Global Technical Mode Drawer */}
        <TechnicalDrawer
          worldType="fish"
          observationVector={neuralObs}
          actionVector={[neuralAction[0], neuralAction[1]]}
        />
      </div>
    </div>
  );
};
