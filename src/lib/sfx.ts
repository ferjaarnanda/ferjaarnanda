"use client";

// Web Audio API sound effects synthesizer (no external audio files)
// Safely handles browser autoplay policies by catching/ignoring blocked contexts.

let audioCtx: AudioContext | null = null;
let muted = false;
let lastCoinTime = 0;
let coinStep = 0;

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
 * Synthesizes a Mario-style two-note coin "kling" chime (1320 Hz -> 1760 Hz, 90ms each, soft envelope).
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
  if (!ctx || ctx.state !== "running") return;

  try {
    const pitchMult = Math.pow(2, coinStep / 12);
    const f1 = 1320 * pitchMult;
    const f2 = 1760 * pitchMult;
    const t0 = ctx.currentTime;
    const noteDur = 0.09;

    // First note (90ms)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(f1, t0);
    gain1.gain.setValueAtTime(0.001, t0);
    gain1.gain.linearRampToValueAtTime(0.14, t0 + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, t0 + noteDur);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t0);
    osc1.stop(t0 + noteDur);

    // Second note (90ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(f2, t0 + noteDur);
    gain2.gain.setValueAtTime(0.001, t0 + noteDur);
    gain2.gain.linearRampToValueAtTime(0.16, t0 + noteDur + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, t0 + noteDur * 2 + 0.04);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t0 + noteDur);
    osc2.stop(t0 + noteDur * 2 + 0.05);
  } catch {
    // Stay silent if blocked or unsupported
  }
}

/**
 * Synthesizes a short retro explosion/boom sound.
 */
export function playBoomSfx(): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.22);
    gain.gain.setValueAtTime(0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.25);
  } catch {
    // Stay silent if blocked
  }
}

/**
 * Synthesizes a short crunch bite sound.
 */
export function playCrunchSfx(): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.linearRampToValueAtTime(95, t0 + 0.08);
    gain.gain.setValueAtTime(0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  } catch {
    // Stay silent if blocked
  }
}
