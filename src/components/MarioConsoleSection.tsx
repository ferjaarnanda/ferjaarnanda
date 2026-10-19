"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { services } from "@/data/services";
import levelData from "../../public/environment/level-data.json";

// World & Object Constants from level-data.json -> console
const CONSOLE_DATA = levelData.console;
const WORLD_W = CONSOLE_DATA.world.width; // 480
const WORLD_H = CONSOLE_DATA.world.height; // 216
const GROUND_Y = CONSOLE_DATA.world.groundY; // 168

const PIPE_W = CONSOLE_DATA.pipes.width; // 34
const PIPE_INSET = CONSOLE_DATA.pipes.colliderInset; // 1
const PIPE1 = CONSOLE_DATA.pipes.short; // { x: 366, top: 138 }
const PIPE2 = CONSOLE_DATA.pipes.medium; // { x: 406, top: 122 }
const PIPE3 = CONSOLE_DATA.pipes.tall; // { x: 446, top: 106 }

const PIPE1_CENTER_X = PIPE1.x + PIPE_W / 2; // 383
const PIPE2_CENTER_X = PIPE2.x + PIPE_W / 2; // 423
const PIPE3_CENTER_X = PIPE3.x + PIPE_W / 2; // 463

const PIPE1_SURF_Y = PIPE1.top + 1; // 139
const PIPE2_SURF_Y = PIPE2.top + 1; // 123
const PIPE3_SURF_Y = PIPE3.top + 1; // 107

const PLANT_CFG = CONSOLE_DATA.plant; // { x: 407, hiddenTop: 130, raisedTop: 70, clipY: 134 }
const BLOCKS_ROW = CONSOLE_DATA.blocks.row; // { x: 216, y: 88, pattern: "BBQBB", tile: 16 }
const QBLOCK_X = BLOCKS_ROW.x + 2 * BLOCKS_ROW.tile; // 248
const QBLOCK_CENTER_X = QBLOCK_X + 8; // 256
const BLOCKS_Y = BLOCKS_ROW.y; // 88
const BLOCKS_BOTTOM_Y = BLOCKS_Y + BLOCKS_ROW.tile; // 104
const BLOCKS_RIGHT_X = BLOCKS_ROW.x + 5 * BLOCKS_ROW.tile; // 296

const HERO_FRAME_W = CONSOLE_DATA.hero.frame[0]; // 36
const HERO_FRAME_H = CONSOLE_DATA.hero.frame[1]; // 50
const HERO_FEET_Y = CONSOLE_DATA.hero.feetY; // 48
const HERO_CENTER_X = CONSOLE_DATA.hero.centerX; // 18
const HITBOX_HALF_W = CONSOLE_DATA.hero.hitbox.w / 2; // 9
const HITBOX_H = CONSOLE_DATA.hero.hitbox.h; // 42

const GRAVITY = 900; // px/s^2
const TERMINAL_VEL_Y = 420; // px/s
const WALK_SPEED = 70; // px/s
const WALK_FPS = 9;
const WALK_FRAMES = [2, 3, 4, 5] as const;
const HOP_DURATION = 0.5; // s
const PIPE1_GROUND_TAKEOFF_X = 344; // left of Pipe 1 (344 + 9 = 353 < 367)

interface SolidBox {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const SOLIDS: SolidBox[] = [
  { id: "ground", x1: 0, y1: GROUND_Y, x2: WORLD_W, y2: WORLD_H + 60 },
  {
    id: "pipe1",
    x1: PIPE1.x + PIPE_INSET,
    y1: PIPE1_SURF_Y,
    x2: PIPE1.x + PIPE_W - PIPE_INSET,
    y2: GROUND_Y,
  },
  {
    id: "pipe2",
    x1: PIPE2.x + PIPE_INSET,
    y1: PIPE2_SURF_Y,
    x2: PIPE2.x + PIPE_W - PIPE_INSET,
    y2: GROUND_Y,
  },
  {
    id: "pipe3",
    x1: PIPE3.x + PIPE_INSET,
    y1: PIPE3_SURF_Y,
    x2: PIPE3.x + PIPE_W - PIPE_INSET,
    y2: GROUND_Y,
  },
  {
    id: "blocks",
    x1: BLOCKS_ROW.x,
    y1: BLOCKS_Y,
    x2: BLOCKS_RIGHT_X,
    y2: BLOCKS_BOTTOM_Y,
  },
];

interface CloudDef {
  key: "cloud-xs" | "cloud-s" | "cloud-m" | "cloud-l";
  w: number;
  h: number;
  x: number;
  y: number;
  speed: number;
}

const INITIAL_CLOUDS: CloudDef[] = [
  { key: "cloud-m", w: 62, h: 38, x: 55, y: 18, speed: 11 },
  { key: "cloud-xs", w: 34, h: 26, x: 175, y: 40, speed: 8 },
  { key: "cloud-l", w: 86, h: 48, x: 295, y: 14, speed: 14 },
  { key: "cloud-s", w: 44, h: 30, x: 420, y: 34, speed: 9.5 },
];

type PlantPhase = "HIDDEN" | "RISING" | "CHOMPING" | "RETRACTING" | "FAST_RETRACT";
type CoinState = "NONE" | "RISING" | "HOVERING" | "SINKING";
type RainbowState = "NONE" | "RAINBOW" | "BLINK";

type RoutePhase =
  | "STEP1_LEFT_IDLE"
  | "STEP2_WALK_RIGHT"
  | "STEP2_PRE_HOP_P1"
  | "STEP2_HOP_TO_P1"
  | "STEP3_P1_STARTLED"
  | "STEP3_P1_LOOK"
  | "STEP3_P1_BEAT"
  | "STEP4_HOP_P1_TO_P2"
  | "STEP4_P2_BEAT"
  | "STEP4_HOP_P2_TO_P3"
  | "STEP5_P3_CONFUSED"
  | "STEP5_P3_BEAT"
  | "STEP6_P3_WAIT_PLANT"
  | "STEP6_HOP_P3_TO_P2"
  | "STEP6_P2_BEAT"
  | "STEP6_HOP_P2_TO_P1"
  | "STEP6_P1_BEAT"
  | "STEP6_HOP_P1_TO_GROUND"
  | "STEP6_GROUND_BEAT"
  | "STEP7_WALK_LEFT"
  | "STEP7_LEFT_CONFUSED"
  | "STEP8_LEFT_BEAT"
  | "HOP_BLOCKS_TO_GROUND"
  | "DRAGGING"
  | "AIR_FALL"
  | "WAIT_RESUME";

interface TrailGhost {
  x: number;
  y: number;
  frame: number;
  facing: 1 | -1;
  row: number;
  age: number;
  maxAge: number;
}

interface BoomEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
}

interface SparkleBurst {
  x: number;
  y: number;
  age: number;
  duration: number;
}

interface PlusOneEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
}

