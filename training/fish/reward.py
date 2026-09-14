"""
Modular reward calculation for Fish World RL per §8.5.
Guards against reward hacking (e.g. wall-hugging or freezing).
"""

def compute_fish_reward(
    dist_to_shark: float,
    safe_distance: float = 150.0,
    dist_to_boundary: float = 100.0,
    boundary_margin: float = 60.0,
    is_captured: bool = False
) -> float:
    # 1. Alive bonus per §8.5
    reward = 0.01

    # 2. Safe distance bonus
    if dist_to_shark > safe_distance:
        reward += 0.3

    # 3. Boundary exploit penalty (prevents corner-freezing reward hacking per §8.5 & §16)
    if dist_to_boundary < boundary_margin:
        reward -= 0.05

    # 4. Terminal capture penalty
    if is_captured:
        reward -= 10.0

    return reward
