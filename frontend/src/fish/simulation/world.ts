import { Fish } from "./Fish";
import { Shark } from "./Shark";
import { SpatialGrid } from "./spatialGrid";
import { PRNG } from "../../utils/prng";
import { IntelligenceLevel } from "../../design-system/tokens";
import { RandomFishController } from "../controllers/RandomFishController";
import { RuleFishController } from "../controllers/RuleFishController";
import { SwarmFishController } from "../controllers/SwarmFishController";
import { PerfectFishController } from "../controllers/PerfectFishController";

export interface FishMetrics {
  totalFish: number;
  aliveFish: number;
  survivalRate: number;      // 0..100 %
  fishCaptured: number;
  elapsedSeconds: number;
  avgDistanceToShark: number;
  groupCohesionIndex: number; // mean nearest-3 distance
  escapeSuccessRate: number;  // %
  sharkState: string;
}

const PADDING   = 10;
const FISH_COUNT_DEFAULT = 220;

export class FishWorld {
  width: number;
  height: number;
  seed: number;
  prng: PRNG;
  speedMultiplier: number = 1.0;

  fishList: Fish[] = [];
  shark: Shark;
  grid: SpatialGrid<Fish>;

  level: IntelligenceLevel = 0;
  randomCtrl: RandomFishController;
  ruleCtrl:   RuleFishController;
  swarmCtrl:  SwarmFishController;
  perfectCtrl: PerfectFishController;

  ticks:              number = 0;
  totalAttacks:       number = 0;
  successfulEscapes:  number = 0;
  capturedCount:      number = 0;
  elapsedMs:          number = 0;

  constructor(width = 1000, height = 650, seed = 42, fishCount = FISH_COUNT_DEFAULT) {
    this.width  = width;
    this.height = height;
    this.seed   = seed;
    this.prng   = new PRNG(seed);
    this.grid   = new SpatialGrid<Fish>(160);

    this.randomCtrl = new RandomFishController();
    this.ruleCtrl   = new RuleFishController();
    this.swarmCtrl  = new SwarmFishController();
    this.perfectCtrl = new PerfectFishController();

    this.shark = new Shark(50, 50, 0);
    this.reset(seed, fishCount);
  }

  setLevel(level: IntelligenceLevel): void { this.level = level; }
  setSpeedMultiplier(v: number): void       { this.speedMultiplier = Math.max(0.25, Math.min(2.5, v)); }

  /** Resize world bounds live (called by canvas on resize). Re-clamps all agents. */
  resize(width: number, height: number): void {
    this.width  = width;
    this.height = height;
    // Hard-clamp all agents into new bounds immediately
    for (const f of this.fishList) {
      if (!f.isAlive) continue;
      f.x = Math.max(PADDING, Math.min(width  - PADDING, f.x));
      f.y = Math.max(PADDING, Math.min(height - PADDING, f.y));
    }
    this.shark.x = Math.max(PADDING, Math.min(width  - PADDING, this.shark.x));
    this.shark.y = Math.max(PADDING, Math.min(height - PADDING, this.shark.y));
  }

  reset(seed = this.seed, fishCount = FISH_COUNT_DEFAULT): void {
    this.seed = seed;
    this.prng = new PRNG(seed);
    const fishPRNG  = this.prng.subsystem(1);
    const sharkPRNG = this.prng.subsystem(2);

    this.ticks             = 0;
    this.capturedCount     = 0;
    this.totalAttacks      = 0;
    this.successfulEscapes = 0;
    this.elapsedMs         = 0;

    this.randomCtrl.reset(seed);
    this.ruleCtrl.reset(seed);
    this.swarmCtrl.reset();
    this.perfectCtrl.reset();

    this.shark = new Shark(
      sharkPRNG.range(40, 100),
      sharkPRNG.range(40, 100),
      sharkPRNG.range(-Math.PI, Math.PI)
    );

    this.fishList = [];
    for (let i = 0; i < fishCount; i++) {
      const x = fishPRNG.range(30, this.width - 30);
      const y = fishPRNG.range(30, this.height - 30);
      const heading = fishPRNG.range(0, Math.PI * 2);
      this.fishList.push(new Fish(i, x, y, heading, 60));
    }
    this.grid.rebuild(this.fishList);
  }

  tick(dtMs: number): FishMetrics {
    // Clamp dt so a tab-switch hitch can't teleport agents
    const dt = Math.min(dtMs / 1000, 0.05);
    this.ticks++;
    this.elapsedMs += dtMs;

    // 1. Rebuild spatial grid
    this.grid.rebuild(this.fishList);

    // 2. Track previous shark state for escape detection
    const prevState = this.shark.state;

    // 3. Update Shark
    const sharkPRNG = this.prng.subsystem(3);
    const { capturedFishId } = this.shark.update(
      this.width, this.height, this.fishList, sharkPRNG, dt, this.speedMultiplier
    );

    if (capturedFishId !== null) this.capturedCount++;

    if (prevState === "CHASE" && this.shark.state === "ATTACK") {
      this.totalAttacks++;
    } else if (prevState === "ATTACK" && this.shark.state === "COOLDOWN" && capturedFishId === null) {
      this.successfulEscapes++;
    }

    // 4. Update each fish via active controller, then physics
    for (const fish of this.fishList) {
      if (!fish.isAlive) continue;

      switch (this.level) {
        case 0:
          this.randomCtrl.applyToFish(fish, dt);
          break;
        case 1:
          this.ruleCtrl.applyToFish(fish, this.shark, this.grid, this.width, this.height, dt);
          break;
        case 2:
          this.swarmCtrl.applyToFish(fish, this.shark, this.grid, this.width, this.height, dt);
          break;
        case 3:
        default:
          this.perfectCtrl.applyToFish(fish, this.shark, this.grid, this.width, this.height, dt);
          break;
      }

      fish.updatePhysics(this.width, this.height, dt, this.speedMultiplier);
    }

    return this.getMetrics();
  }

  getMetrics(): FishMetrics {
    let alive = 0, totalDistShark = 0, totalCohesion = 0;

    for (const f of this.fishList) {
      if (!f.isAlive) continue;
      alive++;
      totalDistShark += Math.hypot(this.shark.x - f.x, this.shark.y - f.y);

      const neighbors = this.grid.queryNeighbors(f.x, f.y, 80, f.id);
      if (neighbors.length > 0) {
        const count = Math.min(3, neighbors.length);
        let sumDist = 0;
        for (let j = 0; j < count; j++) sumDist += Math.hypot(neighbors[j].x - f.x, neighbors[j].y - f.y);
        totalCohesion += sumDist / count;
      } else {
        totalCohesion += 80;
      }
    }

    const total       = this.fishList.length;
    const survivalRate = total > 0 ? (alive / total) * 100 : 0;
    const avgDist      = alive > 0 ? totalDistShark / alive : 0;
    const groupCohesion = alive > 0 ? totalCohesion / alive : 0;
    const escapeRate   = this.totalAttacks > 0 ? (this.successfulEscapes / this.totalAttacks) * 100 : 100;

    return {
      totalFish:          total,
      aliveFish:          alive,
      survivalRate,
      fishCaptured:       this.capturedCount,
      elapsedSeconds:     this.elapsedMs / 1000,
      avgDistanceToShark: Math.round(avgDist),
      groupCohesionIndex: Math.round(groupCohesion),
      escapeSuccessRate:  Math.round(escapeRate),
      sharkState:         this.shark.state,
    };
  }
}
