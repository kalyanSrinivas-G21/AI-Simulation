import { Controller } from "../../controllers/types";
import { Fish } from "../simulation/Fish";
import { Shark } from "../simulation/Shark";
import { SpatialGrid } from "../simulation/spatialGrid";
import { PRNG } from "../../utils/prng";

export interface RuleObservation {
  distToShark: number;
  sharkAngle: number;
  distToBoundary: number;
  nearestNeighborDist: number;
  nearestNeighborAngle: number;
  centerX: number;
  centerY: number;
  fishX: number;
  fishY: number;
}

export interface RuleAction {
  newHeading: number;
  speed: number;
  ruleIndex: number; // 0, 1, 2, 3
}

export const FISH_RULES = [
  { id: 0, label: "Flee Shark", condition: "distToShark < 120px", action: "Turn away from shark, max speed" },
  { id: 1, label: "Avoid Walls", condition: "distToBoundary < 60px", action: "Turn towards world center" },
  { id: 2, label: "Keep Distance", condition: "nearestFish < 25px", action: "Separate from nearest fish" },
  { id: 3, label: "Wander Drift", condition: "Default fallback", action: "Maintain heading + small drift" },
];

export class RuleFishController implements Controller<RuleObservation, RuleAction> {
  id = "fish_l1_rules";
  label = "Rule-Based System";
  level = 1 as const;
  isLearned = false;
  description = "Fixed deterministic if-then priority rules. Predictable and rigid under changing environments.";

  private prng: PRNG = new PRNG(1337);

  initialize(): void {}

  reset(seed: number = 1337): void {
    this.prng = new PRNG(seed);
  }

  observe(state: {
    fish: Fish;
    shark: Shark;
    grid: SpatialGrid<Fish>;
    worldWidth: number;
    worldHeight: number;
  }): RuleObservation {
    const { fish, shark, grid, worldWidth, worldHeight } = state;

    // Dist to shark
    const dxShark = shark.x - fish.x;
    const dyShark = shark.y - fish.y;
    const distToShark = Math.hypot(dxShark, dyShark);
    const sharkAngle = Math.atan2(dyShark, dxShark);

    // Dist to boundary
    const distToBoundary = Math.min(
      fish.x,
      worldWidth - fish.x,
      fish.y,
      worldHeight - fish.y
    );

    // Nearest neighbor
    const neighbors = grid.queryNeighbors(fish.x, fish.y, 35, fish.id);
    let nearestNeighborDist = Infinity;
    let nearestNeighborAngle = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      if (!n.isAlive) continue;
      const d = Math.hypot(n.x - fish.x, n.y - fish.y);
      if (d < nearestNeighborDist) {
        nearestNeighborDist = d;
        nearestNeighborAngle = Math.atan2(n.y - fish.y, n.x - fish.x);
      }
    }

    return {
      distToShark,
      sharkAngle,
      distToBoundary,
      nearestNeighborDist,
      nearestNeighborAngle,
      centerX: worldWidth * 0.5,
      centerY: worldHeight * 0.5,
      fishX: fish.x,
      fishY: fish.y,
    };
  }

  decide(obs: RuleObservation, fishCurrentHeading: number = 0): RuleAction {
    // Rule 0: if distanceToShark < 120px: turn directly away from shark, speed = maxSpeed
    if (obs.distToShark < 120) {
      const awayFromShark = obs.sharkAngle + Math.PI;
      return {
        newHeading: awayFromShark,
        speed: 80, // px/s
        ruleIndex: 0,
      };
    }

    // Rule 1: else if distanceToBoundary < 60px: turn toward world center
    if (obs.distToBoundary < 60) {
      // heading towards center (from the fish's position)
      const toCenter = Math.atan2(obs.centerY - obs.fishY, obs.centerX - obs.fishX);
      return {
        newHeading: toCenter,
        speed: 55, // px/s
        ruleIndex: 1,
      };
    }

    // Rule 2: else if nearestFishDistance < 25px: turn away from that fish (separation only)
    if (obs.nearestNeighborDist < 25) {
      const awayFromFish = obs.nearestNeighborAngle + Math.PI;
      return {
        newHeading: awayFromFish,
        speed: 50, // px/s
        ruleIndex: 2,
      };
    }

    // Rule 3: else: continue on current heading with small random drift
    const drift = this.prng.range(-0.6, 0.6); // increased slightly for dt
    return {
      newHeading: fishCurrentHeading + drift,
      speed: 42, // px/s
      ruleIndex: 3,
    };
  }

  applyToFish(
    fish: Fish,
    shark: Shark,
    grid: SpatialGrid<Fish>,
    worldWidth: number,
    worldHeight: number,
    dt: number
  ): void {
    const obs = this.observe({ fish, shark, grid, worldWidth, worldHeight });
    const action = this.decide(obs, fish.heading);
    fish.steer(action.newHeading, action.speed);
    fish.activeRuleIndex = action.ruleIndex;
  }
}
