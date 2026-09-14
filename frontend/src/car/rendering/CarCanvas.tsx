import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CarSim } from "../simulation/CarSim";
import { SENSOR_CONFIGS } from "../simulation/RaycastSensors";
import { LEVEL_COLORS } from "../../design-system/tokens";

interface CarCanvasProps {
  sim: CarSim;
  cameraMode?: "topDown" | "follow";
  showSensorRays?: boolean;
  className?: string;
}

// Helper to generate stadium points for rendering since Track.ts uses pure math now
const generateStadiumPoints = (track: any) => {
  const points = [];
  const halfStraight = track.straightLen / 2;
  const radius = track.trackRadius;

  // Bottom straight (left to right)
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    points.push({ x: -halfStraight + t * track.straightLen, z: -radius });
  }
  // Right curve (bottom to top)
  for (let i = 1; i <= 25; i++) {
    const t = (i / 25) * Math.PI - Math.PI / 2;
    points.push({ x: halfStraight + Math.cos(t) * radius, z: Math.sin(t) * radius });
  }
  // Top straight (right to left)
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    points.push({ x: halfStraight - t * track.straightLen, z: radius });
  }
  // Left curve (top to bottom)
  for (let i = 1; i <= 25; i++) {
    const t = (i / 25) * Math.PI + Math.PI / 2;
    points.push({ x: -halfStraight + Math.cos(t) * radius, z: Math.sin(t) * radius });
  }
  
  return points.map((p, i, arr) => {
    const next = arr[(i + 1) % arr.length];
    const dx = next.x - p.x;
    const dz = next.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    return { ...p, normalX: -dz / len, normalZ: dx / len };
  });
};

// 3D Track Component
const TrackMesh: React.FC<{ sim: CarSim }> = ({ sim }) => {
  const track = sim.track;

  const { roadGeometry, outerLine, innerLine } = useMemo(() => {
    const waypoints = generateStadiumPoints(track);
    const numWp = waypoints.length;
    const halfWidth = track.trackWidth * 0.5;

    const roadPoints: THREE.Vector3[] = [];
    for (let i = 0; i < numWp; i++) {
      const wp = waypoints[i];
      roadPoints.push(new THREE.Vector3(wp.x + wp.normalX * halfWidth, 0.05, wp.z + wp.normalZ * halfWidth));
      roadPoints.push(new THREE.Vector3(wp.x - wp.normalX * halfWidth, 0.05, wp.z - wp.normalZ * halfWidth));
    }

    const roadGeo = new THREE.BufferGeometry();
    const indices: number[] = [];
    for (let i = 0; i < numWp; i++) {
      const p1 = i * 2, p2 = i * 2 + 1, p3 = (i + 1) * 2, p4 = (i + 1) * 2 + 1;
      indices.push(p1, p2, p3, p2, p4, p3);
    }
    roadGeo.setFromPoints(roadPoints);
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const outLine = waypoints.map(wp => new THREE.Vector3(wp.x + wp.normalX * halfWidth, 0.12, wp.z + wp.normalZ * halfWidth));
    const inLine = waypoints.map(wp => new THREE.Vector3(wp.x - wp.normalX * halfWidth, 0.12, wp.z - wp.normalZ * halfWidth));

    return { roadGeometry: roadGeo, outerLine: outLine, innerLine: inLine };
  }, [track]);

  return (
    <group>
      {/* Ground plane (Lab Grid) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#05080C" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Road asphalt */}
      <mesh geometry={roadGeometry}>
        <meshStandardMaterial color="#11161D" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Glowing Neon Barriers */}
      <lineLoop frustumCulled={false}>
        <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints(outerLine)} />
        <lineBasicMaterial color="#3E8EED" opacity={0.8} transparent linewidth={2} />
      </lineLoop>
      <lineLoop frustumCulled={false}>
        <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints(innerLine)} />
        <lineBasicMaterial color="#3E8EED" opacity={0.8} transparent linewidth={2} />
      </lineLoop>
    </group>
  );
};

