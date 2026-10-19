"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { services } from "@/data/services";
import levelData from "../../public/environment/level-data.json";
import plantRigData from "../../public/environment/plant-rig.json";
import {
  isSfxMuted,
  playBoomSfx,
  playCoinKling,
  playCrunchSfx,
  toggleSfxMuted,
} from "@/lib/sfx";

// World & Object Constants from level-data.json -> console & plant-rig.json
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
const HEAD_CELL = plantRigData.head.cell; // 88
const HEAD_PIVOT_X = plantRigData.head.pivot[0]; // 44
const HEAD_PIVOT_Y = plantRigData.head.pivot[1]; // 44

// Mouth pivot P0 = center of the medium pipe's top lip (x=423, y=124)
const P0_X = PIPE2_CENTER_X; // 423
const P0_Y = PIPE2.top + 2; // 124
const PLANT_RAISED_PIVOT_Y = P0_Y - 30; // 94
const PLANT_HIDDEN_PIVOT_Y = 172; // completely below clipY=134 even with 36px upward lips
const PLANT_MAX_REACH = 110; // max reach 110px from P0

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
const PIPE1_GROUND_TAKEOFF_X = 344; // left of Pipe 1

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

type PlantPhase =
  | "HIDDEN"
  | "RISING"
  | "AMBUSH_RISE"
  | "CHOMPING"
  | "AIMING"
  | "RETRACTING"
  | "OUCH_SQUASH"
  | "OUCH_DIZZY"
  | "OUCH_DROOP"
  | "DEVOUR_LUNGE"
  | "DEVOUR_BITE"
  | "DEVOUR_PULLBACK"
  | "DEVOUR_CHEW"
  | "DEVOUR_METEOR"
  | "DEVOUR_EXPLODE"
  | "SPIT_DEAD";

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
  | "WAIT_RESUME"
  | "EATEN_HIDDEN"
  | "SPAT_OUT_ARC";

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
  scale: number; // 1 = 36x36 world px, 2 = 72x72 world px
  maxFrames: number; // 5 normal, 3 for spit death
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

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

interface CrumbParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  age: number;
  duration: number;
}

interface MunchStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

// Quantize angle in degrees (-135..135, step 15, 0 = straight up, + = clockwise/right)
function quantizePlantAngle(deg: number): { row: number; quantizedDeg: number } {
  const clamped = Math.max(-135, Math.min(135, deg));
  const step = Math.max(-9, Math.min(9, Math.round(clamped / 15)));
  return {
    row: step + 9,
    quantizedDeg: step * 15,
  };
}

