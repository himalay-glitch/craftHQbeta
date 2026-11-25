CraftHQ bot team v2 (2026-11-23) — stills for approval
=====================================================

Five stuffed-plush characters in one style: bold, puffy pillow forms; a short, dense, matte pile in one even
saturated colour with soft fuzzy edges and no glints; tiny glossy black bead eyes (or closed happy eyes); no
mouths, no cheeks; accessories in matte felt or soft rubber, sitting ON the plush with the pile cleared under
them. Each form means its job. (Replaces bots_v010, which the user rejected: shiny fur, sharp shapes, sunk cap,
thin glossy glasses, busy faces.)

  pm        A plush rounded rectangle (78 x 64 mm, 21 mm corners): an exact outline inflated into a pillow,
            faces gently bulging, rim rounded over. Warm yellow. Big sweet eyes set into the plush: tall soft
            ovals, 9 x 11.5 mm (about 8 x 10.5 showing), glossy black with a faint deep-brown gloss, centres
            +/-13 mm, 3 mm below centre; a clear soft highlight at the upper left (35 % of the eye's width) and
            a small one at the lower right. Each sits in a gentle 0.5 mm socket, the pile parting snugly round
            it (cleared at the edge, tapering back over 1.6 mm), on a plush lid (coat-coloured matte velvet,
            short pile at its rim) that shows only as a soft rim while open and becomes the closed eyelid in
            the blink. A soft caramel felt cowboy hat, tilted, on top:
            pinched crown with the centre dent, wide brim curled up at the sides, thin dark brown band.
  builder   (Plush version, kept in out/ and the scene; the team's Builder is the original blue one from
            bots_v009, which the sheets show.) Rounded block (squircle), pillow-bulged. OpenDots blue. Small black bead eyes behind chunky matte
            black rubber round glasses (no lenses, no glare), with a bridge and arms into the pile. A matte
            yellow felt hard hat on top (dome, ridge, short lip all round, longer at the front).
  designer  Soft five-petal flower with fat round petals. Saturated violet. Small black bead eyes. A black
            felt beret with a fuzzy black pom-pom (its own short pile), tilted on the top petal.
  checker   Round pebble/egg, wider at the bottom. Fresh green. Two big white eyes with black pupils glancing
            to one side (inspecting). No accessory.
  fixer     Soft rounded plus sign (two broad, gently curved bars). Saturated red. Small black bead eyes. A small beige
            fabric plaster (with a paler pad and pin-hole texture) across its right arm.

Coat colours (median of the coat's pixels, sRGB; the hair shader's input is linear, in colors.json)
------------------------------------------------------------------------------------------------
  bot        target sRGB        final (512 px)    linear input
  pm         (250, 190, 30)     (241, 186, 58)    (1.0, 0.40679, 0.0001)     red at full input; camera fill 2.5 (others 9)
  builder    (43, 136, 241)     (64, 137, 242)    (0.00011, 0.17581, 0.5882)
  designer   (138, 82, 232)     (137, 82, 234)    (0.16882, 0.05233, 0.46743)
  checker    (40, 196, 100)     (47, 197, 101)    (0.0016, 0.29214, 0.07868)
  fixer      (232, 50, 52)      (233, 63, 62)     (0.44156, 0.0001, 0.0001)
  Accessories (sRGB): cowboy hat caramel felt (140, 80, 38), band (62, 38, 26); hard hat felt (232, 158, 18);
  beret and pom near-black felt / pile; glasses matte black rubber; plaster (226, 196, 156), pad (240, 228, 205);
  Checker's eye whites (0.82 linear) with black pupils; bead eyes glossy black (roughness 0.16).

How they're made (team2.py, from an empty scene; datablocks prefixed T2_)
-----------------------------------------------------------------------
  Forms: metaball pillows (rounded boxes, ellipsoids, capsules) blended, normalised so each body's larger side
  is 78 mm, then voxel-remeshed (0.6 mm) and smoothed. The block and the bubble have an inner ellipsoid that
  bulges their fronts like stuffing.
  Pile: particle hair, 12,000 guides x 55 children, 3 mm long, 0.13 mm strands with closed tips, no clumping,
  splayed, uniform density (only the clearings below thin it). Principled Hair BSDF, Chiang model, colour
  parametrisation: roughness 0.9, radial roughness 1.0, coat 0 (matte, no strand highlights); root and tip the
  same colour and the base layer at 95 % of it, so the coat is one even colour even where you look straight
  down the pile.
  Clearing: the pile goes to zero under and around every accessory (nearest distance, fading over 2.8 mm) and
  only right at the eyes (1.4 mm), so things sit on the plush and eyes sit in it.
  Studio: soft matte light — a large warm key disk, a cool fill, a soft fill from just behind the camera (it
  lights the pile where we look down it, so no darker patches), a back rim for the fuzzy edges, a little
  under light and a grey world; Khronos PBR Neutral at -0.8 EV. Camera 85 mm, front, about 6° from above.
  Render: Cycles GPU (Metal), 512 x 512, 256 samples, adaptive (0.006, min 64), clamp direct 4 / indirect 6,
  glossy 8 / transmission 12 bounces, no caustics, OpenImageDenoise (albedo + normal, accurate), thick curves,
  transparent film, 16-bit RGBA.

Files
-----
  team2.py        build + render one bot (still | calibrate | save; usage at the top)
  colors.json     calibrated coat inputs        calibrate.sh   BOTS="pm fixer" ./calibrate.sh
  final2.sh       the five finals -> out/, both team sheets, the saved scene
  finish2.py      a still -> out/<id>.png (transparent), out/<id>.webp + <id>_white.png (on white)
  sheet2.html     the team sheet (append #black for the black version); sheet2.mjs screenshots both:
                  PLAYWRIGHT_CORE=<path to playwright-core> node sheet2.mjs
  strip.py        quick side-by-side previews        tests/, cal/, final/   working renders
  out/            pm, builder, designer, checker, fixer (.png transparent 512, .webp on white 512),
                  team_reference.png (white), team_reference_black.png (black)
  Scene: design/blender/crafthq_team_v002.blend — all five side by side (110 mm apart), one collection each
  (T2_Bot_<id>), calibrated colours applied; the camera frames the middle one (designer).

Timings (M-series GPU, 512 px, 256 samples, including the build): pm 80 s, builder 70 s, designer 54 s,
checker 40 s, fixer 45 s. Calibration: about 1 minute per bot (192 px passes). The frozen finals are the
15:15-15:19 renders; team2.py and colors.json reproduce them exactly.

Approved touch-ups (15:42-15:47): the Fixer's broader bar cores (no darker centre band), less camera fill on
the PM only (its yellow deepened), and the PM's tail rebuilt as one clean wedge (pm_tail() in team2.py). The
scene file uses the default camera fill (9) for all five; team2.py gives the PM 2.5 when rendering it.

The team's Builder is the original blue furry one (design/renders/bots_v009, untouched). The white sheet shows
bots_v009/idle_white/frame_0001.png; the black sheet a transparent copy of the same frame with the same blue
grade (sheet_assets/builder_v009.png, made by builder_v009_asset.py). The new-Builder loops were cancelled.

PM blink loop (transparent RGBA, 384 x 384, 192 adaptive samples, fixed seed, OIDN; 24 fps, seamless)
-----------------------------------------------------------------------------------------------------
  loops/pm_idle/frame_0001-0048.png   2 s: a subtle breathe (1.2 %), and one sweet blink: the lids close over
                                      frames 30-33 (the eye squashes to a soft dark line across its plush lid,
                                      a tiny cheek push up, both highlights fading), reopen over 34-36. The hat stays rigid, a beat
                                      behind. Keyed from periodic functions: frame 1 equals the frame after 48.
  Re-render:  Blender -b --factory-startup --python team2.py -- loop pm "$PWD/loops/pm_idle" 384 192 blink

Re-render one:  Blender -b --factory-startup --python team2.py -- still pm "$PWD/final" 512 256
                Blender -b --factory-startup --python finish2.py -- pm "$PWD/final/pm.png"
No loops yet: animation waits for the user's approval of these stills.
