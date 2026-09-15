import { Controller } from "../../controllers/types";
import { Fish } from "../simulation/Fish";
import { Shark } from "../simulation/Shark";
import { SpatialGrid } from "../simulation/spatialGrid";

export interface SwarmObservation {
  neighbors: Fish[];
  distToShark: number;
  sharkPos: { x: number; y: number };
}

export class SwarmFishController implements Controller<SwarmObservation, { heading: number; speed: number }> {
  id = "fish_l2_swarm";
  label = "Reactive / Swarm (Boids)";
  level = 2 as const;
  isLearned = false;
  description = "Emergent collective intelligence through perfectly balanced local boid rules. Forms organic schools that scatter under threat.";

  perceptionRadius = 90; 
  separationRadius = 35; 

  weightSeparation = 4.5;
  weightAlignment = 1.2;
  weightCohesion = 0.8;
  weightAvoidance = 6.0;
  weightBoundary = 3.0;

  initialize(): void {}
  reset(): void {}

  observe(state: { fish: Fish; shark: Shark; grid: SpatialGrid<Fish> }): SwarmObservation {
    const { fish, shark, grid } = state;
    const neighbors = grid.queryNeighbors(fish.x, fish.y, this.perceptionRadius, fish.id);
    const distToShark = Math.hypot(shark.x - fish.x, shark.y - fish.y);
    return {
      neighbors,
      distToShark,
      sharkPos: { x: shark.x, y: shark.y },
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

    let sepX = 0, sepY = 0;
    let alignX = 0, alignY = 0;
    let cohX = 0, cohY = 0; 
    let centerOfMassX = 0, centerOfMassY = 0;
    let maxNeighborPanic = 0;
    let sepCount = 0;

    // ==========================================
    // 1. EVALUATE NEIGHBORS (Normalized)
    // ==========================================
    if (neighbors.length > 0) {
      for (const n of neighbors) {
        const dx = fish.x - n.x;
        const dy = fish.y - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.001) {
          if (dist < this.separationRadius) {
            const pushStrength = (this.separationRadius - dist) / this.separationRadius;
            sepX += (dx / dist) * pushStrength;
            sepY += (dy / dist) * pushStrength;
            sepCount++;
          }
          alignX += Math.cos(n.heading);
          alignY += Math.sin(n.heading);
          centerOfMassX += n.x;
          centerOfMassY += n.y;
          if (n.panicLevel > maxNeighborPanic) maxNeighborPanic = n.panicLevel;
        }
      }

      // FIX: Normalize Separation to prevent dense-school overpowering
      let sepMag = Math.hypot(sepX, sepY);
      if (sepMag > 0) { sepX /= sepMag; sepY /= sepMag; }

      let alignMag = Math.hypot(alignX, alignY);
      if (alignMag > 0) { alignX /= alignMag; alignY /= alignMag; }

      centerOfMassX /= neighbors.length;
      centerOfMassY /= neighbors.length;
      cohX = centerOfMassX - fish.x;
      cohY = centerOfMassY - fish.y;
      let cohMag = Math.hypot(cohX, cohY);
      if (cohMag > 0) { cohX /= cohMag; cohY /= cohMag; }
    }

    // ==========================================
    // 2. PREDATOR AVOIDANCE & PANIC SPREAD
    // ==========================================
    let avoidX = 0, avoidY = 0;
    let panic = 0;
    if (obs.distToShark < 160 && obs.distToShark > 0.1) {
      panic = 1.0 - (obs.distToShark / 160);
      avoidX = (fish.x - obs.sharkPos.x) / obs.distToShark;
      avoidY = (fish.y - obs.sharkPos.y) / obs.distToShark;
      fish.panicLevel = panic; 
    } else {
      fish.panicLevel = Math.max(0, fish.panicLevel - 0.05); 
      if (maxNeighborPanic > 0.2) {
        fish.panicLevel = Math.max(fish.panicLevel, maxNeighborPanic * 0.85);
        panic = fish.panicLevel; // carry over slight panic
      }
    }

    // FIX: HARD PRIORITY FLEE. Drop everything and run straight if shark is close.
    if (obs.distToShark < 100 && obs.distToShark > 0.1) {
      const fleeAngle = Math.atan2(avoidY, avoidX);
      fish.steer(fleeAngle, 45 + (panic * 35));
      return;
    }

    // ==========================================
    // 3. BOUNDARY AVOIDANCE (Normalized)
    // ==========================================
    let boundX = 0, boundY = 0;
    const margin = 60;
    if (fish.x < margin) boundX = (margin - fish.x) / margin;
    if (fish.x > worldWidth - margin) boundX = -(fish.x - (worldWidth - margin)) / margin;
    if (fish.y < margin) boundY = (margin - fish.y) / margin;
    if (fish.y > worldHeight - margin) boundY = -(fish.y - (worldHeight - margin)) / margin;
    
    let boundMag = Math.hypot(boundX, boundY);
    if (boundMag > 0) { boundX /= boundMag; boundY /= boundMag; }

    // ==========================================
    // 4. VECTOR BLENDING & STEERING
    // ==========================================
    let targetVx = Math.cos(fish.heading) * 1.5; // Momentum prevents jitter-braking
    let targetVy = Math.sin(fish.heading) * 1.5;

    // FIX: Dynamic flock weights. Flocking turns off as panic rises.
    let flockWeight = 1.0 - Math.min(1.0, panic * 1.5);
    
    targetVx += sepX * this.weightSeparation * flockWeight;
    targetVy += sepY * this.weightSeparation * flockWeight;
    targetVx += alignX * this.weightAlignment * flockWeight;
    targetVy += alignY * this.weightAlignment * flockWeight;
    targetVx += cohX * this.weightCohesion * flockWeight;
    targetVy += cohY * this.weightCohesion * flockWeight;

    targetVx += avoidX * this.weightAvoidance * panic;
    targetVy += avoidY * this.weightAvoidance * panic;

    targetVx += boundX * this.weightBoundary;
    targetVy += boundY * this.weightBoundary;

    const desiredHeading = Math.atan2(targetVy, targetVx);

    let desiredSpeed = 45; 
    if (panic > 0.1) {
      desiredSpeed = 45 + (panic * 35); 
    }

    let angleDiff = desiredHeading - fish.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const turnLimit = panic > 0.3 ? 0.4 : 0.15; // Increased panic turn limit
    const finalHeading = fish.heading + Math.max(-turnLimit, Math.min(turnLimit, angleDiff));

    fish.steer(finalHeading, desiredSpeed);
  }
}