export default function MarioConsoleSection() {
  const prefersReducedMotion = useReducedMotion();

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grabHandleRef = useRef<HTMLDivElement>(null);

  const [layoutState, setLayoutState] = useState<{ k: number; wn: number }>({
    k: 2,
    wn: 400,
  });

  // Measure frame width and compute integer scale K & native width Wn
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const measure = () => {
      const parentW = el.parentElement ? el.parentElement.clientWidth : el.clientWidth;
      const borderW = 8; // 4px outline left + 4px right
      const availInner = Math.max(320, parentW - borderW);
      const isDesktop = window.innerWidth >= 1024;
      const k = isDesktop || availInner >= 640 ? 2 : 1;
      const wn = Math.max(320, Math.min(WORLD_W, Math.floor(availInner / k)));
      setLayoutState((prev) => (prev.k === k && prev.wn === wn ? prev : { k, wn }));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Main Interactive Canvas Engine (Fixed 60Hz Timestep + rAF Render)
  useEffect(() => {
    const frameEl = frameRef.current;
    const canvas = canvasRef.current;
    const grabHandle = grabHandleRef.current;
    if (!frameEl || !canvas || !grabHandle) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleK = layoutState.k;
    const wn = layoutState.wn;
    const viewLeft = WORLD_W - wn;
    const minHeroX = Math.max(HITBOX_HALF_W, viewLeft + HITBOX_HALF_W);
    const maxHeroX = WORLD_W - HITBOX_HALF_W;
    const farLeftWalkX = Math.max(minHeroX + 4, viewLeft + 28);

    // Load all image sprites
    const imgPaths: Record<string, string> = {
      hillsFar: "/environment/bg-hills-far.png",
      consoleBack: "/environment/console-back.png",
      brick: "/environment/tile-brick.png",
      qblock1: "/environment/block-question-1.png",
      qblock2: "/environment/block-question-2.png",
      pipeShort: "/environment/pipe-short.png",
      pipeMedium: "/environment/pipe-medium.png",
      pipeTall: "/environment/pipe-tall.png",
      plant1: "/environment/plant-1.png",
      plant2: "/environment/plant-2.png",
      plant3: "/environment/plant-3.png",
      plant4: "/environment/plant-4.png",
      cloudXs: "/environment/cloud-xs.png",
      cloudS: "/environment/cloud-s.png",
      cloudM: "/environment/cloud-m.png",
      cloudL: "/environment/cloud-l.png",
      heroSheet: "/character/devj-sheet-nobubble.png",
      heroRainbow: "/character/devj-rainbow-sheet.png",
      bubbleQ: "/character/bubble-question.png",
      bubbleEx: "/character/bubble-exclaim.png",
      rainbowCoin: "/environment/minicoin-rainbow-sheet.png",
      plus1: "/environment/text-plus1.png",
      sparkle1: "/environment/sparkle-1.png",
      sparkle2: "/environment/sparkle-2.png",
      sparkle3: "/environment/sparkle-3.png",
      sparkle4: "/environment/sparkle-4.png",
      exp1: "/environment/explosion-1.png",
      exp2: "/environment/explosion-2.png",
      exp3: "/environment/explosion-3.png",
      exp4: "/environment/explosion-4.png",
      exp5: "/environment/explosion-5.png",
    };

    const images: Record<string, HTMLImageElement> = {};
    Object.entries(imgPaths).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      images[key] = img;
    });

    // Simulation state
    let simTime = 0;
    let routePhase: RoutePhase = "STEP1_LEFT_IDLE";
    let phaseTimer = 0;
    let walkAnimTime = 0;
    let loopCount = 0;

    let heroX = farLeftWalkX;
    let heroY = GROUND_Y;
    let heroVx = 0;
    let heroVy = 0;
    let facing: 1 | -1 = 1;
    let heroFrame = 0;
    let activeBubble: "none" | "question" | "exclaim" = "none";

    // Hop endpoints
    let hopX0 = farLeftWalkX;
    let hopY0 = GROUND_Y;
    let hopX1 = PIPE1_CENTER_X;
    let hopY1 = PIPE1_SURF_Y;
    let hopApexY = PIPE1_SURF_Y - 20;
    let hopNextPhase: RoutePhase = "STEP3_P1_BEAT";

    // Plant state
    let plantPhase: PlantPhase = "HIDDEN";
    let plantTimer = 0.4;
    let plantY = PLANT_CFG.hiddenTop; // 130
    let plantRetractStartY = PLANT_CFG.raisedTop; // 70
    let plantFrame = 1;
    let plantRouteLock = false;
    let nextPlantHiddenWait = 1.5;

    // Question Block & Rainbow Coin state
    let bumpTimer = -1; // >= 0 while bumping (0..0.24s)
    let bumpCount = 0;
    let coinState: CoinState = "NONE";
    let coinTimer = 0;
    let coinY = BLOCKS_Y;
    let coinSpinTime = 0;
    let collectCount = 0;

    // Rainbow mode & trail state
    let rainbowState: RainbowState = "NONE";
    let rainbowTimer = 0;
    let trailSpawnAccum = 0;
    const trailGhosts: TrailGhost[] = [];

    // Effects state
    const booms: BoomEffect[] = [];
    const sparkles: SparkleBurst[] = [];
    const plusOnes: PlusOneEffect[] = [];
    let totalBooms = 0;
    let lastTapBoomMs = 0;
    let frameNudgeTimer = 0;

    // Clouds state
    const clouds = INITIAL_CLOUDS.map((c) => ({ ...c }));

    // Drag / Pointer state
    let isDragging = false;
    let activePointerId: number | null = null;
    let pointerTargetX = heroX;
    let pointerTargetY = heroY;
    let grabOffsetX = 0;
    let grabOffsetY = 0;
    let waitResumeTimer = 0;
    let resumeLastDir: 1 | -1 = 1;
    let solidPenetrationCount = 0;
    let wasTouchingQBlockUnderside = false;

    const startHop = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      next: RoutePhase,
      dir: 1 | -1
    ) => {
      hopX0 = x0;
      hopY0 = y0;
      hopX1 = x1;
      hopY1 = y1;
      hopApexY = Math.min(y0, y1) - 20;
      hopNextPhase = next;
      facing = dir;
      phaseTimer = 0;
    };

    const triggerBlockBump = () => {
      if (bumpTimer < 0) {
        bumpTimer = 0;
        bumpCount += 1;
      }
      // Spawn rainbow coin only if no coin is active and hero is not in rainbow/blink mode
      if (coinState === "NONE" && rainbowState === "NONE") {
        coinState = "RISING";
        coinTimer = 0;
        coinY = BLOCKS_Y;
      }
    };

    // Sub-stepped X-then-Y collision resolver (max 3px per sub-step, zero tunneling)
    const moveHeroWithCollisions = (
      dx: number,
      dy: number,
      upwardSpeedForBump: number
    ): { landedOn: string | null; hitCeiling: boolean; hitWall: boolean } => {
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 3));
      const sx = dx / steps;
      const sy = dy / steps;

      let landedOn: string | null = null;
      let hitCeiling = false;
      let hitWall = false;

      for (let s = 0; s < steps; s++) {
        // 1. Resolve X
        heroX += sx;
        if (heroX < minHeroX) {
          heroX = minHeroX;
          hitWall = true;
        } else if (heroX > maxHeroX) {
          heroX = maxHeroX;
          hitWall = true;
        }

        const topY = heroY - HITBOX_H;
        const botY = heroY;
        for (let i = 0; i < SOLIDS.length; i++) {
          const sol = SOLIDS[i];
          if (botY > sol.y1 && topY < sol.y2) {
            if (heroX + HITBOX_HALF_W > sol.x1 && heroX - HITBOX_HALF_W < sol.x2) {
              if (sx > 0) {
                heroX = sol.x1 - HITBOX_HALF_W;
              } else if (sx < 0) {
                heroX = sol.x2 + HITBOX_HALF_W;
              } else {
                const dLeft = Math.abs(heroX + HITBOX_HALF_W - sol.x1);
                const dRight = Math.abs(sol.x2 - (heroX - HITBOX_HALF_W));
                heroX = dLeft <= dRight ? sol.x1 - HITBOX_HALF_W : sol.x2 + HITBOX_HALF_W;
              }
              hitWall = true;
            }
          }
        }

        // 2. Resolve Y
        heroY += sy;
        if (heroY - HITBOX_H < 0) {
          heroY = HITBOX_H;
          hitCeiling = true;
        }

        const leftX = heroX - HITBOX_HALF_W;
        const rightX = heroX + HITBOX_HALF_W;
        for (let i = 0; i < SOLIDS.length; i++) {
          const sol = SOLIDS[i];
          if (rightX > sol.x1 && leftX < sol.x2) {
            if (heroY > sol.y1 && heroY - HITBOX_H < sol.y2) {
              if (sy > 0) {
                heroY = sol.y1;
                landedOn = sol.id;
              } else if (sy < 0) {
                // Moving up into underside of solid
                if (
                  sol.id === "blocks" &&
                  rightX > QBLOCK_X - 2 &&
                  leftX < QBLOCK_X + BLOCKS_ROW.tile + 2 &&
                  upwardSpeedForBump >= 60 &&
                  !wasTouchingQBlockUnderside
                ) {
                  wasTouchingQBlockUnderside = true;
                  triggerBlockBump();
                }
                heroY = sol.y2 + HITBOX_H;
                hitCeiling = true;
              } else {
                const dTop = Math.abs(heroY - sol.y1);
                const dBot = Math.abs(sol.y2 - (heroY - HITBOX_H));
                if (dTop <= dBot) {
                  heroY = sol.y1;
                  landedOn = sol.id;
                } else {
                  heroY = sol.y2 + HITBOX_H;
                  hitCeiling = true;
                }
              }
            }
          }
        }
      }

      // Check if hero moved away from underside of ? block so he can bump it again
      const curLeftX = heroX - HITBOX_HALF_W;
      const curRightX = heroX + HITBOX_HALF_W;
      const underQBlock =
        curRightX > QBLOCK_X - 2 &&
        curLeftX < QBLOCK_X + BLOCKS_ROW.tile + 2 &&
        Math.abs(heroY - HITBOX_H - BLOCKS_BOTTOM_Y) <= 2.5;
      if (!underQBlock) {
        wasTouchingQBlockUnderside = false;
      } else if (
        !wasTouchingQBlockUnderside &&
        upwardSpeedForBump >= 60
      ) {
        wasTouchingQBlockUnderside = true;
        triggerBlockBump();
      }

      // Check what surface the hero is resting on (within 0.5px)
      if (!landedOn) {
        const leftX = heroX - HITBOX_HALF_W;
        const rightX = heroX + HITBOX_HALF_W;
        for (let i = 0; i < SOLIDS.length; i++) {
          const sol = SOLIDS[i];
          if (rightX > sol.x1 && leftX < sol.x2 && Math.abs(heroY - sol.y1) <= 0.5) {
            heroY = sol.y1;
            landedOn = sol.id;
            break;
          }
        }
      }

      // Verify zero solid penetration
      const checkLeft = heroX - HITBOX_HALF_W + 0.05;
      const checkRight = heroX + HITBOX_HALF_W - 0.05;
      const checkTop = heroY - HITBOX_H + 0.05;
      const checkBot = heroY - 0.05;
      for (let i = 0; i < SOLIDS.length; i++) {
        const sol = SOLIDS[i];
        if (
          checkRight > sol.x1 &&
          checkLeft < sol.x2 &&
          checkBot > sol.y1 &&
          checkTop < sol.y2
        ) {
          solidPenetrationCount += 1;
        }
      }

      return { landedOn, hitCeiling, hitWall };
    };

    const detectCurrentSurface = (): string | null => {
      const leftX = heroX - HITBOX_HALF_W;
      const rightX = heroX + HITBOX_HALF_W;
      for (let i = 0; i < SOLIDS.length; i++) {
        const sol = SOLIDS[i];
        if (rightX > sol.x1 && leftX < sol.x2 && Math.abs(heroY - sol.y1) <= 1.0) {
          return sol.id;
        }
      }
      return null;
    };

    // Surface-aware RESUME LOGIC (Section 5.4)
    const resumeFromCurrentSurface = () => {
      const surf = detectCurrentSurface();
      activeBubble = "none";
      phaseTimer = 0;
      walkAnimTime = 0;

      if (!surf) {
        routePhase = "AIR_FALL";
        return;
      }

      if (surf === "pipe1") {
        heroX = PIPE1_CENTER_X;
        heroY = PIPE1_SURF_Y;
        facing = 1;
        if (plantPhase !== "HIDDEN" || plantTimer >= 1.0) {
          if (plantPhase === "HIDDEN") {
            plantPhase = "RISING";
            plantTimer = 0;
          }
          routePhase = "STEP3_P1_STARTLED";
          heroFrame = 14;
          activeBubble = "exclaim";
        } else {
          plantRouteLock = true;
          routePhase = "STEP3_P1_BEAT";
          heroFrame = 10;
        }
      } else if (surf === "pipe2") {
        // On pipe 2 -> go to pipe 3 (step 4)
        plantRouteLock = true;
        heroX = PIPE2_CENTER_X;
        heroY = PIPE2_SURF_Y;
        facing = 1;
        routePhase = "STEP4_P2_BEAT";
        heroFrame = 10;
      } else if (surf === "pipe3") {
        // On pipe 3 -> step 5
        plantRouteLock = false;
        heroX = PIPE3_CENTER_X;
        heroY = PIPE3_SURF_Y;
        facing = 1;
        routePhase = "STEP5_P3_CONFUSED";
        heroFrame = 11;
        activeBubble = "question";
      } else if (surf === "blocks") {
        // On top of bricks/blocks -> hop down to the ground, then step 2 or 7 by position
        const targetGroundX = Math.max(
          farLeftWalkX,
          Math.min(PIPE1_GROUND_TAKEOFF_X, heroX + (resumeLastDir >= 0 ? 28 : -28))
        );
        startHop(
          heroX,
          BLOCKS_Y,
          targetGroundX,
          GROUND_Y,
          "HOP_BLOCKS_TO_GROUND",
          resumeLastDir
        );
        routePhase = "HOP_BLOCKS_TO_GROUND";
      } else {
        // Ground left of pipe 1 -> step 2
        heroY = GROUND_Y;
        if (heroX > PIPE1_GROUND_TAKEOFF_X + 2) {
          routePhase = "STEP7_WALK_LEFT";
          facing = -1;
        } else {
          routePhase = "STEP2_WALK_RIGHT";
          facing = 1;
        }
      }
    };

    const spawnBoom = (wx: number, wy: number, bypassThrottle = false) => {
      const now = performance.now();
      if (!bypassThrottle && now - lastTapBoomMs < 80) return;
      lastTapBoomMs = now;
      if (booms.length >= 6) {
        booms.shift();
      }
      booms.push({ x: wx, y: wy, age: 0, duration: 0.45 });
      totalBooms += 1;
      frameNudgeTimer = 0.1;
    };

    const collectRainbowCoin = () => {
      const cx = QBLOCK_CENTER_X;
      const cy = coinY + 9;
      coinState = "NONE";
      coinTimer = 0;
      collectCount += 1;

      sparkles.push({ x: cx, y: cy, age: 0, duration: 0.4 });
      plusOnes.push({ x: cx - 9, y: coinY - 4, age: 0, duration: 0.65 });

      rainbowState = "RAINBOW";
      rainbowTimer = 0;
      trailSpawnAccum = 0;

      // During 15s rainbow mode he CANNOT be grabbed and his autonomous route keeps running
      if (isDragging) {
        isDragging = false;
        activePointerId = null;
        heroVx = 0;
        heroVy = 0;
        const surf = detectCurrentSurface();
        if (surf) {
          resumeFromCurrentSurface();
        } else {
          routePhase = "AIR_FALL";
        }
      } else if (routePhase === "WAIT_RESUME") {
        resumeFromCurrentSurface();
      }
    };

    // Fixed 60 Hz simulation step (dt = 1/60s)
    const stepPhysics = (dt: number) => {
      simTime += dt;
      const prevHeroX = heroX;
      const prevHeroY = heroY;

      // 1. Update Clouds (ambient animation paused if prefersReducedMotion)
      if (!prefersReducedMotion) {
        for (let i = 0; i < clouds.length; i++) {
          const c = clouds[i];
          c.x -= c.speed * dt;
          if (c.x < -c.w - 10) {
            c.x = WORLD_W + 10;
          }
        }
      }

      // 2. Update Chomper Plant (medium pipe x=407, clipped at y=134)
      // Forced hidden while hero stands on medium pipe or within 24px horizontally of it
      const isHeroNearMediumPipe =
        Math.abs(heroX - PIPE2_CENTER_X) <= 24 || plantRouteLock;

      if (prefersReducedMotion && plantPhase !== "FAST_RETRACT") {
        plantPhase = "HIDDEN";
        plantY = PLANT_CFG.hiddenTop;
        plantFrame = 1;
      } else {
        plantTimer += dt;
        if (plantPhase === "HIDDEN") {
          plantY = PLANT_CFG.hiddenTop;
          plantFrame = 1;
          if (isHeroNearMediumPipe) {
            plantTimer = Math.min(plantTimer, 0.5);
          } else if (plantTimer >= nextPlantHiddenWait) {
            nextPlantHiddenWait = 1.5; // reset to normal 1.5s rhythm
            plantPhase = "RISING";
            plantTimer = 0;
          }
        } else if (plantPhase === "RISING") {
          if (isHeroNearMediumPipe) {
            plantRetractStartY = plantY;
            plantPhase = "RETRACTING";
            plantTimer = 0;
          } else {
            const p = Math.min(1, plantTimer / 0.4);
            const easeOut = 1 - (1 - p) * (1 - p);
            plantY =
              PLANT_CFG.hiddenTop -
              (PLANT_CFG.hiddenTop - PLANT_CFG.raisedTop) * easeOut;
            plantFrame = p < 0.5 ? 1 : 2;
            if (plantTimer >= 0.4) {
              plantPhase = "CHOMPING";
              plantTimer = 0;
              plantY = PLANT_CFG.raisedTop;
            }
          }
        } else if (plantPhase === "CHOMPING") {
          if (isHeroNearMediumPipe) {
            plantRetractStartY = plantY;
            plantPhase = "RETRACTING";
            plantTimer = 0;
          } else {
            plantY = PLANT_CFG.raisedTop;
            // 1.2s at 6 fps: frames 3,2,3,2,3,2
            const stepIdx = Math.floor(plantTimer * 6);
            plantFrame = stepIdx % 2 === 0 ? 3 : 2;
            if (plantTimer >= 1.2) {
              plantRetractStartY = PLANT_CFG.raisedTop;
              plantPhase = "RETRACTING";
              plantTimer = 0;
            }
          }
        } else if (plantPhase === "RETRACTING") {
          const p = Math.min(1, plantTimer / 0.4);
          plantY =
            plantRetractStartY + (PLANT_CFG.hiddenTop - plantRetractStartY) * p;
          plantFrame = p < 0.25 ? 4 : 1;
          if (plantTimer >= 0.4) {
            plantPhase = "HIDDEN";
            plantTimer = 0;
            plantY = PLANT_CFG.hiddenTop;
            plantFrame = 1;
          }
        } else if (plantPhase === "FAST_RETRACT") {
          // Instant 150ms retract when tapped
          const p = Math.min(1, plantTimer / 0.15);
          plantY =
            plantRetractStartY + (PLANT_CFG.hiddenTop - plantRetractStartY) * p;
          plantFrame = 4;
          if (plantTimer >= 0.15) {
            plantPhase = "HIDDEN";
            plantTimer = 0;
            plantY = PLANT_CFG.hiddenTop;
            plantFrame = 1;
          }
        }
      }

      // 3. Update Question Block Bump (up 5px in 120ms ease-out and back in 120ms)
      if (bumpTimer >= 0) {
        bumpTimer += dt;
        if (bumpTimer >= 0.24) {
          bumpTimer = -1;
        }
      }

      // 4. Update Rainbow Coin (rise 450ms -> hover 5.0s -> sink 450ms)
      if (coinState !== "NONE") {
        coinTimer += dt;
        coinSpinTime += dt;
        const hoverTargetY = BLOCKS_Y - 30; // 58 (30px above block top 88)

        if (coinState === "RISING") {
          const p = Math.min(1, coinTimer / 0.45);
          const easeOut = 1 - (1 - p) * (1 - p);
          coinY = BLOCKS_Y - 30 * easeOut;
          if (coinTimer >= 0.45) {
            coinState = "HOVERING";
            coinTimer = 0;
            coinY = hoverTargetY;
          }
        } else if (coinState === "HOVERING") {
          coinY = hoverTargetY + Math.sin((coinTimer / 1.4) * Math.PI * 2) * 2;
          if (coinTimer >= 5.0) {
            coinState = "SINKING";
            coinTimer = 0;
          }
        } else if (coinState === "SINKING") {
          const p = Math.min(1, coinTimer / 0.45);
          coinY = hoverTargetY + 30 * (p * p);
          if (coinTimer >= 0.45) {
            coinState = "NONE";
            coinTimer = 0;
          }
        }
      }

      // 5. Update Hero Movement (Drag, Fall, Wait, or Autonomous Route)
      if (isDragging) {
        routePhase = "DRAGGING";
        activeBubble = "none";
        heroFrame = 14; // startled frame 14 WITHOUT bubble while held

        // Critically damped spring toward pointerTarget (omega = 32, max speed 600 px/s)
        const omega = 32;
        const dxTarget = pointerTargetX - heroX;
        const dyTarget = pointerTargetY - heroY;
        if (Math.abs(dxTarget) > 1.5) {
          facing = dxTarget >= 0 ? 1 : -1;
          resumeLastDir = facing;
        }

        const ax = omega * omega * dxTarget - 2 * omega * heroVx;
        const ay = omega * omega * dyTarget - 2 * omega * heroVy;
        heroVx += ax * dt;
        heroVy += ay * dt;

        const speed = Math.hypot(heroVx, heroVy);
        if (speed > 600) {
          const scale = 600 / speed;
          heroVx *= scale;
          heroVy *= scale;
        }

        const stepDx = heroVx * dt;
        const stepDy = heroVy * dt;
        const upSpeed = Math.max(-heroVy, (heroY - pointerTargetY) * 14);
        const res = moveHeroWithCollisions(stepDx, stepDy, upSpeed);
        if (res.hitWall) heroVx = 0;
        if (res.hitCeiling || res.landedOn) heroVy = 0;
      } else if (routePhase === "AIR_FALL") {
        activeBubble = "none";
        heroVy = Math.min(TERMINAL_VEL_Y, heroVy + GRAVITY * dt);
        const upSpeed = heroVy < 0 ? -heroVy : 0;
        const res = moveHeroWithCollisions(heroVx * dt, heroVy * dt, upSpeed);
        heroFrame = heroVy < 0 ? 7 : 8;

        if (res.hitWall) heroVx = 0;
        if (res.hitCeiling && heroVy < 0) heroVy = 0;

        if (res.landedOn) {
          heroVx = 0;
          heroVy = 0;
          heroFrame = 0;
          if (rainbowState === "RAINBOW") {
            // In rainbow mode keep autonomous route running immediately
            resumeFromCurrentSurface();
          } else {
            routePhase = "WAIT_RESUME";
            waitResumeTimer = 0;
          }
        }
      } else if (routePhase === "WAIT_RESUME") {
        activeBubble = "none";
        // Ensure still supported by surface
        const surf = detectCurrentSurface();
        if (!surf) {
          routePhase = "AIR_FALL";
        } else {
          waitResumeTimer += dt;
          heroFrame = Math.floor(waitResumeTimer / 0.3) % 2 === 0 ? 0 : 1;
          if (waitResumeTimer >= 2.5 || rainbowState === "RAINBOW") {
            resumeFromCurrentSurface();
          }
        }
      } else if (prefersReducedMotion) {
        // Reduced motion static ambient pose on ground
        heroY = GROUND_Y;
        heroFrame = 0;
        activeBubble = "none";
      } else {
        // AUTONOMOUS ROUTE (Steps 1..8)
        phaseTimer += dt;

        const evalHopPosition = (tNorm: number) => {
          const t = Math.max(0, Math.min(1, tNorm));
          const x = hopX0 + (hopX1 - hopX0) * t;
          let y: number;
          if (t < 0.5) {
            const u = t / 0.5;
            const easeOut = 1 - (1 - u) * (1 - u);
            y = hopY0 + (hopApexY - hopY0) * easeOut;
          } else {
            const v = (t - 0.5) / 0.5;
            const easeIn = v * v;
            y = hopApexY + (hopY1 - hopApexY) * easeIn;
          }
          const frame = t < 0.16 ? 9 : t < 0.52 ? 7 : 8;
          return { x, y, frame };
        };

        switch (routePhase) {
          case "STEP1_LEFT_IDLE": {
            heroX = farLeftWalkX;
            heroY = GROUND_Y;
            facing = 1;
            activeBubble = "none";
            heroFrame = Math.floor(phaseTimer / 0.3) % 2 === 0 ? 0 : 1;
            if (phaseTimer >= 0.6) {
              routePhase = "STEP2_WALK_RIGHT";
              phaseTimer = 0;
              walkAnimTime = 0;
            }
            break;
          }

          case "STEP2_WALK_RIGHT": {
            facing = 1;
            activeBubble = "none";
            heroY = GROUND_Y;
            heroX += WALK_SPEED * dt;
            walkAnimTime += dt;
            heroFrame = WALK_FRAMES[Math.floor(walkAnimTime * WALK_FPS) % 4];
            if (heroX >= PIPE1_GROUND_TAKEOFF_X) {
              heroX = PIPE1_GROUND_TAKEOFF_X;
              routePhase = "STEP2_PRE_HOP_P1";
              phaseTimer = 0;
              heroFrame = 0;
            }
            break;
          }

          case "STEP2_PRE_HOP_P1": {
            heroX = PIPE1_GROUND_TAKEOFF_X;
            heroY = GROUND_Y;
            facing = 1;
            activeBubble = "none";
            heroFrame = Math.floor(phaseTimer / 0.3) % 2 === 0 ? 0 : 1;
            if (phaseTimer >= 0.6) {
              startHop(
                PIPE1_GROUND_TAKEOFF_X,
                GROUND_Y,
                PIPE1_CENTER_X,
                PIPE1_SURF_Y,
                "STEP3_P1_BEAT",
                1
              );
              routePhase = "STEP2_HOP_TO_P1";
            }
            break;
          }

          case "STEP2_HOP_TO_P1": {
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = PIPE1_CENTER_X;
              heroY = PIPE1_SURF_Y;
              phaseTimer = 0;
              // Step 3: On pipe 1, if plant is up or rising, show startled 0.9s then look
              if (plantPhase !== "HIDDEN" || plantTimer >= 0.95) {
                if (plantPhase === "HIDDEN") {
                  plantPhase = "RISING";
                  plantTimer = 0;
                }
                routePhase = "STEP3_P1_STARTLED";
                heroFrame = 14;
                activeBubble = "exclaim";
              } else {
                plantRouteLock = true;
                routePhase = "STEP3_P1_BEAT";
                heroFrame = 10;
              }
            }
            break;
          }

          case "STEP3_P1_STARTLED": {
            heroX = PIPE1_CENTER_X;
            heroY = PIPE1_SURF_Y;
            facing = 1;
            heroFrame = 14;
            activeBubble = "exclaim";
            if (plantPhase === "HIDDEN") {
              plantRouteLock = true;
            }
            if (phaseTimer >= 0.9) {
              routePhase = "STEP3_P1_LOOK";
              phaseTimer = 0;
              heroFrame = 12;
              activeBubble = "none";
            }
            break;
          }

          case "STEP3_P1_LOOK": {
            heroX = PIPE1_CENTER_X;
            heroY = PIPE1_SURF_Y;
            facing = 1;
            heroFrame = 12;
            activeBubble = "none";
            if (plantPhase === "HIDDEN") {
              plantRouteLock = true;
              routePhase = "STEP3_P1_BEAT";
              phaseTimer = 0;
              heroFrame = 10;
            } else {
              phaseTimer = 0;
            }
            break;
          }

          case "STEP3_P1_BEAT": {
            plantRouteLock = true;
            heroX = PIPE1_CENTER_X;
            heroY = PIPE1_SURF_Y;
            facing = 1;
            heroFrame = 10;
            activeBubble = "none";
            if (phaseTimer >= 0.6) {
              startHop(
                PIPE1_CENTER_X,
                PIPE1_SURF_Y,
                PIPE2_CENTER_X,
                PIPE2_SURF_Y,
                "STEP4_P2_BEAT",
                1
              );
              routePhase = "STEP4_HOP_P1_TO_P2";
            }
            break;
          }

          case "STEP4_HOP_P1_TO_P2": {
            plantRouteLock = true;
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = PIPE2_CENTER_X;
              heroY = PIPE2_SURF_Y;
              routePhase = "STEP4_P2_BEAT";
              phaseTimer = 0;
              heroFrame = 10;
            }
            break;
          }

          case "STEP4_P2_BEAT": {
            plantRouteLock = true;
            heroX = PIPE2_CENTER_X;
            heroY = PIPE2_SURF_Y;
            facing = 1;
            heroFrame = 10;
            activeBubble = "none";
            // Hop to pipe 2, then immediately to pipe 3
            if (phaseTimer >= 0.14) {
              startHop(
                PIPE2_CENTER_X,
                PIPE2_SURF_Y,
                PIPE3_CENTER_X,
                PIPE3_SURF_Y,
                "STEP5_P3_CONFUSED",
                1
              );
              routePhase = "STEP4_HOP_P2_TO_P3";
            }
            break;
          }

          case "STEP4_HOP_P2_TO_P3": {
            plantRouteLock = true;
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = PIPE3_CENTER_X;
              heroY = PIPE3_SURF_Y;
              routePhase = "STEP5_P3_CONFUSED";
              phaseTimer = 0;
              facing = 1;
              heroFrame = 11;
              activeBubble = "question";
              plantRouteLock = false;
            }
            break;
          }

          case "STEP5_P3_CONFUSED": {
            // Step 5: On pipe 3: CONFUSED (frame 11 + question bubble) facing RIGHT for 2.5s
            heroX = PIPE3_CENTER_X;
            heroY = PIPE3_SURF_Y;
            facing = 1;
            heroFrame = 11;
            activeBubble = "question";
            if (phaseTimer >= 2.5) {
              routePhase = "STEP5_P3_BEAT";
              phaseTimer = 0;
              activeBubble = "none";
              heroFrame = 0;
            }
            break;
          }

          case "STEP5_P3_BEAT": {
            heroX = PIPE3_CENTER_X;
            heroY = PIPE3_SURF_Y;
            facing = -1;
            activeBubble = "none";
            heroFrame = Math.floor(phaseTimer / 0.3) % 2 === 0 ? 0 : 1;
            if (phaseTimer >= 0.6) {
              routePhase = "STEP6_P3_WAIT_PLANT";
              phaseTimer = 0;
            }
            break;
          }

          case "STEP6_P3_WAIT_PLANT": {
            // Step 6: hop to pipe 2 only when plant is hidden (otherwise wait on pipe 3 in look pose)
            heroX = PIPE3_CENTER_X;
            heroY = PIPE3_SURF_Y;
            facing = -1;
            activeBubble = "none";
            if (plantPhase !== "HIDDEN") {
              heroFrame = 12; // look pose
              phaseTimer = 0;
            } else {
              plantRouteLock = true;
              heroFrame = 10;
              if (phaseTimer >= 0.15) {
                startHop(
                  PIPE3_CENTER_X,
                  PIPE3_SURF_Y,
                  PIPE2_CENTER_X,
                  PIPE2_SURF_Y,
                  "STEP6_P2_BEAT",
                  -1
                );
                routePhase = "STEP6_HOP_P3_TO_P2";
              }
            }
            break;
          }

          case "STEP6_HOP_P3_TO_P2": {
            plantRouteLock = true;
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = PIPE2_CENTER_X;
              heroY = PIPE2_SURF_Y;
              routePhase = "STEP6_P2_BEAT";
              phaseTimer = 0;
              heroFrame = 10;
            }
            break;
          }

          case "STEP6_P2_BEAT": {
            plantRouteLock = true;
            heroX = PIPE2_CENTER_X;
            heroY = PIPE2_SURF_Y;
            facing = -1;
            heroFrame = 10;
            activeBubble = "none";
            if (phaseTimer >= 0.35) {
              startHop(
                PIPE2_CENTER_X,
                PIPE2_SURF_Y,
                PIPE1_CENTER_X,
                PIPE1_SURF_Y,
                "STEP6_P1_BEAT",
                -1
              );
              routePhase = "STEP6_HOP_P2_TO_P1";
            }
            break;
          }

          case "STEP6_HOP_P2_TO_P1": {
            plantRouteLock = true;
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = PIPE1_CENTER_X;
              heroY = PIPE1_SURF_Y;
              routePhase = "STEP6_P1_BEAT";
              phaseTimer = 0;
              heroFrame = 10;
              plantRouteLock = false;
            }
            break;
          }

          case "STEP6_P1_BEAT": {
            heroX = PIPE1_CENTER_X;
            heroY = PIPE1_SURF_Y;
            facing = -1;
            heroFrame = 10;
            activeBubble = "none";
            if (phaseTimer >= 0.4) {
              startHop(
                PIPE1_CENTER_X,
                PIPE1_SURF_Y,
                PIPE1_GROUND_TAKEOFF_X,
                GROUND_Y,
                "STEP6_GROUND_BEAT",
                -1
              );
              routePhase = "STEP6_HOP_P1_TO_GROUND";
            }
            break;
          }

          case "STEP6_HOP_P1_TO_GROUND": {
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = PIPE1_GROUND_TAKEOFF_X;
              heroY = GROUND_Y;
              routePhase = "STEP6_GROUND_BEAT";
              phaseTimer = 0;
              heroFrame = 0;
            }
            break;
          }

          case "STEP6_GROUND_BEAT": {
            heroX = PIPE1_GROUND_TAKEOFF_X;
            heroY = GROUND_Y;
            facing = -1;
            activeBubble = "none";
            heroFrame = Math.floor(phaseTimer / 0.3) % 2 === 0 ? 0 : 1;
            if (phaseTimer >= 0.6) {
              routePhase = "STEP7_WALK_LEFT";
              phaseTimer = 0;
              walkAnimTime = 0;
            }
            break;
          }

          case "STEP7_WALK_LEFT": {
            facing = -1;
            activeBubble = "none";
            heroY = GROUND_Y;
            heroX -= WALK_SPEED * dt;
            walkAnimTime += dt;
            heroFrame = WALK_FRAMES[Math.floor(walkAnimTime * WALK_FPS) % 4];
            if (heroX <= farLeftWalkX) {
              heroX = farLeftWalkX;
              routePhase = "STEP7_LEFT_CONFUSED";
              phaseTimer = 0;
              facing = -1; // MUST face LEFT while confused at far-left dead end!
              heroFrame = 11;
              activeBubble = "question";
            }
            break;
          }

          case "STEP7_LEFT_CONFUSED": {
            heroX = farLeftWalkX;
            heroY = GROUND_Y;
            facing = -1; // faces LEFT
            heroFrame = 11;
            activeBubble = "question";
            if (phaseTimer >= 2.5) {
              routePhase = "STEP8_LEFT_BEAT";
              phaseTimer = 0;
              activeBubble = "none";
              heroFrame = 0;
            }
            break;
          }

          case "STEP8_LEFT_BEAT": {
            heroX = farLeftWalkX;
            heroY = GROUND_Y;
            facing = 1;
            activeBubble = "none";
            heroFrame = Math.floor(phaseTimer / 0.3) % 2 === 0 ? 0 : 1;
            if (phaseTimer >= 0.6) {
              loopCount += 1;
              routePhase = "STEP2_WALK_RIGHT";
              phaseTimer = 0;
              walkAnimTime = 0;
            }
            break;
          }

          case "HOP_BLOCKS_TO_GROUND": {
            activeBubble = "none";
            const { x, y, frame } = evalHopPosition(phaseTimer / HOP_DURATION);
            heroX = x;
            heroY = y;
            heroFrame = frame;
            if (phaseTimer >= HOP_DURATION) {
              heroX = hopX1;
              heroY = GROUND_Y;
              phaseTimer = 0;
              walkAnimTime = 0;
              if (heroX > 256 && resumeLastDir < 0) {
                routePhase = "STEP7_WALK_LEFT";
                facing = -1;
              } else {
                routePhase = "STEP2_WALK_RIGHT";
                facing = 1;
              }
            }
            break;
          }
        }
      }

      // 6. Check Coin Collection Overlap (24x30 forgiving box around coin center once emerged above block)
      if (coinState !== "NONE" && coinY <= BLOCKS_Y - 16) {
        const coinCx = QBLOCK_CENTER_X; // 256
        const coinCy = coinY + 9;
        const heroLeft = heroX - HITBOX_HALF_W;
        const heroRight = heroX + HITBOX_HALF_W;
        const heroTop = heroY - HITBOX_H;
        const heroBot = heroY;

        if (
          heroTop < BLOCKS_BOTTOM_Y - 2 &&
          heroRight >= coinCx - 12 &&
          heroLeft <= coinCx + 12 &&
          heroBot >= coinCy - 15 &&
          heroTop <= coinCy + 15
        ) {
          collectRainbowCoin();
        }
      }

      // 7. Update Rainbow Mode (15s) & Blink (1s) & Light Trail Ghosts
      if (rainbowState === "RAINBOW") {
        rainbowTimer += dt;
        const movedDist = Math.hypot(heroX - prevHeroX, heroY - prevHeroY);
        if (movedDist > 0.05) {
          trailSpawnAccum += dt;
          if (trailSpawnAccum >= 0.05) {
            trailSpawnAccum -= 0.05;
            const currentRow = Math.floor(rainbowTimer * 8) % 3;
            trailGhosts.push({
              x: heroX,
              y: heroY,
              frame: heroFrame,
              facing,
              row: currentRow,
              age: 0,
              maxAge: 0.4,
            });
          }
        }
        if (rainbowTimer >= 15.0) {
          rainbowState = "BLINK";
          rainbowTimer = 0;
        }
      } else if (rainbowState === "BLINK") {
        rainbowTimer += dt;
        if (rainbowTimer >= 1.0) {
          rainbowState = "NONE";
          rainbowTimer = 0;
        }
      }

      for (let i = trailGhosts.length - 1; i >= 0; i--) {
        trailGhosts[i].age += dt;
        if (trailGhosts[i].age >= trailGhosts[i].maxAge) {
          trailGhosts.splice(i, 1);
        }
      }

      // 8. Update Booms, Sparkles, +1, and Frame Nudge
      for (let i = booms.length - 1; i >= 0; i--) {
        booms[i].age += dt;
        if (booms[i].age >= booms[i].duration) {
          booms.splice(i, 1);
        }
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        sparkles[i].age += dt;
        if (sparkles[i].age >= sparkles[i].duration) {
          sparkles.splice(i, 1);
        }
      }
      for (let i = plusOnes.length - 1; i >= 0; i--) {
        plusOnes[i].age += dt;
        if (plusOnes[i].age >= plusOnes[i].duration) {
          plusOnes.splice(i, 1);
        }
      }
      if (frameNudgeTimer > 0) {
        frameNudgeTimer = Math.max(0, frameNudgeTimer - dt);
      }
    };

    // Render world onto native (Wn x 216) canvas
    const renderScene = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, wn, WORLD_H);

      // 1. Stepped Sky Bands (#5C94FC to #A6C8FF)
      const skyBands = [
        { y: 0, h: 44, color: "#5C94FC" },
        { y: 44, h: 43, color: "#6EA2FC" },
        { y: 87, h: 43, color: "#82B0FD" },
        { y: 130, h: 43, color: "#94BCFE" },
        { y: 173, h: 43, color: "#A6C8FF" },
      ];
      for (let i = 0; i < skyBands.length; i++) {
        ctx.fillStyle = skyBands[i].color;
        ctx.fillRect(0, skyBands[i].y, wn, skyBands[i].h);
      }

      ctx.save();
      ctx.translate(-viewLeft, 0);

      // 2. Drifting Clouds
      const cloudMap: Record<CloudDef["key"], HTMLImageElement> = {
        "cloud-xs": images.cloudXs,
        "cloud-s": images.cloudS,
        "cloud-m": images.cloudM,
        "cloud-l": images.cloudL,
      };
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        const cImg = cloudMap[c.key];
        if (cImg && cImg.complete && cImg.naturalWidth > 0) {
          ctx.drawImage(cImg, Math.round(c.x), Math.round(c.y), c.w, c.h);
        }
      }

      // 3. Distant Hills Parallax (bg-hills-far.png)
      if (images.hillsFar?.complete && images.hillsFar.naturalWidth > 0) {
        const hillsOffset = -Math.round((simTime * 1.5) % 768);
        ctx.drawImage(images.hillsFar, hillsOffset, 0, 768, 216);
        ctx.drawImage(images.hillsFar, hillsOffset + 768, 0, 768, 216);
      }

      // 4. Console Back (480x216: ground, near hills, rainbow, grounded bushes)
      if (images.consoleBack?.complete && images.consoleBack.naturalWidth > 0) {
        ctx.drawImage(images.consoleBack, 0, 0, WORLD_W, WORLD_H);
      }

      // 5. Block Row: Draw Rainbow Coin BEFORE blocks so it emerges from behind them
      if (coinState !== "NONE" && images.rainbowCoin?.complete && images.rainbowCoin.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(QBLOCK_X - 8, 0, 32, BLOCKS_BOTTOM_Y);
        ctx.clip();
        const coinFrame = Math.floor(coinSpinTime * 8) % 4;
        ctx.drawImage(
          images.rainbowCoin,
          coinFrame * 14,
          0,
          14,
          18,
          QBLOCK_CENTER_X - 7,
          Math.round(coinY),
          14,
          18
        );
        ctx.restore();
      }

      // Draw 5 blocks at y=88: x=216, 232, 248(?), 264, 280
      for (let i = 0; i < 5; i++) {
        const bx = BLOCKS_ROW.x + i * BLOCKS_ROW.tile;
        const isQ = i === 2;
        let by = BLOCKS_Y;
        let bImg = images.brick;

        if (isQ) {
          if (bumpTimer >= 0) {
            bImg = images.qblock2;
            if (bumpTimer < 0.12) {
              const p = bumpTimer / 0.12;
              const easeOut = 1 - (1 - p) * (1 - p);
              by = BLOCKS_Y - Math.round(5 * easeOut);
            } else {
              const p = (bumpTimer - 0.12) / 0.12;
              by = BLOCKS_Y - Math.round(5 * (1 - p));
            }
          } else {
            bImg = images.qblock1;
          }
        }

        if (bImg?.complete && bImg.naturalWidth > 0) {
          ctx.drawImage(bImg, bx, by, 16, 16);
        }
      }

      // 6. Chomper Plant (behind pipes, clipped at y=134)
      if (plantPhase !== "HIDDEN" && plantY < PLANT_CFG.clipY) {
        const pImg = images[`plant${plantFrame}`];
        if (pImg?.complete && pImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(PLANT_CFG.x - 4, 0, 40, PLANT_CFG.clipY);
          ctx.clip();
          ctx.drawImage(pImg, PLANT_CFG.x, Math.round(plantY), 32, 64);
          ctx.restore();
        }
      }

      // 7. Three Pipes
      if (images.pipeShort?.complete && images.pipeShort.naturalWidth > 0) {
        ctx.drawImage(images.pipeShort, PIPE1.x, PIPE1.top, 34, 32);
      }
      if (images.pipeMedium?.complete && images.pipeMedium.naturalWidth > 0) {
        ctx.drawImage(images.pipeMedium, PIPE2.x, PIPE2.top, 34, 48);
      }
      if (images.pipeTall?.complete && images.pipeTall.naturalWidth > 0) {
        ctx.drawImage(images.pipeTall, PIPE3.x, PIPE3.top, 34, 64);
      }

      // 8. Hero Rainbow Light Trail Ghosts
      if (trailGhosts.length > 0 && images.heroRainbow?.complete && images.heroRainbow.naturalWidth > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < trailGhosts.length; i++) {
          const g = trailGhosts[i];
          const alpha = 0.5 * Math.max(0, 1 - g.age / g.maxAge);
          const driftY = g.y - g.age * 12;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(Math.round(g.x), Math.round(driftY - HERO_FEET_Y));
          ctx.scale(g.facing, 1);
          ctx.drawImage(
            images.heroRainbow,
            g.frame * HERO_FRAME_W,
            g.row * HERO_FRAME_H,
            HERO_FRAME_W,
            HERO_FRAME_H,
            -HERO_CENTER_X,
            0,
            HERO_FRAME_W,
            HERO_FRAME_H
          );
          ctx.restore();
        }
        ctx.restore();
      }

      // 9. Hero Sprite (devj-sheet-nobubble.png or devj-rainbow-sheet.png)
      const useRainbowSheet = rainbowState === "RAINBOW";
      const sheetImg = useRainbowSheet ? images.heroRainbow : images.heroSheet;
      if (sheetImg?.complete && sheetImg.naturalWidth > 0) {
        ctx.save();
        if (rainbowState === "BLINK") {
          // 10 Hz toggle between 0.25 and 1.0
          const blinkOn = Math.floor(rainbowTimer * 20) % 2 === 0;
          ctx.globalAlpha = blinkOn ? 0.25 : 1.0;
        }
        const drawX = Math.round(heroX);
        const drawY = Math.round(heroY - HERO_FEET_Y);
        ctx.translate(drawX, drawY);
        ctx.scale(facing, 1);

        const rowY = useRainbowSheet ? (Math.floor(rainbowTimer * 8) % 3) * HERO_FRAME_H : 0;
        ctx.drawImage(
          sheetImg,
          heroFrame * HERO_FRAME_W,
          rowY,
          HERO_FRAME_W,
          HERO_FRAME_H,
          -HERO_CENTER_X,
          0,
          HERO_FRAME_W,
          HERO_FRAME_H
        );
        ctx.restore();
      }

      // 10. Separate Speech Bubble (NEVER mirrored!)
      if (activeBubble !== "none" && !isDragging) {
        const bImg = activeBubble === "question" ? images.bubbleQ : images.bubbleEx;
        if (bImg?.complete && bImg.naturalWidth > 0) {
          const bob = Math.round(Math.sin(simTime * 6) * 2);
          // 10px toward the facing side and 8px above the head
          const bx = Math.round(heroX + facing * 10 - 6);
          const by = Math.round(heroY - 42 - 8 - 15 + bob);
          ctx.drawImage(bImg, bx, Math.max(2, by), 12, 15);
        }
      }

      // 11. Effects: Sparkles, +1, and Tap Booms
      for (let i = 0; i < sparkles.length; i++) {
        const sp = sparkles[i];
        const fIdx = Math.min(4, Math.floor((sp.age / sp.duration) * 4) + 1);
        const sImg = images[`sparkle${fIdx}`];
        if (sImg?.complete && sImg.naturalWidth > 0) {
          ctx.drawImage(sImg, Math.round(sp.x - 12), Math.round(sp.y - 12), 24, 24);
        }
      }

      for (let i = 0; i < plusOnes.length; i++) {
        const po = plusOnes[i];
        if (images.plus1?.complete && images.plus1.naturalWidth > 0) {
          const p = po.age / po.duration;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - p);
          ctx.drawImage(
            images.plus1,
            Math.round(po.x),
            Math.round(po.y - p * 18),
            19,
            13
          );
          ctx.restore();
        }
      }

      for (let i = 0; i < booms.length; i++) {
        const bm = booms[i];
        const fIdx = Math.min(5, Math.floor((bm.age / bm.duration) * 5) + 1);
        const eImg = images[`exp${fIdx}`];
        if (eImg?.complete && eImg.naturalWidth > 0) {
          // 36x36 in world space = 72x72 CSS px at K=2, centered on tap
          ctx.drawImage(eImg, Math.round(bm.x - 18), Math.round(bm.y - 18), 36, 36);
        }
      }

      ctx.restore();

      // Update transparent grab handle position & cursor
      const isGrabbable = rainbowState !== "RAINBOW";
      const handleW = Math.max(44, 36 * scaleK);
      const handleH = Math.max(44, 50 * scaleK);
      const heroScreenCenterX = (heroX - viewLeft) * scaleK;
      const heroScreenCenterY = (heroY - 24) * scaleK;
      const hLeft = Math.round(heroScreenCenterX - handleW / 2);
      const hTop = Math.round(heroScreenCenterY - handleH / 2);

      grabHandle.style.width = `${handleW}px`;
      grabHandle.style.height = `${handleH}px`;
      grabHandle.style.transform = `translate3d(${hLeft}px, ${hTop}px, 0)`;
      grabHandle.style.pointerEvents = isGrabbable ? "auto" : "none";
      grabHandle.style.cursor = !isGrabbable
        ? "default"
        : isDragging
        ? "grabbing"
        : "grab";

      // Frame 2px nudge on boom
      if (frameNudgeTimer > 0) {
        const nudgePx = Math.sin((frameNudgeTimer / 0.1) * Math.PI) * 2;
        frameEl.style.transform = `translate3d(0, ${nudgePx.toFixed(1)}px, 0)`;
      } else {
        frameEl.style.transform = "translate3d(0, 0, 0)";
      }

      // Update telemetry attributes for automated verification
      frameEl.dataset.heroPhase = routePhase;
      frameEl.dataset.heroX = String(Math.round(heroX));
      frameEl.dataset.heroY = String(Math.round(heroY));
      frameEl.dataset.heroFacing = String(facing);
      frameEl.dataset.heroFrame = String(heroFrame);
      frameEl.dataset.bubble = activeBubble;
      frameEl.dataset.plantPhase = plantPhase;
      frameEl.dataset.plantY = String(Math.round(plantY));
      frameEl.dataset.plantNextWait = String(nextPlantHiddenWait);
      frameEl.dataset.coinState = coinState;
      frameEl.dataset.coinY = String(Math.round(coinY));
      frameEl.dataset.rainbowState = rainbowState;
      frameEl.dataset.rainbowTimer = rainbowTimer.toFixed(2);
      frameEl.dataset.trailCount = String(trailGhosts.length);
      frameEl.dataset.grabbable = String(isGrabbable);
      frameEl.dataset.boomCount = String(booms.length);
      frameEl.dataset.totalBooms = String(totalBooms);
      frameEl.dataset.bumpCount = String(bumpCount);
      frameEl.dataset.collectCount = String(collectCount);
      frameEl.dataset.loopCount = String(loopCount);
      frameEl.dataset.wn = String(wn);
      frameEl.dataset.scaleK = String(scaleK);
      frameEl.dataset.viewLeft = String(viewLeft);
      frameEl.dataset.solidPenetrationCount = String(solidPenetrationCount);
    };

    // Convert client (x, y) to world (wx, wy)
    const clientToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const wx = viewLeft + (clientX - rect.left) / scaleK;
      const wy = (clientY - rect.top) / scaleK;
      return { wx, wy };
    };

    // Pointer Events on Hero Grab Handle
    const onHandlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (rainbowState === "RAINBOW") return; // Not grabbable in rainbow mode

      e.stopPropagation();
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);

      isDragging = true;
      activePointerId = e.pointerId;
      grabOffsetX = 0;
      grabOffsetY = 20;
      pointerTargetX = Math.max(minHeroX, Math.min(maxHeroX, wx + grabOffsetX));
      pointerTargetY = Math.max(HITBOX_H, Math.min(GROUND_Y, wy + grabOffsetY));
      heroVx = 0;
      heroVy = 0;
      plantRouteLock = false;

      try {
        grabHandle.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);
      pointerTargetX = Math.max(minHeroX, Math.min(maxHeroX, wx + grabOffsetX));
      pointerTargetY = Math.max(HITBOX_H, Math.min(GROUND_Y, wy + grabOffsetY));
    };

    const endDrag = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      isDragging = false;
      activePointerId = null;
      try {
        if (grabHandle.hasPointerCapture(e.pointerId)) {
          grabHandle.releasePointerCapture(e.pointerId);
        }
      } catch {}

      // Keep modest throw velocity so upward throws can also bump the ? block
      heroVx = Math.max(-180, Math.min(180, heroVx * 0.35));
      heroVy = Math.max(-260, Math.min(260, heroVy * 0.45));

      const surf = detectCurrentSurface();
      if (surf && heroVy >= 0) {
        heroVx = 0;
        heroVy = 0;
        heroFrame = 0;
        routePhase = "WAIT_RESUME";
        waitResumeTimer = 0;
      } else {
        routePhase = "AIR_FALL";
      }
    };

    // Pointer Events on Canvas (Tap Plant or Tap Elsewhere for Boom)
    const onCanvasPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);

      // 1. Check if tapping the hero while in rainbow mode -> Rule 7: does nothing
      if (
        wx >= heroX - 18 &&
        wx <= heroX + 18 &&
        wy >= heroY - 48 &&
        wy <= heroY
      ) {
        if (rainbowState === "RAINBOW") {
          return;
        }
      }

      // 2. Check if tapping the Chomper Plant (visible rect + 10px, not forced hidden)
      const isForcedHidden =
        Math.abs(heroX - PIPE2_CENTER_X) <= 24 || plantRouteLock;
      const isPlantVisible =
        plantPhase !== "HIDDEN" &&
        plantPhase !== "FAST_RETRACT" &&
        plantY < PLANT_CFG.clipY &&
        !isForcedHidden;

      if (isPlantVisible) {
        const pLeft = PLANT_CFG.x - 10;
        const pRight = PLANT_CFG.x + 32 + 10;
        const pTop = plantY - 10;
        const pBot = PLANT_CFG.clipY + 10;
        if (wx >= pLeft && wx <= pRight && wy >= pTop && wy <= pBot) {
          plantRetractStartY = plantY;
          plantPhase = "FAST_RETRACT";
          plantTimer = 0;
          nextPlantHiddenWait = 4.0; // NEXT hidden period is 4s instead of 1.5s
          spawnBoom(PLANT_CFG.x + 16, Math.min(124, plantY + 14), true);
          return;
        }
      }

      // 3. Tap anywhere else -> spawn small boom
      if (wx >= viewLeft && wx <= WORLD_W && wy >= 0 && wy <= WORLD_H) {
        spawnBoom(wx, wy, false);
      }
    };

    grabHandle.addEventListener("pointerdown", onHandlePointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    grabHandle.addEventListener("lostpointercapture", endDrag);
    canvas.addEventListener("pointerdown", onCanvasPointerDown);

    // Fixed 60 Hz timestep loop with accumulator
    const FIXED_DT = 1 / 60;
    let accumulator = 0;
    let lastNow = performance.now();
    let rafId: number | null = null;
    let isSectionVisible = true;
    let isTabVisible = !document.hidden;

    const tick = (now: number) => {
      if (!isSectionVisible || !isTabVisible) {
        rafId = null;
        return;
      }
      const frameDt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      accumulator += frameDt;

      let subSteps = 0;
      while (accumulator >= FIXED_DT && subSteps < 8) {
        stepPhysics(FIXED_DT);
        accumulator -= FIXED_DT;
        subSteps += 1;
      }

      renderScene();
      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafId === null && isSectionVisible && isTabVisible) {
        lastNow = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // Pause when section is off-screen
    const io = new IntersectionObserver(
      (entries) => {
        isSectionVisible = Boolean(entries[0]?.isIntersecting);
        if (isSectionVisible) startLoop();
        else stopLoop();
      },
      { threshold: 0 }
    );
    io.observe(frameEl);

    // Pause when tab is hidden
    const onVisChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) startLoop();
      else stopLoop();
    };
    document.addEventListener("visibilitychange", onVisChange);

    renderScene();
    startLoop();

    return () => {
      stopLoop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisChange);
      grabHandle.removeEventListener("pointerdown", onHandlePointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      grabHandle.removeEventListener("lostpointercapture", endDrag);
      canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    };
  }, [layoutState.k, layoutState.wn, prefersReducedMotion]);

  const cssWidth = layoutState.wn * layoutState.k;
  const cssHeight = WORLD_H * layoutState.k;

  return (
    <section
      id="jenis"
      aria-labelledby="jenis-heading"
      className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8 lg:py-10 border-t border-rule scroll-mt-24"
    >
      <motion.h2
        id="jenis-heading"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-obsidian mb-5 lg:mb-6 leading-tight"
      >
        Beberapa contoh website yang bisa kubuat
      </motion.h2>

      {/* Desktop: grid minmax(0,1fr) 340px, gap 40px, align-items:center */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-7 lg:gap-[40px] items-center">
        {/* LEFT: Wide Landscape Interactive Mario Console (.mario-zone) */}
        <div className="w-full flex flex-col items-start">
          <div className="mario-zone max-w-full">
            <div
              ref={frameRef}
              aria-hidden="true"
              className="mario-console-frame mario-box-lg relative overflow-hidden bg-[#5C94FC] select-none"
              style={{
                width: cssWidth + 8, // +8px for 4px left/right border
                height: cssHeight + 8, // +8px for 4px top/bottom border
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
            >
              <canvas
                ref={canvasRef}
                width={layoutState.wn}
                height={WORLD_H}
                className="pixel-art block"
                style={{
                  width: cssWidth,
                  height: cssHeight,
                  imageRendering: "pixelated",
                  touchAction: "auto",
                }}
              />

              {/* Dedicated Hero Drag Handle (at least 44x44 CSS px, touch-action: none) */}
              <div
                ref={grabHandleRef}
                data-hero-handle="true"
                className="absolute top-0 left-0 z-10"
                style={{
                  width: Math.max(44, 36 * layoutState.k),
                  height: Math.max(44, 50 * layoutState.k),
                  touchAction: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  cursor: "grab",
                }}
              />
            </div>
          </div>

          <p className="text-[12px] text-muted mt-3 select-none">
            Coba seret Mario ke blok tanda tanya.
          </p>
        </div>

        {/* RIGHT: Compact List (no cards, no icons, no buttons) */}
        <div className="w-full lg:w-[340px] lg:justify-self-end">
          <div className="space-y-[14px]">
            {services.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: idx * 0.06,
                  ease: "easeOut",
                }}
                className="flex items-start gap-3"
              >
                <span
                  className="text-primary text-[12px] font-normal shrink-0 pt-[3px] leading-none"
                  style={{ fontFamily: "var(--font-press-start-2p)" }}
                >
                  {service.number}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-obsidian text-[15px] lg:text-[16px] leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5 leading-[1.45] line-clamp-2">
                    {service.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
