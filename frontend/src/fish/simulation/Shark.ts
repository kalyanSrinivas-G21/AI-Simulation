import { PRNG } from "../../utils/prng";
import { Fish } from "./Fish";

export type SharkState = "SEARCH" | "DETECT" | "SELECT_TARGET" | "CHASE" | "ATTACK" | "COOLDOWN";

export class Shark {
  x: number;
  y: number;
  heading: number;
  speed: number;        
  desiredHeading: number;
  state: SharkState = "SEARCH";
  currentTarget: Fish | null = null;
  cooldownTimer: number = 0;  
  attackTimer:   number = 0;  

  static readonly SEARCH_SPEED  =  80; 
  static readonly CHASE_SPEED   = 120; 
  static readonly ATTACK_SPEED  = 160; 
  static readonly COOLDOWN_SPEED =  60;

  static readonly SEARCH_TURN   = 1.5; 
  static readonly CHASE_TURN    = 2.5; 
  static readonly ATTACK_TURN   = 1.8; 

  detectionRadius: number = 320;
  attackRadius:    number = 50;
  captureRadius:   number = 16; 

  constructor(x: number, y: number, heading: number = 0) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.desiredHeading = heading;
    this.speed = Shark.SEARCH_SPEED;
  }

  update(
    worldWidth: number,
    worldHeight: number,
    fishList: Fish[],
    prng: PRNG,
    dt: number,
    speedMultiplier: number
  ): { capturedFishId: number | null } {
    let capturedFishId: number | null = null;
    let maxTurnRate = Shark.SEARCH_TURN;

    if (this.state === "COOLDOWN") {
      this.cooldownTimer -= dt;
      this.speed = Shark.COOLDOWN_SPEED * speedMultiplier;
      this.desiredHeading += prng.range(-0.5, 0.5) * dt;
      
      if (this.cooldownTimer <= 0) {
        this.state = "SEARCH";
        this.currentTarget = null;
      }
    } else if (this.state === "ATTACK") {
      this.attackTimer -= dt;
      this.speed = Shark.ATTACK_SPEED * speedMultiplier;
      maxTurnRate = Shark.ATTACK_TURN; 
      if (this.attackTimer <= 0) {
        this.state = "COOLDOWN";
        this.cooldownTimer = 1.25;
      }
    } else {
      const visible = fishList.filter((f) => {
        if (!f.isAlive) return false;
        const dx = f.x - this.x;
        const dy = f.y - this.y;
        return dx * dx + dy * dy < this.detectionRadius * this.detectionRadius;
      });

      if (visible.length === 0) {
        this.state = "SEARCH";
        this.currentTarget = null;
        this.speed = Shark.SEARCH_SPEED * speedMultiplier;
        this.desiredHeading += prng.range(-0.8, 0.8) * dt;
      } else {
        let bestScore = -Infinity;
        let best: Fish | null = null;
        for (const f of visible) {
          const dist = Math.hypot(f.x - this.x, f.y - this.y);
          const isolationBonus = Math.max(0, (5 - f.cachedNeighborCount) * 20);
          const score = 1000 - dist + isolationBonus;
          if (score > bestScore) { bestScore = score; best = f; }
        }
        this.currentTarget = best;

        if (this.currentTarget) {
          const dist = Math.hypot(this.currentTarget.x - this.x, this.currentTarget.y - this.y);
          if (dist < this.attackRadius) {
            this.state = "ATTACK";
            this.attackTimer = 0.4;
            this.speed = Shark.ATTACK_SPEED * speedMultiplier;
            maxTurnRate = Shark.ATTACK_TURN;
          } else {
            this.state = "CHASE";
            this.speed = Shark.CHASE_SPEED * speedMultiplier;
            maxTurnRate = Shark.CHASE_TURN;
          }
        }
      }
    }

    // 1. Calculate base desired heading toward target or wander
    if (this.currentTarget?.isAlive && (this.state === "CHASE" || this.state === "ATTACK")) {
      this.desiredHeading = Math.atan2(
        this.currentTarget.y - this.y,
        this.currentTarget.x - this.x
      );
    }

    // ==========================================
    // 2. VECTOR-BLENDED WALL AVOIDANCE (THE FIX)
    // ==========================================
    // Instead of forcing the heading blindly, we blend a wall-repulsion vector 
    // into our desired heading so the shark smoothly slides along the glass.
    let steerX = Math.cos(this.desiredHeading);
    let steerY = Math.sin(this.desiredHeading);

    const margin = 80;
    if (this.x < margin)                 steerX += (margin - this.x) / margin * 2.5;
    if (this.x > worldWidth  - margin)   steerX -= (this.x - (worldWidth - margin)) / margin * 2.5;
    if (this.y < margin)                 steerY += (margin - this.y) / margin * 2.5;
    if (this.y > worldHeight - margin)   steerY -= (this.y - (worldHeight - margin)) / margin * 2.5;

    this.desiredHeading = Math.atan2(steerY, steerX);

    // Capture check
    if (this.state !== "COOLDOWN") {
      for (const f of fishList) {
        if (!f.isAlive) continue;
        const dist = Math.hypot(f.x - this.x, f.y - this.y);
        if (dist <= this.captureRadius) {
          capturedFishId = f.id;
          f.isAlive = false;
          this.state = "COOLDOWN";
          this.cooldownTimer = 1.25;
          if (this.currentTarget?.id === f.id) {
             this.currentTarget = null;
          }
          break; 
        }
      }
    }

    // Apply turn-rate limiting to heading
    let diff = this.desiredHeading - this.heading;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = maxTurnRate * dt;
    this.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));

    // Integrate position
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;

    // Hard clamp absolute safety net
    this.x = Math.max(12, Math.min(worldWidth  - 12, this.x));
    this.y = Math.max(12, Math.min(worldHeight - 12, this.y));

    return { capturedFishId };
  }
}