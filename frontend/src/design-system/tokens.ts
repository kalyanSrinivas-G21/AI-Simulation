export type IntelligenceLevel = 0 | 1 | 2 | 3;

export const LEVEL_COLORS: Record<IntelligenceLevel, string> = {
  0: "#6B7280", // Neutral Gray (Random)
  1: "#F5A623", // Amber (Rules)
  2: "#8B5CF6", // Violet (Reactive / Learning)
  3: "#3E8EED", // Blue (Neural Network)
};

export const LEVEL_LABELS: Record<IntelligenceLevel, string> = {
  0: "Random Agent",
  1: "Rule-Based",
  2: "Learning",
  3: "Advanced Neural Network",
};

export const LEVEL_SHORT_LABELS: Record<IntelligenceLevel, string> = {
  0: "Random",
  1: "Rules",
  2: "Learning",
  3: "Advanced Neural Network",
};

export const LEVEL_QUESTIONS: Record<IntelligenceLevel, string> = {
  0: "What happens with zero understanding?",
  1: "Can fixed logic look smart?",
  2: "What if the agent learns from experience?",
  3: "What if perception and planning itself improves?",
};

export const LEVEL_TAKEAWAYS: Record<IntelligenceLevel, string> = {
  0: "Movement ≠ intelligence",
  1: "Programmed ≠ learned",
  2: "Discovery beats hand-coding, when it's trained well",
  3: "Information quality shapes intelligence as much as model size",
};
