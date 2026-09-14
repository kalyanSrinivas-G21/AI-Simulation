import React, { useEffect, useState } from "react";
import { Card } from "../design-system/Card";
import { Badge } from "../design-system/Badge";
import { GitBranch, Activity } from "lucide-react";

interface DecisionFlowProps {
  inputValues: number[];
  inputLabels: string[];
  layerDimensions: number[]; // e.g. [9, 32, 16, 2] or [7, 32, 16, 2]
  actions: { label: string; value: number; unit?: string }[];
  className?: string;
}

export const DecisionFlow: React.FC<DecisionFlowProps> = ({
  inputValues,
  inputLabels,
  layerDimensions,
  actions,
  className,
}) => {
  // Throttled update to ~5Hz (200ms) per §13
  const [displayInputs, setDisplayInputs] = useState(inputValues);
  const [displayActions, setDisplayActions] = useState(actions);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayInputs([...inputValues]);
      setDisplayActions([...actions]);
    }, 200);
    return () => clearInterval(interval);
  }, [inputValues, actions]);

  return (
    <Card className={`p-5 flex flex-col gap-4 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-subtle">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-accent-primary" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-textPrimary">
            DECISION FLOW (5Hz SAMPLING)
          </h4>
        </div>
        <span className="text-[10px] font-mono text-textSecondary uppercase">
          Policy Network Feed-Forward
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Inputs Column */}
        <div className="lg:col-span-4 flex flex-col gap-1.5">
          <div className="text-[11px] font-mono text-textSecondary uppercase font-semibold mb-1">
            Normalized Inputs ({displayInputs.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {displayInputs.map((val, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[11px] font-mono bg-canvas/70 px-2 py-1 rounded border border-subtle/60"
              >
                <span className="text-textSecondary truncate max-w-[130px]">
                  {inputLabels[i] || `In[${i}]`}
                </span>
                <span
                  className={`tabular-nums font-semibold ${
                    val < 0 ? "text-accent-danger" : val > 0.5 ? "text-accent-success" : "text-textPrimary"
                  }`}
                >
                  {val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Network Layers Diagram (Dots per §13) */}
        <div className="lg:col-span-4 flex items-center justify-around py-3 px-2 rounded-card bg-canvas/60 border border-subtle">
          {layerDimensions.map((nodesCount, layerIdx) => {
            const displayDots = Math.min(8, nodesCount);
            return (
              <div key={layerIdx} className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-mono text-textDisabled">
                  {layerIdx === 0 ? "IN" : layerIdx === layerDimensions.length - 1 ? "OUT" : `L${layerIdx}`}
                </div>
                <div className="flex flex-col gap-1 items-center py-1">
                  {Array.from({ length: displayDots }).map((_, dotIdx) => (
                    <div
                      key={dotIdx}
                      className="w-2 h-2 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor:
                          layerIdx === layerDimensions.length - 1
                            ? "#10B981"
                            : layerIdx === 0
                            ? "#3E8EED"
                            : "#8B5CF6",
                        opacity: 0.5 + Math.random() * 0.5,
                      }}
                    />
                  ))}
                  {nodesCount > 8 && <div className="text-[8px] font-mono text-textDisabled">⋮</div>}
                </div>
                <div className="text-[10px] font-mono text-textSecondary font-semibold">
                  {nodesCount}
                </div>
              </div>
            );
          })}
        </div>

        {/* Output Action Bars */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="text-[11px] font-mono text-textSecondary uppercase font-semibold mb-1">
            Policy Action Vector
          </div>
          {displayActions.map((act, i) => {
            // Normalize action value (-1 to 1) to percentage for bar visualization
            const pct = Math.max(0, Math.min(100, ((act.value + 1.0) / 2.0) * 100));
            return (
              <div key={i} className="p-2 rounded bg-canvas/80 border border-subtle flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-textSecondary">{act.label}</span>
                  <span className="font-bold tabular-nums text-accent-primary">
                    {act.value > 0 ? `+${act.value.toFixed(2)}` : act.value.toFixed(2)} {act.unit || ""}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-panel rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-accent-primary transition-all duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
