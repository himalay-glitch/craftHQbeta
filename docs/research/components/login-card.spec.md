# LoginCard + LoginForm Specification

## Overview
- **Target files:** `src/app/login/page.tsx` (wrap + card + brand + title + sub), `src/components/LoginForm.tsx` (client form), `src/components/icons.tsx` (`CraftHQLogo`)
- **Screenshots:** `docs/design-references/login-desktop-1440.png`, `login-mobile-390.png`, `login-card-focus-email.png`
- **Interaction model:** card is static; form is submit-driven (see BEHAVIORS.md)

## Tokens (dark, default)
--bg #1b1a19 · --card #262424 · --card-2 #2e2b2b · --border #383534 · --text #f5f3f1 · --muted #aba6a3 · --faint #7c7774
--accent #e33637 · --danger #b91c1c · --radius 14px
--font: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
--serif: "Iowan Old Style", "Charter", "Palatino Linotype", Palatino, Georgia, serif
Light tokens: --bg #faf9f8 · --card #fff · --border #e7e4e1 · --text #201d1d · --muted #55514f

## Reset (site has no Tailwind preflight)
`* { box-sizing: border-box; margin: 0; padding: 0 }` · `html { height: 100% }`
`body { background: var(--bg); min-height: 100%; color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; line-height: 1.55 }`
The button keeps the UA font (computed `Arial` in Chromium, line-height `normal`). The input placeholder keeps the UA color (computed rgb(117,117,117)).

## Computed Styles

### .login-wrap
display:grid; place-items:center; min-height:100vh; padding:24px

### .login-card
background var(--card); border 1px solid var(--border); border-radius 14px; width 100%; max-width 380px; padding 28px. Height at rest: 355.03px

### .login-brand
display:flex; align-items:center; gap:10px; margin-bottom:18px; font-weight:700; letter-spacing:-0.02em (-0.32px); font-size 16px; line-height 24.8px; height 28px

### svg.logo
28×28, flex: 0 0 auto, filter: drop-shadow(0 3px 8px color-mix(in srgb, var(--accent) 40%, transparent))

### span "CraftHQ"
inherits brand (16px/700/-0.32px)

### h1.login-title
font-family var(--serif); font-size 26px; font-weight 650; letter-spacing -0.01em (-0.26px); line-height 40.3px (1.55 inherited); margin-bottom 4px

### p.login-sub
font-size 13.5px; line-height 20.925px; color var(--muted) rgb(171,166,163); margin-bottom 18px

### form.login-form
display:flex; flex-direction:column; gap:10px

### label.sr-only
clip rect(0,0,0,0); white-space nowrap; border 0; 1×1px; margin -1px; padding 0; position absolute; overflow hidden

### input.input (both)
background var(--card); border 1px solid var(--border); color var(--text); font: inherit (family, weight, line-height); border-radius 10px; flex 1 1 0%; padding 10px 13px; font-size 14px; line-height 21.7px; height 43.7px

### div.form-error (conditional)
color var(--danger); margin-top 8px; font-size 12.5px

### button.btn.login-submit
background var(--accent) rgb(227,54,55); color #fff; border none; border-radius 10px; padding 10px 16px; font-size 13.5px; font-weight 600; margin-top 4px; cursor pointer; text-align center; height 35.5px; full width (stretch)

## States & Behaviors
- **Input focus:** border → color-mix(in srgb, var(--accent) 55%, var(--border)); outline 2px solid var(--accent), offset 1px. No transition.
- **Button hover:** none (no rule).
- **Button keyboard focus:** outline 2px solid var(--accent), offset 2px.
- **Button disabled (pending):** opacity .55, cursor default.
- **Error:** see BEHAVIORS.md for message logic.

## Assets
- Logo: inline SVG, viewBox 0 0 100 100; rect 6,6 88×88 rx24 with a vertical linear gradient #e9494a → #d42f30; white strokes (width 7, round caps/joins): lines (32,24)-(30,76), (68,24)-(70,76), (32,24)-(68,24), (31,50)-(69,50), (30,76)-(70,76), path M30 76 L68 24; white dots r4.5 at (32,24), (68,24), (30,76), (70,76)
- Favicons: `public/favicon.svg`, `icon-32.png`, `icon-16.png`, `apple-touch-icon.png`; `src/app/favicon.ico`

## Text Content (verbatim)
- Brand: `CraftHQ`
- Title: `Sign in`
- Sub: `Use the email your instance operator registered for you.`
- Labels (sr-only): `Email`, `Password`
- Placeholders: `you@example.com`, `Password`
- Button: `Sign in`
- Meta: title `CraftHQ`, description `Product-build command center`

## Customizations (not on the live site)
Everything above describes the live site as extracted. The clone has since been redesigned several times at the user's request. Current state (2026-11-18): **a Muse-style hero with plush bots**. The plan is in `docs/design/bot-hero-plan.md`.
- **Logo:** cosmic stone-metal planet-and-orbit mark (`public/brand/crafthq-mark.webp`); see `docs/design/bot-hero-plan.md`.
- **Page:**
  - near-white `#fcfcfc` background, ink `#111112`, secondary `rgb(0 4 9 / .59)`;
  - Inter with the display optical size;
  - nav: logo + "CraftHQ" left, "by BetaCraft" right;
  - headline "Your [bot] build team, / shipping 10× faster" at 62px / 500 / 1.1 / −1%, followed by "Sign in to your build team".
- **Bot in the headline:** `src/components/RebusBot.tsx`. It shows the red Builder (yellow safety helmet, round glasses) and plays his "working" loop on hover, with a role chip above him. The component can cycle several bots, but the page now uses only the Builder. Reduced motion shows still posters.
  - Videos: `public/videos/bots/builder-{idle,work}.{webm,mp4}`, 256².
  - Posters: `public/images/bots/*.webp`.
  - Source: `design/blender/crafthq_bots_v001.blend`.
- **Form:**
  - 54px fields with radius 20 and fill `rgb(0 0 0 / .05)`, sr-only labels, and a blue focus ring;
  - a 12px operator hint;
  - a 44px pill "Sign in" button that looks faded until both fields are filled. Behaviour is unchanged;
  - the error banner is unchanged in content, restyled softer.
- **Removed:** the white card, story bullets, stat row and 3D peek strips. `/art` still shows the earlier Blender artwork.
- Screenshots: `docs/design-references/hero-*.png`. References: `muse-hero-1440.png`, `xai-bot-*.png`, `openai-dots-*.png`.

## Responsive Behavior
- **Desktop (1440px) and tablet (768px):** card 380px, centered in the viewport
- **Mobile (390px):** card fills the 24px-padded viewport → 342px wide; no other changes
- **Breakpoint:** none (fluid via width:100% / max-width:380px)
