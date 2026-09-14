import React from "react";
import { useAppStore } from "../state/appStore";
import { Card } from "../design-system/Card";
import { Badge } from "../design-system/Badge";
import { X, Cpu, Terminal, Sparkles, BookOpen } from "lucide-react";

interface TechnicalDrawerProps {
  worldType: "fish" | "car";
  observationVector?: number[];
  actionVector?: number[];
  hyperparameters?: Record<string, any>;
}

export const TechnicalDrawer: React.FC<TechnicalDrawerProps> = ({
  worldType,
  observationVector = [],
  actionVector = [],
  hyperparameters = {
    algorithm: "PPO (Proximal Policy Optimization)",
    framework: "PyTorch 2.x / Stable-Baselines3",
    timesteps: "500,000",
    batch_size: 64,
    n_steps: 2048,
    learning_rate: "3e-4",
    gamma: 0.99,
    action_space: "Continuous Box([-1,-1], [1,1])",
  },
}) => {
  const { technicalMode, toggleTechnicalMode } = useAppStore();

  if (!technicalMode) return null;

  const obsLabels =
    worldType === "fish"
      ? [
          "Dist to Shark (norm)",
          "Shark Dir X",
          "Shark Dir Y",
          "Relative Speed",
          "Current Speed",
          "3-Fish Centroid Dist",
          "Avg Neighbor Sin",
          "Avg Neighbor Cos",
          "Boundary Dist (norm)",
        ]
      : [
          "Front Raycast (40m)",
          "Front-Left Ray (+30°)",
          "Front-Right Ray (-30°)",
          "Left Ray (+90°)",
          "Right Ray (-90°)",
          "Speed (norm)",
          "Lane Offset (norm)",
        ];

  const rewardFormula =
    worldType === "fish"
      ? `R_t = +0.01 (alive bonus)\n      +0.30 if d_shark > 150px\n      -0.05 if d_boundary < 60px\n      -10.0 on predator capture (terminal)`
      : `R_t = + (v * 0.1 * dt) (progress)\n      + 0.05 * (1 - |offset|/laneWidth)\n      - 5.0 on vehicle collision (terminal)\n      - 2.0 on leaving track (terminal)\n      - 0.01 * |Δsteering| (smoothness)`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-panel-raised/95 border-t border-focus/50 shadow-2xl backdrop-blur-lg p-5 max-h-[420px] overflow-y-auto animate-in slide-in-from-bottom duration-200">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-subtle">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-focus/10 text-focus border border-focus/30">
              <Cpu size={18} />
            </span>
            <div>
              <h3 className="text-sm font-heading font-bold text-textPrimary tracking-wide flex items-center gap-2">
                TECHNICAL TELEMETRY & SPECIFICATION
                <Badge variant="trained" label="EVALUATED" />
              </h3>
              <p className="text-xs font-mono text-textSecondary">
                Live observation tensor, action distribution, and formal mathematical reward formulation
              </p>
            </div>
          </div>
          <button
            onClick={toggleTechnicalMode}
            className="p-1 rounded-btn text-textSecondary hover:text-textPrimary hover:bg-panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Technical Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Observation Vector */}
          <div className="p-3.5 rounded-card bg-canvas border border-subtle">
            <div className="text-xs font-mono font-semibold text-textSecondary uppercase mb-2 flex items-center justify-between">
              <span>Observation Vector (T={observationVector.length})</span>
              <span className="text-[10px] text-accent-primary">[-1.0, 1.0]</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {obsLabels.map((lbl, idx) => {
                const val = observationVector[idx] ?? 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs font-mono py-0.5 border-b border-subtle/50"
                  >
                    <span className="text-textSecondary text-[11px] truncate max-w-[180px]">
                      [{idx}] {lbl}
                    </span>
                    <span
                      className={`tabular-nums font-semibold ${
                        val < 0 ? "text-accent-danger" : val > 0.5 ? "text-accent-success" : "text-textPrimary"
                      }`}
                    >
                      {val.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward Formulation */}
          <div className="p-3.5 rounded-card bg-canvas border border-subtle flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-semibold text-textSecondary uppercase mb-2">
                Reward Formulation per §{worldType === "fish" ? "8.5" : "9.4"}
              </div>
              <pre className="text-[11px] font-mono text-accent-warning bg-panel/80 p-2.5 rounded border border-subtle whitespace-pre-wrap leading-relaxed">
                {rewardFormula}
              </pre>
            </div>
            <div className="text-[10px] font-mono text-textDisabled mt-2">
              Scientific rule: verified against reward-hacking corner exploits via evaluation seeds.
            </div>
          </div>

          {/* Hyperparameters & Architecture */}
          <div className="p-3.5 rounded-card bg-canvas border border-subtle">
            <div className="text-xs font-mono font-semibold text-textSecondary uppercase mb-2">
              Hyperparameters & Network Architecture
            </div>
            <div className="space-y-1 text-xs font-mono">
              {Object.entries(hyperparameters).map(([k, v]) => (
                <div key={k} className="flex justify-between py-0.5 border-b border-subtle/40">
                  <span className="text-textSecondary text-[11px]">{k}:</span>
                  <span className="text-textPrimary font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
