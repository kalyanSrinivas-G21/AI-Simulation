import React, { useEffect, useState, useMemo } from "react";
import { useAppStore } from "../state/appStore";
import { CarSim, CarMetrics } from "../car/simulation/CarSim";
import { CarCanvas } from "../car/rendering/CarCanvas";
import { DashCamView } from "../car/rendering/DashCamView";
import { LevelPill } from "../design-system/LevelPill";
import { MetricCounter } from "../design-system/MetricCounter";
import { Badge } from "../design-system/Badge";
import { EducationalDrawer } from "../components/EducationalDrawer";
import { ActiveRulesDrawer } from "../components/ActiveRulesDrawer";
import { CAR_RULES } from "../car/controllers/RuleCarController";
import { DecisionFlow } from "../components/DecisionFlow";
import { TechnicalDrawer } from "../components/TechnicalDrawer";
import { LEVEL_COLORS, IntelligenceLevel } from "../design-system/tokens";
import { RotateCcw, FastForward, Brain } from "lucide-react";

export const CarWorldPage: React.FC = () => {
  const { carLevel, setCarLevel, globalSeed } = useAppStore();
  const [cameraMode, setCameraMode] = useState<"topDown" | "follow">("topDown");
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);

  // Local seed state to force re-creation of the simulation
  const [localSeed, setLocalSeed] = useState(globalSeed);
  const sim = useMemo(() => new CarSim(localSeed), [localSeed]);
  const [metrics, setMetrics] = useState<CarMetrics>(() => sim.getMetrics());

  useEffect(() => { sim.setLevel(carLevel); }, [sim, carLevel]);
  useEffect(() => { sim.setSpeedMultiplier(speedMultiplier); }, [sim, speedMultiplier]);
  useEffect(() => {
    const interval = setInterval(() => setMetrics(sim.getMetrics()), 100);
    return () => clearInterval(interval);
  }, [sim]);

  // Generate a brand new random environment on Reset
  const handleReset = () => {
    setLocalSeed(Math.floor(Math.random() * 100000));
  };
  
  const handleResetLearning = () => { sim.resetLearning(); setMetrics(sim.getMetrics()); };

  const levels: IntelligenceLevel[] = [0, 1, 2, 3];
  const LEVEL_NAMES = ["RANDOM", "RULE-BASED", "LEARNING", "NEURAL NETWORK"];
  const activeRuleIndex = sim.car.activeRuleIndex;
  const neuralObs = sim.neuralCtrl.lastObservation;
  const neuralAction = sim.neuralCtrl.lastAction;
  const sensorNames = ["Front (40m)", "Front-L (+30°)", "Front-R (-30°)", "Left (+90°)", "Right (-90°)"];

  return (
    <div className="min-h-screen bg-grid-lab py-6 px-6 flex flex-col items-center">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-card bg-panel border border-subtle">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LEVEL_COLORS[carLevel] }} />
            <div>
              <h2 className="text-lg font-heading font-bold text-textPrimary tracking-wide flex items-center gap-2.5">
                CAR WORLD: LEVEL {carLevel} — {LEVEL_NAMES[carLevel]}
                <Badge variant={carLevel >= 3 ? "trained" : "live"} label={carLevel >= 3 ? "TRAINED POLICY" : "LIVE 3D SIM"} />
              </h2>
              <p className="text-xs font-mono text-textSecondary">Autonomous continuous control across a 3-lane circuit</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-canvas p-1 rounded-btn border border-subtle mr-2">
              <button onClick={() => setCameraMode("topDown")} className={`px-3 py-1 text-xs font-mono rounded transition-colors ${cameraMode === "topDown" ? "bg-panel text-accent-primary font-semibold" : "text-textSecondary"}`}>Top-Down</button>
              <button onClick={() => setCameraMode("follow")} className={`px-3 py-1 text-xs font-mono rounded transition-colors ${cameraMode === "follow" ? "bg-panel text-accent-primary font-semibold" : "text-textSecondary"}`}>Chase Cam</button>
            </div>
            {levels.map((lvl) => <LevelPill key={lvl} level={lvl} isActive={carLevel === lvl} onClick={() => setCarLevel(lvl)} />)}
            <button onClick={handleReset} title="Reset Simulation" className="p-2 rounded-btn border border-subtle bg-canvas hover:border-accent-primary text-textSecondary hover:text-textPrimary transition-colors ml-1"><RotateCcw size={15} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative w-full aspect-[16/10] max-h-[580px]">
              <CarCanvas sim={sim} cameraMode={cameraMode} className="w-full h-full" />
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-accent-success font-semibold">SPEED: {(metrics.currentSpeed * 30).toFixed(1)} km/h</span>
              </div>
              {sim.car.isCrashed && <div className="absolute top-3 right-3 animate-bounce"><span className="px-3 py-1 rounded bg-accent-danger text-white font-mono text-xs font-bold shadow-lg">COLLISION DETECTED</span></div>}
            </div>

            {carLevel === 3 && <DashCamView sim={sim} />}

            <div className="p-4 rounded-card bg-panel border border-subtle">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-textSecondary mb-3 flex items-center justify-between"><span>5-RAYCAST DISTANCE READINGS</span><span className="text-[11px] text-textDisabled">1.0 = Clear · 0.0 = Contact</span></div>
              <div className="grid grid-cols-5 gap-3">
                {metrics.sensorReadings.map((val, idx) => {
                  const pct = Math.round(val * 100); let barColor = "#22C55E";
                  if (val < 0.35) barColor = "#EF4444"; else if (val < 0.65) barColor = "#F5A623";
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono"><span className="text-textSecondary truncate">{sensorNames[idx]}</span><span className="tabular-nums font-bold" style={{ color: barColor }}>{pct}%</span></div>
                      <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-subtle"><div className="h-full transition-all duration-100" style={{ width: `${pct}%`, backgroundColor: barColor }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {carLevel === 1 && <ActiveRulesDrawer rules={CAR_RULES} activeRuleIndex={activeRuleIndex} worldName="Car World" />}
            {carLevel >= 3 && <DecisionFlow inputValues={neuralObs} inputLabels={["Front", "F-Left", "F-Right", "Left", "Right", "Speed", "Offset"]} layerDimensions={[7, 32, 16, 2]} actions={[{ label: "Steering", value: neuralAction[0] * 0.45, unit: "rad" }, { label: "Throttle", value: neuralAction[1], unit: "cmd" }]} />}
            <EducationalDrawer level={carLevel} worldType="car" />
          </div>

          {/* Right Metrics Rail */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-textSecondary px-1 flex items-center justify-between"><span>VEHICLE TELEMETRY</span><span className="text-accent-primary">{metrics.elapsedSeconds}s RUNNING</span></div>
            
            <div className="p-4 rounded-card bg-panel border border-subtle flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-textSecondary"><span className="flex items-center gap-1"><FastForward size={14}/> SIMULATION SPEED</span><span className="text-accent-primary font-bold">{speedMultiplier.toFixed(2)}x</span></div>
              <input type="range" min="0.25" max="2.5" step="0.25" value={speedMultiplier} onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))} className="w-full accent-accent-primary" />
            </div>

            {carLevel === 2 && (
              <div className="p-4 rounded-card bg-panel border border-accent-success/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-accent-success text-xs font-mono font-bold uppercase tracking-wider"><Brain size={16} /> LIVE NEURO-EVOLUTION</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[10px] text-textSecondary">GENERATION</div><div className="text-xl font-bold text-accent-success">{metrics.generation || 1}</div></div>
                  <div><div className="text-[10px] text-textSecondary">BEST DISTANCE</div><div className="text-xl font-bold text-accent-success">{metrics.bestDistance || 0}m</div></div>
                </div>
                <button onClick={handleResetLearning} className="mt-1 w-full px-3 py-2 text-xs font-mono rounded-btn border border-subtle bg-canvas hover:border-accent-success text-textSecondary hover:text-accent-success transition-colors flex items-center justify-center gap-1.5"><RotateCcw size={14} /> RESET LEARNING (Epoch 1)</button>
              </div>
            )}

            <MetricCounter label="Distance Travelled" value={metrics.distanceTravelled} unit="m" color="#3E8EED" subtext="Total cumulative distance" />
            <MetricCounter label="Total Crashes" value={metrics.crashCount} color={metrics.crashCount === 0 ? "#22C55E" : "#EF4444"} subtext={metrics.timeToFirstCrash ? `First at ${metrics.timeToFirstCrash}s` : "Zero crashes"} />
            <MetricCounter label="Lane Stability" value={metrics.laneStability} decimals={2} color="#8B5CF6" subtext="Variance (lower = steadier)" />
            
            <div className="p-4 rounded-card bg-panel/70 border border-subtle text-xs font-mono text-textSecondary mt-2">
              <span className="text-accent-warning font-semibold block mb-1">OBSERVABLE DIFFERENCE:</span>
              {carLevel === 0 && "Level 0 drives erratically, freezing and reversing. Crashes immediately."}
              {carLevel === 1 && "Level 1 strictly follows rules. It panics and freezes when surrounded by traffic."}
              {carLevel === 2 && "Level 2 learns from crashes. Hit 'Reset Learning' to watch it evolve from scratch."}
              {carLevel === 3 && "Level 3 uses smooth predictive control. It brakes smoothly and navigates traffic perfectly."}
            </div>
          </div>
        </div>
        <TechnicalDrawer worldType="car" observationVector={neuralObs} actionVector={[neuralAction[0], neuralAction[1]]} />
      </div>
    </div>
  );
};