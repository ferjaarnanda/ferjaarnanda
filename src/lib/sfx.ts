"use client";

// Web Audio API sound effects synthesizer (no external audio files)
// Safely handles browser autoplay policies by catching/ignoring blocked contexts.
// PERFORMANCE RULE (4): Pre-render the chime into an AudioBuffer at startup and play it
// through a BufferSource; never build oscillator graphs on the first coin.

let audioCtx: AudioContext | null = null;
let muted = false;
let lastCoinTime = 0;
let coinStep = 0;

// Pre-rendered AudioBuffers
const coinBuffers: AudioBuffer[] = [];
let boomBuffer: AudioBuffer | null = null;
let crunchBuffer: AudioBuffer | null = null;
let buffersInitialized = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || muted) return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {
        // Ignore autoplay restrictions before user gesture
      });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function prebuildAudioBuffers(): void {
  if (buffersInitialized || !audioCtx) return;
  buffersInitialized = true;

  try {
    const sampleRate = audioCtx.sampleRate || 44100;

    // 1. Pre-render 15 coin chime buffers (steps 0..14, rising by 1 semitone each)
    // 2 quick sine notes: 1320 Hz then 1760 Hz, 90ms each, soft envelope
    const note1Dur = 0.09;
    const note2Dur = 0.13;
    const totalCoinDur = note1Dur + note2Dur;
    const coinSamples = Math.ceil(sampleRate * totalCoinDur);

    for (let step = 0; step < 15; step++) {
      const pitchMult = Math.pow(2, step / 12);
      const f1 = 1320 * pitchMult;
      const f2 = 1760 * pitchMult;

      const buf = audioCtx.createBuffer(1, coinSamples, sampleRate);
      const data = buf.getChannelData(0);

      for (let i = 0; i < coinSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        if (t < note1Dur) {
          // Note 1: 1320 Hz
          const phase = 2 * Math.PI * f1 * t;
          let env = 0;
          if (t < 0.01) {
            env = 0.001 + (t / 0.01) * (0.14 - 0.001);
          } else {
            const decayFrac = (t - 0.01) / (note1Dur - 0.01);
            env = 0.14 * Math.exp(-decayFrac * 4.5);
          }
          sample = Math.sin(phase) * env;
        } else {
          // Note 2: 1760 Hz
          const t2 = t - note1Dur;
          const phase = 2 * Math.PI * f2 * t2;
          let env = 0;
          if (t2 < 0.01) {
            env = 0.001 + (t2 / 0.01) * (0.16 - 0.001);
          } else {
            const decayFrac = (t2 - 0.01) / (note2Dur - 0.01);
            env = 0.16 * Math.exp(-decayFrac * 3.8);
          }
          sample = Math.sin(phase) * env;
        }

        data[i] = sample;
      }
      coinBuffers.push(buf);
    }

    // 2. Pre-render Boom buffer (0.25s)
    const boomDur = 0.25;
    const boomSamples = Math.ceil(sampleRate * boomDur);
    boomBuffer = audioCtx.createBuffer(1, boomSamples, sampleRate);
    const bData = boomBuffer.getChannelData(0);
    let boomPhase = 0;
    for (let i = 0; i < boomSamples; i++) {
      const t = i / sampleRate;
      const freq = 160 * Math.exp(-t * 6.5);
      boomPhase += 2 * Math.PI * freq * (1 / sampleRate);
      const env = 0.18 * Math.exp(-t * 18);
      // Triangle wave
      const tri = (2 / Math.PI) * Math.asin(Math.sin(boomPhase));
      bData[i] = tri * env;
    }

    // 3. Pre-render Crunch buffer (0.10s)
    const crunchDur = 0.1;
    const crunchSamples = Math.ceil(sampleRate * crunchDur);
    crunchBuffer = audioCtx.createBuffer(1, crunchSamples, sampleRate);
    const cData = crunchBuffer.getChannelData(0);
    let crunchPhase = 0;
    for (let i = 0; i < crunchSamples; i++) {
      const t = i / sampleRate;
      const freq = 220 - (t / 0.08) * 125;
      crunchPhase += 2 * Math.PI * freq * (1 / sampleRate);
      const env = 0.12 * Math.exp(-t * 28);
      // Sawtooth wave
      const saw = 2 * ((crunchPhase / (2 * Math.PI)) % 1) - 1;
      cData[i] = saw * env;
    }
  } catch {
    // If buffer creation fails, stay silent
  }
}

/**
 * Startup initializer to pre-create AudioContext and build AudioBuffers
 */
export function initAudio(): void {
  if (typeof window === "undefined") return;
  getAudioContext();
  prebuildAudioBuffers();
}

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  muted = value;
}

export function toggleSfxMuted(): boolean {
  muted = !muted;
  return muted;
}

/**
 * Mario-style two-note coin "kling" chime played instantly from pre-rendered AudioBuffer.
 * Consecutive coins within 1.2s rise one semitone step each and reset afterwards.
 */
export function playCoinKling(): void {
  if (muted) return;
  const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (nowMs - lastCoinTime <= 1200) {
    coinStep = Math.min(coinStep + 1, 14);
  } else {
    coinStep = 0;
  }
  lastCoinTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;
  if (!buffersInitialized) prebuildAudioBuffers();

  const buffer = coinBuffers[coinStep];
  if (!buffer) return;

  try {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  } catch {
    // Stay silent if blocked or unsupported
  }
}

/**
 * Short retro explosion/boom sound played from pre-rendered AudioBuffer.
 */
export function playBoomSfx(): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (!buffersInitialized) prebuildAudioBuffers();

  if (!boomBuffer) return;

  try {
    const src = ctx.createBufferSource();
    src.buffer = boomBuffer;
    src.connect(ctx.destination);
    src.start();
  } catch {
    // Stay silent if blocked
  }
}

/**
 * Short crunch bite sound played from pre-rendered AudioBuffer.
 */
export function playCrunchSfx(): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (!buffersInitialized) prebuildAudioBuffers();

  if (!crunchBuffer) return;

  try {
    const src = ctx.createBufferSource();
    src.buffer = crunchBuffer;
    src.connect(ctx.destination);
    src.start();
  } catch {
    // Stay silent if blocked
  }
}
