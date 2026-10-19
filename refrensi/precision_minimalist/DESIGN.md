---
name: Precision Minimalist
colors:
  surface: '#faf8ff'
  surface-dim: '#d8d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#ecedf9'
  surface-container-high: '#e6e7f3'
  surface-container-highest: '#e0e2ed'
  on-surface: '#181b24'
  on-surface-variant: '#5d3f3b'
  inverse-surface: '#2d3039'
  inverse-on-surface: '#eff0fc'
  outline: '#926f6a'
  outline-variant: '#e7bdb7'
  surface-tint: '#c0000c'
  primary: '#be000c'
  on-primary: '#ffffff'
  primary-container: '#e52521'
  on-primary-container: '#ffffff'
  inverse-primary: '#ffb4aa'
  secondary: '#aa352b'
  on-secondary: '#ffffff'
  secondary-container: '#fe7263'
  on-secondary-container: '#6f0707'
  tertiary: '#00619a'
  on-tertiary: '#ffffff'
  tertiary-container: '#007bc1'
  on-tertiary-container: '#fffeff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930007'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4aa'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#891d17'
  tertiary-fixed: '#cee5ff'
  tertiary-fixed-dim: '#98cbff'
  on-tertiary-fixed: '#001d33'
  on-tertiary-fixed-variant: '#004a77'
  background: '#faf8ff'
  on-background: '#181b24'
  surface-variant: '#e0e2ed'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 4rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-desktop: 2rem
  margin: 1.5rem
  margin-desktop: 4rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
This design system embodies pure functional minimalism tailored for a senior freelance web developer. It strips away ornamental noise—gradients, blurs, floating badges, and skeuomorphic illusions—in favor of structural discipline, intentional whitespace, and razor-sharp typographic hierarchy.

The visual language communicates executive-level engineering credibility, architectural clarity, and uncompromising precision. The primary audience consists of founders, VP-level engineering leaders, and product design managers looking for dependable, high-impact craft. Every element on the canvas serves an operational purpose: copy explains value, structural borders define scope, and a singular crimson accent dictates immediate action.

## Colors
The palette operates strictly within high-contrast light mode parameters. Color is treated with extreme restraint, acting primarily as a focal anchor rather than decoration.

- **Canvas Background (`#FFFFFF`)**: Pure white base providing maximum clarity and expansive whitespace.
- **Primary Text (`#14171F`)**: Deep near-black obsidian delivering optimal contrast for headlines, essential body copy, and active labels.
- **Muted Text (`#6B7280`)**: Neutral slate gray for secondary captions, metadata, supporting copy, and inactive states.
- **Structural Border (`#E5E7EB`)**: Subtle 1px neutral rule separating architectural regions, grid containers, and component bounds without adding visual weight.
- **Primary Accent (`#E52521`)**: Pure precision red used exclusively for interactive calls-to-action, active focus indicators, and mission-critical highlights.

## Typography
Typographic authority is achieved exclusively through the variable grotesque `Inter`. The rhythm relies strictly on typographic scale, calibrated letter-spacing, and tight line heights rather than heavy ornamentation.

- Use negative tracking (`-0.02em` to `-0.03em`) on large headlines to guarantee optical density and cohesive grouping.
- Body paragraphs must always stay bounded to a maximum width of `65ch` to preserve readability against extensive white margins.
- Ensure strict contrast between primary `#14171F` text for lead copy and `#6B7280` for secondary context.

## Layout & Spacing
The layout leverages a disciplined, fixed-width content grid centered on the viewport with deliberate, architectural breathing room:

- **Desktop (>= 1024px)**: Max container width of `1200px` within an outer frame. 12-column grid with `2rem` gutters and outer canvas margins minimum `4rem`. Vertical section spacing utilizes generous `6rem` to `8rem` padding to enforce clarity between thematic zones.
- **Tablet (768px - 1023px)**: 8-column grid with `1.5rem` gutters and `2.5rem` horizontal margins.
- **Mobile (< 768px)**: 4-column layout with `1rem` gutters and `1.5rem` margins. All stacked items retain strict `space-md` or `space-lg` vertical separations.
- **Component Padding**: Built strictly on the base 4px system using `space-xs` through `space-xl` without arbitrary fractional offsets.

## Elevation & Depth
This design system operates with zero elevation and no shadows (`box-shadow: none`). Spatial depth is established purely through structural layout boundaries and chromatic contrast:

- **Surface Levels**: All components, cards, navigation bars, and inputs lie planar with the `#FFFFFF` canvas.
- **Boundaries**: Differentiation is achieved strictly via crisp `1px solid #E5E7EB` border rules. No drop shadows, ambient blurs, or glow effects may be introduced under any condition.
- **Interactive Planes**: Hover states must not elevate on the Z-axis. State changes are communicated strictly through flat background fills, border tone alterations, or text color switches.

## Shapes
Interactive interactive units conform to an intentional, tailored corner radius:

- **Buttons & Inputs**: Exactly `10px` (`0.625rem`) border radius, balancing strict geometry with refined ergonomics.
- **Cards & Outer Containers**: `10px` border radius when enclosed, maintaining unbroken alignment with child controls.
- **Structural Dividers**: Straight `0px` lines using 1px stroke weights.

## Components

### Buttons
- **Primary Button**:
  - Background: Solid `#E52521`
  - Text: `#FFFFFF`
  - Typography: `label-md` or `label-lg`, weight 500
  - Border: None (`0px`)
  - Border Radius: Exactly `10px`
  - Padding: `0.75rem 1.5rem`
  - Elevation: None
  - Hover: Background `#CC1F1C` with instant or 150ms ease transition. No elevation.
- **Secondary Button**:
  - Background: `#FFFFFF`
  - Text: `#E52521`
  - Typography: `label-md` or `label-lg`, weight 500
  - Border: `1px solid #E52521`
  - Border Radius: Exactly `10px`
  - Padding: `0.75rem 1.5rem`
  - Elevation: None
  - Hover: Background `#FDF2F2` (subtle red wash), retaining red border and text.

### Cards & Work Showcase Items
- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Border Radius: `10px`
- Padding: `1.5rem` to `2rem`
- Hover State: Border transitions to `#14171F` or `#E52521`. No shadow.

### Input Fields
- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Text: `#14171F`
- Placeholder: `#6B7280`
- Border Radius: `10px`
- Padding: `0.75rem 1rem`
- Focus State: `1px solid #E52521`, outline none.

### Chips & Meta Tags
- Functional metadata only (tech stack: e.g., "TypeScript", "React", "Next.js").
- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Text: `#14171F`, size `label-sm`
- Border Radius: `10px`
- Padding: `0.25rem 0.625rem`

### Lists & Key Deliverables
- Flat structural rows separated by `1px solid #E5E7EB` rules.
- Padding: `space-md` vertically.
- Left-aligned indicator: Minimalist SVG dash or clean typography counter in `#6B7280`, never decorative icons.