// 3D Vehicle representation
const EgoCarMesh: React.FC<{ sim: CarSim; showSensorRays?: boolean }> = ({ sim, showSensorRays = true }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const car = sim.car;
    groupRef.current.position.set(car.x, 0.5, car.z);
    groupRef.current.rotation.y = -car.heading;
  });

  const levelColor = LEVEL_COLORS[sim.level] || "#3E8EED";

  return (
    <group ref={groupRef}>
      {/* Glowing Underglow */}
      <pointLight position={[0, 0.2, 0]} distance={12} intensity={2} color={levelColor} />
      
      {/* Car Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[3.2, 0.7, 1.6]} />
        <meshStandardMaterial color={levelColor} roughness={0.2} metalness={0.8} emissive={levelColor} emissiveIntensity={0.2} />
      </mesh>

      {/* Cabin */}
      <mesh position={[-0.2, 0.85, 0]}>
        <boxGeometry args={[1.8, 0.55, 1.3]} />
        <meshStandardMaterial color="#0B121B" roughness={0.1} metalness={0.9} transparent opacity={0.8} />
      </mesh>

      {/* Wheels */}
      {[-1.0, 1.0].map((x, xi) =>
        [-0.85, 0.85].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
            <meshStandardMaterial color="#1E293B" roughness={0.8} />
          </mesh>
        ))
      )}

      {/* Sensor Rays */}
      {showSensorRays && (
        <group position={[1.6, 0.2, 0]}>
          {SENSOR_CONFIGS.map((cfg, i) => {
            const reading = sim.currentSensors[i] ?? 1.0;
            const currentRange = cfg.maxRange * reading;
            const endX = Math.cos(cfg.angleOffsetRad) * currentRange;
            const endZ = -Math.sin(cfg.angleOffsetRad) * currentRange;

            let rayColor = "#22C55E";
            if (reading < 0.35) rayColor = "#EF4444";
            else if (reading < 0.65) rayColor = "#F5A623";

            return (
              <line key={i}>
                <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(endX, 0, endZ)])} />
                <lineBasicMaterial color={rayColor} linewidth={2} transparent opacity={0.8} />
              </line>
            );
          })}
        </group>
      )}
    </group>
  );
};

// Traffic Vehicles
const TrafficMeshList: React.FC<{ sim: CarSim }> = ({ sim }) => {
  const cars = sim.traffic.cars;
  return (
    <group>
      {cars.map((c) => (
        <group key={c.id} position={[c.x, 0.5, c.z]} rotation={[0, -c.heading, 0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[3.0, 0.65, 1.5]} />
            <meshStandardMaterial color={c.color} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Scene camera
const SceneRig: React.FC<{ sim: CarSim; cameraMode: "topDown" | "follow" }> = ({ sim, cameraMode }) => {
  const lookTargetRef = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    sim.tick(delta * 1000);
    const car = sim.car;

    if (cameraMode === "follow") {
      const followDistance = 18;
      const lookAheadDistance = 10;
      const desiredCamPos = new THREE.Vector3(
        car.x - Math.cos(car.heading) * followDistance,
        10,
        car.z - Math.sin(car.heading) * followDistance
      );
      camera.position.lerp(desiredCamPos, 1 - Math.exp(-4.0 * delta));
      
      const desiredLook = new THREE.Vector3(
        car.x + Math.cos(car.heading) * lookAheadDistance, 
        1, 
        car.z + Math.sin(car.heading) * lookAheadDistance
      );
      if (lookTargetRef.current.lengthSq() === 0) lookTargetRef.current.copy(desiredLook);
      lookTargetRef.current.lerp(desiredLook, 1 - Math.exp(-8.0 * delta));
      camera.lookAt(lookTargetRef.current);
    } else {
      // Dynamic Isometric Top-Down
      const desiredCamPos = new THREE.Vector3(car.x - 40, 70, car.z - 40);
      camera.position.lerp(desiredCamPos, 1 - Math.exp(-2.0 * delta));
      camera.lookAt(car.x, 0, car.z);
    }
  });

  return null;
};

export const CarCanvas: React.FC<CarCanvasProps> = ({ sim, cameraMode = "topDown", showSensorRays = true, className }) => {
  return (
    <div className={`relative overflow-hidden rounded-card border border-subtle bg-[#05080C] shadow-2xl ${className || ""}`}>
      <Canvas camera={{ position: [0, 70, -40], fov: 45 }} gl={{ antialias: true, alpha: false }} style={{ width: "100%", height: "100%" }}>
        <color attach="background" args={["#05080C"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[40, 80, 50]} intensity={1.5} castShadow />
        <TrackMesh sim={sim} />
        <TrafficMeshList sim={sim} />
        <EgoCarMesh sim={sim} showSensorRays={showSensorRays} />
        <SceneRig sim={sim} cameraMode={cameraMode} />
      </Canvas>
    </div>
  );
};