CraftHQ logo v002: black glass wordmark with a red glass slash
================================================================

Blend file : design/blender/crafthq_logo_glass_v002.blend  (built by build_logo.py, Blender 4.4.3)
Renders    : design/renders/logo_glass_v002/out/
  logo_front.png        2400 px wide, straight-on (orthographic), transparent, 16-bit RGBA. For the app top bar.
  logo_front_white.png  the same on white, 16-bit RGB.
  logo_hero.png         2400 x 1000, 3/4 view from slightly above, white floor, soft shadow, red glow. 16-bit RGB.
  logo_mark.png         "CHQ" monogram, front view, transparent, about 1600 px wide, 16-bit RGBA.
  logo_mark_boldC.png   alternative monogram: the same C emboldened to the H/Q stroke weight (reads
                        more evenly at favicon size). Not asked for; pick whichever you prefer.
References : ref/wordmark_ref.png (the artwork), ref/materials_ref.png (option A, "Glassy Resin").


Re-render everything
--------------------
    sh design/renders/logo_glass_v002/render_all.sh [samples]      (default 512)

That runs the four steps below in order. Raw renders go to work/raw/, finished files to out/.
On this M1 (Metal GPU, shared with other jobs) a full run at 512 samples takes roughly 15 minutes.

One shot only (e.g. after changing a light in the .blend by hand):
    Blender -b --factory-startup design/blender/crafthq_logo_glass_v002.blend \
        --python design/renders/logo_glass_v002/render_logo.py -- <front|mark|mark_boldC|hero> <out.png> [percent] [samples]
    python3 design/renders/logo_glass_v002/finish_logo.py design/renders/logo_glass_v002/work/raw design/renders/logo_glass_v002/out
(render_logo.py also takes an optional crop "x0,x1,y0,y1" for quick checks.)
Note: build_logo.py rebuilds the .blend from scratch, so hand edits made in the .blend are lost
on the next build. Change the script instead, or skip the build step.


1. Trace (trace_wordmark.py, system python3 + numpy + OpenCV)
--------------------------------------------------------------
- The artwork is blurred slightly (sigma 1 px) to calm its JPEG wobble, upsampled x8, thresholded
  halfway between ink and paper, and contoured (outer outlines + holes) at 1/8 px.
- Corners: every corner in this face is genuinely sharp, so a corner is any turn of more than 25 deg
  within +-1.5 px. The blur rounds a corner over a stretch that grows as the corner gets more acute,
  so each corner gets its own "blur zone" (2.6 px / sin(half angle)), which is ignored when fitting.
- Between corners, straight runs (radius > 250 px, deviation < 0.15 px) become exact lines and the
  rest is fitted with cubic Beziers (Schneider least squares, 0.3 px tolerance), tangent-continuous
  with the neighbouring lines.
- Snapping: near-horizontal edges are made horizontal, the stems share one italic angle (16.68 deg),
  near-parallel edges are made parallel, and horizontal edges at the same height share it (baseline,
  x-height, cap heights). Corners are then rebuilt as exact line intersections.
- Result: 9 contours (C r a f t H, Q bowl, the slash, and the hole of the a), 117 Bezier segments.
  The fill differs from the artwork by 0.6 % of the ink area; 99 % of the differing pixels lie
  within 1 px of the artwork's edge (artwork is 1198 px wide). The acute tips (Q bowl terminal,
  slash) are rebuilt sharp, so they reach up to ~4 px past the soft, blurred tips in the PNG (the
  trace prints a note about the Q tip; that is expected).
- The Q's slash is already a separate shape in the artwork (thin gaps on both sides), so it is simply
  its own contour; nothing had to be cut.
- work/trace_check.png and work/trace_diff.png show the fit over the artwork.

2. Build (build_logo.py)
------------------------
Units: metres, scale 1.0. Scene SC_LogoV2. Names are prefixed (…LogoV2…) so nothing clashes with the
other design files.
- Wordmark 199.3 mm wide (artwork scaled 0.1669 mm/px), baseline at z = 0, letters standing in the XZ
  plane facing -Y.
- Glyph meshes are built directly from the Beziers (not with Blender's curve bevel, which leaves the
  caps self-intersecting at acute tips): outline flattened (1.5 deg / 0.2 mm steps), offset inward
  with exact miters for every ring of a round bevel, extruded and capped.
  Depth 6.7 mm (2.6 mm straight wall each side + 0.75 mm round bevel, 8 segments). The bevel sits
  inside the traced outline, so the silhouette is exactly the artwork. Shade smooth, with sharp edges
  at the outline's corners and around the flat caps.
