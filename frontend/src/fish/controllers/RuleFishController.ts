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
  { id: 0, label: "Flee Shark", condition: "distToShark < 95px (Blind Spot: >45px if behind)", action: "Turn away from shark + panic error. Stalls if near walls." },
  { id: 1, label: "Avoid Walls", condition: "distToBoundary < 60px", action: "Turn towards world center" },
  { id: 2, label: "Keep Distance", condition: "nearestFish < 25px", action: "Separate from nearest fish" },
  { id: 3, label: "Wander Drift", condition: "Default fallback", action: "Maintain heading + high drift" },
];

export class RuleFishController implements Controller<RuleObservation, RuleAction> {
  id = "fish_l1_rules";
  label = "Rule-Based System";
  level = 1 as const;
  isLearned = false;
  description = "Fixed deterministic if-then priority rules. Predictable, rigid, and suffers from blind spots and corner stalling.";

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
    // Calculate if shark is in the fish's blind spot (directly behind)
    let angleDiff = obs.sharkAngle - fishCurrentHeading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const isBehind = Math.abs(angleDiff) > 2.4; // ~137 to 180 degrees is blind spot
    const blindSpotCutoff = 45; // Can only sense shark behind it if within 45px
    
    const sharkVisible = !(isBehind && obs.distToShark > blindSpotCutoff);

    // Rule 0: Flee Shark
    // NERF: Reduced range from 120 to 95. Added blind spot logic.
    if (obs.distToShark < 95 && sharkVisible) {
      // NERF: Add panic error to escape angle (no longer perfectly 180 degrees)
      const panicError = this.prng.range(-0.4, 0.4);
      const awayFromShark = obs.sharkAngle + Math.PI + panicError;
      
      // NERF: Corner Trapping. If fleeing but near a wall, the rigid system panics and stalls.
      let fleeSpeed = 75; // Slightly reduced base flee speed from 80 to 75
      let fleeHeading = awayFromShark;
      
      if (obs.distToBoundary < 40) {
        // Stalls against the wall and turns erratically, making it easy prey
        fleeSpeed = 30; 
        fleeHeading += this.prng.range(-1.5, 1.5);
      }

      return {
        newHeading: fleeHeading,
        speed: fleeSpeed,
        ruleIndex: 0,
      };
    }

    // If shark is in blind spot, Rule 0 fails. Fish falls through to lower priority rules,
    // meaning it might just wander directly into the shark's mouth.

    // Rule 1: Avoid Walls
    if (obs.distToBoundary < 60) {
      const toCenter = Math.atan2(obs.centerY - obs.fishY, obs.centerX - obs.fishX);
      return {
        newHeading: toCenter,
        speed: 50, // Reduced from 55
        ruleIndex: 1,
      };
    }

    // Rule 2: Keep Distance
    if (obs.nearestNeighborDist < 25) {
      const awayFromFish = obs.nearestNeighborAngle + Math.PI;
      return {
        newHeading: awayFromFish,
        speed: 45, // Reduced from 50
        ruleIndex: 2,
      };
    }

    // Rule 3: Wander Drift
    // NERF: Increased drift significantly, making it wander erratically into danger
    const drift = this.prng.range(-1.2, 1.2); 
    return {
      newHeading: fishCurrentHeading + drift,
      speed: 35, // Reduced from 42
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