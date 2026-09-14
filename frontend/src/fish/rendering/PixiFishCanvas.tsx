import React, { useEffect, useRef } from "react";
import { Application, Graphics, Container } from "pixi.js";
import { FishWorld } from "../simulation/world";
import { LEVEL_COLORS } from "../../design-system/tokens";
import { useAppStore } from "../../state/appStore";

interface PixiFishCanvasProps {
  world: FishWorld;
  width?: number; // These are now just initial fallbacks, we use responsive resize
  height?: number;
  className?: string;
  onFpsUpdate?: (fps: number) => void;
}

export const PixiFishCanvas: React.FC<PixiFishCanvasProps> = ({
  world,
  width = 960,
  height = 600,
  className,
  onFpsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  // Speed multiplier from store
  const { fishLevel } = useAppStore(); // Just to trigger re-renders if needed, though world handles level internal

  useEffect(() => {
    let isDestroyed = false;
    const app = new Application();
    appRef.current = app;

    async function initPixi() {
      if (!containerRef.current) return;

      // Initialize with full responsiveness
      await app.init({
        resizeTo: containerRef.current, // responsive resize
        backgroundColor: 0x080c12, // deep lab ocean
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (isDestroyed || !containerRef.current) {
        try {
          if (app.renderer) {
            app.destroy(true, { children: true });
          }
        } catch (e) {
          // Handled safely
        }
        return;
      }

      containerRef.current.appendChild(app.canvas);

      // Scene containers
      const bgContainer = new Container();
      const fishContainer = new Container();
      const sharkContainer = new Container();
      const fxContainer = new Container();

      app.stage.addChild(bgContainer);
      app.stage.addChild(fxContainer);
      app.stage.addChild(fishContainer);
      app.stage.addChild(sharkContainer);

      // Handle Resize bounds sync
      const updateBounds = () => {
        world.resize(app.screen.width, app.screen.height);
      };
      
      app.renderer.on('resize', () => {
        updateBounds();
      });
      // Initial bounds update
      updateBounds();

      // Draw lab grid background
      const bgGraphics = new Graphics();
      bgContainer.addChild(bgGraphics);
      
      const drawGrid = () => {
        bgGraphics.clear();
        const w = app.screen.width;
        const h = app.screen.height;
        bgGraphics.rect(0, 0, w, h).fill(0x0a0f16);
        // Blueprint grid lines
        const gridSize = 32;
        bgGraphics.setStrokeStyle({ width: 1, color: 0x1b2430, alpha: 0.5 });
        for (let x = 0; x <= w; x += gridSize) {
          bgGraphics.moveTo(x, 0).lineTo(x, h).stroke();
        }
        for (let y = 0; y <= h; y += gridSize) {
          bgGraphics.moveTo(0, y).lineTo(w, y).stroke();
        }
        // Boundary safety margin
        bgGraphics.rect(50, 50, w - 100, h - 100).stroke({ width: 1, color: 0x3e8eed, alpha: 0.15 });
      };
      
      app.renderer.on('resize', drawGrid);
      drawGrid();

      // Graphics for agents
      const fishGraphics = new Graphics();
      fishContainer.addChild(fishGraphics);

      const sharkGraphics = new Graphics();
      sharkContainer.addChild(sharkGraphics);

      const waveGraphics = new Graphics();
      fxContainer.addChild(waveGraphics);

      let lastTime = performance.now();
      let frameCount = 0;

      // Render loop
      app.ticker.add((ticker) => {
        // Step simulation with deltaMS for physics integration
        world.tick(ticker.deltaMS);

        // FPS tracking
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          if (onFpsUpdate) onFpsUpdate(Math.round((frameCount * 1000) / (now - lastTime)));
          frameCount = 0;
          lastTime = now;
        }

        // 1. Draw Fish
        fishGraphics.clear();
        waveGraphics.clear();

        const levelColorHex = parseInt(LEVEL_COLORS[world.level].replace("#", "0x"), 16);

        for (let i = 0; i < world.fishList.length; i++) {
          const fish = world.fishList[i];
          if (!fish.isAlive) continue;

          // Fish body: sleek arrowhead / triangle
          const cos = Math.cos(fish.heading);
          const sin = Math.sin(fish.heading);

          const tipX = fish.x + cos * 7;
          const tipY = fish.y + sin * 7;
          const leftX = fish.x - cos * 5 - sin * 4;
          const leftY = fish.y - sin * 5 + cos * 4;
          const rightX = fish.x - cos * 5 + sin * 4;
          const rightY = fish.y - sin * 5 - cos * 4;

          // Color tinting: if panic is active, flash warmer / vibrant
          let fillColor = levelColorHex;
          let alpha = 0.85;

          if (fish.panicLevel > 0.2) {
            fillColor = 0xf5a623; // panic amber
            alpha = Math.min(1.0, 0.7 + fish.panicLevel * 0.3);

            // Draw panic wave ripple around fish
            waveGraphics
              .circle(fish.x, fish.y, 8 + fish.panicLevel * 20)
              .stroke({ width: 1.5, color: 0x3e8eed, alpha: fish.panicLevel * 0.4 });
          }

          fishGraphics
            .poly([tipX, tipY, leftX, leftY, fish.x - cos * 3, fish.y - sin * 3, rightX, rightY])
            .fill({ color: fillColor, alpha });
        }

        // 2. Draw Shark
        sharkGraphics.clear();
        const shark = world.shark;
        const sCos = Math.cos(shark.heading);
        const sSin = Math.sin(shark.heading);

        // Shark body
        const sTipX = shark.x + sCos * 22;
        const sTipY = shark.y + sSin * 22;
        const sLeftX = shark.x - sCos * 14 - sSin * 9;
        const sLeftY = shark.y - sSin * 14 + sCos * 9;
        const sRightX = shark.x - sCos * 14 + sSin * 9;
        const sRightY = shark.y - sSin * 14 - sCos * 9;
        const sTailX = shark.x - sCos * 20;
        const sTailY = shark.y - sSin * 20;

        let sharkColor = 0xef4444; // crimson
        if (shark.state === "ATTACK") sharkColor = 0xff2222;
        if (shark.state === "COOLDOWN") sharkColor = 0x9ca3af;

        // Attack aura radius
        if (shark.state === "CHASE" || shark.state === "ATTACK") {
          sharkGraphics
            .circle(shark.x, shark.y, shark.attackRadius)
            .stroke({ width: 1.5, color: 0xef4444, alpha: shark.state === "ATTACK" ? 0.6 : 0.25 });
        }

        sharkGraphics
          .poly([sTipX, sTipY, sLeftX, sLeftY, sTailX, sTailY, sRightX, sRightY])
          .fill({ color: sharkColor, alpha: 0.95 });

        // Shark dorsal fin / eye
        sharkGraphics
          .circle(shark.x + sCos * 6, shark.y + sSin * 6, 2.5)
          .fill(0xffffff);
      });
    }

    initPixi();

    return () => {
      isDestroyed = true;
      if (appRef.current) {
        try {
          if (appRef.current.renderer) {
            appRef.current.destroy(true, { children: true });
          }
        } catch (e) {
          // Handled safely
        }
        appRef.current = null;
      }
    };
  }, [world, width, height]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-card border border-subtle bg-[#080C12] shadow-2xl w-full h-full ${className || ""}`}
      style={{ minHeight: "300px" }}
    />
  );
};
