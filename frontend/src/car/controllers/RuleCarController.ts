import { Controller } from "../../controllers/types";

export interface CarRuleObservation {
  sensors: number[]; // [front, fLeft, fRight, left, right]
  speed: number;
  lateralOffset: number;
}

export interface CarAction {
  steer: number;
  throttle: number;
  activeRuleIndex: number;
}

// Exhaustive Rule Base for Expert System Demonstration
export const CAR_RULES = [
  { id: 0, label: "PANIC FREEZE", condition: "All sensors < 0.2", action: "Absolute Freeze (throttle -1.0, steer 0)" },
  
  { id: 1, label: "EMERGENCY BRAKE", condition: "front < 0.25", action: "ABS Brake (throttle -1.0)" },
  { id: 2, label: "EVADE LEFT BLOCK", condition: "frontLeft < 0.30", action: "Hard Swerve Right (-0.8), throttle 0.2" },
  { id: 3, label: "EVADE RIGHT BLOCK", condition: "frontRight < 0.30", action: "Hard Swerve Left (+0.8), throttle 0.2" },
  
  { id: 4, label: "ACC BRAKING", condition: "0.25 < front < 0.60", action: "Proportional Brake (throttle = (front-0.2)*1.5)" },
  
  { id: 5, label: "ANTICIPATE LEFT CURVE", condition: "frontLeft < frontRight - 0.15", action: "Steer Left Smoothly (+0.35)" },
  { id: 6, label: "ANTICIPATE RIGHT CURVE", condition: "frontRight < frontLeft - 0.15", action: "Steer Right Smoothly (-0.35)" },
  
  { id: 7, label: "AGGRESSIVE CENTERING", condition: "|offset| > 1.5", action: "Steer = -sign(offset) * 0.6" },
  { id: 8, label: "PROPORTIONAL CENTERING", condition: "|offset| > 0.2", action: "Steer = -offset * 0.35" },
  { id: 9, label: "WALL BALANCING", condition: "All clear", action: "Steer += (left - right) * 0.15" },
  
  { id: 10, label: "CORNERING SPEED LIMIT", condition: "|steer| > 0.5", action: "Reduce throttle to 0.4" },
  { id: 11, label: "CRUISE ACCELERATION", condition: "front > 0.60", action: "Throttle = 0.8" },
];

export class RuleCarController implements Controller<CarRuleObservation, CarAction> {
  id = "car_l1_rules";
  label = "Rule-Based Driver";
  level = 1 as const;
  isLearned = false;
  description = "Exhaustive 12-rule expert system. Covers panic, ACC, curve anticipation, and centering. Still brittle in dense dynamic traffic.";

  initialize(): void {}
  reset(): void {}

  observe(state: { sensors: number[]; speed: number; lateralOffset: number }): CarRuleObservation {
    return state;
  }

  decide(obs: CarRuleObservation): CarAction {
    const [front, frontLeft, frontRight, left, right] = obs.sensors;
    let steer = 0;
    let throttle = 0.8; // Default Cruise
    let activeRuleIndex = 11; // Default to Cruise

    // RULE 0: PANIC FREEZE (If boxed in completely)
    if (front < 0.2 && frontLeft < 0.2 && frontRight < 0.2) {
      return { steer: 0, throttle: -1.0, activeRuleIndex: 0 };
    }

    // RULE 1: EMERGENCY BRAKE (Front imminently blocked)
    if (front < 0.25) {
      // Steer towards the clearest side while braking
      const evadeDir = frontLeft > frontRight ? -0.5 : 0.5;
      return { steer: evadeDir, throttle: -1.0, activeRuleIndex: 1 };
    }

    // RULE 2 & 3: EVASIVE SWERVING (Obstacle encroaching on front diagonals)
    if (frontLeft < 0.30) {
      return { steer: -0.8, throttle: 0.2, activeRuleIndex: 2 };
    }
    if (frontRight < 0.30) {
      return { steer: 0.8, throttle: 0.2, activeRuleIndex: 3 };
    }

    // RULE 4: ADAPTIVE CRUISE CONTROL (Following traffic)
    if (front < 0.60) {
      // Proportional braking based on distance
      throttle = (front - 0.2) * 1.5; 
      throttle = Math.max(-0.5, Math.min(1.0, throttle));
      activeRuleIndex = 4;
      // Keep centered while braking
      steer = -obs.lateralOffset * 0.35;
    } else {
      // RULES 5-9: STEERING LOGIC (If no immediate collision)
      
      // RULE 5 & 6: CURVE ANTICIPATION (Using sensor differentials)
      if (frontLeft < frontRight - 0.15) {
        // Track curves left
        steer = 0.35;
        activeRuleIndex = 5;
      } else if (frontRight < frontLeft - 0.15) {
        // Track curves right
        steer = -0.35;
        activeRuleIndex = 6;
      } else {
        // RULE 7 & 8: LANE CENTERING
        if (Math.abs(obs.lateralOffset) > 1.5) {
          // Aggressive centering if severely off-center
          steer = -Math.sign(obs.lateralOffset) * 0.6;
          activeRuleIndex = 7;
        } else if (Math.abs(obs.lateralOffset) > 0.2) {
          // Proportional centering for minor drift
          steer = -obs.lateralOffset * 0.35;
          activeRuleIndex = 8;
        } else {
          // RULE 9: WALL BALANCING (If perfectly centered, stay parallel)
          steer = (left - right) * 0.15;
          activeRuleIndex = 9;
        }
      }
    }

    // RULE 10: CORNERING SPEED LIMIT
    if (Math.abs(steer) > 0.5) {
      throttle = Math.min(throttle, 0.4); // Slow down for sharp turns
      if (activeRuleIndex < 10) activeRuleIndex = 10; // Override rule index if slowing down
    }

    // Clamp outputs
    steer = Math.max(-1.0, Math.min(1.0, steer));
    throttle = Math.max(-1.0, Math.min(1.0, throttle));

    return { steer, throttle, activeRuleIndex };
  }
}