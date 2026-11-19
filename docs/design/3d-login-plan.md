> **Superseded (2026-11-18).** The login is now a Muse-style hero with plush bots; see `docs/design/bot-hero-plan.md`. This plan describes the earlier "peek" layout. Its Blender file (`crafthq_login_v002.blend`) and the `/art` page are kept, but the peek strips were removed from the site.

# CraftHQ 3D Login — Plan (v002, "peek" layout)

**Layout reference:** the "Visual Mastermind" waitlist page. A white card on a pale page, with a dense ring of 3D objects tucked behind it. Each object shows only part of itself around the card edges.
**Rule:** match the reference's composition, density, sizes and materials closely. Every object is an original CraftHQ piece, not a copy.

## How the reference maps to CraftHQ
Sizes are taken from the reference. Its 432 px card is scaled to our 420 px card, so 1 ref px ≈ 0.97 mm in the scene.

| Edge | Reference object | CraftHQ object (same spot, same material) | Story |
|---|---|---|---|
| Top-left | Painterly low-poly gem | Painterly faceted gem | Rules the team keeps learning |
| Top | White keyboard device | White plastic app window: ◀ ▶ buttons, key grid | It's software |
| Top | Black gem | Black satin **checker bot** peeking over the edge (eyes and antenna only) | The blind checker |
| Top-right | Warm jelly knot | Yellow-to-coral jelly trefoil knot | Feedback loop |
| Left | White iPod | Satin-white **builder bot** in a hard hat, turned out so both eyes peek | Robots build |
| Left | Pink jelly hook | Pink jelly hook behind the bot | — |
| Left | Gradient photo print + pink scribble | Gradient blob print + lilac-pink **signature** scribble | A human signs off |
| Left | Iridescent landscape print | Iridescent ridge print, white border | — |
| Right | Concentric ring print | Segmented concentric ring print | Test target |
| Right | Open book | Open **spec book** with fanned pages and printed text lines | Tests run against the spec |
| Right | Blue jelly loop | Pale blue jelly loop | — |
| Right | Frosted peach print + sunglasses | Frosted peach-mint print + **magnifier** with a lilac lens | Inspection |
| Right | Dark neon-streak card | Dark card with glowing neon streaks | Speed |
| Bottom-left | Chrome script "Fig" | Chrome script "Craft" (Brush Script, mirror chrome with dark rims) | Brand |
| Bottom-right | Wax coins | Wax coins with embossed ✓ (OK), ··· (asks first), </> (code), ⚡ (speed) | — |

## Materials
- **Satin plastic:** roughness about 0.3, light clearcoat. Used for the bots, app window and magnifier.
- **Jelly tubes:** satin with subsurface 0.3–0.6 for the soft, milky glow. The knot's colour runs along the tube via a `UV_Path` map.
- **Glossy prints:** procedural shaders on Generated coordinates, with optional white borders and a clearcoat.
- **Chrome:** metallic 1. Its colour comes from the reflection vector, plus a self-lit ramp and Layer Weight dark rims, so it reads as bright chrome against the pale studio.
- **Neon:** emission strength 11, with a fog glow in the compositor that only catches the streaks (threshold 2).
- **Roughness:** never flat; every material has a fine noise break-up.

## Rendering and the page
- Blender file: `design/blender/crafthq_login_v002.blend`, scene `SC_LoginCollage`. Cycles, AgX Punchy, orthographic camera, 1 mm = 1 CSS px.
- Objects live in four collections, one per card edge: `10_Band_Top`, `11_Band_Left`, `12_Band_Right`, `13_Band_Bottom`.
- Each edge is rendered on its own at 2× with a transparent background, into `design/renders/peek_v001/`. It is then cropped and exported as `public/images/3d/peek-{edge}.webp` (about 176 KB total). Crop extents are in `peek_layout.json`.
- `src/app/login/peek-layout.ts` pins each strip to its card edge, and the transform origin sits on that edge.
  - The strips scale down on smaller screens: 1× from 1024 px, 0.85× from 768 px, 0.6× from 640 px, 0.86× on short laptops.
  - Because they scale around the card edge, the same share of each object stays tucked behind the card.
- Phones (<640 px) show only the top and bottom strips at 0.62×. The card fills the width there.
- Paint order where strips overlap: right → top → left → bottom.
- A shadow under the objects comes from a CSS `drop-shadow` on each strip.

## Updating
1. Move objects in Blender.
2. Re-render with `render_band('top' | 'left' | 'right' | 'bottom')`, a helper defined in the session.
3. Re-crop.
4. Copy the new `x0` / `z1` / `w` / `h` values into `peek-layout.ts`.

## Logo: "steel bot" mark (unchanged, scene `SC_Logo`)
- A brushed-steel squircle head with a glossy CraftHQ-red visor.
- White LED eyes and a smile, plus four corner dots that echo the existing mark.
- A steel antenna with a red tip.
