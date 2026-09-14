import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces

class CarTrackEnv(gym.Env):
    """
    Gymnasium environment for Car World continuous PPO control per §9.4.
    Observation (7 floats):
      0-4: 5 raycast distances normalized to [0, 1]
      5: current speed normalized to max_speed (1.6)
      6: lateral offset from centerline normalized to lane_width (3.5)
    Action: Box([-1, -1], [1, 1]) -> (steering, throttle)
    """
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 60}

    def __init__(self, max_steps=1200):
        super().__init__()
        self.max_steps = max_steps
        self.track_radius = 35.0
        self.straight_len = 70.0
        self.lane_width = 3.5
        self.num_lanes = 3
        self.track_width = self.lane_width * self.num_lanes
        self.max_speed = 1.6
        self.wheelbase = 2.6
        self.dt = 1.0 / 60.0

        # Action space: [steering (-1 to 1), throttle (-1 to 1)]
        self.action_space = spaces.Box(
            low=np.array([-1.0, -1.0], dtype=np.float32),
            high=np.array([1.0, 1.0], dtype=np.float32)
        )

        # Observation space: 7 floats
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -2.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 2.0], dtype=np.float32)
        )

        self.step_count = 0
        self.x = 0.0
        self.z = -self.track_radius
        self.heading = 0.0
        self.speed = 0.6
        self.last_steering = 0.0

        # NPC obstacles
        self.num_npcs = 5
        self.npc_distances = np.zeros(self.num_npcs, dtype=np.float32)
        self.npc_speeds = np.zeros(self.num_npcs, dtype=np.float32)
        self.npc_lanes = np.zeros(self.num_npcs, dtype=np.int32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        if seed is not None:
            np.random.seed(seed)

        self.step_count = 0
        self.x = float(np.random.uniform(-10, 10))
        self.z = -self.track_radius + float(np.random.uniform(-1.5, 1.5))
        self.heading = float(np.random.uniform(-0.1, 0.1))
        self.speed = 0.6
        self.last_steering = 0.0

        # Reset NPCs
        for i in range(self.num_npcs):
            self.npc_distances[i] = 40.0 + i * 35.0 + float(np.random.uniform(-5, 5))
            self.npc_speeds[i] = float(np.random.uniform(0.4, 0.7))
            self.npc_lanes[i] = int(np.random.randint(0, 3))

        return self._get_obs(), {}

    def _get_obs(self):
        # 5 Raycasts
        sensors = self._compute_raycasts()
        norm_speed = float(np.clip(self.speed / self.max_speed, 0.0, 1.0))
        lateral_offset = self._get_lateral_offset()
        norm_offset = float(np.clip(lateral_offset / self.lane_width, -2.0, 2.0))

        return np.array([
            sensors[0],
            sensors[1],
            sensors[2],
            sensors[3],
            sensors[4],
            norm_speed,
            norm_offset
        ], dtype=np.float32)

    def _get_npc_pos(self, dist, lane):
        total_len = self.straight_len * 2 + math.pi * 2 * self.track_radius
        d = dist % total_len
        lateral_offset = (lane - 1) * self.lane_width
        
        if d <= self.straight_len:
            cx = -self.straight_len * 0.5 + d
            cz = -self.track_radius
            nx, nz = 0.0, 1.0
            return cx + nx * lateral_offset, cz + nz * lateral_offset
        d -= self.straight_len
        
        arc_len = math.pi * self.track_radius
        if d <= arc_len:
            angle = -math.pi/2 + (d / arc_len) * math.pi
            cx = self.straight_len * 0.5 + math.cos(angle) * self.track_radius
            cz = math.sin(angle) * self.track_radius
            nx, nz = -math.cos(angle), -math.sin(angle)
            return cx + nx * lateral_offset, cz + nz * lateral_offset
        d -= arc_len
        
        if d <= self.straight_len:
            cx = self.straight_len * 0.5 - d
            cz = self.track_radius
            nx, nz = 0.0, -1.0
            return cx + nx * lateral_offset, cz + nz * lateral_offset
        d -= self.straight_len
        
        angle = math.pi/2 + (d / arc_len) * math.pi
        cx = -self.straight_len * 0.5 + math.cos(angle) * self.track_radius
        cz = math.sin(angle) * self.track_radius
        nx, nz = -math.cos(angle), -math.sin(angle)
        return cx + nx * lateral_offset, cz + nz * lateral_offset

    def _compute_raycasts(self):
        angles = [0.0, math.pi / 6.0, -math.pi / 6.0, math.pi / 2.0, -math.pi / 2.0]
        max_ranges = [40.0, 30.0, 30.0, 15.0, 15.0]
        readings = []

        lat_offset = self._get_lateral_offset()
        half_track = self.track_width * 0.5

        for angle, max_r in zip(angles, max_ranges):
            ray_h = self.heading + angle
            ray_dir_x = math.cos(ray_h)
            ray_dir_z = math.sin(ray_h)
            dist_to_barrier = max_r
            
            # 1. Track boundaries
            if abs(lat_offset) < half_track:
                sin_rel = math.sin(angle)
                if abs(sin_rel) > 1e-3:
                    if sin_rel > 0:
                        d_edge = (half_track - lat_offset) / sin_rel
                    else:
                        d_edge = (-half_track - lat_offset) / sin_rel
                    if d_edge > 0:
                        dist_to_barrier = min(dist_to_barrier, d_edge)

            # 2. NPC Ray-Circle Intersection
            for i in range(self.num_npcs):
                npc_x, npc_z = self._get_npc_pos(self.npc_distances[i], self.npc_lanes[i])
                to_obs_x = npc_x - self.x
                to_obs_z = npc_z - self.z
                
                proj = to_obs_x * ray_dir_x + to_obs_z * ray_dir_z
                if 0 < proj < dist_to_barrier:
                    perp_dist_sq = to_obs_x**2 + to_obs_z**2 - proj**2
                    r_sq = 2.2**2 # Bounding radius matching TS
                    if perp_dist_sq < r_sq:
                        half_chord = math.sqrt(max(0, r_sq - perp_dist_sq))
                        hit_dist = proj - half_chord
                        if 0 < hit_dist < dist_to_barrier:
                            dist_to_barrier = hit_dist

            norm_val = max(0.0, min(1.0, dist_to_barrier / max_r))
            readings.append(norm_val)

        return readings

    def _get_lateral_offset(self):
        # Circular approximation on curves, linear on straights
        if abs(self.x) <= self.straight_len * 0.5:
            if self.z < 0:
                return self.z - (-self.track_radius)
            else:
                return -(self.z - self.track_radius)
        elif self.x > self.straight_len * 0.5:
            d_center = math.hypot(self.x - self.straight_len * 0.5, self.z)
            return d_center - self.track_radius
        else:
            d_center = math.hypot(self.x - (-self.straight_len * 0.5), self.z)
            return d_center - self.track_radius

    def step(self, action):
        self.step_count += 1
        steer_input = float(np.clip(action[0], -1.0, 1.0)) * 0.45
        throttle_input = float(np.clip(action[1], -1.0, 1.0))

        # Steering delta penalty per §9.4
        steering_delta = abs(steer_input - self.last_steering)
        self.last_steering = steer_input

        # Update vehicle physics
        accel = throttle_input * 0.035
        self.speed = float(np.clip(self.speed + accel, 0.0, self.max_speed)) * 0.995

        delta_h = (self.speed / self.wheelbase) * math.sin(steer_input)
        self.heading += delta_h
        self.x += math.cos(self.heading) * self.speed
        self.z += math.sin(self.heading) * self.speed

        lat_offset = self._get_lateral_offset()
        is_off_road = abs(lat_offset) > (self.track_width * 0.5 + 0.5)

        # Move NPCs
        for i in range(self.num_npcs):
            self.npc_distances[i] += self.npc_speeds[i] * self.dt

        # Check NPC collisions
        is_npc_collision = False
        for i in range(self.num_npcs):
            npc_x, npc_z = self._get_npc_pos(self.npc_distances[i], self.npc_lanes[i])
            dist = math.hypot(npc_x - self.x, npc_z - self.z)
            if dist < 3.4: # 2.2 (NPC radius) + 1.2 (Car radius)
                is_npc_collision = True
                break

        # Reward formula per §9.4:
        # + speed * 0.1 * dt
        # + 0.05 lane-center bonus (scaled by how centered)
        # - 5.0 on collision (terminal)
        # - 2.0 on leaving road (terminal)
        # - 0.01 * |steeringDelta|
        center_bonus = 0.05 * max(0.0, 1.0 - abs(lat_offset) / self.lane_width)
        reward = (self.speed * 0.1) + center_bonus - (0.01 * steering_delta)

        terminated = False
        truncated = self.step_count >= self.max_steps

        if is_off_road:
            reward -= 2.0
            terminated = True
            
        if is_npc_collision:
            reward -= 5.0
            terminated = True

        info = {
            "speed": self.speed,
            "lateral_offset": lat_offset,
            "is_off_road": is_off_road,
            "distance": self.speed * self.step_count
        }

        return self._get_obs(), reward, terminated, truncated, info
