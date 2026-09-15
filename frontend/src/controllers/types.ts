import { IntelligenceLevel } from "../design-system/tokens";

export interface ControllerMeta {
  id: string;
  label: string;
  level: IntelligenceLevel;
  isLearned: boolean; // false for 0/1/2, true for 3/4 — drives the "TRAINED" badge
  description?: string;
}

export interface Controller<TObservation, TAction> extends ControllerMeta {
  initialize(config?: Record<string, any>): void;
  observe(state: any): TObservation;
  decide(observation: TObservation): TAction;
  reset(seed?: number): void;
}

export interface NeuralLayer {
  weight: number[][]; // [out_features][in_features]
  bias: number[];
  activation: "tanh" | "relu" | "swish" | "sigmoid" | "linear"; // Expanded for potential future uses
}

export interface NeuralModelData {
  model_name: string;
  world: string;
  level: number;
  input_dim: number;
  output_dim: number;
  layers: NeuralLayer[];
}
