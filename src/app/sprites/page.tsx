"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { packages } from "@/data/packages";

const DEVJ_FRAMES = [
  "idle",
  "breathe",
  "walk1",
  "walk2",
  "walk3",
  "walk4",
  "run",
  "jump",
  "fall",
  "hop",
  "pipe",
  "confused",
  "look",
  "squash",
  "startled",
] as const;

const ENV_STATIC_ITEMS: { name: string; file: string; w: number; h: number; scale: number }[] = [
  { name: "pipe-short", file: "/environment/pipe-short.png", w: 34, h: 32, scale: 2 },
  { name: "pipe-medium", file: "/environment/pipe-medium.png", w: 34, h: 48, scale: 2 },
  { name: "pipe-tall", file: "/environment/pipe-tall.png", w: 34, h: 64, scale: 2 },
  { name: "tile-grass", file: "/environment/tile-grass.png", w: 16, h: 16, scale: 3 },
  { name: "tile-brick", file: "/environment/tile-brick.png", w: 16, h: 16, scale: 3 },
  { name: "block-question-1", file: "/environment/block-question-1.png", w: 16, h: 16, scale: 3 },
  { name: "block-question-2", file: "/environment/block-question-2.png", w: 16, h: 16, scale: 3 },
  { name: "block-stone", file: "/environment/block-stone.png", w: 16, h: 16, scale: 3 },
  { name: "cloud-xs", file: "/environment/cloud-xs.png", w: 34, h: 26, scale: 2 },
  { name: "cloud-s", file: "/environment/cloud-s.png", w: 44, h: 30, scale: 2 },
  { name: "cloud-m", file: "/environment/cloud-m.png", w: 62, h: 38, scale: 2 },
  { name: "cloud-l", file: "/environment/cloud-l.png", w: 86, h: 48, scale: 1 },
  { name: "cloud-xl", file: "/environment/cloud-xl.png", w: 112, h: 56, scale: 1 },
  { name: "bush-s", file: "/environment/bush-s.png", w: 40, h: 28, scale: 2 },
  { name: "bush-l", file: "/environment/bush-l.png", w: 62, h: 36, scale: 2 },
  { name: "hill-s", file: "/environment/hill-s.png", w: 72, h: 36, scale: 1 },
  { name: "hill-l", file: "/environment/hill-l.png", w: 112, h: 56, scale: 1 },
  { name: "rainbow", file: "/environment/rainbow.png", w: 200, h: 100, scale: 1 },
  { name: "text-plus1", file: "/environment/text-plus1.png", w: 19, h: 13, scale: 3 },
];

