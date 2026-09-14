import React from "react";
import { CheckCircle2, Circle, ListFilter } from "lucide-react";
import clsx from "clsx";

interface RuleItem {
  id: number;
  label: string;
  condition: string;
  action: string;
}

interface ActiveRulesDrawerProps {
  rules: RuleItem[];
  activeRuleIndex: number;
  worldName: string;
}

export const ActiveRulesDrawer: React.FC<ActiveRulesDrawerProps> = ({
  rules,
  activeRuleIndex,
  worldName,
}) => {
  return (
    <div className="p-4 rounded-card bg-panel border border-accent-warning/30 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-subtle">
        <div className="flex items-center gap-2 text-accent-warning text-xs font-mono font-bold tracking-wide">
          <ListFilter size={15} />
          <span>ACTIVE RULE ENGINE ({worldName.toUpperCase()})</span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-accent-warning/10 text-accent-warning border border-accent-warning/20">
          Deterministic · Not Learned
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {rules.map((rule) => {
          const isActive = rule.id === activeRuleIndex;
          return (
            <div
              key={rule.id}
              className={clsx(
                "p-3 rounded-btn border transition-all text-xs font-mono flex flex-col justify-between",
                isActive
                  ? "bg-accent-warning/15 border-accent-warning text-textPrimary shadow-[0_0_10px_rgba(245,166,35,0.2)]"
                  : "bg-canvas/60 border-subtle text-textSecondary opacity-70"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-[11px] text-textPrimary flex items-center gap-1.5">
                  {isActive ? (
                    <CheckCircle2 size={13} className="text-accent-warning" />
                  ) : (
                    <Circle size={13} className="text-textDisabled" />
                  )}
                  Rule {rule.id}: {rule.label}
                </span>
                {isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-warning text-black font-bold">
                    FIRING
                  </span>
                )}
              </div>
              <div className="text-[10px] text-textSecondary">
                <span className="text-textDisabled">IF:</span> {rule.condition}
              </div>
              <div className="text-[10px] text-textPrimary font-medium mt-1">
                <span className="text-textDisabled">THEN:</span> {rule.action}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
