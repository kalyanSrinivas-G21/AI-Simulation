import { Controller } from "../../controllers/types";

export interface CarRuleObservation {
  sensors: number[];
  speed: number;
  lateralOffset: number;
}

export interface CarAction {
  steer: number;
  throttle: number;
  activeRuleIndex: number;
}

export const CAR_RULES = [
  { id: 0, label: "PANIC BRAKE", condition: "front < 0.15", action: "Throttle = -1.0" },
  { id: 1, label: "WALL REPULSION", condition: "left < 0.2 || right < 0.2", action: "Push away from wall" },
  { id: 2, label: "EVADE OBSTACLE", condition: "front < 0.55", action: "Swerve to open lane & Brake" },
  { id: 3, label: "NAVIGATE CURVE", condition: "|frontLeft - frontRight| > 0.15", action: "Steer into curve & Slow down" },
  { id: 4, label: "LANE CENTERING", condition: "Road is clear", action: "Gentle center tracking" },
];

export class RuleCarController implements Controller<CarRuleObservation, CarAction> {
  id = "car_l1_rules";
  label = "Rule-Based Driver";
  level = 1 as const;
  isLearned = false;
  description = "A robust cascading priority system that strictly overrides lower-level rules to guarantee safety.";

  initialize(): void {}
  reset(): void {}
  observe(state: { sensors: number[]; speed: number; lateralOffset: number }): CarRuleObservation { return state; }

  decide(obs: CarRuleObservation): CarAction {
    // Sensor mapping: 
    // [0]: Front, [1]: Front-Right, [2]: Front-Left, [3]: Right, [4]: Left
    const [front, frontRight, frontLeft, right, left] = obs.sensors;
    
    // Geometric difference between diagonals helps us "see" curves
    const diagDiff = frontLeft - frontRight;

    // Default states (Lowest Priority)
    let steer = 0;
    let throttle = 0.0; 
    let activeRuleIndex = 4; 

    // ==========================================
    // RULE 4: LANE CENTERING (Base Behavior)
    // ==========================================
    // If the road is straight, gently guide the car to lateralOffset 0.
    steer = -obs.lateralOffset * 0.4;
    throttle = 0.7;
    activeRuleIndex = 4;

    // ==========================================
    // RULE 3: NAVIGATE CURVE
    // ==========================================
    // Overwrites Rule 4. If the track curves, abandon centering and follow the wall.
    // If turning right, frontLeft is open (large) and frontRight is blocked (small).
    // diagDiff becomes positive, steering us Right (+).
    if (Math.abs(diagDiff) > 0.15) {
        steer = diagDiff * 0.8; 
        throttle = 0.45; // Drop speed immediately to maintain grip
        activeRuleIndex = 3;
    }

    // ==========================================
    // RULE 2: EVADE OBSTACLE
    // ==========================================
    // Overwrites Rules 3 & 4. If a car is in front, swerve to whichever side has more room.
    if (front < 0.55) {
        steer = frontLeft > frontRight ? -0.7 : 0.7;
        throttle = (front - 0.15) * 2.0; // Gradual braking as we approach
        activeRuleIndex = 2;
    }

    // ==========================================
    // RULE 1: WALL REPULSION
    // ==========================================
    // Overwrites steering from all previous rules if we are about to scrape the wall.
    if (left < 0.2 || right < 0.2) {
        if (left < 0.2) steer += (0.2 - left) * 6.0;  // Push Right
        if (right < 0.2) steer -= (0.2 - right) * 6.0; // Push Left
        
        throttle = Math.min(throttle, 0.4); // Ensure we don't accelerate into a wall bounce
        activeRuleIndex = 1;
    }

    // ==========================================
    // RULE 0: PANIC BRAKE
    // ==========================================
    // Overwrites throttle. If collision is imminent, full stop.
    if (front < 0.15) {
        throttle = -1.0;
        activeRuleIndex = 0;
    }

    // Physics Clamps to prevent extreme inputs from breaking the simulation
    steer = Math.max(-1.0, Math.min(1.0, steer));
    throttle = Math.max(-1.0, Math.min(1.0, throttle));

    return { steer, throttle, activeRuleIndex };
  }
}