- The red slash sits 2.2 mm proud of the Q.
- Monogram: the wordmark's C scaled x1.0405 about its baseline to the H's cap height, then H, Q and
  slash as in the wordmark; the C-H gap copies the H-Q gap (2.0 mm narrowest). The bold version
  pushes the C's outline out by 5.3 artwork px (0.88 mm) before scaling it back to cap height (x0.979).
- Collections: 00_Camera, 01_Lights_Front, 01_Lights_Hero, 02_Wordmark, 03_Monogram,
  03_Monogram_BoldC, 04_Studio (floor), 99_Source (flat 2D Bezier copies of the trace, not rendered).
  The file opens on the hero set-up; render_logo.py switches collections per shot.

Materials
- MAT_LogoV2_BlackGlass: Principled, base 0.0045 (near-black dielectric, IOR 1.52), roughness
  0.05-0.09 broken up by a fine noise, full clear coat (roughness 0.012, IOR 1.5). Gives the
  "glassy resin" double reflection: a crisp coat highlight over a slightly softer base sheen.
- MAT_LogoV2_RedGlass: Principled transmission 1.0, tint (0.36, 0.003, 0.006), roughness 0.02,
  IOR 1.5. Emission (1, 0.012, 0.01) via Light Path: 0.12 seen directly, 0.5 in reflections,
  1.6 on diffuse surfaces, so it lays a red glow on the floor and the Q without looking lit-up itself.
  Shadow rays pass through it red-tinted (transparent BSDF on "Is Shadow Ray"), so it throws a red
  light / caustic hint instead of a black shadow.
- MAT_LogoV2_FloorWhite: paper white 0.82, faint satin coat (0.25, roughness 0.2) for soft reflections.
- Reflection cards (MAT_LogoV2_Card…, MAT_LogoV2_Sweep…): emission-only planes, invisible to the
  camera, gradients set in world coordinates.

Lighting (all area lights at real scale; Watts as set in the file)
- World WLD_LogoV2_Studio: black below the horizon, rising to 0.22 overhead, so the glass faces stay
  deep black.
- Front studio (front + monogram, transparent background): long top strip (0.9 x 0.035 m, 3.5 W)
  and a soft top box (1.5 W) for the top bevel highlights, thin side strips (0.8 W) for the stem
  bevels, a gradient card in front that the flat faces mirror (soft sheen on the top half of the
  letters, nothing on the bottom half, so the shapes stay solid when small), and a card behind the
  logo, visible only through the glass, that gives the slash its light-to-deep red gradient.
- Hero studio: 2.2 m overhead box (4.4 W) for even paper, a key from behind and above (2.9 W) so
  the soft shadows and the slash's red pool fall toward the camera, top strip and side strips for
  edge lines, a back light, a far white sweep seen only in reflections (keeps the paper's grazing
  sheen white, puts a horizon line on the letter tops), and a gradient card under the floor (the
  floor is invisible to glossy rays) that gives the front faces a soft top sheen.

3. Render (render_logo.py)
--------------------------
Cycles, GPU (Metal) when available, 512 samples with adaptive sampling (threshold 0.005), OIDN
denoising with albedo + normal passes (accurate prefilter), indirect clamp 6, filter glossy 0.4,
light tree on, 24 total / 10 glossy / 16 transmission bounces, filter width 1.2 px.
Colour management: view transform "Khronos PBR Neutral" (deliberately instead of AgX): it keeps the
brand red saturated and lets paper white render white, which AgX would push toward pink/grey.
Output PNG 16-bit. Cameras: CAM_LogoV2_Front and CAM_LogoV2_Mark are orthographic and frame their
logo exactly with a 2-3 % margin; CAM_LogoV2_Hero is 85 mm, 16 deg to the right, 11 deg above.

4. Finish (finish_logo.py, system python3 + numpy + OpenCV)
------------------------------------------------------------
- front / mark: cropped to the alpha bounds plus a 1.5 % (front) / 3 % (mark) margin.
- front_white: front composited over white in display space (as a browser does).
- hero: the paper renders slightly under 1.0, so the image is scaled so the paper reaches pure white
  (gain printed, about 1.08), then clipped. The far paper at the very top of frame falls off a
  little more; in the band above the logo (plain paper only) that falloff is divided out, so the
  background is white edge to edge. The logo, its shadow and reflections are not touched by this.
- work/ keeps the trace (wordmark_trace.json, trace_check.png, trace_diff.png), the raw renders,
  the last run's log, and small helpers: preview.py (16-bit PNG -> 8-bit preview on a background),
  small_check.py (logo shrunk to N px tall on white / light grey), diag.py (zoomed trace overlay).
