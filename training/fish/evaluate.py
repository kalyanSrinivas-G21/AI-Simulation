import os
import sys
import json
import numpy as np
from environment import FishEvadeEnv

# Allow importing from parent shared/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from shared.seeding import seed_everything

def evaluate_fish_policy(policy_fn, seeds=(1, 2, 3), episodes_per_seed=20):
    """
    Evaluates policy over at least 60 episodes across 3 independent seeds per §10.3.
    """
    total_episodes = len(seeds) * episodes_per_seed
    all_rewards = []
    all_lengths = []
    captures = 0
    escapes = 0

    env = FishEvadeEnv()

    print(f"Evaluating across {len(seeds)} seeds × {episodes_per_seed} episodes = {total_episodes} total runs...")

    for seed in seeds:
        seed_everything(seed)
        for ep in range(episodes_per_seed):
            obs, _ = env.reset(seed=seed * 100 + ep)
            ep_reward = 0.0
            ep_length = 0
            terminated = False
            truncated = False

            while not (terminated or truncated):
                action = policy_fn(obs)
                obs, reward, terminated, truncated, info = env.step(action)
                ep_reward += reward
                ep_length += 1

            all_rewards.append(ep_reward)
            all_lengths.append(ep_length)
            if info.get("captured", False):
                captures += 1
            else:
                escapes += 1

    mean_reward = float(np.mean(all_rewards))
    std_reward = float(np.std(all_rewards))
    mean_length = float(np.mean(all_lengths))
    survival_rate = float((escapes / total_episodes) * 100)

    results = {
        "world": "fish",
        "eval_seeds": list(seeds),
        "eval_episodes": total_episodes,
        "eval_mean_reward": round(mean_reward, 2),
        "eval_std_reward": round(std_reward, 2),
        "mean_episode_length": round(mean_length, 1),
        "survival_rate": round(survival_rate, 2),
        "total_captures": captures,
        "total_escapes": escapes,
    }

    print("\n--- Evaluation Results per §10.3 ---")
    print(f"Mean Reward: {mean_reward:.2f} ± {std_reward:.2f}")
    print(f"Survival Rate: {survival_rate:.1f}% ({escapes}/{total_episodes})")
    print(f"Mean Steps Alive: {mean_length:.1f}")

    return results

if __name__ == "__main__":
    # Heuristic learned agent test
    def heuristic_policy(obs):
        # Turn away from shark vector (obs[1], obs[2]), maintain speed
        turn = -np.sign(obs[2]) * 0.8
        speed = 0.6
        return np.array([turn, speed], dtype=np.float32)

    res = evaluate_fish_policy(heuristic_policy)
    out_path = "../../frontend/public/models/fish_metrics.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(res, f, indent=2)
    print(f"Metrics saved to {out_path}")