// Compute angle (deg) from (ox, oy) to (tx, ty) where 0 = straight UP and positive = clockwise (right)
function computeAimAngleDeg(ox: number, oy: number, tx: number, ty: number): number {
  const dx = tx - ox;
  const dy = ty - oy;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return 0;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

// Shortest distance from an axis-aligned box [x1,x2]x[y1,y2] to a point (px, py)
function distRectToPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number
): number {
  const cx = Math.max(x1, Math.min(x2, px));
  const cy = Math.max(y1, Math.min(y2, py));
  return Math.hypot(px - cx, py - cy);
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
  const [muted, setMuted] = useState<boolean>(false);

  useEffect(() => {
    setMuted(isSfxMuted());
  }, []);

  // Measure frame width and compute integer scale K & native width Wn
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const measure = () => {
      const parentW = el.parentElement ? el.parentElement.clientWidth : el.clientWidth;
      const borderW = 8; // 4px outline left + 4px right
      const availInner = Math.max(320, parentW - borderW);
      const isDesktop = window.innerWidth >= 1024;
      const k = isDesktop || availInner >= 480 ? 2 : 1;
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

    // Load all image sprites (including new plant rig + fx sprites + meteor)
    const imgPaths: Record<string, string> = {
      hillsFar: "/environment/bg-hills-far.png",
      consoleBack: "/environment/console-back.png",
      brick: "/environment/tile-brick.png",
      qblock1: "/environment/block-question-1.png",
      qblock2: "/environment/block-question-2.png",
      pipeShort: "/environment/pipe-short.png",
      pipeMedium: "/environment/pipe-medium.png",
      pipeTall: "/environment/pipe-tall.png",
      plantHeadSheet: `/environment/${plantRigData.head.file}`,
      stemBead: "/environment/stem-bead.png",
      plantLeaves: "/environment/plant-leaves.png",
      fxStar: "/environment/fx-star.png",
      fxBump: "/environment/fx-bump.png",
      fxSmoke: "/environment/fx-smoke-sheet.png",
      meteor1: "/environment/meteor-1.png",
      meteor2: "/environment/meteor-2.png",
      meteor3: "/environment/meteor-3.png",
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
    let heroHiddenByPlant = false;

    // Hop endpoints
    let hopX0 = farLeftWalkX;
    let hopY0 = GROUND_Y;
    let hopX1 = PIPE1_CENTER_X;
    let hopY1 = PIPE1_SURF_Y;
    let hopApexY = PIPE1_SURF_Y - 20;
    let hopNextPhase: RoutePhase = "STEP3_P1_BEAT";

    // Plant Rig state
    let plantPhase: PlantPhase = "HIDDEN";
    let plantTimer = 0.4;
    let plantHeadX = P0_X; // 423
    let plantHeadY = PLANT_HIDDEN_PIVOT_Y; // 172
    let plantStartX = P0_X;
    let plantStartY = PLANT_RAISED_PIVOT_Y;
    let plantLungeTargetX = P0_X;
    let plantLungeTargetY = PLANT_RAISED_PIVOT_Y;
    let plantAngleDeg = 0; // continuous angle in degrees (-135..135)
    let plantTargetAngleDeg = 0;
    let plantBaseAngleDeg = 0;
    let plantMouthFrame = 0; // 0 closed, 1 half, 2 wide open, 3 snap
    let plantSquashY = 0; // +3px during OUCH_SQUASH
    let plantHeadScale = 1; // shrinks during SPIT_DEAD
    let plantGrayWhiteTimer = 0; // 150ms gray-white during SPIT_DEAD
    let plantExtraDroop = 0;
    let plantRouteLock = false;
    let nextPlantHiddenWait = 1.5;
    let ambushLingerTimer = 0;
    let chewCrumbAccum = 0;
    let meteorProgress = 0; // 0..1 during DEVOUR_METEOR
    let devourCount = 0;
    let ouchCount = 0;
    let spitCount = 0;

    // White screen flash & shake state
    let flashAlpha = 0;
    let flashDuration = 0.2;
    let flashTimer = 0;
    let doubleFlashActive = false;
    let doubleFlashTimer = 0;
    let frameNudgeTimer = 0;
    let frameNudgeAmplitude = 2;
    let shakeTimer = 0;
    let shakeAmplitude = 3;

    // Question Block & Rainbow Coin state
    let bumpTimer = -1; // >= 0 while bumping (0..0.24s)
    let bumpCount = 0;
    let coinState: CoinState = "NONE";
    let coinTimer = 0;
    let coinY = BLOCKS_Y;
    let coinSpinTime = 0;
    let collectCount = 0;

    // Rainbow mode & blink state
    let rainbowState: RainbowState = "NONE";
    let rainbowTimer = 0;
    let blinkDuration = 1.0; // exactly 1.0s
    let trailSpawnAccum = 0;
    const trailGhosts: TrailGhost[] = [];

    // Effects state
    const booms: BoomEffect[] = [];
    const sparkles: SparkleBurst[] = [];
    const plusOnes: PlusOneEffect[] = [];
    const smokePuffs: SmokePuff[] = [];
    const crumbs: CrumbParticle[] = [];
    const munchStars: MunchStar[] = [];
    let totalBooms = 0;
    let lastTapBoomMs = 0;

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

    const spawnSmokePuff = (x: number, y: number, vx = 0, vy = -18, duration = 0.5) => {
      smokePuffs.push({ x, y, vx, vy, age: 0, duration });
    };

    const spawnChewCrumbsAndStars = (hx: number, hy: number) => {
      const colors = ["#E52521", "#2563EB", "#FFFFFF"];
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI * 0.8 + (Math.random() - 0.5) * 1.8;
        const spd = 28 + Math.random() * 34;
        crumbs.push({
          x: hx + (Math.random() - 0.5) * 10,
          y: hy - 6 + (Math.random() - 0.5) * 8,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 20,
          color: colors[i % colors.length],
          age: 0,
          duration: 0.45,
        });
      }
      // 2 tiny fx-star munch stars pop
      for (let s = 0; s < 2; s++) {
        const dir = s === 0 ? -1 : 1;
        munchStars.push({
          x: hx + dir * (14 + Math.random() * 6),
          y: hy - 14 - Math.random() * 8,
          vx: dir * (16 + Math.random() * 10),
          vy: -22 - Math.random() * 10,
          age: 0,
          duration: 0.38,
        });
      }
    };

    const triggerBlockBump = () => {
      if (bumpTimer < 0) {
        bumpTimer = 0;
        bumpCount += 1;
      }
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

      const curLeftX = heroX - HITBOX_HALF_W;
      const curRightX = heroX + HITBOX_HALF_W;
      const underQBlock =
        curRightX > QBLOCK_X - 2 &&
        curLeftX < QBLOCK_X + BLOCKS_ROW.tile + 2 &&
        Math.abs(heroY - HITBOX_H - BLOCKS_BOTTOM_Y) <= 2.5;
      if (!underQBlock) {
        wasTouchingQBlockUnderside = false;
      } else if (!wasTouchingQBlockUnderside && upwardSpeedForBump >= 60) {
        wasTouchingQBlockUnderside = true;
        triggerBlockBump();
      }

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
          if (plantPhase === "HIDDEN" && nextPlantHiddenWait <= 1.5) {
            plantPhase = "RISING";
            plantTimer = 0;
            plantStartX = P0_X;
            plantStartY = PLANT_HIDDEN_PIVOT_Y;
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
        plantRouteLock = true;
        heroX = PIPE2_CENTER_X;
        heroY = PIPE2_SURF_Y;
        facing = 1;
        routePhase = "STEP4_P2_BEAT";
        heroFrame = 10;
      } else if (surf === "pipe3") {
        plantRouteLock = false;
        heroX = PIPE3_CENTER_X;
        heroY = PIPE3_SURF_Y;
        facing = 1;
        routePhase = "STEP5_P3_CONFUSED";
        heroFrame = 11;
        activeBubble = "question";
      } else if (surf === "blocks") {
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

    const spawnBoom = (
      wx: number,
      wy: number,
      bypassThrottle = false,
      scale = 1,
      maxFrames = 5
    ) => {
      const now = performance.now();
      if (!bypassThrottle && now - lastTapBoomMs < 80) return;
      lastTapBoomMs = now;
      if (booms.length >= 6) {
        booms.shift();
      }
      booms.push({ x: wx, y: wy, age: 0, duration: 0.45, scale, maxFrames });
      totalBooms += 1;
      frameNudgeTimer = 0.1;
      frameNudgeAmplitude = scale >= 2 ? 3 : 2;
      playBoomSfx();
    };

    const collectRainbowCoin = () => {
      const cx = QBLOCK_CENTER_X;
      const cy = coinY + 9;
      coinState = "NONE";
      coinTimer = 0;
      collectCount += 1;

      sparkles.push({ x: cx, y: cy, age: 0, duration: 0.4 });
      plusOnes.push({ x: cx - 9, y: coinY - 4, age: 0, duration: 0.65 });
      playCoinKling();

      rainbowState = "RAINBOW";
      rainbowTimer = 0;
      trailSpawnAccum = 0;

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

    // Start the DEVOUR SEQUENCE (Stage 1: LUNGE 0.2s ease-out to hero's CURRENT position)
    const startDevourSequence = () => {
      devourCount += 1;
      plantPhase = "DEVOUR_LUNGE";
      plantTimer = 0;
      plantStartX = plantHeadX;
      plantStartY = plantHeadY;

      const hx = heroX;
      const hy = heroY - 21;
      const dx = hx - P0_X;
      const dy = hy - P0_Y;
      const distFromP0 = Math.hypot(dx, dy);
      const scale = distFromP0 > PLANT_MAX_REACH ? PLANT_MAX_REACH / distFromP0 : 1;
      plantLungeTargetX = P0_X + dx * scale;
      plantLungeTargetY = Math.min(GROUND_Y - 12, P0_Y + dy * scale);
      plantTargetAngleDeg = computeAimAngleDeg(
        P0_X,
        PLANT_RAISED_PIVOT_Y,
        plantLungeTargetX,
        plantLungeTargetY
      );
      plantAngleDeg = plantTargetAngleDeg;
      plantMouthFrame = 2; // mouth wide open
    };

    // Start NORMAL TAP = "OUCH" reaction
    const triggerPlantOuch = () => {
      ouchCount += 1;
      plantPhase = "OUCH_SQUASH";
      plantTimer = 0;
      plantSquashY = 3; // squashes down 3px for 80ms
      plantMouthFrame = 1;
      plantBaseAngleDeg = plantAngleDeg;
      nextPlantHiddenWait = 4.0; // NEXT hidden period is 4s
      playCrunchSfx();
    };

    // Start TAP DURING CHEW = "DEATH + SPIT" reaction (meteor skipped!)
    const triggerPlantDeathAndSpit = () => {
      spitCount += 1;
      plantPhase = "SPIT_DEAD";
      plantTimer = 0;
      plantStartX = plantHeadX;
      plantStartY = plantHeadY;
      plantGrayWhiteTimer = 0.15; // gray-white for 150ms
      plantHeadScale = 1.0;
      nextPlantHiddenWait = 8.0; // plant returns after 8s

      // Two white flashes (100ms each) + 0.3s shake of +-3px
      doubleFlashActive = true;
      doubleFlashTimer = 0;
      shakeTimer = 0.3;
      shakeAmplitude = 3;

      // 3 smoke puffs + explosion-1..3 at scale 1
      spawnSmokePuff(plantHeadX - 10, plantHeadY - 8, -14, -22, 0.55);
      spawnSmokePuff(plantHeadX + 10, plantHeadY - 6, 14, -24, 0.55);
      spawnSmokePuff(plantHeadX, plantHeadY - 16, 0, -28, 0.6);
      spawnBoom(plantHeadX, plantHeadY - 6, true, 1, 3);

      // Spit the hero out of the mouth: startled frame 14 WITHOUT bubble, parabolic arc landing ~60px left
      heroHiddenByPlant = false;
      isDragging = false;
      activePointerId = null;
      const landX = Math.max(farLeftWalkX, Math.min(PIPE1_GROUND_TAKEOFF_X + 10, plantHeadX - 65));
      hopX0 = plantHeadX;
      hopY0 = plantHeadY;
      hopX1 = landX;
      hopY1 = GROUND_Y;
      hopApexY = Math.min(plantHeadY, GROUND_Y) - 28;
      routePhase = "SPAT_OUT_ARC";
      phaseTimer = 0;
      facing = -1;
      heroFrame = 14; // startled frame 14 WITHOUT bubble
      activeBubble = "none";
    };

    // Fixed 60 Hz simulation step (dt = 1/60s)
    const stepPhysics = (dt: number) => {
      simTime += dt;
      const prevHeroX = heroX;
      const prevHeroY = heroY;

      // 1. Update Clouds
      if (!prefersReducedMotion) {
        for (let i = 0; i < clouds.length; i++) {
          const c = clouds[i];
          c.x -= c.speed * dt;
          if (c.x < -c.w - 10) {
            c.x = WORLD_W + 10;
          }
        }
      }

      // Determine whether the hero is currently user-controlled (eligible for plant aiming/attack)
      // "The plant attacks only a hero that the user controls: while he is held, while he is falling
      // after a release, and for 2.5s after a release (never during the autonomous route)."
      // Also during the 1s BLINK and 15s RAINBOW mode he cannot be eaten.
      const isUserControlled =
        !heroHiddenByPlant &&
        rainbowState === "NONE" &&
        (isDragging || routePhase === "AIR_FALL" || routePhase === "WAIT_RESUME");

      // Autonomous route safety gating: while following autonomous route, plant is harmless and forced hidden
      // while hero stands on medium pipe or within 24px of it
      const isAutonomousNearPlant =
        !isUserControlled &&
        !heroHiddenByPlant &&
        (Math.abs(heroX - PIPE2_CENTER_X) <= 24 || plantRouteLock);

      const heroCenterX = heroX;
      const heroCenterY = heroY - 21;

      // Check distance from hero hitbox [heroX-9, heroX+9] x [heroY-42, heroY] to plant head
      const checkHeroTouchesPlantHead = (): boolean => {
        if (!isUserControlled) return false;
        const dPivot = distRectToPoint(
          heroX - HITBOX_HALF_W,
          heroY - HITBOX_H,
          heroX + HITBOX_HALF_W,
          heroY,
          plantHeadX,
          plantHeadY
        );
        return dPivot <= 28;
      };

      // 2. Update Chomper Plant Rig State Machine
      plantTimer += dt;
      if (plantGrayWhiteTimer > 0) {
        plantGrayWhiteTimer = Math.max(0, plantGrayWhiteTimer - dt);
      }

      switch (plantPhase) {
        case "HIDDEN": {
          plantHeadX = P0_X;
          plantHeadY = PLANT_HIDDEN_PIVOT_Y;
          plantAngleDeg = 0;
          plantTargetAngleDeg = 0;
          plantMouthFrame = 0;
          plantSquashY = 0;
          plantHeadScale = 1;
          plantExtraDroop = 0;

          // Ambush check: "If the held hero lingers within 70px of the mouth for 0.6s while the plant is hidden,
          // the plant ambushes: it rises in 0.2s and aims."
          const distToMouth = Math.hypot(heroCenterX - P0_X, heroCenterY - P0_Y);
          if (isDragging && rainbowState === "NONE" && distToMouth <= 70) {
            ambushLingerTimer += dt;
            if (ambushLingerTimer >= 0.6) {
              ambushLingerTimer = 0;
              nextPlantHiddenWait = 1.5;
              plantPhase = "AMBUSH_RISE";
              plantTimer = 0;
              plantStartX = P0_X;
              plantStartY = PLANT_HIDDEN_PIVOT_Y;
              break;
            }
          } else {
            ambushLingerTimer = 0;
          }

          if (prefersReducedMotion) {
            break;
          }

          if (isAutonomousNearPlant) {
            plantTimer = Math.min(plantTimer, 0.5);
          } else if (plantTimer >= nextPlantHiddenWait) {
            nextPlantHiddenWait = 1.5;
            plantPhase = "RISING";
            plantTimer = 0;
            plantStartX = P0_X;
            plantStartY = PLANT_HIDDEN_PIVOT_Y;
          }
          break;
        }

        case "RISING":
        case "AMBUSH_RISE": {
          const riseDur = plantPhase === "AMBUSH_RISE" ? 0.2 : 0.4;
          if (isAutonomousNearPlant) {
            plantStartX = plantHeadX;
            plantStartY = plantHeadY;
            plantPhase = "RETRACTING";
            plantTimer = 0;
            break;
          }

          const p = Math.min(1, plantTimer / riseDur);
          const easeOut = 1 - (1 - p) * (1 - p);
          plantHeadX = P0_X;
          plantHeadY =
            PLANT_HIDDEN_PIVOT_Y -
            (PLANT_HIDDEN_PIVOT_Y - PLANT_RAISED_PIVOT_Y) * easeOut;

          const distHeroToHead = Math.hypot(heroCenterX - plantHeadX, heroCenterY - plantHeadY);
          if (isDragging && rainbowState === "NONE" && distHeroToHead <= 110) {
            plantTargetAngleDeg = computeAimAngleDeg(
              plantHeadX,
              PLANT_RAISED_PIVOT_Y,
              heroCenterX,
              heroCenterY
            );
            const alpha = Math.min(1, dt / 0.12);
            plantAngleDeg += (plantTargetAngleDeg - plantAngleDeg) * alpha;
            plantMouthFrame = 2;
          } else {
            plantAngleDeg = 0;
            plantMouthFrame = p < 0.45 ? 1 : 2;
          }

          if (p > 0.35 && checkHeroTouchesPlantHead()) {
            startDevourSequence();
            break;
          }

          if (plantTimer >= riseDur) {
            plantHeadY = PLANT_RAISED_PIVOT_Y;
            plantTimer = 0;
            if (isDragging && rainbowState === "NONE" && distHeroToHead <= 110) {
              plantPhase = "AIMING";
            } else {
              plantPhase = "CHOMPING";
            }
          }
          break;
        }

        case "CHOMPING": {
          if (isAutonomousNearPlant) {
            plantStartX = plantHeadX;
            plantStartY = plantHeadY;
            plantPhase = "RETRACTING";
            plantTimer = 0;
            break;
          }

          plantHeadX = P0_X;
          plantHeadY = PLANT_RAISED_PIVOT_Y;

          // Check Touch -> Devour
          if (checkHeroTouchesPlantHead()) {
            startDevourSequence();
            break;
          }

          // Check Aiming: held hero within 110px of head
          const distHeroToHead = Math.hypot(heroCenterX - plantHeadX, heroCenterY - plantHeadY);
          if (isDragging && rainbowState === "NONE" && distHeroToHead <= 110) {
            plantPhase = "AIMING";
            break;
          }

          // Smoothly return angle to 0
          plantAngleDeg += (0 - plantAngleDeg) * Math.min(1, dt / 0.12);
          // Chomp 1.2s: mouth frames 2,1,2,1,2,1 at 6 fps
          const stepIdx = Math.floor(plantTimer * 6);
          plantMouthFrame = stepIdx % 2 === 0 ? 2 : 1;

          if (plantTimer >= 1.2) {
            plantStartX = plantHeadX;
            plantStartY = plantHeadY;
            plantPhase = "RETRACTING";
            plantTimer = 0;
          }
          break;
        }

        case "AIMING": {
          if (isAutonomousNearPlant) {
            plantStartX = plantHeadX;
            plantStartY = plantHeadY;
            plantPhase = "RETRACTING";
            plantTimer = 0;
            break;
          }

          plantHeadX = P0_X;
          plantHeadY = PLANT_RAISED_PIVOT_Y;
          plantMouthFrame = 2; // mouth wide open

          // Smoothly turn head toward hero (120ms smoothing, 15-deg quantized steps on sheet)
          plantTargetAngleDeg = computeAimAngleDeg(
            plantHeadX,
            plantHeadY,
            heroCenterX,
            heroCenterY
          );
          const alpha = Math.min(1, dt / 0.12);
          plantAngleDeg += (plantTargetAngleDeg - plantAngleDeg) * alpha;

          // Check Touch -> Devour
          if (checkHeroTouchesPlantHead()) {
            startDevourSequence();
            break;
          }

          const distHeroToHead = Math.hypot(heroCenterX - plantHeadX, heroCenterY - plantHeadY);
          if (!isUserControlled || distHeroToHead > 115) {
            plantPhase = "CHOMPING";
            plantTimer = 0;
          }
          break;
        }

        case "RETRACTING": {
          // If user brings hero right onto head while beginning to retract, still allow touch/aim
          if (checkHeroTouchesPlantHead() && plantHeadY < 118) {
            startDevourSequence();
            break;
          }
          const p = Math.min(1, plantTimer / 0.4);
          plantHeadX = plantStartX + (P0_X - plantStartX) * p;
          plantHeadY = plantStartY + (PLANT_HIDDEN_PIVOT_Y - plantStartY) * p;
          plantAngleDeg = plantAngleDeg * (1 - p);
          plantMouthFrame = 0;
          if (plantTimer >= 0.4) {
            plantPhase = "HIDDEN";
            plantTimer = 0;
            plantHeadX = P0_X;
            plantHeadY = PLANT_HIDDEN_PIVOT_Y;
          }
          break;
        }

        // ============================================================
        // NORMAL TAP = "OUCH" (squash -> bump + dizzy stars -> droop & sink)
        // ============================================================
        case "OUCH_SQUASH": {
          plantSquashY = 3;
          plantMouthFrame = 1;
          if (plantTimer >= 0.08) {
            plantPhase = "OUCH_DIZZY";
            plantTimer = 0;
            plantSquashY = 0;
          }
          break;
        }

        case "OUCH_DIZZY": {
          // 0.8s: 3 fx-star dizzy stars orbit above head while head wobbles +-8 deg twice
          // and mouth goes frame 1 then 0
          const p = Math.min(1, plantTimer / 0.8);
          const wobble = Math.sin(p * Math.PI * 4) * 16; // crosses +-15 deg quantization cleanly twice
          plantAngleDeg = plantBaseAngleDeg + wobble;
          plantMouthFrame = p < 0.5 ? 1 : 0;
          if (plantTimer >= 0.8) {
            plantPhase = "OUCH_DROOP";
            plantTimer = 0;
            plantStartX = plantHeadX;
            plantStartY = plantHeadY;
            // Tiny smoke puff at the mouth
            spawnSmokePuff(P0_X, P0_Y - 4, 0, -16, 0.45);
          }
          break;
        }

        case "OUCH_DROOP": {
          // 0.5s: head droops (tilts about 30 deg and sags) and slowly sinks into the pipe
          const p = Math.min(1, plantTimer / 0.5);
          const droopSign = plantBaseAngleDeg < 0 ? -1 : 1;
          const targetDroopAngle = droopSign * 30;
          plantAngleDeg =
            plantBaseAngleDeg + (targetDroopAngle - plantBaseAngleDeg) * Math.min(1, p * 1.8);
          plantExtraDroop = Math.sin(p * Math.PI) * 10;
          plantHeadX = plantStartX + (P0_X - plantStartX) * p + droopSign * Math.sin(p * Math.PI) * 6;
          plantHeadY = plantStartY + (PLANT_HIDDEN_PIVOT_Y - plantStartY) * (p * p);
          plantMouthFrame = 0;
          if (plantTimer >= 0.5) {
            plantPhase = "HIDDEN";
            plantTimer = 0;
            plantExtraDroop = 0;
            plantHeadX = P0_X;
            plantHeadY = PLANT_HIDDEN_PIVOT_Y;
          }
          break;
        }

        // ============================================================
        // DEVOUR SEQUENCE (1. LUNGE -> 2. BITE -> 3. PULL-BACK -> 4. CHEW -> 5. METEOR -> 6. EXPLOSION -> 7. RESPAWN -> 8. 8s WAIT)
        // ============================================================
        case "DEVOUR_LUNGE": {
          // 1. LUNGE 0.2s ease-out: neck stretches so head reaches hero's CURRENT position (max reach 110px from P0)
          if (!heroHiddenByPlant) {
            const hx = heroX;
            const hy = heroY - 21;
            const dx = hx - P0_X;
            const dy = hy - P0_Y;
            const distFromP0 = Math.hypot(dx, dy);
            const scale = distFromP0 > PLANT_MAX_REACH ? PLANT_MAX_REACH / distFromP0 : 1;
            plantLungeTargetX = P0_X + dx * scale;
            plantLungeTargetY = Math.min(GROUND_Y - 12, P0_Y + dy * scale);
          }
          const p = Math.min(1, plantTimer / 0.2);
          const easeOut = 1 - (1 - p) * (1 - p);
          plantHeadX = plantStartX + (plantLungeTargetX - plantStartX) * easeOut;
          plantHeadY = plantStartY + (plantLungeTargetY - plantStartY) * easeOut;
          plantAngleDeg = computeAimAngleDeg(
            P0_X,
            PLANT_RAISED_PIVOT_Y,
            plantLungeTargetX,
            plantLungeTargetY
          );
          plantMouthFrame = 2; // wide open

          if (plantTimer >= 0.2) {
            // 2. BITE 0.12s: snap frame 3; hero disappears with a small spark at the bite point
            plantPhase = "DEVOUR_BITE";
            plantTimer = 0;
            plantMouthFrame = 3; // snap
            heroHiddenByPlant = true;
            isDragging = false;
            activePointerId = null;
            heroVx = 0;
            heroVy = 0;
            routePhase = "EATEN_HIDDEN";
            activeBubble = "none";
            sparkles.push({ x: plantHeadX, y: plantHeadY, age: 0, duration: 0.32 });
            playCrunchSfx();
          }
          break;
        }

        case "DEVOUR_BITE": {
          plantMouthFrame = 3;
          if (plantTimer >= 0.12) {
            // 3. PULL-BACK 0.35s ease-in-out
            plantPhase = "DEVOUR_PULLBACK";
            plantTimer = 0;
            plantStartX = plantHeadX;
            plantStartY = plantHeadY;
            plantBaseAngleDeg = plantAngleDeg;
          }
          break;
        }

        case "DEVOUR_PULLBACK": {
          const p = Math.min(1, plantTimer / 0.35);
          const easeInOut = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          plantHeadX = plantStartX + (P0_X - plantStartX) * easeInOut;
          plantHeadY = plantStartY + (PLANT_RAISED_PIVOT_Y - plantStartY) * easeInOut;
          plantAngleDeg = plantBaseAngleDeg * (1 - easeInOut);
          plantMouthFrame = 3;
          if (plantTimer >= 0.35) {
            // 4. CHEW 2.5s
            plantPhase = "DEVOUR_CHEW";
            plantTimer = 0;
            chewCrumbAccum = 0.2; // spawn first crumbs quickly
            plantHeadX = P0_X;
            plantHeadY = PLANT_RAISED_PIVOT_Y;
          }
          break;
        }

        case "DEVOUR_CHEW": {
          // 4. CHEW 2.5s: head bobs +-2px and tilts +-15 deg, mouth alternates frames 1 and 3 at 8 fps,
          // small crumb particles every 250ms, and 2 tiny fx-star munch stars pop
          plantHeadX = P0_X;
          plantHeadY = PLANT_RAISED_PIVOT_Y + Math.sin(plantTimer * Math.PI * 8) * 2;
          const chewStep = Math.floor(plantTimer * 8);
          plantMouthFrame = chewStep % 2 === 0 ? 1 : 3;
          const tiltCycle = Math.floor(plantTimer * 6) % 4;
          plantAngleDeg = tiltCycle === 0 ? -15 : tiltCycle === 2 ? 15 : 0;

          chewCrumbAccum += dt;
          if (chewCrumbAccum >= 0.25) {
            chewCrumbAccum -= 0.25;
            spawnChewCrumbsAndStars(plantHeadX, plantHeadY);
            playCrunchSfx();
          }

          if (plantTimer >= 2.5) {
            // 5. METEOR 0.7s
            plantPhase = "DEVOUR_METEOR";
            plantTimer = 0;
            meteorProgress = 0;
            plantHeadX = P0_X;
            plantHeadY = PLANT_RAISED_PIVOT_Y;
            plantAngleDeg = 0;
            plantMouthFrame = 0;
          }
          break;
        }

        case "DEVOUR_METEOR": {
          // 5. METEOR 0.7s: streaks from top-right off-screen onto the plant head
          meteorProgress = Math.min(1, plantTimer / 0.7);
          plantHeadX = P0_X;
          plantHeadY = PLANT_RAISED_PIVOT_Y;
          plantAngleDeg = 15; // looking slightly toward incoming meteor
          plantMouthFrame = 1;

          if (plantTimer >= 0.7) {
            // 6. EXPLOSION: white flash (200ms), explosion-1..5 at scale 2 centered on head,
            // 3px screen nudge, fx-smoke-sheet puffs rising; neck and head vanish at the flash
            plantPhase = "DEVOUR_EXPLODE";
            plantTimer = 0;
            flashAlpha = 0.9;
            flashDuration = 0.2;
            flashTimer = 0;
            spawnBoom(P0_X, PLANT_RAISED_PIVOT_Y, true, 2, 5);
            frameNudgeTimer = 0.16;
            frameNudgeAmplitude = 3;
            spawnSmokePuff(P0_X - 8, PLANT_RAISED_PIVOT_Y + 6, -10, -24, 0.65);
            spawnSmokePuff(P0_X + 8, PLANT_RAISED_PIVOT_Y + 4, 10, -26, 0.65);
            spawnSmokePuff(P0_X, P0_Y - 4, 0, -30, 0.75);
            plantHeadX = P0_X;
            plantHeadY = PLANT_HIDDEN_PIVOT_Y;
          }
          break;
        }

        case "DEVOUR_EXPLODE": {
          // Neck and head stay vanished; 0.8s after explosion, hero respawns at far left blinking 1s
          plantHeadX = P0_X;
          plantHeadY = PLANT_HIDDEN_PIVOT_Y;
          if (plantTimer >= 0.8) {
            // 7. RESPAWN: hero reappears at far left on ground (x = viewLeft + 28) with BLINK for 1s
            heroHiddenByPlant = false;
            heroX = farLeftWalkX;
            heroY = GROUND_Y;
            heroVx = 0;
            heroVy = 0;
            facing = 1;
            heroFrame = 0;
            activeBubble = "none";
            rainbowState = "BLINK";
            rainbowTimer = 0;
            blinkDuration = 1.0;
            routePhase = "STEP1_LEFT_IDLE";
            phaseTimer = 0;

            // 8. Plant stays gone for 8s, then rises normally
            plantPhase = "HIDDEN";
            plantTimer = 0;
            nextPlantHiddenWait = 8.0;
          }
          break;
        }

        // ============================================================
        // TAP DURING CHEW = "DEATH + SPIT" (shrink & sink over 0.6s, then 8s wait)
        // ============================================================
        case "SPIT_DEAD": {
          const p = Math.min(1, plantTimer / 0.6);
          plantHeadScale = Math.max(0.3, 1 - 0.65 * p);
          plantHeadX = plantStartX + (P0_X - plantStartX) * p;
          plantHeadY = plantStartY + (PLANT_HIDDEN_PIVOT_Y - plantStartY) * (p * p);
          plantMouthFrame = 2;
          if (plantTimer >= 0.6) {
            plantPhase = "HIDDEN";
            plantTimer = 0;
            plantHeadScale = 1;
            plantHeadX = P0_X;
            plantHeadY = PLANT_HIDDEN_PIVOT_Y;
            nextPlantHiddenWait = 8.0;
          }
          break;
        }
      }

      // 3. Update Question Block Bump
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
        const hoverTargetY = BLOCKS_Y - 30;

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

      // 5. Update Hero Movement
      if (heroHiddenByPlant || routePhase === "EATEN_HIDDEN") {
        // Hero is inside the plant or waiting 0.8s after explosion to respawn
        activeBubble = "none";
      } else if (routePhase === "SPAT_OUT_ARC") {
        // Parabolic spit-out arc landing ~60px left of plant, startled frame 14 WITHOUT bubble
        phaseTimer += dt;
        const spitDur = 0.52;
        const t = Math.min(1, phaseTimer / spitDur);
        heroX = hopX0 + (hopX1 - hopX0) * t;
        if (t < 0.45) {
          const u = t / 0.45;
          const easeOut = 1 - (1 - u) * (1 - u);
          heroY = hopY0 + (hopApexY - hopY0) * easeOut;
        } else {
          const v = (t - 0.45) / 0.55;
          heroY = hopApexY + (hopY1 - hopApexY) * (v * v);
        }
        facing = -1;
        heroFrame = 14; // startled frame 14 WITHOUT bubble
        activeBubble = "none";

        if (phaseTimer >= spitDur) {
          heroX = hopX1;
          heroY = GROUND_Y;
          heroFrame = 0;
          // Hero lands, does the 1s BLINK (cannot be eaten or grabbed), then resumes
          rainbowState = "BLINK";
          rainbowTimer = 0;
          blinkDuration = 1.0;
          routePhase = "STEP2_WALK_RIGHT";
          phaseTimer = 0;
          walkAnimTime = 0;
          facing = 1;
        }
      } else if (isDragging) {
        routePhase = "DRAGGING";
        activeBubble = "none";
        heroFrame = 14; // startled frame 14 WITHOUT bubble while held

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
            resumeFromCurrentSurface();
          } else {
            routePhase = "WAIT_RESUME";
            waitResumeTimer = 0;
          }
        }
      } else if (routePhase === "WAIT_RESUME") {
        activeBubble = "none";
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
              if (plantPhase !== "HIDDEN" || (nextPlantHiddenWait <= 1.5 && plantTimer >= 0.95)) {
                if (plantPhase === "HIDDEN" && nextPlantHiddenWait <= 1.5) {
                  plantPhase = "RISING";
                  plantTimer = 0;
                  plantStartX = P0_X;
                  plantStartY = PLANT_HIDDEN_PIVOT_Y;
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
            heroX = PIPE3_CENTER_X;
            heroY = PIPE3_SURF_Y;
            facing = -1;
            activeBubble = "none";
            if (plantPhase !== "HIDDEN") {
              heroFrame = 12;
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
              facing = -1;
              heroFrame = 11;
              activeBubble = "question";
            }
            break;
          }

          case "STEP7_LEFT_CONFUSED": {
            heroX = farLeftWalkX;
            heroY = GROUND_Y;
            facing = -1;
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

      // 6. Check Coin Collection Overlap
      if (!heroHiddenByPlant && coinState !== "NONE" && coinY <= BLOCKS_Y - 16) {
        const coinCx = QBLOCK_CENTER_X;
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
          blinkDuration = 1.0;
        }
      } else if (rainbowState === "BLINK") {
        rainbowTimer += dt;
        if (rainbowTimer >= blinkDuration) {
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

      // 8. Update Booms, Sparkles, +1, Smoke Puffs, Crumbs, Munch Stars, Flashes & Shakes
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
      for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const sp = smokePuffs[i];
        sp.age += dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        if (sp.age >= sp.duration) {
          smokePuffs.splice(i, 1);
        }
      }
      for (let i = crumbs.length - 1; i >= 0; i--) {
        const cr = crumbs[i];
        cr.age += dt;
        cr.vy += 260 * dt;
        cr.x += cr.vx * dt;
        cr.y += cr.vy * dt;
        if (cr.age >= cr.duration) {
          crumbs.splice(i, 1);
        }
      }
      for (let i = munchStars.length - 1; i >= 0; i--) {
        const ms = munchStars[i];
        ms.age += dt;
        ms.x += ms.vx * dt;
        ms.y += ms.vy * dt;
        if (ms.age >= ms.duration) {
          munchStars.splice(i, 1);
        }
      }

      if (flashAlpha > 0) {
        flashTimer += dt;
        flashAlpha = Math.max(0, 0.9 * (1 - flashTimer / flashDuration));
      }
      if (doubleFlashActive) {
        doubleFlashTimer += dt;
        if (doubleFlashTimer >= 0.24) {
          doubleFlashActive = false;
        }
      }
      if (frameNudgeTimer > 0) {
        frameNudgeTimer = Math.max(0, frameNudgeTimer - dt);
      }
      if (shakeTimer > 0) {
        shakeTimer = Math.max(0, shakeTimer - dt);
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

      // 6. CHOMPER PLANT RIG (leaves, stem-bead neck on quadratic curve, head from plant-head-sheet.png)
      const isPlantVisible =
        plantPhase !== "HIDDEN" &&
        plantPhase !== "DEVOUR_EXPLODE" &&
        plantHeadY < PLANT_HIDDEN_PIVOT_Y - 1;

      const { row: headRow, quantizedDeg } = quantizePlantAngle(plantAngleDeg);

      if (isPlantVisible) {
        ctx.save();
        ctx.beginPath();
        // Clip at y=134 (pipe lip) inside the pipe column so the plant emerges from inside the pipe;
        // outside the pipe column allow down to groundY=168 so bottom-left lunges are never clipped in mid-air
        ctx.rect(0, 0, WORLD_W, PLANT_CFG.clipY);
        ctx.rect(0, PLANT_CFG.clipY, PIPE2.x - 8, GROUND_Y - PLANT_CFG.clipY);
        ctx.rect(
          PIPE2.x + PIPE_W + 8,
          PLANT_CFG.clipY,
          WORLD_W - (PIPE2.x + PIPE_W + 8),
          GROUND_Y - PLANT_CFG.clipY
        );
        ctx.clip();

        if (plantGrayWhiteTimer > 0) {
          ctx.filter = "grayscale(100%) brightness(1.8)";
        }

        const emergeFactor = Math.max(
          0,
          Math.min(
            1,
            (PLANT_HIDDEN_PIVOT_Y - plantHeadY) /
              (PLANT_HIDDEN_PIVOT_Y - PLANT_RAISED_PIVOT_Y)
          )
        );

        // 6a. Draw plant-leaves.png (32x18) behind the pipe at x=407, y=108 when emerged
        if (images.plantLeaves?.complete && images.plantLeaves.naturalWidth > 0) {
          const leavesY = Math.round(108 + (1 - emergeFactor) * 28);
          ctx.drawImage(images.plantLeaves, PLANT_CFG.x, leavesY, 32, 18);
        }

        // 6b. Draw NECK: chain of stem-bead.png (10x10) every 4px along a quadratic curve from P0 to head pivot
        const p2x = plantHeadX;
        const p2y = plantHeadY + plantSquashY;
        const dx = p2x - P0_X;
        const dy = p2y - P0_Y;
        const dist = Math.hypot(dx, dy);

        // Slight droop on the curve (never straight when stretched)
        const sidewaysDroop = Math.min(24, Math.abs(dx) * 0.25 + dist * 0.08) + plantExtraDroop;
        const slightBendX = Math.abs(dx) < 3 ? Math.sin(quantizedDeg * (Math.PI / 180)) * 3 : -dx * 0.06;
        const p1x = (P0_X + p2x) * 0.5 + slightBendX;
        const p1y = (P0_Y + p2y) * 0.5 + sidewaysDroop;

        if (images.stemBead?.complete && images.stemBead.naturalWidth > 0 && dist > 3) {
          // Sample quadratic Bezier curve every 4px
          const approxLen =
            Math.hypot(p1x - P0_X, p1y - P0_Y) + Math.hypot(p2x - p1x, p2y - p1y);
          const numBeads = Math.max(2, Math.ceil(approxLen / 4));
          for (let b = 0; b <= numBeads; b++) {
            const t = b / numBeads;
            const inv = 1 - t;
            const bx = inv * inv * P0_X + 2 * inv * t * p1x + t * t * p2x;
            const by = inv * inv * P0_Y + 2 * inv * t * p1y + t * t * p2y;
            ctx.drawImage(images.stemBead, Math.round(bx - 5), Math.round(by - 5), 10, 10);
          }
        }

        // 6c. Draw HEAD from plant-head-sheet.png (cell 88x88, col = mouthFrame, row = angleRow, pivot at (44,44))
        if (images.plantHeadSheet?.complete && images.plantHeadSheet.naturalWidth > 0) {
          const sx = Math.max(0, Math.min(3, plantMouthFrame)) * HEAD_CELL;
          const sy = Math.max(0, Math.min(18, headRow)) * HEAD_CELL;
          const drawW = Math.round(HEAD_CELL * plantHeadScale);
          const drawH = Math.round(HEAD_CELL * plantHeadScale);
          const drawX = Math.round(p2x - HEAD_PIVOT_X * plantHeadScale);
          const drawY = Math.round(p2y - HEAD_PIVOT_Y * plantHeadScale);

          ctx.drawImage(
            images.plantHeadSheet,
            sx,
            sy,
            HEAD_CELL,
            HEAD_CELL,
            drawX,
            drawY,
            drawW,
            drawH
          );
        }

        ctx.restore();
      }

      // 6d. Plant OUCH Effects (fx-bump + 3 orbiting fx-star dizzy stars) & Chew Effects (crumbs + munch stars)
      if (
        (plantPhase === "OUCH_SQUASH" || plantPhase === "OUCH_DIZZY") &&
        images.fxBump?.complete &&
        images.fxBump.naturalWidth > 0
      ) {
        // fx-bump.png (14x11) pops on top of head with overshoot (1x, 1.3x, 1x)
        const totalOuchTime =
          plantPhase === "OUCH_SQUASH" ? plantTimer : 0.08 + plantTimer;
        let bumpScale = 1.0;
        if (totalOuchTime < 0.08) {
          bumpScale = 1.0 + (totalOuchTime / 0.08) * 0.3;
        } else if (totalOuchTime < 0.18) {
          bumpScale = 1.3 - ((totalOuchTime - 0.08) / 0.1) * 0.3;
        }
        const bw = Math.round(14 * bumpScale);
        const bh = Math.round(11 * bumpScale);
        const rad = (quantizedDeg * Math.PI) / 180;
        const bumpCx = plantHeadX + Math.sin(rad) * 20;
        const bumpCy = plantHeadY + plantSquashY - Math.cos(rad) * 24 - 8;
        ctx.drawImage(
          images.fxBump,
          Math.round(bumpCx - bw / 2),
          Math.round(bumpCy - bh / 2),
          bw,
          bh
        );
      }

      if (
        plantPhase === "OUCH_DIZZY" &&
        images.fxStar?.complete &&
        images.fxStar.naturalWidth > 0
      ) {
        // 3 fx-star.png (11x11) dizzy stars orbit above the head for 0.8s
        const orbitCenterX = plantHeadX;
        const orbitCenterY = plantHeadY - 32;
        for (let s = 0; s < 3; s++) {
          const theta = plantTimer * Math.PI * 5 + (s * Math.PI * 2) / 3;
          const sx = orbitCenterX + Math.cos(theta) * 18;
          const sy = orbitCenterY + Math.sin(theta) * 5;
          ctx.drawImage(images.fxStar, Math.round(sx - 5), Math.round(sy - 5), 11, 11);
        }
      }

      // 7. Three Pipes (drawn on top of the plant so the plant emerges from inside the medium pipe)
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
      if (
        !heroHiddenByPlant &&
        trailGhosts.length > 0 &&
        images.heroRainbow?.complete &&
        images.heroRainbow.naturalWidth > 0
      ) {
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

      // 9. Hero Sprite (hidden while inside plant during BITE/PULLBACK/CHEW/METEOR/EXPLODE)
      const useRainbowSheet = rainbowState === "RAINBOW";
      const sheetImg = useRainbowSheet ? images.heroRainbow : images.heroSheet;
      if (!heroHiddenByPlant && sheetImg?.complete && sheetImg.naturalWidth > 0) {
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

        const rowY = useRainbowSheet
          ? (Math.floor(rainbowTimer * 8) % 3) * HERO_FRAME_H
          : 0;
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
      if (!heroHiddenByPlant && activeBubble !== "none" && !isDragging) {
        const bImg = activeBubble === "question" ? images.bubbleQ : images.bubbleEx;
        if (bImg?.complete && bImg.naturalWidth > 0) {
          const bob = Math.round(Math.sin(simTime * 6) * 2);
          const bx = Math.round(heroX + facing * 10 - 6);
          const by = Math.round(heroY - 42 - 8 - 15 + bob);
          ctx.drawImage(bImg, bx, Math.max(2, by), 12, 15);
        }
      }

      // 11. Chew Crumbs (2x2 pixel squares in red/blue/white) & Munch Stars (fx-star.png)
      for (let i = 0; i < crumbs.length; i++) {
        const cr = crumbs[i];
        ctx.fillStyle = cr.color;
        ctx.fillRect(Math.round(cr.x), Math.round(cr.y), 2, 2);
      }
      if (images.fxStar?.complete && images.fxStar.naturalWidth > 0) {
        for (let i = 0; i < munchStars.length; i++) {
          const ms = munchStars[i];
          ctx.drawImage(images.fxStar, Math.round(ms.x - 5), Math.round(ms.y - 5), 11, 11);
        }
      }

      // 12. Meteor during DEVOUR_METEOR (meteor-1..3, scale 1, streaks from top-right off-screen onto plant head)
      if (plantPhase === "DEVOUR_METEOR") {
        const mIdx = (Math.floor(simTime * 12) % 3) + 1;
        const mImg = images[`meteor${mIdx}`];
        if (mImg?.complete && mImg.naturalWidth > 0) {
          // meteor-1..3 is 190x120; head center is at (32, 92) inside the sprite
          const startHeadX = WORLD_W + 70;
          const startHeadY = -30;
          const endHeadX = P0_X;
          const endHeadY = PLANT_RAISED_PIVOT_Y;
          const curHeadX = startHeadX + (endHeadX - startHeadX) * meteorProgress;
          const curHeadY = startHeadY + (endHeadY - startHeadY) * meteorProgress;
          ctx.drawImage(
            mImg,
            Math.round(curHeadX - 32),
            Math.round(curHeadY - 92),
            190,
            120
          );
        }
      }

      // 13. Smoke Puffs (fx-smoke-sheet.png: 4 frames of 22x22)
      if (images.fxSmoke?.complete && images.fxSmoke.naturalWidth > 0) {
        for (let i = 0; i < smokePuffs.length; i++) {
          const sp = smokePuffs[i];
          const fIdx = Math.min(3, Math.floor((sp.age / sp.duration) * 4));
          ctx.drawImage(
            images.fxSmoke,
            fIdx * 22,
            0,
            22,
            22,
            Math.round(sp.x - 11),
            Math.round(sp.y - 11),
            22,
            22
          );
        }
      }

      // 14. Sparkles, +1, and Booms (scale 1 = 36x36 world px, scale 2 = 72x72 world px)
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
        const fIdx = Math.min(
          bm.maxFrames,
          Math.floor((bm.age / bm.duration) * bm.maxFrames) + 1
        );
        const eImg = images[`exp${fIdx}`];
        if (eImg?.complete && eImg.naturalWidth > 0) {
          const size = Math.round(36 * bm.scale);
          const half = Math.round(size / 2);
          ctx.drawImage(eImg, Math.round(bm.x - half), Math.round(bm.y - half), size, size);
        }
      }

      ctx.restore();

      // 15. White Flash Overlay (200ms on meteor explosion, or two 100ms flashes on DEATH + SPIT)
      let currentFlash = flashAlpha;
      if (doubleFlashActive) {
        if (doubleFlashTimer < 0.1 || (doubleFlashTimer >= 0.14 && doubleFlashTimer < 0.24)) {
          currentFlash = Math.max(currentFlash, 0.78);
        }
      }
      if (currentFlash > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${currentFlash.toFixed(3)})`;
        ctx.fillRect(0, 0, wn, WORLD_H);
        ctx.restore();
      }

      // Update transparent grab handle position & cursor
      // During 15s rainbow mode, 1s blink, eaten, or spit arc, hero CANNOT be grabbed
      const isGrabbable =
        !heroHiddenByPlant &&
        rainbowState === "NONE" &&
        routePhase !== "SPAT_OUT_ARC" &&
        routePhase !== "EATEN_HIDDEN";
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

      // Frame nudge / shake
      if (shakeTimer > 0) {
        const sx = Math.sin(simTime * 90) * shakeAmplitude;
        const sy = Math.cos(simTime * 110) * shakeAmplitude;
        frameEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      } else if (frameNudgeTimer > 0) {
        const nudgePx = Math.sin((frameNudgeTimer / 0.1) * Math.PI) * frameNudgeAmplitude;
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
      frameEl.dataset.heroHidden = String(heroHiddenByPlant);
      frameEl.dataset.bubble = activeBubble;
      frameEl.dataset.plantPhase = plantPhase;
      frameEl.dataset.plantY = String(Math.round(plantHeadY));
      frameEl.dataset.plantHeadX = String(Math.round(plantHeadX));
      frameEl.dataset.plantHeadY = String(Math.round(plantHeadY));
      frameEl.dataset.plantAngle = String(quantizedDeg);
      frameEl.dataset.plantMouthFrame = String(plantMouthFrame);
      frameEl.dataset.plantNextWait = String(nextPlantHiddenWait);
      frameEl.dataset.devourCount = String(devourCount);
      frameEl.dataset.ouchCount = String(ouchCount);
      frameEl.dataset.spitCount = String(spitCount);
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
      if (
        heroHiddenByPlant ||
        rainbowState !== "NONE" ||
        routePhase === "SPAT_OUT_ARC" ||
        routePhase === "EATEN_HIDDEN"
      ) {
        return;
      }

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

      if (heroHiddenByPlant || routePhase === "EATEN_HIDDEN") return;

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

      // 1. Tapping the hero while in rainbow mode -> Rule 7: does nothing
      if (
        !heroHiddenByPlant &&
        wx >= heroX - 18 &&
        wx <= heroX + 18 &&
        wy >= heroY - 48 &&
        wy <= heroY
      ) {
        if (rainbowState === "RAINBOW") {
          return;
        }
      }

      // 2. Check if tapping the Chomper Plant (head rectangle + 10px, works even when only the tip shows)
      const isForcedHidden =
        !isDragging &&
        routePhase !== "AIR_FALL" &&
        routePhase !== "WAIT_RESUME" &&
        !heroHiddenByPlant &&
        (Math.abs(heroX - PIPE2_CENTER_X) <= 24 || plantRouteLock);

      const isPlantTipVisible =
        plantPhase !== "HIDDEN" &&
        plantPhase !== "DEVOUR_EXPLODE" &&
        plantHeadY - 38 < PLANT_CFG.clipY &&
        !isForcedHidden;

      if (isPlantTipVisible) {
        // Head rectangle + 10px padding (plus pipe lip tip area when partially emerged)
        const pLeft = Math.min(PLANT_CFG.x, plantHeadX - 24) - 10;
        const pRight = Math.max(PLANT_CFG.x + 32, plantHeadX + 24) + 10;
        const pTop = Math.min(plantHeadY - 36, PLANT_CFG.clipY - 6) - 10;
        const pBot = Math.max(plantHeadY + 20, PLANT_CFG.clipY) + 10;

        if (wx >= pLeft && wx <= pRight && wy >= pTop && wy <= pBot) {
          // b) TAP DURING THE CHEW (stage 4) = "DEATH + SPIT"
          if (plantPhase === "DEVOUR_CHEW" || plantPhase === "DEVOUR_PULLBACK") {
            triggerPlantDeathAndSpit();
            return;
          }
          // a) NORMAL TAP = "OUCH" (when rising, chomping, or aiming)
          if (
            plantPhase === "RISING" ||
            plantPhase === "AMBUSH_RISE" ||
            plantPhase === "CHOMPING" ||
            plantPhase === "AIMING" ||
            plantPhase === "RETRACTING"
          ) {
            triggerPlantOuch();
            return;
          }
        }
      }

      // 3. Tap anywhere else -> spawn small boom
      if (wx >= viewLeft && wx <= WORLD_W && wy >= 0 && wy <= WORLD_H) {
        spawnBoom(wx, wy, false, 1, 5);
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

    const io = new IntersectionObserver(
      (entries) => {
        isSectionVisible = Boolean(entries[0]?.isIntersecting);
        if (isSectionVisible) startLoop();
        else stopLoop();
      },
      { threshold: 0 }
    );
    io.observe(frameEl);

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
                width: cssWidth + 8,
                height: cssHeight + 8,
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

              {/* Tiny 24px Speaker Mute Button at top-right corner */}
              <button
                type="button"
                aria-label={muted ? "Nyalakan efek suara" : "Matikan efek suara"}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = toggleSfxMuted();
                  setMuted(next);
                }}
                className="absolute top-1.5 right-1.5 z-20 w-6 h-6 flex items-center justify-center bg-[#2B1B0E]/45 hover:bg-[#2B1B0E]/70 text-white transition-colors"
                style={{ imageRendering: "pixelated" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M2 5H5L8 2V12L5 9H2V5Z"
                    fill="#FFFFFF"
                    stroke="#2B1B0E"
                    strokeWidth="1"
                  />
                  {muted ? (
                    <path
                      d="M10 5L13 8M13 5L10 8"
                      stroke="#E52521"
                      strokeWidth="1.5"
                      strokeLinecap="square"
                    />
                  ) : (
                    <path
                      d="M10 4.5C10.8 5.2 10.8 8.8 10 9.5M11.8 3C13 4.5 13 9.5 11.8 11"
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                      strokeLinecap="square"
                    />
                  )}
                </svg>
              </button>

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
