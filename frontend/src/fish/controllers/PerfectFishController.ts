import { Controller } from "../../controllers/types";
import { Fish } from "../simulation/Fish";
import { Shark } from "../simulation/Shark";
import { SpatialGrid } from "../simulation/spatialGrid";

export interface PerfectObservation {
  neighbors: Fish[];
  distToShark: number;
  sharkPos: { x: number; y: number };
  sharkHeading: number;
  sharkSpeed: number;
}

export class PerfectFishController implements Controller<PerfectObservation, { heading: number; speed: number }> {
  id = "fish_l3_perfect";
  label = "Perfect Evasion AI";
  level = 3 as const;
  isLearned = false;
  description = "Mathematically untouchable. Features predictive evasion and dynamic wall-sliding mechanics.";

  perceptionRadius = 130; 
  separationRadius = 45; 

  initialize(): void {}
  reset(): void {}

  observe(state: { fish: Fish; shark: Shark; grid: SpatialGrid<Fish> }): PerfectObservation {
    const { fish, shark, grid } = state;
    const neighbors = grid.queryNeighbors(fish.x, fish.y, this.perceptionRadius, fish.id);
    const distToShark = Math.hypot(shark.x - fish.x, shark.y - fish.y);
    return {
      neighbors,
      distToShark,
      sharkPos: { x: shark.x, y: shark.y },
      sharkHeading: shark.heading,
      sharkSpeed: shark.speed
    };
  }

  decide(): { heading: number; speed: number } {
    return { heading: 0, speed: 50 }; 
  }

  applyToFish(
    fish: Fish,
    shark: Shark,
    grid: SpatialGrid<Fish>,
    worldWidth: number,
    worldHeight: number,
    dt: number
  ): void {
    const obs = this.observe({ fish, shark, grid });
    const neighbors = obs.neighbors.filter((n) => n.isAlive);
    fish.cachedNeighborCount = neighbors.length;

    let targetVx = 0;
    let targetVy = 0;
    let desiredSpeed = 45; 
    let activePanic = 0;

    // ==========================================
    // 1. STRICT SEPARATION (Normalized)
    // ==========================================
    let sepX = 0, sepY = 0;
    if (neighbors.length > 0) {
      for (const n of neighbors) {
        const dx = fish.x - n.x;
        const dy = fish.y - n.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001 && dist < this.separationRadius) {
          const pushStrength = (this.separationRadius - dist) / this.separationRadius;
          sepX += (dx / dist) * pushStrength;
          sepY += (dy / dist) * pushStrength;
        }
      }
      let sepMag = Math.hypot(sepX, sepY);
      if (sepMag > 0) { sepX /= sepMag; sepY /= sepMag; }
    }

    // ==========================================
    // 2. WALL REPULSION (Normalized)
    // ==========================================
    const MARGIN = 80;
    let wallPushX = 0;
    let wallPushY = 0;
    
    if (fish.x < MARGIN) wallPushX += (MARGIN - fish.x) / MARGIN;
    if (fish.x > worldWidth - MARGIN) wallPushX -= (fish.x - (worldWidth - MARGIN)) / MARGIN;
    if (fish.y < MARGIN) wallPushY += (MARGIN - fish.y) / MARGIN;
    if (fish.y > worldHeight - MARGIN) wallPushY -= (fish.y - (worldHeight - MARGIN)) / MARGIN;

    let wallMag = Math.hypot(wallPushX, wallPushY);
    if (wallMag > 0) { wallPushX /= wallMag; wallPushY /= wallMag; }
    const isNearWall = wallMag > 0;

