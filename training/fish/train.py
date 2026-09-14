import os
import json
import time
import numpy as np
import torch
import torch.nn as nn
from environment import FishEvadeEnv
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import EvalCallback

def train_fish_model(
    total_timesteps=150_000,
    model_dir="../../models/fish",
    export_dir="../../frontend/public/models"
):
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(export_dir, exist_ok=True)

    env = FishEvadeEnv()
    eval_env = FishEvadeEnv()

    # Network architecture: 9 -> 32 -> 16 -> 2
    policy_kwargs = dict(
        net_arch=dict(pi=[32, 16], vf=[32, 16]),
        activation_fn=nn.Tanh
    )

    model = PPO(
        "MlpPolicy",
        env,
        policy_kwargs=policy_kwargs,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
        verbose=1
    )

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=model_dir,
        log_path=model_dir,
        eval_freq=10_000,
        n_eval_episodes=20,
        deterministic=True,
        render=False
    )

    print(f"Starting Fish PPO training for {total_timesteps} steps...")
    start_time = time.time()
    model.learn(total_timesteps=total_timesteps, callback=eval_callback)
    training_duration = time.time() - start_time
    print(f"Training completed in {training_duration:.1f}s.")

    # Save SB3 model
    save_path = os.path.join(model_dir, "fish_level3_ppo")
    model.save(save_path)
    print(f"Model saved to {save_path}")

    # Export weights for frontend browser inference
    export_weights_json(model, os.path.join(export_dir, "fish_level3.json"))
    return model

def export_weights_json(model, json_path):
    """
    Extracts policy actor weights from PyTorch model and writes to JSON
    so that frontend can execute browser-native forward passes offline.
    """
    policy = model.policy
    actor_layers = []

    # Policy latent layers: shared_net or mlp_extractor.policy_net
    policy_net = policy.mlp_extractor.policy_net
    for layer in policy_net:
        if isinstance(layer, nn.Linear):
            actor_layers.append({
                "weight": layer.weight.detach().cpu().numpy().tolist(),
                "bias": layer.bias.detach().cpu().numpy().tolist(),
                "activation": "tanh"
            })

    # Action head: policy.action_net
    action_net = policy.action_net
    actor_layers.append({
        "weight": action_net.weight.detach().cpu().numpy().tolist(),
        "bias": action_net.bias.detach().cpu().numpy().tolist(),
        "activation": "tanh"
    })

    export_data = {
        "model_name": "fish_level3_ppo",
        "world": "fish",
        "level": 3,
        "input_dim": 9,
        "output_dim": 2,
        "action_range": [-1.0, 1.0],
        "layers": actor_layers,
        "exported_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open(json_path, "w") as f:
        json.dump(export_data, f, indent=2)
    print(f"Exported browser weights to {json_path}")

if __name__ == "__main__":
    train_fish_model()
