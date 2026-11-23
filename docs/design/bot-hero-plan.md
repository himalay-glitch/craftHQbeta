# CraftHQ login: Muse-style hero with plush build bots (plan)

## 1. Page: hero only, in the style of muse.ai
Measured on muse.ai at 1440 px:

| Element | Muse | CraftHQ |
|---|---|---|
| Background | `#fcfcfc` | same |
| Text | `#111112`; secondary `rgba(0,4,9,.59)` | same |
| Font | "Optimistic" (Meta-only) | **Inter, display optical size (opsz 32)**, the closest open font |
| Headline | 62 px / weight 500 / line-height 1.1 / tracking −1%, centred, 2 lines | same |
| Bot in the headline | 67 px circular **video** between the words; idle clip, "working" clip on hover | 67 px circular video in place of the word "robot": "Your [bot] build team, / shipping 10× faster" |
| Under the headline | "Log in or create an account", 16 px, secondary | "Sign in to your build team" |
| Input | 408 × 54, radius 20, fill `rgba(0,0,0,.05)`, 16 px, no border | same (email and password) |
| Helper text | 12 px secondary | operator hint |
| Button | 408 × 44 pill, 16 px / 500, blue | same, CraftHQ blue `--cta` |
| Bottom pill | "Learn more ↓", white, soft shadow | "Built by BetaCraft" in the same pill |
| Nav | logo left | CraftHQ mark left |

Hidden for screen readers: the plain-text headline sits in an `sr-only` h1. The visual line with the video is `aria-hidden`, as on Muse.

The old 3D "peek" strips leave the login page. `/art` keeps the full render.

