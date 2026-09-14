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
    
    // Change behavior randomly every 20-60 frames
    if (this.glitchTimer > 20 + Math.random() * 40) {
      this.glitchTimer = 0;
      const action = Math.random();
      
      if (action < 0.2) {
        // Glitch: Full reverse and hard steer
        this.currentSteer = Math.random() > 0.5 ? 1.0 : -1.0;
        this.currentThrottle = -0.8;
      } else if (action < 0.4) {
        // Freeze
        this.currentSteer = 0;
        this.currentThrottle = 0;
      } else {
        // Chaotic steering
        this.currentSteer = Math.random() * 2 - 1;
        this.currentThrottle = Math.random() * 0.8 + 0.2;
      }
    }
    return { steer: this.currentSteer, throttle: this.currentThrottle };
  }
}