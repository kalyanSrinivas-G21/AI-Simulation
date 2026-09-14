import React, { useEffect, useRef } from "react";
import { CarSim } from "../simulation/CarSim";
import { Brain } from "lucide-react";

export const DashCamView: React.FC<{ sim: CarSim; className?: string }> = ({ sim, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const renderDashcam = () => {
      const car = sim.car;
      const obstacles = sim.traffic.cars;
      const sensors = sim.currentSensors;

      // 1. Background
      ctx.fillStyle = "#0D1117"; 
      ctx.fillRect(0, 0, 84, 84);
      ctx.fillStyle = "#161B22";
      ctx.fillRect(0, 0, 84, 38); // Sky/Horizon

      // 2. 3D Perspective Projection Math
      const project = (cx: number, cz: number) => {
        if (cx < 0.1) cx = 0.1; // Prevent division by zero
        const screenX = 42 + (cz / cx) * 35;
        const screenY = 38 + (1.5 / cx) * 20;
        return { x: Math.max(-50, Math.min(120, screenX)), y: Math.min(84, Math.max(0, screenY)) };
      };

      const [front, frontLeft, frontRight, left, right] = sensors;

      // 3. Calculate Road Polygon from Sensors
      const pL2 = project(0.866 * frontLeft * 30, 0.5 * frontLeft * 30); // 30 deg left
      const pL3 = project(front * 40, 0); // Front
      const pR2 = project(0.866 * frontRight * 30, -0.5 * frontRight * 30); // 30 deg right

      // Draw Drivable Area (Semantic Green/Gray)
      ctx.fillStyle = "#112218";
      ctx.beginPath();
      ctx.moveTo(-10, 84);
      ctx.lineTo(pL2.x, pL2.y);
      ctx.lineTo(pL3.x, pL3.y);
      ctx.lineTo(pR2.x, pR2.y);
      ctx.lineTo(94, 84);
      ctx.closePath();
      ctx.fill();

      // Draw Lane Lines
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(42, 38);
      ctx.lineTo(pL3.x, pL3.y);
      ctx.stroke();

      // 4. Draw Obstacles with 3D Bounding Boxes
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const dx = obs.x - car.x;
        const dz = obs.z - car.z;
        const cos = Math.cos(-car.heading);
        const sin = Math.sin(-car.heading);
        const localForward = dx * cos - dz * sin;
        const localLateral = dx * sin + dz * cos;

        if (localForward > 2 && localForward < 40) {
          const p = project(localForward, localLateral);
          const depthScale = Math.max(0.1, (40 - localForward) / 40);
          const carWidth = 14 * depthScale;
          const carHeight = 8 * depthScale;
          
          // Obstacle Mask
          ctx.fillStyle = "#3D1115";
          ctx.fillRect(p.x - carWidth * 0.5, p.y - carHeight, carWidth, carHeight);
          // Bounding Box
          ctx.strokeStyle = "#EF4444";
          ctx.strokeRect(p.x - carWidth * 0.5, p.y - carHeight, carWidth, carHeight);
        }
      }

      // 5. Sensor Fusion Bars
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 74, 84, 10);
      sensors.forEach((val, i) => {
        const barWidth = 84 / 5;
        let color = "#22C55E";
        if (val < 0.35) color = "#EF4444";
        else if (val < 0.65) color = "#F5A623";
        ctx.fillStyle = color;
        ctx.fillRect(i * barWidth + 1, 84 - (val * 8) - 1, barWidth - 2, val * 8);
      });

      // 6. HUD Telemetry
      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 8px monospace";
      ctx.fillText(`VISION NET`, 2, 9);

      animId = requestAnimationFrame(renderDashcam);
    };

    animId = requestAnimationFrame(renderDashcam);
    return () => cancelAnimationFrame(animId);
  }, [sim]);

  return (
    <div className={`p-4 rounded-card bg-panel border border-level-4/50 shadow-2xl flex flex-col gap-3 ${className || ""}`}>
      <div className="flex items-center justify-between pb-2 border-b border-subtle">
        <div className="flex items-center gap-2 text-level-4 text-xs font-mono font-bold uppercase tracking-wider">
          <Brain size={16} />
          <span>AI VISION (SEMANTIC FEED)</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-level-4/10 text-level-4 border border-level-4/30">3D PROJECTION</span>
      </div>
      <div className="flex justify-center">
        <div className="relative border-2 border-level-4/40 rounded-btn overflow-hidden shadow-lg w-[252px] h-[252px] bg-black shrink-0">
          <canvas ref={canvasRef} width={84} height={84} className="w-full h-full [image-rendering:pixelated]" />
        </div>
      </div>
    </div>
  );
};