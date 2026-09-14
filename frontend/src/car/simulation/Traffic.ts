import { Track } from "./Track";
import { PRNG } from "../../utils/prng";

export interface TrafficCar {
  id: number;
  lane: number; // 0: left, 1: center, 2: right
  targetLane: number;
  currentOffset: number;
  distAlongTrack: number;
  speed: number;
  x: number;
  z: number;
  heading: number;
  color: string;
}

export class TrafficSim {
  cars: TrafficCar[] = [];
  track: Track;
  prng: PRNG;
  laneChangeCooldown: number = 0;

  private colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

  constructor(track: Track, prng: PRNG, numCars: number = 7) {
    this.track = track;
    this.prng = prng;
    this.initCars(numCars);
  }

  private initCars(numCars: number): void {
    this.cars = [];
    const spacing = 100; // units

    for (let i = 0; i < numCars; i++) {
      const lane = i % 3;
      const dist = 120 + i * spacing; // Spawn further away so they aren't on top of player
      // Match the fast timescale. Car speed is 96 units/sec. NPCs should be 30-50 units/sec.
      const speed = this.prng.range(30.0, 50.0); 
      const targetOffset = (lane - 1) * this.track.laneWidth;

      this.cars.push({
        id: i,
        lane,
        targetLane: lane,
        currentOffset: targetOffset,
        distAlongTrack: dist,
        speed,
        x: 0,
        z: 0,
        heading: 0,
        color: this.colors[i % this.colors.length],
      });
    }

    this.updatePositions();
  }

  reset(seed: number = 42, numCars: number = 7): void {
    this.prng = new PRNG(seed);
    this.laneChangeCooldown = 0;
    this.initCars(numCars);
  }

  wrapAround(amount: number): void {
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].distAlongTrack -= amount;
      // If car went backwards before 0, respawn it ahead
      if (this.cars[i].distAlongTrack < 0) {
        this.cars[i].distAlongTrack += this.track.totalLength - 300; 
        this.cars[i].speed = this.prng.range(6.0, 9.0);
      }
    }
    this.updatePositions();
  }

  update(dtMultiplier: number): void {
    // Treat dtMultiplier as the actual step amount (dt * speedMultiplier)
    this.laneChangeCooldown += dtMultiplier;

    // Occasional lane shift per §9 (~every 4 seconds)
    if (this.laneChangeCooldown > 4.0) {
      this.laneChangeCooldown = 0;
      const carToShift = this.cars[this.prng.rangeInt(0, this.cars.length - 1)];
      const targetLane = this.prng.rangeInt(0, 2);
      carToShift.targetLane = targetLane;
    }

    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      // Progress along track
      c.distAlongTrack += c.speed * dtMultiplier;
      
      // Keep within track bounds to prevent teleporting to 0 and getting stuck
      c.distAlongTrack = c.distAlongTrack % this.track.totalLength;

      // Smooth lane transition
      const targetOffset = (c.targetLane - 1) * this.track.laneWidth;
      c.currentOffset += (targetOffset - c.currentOffset) * Math.min(1.0, 2.0 * dtMultiplier);
    }

    this.updatePositions();
  }

  private updatePositions(): void {
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];

      // Find waypoint for distance
      // Optimization: use approximation since waypoints are spaced regularly
      const numWp = this.track.waypoints.length;
      const approxIndex = Math.floor((c.distAlongTrack / this.track.totalLength) * numWp);
      const searchStart = Math.max(0, approxIndex - 50);
      const searchEnd = Math.min(numWp - 1, approxIndex + 50);

      let wpIdx = 0;
      for (let w = searchStart; w <= searchEnd; w++) {
        if (this.track.waypoints[w].distance > c.distAlongTrack) {
          wpIdx = w > 0 ? w - 1 : 0;
          break;
        }
      }

      const wp = this.track.waypoints[wpIdx];
      // Car position = waypoint + lateral normal * currentOffset
      if (wp) {
        c.x = wp.x + wp.normalX * c.currentOffset;
        c.z = wp.z + wp.normalZ * c.currentOffset;
        c.heading = Math.atan2(wp.tangentZ, wp.tangentX);
      }
    }
  }

  getObstacles(): { x: number; z: number; radius: number }[] {
    return this.cars.map((c) => ({
      x: c.x,
      z: c.z,
      radius: 2.2, // collision / bounding radius
    }));
  }
}
