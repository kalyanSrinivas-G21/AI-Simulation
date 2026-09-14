export type IntelligenceLevel = 0 | 1 | 2 | 3 | 4;

export const LEVEL_COLORS: Record<IntelligenceLevel, string> = {
  0: "#6B7280", // Neutral Gray (Random)
  1: "#F5A623", // Amber (Rules)
  2: "#8B5CF6", // Violet (Reactive / Swarm)
  3: "#3E8EED", // Blue (Learning AI)
  4: "#10B981", // Teal-Green (Advanced / Vision AI)
};

export const LEVEL_LABELS: Record<IntelligenceLevel, string> = {
  0: "Random Agent",
  1: "Rule-Based",
  2: "Learning",
  3: "Neural Network",
  4: "Advanced / Multi-Agent",
};

export const LEVEL_SHORT_LABELS: Record<IntelligenceLevel, string> = {
  0: "Random",
  1: "Rules",
  2: "Learning",
  3: "Neural Network",
  4: "Vision",
};

export const LEVEL_QUESTIONS: Record<IntelligenceLevel, string> = {
  0: "What happens with zero understanding?",
  1: "Can fixed logic look smart?",
  2: "Can local reactions produce complex group behaviour?",
  3: "What if the agent learns from experience?",
  4: "What if perception itself improves?",
};

export const LEVEL_TAKEAWAYS: Record<IntelligenceLevel, string> = {
  0: "Movement ≠ intelligence",
  1: "Programmed ≠ learned",
  2: "Complexity can emerge without a central brain",
  3: "Discovery beats hand-coding, when it's trained well",
  4: "Information quality shapes intelligence as much as model size",
};
