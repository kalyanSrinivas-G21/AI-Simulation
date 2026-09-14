import random
import numpy as np
try:
    import torch
except ImportError:
    torch = None

def seed_everything(base_seed: int):
    """
    Deterministically seeds Python's random, numpy, and torch (if installed).
    Derives deterministic offsets for subsystems:
      seed + 0: global random
      seed + 1: agent initial state
      seed + 2: predator / traffic RNG
      seed + 3: environment disturbances
    """
    random.seed(base_seed)
    np.random.seed(base_seed)
    if torch is not None:
        torch.manual_seed(base_seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(base_seed)

def get_subsystem_seed(base_seed: int, subsystem_offset: int) -> int:
    return (base_seed * 10007 + subsystem_offset * 1009) % (2**31 - 1)
