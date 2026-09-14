export class Fish {
  id: number;
  x: number;
  y: number;
  heading: number;      // radians
  speed: number;        // px/s
  desiredHeading: number;
  desiredSpeed: number;
  isAlive: boolean = true;
  survivalTicks: number = 0;
  cachedNeighborCount: number = 0;
  activeRuleIndex: number = -1; // 0: shark avoid, 1: boundary avoid, 2: separation, 3: wander
  panicLevel: number = 0;       // 0..1 for panic-wave visualiser

  // Physics constants (px/s units, tuned for real dt)
  static readonly MAX_TURN_RATE = 4.5; // rad/s
  static readonly ACCELERATION   = 180; // px/s²
  static readonly MIN_SPEED      =  40; // px/s
  static readonly MAX_SPEED      =  80; // px/s

  constructor(id: number, x: number, y: number, heading: number = 0, speed: number = 60) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.speed = speed;
    this.desiredHeading = heading;
    this.desiredSpeed   = speed;
  }

  /** Called by controllers to request a heading + speed — actual physics applied in updatePhysics */
  steer(heading: number, speed: number): void {
    this.desiredHeading = heading;
    this.desiredSpeed   = Math.max(Fish.MIN_SPEED, Math.min(Fish.MAX_SPEED, speed));
  }

  updatePhysics(worldWidth: number, worldHeight: number, dt: number, speedMultiplier: number): void {
    if (!this.isAlive) return;
    this.survivalTicks++;

    // 1. Turn toward desired heading at capped rate
    let diff = this.desiredHeading - this.heading;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = Fish.MAX_TURN_RATE * dt;
    this.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));

    // 2. Accelerate toward desired speed
    const targetSpeed = this.desiredSpeed * speedMultiplier;
    this.speed += (targetSpeed - this.speed) * Math.min(1, Fish.ACCELERATION * dt / Math.abs(targetSpeed - this.speed + 0.001));
    this.speed = Math.max(Fish.MIN_SPEED * speedMultiplier, Math.min(Fish.MAX_SPEED * speedMultiplier, this.speed));

    // 3. Integrate position
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;

    // 4. Soft boundary steering (before hard clamp)
    const margin = 60;
    const cx = worldWidth  * 0.5;
    const cy = worldHeight * 0.5;
    if (this.x < margin || this.x > worldWidth - margin || this.y < margin || this.y > worldHeight - margin) {
      const toCenter = Math.atan2(cy - this.y, cx - this.x);
      let d2 = toCenter - this.heading;
      while (d2 >  Math.PI) d2 -= Math.PI * 2;
      while (d2 < -Math.PI) d2 += Math.PI * 2;
      
      const turnAmt = d2 * 4.0 * dt; 
      const maxTurnBoundary = Fish.MAX_TURN_RATE * dt;
      this.heading += Math.max(-maxTurnBoundary, Math.min(maxTurnBoundary, turnAmt));
    }

    // 5. Hard clamp — absolute safety net
    const pad = 8;
    this.x = Math.max(pad, Math.min(worldWidth  - pad, this.x));
    this.y = Math.max(pad, Math.min(worldHeight - pad, this.y));

    // 6. Decay panic wave
    this.panicLevel = Math.max(0, this.panicLevel - 0.025);
  }
}
