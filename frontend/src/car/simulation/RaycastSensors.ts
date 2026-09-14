import { Track } from "./Track";

export interface RaySensorConfig {
  angleOffsetRad: number;
  maxRange: number;
}

export const SENSOR_CONFIGS: RaySensorConfig[] = [
  { angleOffsetRad: 0, maxRange: 40 },
  { angleOffsetRad: Math.PI / 6, maxRange: 30 },
  { angleOffsetRad: -Math.PI / 6, maxRange: 30 },
  { angleOffsetRad: Math.PI / 2, maxRange: 15 },
  { angleOffsetRad: -Math.PI / 2, maxRange: 15 },
];

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

export class RaycastSensors {
  static computeReadings(
    carX: number,
    carZ: number,
    carHeading: number,
    track: Track,
    obstacles: Obstacle[]
  ): number[] {
    const readings: number[] = [];

    for (let i = 0; i < SENSOR_CONFIGS.length; i++) {
      const { angleOffsetRad, maxRange } = SENSOR_CONFIGS[i];
      const rayAngle = carHeading + angleOffsetRad;
      const rayDirX = Math.cos(rayAngle);
      const rayDirZ = Math.sin(rayAngle);

      let closestDistance = maxRange;

      // 1. Raymarch against track boundaries
      const numSteps = 20;
      const stepSize = maxRange / numSteps;

      for (let s = 1; s <= numSteps; s++) {
        const testX = carX + rayDirX * (s * stepSize);
        const testZ = carZ + rayDirZ * (s * stepSize);

        if (track.isOffRoad(testX, testZ)) {
          closestDistance = s * stepSize;
          break;
        }
      }

      // 2. Ray-circle intersection against dynamic obstacles (NPC cars)
      for (let o = 0; o < obstacles.length; o++) {
        const obs = obstacles[o];
        const toObsX = obs.x - carX;
        const toObsZ = obs.z - carZ;

        const proj = toObsX * rayDirX + toObsZ * rayDirZ;
        if (proj > 0 && proj < closestDistance) {
          const perpDistSq = toObsX * toObsX + toObsZ * toObsZ - proj * proj;
          if (perpDistSq < obs.radius * obs.radius) {
            const halfChord = Math.sqrt(Math.max(0, obs.radius * obs.radius - perpDistSq));
            const hitDist = proj - halfChord;
            if (hitDist > 0 && hitDist < closestDistance) {
              closestDistance = hitDist;
            }
          }
        }
      }

      const normReading = Math.max(0.0, Math.min(1.0, closestDistance / maxRange));
      readings.push(normReading);
    }

    return readings;
  }
}