export default function SpritesPreviewPage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 90);
    return () => clearInterval(interval);
  }, []);

  const walkFrames = [2, 3, 4, 5];
  const currentWalkFrame = walkFrames[tick % 4];
  const currentIdleFrame = tick % 12 < 6 ? 0 : 1;
  const currentPlantFrame = (tick % 4) + 1;
  const currentChompFrame = tick % 2 === 0 ? 3 : 2;
  const currentMeteorFrame = (tick % 3) + 1;
  const currentExplosionFrame = (tick % 5) + 1;
  const currentMinicoinFrame = (tick % 4) + 1;
  const currentSparkleFrame = (tick % 4) + 1;
  const currentFlagFrame = (tick % 4) + 1;
  const currentQBlockFrame = tick % 6 < 3 ? 1 : 2;

  const plantPhaseTick = tick % 40;
  let plantOffsetY = 58;
  let activePipePlantFrame = 1;
  if (plantPhaseTick < 12) {
    plantOffsetY = 58;
    activePipePlantFrame = 1;
  } else if (plantPhaseTick < 17) {
    const p = (plantPhaseTick - 12) / 5;
    plantOffsetY = Math.round(58 - p * 58);
    activePipePlantFrame = 2;
  } else if (plantPhaseTick < 32) {
    plantOffsetY = 0;
    activePipePlantFrame = currentChompFrame;
  } else {
    const p = (plantPhaseTick - 32) / 8;
    plantOffsetY = Math.round(p * 58);
    activePipePlantFrame = 1;
  }

  return (
    <main className="min-h-screen bg-white text-obsidian py-10 px-5 sm:px-6 max-w-[1200px] mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-rule">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-obsidian">
            Phase 1 — Sprite &amp; Animation Catalogue (/sprites)
          </h1>
          <p className="text-sm text-muted mt-1">
            Verifikasi seluruh aset pixel art di <code>public/coins/</code>,{" "}
            <code>public/character/</code>, dan <code>public/environment/</code> dengan integer scale.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-primary hover:bg-primary-hover text-white text-sm font-medium h-11 px-5 rounded-[10px] transition-colors self-start shrink-0"
        >
          Kembali ke Beranda
        </Link>
      </div>

      {/* 1. COINS SPINNING & STATIC */}
      <section className="py-10 border-b border-rule" id="sprites-coins">
        <h2 className="text-xl font-bold text-obsidian mb-2">
          1. Coins — 24-Frame 3D Spin Sheets &amp; Tier Classes
        </h2>
        <p className="text-sm text-muted mb-6">
          Sheet <code>spin24-*.png</code> (648×35 native, 24 frame @ 27×35,{" "}
          <code>steps(24)</code>, <code>--s: 4</code> = 4× native 27×35 coin).
        </p>

        <div className="mario-zone grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {packages.map((pkg, idx) => (
            <div
              key={pkg.id}
              className="mario-box min-w-0 bg-white p-4 flex flex-col items-center"
            >
              <div className="w-full h-44 mario-sky-bands border-4 border-[#2B1B0E] flex flex-col items-center justify-center overflow-hidden relative">
                <div
                  className="coin"
                  style={{
                    ["--s" as string]: 4,
                    backgroundImage: `url(${pkg.coinSpinImage})`,
                    animationDelay: `${-idx * 0.2}s`,
                  }}
                  aria-label={`${pkg.name} spinning coin`}
                />
                <div
                  className="coin-shadow mt-[2px]"
                  style={{ ["--s" as string]: 4 }}
                  aria-hidden="true"
                />
              </div>
              <span className="mario-font text-[11px] text-obsidian mt-4 text-center leading-relaxed">
                {pkg.name}
              </span>
              <span className="text-xs text-muted mt-1 font-mono">
                coin: {pkg.coin} ({pkg.price})
              </span>
              <div className="mt-3 flex items-center gap-3 pt-3 border-t border-rule w-full justify-center">
                <img
                  src={`/coins/coin-${pkg.coin}-27x35.png`}
                  alt={`${pkg.coin} 27x35`}
                  width={27}
                  height={35}
                  className="pixel-art"
                  style={{ width: 27, height: 35 }}
                  title="Native 1x (27x35)"
                />
                <img
                  src={pkg.coinImage}
                  alt={`${pkg.coin} HD`}
                  width={54}
                  height={70}
                  className="pixel-art"
                  style={{ width: 54, height: 70 }}
                  title="HD 2x (54x70)"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. HERO CHARACTER WALK CYCLE & ALL 15 FRAMES */}
      <section className="py-10 border-b border-rule" id="sprites-character">
        <h2 className="text-xl font-bold text-obsidian mb-2">
          2. Hero Character — Walk Cycle &amp; All 15 Sprite Sheet Frames
        </h2>
        <p className="text-sm text-muted mb-6">
          <code>/character/devj-sheet-nobubble.png</code> (15 frame × 36×50 = 540×50, baseline kaki y=48).
        </p>

        {/* Live Character Animations */}
        <div className="mario-zone grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* Walk Right */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-36 mario-sky-bands border-4 border-[#2B1B0E] flex flex-col items-center justify-end overflow-hidden relative">
              <div
                style={{
                  width: 36 * 2,
                  height: 50 * 2,
                  backgroundImage: "url(/character/devj-sheet-nobubble.png)",
                  backgroundPosition: `-${currentWalkFrame * 36 * 2}px 0px`,
                  backgroundSize: `${540 * 2}px ${50 * 2}px`,
                  backgroundRepeat: "no-repeat",
                  imageRendering: "pixelated",
                  marginBottom: -4,
                }}
                aria-label="Hero walk cycle right"
              />
              <div
                className="w-full h-8"
                style={{
                  backgroundImage: "url(/environment/tile-grass.png)",
                  backgroundSize: "32px 32px",
                  imageRendering: "pixelated",
                }}
              />
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              WALK RIGHT (frames 2-5)
            </span>
          </div>

          {/* Walk Left (Mirrored) */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-36 mario-sky-bands border-4 border-[#2B1B0E] flex flex-col items-center justify-end overflow-hidden relative">
              <div
                style={{
                  width: 36 * 2,
                  height: 50 * 2,
                  backgroundImage: "url(/character/devj-sheet-nobubble.png)",
                  backgroundPosition: `-${currentWalkFrame * 36 * 2}px 0px`,
                  backgroundSize: `${540 * 2}px ${50 * 2}px`,
                  backgroundRepeat: "no-repeat",
                  imageRendering: "pixelated",
                  transform: "scaleX(-1)",
                  marginBottom: -4,
                }}
                aria-label="Hero walk cycle left"
              />
              <div
                className="w-full h-8"
                style={{
                  backgroundImage: "url(/environment/tile-grass.png)",
                  backgroundSize: "32px 32px",
                  imageRendering: "pixelated",
                }}
              />
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              WALK LEFT (scaleX -1)
            </span>
          </div>

          {/* Idle / Breathe */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-36 mario-sky-bands border-4 border-[#2B1B0E] flex flex-col items-center justify-end overflow-hidden relative">
              <div
                style={{
                  width: 36 * 2,
                  height: 50 * 2,
                  backgroundImage: "url(/character/devj-sheet-nobubble.png)",
                  backgroundPosition: `-${currentIdleFrame * 36 * 2}px 0px`,
                  backgroundSize: `${540 * 2}px ${50 * 2}px`,
                  backgroundRepeat: "no-repeat",
                  imageRendering: "pixelated",
                  marginBottom: -4,
                }}
                aria-label="Hero idle breathe cycle"
              />
              <div
                className="w-full h-8"
                style={{
                  backgroundImage: "url(/environment/tile-grass.png)",
                  backgroundSize: "32px 32px",
                  imageRendering: "pixelated",
                }}
              />
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              IDLE / BREATHE (frames 0-1)
            </span>
          </div>
        </div>

        {/* All 15 Frames from devj-sheet-nobubble.png */}
        <div className="mario-zone grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
          {DEVJ_FRAMES.map((poseName, idx) => (
            <div
              key={poseName}
              className="border-2 border-[#2B1B0E] bg-[#5C94FC] p-2 flex flex-col items-center min-w-0"
            >
              <div
                style={{
                  width: 36 * 2,
                  height: 50 * 2,
                  backgroundImage: "url(/character/devj-sheet-nobubble.png)",
                  backgroundPosition: `-${idx * 36 * 2}px 0px`,
                  backgroundSize: `${540 * 2}px ${50 * 2}px`,
                  backgroundRepeat: "no-repeat",
                  imageRendering: "pixelated",
                }}
                title={`Frame ${idx}: ${poseName}`}
              />
              <div className="bg-white w-full text-center py-1 mt-1 border-t-2 border-[#2B1B0E]">
                <span className="mario-font text-[9px] text-primary block">
                  #{idx}
                </span>
                <span className="text-[11px] font-semibold text-obsidian">
                  {poseName}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CHOMPER PLANT, METEOR, EXPLOSION, MINICOIN, SPARKLE & FLAG ANIMATIONS */}
      <section className="py-10 border-b border-rule" id="sprites-animations">
        <h2 className="text-xl font-bold text-obsidian mb-2">
          3. Animated Environment &amp; FX Loops (Plant, Meteor, Explosion, Minicoin, Sparkle, Flag)
        </h2>
        <p className="text-sm text-muted mb-6">
          Seluruh animasi sprite environment berjalan secara real-time dengan integer scale.
        </p>

        <div className="mario-zone grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 3A. Chomper Plant + Pipe Clipping Demo */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-52 mario-sky-bands border-4 border-[#2B1B0E] relative flex items-center justify-around overflow-hidden p-3">
              {/* Clipped behind medium pipe */}
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 34 * 2, height: (48 + 52) * 2 }}>
                  <div
                    className="absolute left-0 overflow-hidden"
                    style={{
                      top: 0,
                      width: 34 * 2,
                      height: (52 + 12) * 2,
                    }}
                  >
                    <img
                      src={`/environment/plant-${activePipePlantFrame}.png`}
                      alt="Chomper plant in pipe"
                      className="pixel-art absolute"
                      style={{
                        width: 32 * 2,
                        height: 64 * 2,
                        left: 1 * 2,
                        top: plantOffsetY * 2,
                      }}
                    />
                  </div>
                  <img
                    src="/environment/pipe-medium.png"
                    alt="Medium pipe"
                    className="pixel-art absolute bottom-0 left-0"
                    style={{ width: 34 * 2, height: 48 * 2 }}
                  />
                </div>
              </div>

              {/* Standalone 4-frame plant cycle */}
              <div className="flex flex-col items-center">
                <img
                  src={`/environment/plant-${currentPlantFrame}.png`}
                  alt={`Plant frame ${currentPlantFrame}`}
                  className="pixel-art"
                  style={{ width: 32 * 2, height: 64 * 2 }}
                />
                <span className="mario-font text-[9px] text-white bg-[#2B1B0E] px-1.5 py-0.5 mt-1">
                  FRAME {currentPlantFrame}/4
                </span>
              </div>
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              CHOMPER PLANT (plant-1..4, 32×64)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              {[1, 2, 3, 4].map((n) => (
                <img
                  key={n}
                  src={`/environment/plant-${n}.png`}
                  alt={`plant-${n}`}
                  className="pixel-art border border-rule bg-[#5C94FC]"
                  style={{ width: 32, height: 64 }}
                />
              ))}
            </div>
          </div>

          {/* 3B. Meteor 3-Frame Loop */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-52 bg-[#14171F] border-4 border-[#2B1B0E] flex flex-col items-center justify-center overflow-hidden p-2">
              <img
                src={`/environment/meteor-${currentMeteorFrame}.png`}
                alt={`Meteor frame ${currentMeteorFrame}`}
                className="pixel-art"
                style={{ width: 190, height: 120 }}
              />
              <span className="mario-font text-[9px] text-white mt-2">
                METEOR-{currentMeteorFrame} (190×120)
              </span>
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              METEOR LOOP (meteor-1..3)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {[1, 2, 3].map((n) => (
                <img
                  key={n}
                  src={`/environment/meteor-${n}.png`}
                  alt={`meteor-${n}`}
                  className="pixel-art border border-rule bg-[#14171F]"
                  style={{ width: 76, height: 48 }}
                />
              ))}
            </div>
          </div>

          {/* 3C. Explosion 5-Frame Loop */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-52 bg-[#14171F] border-4 border-[#2B1B0E] flex flex-col items-center justify-center overflow-hidden">
              <img
                src={`/environment/explosion-${currentExplosionFrame}.png`}
                alt={`Explosion frame ${currentExplosionFrame}`}
                className="pixel-art"
                style={{ width: 72 * 2, height: 72 * 2 }}
              />
              <span className="mario-font text-[9px] text-white mt-2">
                EXPLOSION-{currentExplosionFrame} (72×72 @ 2x)
              </span>
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              EXPLOSION LOOP (explosion-1..5)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <img
                  key={n}
                  src={`/environment/explosion-${n}.png`}
                  alt={`explosion-${n}`}
                  className="pixel-art border border-rule bg-[#14171F]"
                  style={{ width: 44, height: 44 }}
                />
              ))}
            </div>
          </div>

          {/* 3D. Minicoin 4-Frame Spin & Sheet */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-44 mario-sky-bands border-4 border-[#2B1B0E] flex items-center justify-around p-4">
              <div className="flex flex-col items-center">
                <div className="minicoin-sprite" title="CSS steps(4) sheet" />
                <span className="mario-font text-[8px] text-obsidian mt-2">
                  SHEET SPIN
                </span>
              </div>
              <div className="flex flex-col items-center">
                <img
                  src={`/environment/minicoin-${currentMinicoinFrame}.png`}
                  alt={`Minicoin ${currentMinicoinFrame}`}
                  className="pixel-art"
                  style={{ width: 14 * 3, height: 18 * 3 }}
                />
                <span className="mario-font text-[8px] text-obsidian mt-2">
                  FRAME {currentMinicoinFrame}/4
                </span>
              </div>
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              MINICOIN (14×18 @ 3x &amp; 56×18 sheet)
            </span>
            <div className="flex items-center gap-3 mt-3">
              {[1, 2, 3, 4].map((n) => (
                <img
                  key={n}
                  src={`/environment/minicoin-${n}.png`}
                  alt={`minicoin-${n}`}
                  className="pixel-art"
                  style={{ width: 14 * 2, height: 18 * 2 }}
                />
              ))}
            </div>
          </div>

          {/* 3E. Sparkle Burst & +1 */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-44 mario-sky-bands border-4 border-[#2B1B0E] flex items-center justify-around p-4">
              <img
                src={`/environment/sparkle-${currentSparkleFrame}.png`}
                alt={`Sparkle ${currentSparkleFrame}`}
                className="pixel-art"
                style={{ width: 24 * 3, height: 24 * 3 }}
              />
              <img
                src="/environment/text-plus1.png"
                alt="+1 text"
                className="pixel-art"
                style={{ width: 19 * 3, height: 13 * 3 }}
              />
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              SPARKLE (24×24) &amp; +1 (19×13)
            </span>
            <div className="flex items-center gap-3 mt-3">
              {[1, 2, 3, 4].map((n) => (
                <img
                  key={n}
                  src={`/environment/sparkle-${n}.png`}
                  alt={`sparkle-${n}`}
                  className="pixel-art bg-[#5C94FC] p-1"
                  style={{ width: 24 * 2, height: 24 * 2 }}
                />
              ))}
            </div>
          </div>

          {/* 3F. Flag Waving & Question Block */}
          <div className="mario-box min-w-0 bg-white p-4 flex flex-col items-center">
            <div className="w-full h-44 mario-sky-bands border-4 border-[#2B1B0E] flex items-center justify-around p-4">
              <img
                src={`/environment/flag-${currentFlagFrame}.png`}
                alt={`Flag ${currentFlagFrame}`}
                className="pixel-art"
                style={{ width: 40, height: 100 }}
              />
              <img
                src={`/environment/block-question-${currentQBlockFrame}.png`}
                alt="Question Block"
                className="pixel-art"
                style={{ width: 16 * 3, height: 16 * 3 }}
              />
            </div>
            <span className="mario-font text-[10px] text-obsidian mt-3 text-center">
              FLAG (flag-1..4, 40×100) &amp; ?-BLOCK
            </span>
          </div>
        </div>
      </section>

      {/* 4. STATIC ENVIRONMENT SPRITES */}
      <section className="py-10 border-b border-rule" id="sprites-environment">
        <h2 className="text-xl font-bold text-obsidian mb-2">
          4. Environment Sprites — Pipes, Tiles, Clouds, Hills, Bushes, Rainbow
        </h2>
        <p className="text-sm text-muted mb-6">
          Ukuran asli sesuai <code>env-sizes.json</code>, dirender dengan integer scale.
        </p>

        <div className="mario-zone grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {ENV_STATIC_ITEMS.map((item) => (
            <div
              key={item.name}
              className="border-2 border-[#2B1B0E] bg-[#5C94FC] p-3 flex flex-col items-center justify-between min-w-0 overflow-hidden"
            >
              <div className="flex-1 flex items-center justify-center py-2 overflow-hidden max-w-full">
                <img
                  src={item.file}
                  alt={item.name}
                  className="pixel-art max-w-full object-contain"
                  style={{
                    width: item.w * item.scale,
                    height: item.h * item.scale,
                  }}
                />
              </div>
              <div className="bg-white w-full text-center py-1.5 px-2 mt-2 border-t-2 border-[#2B1B0E]">
                <span className="text-xs font-semibold text-obsidian block truncate">
                  {item.name}
                </span>
                <span className="text-[10px] text-muted font-mono">
                  {item.w}×{item.h} ({item.scale}x)
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. PARALLAX BACKGROUNDS & PRE-COMPOSED LEVEL STRIPS */}
      <section className="py-10" id="sprites-strips">
        <h2 className="text-xl font-bold text-obsidian mb-2">
          5. Parallax Backgrounds &amp; Pre-Composed Level Strips
        </h2>
        <p className="text-sm text-muted mb-6">
          Layer komposisi untuk Loading World (1920×216) dan Jenis World (640×216), <code>GY = 168</code>.
        </p>

        <div className="mario-zone space-y-6">
          <div className="mario-box min-w-0 bg-white p-4">
            <h3 className="text-sm font-bold text-obsidian mb-2">
              console-back.png (480×216 native)
            </h3>
            <div className="overflow-x-auto mario-sky-bands border-2 border-[#2B1B0E] max-w-full">
              <img
                src="/environment/console-back.png"
                alt="console-back.png"
                className="pixel-art block max-w-none"
                style={{ width: 480, height: 216 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mario-box min-w-0 bg-white p-4">
              <h3 className="text-sm font-bold text-obsidian mb-2">
                bg-hills-far.png (768×216 parallax 0.2)
              </h3>
              <div className="overflow-x-auto mario-sky-bands border-2 border-[#2B1B0E] max-w-full">
                <img
                  src="/environment/bg-hills-far.png"
                  alt="bg-hills-far.png"
                  className="pixel-art block max-w-none"
                  style={{ width: 768, height: 216 }}
                />
              </div>
            </div>

            <div className="mario-box min-w-0 bg-white p-4">
              <h3 className="text-sm font-bold text-obsidian mb-2">
                bg-hills-mid.png (768×216 parallax 0.4)
              </h3>
              <div className="overflow-x-auto mario-sky-bands border-2 border-[#2B1B0E] max-w-full">
                <img
                  src="/environment/bg-hills-mid.png"
                  alt="bg-hills-mid.png"
                  className="pixel-art block max-w-none"
                  style={{ width: 768, height: 216 }}
                />
              </div>
            </div>
          </div>

          <div className="mario-box min-w-0 bg-white p-4">
            <h3 className="text-sm font-bold text-obsidian mb-2">
              level-loading-decor.png + level-loading-ground.png (1920×216 composite)
            </h3>
            <div
              className="overflow-x-auto mario-sky-bands border-2 border-[#2B1B0E] relative max-w-full"
              style={{ height: 216 }}
            >
              <div className="relative" style={{ width: 1920, height: 216 }}>
                <img
                  src="/environment/level-loading-decor.png"
                  alt="level-loading-decor.png"
                  className="pixel-art absolute inset-0 max-w-none"
                  style={{ width: 1920, height: 216 }}
                />
                <img
                  src="/environment/level-loading-ground.png"
                  alt="level-loading-ground.png"
                  className="pixel-art absolute inset-0 max-w-none"
                  style={{ width: 1920, height: 216 }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
