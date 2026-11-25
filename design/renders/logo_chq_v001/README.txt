CraftHQ "CHQ" mark v001: black glass letters with a red glass slash (option A)
==============================================================================

Matches option A, "Glassy Resin (Premium Tech)", top left of
design/renders/logo_chq_v001/ref/materials_ref.png.

Blend file : design/blender/crafthq_logo_chq_v001.blend  (built by build_chq.py, Blender 4.4.3)
Renders    : design/renders/logo_chq_v001/out/
  chq_front.png        straight-on (orthographic), transparent, 16-bit RGBA, 1587 x 589, cropped
                       to the mark plus a 1.5 % margin. For the app top bar (about 24 px tall,
                       which is about 65 px wide; checked on white and on #F9F9F9).
  chq_front_white.png  the same on white, 16-bit RGB.
  chq_hero.png         2400 x 1000, near-frontal view from slightly above, white floor, soft
                       shadow and reflection, red glow under the slash. 16-bit RGB.


Font and licence
----------------
Poppins ExtraBold (Indian Type Foundry / Jonny Pinhorn), SIL Open Font License 1.1:
fonts/poppins_Poppins-ExtraBold.ttf, licence text in fonts/poppins_OFL.txt. Downloaded from
github.com/google/fonts (ofl/poppins). The OFL allows use, modification and embedding in
artwork like this; only selling the font file on its own is not allowed.
- H: Poppins ExtraBold "H" as is.
- Q bowl: Poppins ExtraBold "O" (the font's own Q tail is not used; the red slash replaces it).
- C: none of the candidate fonts has option A's C (a half ring with long straight arms cut
  vertically; Poppins' own C has short arms with horizontal terminal faces). So the C is built
  from Poppins' O: its left half, flattened to the H's height, plus straight arms ending in
  vertical cuts, 0.96 cap heights wide. Its curves and stroke therefore match the Q exactly.
- Gaps between letters: 0.03 cap height (tight, as in the reference).
- Slash: a parallelogram with horizontal top and bottom, placed on the bowl as in the reference
  (top at 0.43 cap height, bottom 0.045 cap height below the baseline, sides parallel).

How the font was picked (font_compare.py, output in work/): C, H and O of 15 candidates
(Futura, Avenir / Avenir Next, Helvetica Neue, Arial Black, Gill Sans, DIN, SF Pro, Montserrat,
Poppins) were scaled to the reference's cap height and overlaid on a silhouette of option A
(work/compare_*.png). Poppins ExtraBold scored best (H 0.84, O 0.77 overlap; the reference is a
3D render with highlights, so 1.0 is not reachable). Its stem is 0.28 of the cap height; the
reference measures about 0.25. Montserrat, the other fonts and the Montserrat variable font
(instanced to Black / ExtraBold with fontTools) are in fonts/ only for this comparison.


Re-render everything
--------------------
    sh design/renders/logo_chq_v001/render_all.sh [samples]      (default 512)

That runs: extract_chq.py (font -> outlines, work/chq_outlines.json), build_chq.py (outlines ->
.blend), render_chq.py front and hero (raw 16-bit PNGs in work/raw/), finish_chq.py (out/).
On this M1 (Metal GPU) the front takes about 30 s and the hero a few minutes at 512 samples.
One shot only:
    Blender -b --factory-startup design/blender/crafthq_logo_chq_v001.blend \
        --python design/renders/logo_chq_v001/render_chq.py -- <front|hero> <out.png> [percent] [samples]
build_chq.py rebuilds the .blend from scratch, so hand edits in the .blend are lost on the next
build; change the script instead.


Geometry (build_chq.py)
-----------------------
Metres, scale 1.0. Scene SC_CHQ; every datablock is prefixed _CHQ_ so nothing clashes with the
other design files. The mark is 136 mm wide, cap height 45 mm, baseline at z = 0, standing in
the XZ plane facing -Y.
- Glyph meshes are built straight from the Bezier outlines with the mitered bevel builder from
  logo_glass_v002: outline flattened (1.5 deg / 0.2 mm steps), offset inward with exact miters
  for each ring of a round bevel (radius 1.3 mm, 8 segments), extruded, capped. Letters are
  11 mm deep. The bevel sits inside the outline, so the front silhouette is exactly the outline.
  Shade smooth, sharp at the outline's corners and around the flat faces.
- The slash is its own 6 mm slab lying 0.3 mm in front of the Q's face, over the bowl's lower
  right; its tip drops 2 mm below the baseline.
- Collections: 00_Camera, 01_Lights_Front, 01_Lights_Hero, 02_CHQ, 04_Studio (floor),
  99_Source (flat 2D Bezier copies, not rendered). The file opens on the hero set-up.

Materials (same as logo_glass_v002, renamed _CHQ_)
- MAT_CHQ_BlackGlass: near-black dielectric (base 0.0045, IOR 1.52), roughness 0.05-0.09 with a
  fine noise breakup, full clear coat (roughness 0.012). Glassy-resin double reflection.
- MAT_CHQ_RedGlass: transmission 1.0, tint (0.36, 0.003, 0.006), roughness 0.02, IOR 1.5.
  Emission (1, 0.012, 0.01) by light path: 0.40 seen directly (keeps the slash saturated where it
  lies over the black bowl), 0.6 in reflections, 1.8 on diffuse surfaces (the red glow on the
  floor and the Q). Shadow rays pass through it red-tinted (a red light / caustic hint).
- MAT_CHQ_FloorWhite: paper white 0.82, faint satin coat for soft reflections.

Lighting
- World: black below the horizon, rising to 0.22 overhead, so the glass faces stay deep black.
- Front: long top strip (3.5 W) and soft top box (1.5 W) for the bright top edges, thin side
  strips (0.8 W each) for the side edges, a gradient card in front that the flat faces mirror
  (soft sheen on the upper part of the letters), and a card behind the slash, seen only through
  the glass, that makes it lighter at the top and deeper at the bottom.
- Hero: 2.2 m overhead box (4.4 W) for even paper, key from behind and above (2.9 W) so the soft
  shadows and the slash's red pool fall toward the camera, top and side strips for edge lines,
  a back light, a far white sweep seen only in reflections, and a gradient card under the floor
  (the floor is invisible to glossy rays) that puts a soft sheen on the front faces.

Render settings (render_chq.py)
- Cycles, Metal GPU, 512 samples, adaptive (threshold 0.005), OIDN with albedo + normal,
  indirect clamp 6, filter glossy 0.4, light tree on. View transform Khronos PBR Neutral (keeps
  the red saturated and the paper white; AgX turns bright red pink). PNG 16-bit.
- CAM_CHQ_Front: orthographic, frames the mark exactly with a 2 % margin, 1600 px wide.
- CAM_CHQ_Hero: 85 mm, 8 deg to the right, 9 deg above, 0.5 m from the mark, 2400 x 1000.

Finishing (finish_chq.py)
- chq_front.png: cropped to the alpha bounds plus a 1.5 % margin. chq_front_white.png: that over
  white in display space (as a browser does).
- chq_hero.png: scaled so the paper reaches pure white, then clipped; the slight falloff of the
  far paper at the very top of frame is divided out in the band above the mark only.
