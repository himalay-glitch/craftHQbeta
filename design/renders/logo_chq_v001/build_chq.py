"""Build the CHQ black-glass mark (logo_chq_v001).

    Blender -b --factory-startup --python build_chq.py

Reads  work/chq_outlines.json (from extract_chq.py: Poppins ExtraBold H and O, a C built
       from the O, and the red slash)
Writes design/blender/crafthq_logo_chq_v001.blend

Scene SC_CHQ (metres, Cycles, Khronos PBR Neutral):
  00_Camera        CAM_CHQ_Front (ortho), CAM_CHQ_Hero (85 mm)
  01_Lights_Front  studio for the straight-on render (transparent background)
  01_Lights_Hero   studio for the 3/4 hero on the white floor
  02_CHQ           SM_CHQ_C / _H / _Q (black glass) + SM_CHQ_Slash (red glass)
  04_Studio        floor
  99_Source        the 2D Bezier outlines the meshes were made from (not rendered)
render_chq.py switches between the two shots. The materials, the mitered bevel builder
and the studios come from design/renders/logo_glass_v002/build_logo.py.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
TRACE = os.path.join(HERE, 'work', 'chq_outlines.json')
BLEND_OUT = os.path.join(REPO, 'design', 'blender', 'crafthq_logo_chq_v001.blend')
if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1:
    BLEND_OUT = sys.argv[sys.argv.index('--') + 1]

# ------------------------------------------------------------ dimensions (m)
# The mark is 136 mm wide, cap height 45 mm, strokes ~12.5 mm.
BEVEL = 0.0013              # round bevel radius on every edge (the bright "clear edge")
EXTRUDE = 0.0042            # half-depth of the straight side wall -> letters 11 mm deep
SLASH_EXTRUDE = 0.0017      # slash is a thinner slab: 6 mm deep ...
SLASH_PROUD = 0.0088        # ... lying 0.3 mm in front of the Q's face, over the bowl
FLOOR_GAP = 0.0010          # hero: lowest point (slash tip, below the baseline) above the floor

# ------------------------------------------------------------------- helpers
def new_coll(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    return c


def link(ob, coll):
    for c in ob.users_collection:
        c.objects.unlink(ob)
    coll.objects.link(ob)
    return ob


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


# --------------------------------------------------------------- scene setup
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'SC_CHQ'
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.render.engine = 'CYCLES'
scene.cycles.feature_set = 'SUPPORTED'
scene.cycles.samples = 512
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.005
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
try:
    scene.cycles.denoising_prefilter = 'ACCURATE'
except Exception:
    pass
scene.cycles.max_bounces = 24
scene.cycles.glossy_bounces = 10
scene.cycles.transmission_bounces = 16
scene.cycles.transparent_max_bounces = 16
scene.cycles.diffuse_bounces = 4
scene.cycles.sample_clamp_direct = 0.0
scene.cycles.sample_clamp_indirect = 6.0
scene.cycles.blur_glossy = 0.4
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.use_light_tree = True
scene.render.film_transparent = True
scene.render.filter_size = 1.2
scene.view_settings.view_transform = 'Khronos PBR Neutral'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0
scene.display_settings.display_device = 'sRGB'
scene.sequencer_colorspace_settings.name = 'sRGB'
im = scene.render.image_settings
im.file_format = 'PNG'; im.color_mode = 'RGBA'; im.color_depth = '16'; im.compression = 15
scene.render.resolution_percentage = 100

C_CAM = new_coll('00_Camera')
C_LF = new_coll('01_Lights_Front')
C_LH = new_coll('01_Lights_Hero')
C_WORD = new_coll('02_CHQ')
C_STUDIO = new_coll('04_Studio')
C_SRC = new_coll('99_Source')

# ----------------------------------------------------------------- materials
def principled(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    return nt, bsdf, out


def roughness_breakup(nt, bsdf, lo, hi, scale, socket='Roughness'):
    """Very subtle roughness variation (polish marks) so the gloss is not CG-flat."""
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 3.0
    nz.inputs['Roughness'].default_value = 0.55
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.3
    mr.inputs['From Max'].default_value = 0.7
    mr.inputs['To Min'].default_value = lo
    mr.inputs['To Max'].default_value = hi
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], bsdf.inputs[socket])
    tc.location = (-900, 0); nz.location = (-700, 0); mr.location = (-450, 0)


# Black glass / glossy resin: near-black dielectric with a clear coat on top.
m_black = bpy.data.materials.new('MAT_CHQ_BlackGlass')
nt, b, out = principled(m_black)
b.inputs['Base Color'].default_value = (0.0045, 0.0045, 0.005, 1)
b.inputs['Metallic'].default_value = 0.0
b.inputs['IOR'].default_value = 1.52
b.inputs['Specular IOR Level'].default_value = 0.5
b.inputs['Coat Weight'].default_value = 1.0
b.inputs['Coat Roughness'].default_value = 0.012
b.inputs['Coat IOR'].default_value = 1.5
roughness_breakup(nt, b, 0.05, 0.09, 60.0)
m_black.diffuse_color = (0.02, 0.02, 0.02, 1)

# Red glass: saturated transmissive red with a faint self-glow; shadow rays pass
# through red-tinted so the slash throws a red light/caustic hint, not a black shadow.
m_red = bpy.data.materials.new('MAT_CHQ_RedGlass')
nt, b, out = principled(m_red)
RED_TINT = (0.36, 0.003, 0.006)         # transmission tint for a full pass through the slab
b.inputs['Base Color'].default_value = RED_TINT + (1,)
b.inputs['Metallic'].default_value = 0.0
b.inputs['Roughness'].default_value = 0.02
b.inputs['IOR'].default_value = 1.5
b.inputs['Transmission Weight'].default_value = 1.0
b.inputs['Coat Weight'].default_value = 0.0
b.inputs['Emission Color'].default_value = (1.0, 0.012, 0.01, 1)
lp = nt.nodes.new('ShaderNodeLightPath')
# glow: faint to the camera, stronger in what it lights (floor, the Q next to it)
glow_cam = 0.40; glow_gloss = 0.6; glow_diff = 1.8
m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY_ADD'
m1.inputs[1].default_value = glow_diff - glow_cam; m1.inputs[2].default_value = glow_cam
nt.links.new(lp.outputs['Is Diffuse Ray'], m1.inputs[0])
m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY_ADD'
m2.inputs[1].default_value = glow_gloss - glow_cam
nt.links.new(lp.outputs['Is Glossy Ray'], m2.inputs[0])
nt.links.new(m1.outputs[0], m2.inputs[2])
nt.links.new(m2.outputs[0], b.inputs['Emission Strength'])
m1.location = (-450, 250); m2.location = (-250, 250)
tr = nt.nodes.new('ShaderNodeBsdfTransparent')
tr.inputs['Color'].default_value = (0.9, 0.05, 0.04, 1)
mix = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Shadow Ray'], mix.inputs['Fac'])
nt.links.new(b.outputs['BSDF'], mix.inputs[1])
nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
lp.location = (-200, 400); tr.location = (-200, -400); mix.location = (300, 100); out.location = (550, 100)
m_red.diffuse_color = (0.8, 0.02, 0.02, 1)

# Floor: paper-white seamless with a faint satin sheen for soft reflections.
m_floor = bpy.data.materials.new('MAT_CHQ_FloorWhite')
nt, b, out = principled(m_floor)
b.inputs['Base Color'].default_value = (0.82, 0.82, 0.82, 1)
b.inputs['Specular IOR Level'].default_value = 0.5
b.inputs['Coat Weight'].default_value = 0.25
b.inputs['Coat Roughness'].default_value = 0.2
roughness_breakup(nt, b, 0.42, 0.5, 8.0)


def emission_card_mat(name, strength, gradient=None):
    """Reflection card: emission only, with an optional gradient along a world
    axis: world coordinate gradient['lo'] -> ramp 0, gradient['hi'] -> ramp 1."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = strength
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    if gradient:
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.clamp = True
        mr.inputs['From Min'].default_value = gradient['lo']
        mr.inputs['From Max'].default_value = gradient['hi']
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        nt.links.new(geo.outputs['Position'], sep.inputs['Vector'])
        nt.links.new(sep.outputs[gradient['axis']], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
        geo.location = (-800, 0); sep.location = (-600, 0); mr.location = (-400, 0); ramp.location = (-200, 0)
        cr = ramp.color_ramp
        cr.interpolation = 'EASE'
        stops = gradient['stops']
        cr.elements[0].position = stops[0][0]; cr.elements[0].color = (stops[0][1],) * 3 + (1,)
        cr.elements[1].position = stops[-1][0]; cr.elements[1].color = (stops[-1][1],) * 3 + (1,)
        for pos, v in stops[1:-1]:
            e = cr.elements.new(pos); e.color = (v, v, v, 1)
        nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    return m


# ----------------------------------------------------------------- geometry
data = json.load(open(TRACE))
GLYPHS = ['C', 'H', 'Q', 'Slash']
contours = []
glyph_contours = {}
for g in GLYPHS:
    base = len(contours)
    ids = []
    for it in data['glyphs'][g]:
        contours.append(dict(segs=it['segs'], parent=(base + it['parent']) if it['parent'] >= 0 else -1))
        ids.append(len(contours) - 1)
    glyph_contours[g] = ids


def to_local(p):
    return Vector((p[0], p[1], 0.0))      # already metres, y up, baseline at 0


def make_curve(name, contour_ids):
    """Flat 2D Bezier copy of the traced outline (reference / re-editing only)."""
    cu = bpy.data.curves.new('CRV_CHQ_' + name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.resolution_u = 24
    for ci in contour_ids:
        segs = contours[ci]['segs']
        sp = cu.splines.new('BEZIER')
        sp.bezier_points.add(len(segs) - 1)
        sp.use_cyclic_u = True
        for k in range(len(segs)):
            bp = sp.bezier_points[k]
            bp.handle_left_type = 'FREE'
            bp.handle_right_type = 'FREE'
            bp.co = to_local(segs[k][0])
            bp.handle_right = to_local(segs[k][1])
            bp.handle_left = to_local(segs[k - 1][2])
    ob = bpy.data.objects.new('CRV_CHQ_' + name, cu)
    ob.rotation_euler = (math.radians(90), 0, 0)
    C_SRC.objects.link(ob)
    return ob


# --------------------------------------------------- mitered bevelled extrusion
# Blender's own curve bevel insets the cap without proper miters, so the cap
# self-intersects at acute tips (the Q's lower terminal, the slash).  The glyphs
# are therefore built here: the outline is flattened, offset inward with exact
# miters for every ring of a round bevel profile, extruded, and capped.
PROFILE_SEGS = 8


def bez_point(P, t):
    mt = 1 - t
    return P[0] * mt ** 3 + P[1] * (3 * mt * mt * t) + P[2] * (3 * mt * t * t) + P[3] * t ** 3


def flatten(segs):
    """Bezier contour -> 2D polyline (Vectors) + per-point corner flags."""
    P2 = [[to_local(p).to_2d() for p in s] for s in segs]
    pts, corner = [], []
    n = len(P2)
    for k, P in enumerate(P2):
        chord = P[3] - P[0]
        L = chord.length
        dev = max(abs(chord.cross(P[1] - P[0])), abs(chord.cross(P[2] - P[0]))) / max(L, 1e-12)
        if dev < 1e-7:
            ts = [0.0]
        else:
            t0 = P[1] - P[0] if (P[1] - P[0]).length > 1e-9 else P[2] - P[0]
            t1 = P[3] - P[2] if (P[3] - P[2]).length > 1e-9 else P[3] - P[1]
            turn = abs(t0.angle_signed(t1, 0.0))
            arc = sum((bez_point(P, (i + 1) / 32) - bez_point(P, i / 32)).length for i in range(32))
            N = max(3, int(math.ceil(turn / math.radians(1.5))), int(math.ceil(arc / 0.0002)))
            ts = [i / N for i in range(N)]
        # corner at the start of this segment?
        Q = P2[k - 1]
        tin = Q[3] - Q[2] if (Q[3] - Q[2]).length > 1e-9 else Q[3] - Q[1]
        tout = P[1] - P[0] if (P[1] - P[0]).length > 1e-9 else P[2] - P[0]
        is_corner = abs(tin.angle_signed(tout, 0.0)) > math.radians(4)
        for t in ts:
            pts.append(bez_point(P, t))
            corner.append(is_corner if t == 0.0 else False)
    # drop duplicates
    out_p, out_c = [], []
    for p, c in zip(pts, corner):
        if out_p and (p - out_p[-1]).length < 1e-8:
            out_c[-1] = out_c[-1] or c
            continue
        out_p.append(p); out_c.append(c)
    if (out_p[0] - out_p[-1]).length < 1e-8:
        out_p.pop(); out_c[0] = out_c[0] or out_c.pop()
    return out_p, out_c


def signed_area(pts):
    return 0.5 * sum(pts[i - 1].x * pts[i].y - pts[i].x * pts[i - 1].y for i in range(len(pts)))


def miters(pts):
    """Inward miter vectors (polyline is oriented so the ink is on its left)."""
    n = len(pts)
    nrm = []
    for i in range(n):
        t = (pts[(i + 1) % n] - pts[i]).normalized()
        nrm.append(Vector((-t.y, t.x)))          # left normal = into the ink
    m = []
    for i in range(n):
        n1, n2 = nrm[i - 1], nrm[i]
        dot = n1.dot(n2)
        v = (n1 + n2) / max(1.0 + dot, 0.12)     # exact miter, capped for needle tips
        m.append(v)
    return m


def build_glyph_mesh(name, contour_ids, mat, coll, extra=0.0, extrude=None):
    """extra > 0 emboldens the glyph (outline pushed outward by `extra` metres)."""
    loops = []
    for ci in contour_ids:
        pts, _ = flatten(contours[ci]['segs'])
        is_outer = contours[ci]['parent'] < 0
        a = signed_area(pts)
        if (is_outer and a < 0) or (not is_outer and a > 0):
            pts = pts[::-1]
        mt = miters(pts)
        if extra:
            pts = [p - m * extra for p, m in zip(pts, mt)]
            mt = miters(pts)
        loops.append((pts, mt))
    ex = EXTRUDE if extrude is None else extrude
    rings = []                                    # (inset, z) from back cap to front cap
    for k in range(PROFILE_SEGS, -1, -1):
        phi = math.radians(90) * k / PROFILE_SEGS
        rings.append((BEVEL * (1 - math.cos(phi)), -(ex + BEVEL * math.sin(phi))))
    for k in range(0, PROFILE_SEGS + 1):
        phi = math.radians(90) * k / PROFILE_SEGS
        rings.append((BEVEL * (1 - math.cos(phi)), ex + BEVEL * math.sin(phi)))
    bm = bmesh.new()
    cap_back, cap_front = [], []
    for pts, mt in loops:
        n = len(pts)
        grid = []
        for d, z in rings:
            grid.append([bm.verts.new((p.x + m.x * d, p.y + m.y * d, z)) for p, m in zip(pts, mt)])
        for r in range(len(rings) - 1):
            A, B = grid[r], grid[r + 1]
            for i in range(n):
                j = (i + 1) % n
                bm.faces.new((A[i], A[j], B[j], B[i]))
        cap_back.append(grid[0]); cap_front.append(grid[-1])
    for cap in (cap_back, cap_front):
        polys = [[v.co.copy() for v in loop] for loop in cap]
        flat = [v for loop in cap for v in loop]
        for tri in tessellate_polygon(polys):
            bm.faces.new([flat[i] for i in tri])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # stand up: local +Y -> world +Z, front cap (+Z) -> world -Y (camera side)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    bm.normal_update()
    capset = set(f for f in bm.faces if abs(f.normal.y) > 0.99999 and len(f.verts) == 3)
    lim = math.radians(32)
    for e in bm.edges:
        fs = e.link_faces
        if len(fs) == 2 and (((fs[0] in capset) != (fs[1] in capset)) or fs[0].normal.angle(fs[1].normal, 0.0) > lim):
            e.smooth = False
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new('ME_' + name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


for g in GLYPHS:
    make_curve(g, glyph_contours[g])

word = {}
for g in GLYPHS:
    word[g] = build_glyph_mesh('SM_CHQ_' + g, glyph_contours[g],
                               m_red if g == 'Slash' else m_black, C_WORD,
                               extrude=SLASH_EXTRUDE if g == 'Slash' else None)
word['Slash'].location.y -= SLASH_PROUD


def world_bbox(objs):
    xs, ys, zs = [], [], []
    for ob in objs:
        mw = ob.matrix_world
        for v in ob.data.vertices:
            w = mw @ v.co
            xs.append(w.x); ys.append(w.y); zs.append(w.z)
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


e = bpy.data.objects.new('EMPTY_CHQ_Wordmark', None)
e.empty_display_type = 'PLAIN_AXES'; e.empty_display_size = 0.05
C_WORD.objects.link(e)
for ob in word.values():
    ob.parent = e

bpy.context.view_layer.update()
(wx0, wx1), (wy0, wy1), (wz0, wz1) = world_bbox(word.values())
print('CHQ bbox x %.4f..%.4f  y %.4f..%.4f  z %.4f..%.4f' % (wx0, wx1, wy0, wy1, wz0, wz1))

# ------------------------------------------------------------------- studio
# Floor (hero only): the slash tip is the lowest point, the logo hovers just above.
floor_z = wz0 - FLOOR_GAP
bpy.ops.mesh.primitive_plane_add(size=6.0, location=(0, 1.0, floor_z))
floor = bpy.context.active_object
floor.name = 'SM_CHQ_Floor'; floor.data.name = 'ME_CHQ_Floor'
floor.data.materials.append(m_floor)
floor.visible_glossy = False   # black glass mirrors the dark studio, not the paper
link(floor, C_STUDIO)


def card(name, size, loc, rot, mat, coll, camera=False, shadow=False):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name; ob.data.name = 'ME_' + name
    ob.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    ob.visible_camera = camera
    ob.visible_shadow = shadow
    ob.visible_diffuse = False
    ob.visible_volume_scatter = False
    link(ob, coll)
    return ob


def area(name, coll, loc, target, size, energy, shape='RECTANGLE', color=(1, 1, 1), spread=180, glossy=True, camera=False):
    L = bpy.data.lights.new(name, 'AREA')
    L.shape = shape
    L.size = size[0]
    L.size_y = size[1]
    L.energy = energy
    L.color = color
    L.spread = math.radians(spread)
    ob = bpy.data.objects.new(name, L)
    ob.location = loc
    look_at(ob, target)
    ob.visible_glossy = glossy
    ob.visible_camera = camera
    ob.visible_transmission = False   # no blown-out softbox seen through the red glass
    coll.objects.link(ob)
    return ob


CENTER = Vector(((wx0 + wx1) / 2, 0.0, (wz0 + wz1) / 2))

# --- front studio (straight-on renders, transparent background)
# Light levels are physical: a W area light of area A has radiance W/(pi*A).
# Reflection card in front: the flat front faces mirror it (ortho: 1:1 by height),
# so its gradient becomes a soft sheen on the upper half of every letter.
# The card spans exactly the letter height (wz0..wz1), so the stops are in letter height.
m_card_front = emission_card_mat('MAT_CHQ_CardFrontGradient', 3.0, gradient=dict(
    axis='Z', lo=wz0, hi=wz1, stops=[(0.0, 0.0), (0.38, 0.0), (0.78, 0.22), (1.0, 0.6)]))
card('SM_CHQ_FrontCard', (0.40, wz1 - wz0), (CENTER.x, -0.25, CENTER.z), (math.radians(90), 0, 0), m_card_front, C_LF)
# card behind the logo: what the red glass shows through itself (transmission only,
# so the exactly edge-on side walls of the ortho view never pick it up as streaks)
sz0, sz1 = world_bbox([word['Slash']])[2]
m_card_back = emission_card_mat('MAT_CHQ_CardBack', 1.3, gradient=dict(
    axis='Z', lo=sz0 - (sz1 - sz0) / 2, hi=sz1 + (sz1 - sz0) / 2, stops=[(0.0, 0.22), (0.30, 0.34), (0.72, 0.9), (1.0, 1.0)]))
bc = card('SM_CHQ_BackCard', (0.4, (sz1 - sz0) * 2.0), (CENTER.x, 0.12, (sz0 + sz1) / 2), (math.radians(90), 0, 0), m_card_back, C_LF)
bc.visible_glossy = False
area('LGT_CHQ_Front_TopStrip', C_LF, (0, -0.10, 0.30), (0, 0, CENTER.z), (0.9, 0.035), 3.5)
area('LGT_CHQ_Front_TopSoft', C_LF, (0, 0.05, 0.35), (0, 0, CENTER.z), (0.8, 0.30), 1.5)
area('LGT_CHQ_Front_SideL', C_LF, (-0.38, -0.10, CENTER.z + 0.05), (0, 0, CENTER.z), (0.03, 0.35), 0.8)
area('LGT_CHQ_Front_SideR', C_LF, (0.38, -0.10, CENTER.z + 0.05), (0, 0, CENTER.z), (0.03, 0.35), 0.8)

# --- hero studio (white floor, 3/4 view from slightly above)
area('LGT_CHQ_Hero_Overhead', C_LH, (0.0, 0.45, 1.10), (0.0, 0.45, 0.0), (2.2, 2.2), 4.4)
# key from behind and above: soft shadows fall toward the camera, and the light
# that passes through the slash lands in front of it as a red pool
area('LGT_CHQ_Hero_Key', C_LH, (-0.06, 0.42, 0.32), (0.02, 0, 0.0), (0.36, 0.26), 2.9)
area('LGT_CHQ_Hero_TopStrip', C_LH, (0.0, 0.06, 0.42), (0, 0, CENTER.z), (0.9, 0.04), 0.9)
area('LGT_CHQ_Hero_StripL', C_LH, (-0.42, -0.18, 0.12), (0, 0, CENTER.z), (0.035, 0.45), 0.45)
area('LGT_CHQ_Hero_StripR', C_LH, (0.42, -0.22, 0.12), (0, 0, CENTER.z), (0.035, 0.45), 0.45)
area('LGT_CHQ_Hero_Back', C_LH, (0.05, 0.45, 0.30), (0, 0, 0.0), (0.9, 0.5), 1.3)
# far white sweep, seen only in reflections: keeps the floor's grazing sheen
# white toward the top of frame and lays a horizon line on the letters' tops
m_sweep = emission_card_mat('MAT_CHQ_SweepWhite', 0.8)
sw = card('SM_CHQ_HeroSweep', (4.0, 0.9), (0, 1.8, floor_z + 0.45), (math.radians(90), 0, 0), m_sweep, C_LH)
sw.visible_transmission = False
# sheen card under the (glossy-invisible) floor, in front of the logo: the front
# faces mirror it on their way down, so it lays a soft gradient on their upper half
# (world y: the letter tops mirror y ~ -0.58, mid height ~ -0.30, the base ~ -0.15)
m_sheen = emission_card_mat('MAT_CHQ_CardHeroSheen', 3.0, gradient=dict(
    axis='Y', lo=-0.62, hi=-0.31, stops=[(0.0, 0.8), (0.45, 0.32), (1.0, 0.0)]))
sh = card('SM_CHQ_HeroSheen', (0.9, 0.62), (0.03, -0.40, floor_z - 0.03), (0, 0, math.radians(-7)), m_sheen, C_LH)
sh.visible_transmission = False

# ------------------------------------------------------------------- world
world = bpy.data.worlds.new('WLD_CHQ_Studio')
scene.world = world
world.use_nodes = True
wn = world.node_tree
bg = next(n for n in wn.nodes if n.type == 'BACKGROUND')
tc = wn.nodes.new('ShaderNodeTexCoord')
sep = wn.nodes.new('ShaderNodeSeparateXYZ')
ramp = wn.nodes.new('ShaderNodeMapRange')
ramp.inputs['From Min'].default_value = -0.02   # direction Z: horizon ...
ramp.inputs['From Max'].default_value = 0.7     # ... to high up
ramp.inputs['To Min'].default_value = 0.0       # black below the horizon (deep glass)
ramp.inputs['To Max'].default_value = 0.22
ramp.clamp = True
wn.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
wn.links.new(sep.outputs['Z'], ramp.inputs['Value'])
wn.links.new(ramp.outputs['Result'], bg.inputs['Strength'])
bg.inputs['Color'].default_value = (1, 1, 1, 1)

# ------------------------------------------------------------------ cameras
def framing_ortho(cam_ob, objs, margin_frac, res_x):
    (x0, x1), (y0, y1), (z0, z1) = world_bbox(objs)
    w = x1 - x0; h = z1 - z0
    m = margin_frac * w
    cam = cam_ob.data
    cam.type = 'ORTHO'
    cam.sensor_fit = 'HORIZONTAL'
    cam.ortho_scale = w + 2 * m
    cam_ob.location = ((x0 + x1) / 2, y0 - 0.6, (z0 + z1) / 2)
    cam_ob.rotation_euler = (math.radians(90), 0, 0)
    res_y = int(round(res_x * (h + 2 * m) / (w + 2 * m)))
    cam_ob['res_x'] = res_x
    cam_ob['res_y'] = res_y
    cam.clip_start = 0.01; cam.clip_end = 5.0
    return res_y


cam_front = bpy.data.objects.new('CAM_CHQ_Front', bpy.data.cameras.new('CAM_CHQ_Front'))
C_CAM.objects.link(cam_front)
framing_ortho(cam_front, word.values(), 0.02, 1600)


cam_hero = bpy.data.objects.new('CAM_CHQ_Hero', bpy.data.cameras.new('CAM_CHQ_Hero'))
C_CAM.objects.link(cam_hero)
cam_hero.data.lens = 85
cam_hero.data.sensor_width = 36
cam_hero.data.sensor_fit = 'HORIZONTAL'
cam_hero.data.clip_start = 0.01; cam_hero.data.clip_end = 20
yaw = math.radians(8); elev = math.radians(9); dist = 0.50
tgt = Vector((0.002, 0.0, CENTER.z - 0.002))
cam_hero.location = tgt + Vector((math.sin(yaw) * math.cos(elev) * dist, -math.cos(yaw) * math.cos(elev) * dist, math.sin(elev) * dist))
look_at(cam_hero, tgt)
cam_hero['res_x'] = 2400; cam_hero['res_y'] = 1000

# viewport niceties
for ob in list(C_SRC.objects):
    ob.hide_render = True
    ob.hide_set(True)
# open the file on the hero set-up (render_logo.py switches collections per shot)
vl = bpy.context.view_layer
for name, on in [('01_Lights_Front', False), ('01_Lights_Hero', True), ('02_CHQ', True),
                 ('04_Studio', True), ('99_Source', False)]:
    vl.layer_collection.children[name].exclude = not on
scene.camera = cam_hero
scene.render.film_transparent = False
scene.render.resolution_x, scene.render.resolution_y = 2400, 1000

bpy.ops.outliner.orphans_purge(do_recursive=True) if bpy.context.area else None
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT, compress=True)
print('saved', BLEND_OUT)
for g, ob in word.items():
    me = ob.data
    print('  %-26s verts %6d faces %6d' % (ob.name, len(me.vertices), len(me.polygons)))
