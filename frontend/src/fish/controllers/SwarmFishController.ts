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
  description = "Emergent collective intelligence through local boid interaction rules and panic-wave evasion without a central coordinator.";

  perceptionRadius = 80;
  separationRadius = 30;
  sharkAvoidanceRadius = 150;

  // Starting weights per §8.4
  weightSeparation = 1.5;
  weightAlignment = 1.0;
  weightCohesion = 1.0;
  weightAvoidance = 2.5;

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
    return { heading: 0, speed: 50 }; // default
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
    let avoidX = 0, avoidY = 0;

    let sepCount = 0;
    let maxNeighborPanic = 0;

    // Local boids calculations
    if (neighbors.length > 0) {
      let avgPosX = 0, avgPosY = 0;
      let avgVelX = 0, avgVelY = 0;
      let totalSafetyWeight = 0;

      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        const dx = fish.x - n.x;
        const dy = fish.y - n.y;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2);

        // Separation: extremely strong anti-overlap force
        if (d < 45 && d > 1e-3) {
          sepX += (dx / d2) * 5.0; // High multiplier for strict separation
          sepY += (dy / d2) * 5.0;
          sepCount++;
        }

        // Safest Neighbor Weighting: Neighbors further from the shark have more influence
        const nDistToShark = Math.hypot(n.x - shark.x, n.y - shark.y);
        // Map distance to a safety multiplier (e.g. 1.0 for close, 5.0 for far)
        const safetyWeight = 1.0 + Math.max(0, (nDistToShark - 100) / 100);
        totalSafetyWeight += safetyWeight;

        // Alignment accumulator (weighted by safety)
        avgVelX += Math.cos(n.heading) * safetyWeight;
        avgVelY += Math.sin(n.heading) * safetyWeight;

        // Cohesion accumulator (weighted by safety)
        avgPosX += n.x * safetyWeight;
        avgPosY += n.y * safetyWeight;

        if (n.panicLevel > maxNeighborPanic) {
          maxNeighborPanic = n.panicLevel;
        }
      }

      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
      }

      if (totalSafetyWeight > 0) {
        // Alignment vector
        alignX = avgVelX / totalSafetyWeight;
        alignY = avgVelY / totalSafetyWeight;

        // Cohesion: average(neighborPos) - myPos
        cohX = avgPosX / totalSafetyWeight - fish.x;
        cohY = avgPosY / totalSafetyWeight - fish.y;
        const cohDist = Math.hypot(cohX, cohY);
        if (cohDist > 1e-3) {
          cohX /= cohDist;
          cohY /= cohDist;
        }
      }
    }

    // Shark Avoidance: (myPos - sharkPos) / distance² if shark within 150px
    if (obs.distToShark < this.sharkAvoidanceRadius && obs.distToShark > 1e-3) {
      const dx = fish.x - obs.sharkPos.x;
      const dy = fish.y - obs.sharkPos.y;
      const d2 = obs.distToShark * obs.distToShark;
      avoidX = (dx / d2) * 50; // scaled for force magnitude
      avoidY = (dy / d2) * 50;

      // Trigger high panic on direct threat
      fish.panicLevel = 1.0;
    } else if (maxNeighborPanic > 0.3) {
      // Panic wave propagation: neighbor panic spreads outwards!
      fish.panicLevel = Math.max(fish.panicLevel, maxNeighborPanic * 0.92);
    }

    // Boundary repulsion
    let boundX = 0, boundY = 0;
    const margin = 50;
    if (fish.x < margin) boundX += (margin - fish.x) / margin;
    if (fish.x > worldWidth - margin) boundX -= (fish.x - (worldWidth - margin)) / margin;
    if (fish.y < margin) boundY += (margin - fish.y) / margin;
    if (fish.y > worldHeight - margin) boundY -= (fish.y - (worldHeight - margin)) / margin;

    // Current forward vector
    let targetVx = Math.cos(fish.heading);
    let targetVy = Math.sin(fish.heading);

    // Sum all steering vectors with weights
    targetVx += sepX * this.weightSeparation;
    targetVy += sepY * this.weightSeparation;

    targetVx += alignX * this.weightAlignment;
    targetVy += alignY * this.weightAlignment;

    targetVx += cohX * this.weightCohesion;
    targetVy += cohY * this.weightCohesion;

    targetVx += avoidX * this.weightAvoidance;
    targetVy += avoidY * this.weightAvoidance;

    targetVx += boundX * 1.8;
    targetVy += boundY * 1.8;

    // Desired heading based on sum of forces
    const desiredHeading = Math.atan2(targetVy, targetVx);

    // Dynamic speed based on panic/avoidance
    let desiredSpeed = 40; // base px/s
    if (fish.panicLevel > 0.2) {
      desiredSpeed = 55 + fish.panicLevel * 25; // max 80 px/s
    }

    fish.steer(desiredHeading, desiredSpeed);
  }
}
