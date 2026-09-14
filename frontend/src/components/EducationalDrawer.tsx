import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, AlertCircle, Sparkles, CheckCircle } from "lucide-react";
import { IntelligenceLevel, LEVEL_LABELS, LEVEL_QUESTIONS, LEVEL_TAKEAWAYS } from "../design-system/tokens";

interface EducationalDrawerProps {
  level: IntelligenceLevel;
  worldType: "fish" | "car";
}

const DETAILS = {
  fish: {
    0: {
      whatItKnows: "Zero perception. The fish has no awareness of distance to shark, borders, or peers.",
      howItDecides: "Random uniform heading changes (-30° to +30°) and random speeds chosen each step.",
      limits: "Captured rapidly as it wanders blindly into the predator.",
    },
    1: {
      whatItKnows: "Discrete scalar thresholds: shark distance (<120px), boundary (<60px), neighbor (<25px).",
      howItDecides: "Hardcoded priority if-else rules. Turns away if shark is close; heads to center if near wall.",
      limits: "Rigid and unadaptive. Can get trapped in corners or oscillate between conflicting rules.",
    },
    2: {
      whatItKnows: "Local neighborhood positions, headings, and predator threat within 80px perception radius.",
      howItDecides: "Reynolds Boids vector summation (Separation + Alignment + Cohesion + Threat Avoidance).",
      limits: "No long-term planning or memory; emergent coordination relies purely on immediate neighbors.",
    },
    3: {
      whatItKnows: "9 continuous normalized observations (shark vector, neighbor centroid, boundary margin, speeds).",
      howItDecides: "Non-linear neural policy trained via PPO to maximize survival and avoid corner traps.",
      limits: "Policy quality depends heavily on reward shaping; can overfit to specific training seeds if not generalized.",
    },
    4: {
      whatItKnows: "Multi-scale spatial perception and network architecture comparisons (Small vs Medium vs Advanced).",
      howItDecides: "Evaluated under identical training budgets to measure true parameter efficiency.",
      limits: "More layers do not automatically guarantee better survival without corresponding data diversity.",
    },
  },
  car: {
    0: {
      whatItKnows: "Zero sensor inputs, zero road awareness.",
      howItDecides: "Random continuous throttle and steering values.",
      limits: "Crashes almost instantly on track curves and obstacles.",
    },
    1: {
      whatItKnows: "5 Raycast sensor thresholds (<0.30 front, <0.20 lateral) and lane offset.",
      howItDecides: "Fixed safety rules: brake when obstacle is ahead, steer opposite to closest raycast.",
      limits: "Jittery bang-bang control; cannot anticipate curving trajectories smoothly.",
    },
    2: {
      whatItKnows: "Continuous normalized distance vectors across all 5 ray sensors simultaneously.",
      howItDecides: "Potential-field repulsion forces blending obstacle clearance with lane centering.",
      limits: "Cannot plan overtaking manoeuvres beyond immediate sensor horizons.",
    },
    3: {
      whatItKnows: "7-dimensional continuous state: 5 ray sensors + vehicle speed + lane centerline offset.",
      howItDecides: "Actor-Critic neural policy outputting continuous steering angle and throttle.",
      limits: "Sensitive to unseen obstacle patterns not encountered in the training distribution.",
    },
    4: {
      whatItKnows: "Hybrid vision feed (84x84 front camera render) fused with 7 numeric sensors.",
      howItDecides: "CNN feature extractor + policy network for richer spatial understanding.",
      limits: "Richer visual inputs require careful feature extraction to prevent noisy steering actions.",
    },
  },
};

export const EducationalDrawer: React.FC<EducationalDrawerProps> = ({ level, worldType }) => {
  const [isOpen, setIsOpen] = useState(true);
  const info = DETAILS[worldType][level];

  return (
    <div className="rounded-card border border-subtle bg-panel overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-panel-raised/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen size={16} className="text-accent-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-textPrimary">
            EDUCATIONAL BRIEFING — {LEVEL_LABELS[level].toUpperCase()}
          </span>
          <span className="text-xs text-textSecondary font-mono hidden md:inline">
            — "{LEVEL_QUESTIONS[level]}"
          </span>
        </div>
        <div className="flex items-center gap-2 text-textSecondary text-xs font-mono">
          <span>{isOpen ? "Collapse" : "Expand"}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 pt-1 border-t border-subtle/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-btn bg-canvas/60 border border-subtle">
            <div className="font-semibold text-accent-primary uppercase mb-1 flex items-center gap-1.5">
              <Sparkles size={13} />
              What It Knows
            </div>
            <p className="text-textSecondary leading-relaxed">{info.whatItKnows}</p>
          </div>

          <div className="p-3.5 rounded-btn bg-canvas/60 border border-subtle">
            <div className="font-semibold text-accent-success uppercase mb-1 flex items-center gap-1.5">
              <CheckCircle size={13} />
              How It Decides
            </div>
            <p className="text-textSecondary leading-relaxed">{info.howItDecides}</p>
          </div>

          <div className="p-3.5 rounded-btn bg-canvas/60 border border-subtle">
            <div className="font-semibold text-accent-danger uppercase mb-1 flex items-center gap-1.5">
              <AlertCircle size={13} />
              Limitations
            </div>
            <p className="text-textSecondary leading-relaxed">{info.limits}</p>
          </div>

          <div className="md:col-span-3 pt-2 text-[11px] text-accent-warning border-t border-subtle/30 flex items-center gap-2">
            <span className="font-bold">KEY SCIENTIFIC TAKEAWAY:</span>
            <span>{LEVEL_TAKEAWAYS[level]}</span>
          </div>
        </div>
      )}
    </div>
  );
};
