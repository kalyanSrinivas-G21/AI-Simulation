import { Track } from "./Track";

export class Car {
  x: number = 0;
  z: number = 0;
  heading: number = 0;
  speed: number = 0.0;
  steering: number = 0;

  minSpeed: number = 0.0;
  maxSpeed: number = 1.6; // Matched Python environment
  wheelbase: number = 2.6;

  isCrashed: boolean = false;
  isOffRoad: boolean = false;
  ticks: number = 0;
  distanceTravelled: number = 0;
  crashCount: number = 0;
  timeToFirstCrash: number | null = null;
  speedSum: number = 0;
  lateralOffsets: number[] = [];
  activeRuleIndex: number = -1;

  constructor(x: number = 0, z: number = 0, heading: number = 0) {
    this.reset(x, z, heading);
  }

  reset(x: number = 0, z: number = 0, heading: number = 0): void {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0.6; // Python start speed
    this.steering = 0;
    this.isCrashed = false;
    this.isOffRoad = false;
    this.ticks = 0;
    this.distanceTravelled = 0;
    this.crashCount = 0;
    this.timeToFirstCrash = null;
    this.speedSum = 0;
    this.lateralOffsets = [];
    this.activeRuleIndex = -1;
  }

  updatePhysics(throttle: number, steerInput: number, track: Track, dt: number, speedMultiplier: number): void {
    if (this.isCrashed) return; // Stop physics if crashed

    this.ticks++;

    // Match Python: instant steering, max 0.45 rad
    this.steering = Math.max(-1.0, Math.min(1.0, steerInput)) * 0.45;

    // Match Python physics
    const accel = throttle * 0.035;
    this.speed = Math.max(0.0, Math.min(this.maxSpeed * speedMultiplier, this.speed + accel)) * 0.995;

    // Python heading update (not multiplied by dt)
    const deltaHeading = (this.speed / this.wheelbase) * Math.sin(this.steering);
    this.heading += deltaHeading;

    this.x += Math.cos(this.heading) * this.speed * dt * 60; // scale by dt and 60 to match python step
    this.z += Math.sin(this.heading) * this.speed * dt * 60;

    const stepDist = this.speed * dt * 60;
    this.distanceTravelled += stepDist;
    this.speedSum += this.speed;

    const { lateralOffset } = track.getClosestCenterline(this.x, this.z);
    this.lateralOffsets.push(lateralOffset);
    if (this.lateralOffsets.length > 300) this.lateralOffsets.shift();

    if (track.isOffRoad(this.x, this.z)) {
      this.registerCrash(this.ticks * 16.6);
    }
  }

  registerCrash(elapsedMs: number): void {
    this.crashCount++;
    if (this.timeToFirstCrash === null) {
      this.timeToFirstCrash = Math.round(elapsedMs / 1000);
    }
    this.isCrashed = true;
  }

  getLaneVariance(): number {
    if (this.lateralOffsets.length === 0) return 0;
    const mean = this.lateralOffsets.reduce((a, b) => a + b, 0) / this.lateralOffsets.length;
    const variance = this.lateralOffsets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.lateralOffsets.length;
    return parseFloat(variance.toFixed(2));
  }

  getAverageSpeed(): number {
    return this.ticks > 0 ? parseFloat((this.speedSum / this.ticks).toFixed(2)) : 0;
  }
}