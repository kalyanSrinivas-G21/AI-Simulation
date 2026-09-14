import { Controller } from "../../controllers/types";
import { Fish } from "../simulation/Fish";
import { PRNG } from "../../utils/prng";

export class RandomFishController implements Controller<null, { turnAngle: number; speed: number }> {
  id = "fish_l0_random";
  label = "Random Behaviour";
  level = 0 as const;
  isLearned = false;
  description = "Aimless random exploration with zero awareness of environment, neighbors, or predators.";

  private prng: PRNG = new PRNG(42);

  initialize(): void {}

  reset(seed: number = 42): void {
    this.prng = new PRNG(seed);
  }

  observe(): null {
    return null;
  }

  decide(): { turnAngle: number; speed: number } {
    // turnAngle = uniform(-π/6, π/6) per §8.2
    const turnAngle = this.prng.range(-Math.PI / 6, Math.PI / 6);
    const speed = this.prng.range(30, 75); // px/s
    return { turnAngle, speed };
  }

  applyToFish(fish: Fish, dt: number): void {
    const action = this.decide();
    // In random mode, we steer relative to current heading, but smooth it via the dt physics
    fish.steer(fish.heading + action.turnAngle * dt * 5, action.speed);
    fish.activeRuleIndex = -1;
  }
}