    // ==========================================
    // 3. SHARK EVASION & PREDICTION
    // ==========================================
    if (obs.distToShark < 250 && obs.distToShark > 0.1) {
      activePanic = 1.0;
      desiredSpeed = 85; 

      // Direct flee vector (Prioritized to ensure forward momentum)
      const awaySharkX = fish.x - obs.sharkPos.x;
      const awaySharkY = fish.y - obs.sharkPos.y;
      const dShark = Math.max(0.1, obs.distToShark);
      const dirSharkX = awaySharkX / dShark;
      const dirSharkY = awaySharkY / dShark;

      // Predictive future interception vector
      const sharkVx = Math.cos(obs.sharkHeading) * obs.sharkSpeed;
      const sharkVy = Math.sin(obs.sharkHeading) * obs.sharkSpeed;
      const futureSharkX = obs.sharkPos.x + sharkVx * 0.5; 
      const futureSharkY = obs.sharkPos.y + sharkVy * 0.5;
      
      const evadeFutureX = fish.x - futureSharkX;
      const evadeFutureY = fish.y - futureSharkY;
      const evadeDist = Math.hypot(evadeFutureX, evadeFutureY);
      const evadeDirX = evadeDist > 0.001 ? evadeFutureX / evadeDist : dirSharkX;
      const evadeDirY = evadeDist > 0.001 ? evadeFutureY / evadeDist : dirSharkY;

      // Blend direct flee (high weight) with predictive evade (low weight)
      targetVx = (dirSharkX * 3.0) + (evadeDirX * 1.0);
      targetVy = (dirSharkY * 3.0) + (evadeDirY * 1.0);

      // FIX: CORNER ESCAPE LOGIC. Slide along walls instead of crashing into them.
      if (isNearWall) {
        let tangentX = -wallPushY;
        let tangentY = wallPushX;
        // Ensure tangent points away from the shark, not towards it
        if ((tangentX * dirSharkX + tangentY * dirSharkY) < 0) {
          tangentX = -tangentX;
          tangentY = -tangentY;
        }
        // Apply strong tangent force to escape corner, gentle push to stay off wall
        targetVx += (tangentX * 2.0) + (wallPushX * 1.0);
        targetVy += (tangentY * 2.0) + (wallPushY * 1.0);
      }

      // Add separation (small weight to avoid clumping, but not enough to brake)
      targetVx += sepX * 0.5;
      targetVy += sepY * 0.5;

      // FIX: Normalize final vector to guarantee max speed efficiency
      let targetMag = Math.hypot(targetVx, targetVy);
      if (targetMag > 0) {
        targetVx /= targetMag;
        targetVy /= targetMag;
      }
    } 
    // ==========================================
    // 4. BASELINE SWARMING (When Safe)
    // ==========================================
    else {
      let alignX = 0, alignY = 0;
      let cohX = 0, cohY = 0; 
      let centerOfMassX = 0, centerOfMassY = 0;

      if (neighbors.length > 0) {
        for (const n of neighbors) {
          alignX += Math.cos(n.heading);
          alignY += Math.sin(n.heading);
          centerOfMassX += n.x;
          centerOfMassY += n.y;
        }
        let alignDist = Math.hypot(alignX, alignY);
        if (alignDist > 0) { alignX /= alignDist; alignY /= alignDist; }

        centerOfMassX /= neighbors.length;
        centerOfMassY /= neighbors.length;
        cohX = centerOfMassX - fish.x;
        cohY = centerOfMassY - fish.y;
        let cohDist = Math.hypot(cohX, cohY);
        if (cohDist > 0) { cohX /= cohDist; cohY /= cohDist; }
      }

      // High momentum to prevent jitter
      targetVx = Math.cos(fish.heading) * 1.5;
      targetVy = Math.sin(fish.heading) * 1.5;

      targetVx += sepX * 1.5;
      targetVy += sepY * 1.5;
      targetVx += alignX * 1.0;
      targetVy += alignY * 1.0;
      targetVx += cohX * 0.8;
      targetVy += cohY * 0.8;
      
      targetVx += wallPushX * 3.0;
      targetVy += wallPushY * 3.0;
    }

    const desiredHeading = Math.atan2(targetVy, targetVx);
    fish.steer(desiredHeading, desiredSpeed);
    fish.panicLevel = activePanic;
  }
}