## 2. The bots: a new direction (no more robot heads)
- **Shape** comes from Grok Bot's idea of a family of simple, distinctive silhouettes. Our silhouettes are our own: hex-nut, onigiri (rounded triangle) and speech bubble. None of these is in Grok's set.
- **Texture and accessories** come from OpenAI dots: short dense plush fur in one solid colour, plus a signature accessory.
- **Eyes** are our own invention, **"screw-slot eyes"**:
  - each eye is a glossy dark dome (like a plush toy's safety eye) with a white **slot** across it, like a screw head;
  - the slot's angle shows the mood: level = calm, tilted = curious, a quick turn = thinking;
  - when a bot is working, its slots **spin like screws being driven**. That ties to "craft" and "build", and it's nothing like pill or dot eyes.
- **No mouth.** A soft felt blush on the cheeks.

| Bot | Role (the CraftHQ story) | Silhouette | Fur | Accessory |
|---|---|---|---|---|
| **Builder** | "one robot builds" | rounded hex-nut | brand coral-red | yellow hard hat |
| **Checker** | "a blind checker tests it" | onigiri / rounded triangle | lavender | black sleep mask pushed up as a headband (the "blind" tester) |
| **Asker** | "learns your app and asks first" | speech bubble with a tail | sky blue | big pink satin bow |

## 3. Animation (Blender, Cycles, real particle fur)
- Each bot gets two loops, rendered at 320 × 320 (shown at 67 px, so it stays sharp on retina screens) and encoded to H.264 MP4 with Blender's own encoder.
  - **Idle** (2.5 s): a soft breathing bob, squash and stretch, a blink, and the eye slots tilting as it looks around.
  - **Working** (2 s, plays on hover):
    - Builder: hops and the hat bounces, eye slots spin;
    - Checker: leans in, slots scan side to side;
    - Asker: bobs eagerly, the bow wiggles, slots tilt in a "?" look.
- On the page, the headline slot cycles through the team (builder → checker → asker) every few seconds, with a squash-pop swap.
- Hovering a bot plays its working clip.
- With `prefers-reduced-motion`, the page shows a still poster with no cycling.

## 4. Build order
1. Blender:
   - new file `design/blender/crafthq_bots_v001.blend`;
   - models for body, eyes and accessories;
   - fur and materials;
   - lighting and camera;
   - stills for review.
2. Animate both loops per bot. Render PNG frames in batches, then encode to MP4 through Blender's video sequencer.
3. Page: Inter display font, Muse tokens, the hero layout, a `RebusBot` client component, and restyled form fields. Remove the peek strips.
4. Verify:
   - build and type check;
   - check desktop, tablet and phone widths;
   - test hover, reduced motion and the error state.

## Status (built 2026-11-18)
- **Blender:** `design/blender/crafthq_bots_v001.blend`, scene `SC_BotAvatars`.
  - One collection per bot.
  - Idle loop on frames 1–60, working loop on frames 101–148.
  - Fur is particle hair (5k parents × 34 children).
  - Rendered in Cycles with Khronos PBR Neutral at 256², on a transparent background.
- **Encoding:** each frame is composited onto an exact pastel backdrop (builder `#fde7e1`, checker `#ece6ff`, asker `#e1f0ff`), then encoded with Blender's sequencer to:
  - VP9 WebM, 80–125 KB each;
  - H.264 MP4, 55–80 KB each.
  - Both are in `public/videos/bots/`. Posters are in `public/images/bots/`.
- **Raw frames:** in `design/renders/bots_v001/` and git-ignored.
- **Page:** `src/app/login/page.tsx` and `src/components/RebusBot.tsx`.
  - The headline slot cycles every 4.2 s and pauses while hovered.
  - Hover plays the working loop and shows a role chip.
  - Reduced motion shows the posters.

## v2 redesign (after feedback, 2026-11-18)
Feedback was that the eyes, the accessories, the red bot's shape and the blue bot's shape didn't look good, plus requests for a logo and tighter page spacing.

**Bots** (built with `make_bot2` in `crafthq_bots_v001.blend`; renders in `design/renders/bots_v002/`):

| Bot | Shape | Fur | Accessory | Eye glow |
|---|---|---|---|---|
| Builder | soft squircle "building block", wider at the base | coral-red | mustard ribbed knit beanie with a fuzzy pom-pom | amber |
| Checker | onigiri | lavender | gold monocle with chain (the inspector) | mint |
| Asker | round mochi with two soft ear nubs (the listener) | sky blue | none; the ears are its feature | pink |

- **Eyes ("gem eyes"):** soft rounded-square, glossy near-black eyes that glow into the bot's accent colour at the bottom, with one big glint and one small glint. A stitched smile and felt blush complete the face.
- **Plush:** shorter and denser (1.6 mm), so each silhouette stays crisp at 67 px.
- **Animation, reworked:**
  - Builder hops with a lagging beanie and squints happily on landing.
  - Checker leans in and scans, widening the monocle eye while squinting the other.
  - Asker bounces with head tilts and wide, curious eyes.

**Logo:** `public/brand/crafthq-mark.svg` (also `CraftHQLogo` in `src/components/icons.tsx`). It's a coral squircle bot face with gem eyes, blush and a smile. Exports: favicon.svg/.ico, icon-16/32, apple-touch-icon (on the builder pastel), and crafthq-mark-512.png.

**Page hierarchy:**
- **Nav:** mark + "CraftHQ" on the left, "by BetaCraft" on the right.
- **Hero:** headline → 16 px → subtitle → 32 px → form.
- **Form:** fields 8 px apart → 16 px → button → 12 px → 13 px fine print.
- **Body text:** two sizes only, 16 and 13.

## Logo v3: cosmic stone-metal (replaces the toon-face mark)
- **Design:** a cratered planet in warm stone-taupe metal, inside a tilted orbit that is open like a "C" for Craft. A polished satellite bead sits at the end of the orbit, with a small four-point star.
- **Source:** `design/blender/crafthq_logo_cosmic_v001.blend`. The 16-bit render is `design/renders/logo_cosmic_v001.png`.
- **Web files:**
  - `public/brand/crafthq-mark.webp` (nav, 36 px tall, used by `CraftHQLogo`) and `crafthq-mark.png`;
  - `icon-16.png`, `icon-32.png` and `src/app/favicon.ico`;
  - `apple-touch-icon.png`, the mark on a deep cosmic tile.
- **Removed:** the SVG favicon, because the metal finish is raster.

## v4: headline shows the red Builder only
- The headline slot shows only the **Builder**, with no cycling. `RebusBot` skips cycling when it has a single bot.
- The Builder now wears a **navy satin bow tie at the neck**, just under the smile. The fur is thinned under it, and it flaps a little when he hops.
- Renders are in `design/renders/bots_v003/`.
- The Checker and Asker stay in the Blender file, but their videos and posters were removed from `public/`.

## v5: builder outfit fixes
- **Bow tie, now properly at the neck:**
  - A thin navy satin **collar band** wraps the body at the neck line, just under the smile, with the fur trimmed so it sits flush.
  - The bow tie is seated on the collar at the front, facing forward, with its wings curving back with the body.
- **Yellow safety helmet** (replaces the beanie):
  - a glossy lemon-yellow shell fitted over the head, with a raised centre ridge, a rolled rim and a short front peak;
  - it bounces with a little lag when he hops.
- Renders are in `design/renders/bots_v004/`.

## v6: bow tie removed
- The bow tie and collar band came off: they read as choking his neck. His fur under them is restored.
- The builder now wears only the yellow safety helmet.
- Renders are in `design/renders/bots_v005/`.

## v7: glasses and a proper bow tie
These follow the cues from the reference the user shared (a plush bot with round glasses and a pleated bow tie). The builder keeps his own shape, gem eyes and helmet.
- **Glasses:** bold, thin black round frames on clear lenses, set just in front of the gem eyes. A small arched bridge joins them, and the arms run back along the sides of the head into the fur.
- **Bow tie:** matte black fabric with a soft sheen.
  - The wings are pinched at the knot and full at the tips, with a puffy volume and two soft pleats. The knot is wrapped.
  - It nestles into the fur at the base of the face with no collar or band. The fur is only thinned behind it.
  - It flaps a little when he hops.
- Renders are in `design/renders/bots_v006/`.

## v8: bow tie removed again
- The bow tie came off at the user's request. The fur behind it is restored.
- The builder now wears the yellow safety helmet and round black glasses.
- Renders are in `design/renders/bots_v007/`.

## v9: matching glare on both lenses
- **Problem:** the clear lenses only reflected the key light at certain angles. Because the lenses are turned slightly outward with the face, only one of them caught a highlight.
- **Fix:** each lens now carries the same stylised glare, a soft double streak (half-transparent, self-lit) at the upper-left edge, clear of the eyes. Both lenses read as lit by one light.
- **Rims:** rebuilt as clean rings in each lens' plane. The old swept tubes twisted and left a small pinch near the top.
- Renders are in `design/renders/bots_v008/`.

## v10: the Builder turns blue (2026-11-23)
- **Colour:** the fur is the OpenDots blue, `#2B88F1` (43, 136, 241). It was calibrated by measuring the fur in renders: the median comes out at (46, 137, 243). Roots are darker and tips brighter and a little more cyan, so the coat has depth.
- **Face:** no pink cheeks (the felt blush is hidden). A front fill pushed the centre of the face close to the top of the blue, where the view transform blends it toward white and it reads as lavender. A hue-vs-hue grade on the blues fixes that (`huefix.py`, in OKLCH: it keeps each pixel's lightness and chroma and only pulls its hue toward the reference). It's a per-pixel colour mapping, so it can't flicker.
- **Fur:** thicker strands (0.2 mm), 60 children, more under-brim thinning so no cyan shows at the helmet's edge, and neutral fur-only copies of the warm key and pink rim lights.
- **Quality:** 512², 384 samples, adaptive (0.008), clamped (direct 4, indirect 2), OIDN with albedo and normals, a fixed seed. This removes the "TV static" of the old 40-sample, 256² clips.
- **Clips:** `builder-idle` (60 frames, 2.5 s) and `builder-work` (48 frames, 2 s), composited on white, graded, and encoded as VP9 WebM and H.264 MP4. The poster is `public/images/bots/builder.webp` (512 px).
- **Sizes:** browsers shrink video with plain bilinear sampling, so the 512 px render shown in the 67 px headline shimmered, and the glasses rims and helmet edge went jagged on 1× screens. The frames are now shrunk ahead of time (`resize.py`: Lanczos-3 in linear light) to about twice the slot's size on each kind of screen: **288 px** (`builder-idle`, `builder-work`; also enough for the intro's 176 px Builder) and **144 px** for 1× screens (`-1x`, picked by `<source media>` in `RebusBot`). The WebMs are 58 KB / 51 KB (1×) and 190 KB / 164 KB (2×).
- **Re-rendering:** `design/renders/bots_v009/run.sh`, which can resume after an interruption and keeps the Mac awake. It opens `crafthq_bots_v001.blend` read-only through `look_v2_final.py`; `encode.py` makes the clips. Frames are gitignored.
- **Still to do:** the Builder's identity colour in `DESIGN.md` §3.1 and `globals.css` (`--bot-builder`, still coral) needs a shared-file PR with Shubham. The Asker's sky blue then sits close to it.

## Render logs
The red Builder's render logs (`design/renders/bots_v001/` to `bots_v008/`) were deleted on 2026-11-23, when the Builder turned blue. The "Renders are in …" lines above are kept as history only.
