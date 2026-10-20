"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import levelData from "../../public/environment/level-data.json";
import { playCoinKling, playBoomSfx, initAudio } from "@/lib/sfx";

// (3) Replay every page load and refresh; no sessionStorage flag
// Afterwards the page must always be at the very top:
// set history.scrollRestoration = 'manual', strip any #hash, window.scrollTo(0,0) before and after

const CRITICAL_ASSETS = [
  "/character/devj-sheet-nobubble.png",
  "/character/bubble-question.png",
  "/character/bubble-exclaim.png",
  "/environment/level-loading-ground.png",
  "/environment/level-loading-decor.png",
  "/environment/bg-hills-far.png",
  "/environment/bg-hills-mid.png",
  "/environment/tile-grass.png",
  "/environment/tile-brick.png",
  "/environment/minicoin-sheet.png",
  "/coins/spin24-rainbow.png",
  "/environment/cloud-xs.png",
  "/environment/cloud-s.png",
  "/environment/cloud-m.png",
  "/environment/cloud-l.png",
  "/environment/cloud-xl.png",
  "/environment/meteor-1.png",
  "/environment/meteor-2.png",
  "/environment/meteor-3.png",
  "/environment/explosion-1.png",
  "/environment/explosion-2.png",
  "/environment/explosion-3.png",
  "/environment/explosion-4.png",
  "/environment/explosion-5.png",
  "/environment/sparkle-1.png",
  "/environment/sparkle-2.png",
  "/environment/sparkle-3.png",
  "/environment/sparkle-4.png",
  "/environment/text-plus1.png",
  "/environment/flag-1.png",
  "/environment/flag-2.png",
  "/environment/flag-3.png",
  "/environment/flag-4.png",
] as const;

interface CloudInstance {
  sprite: string;
  x: number;
  yFrac: number;
  inStrip: boolean;
  stripY: number;
  speed: number;
  w: number;
  h: number;
}

interface DynamicMiniCoin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  collectedAt: number; // elapsedSec when touched
}

const INITIAL_CLOUDS: CloudInstance[] = [
  { sprite: "/environment/cloud-xl.png", x: 60, yFrac: 0.16, inStrip: false, stripY: 18, speed: 12, w: 112, h: 56 },
  { sprite: "/environment/cloud-m.png", x: 220, yFrac: 0.38, inStrip: false, stripY: 36, speed: 18, w: 62, h: 38 },
  { sprite: "/environment/cloud-l.png", x: 390, yFrac: 0.22, inStrip: false, stripY: 22, speed: 14, w: 86, h: 48 },
  { sprite: "/environment/cloud-s.png", x: 560, yFrac: 0.58, inStrip: false, stripY: 48, speed: 22, w: 44, h: 30 },
  { sprite: "/environment/cloud-xs.png", x: 710, yFrac: 0.76, inStrip: false, stripY: 16, speed: 25, w: 34, h: 26 },
  { sprite: "/environment/cloud-m.png", x: 880, yFrac: 0.48, inStrip: false, stripY: 28, speed: 17, w: 62, h: 38 },
  { sprite: "/environment/cloud-xs.png", x: 140, yFrac: 0.75, inStrip: true, stripY: 16, speed: 26, w: 34, h: 26 },
  { sprite: "/environment/cloud-m.png", x: 350, yFrac: 0.5, inStrip: true, stripY: 28, speed: 16, w: 62, h: 38 },
  { sprite: "/environment/cloud-s.png", x: 530, yFrac: 0.3, inStrip: true, stripY: 14, speed: 21, w: 44, h: 30 },
  { sprite: "/environment/cloud-l.png", x: 760, yFrac: 0.2, inStrip: true, stripY: 20, speed: 13, w: 86, h: 48 },
  { sprite: "/environment/cloud-xs.png", x: 960, yFrac: 0.4, inStrip: true, stripY: 34, speed: 25, w: 34, h: 26 },
  { sprite: "/environment/cloud-xl.png", x: 1150, yFrac: 0.15, inStrip: true, stripY: 12, speed: 11, w: 112, h: 56 },
];

