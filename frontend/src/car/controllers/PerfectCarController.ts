import { Controller, NeuralLayer } from "../../controllers/types";

export class PerfectCarController implements Controller<number[], { steer: number; throttle: number }> {
  id = "car_l3_perfect";
  label = "Smooth Target AI";
  level = 3 as const;
  isLearned = false;
  description = "Uses Advanced Ray-Slip Memory to prevent rear-end collisions during tight curves.";
  
  isLoaded = true;
  layers: NeuralLayer[] = [];
  lastObservation: number[] = new Array(7).fill(0);
  lastActivations: number[][] = [];
  lastAction: [number, number] = [0, 0];

  previousNormOffset: number = 0.0;
  previousFront: number = 1.0;
  isLockedOn: boolean = false;
  
  // NEW: Timer to bridge sensor gaps during turns
  lockLossTimer: number = 0;

  constructor() {
    const w1: number[][] = Array.from({ length: 64 }, () => Array.from({ length: 7 }, () => (Math.random() - 0.5)));
    const b1: number[] = new Array(64).fill(0);
    const w2: number[][] = Array.from({ length: 32 }, () => Array.from({ length: 64 }, () => (Math.random() - 0.5)));
    const b2: number[] = new Array(32).fill(0);
    const w3: number[][] = Array.from({ length: 2 }, () => Array.from({ length: 32 }, () => (Math.random() - 0.5)));
    const b3: number[] = new Array(2).fill(0);

    this.layers = [
      { weight: w1, bias: b1, activation: "swish" as any },
      { weight: w2, bias: b2, activation: "swish" as any },
      { weight: w3, bias: b3, activation: "tanh" }
    ];
  }

  initialize(): void {}
  reset(): void {
    this.previousNormOffset = 0.0;
    this.previousFront = 1.0;
    this.isLockedOn = false;
    this.lockLossTimer = 0;
  }

  observe(state: { sensors: number[]; speed: number; lateralOffset: number }): number[] {
    const obs = [...state.sensors, Math.min(1.0, state.speed / 1.6), Math.max(-1.0, Math.min(1.0, state.lateralOffset / 5.65))];
    this.lastObservation = obs;
    return obs;
  }

  decide(observation: number[]): { steer: number; throttle: number } {
    const [frontRaw, frontRight, frontLeft, right, left, normSpeed, normOffset] = observation;
    
    // 1. ADVANCED RAY-SLIP MEMORY (The Crash Fix)
    let front = frontRaw;

    if (this.isLockedOn && frontRaw > 0.8) {
        // The ray slipped! Hallucinate the last known distance so we don't accidentally accelerate.
        front = this.previousFront; 
        this.lockLossTimer++;
        
        if (this.lockLossTimer > 12) { 
            // If the road has been clear for 12 continuous frames, safely drop the lock.
            this.isLockedOn = false;
            front = frontRaw; 
        }
    } else {
        // Normal operation / Target acquired
        this.lockLossTimer = 0;
        if (frontRaw < 0.75) this.isLockedOn = true;
    }

    let driftRate = normOffset - this.previousNormOffset;
    let approachRate = front - this.previousFront;

    if (this.previousFront === 1.0 && front < 0.8) {
        driftRate = 0; 
        approachRate = 0; 
    }

    this.previousNormOffset = normOffset;
    this.previousFront = front;

    // 2. EVALUATE SURROUNDINGS & LANE SAFETY
    let targetOffset = 0.0; 
    let isFollowing = false;

    if (this.isLockedOn) {
        const isLeftSafe = frontLeft > 0.45 && left > 0.35;
        const isRightSafe = frontRight > 0.45 && right > 0.35;

        // Ensure we only trigger lane changes when we actually get close
        if (front < 0.65 && isLeftSafe && !isRightSafe) {
            targetOffset = -0.55; 
        } else if (front < 0.65 && isRightSafe && !isLeftSafe) {
            targetOffset = 0.55;  
        } else if (front < 0.65 && isLeftSafe && isRightSafe) {
            if (frontLeft > frontRight + 0.1) targetOffset = -0.55;
            else if (frontRight > frontLeft + 0.1) targetOffset = 0.55;
            else targetOffset = normOffset < 0 ? -0.55 : 0.55;
        } else {
            targetOffset = normOffset; 
            isFollowing = true;
        }
    }

    // 3. SMOOTH TARGET-BASED STEERING
    const distanceToTarget = targetOffset - normOffset;
    let steer = (distanceToTarget * 1.2) - (driftRate * 16.0);

    if (left < 0.15) steer += (0.15 - left) * 3.0;
    if (right < 0.15) steer -= (0.15 - right) * 3.0;

    // 4. PROACTIVE FRONT-GATED THROTTLE CONTROL
    let throttle = 0.7;

    if (isFollowing || front < 0.8) {
        const targetDist = 0.35; 
        const distError = front - targetDist;
        
        // Boosted the braking multiplier to react harder when closing in fast
        let speedMatchTerm = approachRate < 0 ? approachRate * 40.0 : approachRate * 15.0;
        throttle = (distError * 3.5) + speedMatchTerm;

        // Hard brake override if target suddenly stops
        if (front < 0.25 && approachRate < -0.01) {
            throttle = -1.0;
        }
    } else {
        const maxForwardSpace = Math.max(front, frontLeft, frontRight);
        throttle = 0.5 + maxForwardSpace * 0.4;
    }

    // 5. SAFETY LIMITS
    if (Math.abs(steer) > 0.35) throttle = Math.min(throttle, 0.45); 
    if (frontRaw < 0.12) throttle = -1.0; // Emergency full brake (always uses RAW sensor)

    const finalSteer = Math.max(-1.0, Math.min(1.0, steer));
    const finalThrottle = Math.max(-1.0, Math.min(1.0, throttle));

    this.lastActivations = [
        observation,
        new Array(64).fill(0).map(() => Math.random()),
        new Array(32).fill(0).map(() => Math.random()),
        [finalSteer, finalThrottle]
    ];

    this.lastAction = [finalSteer, finalThrottle];
    return { steer: finalSteer, throttle: finalThrottle };
  }
}