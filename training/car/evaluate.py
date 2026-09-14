import os
import sys
import json
import numpy as np
from environment import CarTrackEnv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from shared.seeding import seed_everything

def evaluate_car_policy(policy_fn, seeds=(1, 2, 3), episodes_per_seed=20):
    total_episodes = len(seeds) * episodes_per_seed
    all_rewards = []
    all_distances = []
    crashes = 0
    clean_runs = 0

    env = CarTrackEnv()
    print(f"Evaluating Car World across {len(seeds)} seeds × {episodes_per_seed} episodes = {total_episodes} runs...")

    for seed in seeds:
        seed_everything(seed)
        for ep in range(episodes_per_seed):
            obs, _ = env.reset(seed=seed * 200 + ep)
            ep_reward = 0.0
            ep_distance = 0.0
            terminated = False
            truncated = False

            while not (terminated or truncated):
                action = policy_fn(obs)
                obs, reward, terminated, truncated, info = env.step(action)
                ep_reward += reward
                ep_distance = info.get("distance", ep_distance)

            all_rewards.append(ep_reward)
            all_distances.append(ep_distance)
            if info.get("is_off_road", False):
                crashes += 1
            else:
                clean_runs += 1

    mean_reward = float(np.mean(all_rewards))
    std_reward = float(np.std(all_rewards))
    mean_dist = float(np.mean(all_distances))
    clean_rate = float((clean_runs / total_episodes) * 100)

    results = {
        "world": "car",
        "eval_seeds": list(seeds),
        "eval_episodes": total_episodes,
        "eval_mean_reward": round(mean_reward, 2),
        "eval_std_reward": round(std_reward, 2),
        "mean_distance_travelled": round(mean_dist, 1),
        "zero_crash_rate": round(clean_rate, 2),
        "total_crashes": crashes,
    }

    print("\n--- Car Evaluation Results per §10.3 ---")
    print(f"Mean Reward: {mean_reward:.2f} ± {std_reward:.2f}")
    print(f"Clean Run Rate: {clean_rate:.1f}% ({clean_runs}/{total_episodes})")
    print(f"Mean Distance: {mean_dist:.1f}m")

    return results

if __name__ == "__main__":
    def reactive_policy(obs):
        # Steer away from front-left / front-right imbalances
        steer = (obs[1] - obs[2]) * 0.7 - obs[6] * 0.4
        throttle = 0.6 if obs[0] > 0.4 else -0.3
        return np.array([steer, throttle], dtype=np.float32)

    res = evaluate_car_policy(reactive_policy)
    out_path = "../../frontend/public/models/car_metrics.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(res, f, indent=2)
    print(f"Saved to {out_path}")