export default function LoadingScreen() {
  const [visible, setVisible] = useState<boolean>(true);
  const [isWiping, setIsWiping] = useState<boolean>(false);
  const [reducedFadeOut, setReducedFadeOut] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarFillRef = useRef<HTMLDivElement>(null);
  const progressBarRoleRef = useRef<HTMLDivElement>(null);
  const wipeTriggeredRef = useRef<boolean>(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const finishedRef = useRef<boolean>(false);

  // Finish and unmount loader
  const finishLoader = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    
    // Page must always be at the very top after the loader finishes
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    document.body.style.overflow = "";
    if (tlRef.current) {
      tlRef.current.kill();
      tlRef.current = null;
    }
    setVisible(false);
  }, []);

  // Skip jumps directly to the pixel-block wipe (t = 11.8s)
  const handleSkip = useCallback(() => {
    if (finishedRef.current) return;
    const tl = tlRef.current;
    if (tl) {
      if (tl.time() < 11.8) {
        wipeTriggeredRef.current = true;
        setIsWiping(true);
        if (progressBarFillRef.current) {
          progressBarFillRef.current.style.width = "100%";
        }
        tl.seek(11.8, false);
        tl.play();
      }
    } else {
      finishLoader();
    }
  }, [finishLoader]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // (3) REPLAY & SCROLL RESET:
    // Play on EVERY page load and refresh (no sessionStorage flag)
    // Page must always start at the very top:
    // set history.scrollRestoration = 'manual', strip any #hash, window.scrollTo(0,0) before and after
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);

    setVisible(true);
    document.body.style.overflow = "hidden";

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    let isCancelled = false;

    // Startup audio initialization (AudioContext + pre-rendered AudioBuffers)
    initAudio();

    // Preload & DECODE all critical images before starting
    const imageMap = new Map<string, HTMLImageElement>();
    let loadedCount = 0;
    const totalAssets = CRITICAL_ASSETS.length;
    let allAssetsLoaded = false;

    const loadSingleImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = async () => {
          try {
            if ("decode" in img) {
              await img.decode();
            }
          } catch {}
          imageMap.set(src, img);
          loadedCount++;
          if (loadedCount >= totalAssets) allAssetsLoaded = true;
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount >= totalAssets) allAssetsLoaded = true;
          resolve();
        };
        img.src = src;
      });

    // Wait for ALL assets and fonts so nothing decodes mid-animation
    const assetsPromise = Promise.all(
      CRITICAL_ASSETS.map((src) => loadSingleImage(src))
    );
    const fontsPromise =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();

    Promise.all([assetsPromise, fontsPromise]).then(() => {
      if (isCancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Warm up: draw one frame of every sprite and effect offscreen
      // so GPU textures and shaders are fully uploaded before timeline starts
      const warmupCanvas = document.createElement("canvas");
      warmupCanvas.width = 128;
      warmupCanvas.height = 128;
      const wCtx = warmupCanvas.getContext("2d");
      if (wCtx) {
        imageMap.forEach((img) => {
          try {
            wCtx.drawImage(
              img,
              0,
              0,
              Math.min(128, img.naturalWidth || 32),
              Math.min(128, img.naturalHeight || 32)
            );
          } catch {}
        });
      }

      // Prepare offscreen decor canvas (level-loading-decor.png now contains NO coins;
      // only clear the static flag at x=1660 so waving flag-1..4 replaces it cleanly)
      const decorImg = imageMap.get("/environment/level-loading-decor.png");
      const decorCanvas = document.createElement("canvas");
      decorCanvas.width = 1920;
      decorCanvas.height = 216;
      const decorCtx = decorCanvas.getContext("2d");
      if (decorCtx && decorImg) {
        decorCtx.drawImage(decorImg, 0, 0);
        decorCtx.clearRect(1660, 68, 42, 100);
      }

      // Compute integer scale S:
      // S = clamp(floor(0.8 * viewportHeight / 216), 1, 6)
      // and then LOWER S until visible native width floor(viewportWidth / S) is at least 300.
      const computeMetrics = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let S = Math.max(1, Math.min(6, Math.floor((0.8 * vh) / 216)));
        while (S > 1 && Math.floor(vw / S) < 300) {
          S--;
        }
        const Wn = Math.ceil(vw / S);
        const Hn = Math.ceil(vh / S);
        if (canvas.width !== Wn || canvas.height !== Hn) {
          canvas.width = Wn;
          canvas.height = Hn;
        }
        // When screen is much taller than the 216px strip (portrait letterbox, e.g. 390x844 where Hn=844),
        // position strip in the vertical middle so sky fills above and ground tiles continue below.
        // On desktop/landscape (e.g. 1440x900 where S=3, Hn=300), align strip to the bottom of the viewport.
        const isTallLetterbox = Hn > 340;
        const baseStripTop = isTallLetterbox
          ? Math.floor((Hn - 216) * 0.52)
          : Hn - 216;
        return { vw, vh, S, Wn, Hn, baseStripTop, isTallLetterbox };
      };

      const pits = levelData.loading.pits || [
        { startX: 256, width: 64 },
        { startX: 544, width: 64 },
        { startX: 832, width: 64 },
      ];

      const isInsidePit = (worldX: number) => {
        for (const pit of pits) {
          if (worldX >= pit.startX && worldX < pit.startX + pit.width) {
            return true;
          }
        }
        return false;
      };

      // Helper to draw extra ground rows below stripTop + 216 when screen is taller than the strip
      const drawGroundExtensionBelow = (camX: number, stripTop: number, Wn: number, Hn: number) => {
        const bottomStart = stripTop + 216;
        if (bottomStart >= Hn) return 0;
        const brickImg = imageMap.get("/environment/tile-brick.png");
        const grassImg = imageMap.get("/environment/tile-grass.png");
        if (!brickImg) return 0;

        let rowsDrawn = 0;
        const firstTileWorldX = Math.floor(camX / 16) * 16;
        for (let y = bottomStart; y < Hn; y += 16) {
          const tileSprite = rowsDrawn === 0 && grassImg ? brickImg : brickImg;
          for (let wx = firstTileWorldX; wx < camX + Wn + 16; wx += 16) {
            if (isInsidePit(wx)) continue;
            const screenX = Math.round(wx - camX);
            ctx.drawImage(tileSprite, screenX, y, 16, 16);
          }
          rowsDrawn++;
        }
        return rowsDrawn;
      };

      // REDUCED MOTION: static frame (sky, hills, rainbow, coin) for 1.5s then fade out
      if (prefersReduced) {
        const { Wn, Hn, baseStripTop } = computeMetrics();
        ctx.imageSmoothingEnabled = false;
        const stripTop = baseStripTop;

        const bands = ["#5C94FC", "#6EA2FD", "#82B1FE", "#A6C8FF"];
        const skyBottom = stripTop + 168;
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = bands[i];
          const y0 = Math.floor((skyBottom * i) / 4);
          const y1 = Math.floor((skyBottom * (i + 1)) / 4);
          ctx.fillRect(0, y0, Wn, y1 - y0);
        }
        ctx.fillStyle = "#5C94FC";
        ctx.fillRect(0, skyBottom, Wn, Hn - skyBottom);

        const hillsFar = imageMap.get("/environment/bg-hills-far.png");
        const hillsMid = imageMap.get("/environment/bg-hills-mid.png");
        const groundImg = imageMap.get("/environment/level-loading-ground.png");
        const heroSheet = imageMap.get("/character/devj-sheet-nobubble.png");
        const spinRainbow = imageMap.get("/coins/spin24-rainbow.png");

        if (hillsFar) ctx.drawImage(hillsFar, 0, stripTop);
        if (hillsMid) ctx.drawImage(hillsMid, 0, stripTop);
        ctx.drawImage(decorCanvas, 0, stripTop);
        if (groundImg) ctx.drawImage(groundImg, 0, stripTop);
        drawGroundExtensionBelow(0, stripTop, Wn, Hn);
        if (heroSheet) {
          ctx.drawImage(heroSheet, 0, 0, 36, 50, 60 - 18, stripTop + 168 - 48, 36, 50);
        }
        if (spinRainbow) {
          ctx.drawImage(spinRainbow, 0, 0, 35, 35, 140, stripTop + 58, 70, 70);
        }
        if (progressBarFillRef.current) {
          progressBarFillRef.current.style.width = "100%";
        }

        const t1 = setTimeout(() => {
          setReducedFadeOut(true);
        }, 1200);
        const t2 = setTimeout(() => {
          finishLoader();
        }, 1500);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }

      // Initialize the 12 dynamic gold mini coins from level-data.json -> loading.coins.items
      const rawCoinItems = levelData.loading.coins?.items || [];
      const miniCoins: DynamicMiniCoin[] = rawCoinItems.map((item, idx) => ({
        id: idx,
        x: item.x,
        y: item.y,
        collected: false,
        collectedAt: -1,
      }));

      // Scene state animated by GSAP master timeline
      const state = {
        heroX: 40,
        jumpOffsetY: 0, // negative when up in air
        phase: "fadein" as
          | "fadein"
          | "run"
          | "jump1"
          | "jump2"
          | "jump3"
          | "leapCoin"
          | "lookUp"
          | "meteor"
          | "impact"
          | "explode"
          | "wipe",
        skyFadeAlpha: 1, // 0.0-0.4s fade in from sky
        coinCollected: false,
        plus1Y: 0,
        plus1Alpha: 0,
        sparkleProgress: -1,
        camBounceY: 0,
        orangeTint: 0,
        meteorProgress: -1, // 0..1 during 8.4..10.4s
        flashAlpha: 0,
        shakeActive: 0,
        explosionProgress: -1, // 0..1 during 10.4..11.8s
        wipeProgress: -1, // 0..1 during 11.8..13.0s
      };

      // Deterministic random thresholds for pixel-block wipe grid
      const wipeThresholds: number[] = [];
      let seed = 1337;
      for (let i = 0; i < 4000; i++) {
        seed = (seed * 16807) % 2147483647;
        wipeThresholds.push((seed - 1) / 2147483646);
      }

      // Build GSAP Master Timeline (13.0s total)
      // PERFORMANCE RULE (3): No React state updates per frame, no re-renders inside the loop
      const tl = gsap.timeline({
        onUpdate: () => {
          const t = tl.time();
          const pct = Math.min(100, Math.max(0, (t / 11.8) * 100));
          if (progressBarFillRef.current) {
            progressBarFillRef.current.style.width = `${pct}%`;
          }
          if (progressBarRoleRef.current) {
            progressBarRoleRef.current.setAttribute(
              "aria-valuenow",
              String(Math.round(pct))
            );
          }
          if (t >= 11.8 && !wipeTriggeredRef.current) {
            wipeTriggeredRef.current = true;
            setIsWiping(true);
          }
        },
        onComplete: () => {
          finishLoader();
        },
      });
      tlRef.current = tl;

      // 0.0 - 0.4s: fade in from sky. Hero standing at x=40.
      tl.set(state, { heroX: 40, jumpOffsetY: 0, phase: "fadein", skyFadeAlpha: 1 }, 0);
      tl.to(state, { skyFadeAlpha: 0, duration: 0.4, ease: "power1.out" }, 0);

      // 0.4 - 1.8s: run right to x=232
      tl.set(state, { phase: "run" }, 0.4);
      tl.to(state, { heroX: 232, duration: 1.4, ease: "none" }, 0.4);

      // 1.8 - 2.6s: JUMP over pit 1 (takeoff 232, land 344, apex 44px)
      tl.set(state, { phase: "jump1" }, 1.8);
      tl.to(
        state,
        {
          heroX: 344,
          duration: 0.8,
          ease: "none",
          onUpdate: function () {
            const p = this.progress();
            state.jumpOffsetY = -4 * 44 * p * (1 - p);
          },
          onComplete: () => {
            state.jumpOffsetY = 0;
          },
        },
        1.8
      );

      // 2.6 - 3.8s: run to x=520
      tl.set(state, { phase: "run", jumpOffsetY: 0 }, 2.6);
      tl.to(state, { heroX: 520, duration: 1.2, ease: "none" }, 2.6);

      // 3.8 - 4.6s: JUMP over pit 2 (takeoff 520, land 632, apex 44px)
      tl.set(state, { phase: "jump2" }, 3.8);
      tl.to(
        state,
        {
          heroX: 632,
          duration: 0.8,
          ease: "none",
          onUpdate: function () {
            const p = this.progress();
            state.jumpOffsetY = -4 * 44 * p * (1 - p);
          },
          onComplete: () => {
            state.jumpOffsetY = 0;
          },
        },
        3.8
      );

      // 4.6 - 5.9s: run to x=808
      tl.set(state, { phase: "run", jumpOffsetY: 0 }, 4.6);
      tl.to(state, { heroX: 808, duration: 1.3, ease: "none" }, 4.6);

      // 5.9 - 6.7s: JUMP over pit 3 (takeoff 808, land 920, apex 44px)
      tl.set(state, { phase: "jump3" }, 5.9);
      tl.to(
        state,
        {
          heroX: 920,
          duration: 0.8,
          ease: "none",
          onUpdate: function () {
            const p = this.progress();
            state.jumpOffsetY = -4 * 44 * p * (1 - p);
          },
          onComplete: () => {
            state.jumpOffsetY = 0;
          },
        },
        5.9
      );

      // 6.7 - 7.1s: run to x=980
      tl.set(state, { phase: "run", jumpOffsetY: 0 }, 6.7);
      tl.to(state, { heroX: 980, duration: 0.4, ease: "none" }, 6.7);

      // 7.1 - 7.8s: leap and touch the rainbow coin at x=1010, y=168-110
      tl.set(state, { phase: "leapCoin" }, 7.1);
      tl.to(
        state,
        {
          heroX: 1010,
          duration: 0.7,
          ease: "none",
          onUpdate: function () {
            const p = this.progress();
            state.jumpOffsetY = -4 * 52 * p * (1 - p);
          },
          onComplete: () => {
            state.jumpOffsetY = 0;
          },
        },
        7.1
      );

      // At 7.35s (apex of leap): coin pops, sparkle-1..4 burst, text-plus1 rises & fades, small camera bounce, kling sfx
      tl.call(
        () => {
          state.coinCollected = true;
          state.plus1Alpha = 1;
          state.plus1Y = 0;
          state.sparkleProgress = 0;
          playCoinKling();
        },
        [],
        7.35
      );
      tl.to(state, { sparkleProgress: 1, duration: 0.4, ease: "none" }, 7.35);
      tl.to(state, { plus1Y: -28, plus1Alpha: 0, duration: 0.45, ease: "power1.out" }, 7.35);
      tl.to(state, { camBounceY: -5, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" }, 7.35);

      // 7.8 - 8.4s: pause; hero looks up (frame 12); sky tints slightly orange (0 to 0.18)
      tl.set(state, { phase: "lookUp", jumpOffsetY: 0 }, 7.8);
      tl.to(state, { orangeTint: 0.18, duration: 0.6, ease: "power1.inOut" }, 7.8);

      // 8.4 - 10.4s: HUGE METEOR enters from top-right outside screen and streaks diagonally toward hero
      tl.set(state, { phase: "meteor", meteorProgress: 0 }, 8.4);
      tl.to(state, { meteorProgress: 1, duration: 2.0, ease: "none" }, 8.4);

      // 10.4 - 10.5s: IMPACT: white-orange flash (1 to 0 over 400ms), 500ms screen shake (+-8px),
      // explosion-1..5 at scale 2*S centered on hero, hero switches to frame 13 (squash)
      tl.call(
        () => {
          state.phase = "impact";
          state.meteorProgress = -1;
          state.flashAlpha = 1;
          state.shakeActive = 1;
          state.explosionProgress = 0;
          playBoomSfx();
        },
        [],
        10.4
      );
      tl.to(state, { flashAlpha: 0, duration: 0.4, ease: "power2.out" }, 10.4);
      tl.to(state, { shakeActive: 0, duration: 0.5, ease: "none" }, 10.4);

      // 10.4 - 11.8s: explosion plays out; smoke dims
      tl.to(state, { explosionProgress: 1, duration: 1.4, ease: "none" }, 10.4);

      // 11.8 - 13.0s: PIXEL-BLOCK WIPE: grid of 8*S square blocks in sky blue dissolves in random order
      tl.set(state, { phase: "wipe", wipeProgress: 0 }, 11.8);
      tl.to(state, { wipeProgress: 1, duration: 1.2, ease: "none" }, 11.8);

      // Cloud simulation state
      const clouds = INITIAL_CLOUDS.map((c) => ({ ...c }));
      let lastTime = performance.now();
      let smoothCamX = 0;
      const startTimestamp = performance.now();

      const renderLoop = (now: number) => {
        if (isCancelled || finishedRef.current) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        const elapsedSec = (now - startTimestamp) / 1000;

        // If preloading is not finished by 8s, hold briefly on the running scene, but never exceed 20s total
        if (!allAssetsLoaded && tl.time() >= 7.0 && tl.time() < 7.1 && elapsedSec < 14) {
          tl.pause();
        } else if (tl.paused() && state.phase !== "wipe") {
          tl.play();
        }

        const { S, Wn, Hn, baseStripTop, isTallLetterbox } = computeMetrics();
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, Wn, Hn);

        // During pixel-block wipe (11.8-13.0s), a grid of square blocks (size = 8*S px)
        // covers the screen in sky blue then dissolves in random order, revealing the white website
        if (state.phase === "wipe" && state.wipeProgress >= 0) {
          const dissolveP = Math.max(0, (state.wipeProgress - 0.12) / 0.88);
          const blockNative = 8; // 8 native pixels = 8*S CSS pixels
          const cols = Math.ceil(Wn / blockNative);
          const rows = Math.ceil(Hn / blockNative);

          let idx = 0;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const threshold = wipeThresholds[idx % wipeThresholds.length];
              idx++;
              if (dissolveP < threshold) {
                const bx = c * blockNative;
                const by = r * blockNative;
                ctx.fillStyle = "#5C94FC";
                ctx.fillRect(bx, by, blockNative, blockNative);
                ctx.fillStyle = "#4B83EB";
                ctx.fillRect(bx, by + blockNative - 1, blockNative, 1);
                ctx.fillRect(bx + blockNative - 1, by, 1, blockNative);
              }
            }
          }

          if (containerRef.current) {
            containerRef.current.style.transform = "translate3d(0,0,0)";
          }

          rafId = requestAnimationFrame(renderLoop);
          return;
        }

        // Camera follows hero horizontally (smooth, hero kept around 35% of viewport width)
        const targetCamX = Math.max(
          0,
          Math.min(1920 - Wn, state.heroX - Wn * 0.35)
        );
        smoothCamX += (targetCamX - smoothCamX) * Math.min(1, dt * 12);
        const camX = Math.round(smoothCamX);
        const stripTop = baseStripTop + Math.round(state.camBounceY);

        // 1. Stepped sky bands (#5C94FC to #A6C8FF) filling from top of screen to ground line
        const skyColors = ["#5C94FC", "#6EA2FD", "#82B1FE", "#A6C8FF"];
        const skyBottom = stripTop + 168;
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = skyColors[i];
          const y0 = Math.floor((skyBottom * i) / 4);
          const y1 = Math.floor((skyBottom * (i + 1)) / 4);
          ctx.fillRect(0, y0, Wn, y1 - y0);
        }
        // Fill below ground line with sky blue behind pits
        ctx.fillStyle = "#5C94FC";
        ctx.fillRect(0, skyBottom, Wn, Hn - skyBottom);

        // 2. Drifting clouds (always moving, both in sky area above strip and inside strip)
        for (const c of clouds) {
          c.x -= c.speed * dt;
          if (c.x < -c.w - 40) {
            c.x += 1400;
          }
          const img = imageMap.get(c.sprite);
          if (img) {
            const drawX = Math.round(c.x - camX * 0.15);
            const wrappedX =
              (((drawX + 120) % (Wn + 240)) + (Wn + 240)) % (Wn + 240) - 120;
            const upperSkyH = Math.max(24, stripTop);
            const drawY = c.inStrip
              ? stripTop + c.stripY
              : Math.round(c.yFrac * Math.max(10, upperSkyH - c.h));
            ctx.drawImage(img, wrappedX, drawY, c.w, c.h);
          }
        }

        // 3. bg-hills-far (parallax 0.2, 768x216 tileable)
        const hillsFar = imageMap.get("/environment/bg-hills-far.png");
        if (hillsFar) {
          const farOffset = -Math.round(camX * 0.2) % 768;
          for (let hx = farOffset - 768; hx < Wn + 768; hx += 768) {
            ctx.drawImage(hillsFar, hx, stripTop, 768, 216);
          }
        }

        // 4. bg-hills-mid (parallax 0.4, 768x216 tileable)
        const hillsMid = imageMap.get("/environment/bg-hills-mid.png");
        if (hillsMid) {
          const midOffset = -Math.round(camX * 0.4) % 768;
          for (let hx = midOffset - 768; hx < Wn + 768; hx += 768) {
            ctx.drawImage(hillsMid, hx, stripTop, 768, 216);
          }
        }

        // 5. level-loading-decor.png (contains NO coins)
        ctx.drawImage(decorCanvas, -camX, stripTop, 1920, 216);

        // Waving flag at x=1660, y=70 (4 frames)
        const flagFrameIdx = (Math.floor(elapsedSec * 6) % 4) + 1;
        const flagImg = imageMap.get(`/environment/flag-${flagFrameIdx}.png`);
        if (flagImg) {
          ctx.drawImage(flagImg, 1660 - camX, stripTop + 70, 40, 100);
        }

        // 6. Dynamic 12 gold mini coins from level-data.json -> loading.coins.items
        // Check hero hitbox overlap and collect immediately on touch
        const heroHitLeft = state.heroX - 11;
        const heroHitRight = state.heroX + 11;
        const heroHitTop = 168 - 44 + state.jumpOffsetY;
        const heroHitBottom = 168 + state.jumpOffsetY;

        for (const coin of miniCoins) {
          if (!coin.collected) {
            const overlapsX = heroHitRight >= coin.x && heroHitLeft <= coin.x + 14;
            const overlapsY = heroHitBottom >= coin.y && heroHitTop <= coin.y + 18;
            // Also collect if hero has already jumped past the coin's right edge
            if ((overlapsX && overlapsY) || state.heroX >= coin.x + 12) {
              coin.collected = true;
              coin.collectedAt = elapsedSec;
              playCoinKling();
            }
          }
        }

        const minicoinSheet = imageMap.get("/environment/minicoin-sheet.png");
        if (minicoinSheet) {
          const mcFrame = Math.floor(elapsedSec * 8) % 4;
          for (const coin of miniCoins) {
            if (!coin.collected) {
              // Uncollected spinning gold mini coin
              ctx.drawImage(
                minicoinSheet,
                mcFrame * 14,
                0,
                14,
                18,
                Math.round(coin.x - camX),
                stripTop + coin.y,
                14,
                18
              );
            } else {
              // Collected: pops up 10px and fades out over 180ms + twinkle (sparkle-1..4, 1x)
              const age = elapsedSec - coin.collectedAt;
              if (age >= 0 && age < 0.18) {
                const p = age / 0.18;
                const popY = Math.round(-10 * (1 - Math.pow(1 - p, 2)));
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - p);
                ctx.drawImage(
                  minicoinSheet,
                  mcFrame * 14,
                  0,
                  14,
                  18,
                  Math.round(coin.x - camX),
                  stripTop + coin.y + popY,
                  14,
                  18
                );
                ctx.restore();
              }
              if (age >= 0 && age < 0.24) {
                const spIdx = Math.min(4, Math.floor((age / 0.24) * 4) + 1);
                const spImg = imageMap.get(`/environment/sparkle-${spIdx}.png`);
                if (spImg) {
                  ctx.drawImage(
                    spImg,
                    Math.round(coin.x + 7 - 12 - camX),
                    stripTop + coin.y + 9 - 12 - 6,
                    24,
                    24
                  );
                }
              }
            }
          }
        }

        // 7. level-loading-ground.png + extra ground rows below when screen is taller than the strip
        const groundImg = imageMap.get("/environment/level-loading-ground.png");
        if (groundImg) {
          ctx.drawImage(groundImg, -camX, stripTop, 1920, 216);
        }
        const extraRowsBelow = drawGroundExtensionBelow(camX, stripTop, Wn, Hn);

        // 8. Large RAINBOW COIN hovering at x=1010, y=168-110=58
        // (spin24-rainbow.png, 24 frames of 35x35, drawn at 2x native = 70x70 world px, 1.0s per rotation, steps(24))
        if (!state.coinCollected) {
          const spinRainbow = imageMap.get("/coins/spin24-rainbow.png");
          if (spinRainbow) {
            const coinFrame = Math.floor(elapsedSec * 24) % 24;
            const bobY = Math.round(Math.sin(elapsedSec * 4) * 2);
            ctx.drawImage(
              spinRainbow,
              coinFrame * 35,
              0,
              35,
              35,
              Math.round(1010 - 35 - camX),
              stripTop + (168 - 110) + bobY,
              70,
              70
            );
          }
        }

        // 9. Hero character (devj-sheet-nobubble.png, 36x50, center x=18, feet y=48)
        const heroSheet = imageMap.get("/character/devj-sheet-nobubble.png");
        if (heroSheet) {
          let frameIndex = 0;
          const t = tl.time();
          if (state.phase === "fadein") {
            frameIndex = 0;
          } else if (state.phase === "run") {
            const runCycle = [2, 3, 4, 5, 6];
            frameIndex = runCycle[Math.floor(t * 10) % runCycle.length];
          } else if (
            state.phase === "jump1" ||
            state.phase === "jump2" ||
            state.phase === "jump3" ||
            state.phase === "leapCoin"
          ) {
            const prevY = state.jumpOffsetY;
            let rising = true;
            if (state.phase === "jump1") rising = t < 2.2;
            else if (state.phase === "jump2") rising = t < 4.2;
            else if (state.phase === "jump3") rising = t < 6.3;
            else if (state.phase === "leapCoin") rising = t < 7.45;
            frameIndex = rising && prevY <= 0 ? 7 : 8;
          } else if (state.phase === "lookUp" || state.phase === "meteor") {
            frameIndex = 12; // look up
          } else if (state.phase === "impact" || state.phase === "explode") {
            frameIndex = 13; // squash
          }

          const heroDrawX = Math.round(state.heroX - 18 - camX);
          const heroDrawY = Math.round(stripTop + 168 - 48 + state.jumpOffsetY);
          ctx.drawImage(
            heroSheet,
            frameIndex * 36,
            0,
            36,
            50,
            heroDrawX,
            heroDrawY,
            36,
            50
          );

          // Draw "?" / "!" bubble above head during lookUp/meteor
          if (state.phase === "lookUp" || state.phase === "meteor") {
            const bubbleImg = imageMap.get(
              state.phase === "meteor"
                ? "/character/bubble-exclaim.png"
                : "/character/bubble-question.png"
            );
            if (bubbleImg) {
              ctx.drawImage(
                bubbleImg,
                heroDrawX + 24,
                heroDrawY - 12,
                12,
                15
              );
            }
          }
        }

        // 10. Rainbow Coin pickup effects: sparkle-1..4 burst + text-plus1 (+1)
        if (state.sparkleProgress >= 0 && state.sparkleProgress < 1) {
          const spFrame = Math.min(4, Math.floor(state.sparkleProgress * 4) + 1);
          const spImg = imageMap.get(`/environment/sparkle-${spFrame}.png`);
          if (spImg) {
            const cx = Math.round(1010 - camX);
            const cy = stripTop + 88;
            const spread = Math.round(state.sparkleProgress * 18);
            ctx.drawImage(spImg, cx - 12 - spread, cy - 12 - spread, 24, 24);
            ctx.drawImage(spImg, cx - 12 + spread, cy - 12 - spread, 24, 24);
            ctx.drawImage(spImg, cx - 12, cy - 12 + spread, 24, 24);
          }
        }

        if (state.plus1Alpha > 0.01) {
          const plusImg = imageMap.get("/environment/text-plus1.png");
          if (plusImg) {
            ctx.save();
            ctx.globalAlpha = state.plus1Alpha;
            ctx.drawImage(
              plusImg,
              Math.round(1010 - 9 - camX),
              Math.round(stripTop + 64 + state.plus1Y),
              19,
              13
            );
            ctx.restore();
          }
        }

        // 11. Sky orange tint (7.8s onwards)
        if (state.orangeTint > 0.005) {
          ctx.fillStyle = `rgba(255, 115, 20, ${state.orangeTint.toFixed(3)})`;
          ctx.fillRect(0, 0, Wn, Hn);
        }

        // 12. HUGE METEOR (8.4-10.4s): meteor-1..3 (190x120 native), loop at 12 fps, scale 2*S, capped so never wider than viewport
        if (state.meteorProgress >= 0 && state.meteorProgress <= 1) {
          const mFrame = (Math.floor(elapsedSec * 12) % 3) + 1;
          const mImg = imageMap.get(`/environment/meteor-${mFrame}.png`);
          if (mImg) {
            const p = state.meteorProgress;
            const meteorW = Math.min(380, Wn);
            const meteorH = Math.round(meteorW * (120 / 190));
            const targetHeadX = Math.round(state.heroX - camX);
            const targetHeadY = stripTop + 160;
            const startHeadX = Wn + 24;
            const startHeadY = Math.max(-8, stripTop - 100);
            const curHeadX = Math.round(startHeadX + (targetHeadX - startHeadX) * p);
            const curHeadY = Math.round(startHeadY + (targetHeadY - startHeadY) * p);
            ctx.drawImage(
              mImg,
              curHeadX - Math.round(meteorW * 0.1),
              curHeadY - Math.round(meteorH * 0.88),
              meteorW,
              meteorH
            );
          }
        }

        // 13. IMPACT EXPLOSION (10.4-11.8s): explosion-1..5 (72x72 native) at scale 2*S (= 144x144 strip units) centered on hero
        if (state.explosionProgress >= 0 && state.explosionProgress <= 1) {
          const ep = state.explosionProgress;
          const expHeroX = Math.round(state.heroX - camX);
          const expHeroY = stripTop + 144;

          if (ep < 0.55) {
            const eFrame = Math.min(5, Math.floor((ep / 0.55) * 5) + 1);
            const eImg = imageMap.get(`/environment/explosion-${eFrame}.png`);
            if (eImg) {
              ctx.drawImage(
                eImg,
                expHeroX - 72,
                expHeroY - 72,
                144,
                144
              );
            }
          } else {
            const smokeAlpha = Math.max(0, 1 - (ep - 0.55) / 0.45);
            const eImg5 = imageMap.get("/environment/explosion-5.png");
            if (eImg5 && smokeAlpha > 0) {
              ctx.save();
              ctx.globalAlpha = smokeAlpha * 0.85;
              ctx.drawImage(
                eImg5,
                expHeroX - 72,
                expHeroY - 76 - Math.round((ep - 0.55) * 24),
                144,
                144
              );
              ctx.restore();
            }
          }
        }

        // 14. Full-screen white-orange impact flash (10.4-10.8s)
        if (state.flashAlpha > 0.01) {
          ctx.fillStyle = `rgba(255, 235, 200, ${state.flashAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, Wn, Hn);
        }

        // 15. Initial fade-in from sky (0.0-0.4s)
        if (state.skyFadeAlpha > 0.01) {
          ctx.fillStyle = `rgba(92, 148, 252, ${state.skyFadeAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, Wn, Hn);
        }

        // 16. 500ms Screen Shake (+-8px CSS)
        if (containerRef.current) {
          if (state.shakeActive > 0.01) {
            const sx = Math.round((Math.random() * 2 - 1) * 8);
            const sy = Math.round((Math.random() * 2 - 1) * 8);
            containerRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
          } else {
            containerRef.current.style.transform = "translate3d(0, 0, 0)";
          }
        }

        // Expose live telemetry on canvas dataset for verification checks
        const collectedCount = miniCoins.filter((c) => c.collected).length;
        canvas.dataset.scaleS = String(S);
        canvas.dataset.nativeW = String(Wn);
        canvas.dataset.nativeH = String(Hn);
        canvas.dataset.stripTop = String(stripTop);
        canvas.dataset.extraRowsBelow = String(extraRowsBelow);
        canvas.dataset.isTallLetterbox = String(isTallLetterbox);
        canvas.dataset.totalMiniCoins = String(miniCoins.length);
        canvas.dataset.collectedMiniCoins = String(collectedCount);
        canvas.dataset.heroX = String(Math.round(state.heroX));
        canvas.dataset.rainbowCollected = String(state.coinCollected);

        rafId = requestAnimationFrame(renderLoop);
      };

      rafId = requestAnimationFrame(renderLoop);
    });

    // Global keyboard shortcut: Enter or Esc skips intro
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Safety cap: never exceed 20s total
    const safetyTimer = setTimeout(() => {
      finishLoader();
    }, 19800);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(safetyTimer);
      window.removeEventListener("keydown", onKeyDown);
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      document.body.style.overflow = "";
    };
  }, [finishLoader, handleSkip]);

  if (!visible) return null;

  return (
    <div
      id="loading-screen"
      ref={containerRef}
      role="dialog"
      aria-label="Intro Cutscene"
      className={`mario-zone fixed inset-0 z-[100] w-screen h-screen overflow-hidden select-none transition-opacity duration-300 ${
        reducedFadeOut ? "opacity-0" : "opacity-100"
      } ${isWiping ? "bg-transparent" : "mario-sky-bands"}`}
    >
      {/* Full-viewport Pixel Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block pixel-art pointer-events-none"
        style={{ imageRendering: "pixelated" }}
        aria-hidden="true"
      />

      {/* HUD (1): Minimal SKIP icon button at TOP RIGHT (32x32 CSS px, double right chevron >> with 2px dark pixel outline, no text) */}
      <button
        type="button"
        onClick={handleSkip}
        aria-label="Lewati intro"
        className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
      >
        <svg
          width="28"
          height="24"
          viewBox="0 0 14 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ imageRendering: "pixelated" }}
          aria-hidden="true"
        >
          {/* 2px dark pixel outline (#2B1B0E) around two joined right-pointing triangles >> */}
          <path
            d="M1 1H4V2H5V3H6V4H7V2H8V1H11V2H12V3H13V4H14V8H13V9H12V10H11V11H8V10H7V8H6V9H5V10H4V11H1V1Z"
            fill="#2B1B0E"
          />
          {/* Left triangle fill */}
          <path
            d="M2 2H3V3H4V4H5V5H6V7H5V8H4V9H3V10H2V2Z"
            fill="#FFFFFF"
          />
          {/* Right triangle fill */}
          <path
            d="M9 2H10V3H11V4H12V5H13V7H12V8H11V9H10V10H9V2Z"
            fill="#FFFFFF"
          />
        </svg>
      </button>

      {/* HUD (2): Tiny "LOADING..." in Press Start 2P (10px) above the left end of the 6px bottom progress bar */}
      <div
        className="absolute left-4 bottom-3 z-20 text-[10px] leading-none text-white pointer-events-none"
        style={{
          fontFamily: "var(--font-press-start-2p)",
          textShadow:
            "2px 0 0 #2B1B0E, -2px 0 0 #2B1B0E, 0 2px 0 #2B1B0E, 0 -2px 0 #2B1B0E, 2px 2px 0 #2B1B0E",
        }}
        aria-hidden="true"
      >
        LOADING...
      </div>

      {/* Thin pixel progress bar (6px high, red #E52521 on translucent dark) pinned to bottom edge */}
      <div
        ref={progressBarRoleRef}
        className="absolute bottom-0 left-0 right-0 z-20 h-[6px] bg-[#2B1B0E]/45 overflow-hidden pointer-events-none"
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading progress"
      >
        <div
          ref={progressBarFillRef}
          className="h-full bg-[#E52521]"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}
