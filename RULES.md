# Project Rules & Master Specification Summary

This file enforces the rules from `MASTER_PROMPT.md` across all tasks and phases. `MASTER_PROMPT.md` is the SINGLE SOURCE OF TRUTH.

---

## 1. DESIGN SYSTEM & THEME
- **Whole Site**:
  - Background: `#FFFFFF`
  - Primary Text: `#14171F`
  - Muted Text: `#6B7280`
  - Borders: `1px solid #E5E7EB`
  - Accent Red: `#E52521` (hover `#C81E1B`, pressed `#A81714`)
  - Typography: `Inter` via `next/font/google` (weights 400, 500, 600, 700)
- **Buttons**:
  - Primary: Solid red `#E52521`, white text `#FFFFFF`, radius `10px`, height `44px` (min 44px touch target), no shadow; hover: `#C81E1B` + `translateY(-1px)`; active: `translateY(0)`.
  - Secondary: White `#FFFFFF`, `1px solid #E52521`, red text `#E52521`, radius `10px`, height `44px`; hover: `#FFF5F5`.
- **Strict Prohibitions**:
  - No gradients (except stepped sky bands inside `.mario-zone`).
  - No glow.
  - No glassmorphism (EXCEPT the scrolled navbar capsule in State B).
  - No stock illustrations, decorative icons, emoji, or invented stats/testimonials.
  - The words `Bronze`, `Silver`, `Gold`, `Diamond` must NEVER appear in the UI (use `Standard Class`, `Semi Pro Class`, `Professional Class`, `Exclusive Class`, `Custom Class`).
  - Never mention mobile apps anywhere.

---

## 2. MARIO ZONES (`.mario-zone`)
Retro pixel style is strictly scoped to `.mario-zone` and appears ONLY in 3 places:
1. **Intro Loading Screen** (full-viewport 1920x216 side-scrolling mini-game cutscene, once per session).
2. **`#jenis` Scene Frame** ("Beberapa contoh website yang bisa kubuat" 640x216 living world).
3. **`#paket` Pricing Section** ("Kategori Jasa" coin cards with sky window, drifting clouds, and 6-frame spinning coins).

- **Tokens**: Sky `#5C94FC` (stepped bands `#5C94FC` to `#A6C8FF`), Outline `#2B1B0E`, Brick `#C84C0C`.
- **Borders & Shadows**: 4px solid `#2B1B0E`, square corners (`border-radius: 0`), hard offset shadows with ZERO blur (e.g., `12px 12px 0 #2B1B0E`).
- **Font**: `Press Start 2P` (`next/font/google`) ONLY for numbers, tier names, and the `LOADING...` label.
- **Isolation**: Nothing Mario-like may leak outside `.mario-zone`.

---

## 3. PIXEL ART RULES
- All sprites are final PNGs in `public/coins/`, `public/character/`, and `public/environment/` (no nested duplicate folders).
- Never redraw, recolor, regenerate, blur, or smooth pixel art.
- Always apply `image-rendering: pixelated` and integer scale factors (`1x`, `2x`, `3x`, `4x`, etc.; for 8x coin spin sheets `spin-*.png`, `--k` is `0.5`, `0.75`, or `1.0` which maps to exact `4x`, `6x`, or `8x` of the native 27x35 coin).

---

## 4. MOTION, RESPONSIVENESS & ACCESSIBILITY
- Animate only `transform` and `opacity` (plus navbar transition properties in Section 5.2).
- Section reveal: fade + `translateY(16px)` to `0`, `500ms ease-out`, once, staggered `60ms` for list items.
- Respect `prefers-reduced-motion: reduce` everywhere with static fallbacks.
- Pause pixel animations when off-screen (`IntersectionObserver`) and when tab is hidden.
- Mobile-first responsive across `360px`, `390px`, `768px`, `1024px`, `1440px`. Desktop layout from `1024px` up.
- `scroll-margin-top: 96px` on anchored sections; container `max-width: 1200px`, side padding `24px` (`20px` on mobile).
- Semantic landmarks, visible `2px` red focus rings, `aria-expanded` on accordions, focus trap + `Esc` on modals.
