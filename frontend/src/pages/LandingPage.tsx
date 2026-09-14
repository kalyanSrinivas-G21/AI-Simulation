import React from "react";
import { useAppStore } from "../state/appStore";
import { Card } from "../design-system/Card";
import { LevelPill } from "../design-system/LevelPill";
import {
  LEVEL_COLORS,
  LEVEL_LABELS,
  LEVEL_QUESTIONS,
  LEVEL_TAKEAWAYS,
  IntelligenceLevel,
} from "../design-system/tokens";
import { Fish, Car, Brain, GitCompare, ArrowRight, Sparkles, Activity } from "lucide-react";
import { motion } from "framer-motion";

export const LandingPage: React.FC = () => {
  const { setCurrentPage, setFishLevel, setCarLevel } = useAppStore();

  const levels: IntelligenceLevel[] = [0, 1, 2, 3, 4];

  return (
    <div className="min-h-screen bg-grid-lab py-12 px-6 flex flex-col items-center">
      <div className="max-w-[1240px] w-full mx-auto flex flex-col gap-12">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center gap-4 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-primary/30 bg-accent-primary/10 text-accent-primary text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles size={13} />
            B.Tech Science Day Exhibition
          </div>

          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-textPrimary tracking-tight">
            Evolution of Intelligence
          </h1>

          <p className="text-base sm:text-lg text-textSecondary font-sans leading-relaxed">
            From random behaviour to rule-based systems, emergent swarm intelligence, reinforcement
            learning, and vision-assisted perception.
          </p>

          <div className="p-4 rounded-card bg-panel/80 border border-subtle text-xs font-mono text-textSecondary max-w-2xl text-left border-l-4 border-l-accent-primary">
            <span className="text-accent-primary font-bold">CORE SCIENTIFIC THESIS: </span>
            Intelligence does not improve simply by adding size. It improves when model complexity,
            training quality, environment design, observation quality, and reward design are all
            appropriate to the problem.
          </div>
        </div>

        {/* The 5-Level Progression Ladder per §3 & §11.1 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-textSecondary">
              THE INTELLIGENCE PROGRESSION LADDER
            </h2>
            <span className="text-xs font-mono text-textDisabled">Click level to test</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {levels.map((lvl, index) => {
              const color = LEVEL_COLORS[lvl];
              return (
                <motion.div
                  key={lvl}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                >
                  <Card
                    onClick={() => {
                      setFishLevel(lvl);
                      setCurrentPage("fish");
                    }}
                    selectedBorderColor={color}
                    className="cursor-pointer hover:-translate-y-1 transition-transform h-full flex flex-col justify-between p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <LevelPill level={lvl} isActive size="sm" />
                      </div>
                      <div className="text-xs font-mono text-textSecondary mb-2 italic">
                        "{LEVEL_QUESTIONS[lvl]}"
                      </div>
                    </div>

                    <div className="pt-3 border-t border-subtle/50 text-[11px] font-mono text-textPrimary font-medium">
                      <span className="text-textDisabled block text-[10px] uppercase font-semibold mb-0.5">
                        Core Takeaway
                      </span>
                      {LEVEL_TAKEAWAYS[lvl]}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Two Simulation Worlds Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fish World Card */}
          <Card className="p-8 flex flex-col justify-between bg-panel-raised/60 hover:border-accent-primary/60 transition-colors">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center text-accent-primary">
                <Fish size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-heading font-bold text-textPrimary">
                    Fish World (2D Predator-Prey)
                  </h3>
                  <span className="text-xs font-mono text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded border border-accent-primary/20">
                    PixiJS 8 WebGL
                  </span>
                </div>
                <p className="text-sm text-textSecondary leading-relaxed">
                  250 prey fish escaping an FSM shark predator. Experience how simple local Reynolds
                  Boids rules generate an emergent collective panic-wave, outperforming chaotic
                  randomness.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-textSecondary pt-2">
                <div className="p-2.5 rounded bg-canvas/60 border border-subtle">
                  <span className="text-textDisabled block text-[10px]">SIGNATURE DEMO</span>
                  Emergent Swarm Evasion
                </div>
                <div className="p-2.5 rounded bg-canvas/60 border border-subtle">
                  <span className="text-textDisabled block text-[10px]">EVALUATION</span>
                  Survival Rate & Cohesion
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage("fish")}
              className="mt-6 flex items-center justify-center gap-2 py-3 px-5 rounded-btn bg-accent-primary hover:bg-accent-primary/90 text-white font-mono font-semibold text-sm transition-colors shadow-lg shadow-accent-primary/20"
            >
              <span>Enter Fish Simulation</span>
              <ArrowRight size={16} />
            </button>
          </Card>

          {/* Car World Card */}
          <Card className="p-8 flex flex-col justify-between bg-panel-raised/60 hover:border-level-2/60 transition-colors">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-level-2/20 border border-level-2/40 flex items-center justify-center text-level-2">
                <Car size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-heading font-bold text-textPrimary">
                    Car World (3D Autonomous Driving)
                  </h3>
                  <span className="text-xs font-mono text-level-2 bg-level-2/10 px-2 py-0.5 rounded border border-level-2/20">
                    React Three Fiber
                  </span>
                </div>
                <p className="text-sm text-textSecondary leading-relaxed">
                  A closed 3-lane loop with traffic. Watch autonomous policies navigate using 5
                  raycast sensors, potential fields, and continuous PPO reinforcement learning.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-textSecondary pt-2">
                <div className="p-2.5 rounded bg-canvas/60 border border-subtle">
                  <span className="text-textDisabled block text-[10px]">SIGNATURE DEMO</span>
                  Sensor Raycasts & Potential Fields
                </div>
                <div className="p-2.5 rounded bg-canvas/60 border border-subtle">
                  <span className="text-textDisabled block text-[10px]">EVALUATION</span>
                  Zero-Crash Trip & Lane Stability
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage("car")}
              className="mt-6 flex items-center justify-center gap-2 py-3 px-5 rounded-btn bg-level-2 hover:bg-level-2/90 text-white font-mono font-semibold text-sm transition-colors shadow-lg shadow-level-2/20"
            >
              <span>Enter Car Simulation</span>
              <ArrowRight size={16} />
            </button>
          </Card>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            onClick={() => setCurrentPage("ailab")}
            className="cursor-pointer hover:border-textDisabled/60 transition-all p-5 flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-accent-primary/10 text-accent-primary">
              <Brain size={22} />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-textPrimary">AI Lab</h4>
              <p className="text-xs font-mono text-textSecondary">
                Architecture diagrams & training curves
              </p>
            </div>
          </Card>

          <Card
            onClick={() => setCurrentPage("comparison")}
            className="cursor-pointer hover:border-textDisabled/60 transition-all p-5 flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-accent-warning/10 text-accent-warning">
              <GitCompare size={22} />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-textPrimary">
                Comparison Mode
              </h4>
              <p className="text-xs font-mono text-textSecondary">
                Side-by-side exact seed benchmarking
              </p>
            </div>
          </Card>

          <Card
            onClick={() => setCurrentPage("analytics")}
            className="cursor-pointer hover:border-textDisabled/60 transition-all p-5 flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-level-4/10 text-level-4">
              <Activity size={22} />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-textPrimary">
                Full Analytics
              </h4>
              <p className="text-xs font-mono text-textSecondary">
                Scientific metrics & evaluation graphs
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
