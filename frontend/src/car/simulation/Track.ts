import { PRNG } from "../../utils/prng";

export interface TrackWaypoint {
  x: number;
  z: number;
  tangentX: number;
  tangentZ: number;
  normalX: number;
  normalZ: number;
  distance: number;
}

export class Track {
  laneWidth: number = 3.5;
  numLanes: number = 3;
  trackWidth: number;
  straightLen: number;
  trackRadius: number;
  totalLength: number = 0;
  waypoints: TrackWaypoint[] = [];
  prng?: PRNG;

  constructor(straightLen: number = 70.0, trackRadius: number = 35.0, prng?: PRNG) {
    this.trackWidth = this.laneWidth * this.numLanes;
    this.straightLen = straightLen;
    this.trackRadius = trackRadius;
    this.prng = prng;
    
    if (this.prng && this.prng.range(0, 1) > 0.5) {
      this.generateOrganicRoad();
    } else {
      this.generateRoad();
    }
  }

  private generateOrganicRoad(): void {
    const points: { x: number; z: number }[] = [];
    const numPoints = 80;
    const baseRadius = this.trackRadius * 1.5;
    
    const numOffsets = 8;
    const offsets: number[] = [];
    for (let i = 0; i < numOffsets; i++) {
      offsets.push(this.prng!.range(-0.5, 0.5) * baseRadius);
    }
    
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      const angle = t * Math.PI * 2;
      
      const mapped = t * numOffsets;
      const idx1 = Math.floor(mapped) % numOffsets;
      const idx2 = (idx1 + 1) % numOffsets;
      const fract = mapped - Math.floor(mapped);
      
      // smoothstep interpolation
      const f = fract * fract * (3 - 2 * fract);
      const rOffset = offsets[idx1] * (1 - f) + offsets[idx2] * f;
      
      const r = baseRadius + rOffset;
      points.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
    }
    this.computeWaypoints(points);
  }

  private generateRoad(): void {
    const points: { x: number; z: number }[] = [];
    const halfStraight = this.straightLen / 2;
    const radius = this.trackRadius;

    // Generate points for a Stadium (Oval) track matching environment.py
    // Bottom straight (left to right)
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      points.push({ x: -halfStraight + t * this.straightLen, z: -radius });
    }
    // Right curve (bottom to top)
    for (let i = 1; i <= 25; i++) {
      const t = (i / 25) * Math.PI - Math.PI / 2;
      points.push({ x: halfStraight + Math.cos(t) * radius, z: Math.sin(t) * radius });
    }
    // Top straight (right to left)
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      points.push({ x: halfStraight - t * this.straightLen, z: radius });
    }
    // Left curve (top to bottom)
    for (let i = 1; i <= 25; i++) {
      const t = (i / 25) * Math.PI + Math.PI / 2;
      points.push({ x: -halfStraight + Math.cos(t) * radius, z: Math.sin(t) * radius });
    }
    this.computeWaypoints(points);
  }

  private computeWaypoints(points: { x: number; z: number }[]): void {

    // Compute tangents, normals, and cumulative distances
    this.waypoints = [];
    let cumDist = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const nextP = points[(i + 1) % points.length];
      const dx = nextP.x - p.x;
      const dz = nextP.z - p.z;
      const segLen = Math.hypot(dx, dz) || 1;

      const tanX = dx / segLen;
      const tanZ = dz / segLen;
      const normX = -tanZ;
      const normZ = tanX;

      this.waypoints.push({
        x: p.x,
        z: p.z,
        tangentX: tanX,
        tangentZ: tanZ,
        normalX: normX,
        normalZ: normZ,
        distance: cumDist,
      });
      cumDist += segLen;
    }
    
    this.totalLength = cumDist;
  }

  getClosestCenterline(x: number, z: number): {
    distAlongTrack: number;
    lateralOffset: number;
    tangentX: number;
    tangentZ: number;
    centerX: number;
    centerZ: number;
  } {
    let minDistSq = Infinity;
    let best: any = null;

    for (let i = 0; i < this.waypoints.length; i++) {
      const wp1 = this.waypoints[i];
      const wp2 = this.waypoints[(i + 1) % this.waypoints.length];
      
      const dx = wp2.x - wp1.x;
      const dz = wp2.z - wp1.z;
      const lenSq = dx * dx + dz * dz;
      
      let t = 0;
      if (lenSq > 0) {
        t = ((x - wp1.x) * dx + (z - wp1.z) * dz) / lenSq;
        t = Math.max(0, Math.min(1, t));
      }
      
      const cx = wp1.x + t * dx;
      const cz = wp1.z + t * dz;
      
      const distSq = (x - cx) * (x - cx) + (z - cz) * (z - cz);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        
        // Use cross product to determine left/right side for lateral offset
        const cross = dx * (z - wp1.z) - dz * (x - wp1.x);
        const sign = cross > 0 ? 1 : -1;
        const lateralOffset = Math.sqrt(distSq) * sign;
        
        const segLen = Math.sqrt(lenSq);
        let distAlongTrack = wp1.distance + t * segLen;
        
        best = {
          distAlongTrack,
          lateralOffset,
          tangentX: dx / segLen,
          tangentZ: dz / segLen,
          centerX: cx,
          centerZ: cz
        };
      }
    }
    
    return best!;
  }

  isOffRoad(x: number, z: number): boolean {
    const { lateralOffset } = this.getClosestCenterline(x, z);
    const halfWidth = this.trackWidth * 0.5 + 0.5;
    return Math.abs(lateralOffset) > halfWidth;
  }

  getLaneCenterOffset(laneIndex: number): number {
    return (laneIndex - 1) * this.laneWidth;
  }
}