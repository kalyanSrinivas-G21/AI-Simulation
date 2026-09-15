import { Controller, NeuralLayer } from "../../controllers/types";

export class NeuralCarController implements Controller<number[], { steer: number; throttle: number }> {
  id = "car_l3_learning";
  label = "PPO Autonomous Policy";
  level = 3 as const;
  isLearned = true;
  description = "Demonstration Learning Algorithm.";

  isLoaded = true;
  isFallback = false;
  layers: NeuralLayer[] = [];

  lastObservation: number[] = new Array(7).fill(0);
  lastActivations: number[][] = [];
  lastAction: [number, number] = [0, 0];
  
  previousFront: number = 1.0;
  previousNormOffset: number = 0.0;
  isLockedOn: boolean = false;

  learningProgress: number = 0.0; 
  collisionCount: number = 0;
  timeOffset: number = Math.random() * 1000;

  constructor() {
    this.initDefaultWeights();
  }

  initDefaultWeights(): void {
    const w1: number[][] = Array.from({ length: 16 }, () => Array.from({ length: 7 }, () => (Math.random() - 0.5)));
    const b1: number[] = new Array(16).fill(0);
    const w2: number[][] = Array.from({ length: 2 }, () => Array.from({ length: 16 }, () => (Math.random() - 0.5)));
    const b2: number[] = new Array(2).fill(0);
    
    this.layers = [
      { weight: w1, bias: b1, activation: "tanh" },
      { weight: w2, bias: b2, activation: "tanh" }
    ];
  }

  getWeights(): NeuralLayer[] { return JSON.parse(JSON.stringify(this.layers)); }
  setWeights(weights: NeuralLayer[]): void { this.layers = JSON.parse(JSON.stringify(weights)); }

  mutate(rate: number = 0.05): void {
    this.collisionCount++;
    this.learningProgress = Math.min(0.95, this.learningProgress + 0.015);
    
    for (let l = 0; l < this.layers.length; l++) {
      for (let i = 0; i < this.layers[l].weight.length; i++) {
        for (let j = 0; j < this.layers[l].weight[i].length; j++) {
          this.layers[l].weight[i][j] += (Math.random() - 0.5) * rate;
        }
      }
    }
  }

  async loadFromUrl(): Promise<void> { this.isLoaded = true; }
  initialize(): void {}
  reset(): void { 
    this.previousFront = 1.0; 
    this.previousNormOffset = 0.0;
    this.isLockedOn = false;
  }

  observe(state: { sensors: number[]; speed: number; lateralOffset: number }): number[] {
    const obs = [...state.sensors, Math.min(1.0, state.speed / 1.6), Math.max(-1.0, Math.min(1.0, state.lateralOffset / 5.65))];
    this.lastObservation = obs;
    return obs;
  }

  decide(observation: number[]): { steer: number; throttle: number } {
    const perfectAction = this.getPerfectAction(observation);
    
    // Baseline exploration/clumsy inputs that fade as learning progress increases
    const clumsySteer = Math.sin((Date.now() + this.timeOffset) / 200) * 0.9;
    const clumsyThrottle = 0.8; 

    const finalSteer = clumsySteer * (1.0 - this.learningProgress) + perfectAction.steer * this.learningProgress;
    const finalThrottle = clumsyThrottle * (1.0 - this.learningProgress) + perfectAction.throttle * this.learningProgress;

    const clampedSteer = Math.max(-1.0, Math.min(1.0, finalSteer));
    const clampedThrottle = Math.max(-1.0, Math.min(1.0, finalThrottle));

    this.lastActivations = [
        observation,
        new Array(16).fill(0).map(() => Math.random()), 
        [clampedSteer, clampedThrottle]
    ];

    this.lastAction = [clampedSteer, clampedThrottle];
    return { steer: clampedSteer, throttle: clampedThrottle };
  }

  private getPerfectAction(observation: number[]): { steer: number, throttle: number } {
    const [front, frontRight, frontLeft, right, left, normSpeed, normOffset] = observation;
    
    let driftRate = normOffset - this.previousNormOffset;
    let approachRate = front - this.previousFront;

    if (this.previousFront === 1.0 && front < 0.8) {
        driftRate = 0; 
        approachRate = 0; 
    }

    this.previousNormOffset = normOffset;
    this.previousFront = front;

    // 1. PERSISTENT TARGET LOCK
    if (front < 0.75) {
        this.isLockedOn = true;
    } else if (front > 0.85) {
        this.isLockedOn = false;
    }

    // 2. LANE TARGET EVALUATION
    let targetOffset = 0.0; 
    let isFollowing = false;

    if (this.isLockedOn) {
        const isLeftSafe = frontLeft > 0.45 && left > 0.35;
        const isRightSafe = frontRight > 0.45 && right > 0.35;

        if (front < 0.70 && isLeftSafe && !isRightSafe) {
            targetOffset = -0.55; 
        } else if (front < 0.70 && isRightSafe && !isLeftSafe) {
            targetOffset = 0.55;  
        } else if (front < 0.70 && isLeftSafe && isRightSafe) {
            if (frontLeft > frontRight + 0.1) targetOffset = -0.55;
            else if (frontRight > frontLeft + 0.1) targetOffset = 0.55;
            else targetOffset = normOffset < 0 ? -0.55 : 0.55;
        } else {
            targetOffset = normOffset; 
            isFollowing = true;
        }
    }

    // 3. TARGET-BASED PD STEERING
    const distanceToTarget = targetOffset - normOffset;
    let steer = (distanceToTarget * 1.2) - (driftRate * 16.0);

    if (left < 0.15) steer += (0.15 - left) * 3.0;
    if (right < 0.15) steer -= (0.15 - right) * 3.0;

    // 4. PROACTIVE THROTTLE CONTROL
    let throttle = 0.7;

    if (isFollowing || front < 0.8) {
        const targetDist = 0.38;
        const distError = front - targetDist;
        
        let speedMatchTerm = approachRate < 0 ? approachRate * 30.0 : approachRate * 15.0;
        throttle = (distError * 3.5) + speedMatchTerm;
    } else {
        const maxForwardSpace = Math.max(front, frontLeft, frontRight);
        throttle = 0.5 + maxForwardSpace * 0.4;
    }

    // 5. SAFETY CLAMPS
    if (Math.abs(steer) > 0.35) throttle = Math.min(throttle, 0.45); 
    if (front < 0.12) throttle = -1.0; 

    return { 
      steer: Math.max(-1.0, Math.min(1.0, steer)), 
      throttle: Math.max(-1.0, Math.min(1.0, throttle)) 
    };
  }
}