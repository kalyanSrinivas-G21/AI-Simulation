import { Controller } from "../../controllers/types";

export class RandomCarController implements Controller<null, { steer: number; throttle: number }> {
  id = "car_l0_random";
  label = "Random Driving";
  level = 0 as const;
  isLearned = false;
  description = "Chaotic, glitchy random commands with no environmental awareness.";

  private glitchTimer: number = 0;
  private currentSteer: number = 0;
  private currentThrottle: number = 0;

  initialize(): void {}
  reset(): void {
    this.glitchTimer = 0;
    this.currentSteer = 0;
    this.currentThrottle = 0;
  }

  observe(): null { return null; }

  decide(): { steer: number; throttle: number } {
    this.glitchTimer++;
    
    // 60 frames = 1 second in the new fixed timestep physics
    if (this.glitchTimer > 20 + Math.random() * 40) {
      this.glitchTimer = 0;
      const action = Math.random();
      
      if (action < 0.15) {
        // Glitch: Reverse and steer
        this.currentSteer = Math.random() > 0.5 ? 0.8 : -0.8;
        this.currentThrottle = -0.5;
      } else if (action < 0.3) {
        // Freeze
        this.currentSteer = 0;
        this.currentThrottle = 0;
      } else {
        // Chaotic steering, but slightly constrained so it doesn't instantly die on the new tighter track
        this.currentSteer = (Math.random() * 2 - 1) * 0.7;
        this.currentThrottle = Math.random() * 0.6 + 0.4;
      }
    }
    return { steer: this.currentSteer, throttle: this.currentThrottle };
  }
}