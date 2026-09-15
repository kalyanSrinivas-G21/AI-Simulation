import { Track } from "./Track";
import { PRNG } from "../../utils/prng";

export interface TrafficCar {
  id: number;
  lane: number; 
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

  // Enforce traffic limits
  public static readonly MIN_CARS = 3;
  public static readonly MAX_CARS = 12;

  private colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

  constructor(track: Track, prng: PRNG, numCars: number = 7) {
    this.track = track;
    this.prng = prng;
    this.initCars(numCars);
  }

  private initCars(requestedNumCars: number): void {
    this.cars = [];
    
    // 1. Clamp to Limits
    const numCars = Math.max(TrafficSim.MIN_CARS, Math.min(TrafficSim.MAX_CARS, requestedNumCars));
    
    // 2. Smart Spawning: Calculate spacing based on track length so they never overlap
    const safeTrackLen = this.track.totalLength - 100; // Leave space near player start
    const spacing = Math.max(40, safeTrackLen / numCars);

    for (let i = 0; i < numCars; i++) {
      const lane = i % 3;
      const dist = 100 + i * spacing; 
      const speed = this.prng.range(25.0, 45.0); 
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
      if (this.cars[i].distAlongTrack < 0) {
        this.cars[i].distAlongTrack += this.track.totalLength - 300; 
        this.cars[i].speed = this.prng.range(25.0, 45.0);
      }
    }
    this.updatePositions();
  }

  update(dtMultiplier: number, mainCar?: { distAlongTrack: number, lateralOffset: number }): void {
    this.laneChangeCooldown += dtMultiplier;

    if (this.laneChangeCooldown > 4.0) {
      this.laneChangeCooldown = 0;
      const carToShift = this.cars[this.prng.rangeInt(0, this.cars.length - 1)];
      const targetLane = this.prng.rangeInt(0, 2);
      carToShift.targetLane = targetLane;
    }

    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      
      // Calculate intended new distance
      let nextDist = c.distAlongTrack + c.speed * dtMultiplier;
      
      // Prevent rear-ending the main car
      if (mainCar) {
        // Wrap around distance logic
        let distDiff = mainCar.distAlongTrack - c.distAlongTrack;
        if (distDiff < -this.track.totalLength / 2) distDiff += this.track.totalLength;
        if (distDiff > this.track.totalLength / 2) distDiff -= this.track.totalLength;
        
        // If NPC is behind main car (0 to 12 units) and in the same lane (lateral offset within 4 units)
        if (distDiff > 0 && distDiff < 15) {
          const lateralDiff = Math.abs(mainCar.lateralOffset - c.currentOffset);
          if (lateralDiff < 4.0) {
            // Hard clamp the NPC's distance to stay behind the main car
            nextDist = Math.min(nextDist, c.distAlongTrack + (distDiff - 6) * dtMultiplier);
            // Essentially matching speed or braking
          }
        }
      }

      if (nextDist < 0) nextDist += this.track.totalLength;
      c.distAlongTrack = nextDist % this.track.totalLength;

      const targetOffset = (c.targetLane - 1) * this.track.laneWidth;
      c.currentOffset += (targetOffset - c.currentOffset) * Math.min(1.0, 2.0 * dtMultiplier);
    }

    this.updatePositions();
  }

  private updatePositions(): void {
    const waypoints = this.track.waypoints;
    const numWp = waypoints.length;

    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];

      // 1. Find the exact two waypoints the car is currently between
      let wp1Idx = 0;
      for (let w = 0; w < numWp; w++) {
        if (waypoints[w].distance > c.distAlongTrack) {
          wp1Idx = w > 0 ? w - 1 : 0;
          break;
        }
      }
      
      const wp2Idx = (wp1Idx + 1) % numWp;
      const wp1 = waypoints[wp1Idx];
      const wp2 = waypoints[wp2Idx];

      // 2. Interpolate smoothly between them based on distance
      let distSegment = wp2.distance - wp1.distance;
      // Handle the wraparound point
      if (distSegment < 0) distSegment += this.track.totalLength; 
      
      let t = 0;
      if (distSegment > 0.0001) {
          let distInSegment = c.distAlongTrack - wp1.distance;
          if (distInSegment < 0) distInSegment += this.track.totalLength;
          t = distInSegment / distSegment;
      }

      // 3. Smooth Lerp Position & Normal
      const lerpX = wp1.x + (wp2.x - wp1.x) * t;
      const lerpZ = wp1.z + (wp2.z - wp1.z) * t;
      const normX = wp1.normalX + (wp2.normalX - wp1.normalX) * t;
      const normZ = wp1.normalZ + (wp2.normalZ - wp1.normalZ) * t;

      // 4. Apply Lateral Offset for lane changes
      c.x = lerpX + normX * c.currentOffset;
      c.z = lerpZ + normZ * c.currentOffset;
      
      // 5. Smooth Heading Interpolation
      const heading1 = Math.atan2(wp1.tangentZ, wp1.tangentX);
      const heading2 = Math.atan2(wp2.tangentZ, wp2.tangentX);
      
      // Shortest path angle interpolation
      let diff = heading2 - heading1;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      c.heading = heading1 + diff * t;
    }
  }

  // Export oriented bounding boxes instead of just circles
  getObstacles(): { x: number; z: number; heading: number; width: number; length: number; radius: number }[] {
    return this.cars.map((c) => ({
      x: c.x,
      z: c.z,
      heading: c.heading,
      width: 2.2,   // Widened to eliminate side blind spots
      length: 4.2,  // Lengthened to prevent rear-ending
      radius: 2.5,  
    }));
  }
}
