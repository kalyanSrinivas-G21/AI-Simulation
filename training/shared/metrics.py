import json
import os
from dataclasses import dataclass, asdict
from typing import List, Optional

@dataclass
class ModelMetadata:
    name: str
    world: str
    level: int
    architecture: str
    algorithm: str
    total_timesteps: int
    trained_date: str
    eval_mean_reward: float
    eval_std_reward: float
    eval_episodes: int
    eval_seeds: List[int]
    extra: Optional[dict] = None

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(asdict(self), f, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "ModelMetadata":
        with open(filepath, "r") as f:
            data = json.load(f)
        return cls(**data)
