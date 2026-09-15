export class Fish {
  id: number;
  x: number;
  y: number;
  heading: number;      
  speed: number;        
  desiredHeading: number;
  desiredSpeed: number;
  isAlive: boolean = true;
  survivalTicks: number = 0;
  cachedNeighborCount: number = 0;
  activeRuleIndex: number = -1; 
  panicLevel: number = 0;       

  // ==========================================
  // ⚖️ THE GOLDILOCKS PHYSICS ⚖️
  // ==========================================
  static readonly MAX_TURN_RATE = 6.0;  // (Was 9.5) Snappy enough to dodge, but not instant teleportation
  static readonly ACCELERATION  = 250;  // (Was 400) Responsive, but requires a fraction of a second to spool up
  static readonly MIN_SPEED     =  40;  
  static readonly MAX_SPEED     =  85;  // (Was 130) Slower than the shark! You MUST dodge to survive.

  constructor(id: number, x: number, y: number, heading: number = 0, speed: number = 60) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.speed = speed;
    this.desiredHeading = heading;
    this.desiredSpeed   = speed;
  }

  steer(heading: number, speed: number): void {
    this.desiredHeading = heading;
    this.desiredSpeed   = Math.max(Fish.MIN_SPEED, Math.min(Fish.MAX_SPEED, speed));
  }

  updatePhysics(worldWidth: number, worldHeight: number, dt: number, speedMultiplier: number): void {
    if (!this.isAlive) return;
    this.survivalTicks++;

    let diff = this.desiredHeading - this.heading;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = Fish.MAX_TURN_RATE * dt;
    this.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));

    const targetSpeed = this.desiredSpeed * speedMultiplier;
    this.speed += (targetSpeed - this.speed) * Math.min(1, Fish.ACCELERATION * dt / Math.abs(targetSpeed - this.speed + 0.001));
    this.speed = Math.max(Fish.MIN_SPEED * speedMultiplier, Math.min(Fish.MAX_SPEED * speedMultiplier, this.speed));

    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;

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

    const pad = 8;
    this.x = Math.max(pad, Math.min(worldWidth  - pad, this.x));
    this.y = Math.max(pad, Math.min(worldHeight - pad, this.y));

    this.panicLevel = Math.max(0, this.panicLevel - 0.025);
  }
}
