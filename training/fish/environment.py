import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces

class FishEvadeEnv(gym.Env):
    """
    Fish World Gym Environment implementing §8.5 specification:
    Observation vector (9 floats):
      0: Distance to shark / max world diagonal
      1-2: Direction to shark (unit vector x, y)
      3: Shark relative speed / max speed
      4: Agent current speed / max speed
      5: Distance to nearest 3-fish centroid / perception radius
      6-7: Average neighbor heading (sin, cos)
      8: Distance to nearest boundary / boundary margin
    Action space: Box([-1, -1], [1, 1]) -> (turn_rate, speed_delta)
    """
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 60}

    def __init__(self, world_width=1200, world_height=800, num_neighbors=15, max_steps=1000):
        super().__init__()
        self.world_width = world_width
        self.world_height = world_height
        self.diagonal = math.hypot(world_width, world_height)
        self.num_neighbors = num_neighbors
        self.max_steps = max_steps
        self.perception_radius = 80.0
        self.safe_distance = 150.0
        self.boundary_margin = 60.0
        self.capture_radius = 18.0

        self.min_speed = 1.5
        self.max_speed = 5.0
        self.max_turn_rate = math.pi / 12  # ~15 degrees per tick

        # Continuous action: [turn_rate (-1 to 1), speed_delta (-1 to 1)]
        self.action_space = spaces.Box(low=np.array([-1.0, -1.0], dtype=np.float32),
                                       high=np.array([1.0, 1.0], dtype=np.float32))

        # Observation space: 9 floats
        self.observation_space = spaces.Box(
            low=np.array([0.0, -1.0, -1.0, -1.0, 0.0, 0.0, -1.0, -1.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0, 1.0, 1.0, 3.0, 1.0, 1.0, 1.0], dtype=np.float32)
        )

        self.step_count = 0
        self.agent_pos = np.zeros(2, dtype=np.float32)
        self.agent_heading = 0.0
        self.agent_speed = 3.0
        self.shark_pos = np.zeros(2, dtype=np.float32)
        self.shark_heading = 0.0
        self.shark_speed = 3.8
        self.neighbors_pos = np.zeros((self.num_neighbors, 2), dtype=np.float32)
        self.neighbors_heading = np.zeros(self.num_neighbors, dtype=np.float32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        if seed is not None:
            np.random.seed(seed)

        self.step_count = 0
        # Agent starts near center
        self.agent_pos = np.array([
            self.world_width * 0.5 + np.random.uniform(-100, 100),
            self.world_height * 0.5 + np.random.uniform(-100, 100)
        ], dtype=np.float32)
        self.agent_heading = np.random.uniform(-math.pi, math.pi)
        self.agent_speed = 3.0

        # Shark starts at an edge
        edge = np.random.randint(4)
        if edge == 0:
            self.shark_pos = np.array([np.random.uniform(50, self.world_width-50), 50.0], dtype=np.float32)
        elif edge == 1:
            self.shark_pos = np.array([self.world_width - 50.0, np.random.uniform(50, self.world_height-50)], dtype=np.float32)
        elif edge == 2:
            self.shark_pos = np.array([np.random.uniform(50, self.world_width-50), self.world_height - 50.0], dtype=np.float32)
        else:
            self.shark_pos = np.array([50.0, np.random.uniform(50, self.world_height-50)], dtype=np.float32)

        to_agent = self.agent_pos - self.shark_pos
        self.shark_heading = math.atan2(to_agent[1], to_agent[0])
        self.shark_speed = 3.8

        # Initialize school neighbors around agent
        for i in range(self.num_neighbors):
            offset = np.random.uniform(-120, 120, size=2)
            self.neighbors_pos[i] = np.clip(self.agent_pos + offset, [20, 20], [self.world_width-20, self.world_height-20])
            self.neighbors_heading[i] = self.agent_heading + np.random.uniform(-0.5, 0.5)

        return self._get_obs(), {}

    def _get_obs(self):
        # 0: Distance to shark / max world diagonal
        d_shark = float(np.linalg.norm(self.agent_pos - self.shark_pos))
        norm_d_shark = min(1.0, d_shark / self.diagonal)

        # 1-2: Direction to shark (unit vector x, y)
        if d_shark > 1e-4:
            dir_shark = (self.shark_pos - self.agent_pos) / d_shark
        else:
            dir_shark = np.array([0.0, 0.0], dtype=np.float32)

        # 3: Shark relative speed / max speed
        norm_shark_rel_speed = (self.shark_speed - self.agent_speed) / self.max_speed

        # 4: My current speed / max speed
        norm_my_speed = self.agent_speed / self.max_speed

        # 5: Distance to nearest 3-fish centroid / perception radius
        dists = np.linalg.norm(self.neighbors_pos - self.agent_pos, axis=1)
        nearest_idx = np.argsort(dists)[:3]
        centroid = np.mean(self.neighbors_pos[nearest_idx], axis=0)
        d_centroid = float(np.linalg.norm(self.agent_pos - centroid))
        norm_d_centroid = min(3.0, d_centroid / self.perception_radius)

        # 6-7: Average neighbor heading (sin, cos)
        avg_sin = float(np.mean(np.sin(self.neighbors_heading[nearest_idx])))
        avg_cos = float(np.mean(np.cos(self.neighbors_heading[nearest_idx])))

        # 8: Distance to nearest boundary / boundary margin
        d_left = self.agent_pos[0]
        d_right = self.world_width - self.agent_pos[0]
        d_top = self.agent_pos[1]
        d_bottom = self.world_height - self.agent_pos[1]
        min_bound = min(d_left, d_right, d_top, d_bottom)
        norm_boundary = min(1.0, max(0.0, min_bound / self.boundary_margin))

        obs = np.array([
            norm_d_shark,
            dir_shark[0],
            dir_shark[1],
            norm_shark_rel_speed,
            norm_my_speed,
            norm_d_centroid,
            avg_sin,
            avg_cos,
            norm_boundary
        ], dtype=np.float32)
        return obs

    def step(self, action):
        self.step_count += 1

        # Clip action
        turn_rate = float(np.clip(action[0], -1.0, 1.0)) * self.max_turn_rate
        speed_delta = float(np.clip(action[1], -1.0, 1.0)) * 0.3

        # Update agent physics
        self.agent_heading += turn_rate
        self.agent_speed = float(np.clip(self.agent_speed + speed_delta, self.min_speed, self.max_speed))
        self.agent_pos[0] += math.cos(self.agent_heading) * self.agent_speed
        self.agent_pos[1] += math.sin(self.agent_heading) * self.agent_speed

        # Keep agent inside boundary
        self.agent_pos[0] = float(np.clip(self.agent_pos[0], 5, self.world_width - 5))
        self.agent_pos[1] = float(np.clip(self.agent_pos[1], 5, self.world_height - 5))

        # Update shark FSM pursuit (targets agent)
        to_target = self.agent_pos - self.shark_pos
        dist_to_shark = float(np.linalg.norm(to_target))
        if dist_to_shark > 1e-4:
            target_heading = math.atan2(to_target[1], to_target[0])
            heading_diff = (target_heading - self.shark_heading + math.pi) % (2 * math.pi) - math.pi
            self.shark_heading += np.clip(heading_diff, -0.08, 0.08)

        self.shark_pos[0] += math.cos(self.shark_heading) * self.shark_speed
        self.shark_pos[1] += math.sin(self.shark_heading) * self.shark_speed

        # Update neighbor boids slightly
        for i in range(self.num_neighbors):
            # simple wander away from shark if close
            to_s = self.neighbors_pos[i] - self.shark_pos
            ds = float(np.linalg.norm(to_s))
            if ds < 120 and ds > 1e-3:
                away = math.atan2(to_s[1], to_s[0])
                self.neighbors_heading[i] = away
            self.neighbors_pos[i][0] += math.cos(self.neighbors_heading[i]) * 2.5
            self.neighbors_pos[i][1] += math.sin(self.neighbors_heading[i]) * 2.5
            self.neighbors_pos[i] = np.clip(self.neighbors_pos[i], [10, 10], [self.world_width - 10, self.world_height - 10])

        # Compute reward per §8.5:
        # +0.01 alive bonus
        # +0.3 if distanceToShark > safeDistance
        # -10.0 on capture (terminal)
        # -0.05 if distanceToBoundary < margin (discourage corner exploits)
        reward = 0.01
        if dist_to_shark > self.safe_distance:
            reward += 0.3

        d_bound = min(self.agent_pos[0], self.world_width - self.agent_pos[0],
                      self.agent_pos[1], self.world_height - self.agent_pos[1])
        if d_bound < self.boundary_margin:
            reward -= 0.05

        terminated = False
        truncated = self.step_count >= self.max_steps

        # Check capture
        if dist_to_shark < self.capture_radius:
            reward -= 10.0
            terminated = True

        info = {
            "dist_to_shark": dist_to_shark,
            "survival_steps": self.step_count,
            "captured": terminated and not truncated
        }

        return self._get_obs(), reward, terminated, truncated, info
