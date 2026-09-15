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
  heading: number;
  width: number;
  length: number;
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

      // FIX CAUSE 4: Increased steps from 20 to 100 for hyper-accurate 0.4 unit precision
      const numSteps = 100;
      const stepSize = maxRange / numSteps;

      for (let s = 1; s <= numSteps; s++) {
        const testX = carX + rayDirX * (s * stepSize);
        const testZ = carZ + rayDirZ * (s * stepSize);

        if (track.isOffRoad(testX, testZ)) {
          closestDistance = s * stepSize;
          break;
        }
      }

      for (let o = 0; o < obstacles.length; o++) {
        const obs = obstacles[o];
        const dx = obs.x - carX;
        const dz = obs.z - carZ;
        const distSq = dx * dx + dz * dz;
        if (distSq > (maxRange + obs.radius) * (maxRange + obs.radius)) continue;

        const cosH = Math.cos(-obs.heading);
        const sinH = Math.sin(-obs.heading);

        const localOriginX = dx * cosH - dz * sinH;
        const localOriginZ = dx * sinH + dz * cosH;

        const localDirX = rayDirX * cosH - rayDirZ * sinH;
        const localDirZ = rayDirX * sinH + rayDirZ * cosH;

        const halfWidth = obs.width / 2;
        const halfLength = obs.length / 2;

        let tMin = 0;
        let tMax = maxRange;

        if (Math.abs(localDirX) < 0.0001) {
            if (-localOriginX < -halfWidth || -localOriginX > halfWidth) continue;
        } else {
            const ood = 1.0 / localDirX;
            let t1 = (-halfWidth - -localOriginX) * ood;
            let t2 = (halfWidth - -localOriginX) * ood;
            if (t1 > t2) { const temp = t1; t1 = t2; t2 = temp; }
            tMin = Math.max(tMin, t1);
            tMax = Math.min(tMax, t2);
            if (tMin > tMax) continue;
        }

        if (Math.abs(localDirZ) < 0.0001) {
            if (-localOriginZ < -halfLength || -localOriginZ > halfLength) continue;
        } else {
            const ood = 1.0 / localDirZ;
            let t1 = (-halfLength - -localOriginZ) * ood;
            let t2 = (halfLength - -localOriginZ) * ood;
            if (t1 > t2) { const temp = t1; t1 = t2; t2 = temp; }
            tMin = Math.max(tMin, t1);
            tMax = Math.min(tMax, t2);
            if (tMin > tMax) continue;
        }

        if (tMin > 0 && tMin < closestDistance) {
            closestDistance = tMin;
        }
      }

      const normReading = Math.max(0.0, Math.min(1.0, closestDistance / maxRange));
      readings.push(normReading);
    }

    return readings;
  }
}