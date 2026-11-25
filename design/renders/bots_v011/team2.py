# CraftHQ bot team v2: matte stuffed-plush characters, one simple form per job (reference style: soft pillow
# forms, short dense matte pile, tiny bead eyes or closed happy eyes, no mouths, no cheeks, matte felt/rubber).
# Built from an empty scene (factory startup); every datablock is prefixed T2_.
#
#   Blender -b --factory-startup --python team2.py -- still     <bot> <out_dir> <res> <samples>
#   Blender -b --factory-startup --python team2.py -- calibrate <bot> <out_dir>
#   Blender -b --factory-startup --python team2.py -- save      <blend_path>          (all five, side by side)
#   Blender -b --factory-startup --python team2.py -- loop builder <out_dir> <res> <samples> idle|work
#   Blender -b --factory-startup --python team2.py -- loop pm <out_dir> <res> <samples> blink
# Coat colours (linear, the hair shader's input) live in colors.json next to this script.
import bpy, sys, os, json, math
import numpy as np
from mathutils import Vector, Matrix, Euler, Quaternion
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:]
mode = args[0]
P = "T2_"

# sRGB targets for each coat (median of its pixels): bold, saturated, one even colour.
TARGET = {
    "pm": (250, 190, 30),        # warm saturated yellow
    "builder": (43, 136, 241),   # the OpenDots blue
    "designer": (138, 82, 232),  # saturated violet
    "checker": (40, 196, 100),   # fresh saturated green
    "fixer": (232, 50, 52),      # saturated red
}
ORDER = ["pm", "builder", "designer", "checker", "fixer"]
SIZE = 0.078          # every body's larger side (width or height), so they read at one size
PILE = 0.0030         # short plush pile
HAIR_MODEL = os.environ.get("HAIR_MODEL", "CHIANG")
# The camera fill, per bot: less on the PM, so its yellow stays deep (more fill lifts its blue toward cream).
CAMFILL = {"pm": 2.5}

def s2l(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

# ---------- Scene ----------
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
sc.name = P + "SC_Team"

def coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c

# ---------- Materials ----------
def principled(name, base, rough, spec=0.2, sheen=0.0, sheen_tint=(1, 1, 1), sheen_rough=0.5, coat=0.0):
    m = bpy.data.materials.new(P + name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*base, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Sheen Tint"].default_value = (*sheen_tint, 1.0)
    b.inputs["Sheen Roughness"].default_value = sheen_rough
    b.inputs["Coat Weight"].default_value = coat
    return m, b

def add_grain(m, b, scale=2600.0, strength=0.3, dots=False):
    """A fine felted grain (noise bump); with dots, a plaster's little air holes."""
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = scale; noise.inputs["Detail"].default_value = 6.0
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    h = noise.outputs["Fac"]
    if dots:
        vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 900.0
        nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
        mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.08; mr.inputs["From Max"].default_value = 0.16
        nt.links.new(vor.outputs["Distance"], mr.inputs["Value"])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(mr.outputs["Result"], mul.inputs[0]); nt.links.new(noise.outputs["Fac"], mul.inputs[1])
        h = mul.outputs[0]
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = strength; bump.inputs["Distance"].default_value = 0.0002
    nt.links.new(h, bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])

MIX = {}
def fur_material(bot):
    """Matte plush pile: Huang hair, rough, almost no reflection, so no strand glints."""
    m = bpy.data.materials.new(P + f"MAT_Fur_{bot}"); m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    hair = nt.nodes.new("ShaderNodeBsdfHairPrincipled"); hair.parametrization = "COLOR"
    if HAIR_MODEL == "CHIANG":
        hair.model = "CHIANG"
        for k, v in (("Roughness", 0.9), ("Radial Roughness", 1.0), ("Coat", 0.0), ("Random Roughness", 0.15)):
            hair.inputs[k].default_value = v
    else:
        hair.model = "HUANG"
        for k, v in (("Roughness", 0.9), ("Reflection", 0.04), ("Transmission", 1.0), ("Secondary Reflection", 0.3),
                     ("Random Roughness", 0.15), ("Aspect Ratio", 0.85)):
            hair.inputs[k].default_value = v
    nt.links.new(hair.outputs[0], out.inputs["Surface"])
    info = nt.nodes.new("ShaderNodeHairInfo")
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Max"].default_value = 0.9
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    nt.links.new(info.outputs["Intercept"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], hair.inputs["Color"])
    MIX[bot] = mix
    return m

UNDER = {}
def set_coat(bot, lin):
    MIX[bot].inputs["A"].default_value = (*lin, 1.0)                               # roots = the coat: one even colour head-on
    MIX[bot].inputs["B"].default_value = (*lin, 1.0)
    UNDER[bot].inputs["Base Color"].default_value = (*[v * 0.95 for v in lin], 1.0)   # ~ the coat, so looking down the pile stays even

def materials():
    M = {}
    M["bead"], _ = principled("MAT_Bead_Black", (0.004, 0.004, 0.005), 0.16, spec=0.5)
    M["bead_soft"], _ = principled("MAT_Bead_Black_Soft", (0.004, 0.004, 0.005), 0.42, spec=0.35)
    M["eye_gloss"], _ = principled("MAT_Eye_Gloss_BlackBrown", (0.010, 0.0062, 0.0042), 0.28, spec=0.5)
    m, b = principled("MAT_Eye_Highlight", (1, 1, 1), 0.6, spec=0.0)
    b.inputs["Emission Color"].default_value = (1, 1, 1, 1); b.inputs["Emission Strength"].default_value = 0.9
    M["highlight"] = m
    M["rubber"], _ = principled("MAT_Rubber_Black", (0.010, 0.010, 0.011), 0.72, spec=0.18)
    m, b = principled("MAT_Felt_Black", (0.008, 0.008, 0.009), 1.0, spec=0.02, sheen=0.10, sheen_tint=(0.4, 0.4, 0.45), sheen_rough=0.7)
    add_grain(m, b); M["felt_black"] = m
    m, b = principled("MAT_Felt_Yellow", (s2l(232), s2l(158), s2l(18)), 1.0, spec=0.05, sheen=0.10, sheen_tint=(1, 0.8, 0.4), sheen_rough=0.6)
    add_grain(m, b); M["felt_yellow"] = m
    m, b = principled("MAT_Felt_Caramel", (s2l(140), s2l(80), s2l(38)), 1.0, spec=0.05, sheen=0.18, sheen_tint=(1, 0.85, 0.7), sheen_rough=0.6)
    add_grain(m, b, strength=0.35); M["felt_caramel"] = m
    m, b = principled("MAT_Felt_Brown", (s2l(62), s2l(38), s2l(26)), 1.0, spec=0.05, sheen=0.15, sheen_tint=(1, 0.9, 0.8))
    add_grain(m, b); M["felt_brown"] = m
    M["eye_white"], _ = principled("MAT_Eye_White", (0.82, 0.82, 0.80), 0.42, spec=0.3)
    M["thread"], _ = principled("MAT_Thread_Black", (0.008, 0.007, 0.008), 0.85, spec=0.1)
    m, b = principled("MAT_Plaster_Beige", (s2l(226), s2l(196), s2l(156)), 0.95, spec=0.08, sheen=0.25, sheen_tint=(1, 0.95, 0.9))
    add_grain(m, b, dots=True, strength=0.45); M["plaster"] = m
    m, b = principled("MAT_Plaster_Pad", (s2l(240), s2l(228), s2l(205)), 0.95, spec=0.06, sheen=0.3)
    add_grain(m, b); M["pad"] = m
    return M

# ---------- Forms: metaball pillows, remeshed and smoothed ----------
def meta_form(name, elements, thick_note=""):
    mb = bpy.data.metaballs.new(P + name + "_MB")
    mb.resolution = mb.render_resolution = 0.07     # design units (about 1 mm after the normalising scale)
    mb.threshold = 0.6
    ob = bpy.data.objects.new(P + name + "_MB", mb); sc.collection.objects.link(ob)
    for t, co, r, size, rot in elements:
        el = mb.elements.new(type=t)
        el.co = co; el.radius = r; el.stiffness = 2.0
        if t != "BALL": el.size_x, el.size_y, el.size_z = size
        el.rotation = Euler(rot, "XYZ").to_quaternion()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
    bpy.data.objects.remove(ob, do_unlink=True); bpy.data.metaballs.remove(mb)
    # Normalise: centre the box, scale so the larger of width/height is SIZE.
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    cx, cy, cz = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2
    s = SIZE / max(max(xs) - min(xs), max(zs) - min(zs))
    N = Matrix.Scale(s, 4) @ Matrix.Translation((-cx, -cy, -cz))
    me.transform(N)
    body = bpy.data.objects.new(P + name, me); sc.collection.objects.link(body)
    r = body.modifiers.new("Remesh", "REMESH"); r.mode = "VOXEL"; r.voxel_size = 0.0006; r.adaptivity = 0.0
    sm = body.modifiers.new("Smooth", "SMOOTH"); sm.factor = 0.6; sm.iterations = 8
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(body.evaluated_get(dg), depsgraph=dg)
    body.modifiers.clear(); old = body.data; body.data = me2; bpy.data.meshes.remove(old)
    me2.name = P + name + "_Mesh"
    me2.shade_smooth()
    sc.collection.objects.unlink(body)
    return body, N


# ---------- Forms with straight edges: an exact 2D outline, inflated like a stuffed pillow ----------
def outline_rounded_rect(w, h, r, n=320):
    """Evenly spaced points (by arc length) around a rounded rectangle in XZ, counter-clockwise from the right."""
    segs = []
    cx, cz = w / 2 - r, h / 2 - r
    for (ox, oz, a0) in ((cx, cz, 0), (-cx, cz, 90), (-cx, -cz, 180), (cx, -cz, 270)):
        segs.append(("arc", (ox, oz), a0))
    return _sample_outline_rr(w, h, r, n)

def _sample_outline_rr(w, h, r, n):
    cx, cz = w / 2 - r, h / 2 - r
    pieces = [  # (length, function u->(x,z))
        (2 * cz, lambda u: (w / 2, -cz + 2 * cz * u)),
        (math.pi * r / 2, lambda u: (cx + r * math.cos(math.pi / 2 * u), cz + r * math.sin(math.pi / 2 * u))),
        (2 * cx, lambda u: (cx - 2 * cx * u, h / 2)),
        (math.pi * r / 2, lambda u: (-cx + r * math.cos(math.pi / 2 * (1 + u)), cz + r * math.sin(math.pi / 2 * (1 + u)))),
        (2 * cz, lambda u: (-w / 2, cz - 2 * cz * u)),
        (math.pi * r / 2, lambda u: (-cx + r * math.cos(math.pi / 2 * (2 + u)), -cz + r * math.sin(math.pi / 2 * (2 + u)))),
        (2 * cx, lambda u: (-cx + 2 * cx * u, -h / 2)),
        (math.pi * r / 2, lambda u: (cx + r * math.cos(math.pi / 2 * (3 + u)), -cz + r * math.sin(math.pi / 2 * (3 + u)))),
    ]
    return _even(pieces, n)

def outline_rounded_hexagon(Rc, rc, n=320):
    """A flat-top hexagon (points left and right, flat edges top and bottom) with corners rounded by rc."""
    inr = Rc * math.cos(math.radians(30))
    Rc2 = (inr - rc) / math.cos(math.radians(30))           # the inset hexagon whose corners carry the arcs
    V = [(Rc2 * math.cos(math.radians(60 * k)), Rc2 * math.sin(math.radians(60 * k))) for k in range(6)]
    pieces = []
    for k in range(6):
        a0 = math.radians(60 * k - 30); a1 = math.radians(60 * k + 30)
        vx, vz = V[k]
        pieces.append((rc * (a1 - a0), (lambda vx, vz, a0, a1: lambda u: (vx + rc * math.cos(a0 + (a1 - a0) * u), vz + rc * math.sin(a0 + (a1 - a0) * u)))(vx, vz, a0, a1)))
        nx, nz = V[(k + 1) % 6]
        b = math.radians(60 * k + 30)
        p0 = (vx + rc * math.cos(b), vz + rc * math.sin(b)); p1 = (nx + rc * math.cos(b), nz + rc * math.sin(b))
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        pieces.append((L, (lambda p0, p1: lambda u: (p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u))(p0, p1)))
    return _even(pieces, n)

def _even(pieces, n):
    total = sum(L for L, _ in pieces)
    pts = []
    for i in range(n):
        d = total * i / n
        for L, f in pieces:
            if d <= L or (L, f) == pieces[-1]:
                pts.append(f(min(1.0, d / L) if L > 0 else 0.0)); break
            d -= L
    return pts

def pillow_form(name, outline, half_thick, n_exp=2.6, rings=36):
    """A closed stuffed-pillow surface over a star-shaped outline: (x, z) = rho * outline, y = -/+ h(rho),
    h = half_thick * (1 - rho^n)^(1/n). Faces bulge gently; the rim rounds over with a vertical tangent."""
    import bmesh
    M = len(outline)
    me = bpy.data.meshes.new(P + name + "_Mesh"); bm = bmesh.new()
    def ring(rho, side):
        hh = half_thick * max(0.0, 1 - rho ** n_exp) ** (1 / n_exp)
        return [bm.verts.new((rho * x, side * hh, rho * z)) for (x, z) in outline]
    rhos = [math.sin(math.pi / 2 * k / rings) for k in range(1, rings + 1)]   # denser towards the rim
    front_c = bm.verts.new((0.0, -half_thick, 0.0)); back_c = bm.verts.new((0.0, half_thick, 0.0))
    front = [ring(r, -1) for r in rhos[:-1]]
    rim = ring(1.0, 0)
    back = [ring(r, 1) for r in rhos[:-1]]
    def fan(c, rg, flip):
        for i in range(M):
            vs = (c, rg[i], rg[(i + 1) % M])
            bm.faces.new(vs[::-1] if flip else vs)
    def band(a, b, flip):
        for i in range(M):
            vs = (a[i], a[(i + 1) % M], b[(i + 1) % M], b[i])
            bm.faces.new(vs[::-1] if flip else vs)
    fan(front_c, front[0], False)
    for k in range(len(front) - 1): band(front[k], front[k + 1], False)
    band(front[-1], rim, False); band(rim, back[-1], False)
    for k in range(len(back) - 1, 0, -1): band(back[k], back[k - 1], False)
    fan(back_c, back[0], True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    body = bpy.data.objects.new(P + name, me); sc.collection.objects.link(body)
    r = body.modifiers.new("Remesh", "REMESH"); r.mode = "VOXEL"; r.voxel_size = 0.0006; r.adaptivity = 0.0
    sm = body.modifiers.new("Smooth", "SMOOTH"); sm.factor = 0.5; sm.iterations = 4
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(body.evaluated_get(dg), depsgraph=dg)
    body.modifiers.clear(); old = body.data; body.data = me2; bpy.data.meshes.remove(old)
    me2.name = P + name + "_Mesh"; me2.shade_smooth()
    sc.collection.objects.unlink(body)
    return body, Matrix.Identity(4)

def tree_of(body):
    return BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices], [tuple(p.vertices) for p in body.data.polygons])

def front_hit(tree, x, z):
    loc, nor, _, _ = tree.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return loc, nor.normalized()

def top_z(tree, x, y):
    loc, *_ = tree.ray_cast(Vector((x, y, 1.0)), Vector((0, 0, -1)))
    return loc.z if loc else None

def facing(normal, up=Vector((0, 0, 1))):
    """Rotation whose -Y axis points along the surface normal (out of the face), +Z roughly up."""
    return normal.to_track_quat("-Y", "Z").to_euler()

# ---------- Small parts ----------
def link(obj, c, parent=None):
    c.objects.link(obj)
    if parent: obj.parent = parent; obj.matrix_parent_inverse = Matrix.Identity(4)
    return obj

def mesh(name, verts, faces, c, mat, parent=None, smooth=True):
    me = bpy.data.meshes.new(P + name); me.from_pydata(verts, [], faces); me.update()
    if smooth: me.shade_smooth()
    o = bpy.data.objects.new(P + name, me); link(o, c, parent)
    if mat: me.materials.append(mat)
    return o

def sphere(name, r, c, mat, parent=None, scale=(1, 1, 1), seg=40, rings=20):
    import bmesh
    me = bpy.data.meshes.new(P + name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    bm.to_mesh(me); bm.free(); me.shade_smooth()
    o = bpy.data.objects.new(P + name, me); link(o, c, parent)
    if mat: me.materials.append(mat)
    sub = o.modifiers.new("Sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
    return o

def torus(name, R, r, c, mat, parent=None, arc=(0.0, 2 * math.pi), nu=64, nv=16, closed=True):
    verts, faces = [], []
    a0, a1 = arc
    nu_eff = nu if closed else nu + 1
    for i in range(nu_eff):
        a = a0 + (a1 - a0) * i / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            verts.append(((R + r * math.cos(b)) * math.cos(a), r * math.sin(b), (R + r * math.cos(b)) * math.sin(a)))
    rng = nu if closed else nu
    for i in range(rng):
        i2 = (i + 1) % nu_eff if closed else i + 1
        for j in range(nv):
            faces.append((i * nv + j, i2 * nv + j, i2 * nv + (j + 1) % nv, i * nv + (j + 1) % nv))
    return mesh(name, verts, faces, c, mat, parent)

def curve(name, pts, c, mat, radius, parent=None, cyclic=False):
    cu = bpy.data.curves.new(P + name, "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = radius; cu.bevel_resolution = 6; cu.resolution_u = 16; cu.use_fill_caps = True
    sp = cu.splines.new("NURBS"); sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts): p.co = (*co, 1.0)
    sp.use_endpoint_u = True; sp.order_u = min(4, len(pts)); sp.use_cyclic_u = cyclic
    o = bpy.data.objects.new(P + name, cu); link(o, c, parent); cu.materials.append(mat)
    return o

def ellipsoid_cap(name, rx, ry, rz, zcut, c, mat, parent=None, seg=64, rings=28):
    verts, faces, rows = [], [], []
    tmin = math.asin(max(-1.0, min(1.0, zcut)))
    top = None
    for i in range(rings + 1):
        t = tmin + (math.pi / 2 - tmin) * i / rings
        row = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            if i == rings:
                if top is None: verts.append((0.0, 0.0, rz)); top = len(verts) - 1
                row.append(top); continue
            verts.append((rx * math.cos(t) * math.cos(a), ry * math.cos(t) * math.sin(a), rz * math.sin(t)))
            row.append(len(verts) - 1)
        rows.append(row)
    for i in range(rings):
        for j in range(seg):
            a, b = rows[i][j], rows[i][(j + 1) % seg]
            cc, d = rows[i + 1][(j + 1) % seg], rows[i + 1][j]
            faces.append((a, b, d) if i == rings - 1 else (a, b, cc, d))
    o = mesh(name, verts, faces, c, mat, parent)
    return o

def solid(o, thick, levels=2):
    s = o.modifiers.new("Solid", "SOLIDIFY"); s.thickness = thick; s.offset = 0.0; s.use_even_offset = True
    sub = o.modifiers.new("Sub", "SUBSURF"); sub.levels = 1; sub.render_levels = levels

def anchor(name, c, loc, rot, parent=None):
    e = bpy.data.objects.new(P + name, None); link(e, c, parent)
    e.location = loc; e.rotation_euler = rot
    return e

# ---------- Fur ----------
def add_fur(bot, body, c, M):
    fur = fur_material(bot)
    under, ub = principled(f"MAT_Under_{bot}", (0.5, 0.5, 0.5), 1.0, spec=0.0)
    UNDER[bot] = ub
    body.data.materials.append(under); body.data.materials.append(fur)
    vg = body.vertex_groups.new(name="T2_FurDensity")
    vg.add(list(range(len(body.data.vertices))), 1.0, "REPLACE")
    mod = body.modifiers.new("Fur", "PARTICLE_SYSTEM")
    psys = body.particle_systems[-1]; ps = psys.settings; ps.name = P + f"PS_Fur_{bot}"
    ps.type = "HAIR"; ps.count = 12000; ps.hair_length = PILE; ps.hair_step = 4
    ps.emit_from = "FACE"; ps.distribution = "RAND"; ps.use_even_distribution = True
    ps.child_type = "INTERPOLATED"; ps.child_percent = 4; ps.rendered_child_count = 55
    ps.render_type = "PATH"; ps.display_step = 2; ps.render_step = 3
    ps.material_slot = fur.name
    ps.radius_scale = 0.00013; ps.root_radius = 1.0; ps.tip_radius = 0.35; ps.use_close_tip = True   # a more opaque pile surface
    ps.clump_factor = 0.0; ps.roughness_1 = 0.0005; ps.roughness_1_size = 1.0
    ps.roughness_2 = 0.0011; ps.roughness_endpoint = 0.0003   # splayed strands: no dark spot where we look down them
    psys.vertex_group_density = vg.name; psys.vertex_group_length = vg.name
    psys.seed = 3
    return vg

def clear_fur_near(body, vg, objs, near=0.0005, far=0.0032):
    """Accessories sit ON the plush: fur goes to zero right under/around them and fades back over `far`."""
    dg = bpy.context.evaluated_depsgraph_get()
    inv = body.matrix_world.inverted()
    vs, fs = [], []
    for o in objs:
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        m = inv @ ev.matrix_world; base = len(vs)
        vs += [m @ v.co for v in me.vertices]
        fs += [tuple(base + i for i in p.vertices) for p in me.polygons]
        ev.to_mesh_clear()
    if not fs: return
    t = BVHTree.FromPolygons(vs, fs)
    n = 0
    for v in body.data.vertices:
        hit = t.find_nearest(v.co, far + 0.004)
        if hit[0] is None: continue
        k = max(0.0, min(1.0, (hit[3] - near) / (far - near)))
        w = vg.weight(v.index)
        if k < w: vg.add([v.index], k, "REPLACE"); n += 1
    print("CLEARED", body.name, len(objs), "parts,", n, "verts")


def cowboy_hat(c, parent, M):
    """Soft matte felt cowboy hat: a pinched crown with the centre dent, a wide brim curled up at the sides, a band."""
    rx, ry, rz = 0.0175, 0.0200, 0.0168
    crown = ellipsoid_cap("pm_Hat_Crown", rx, ry, rz, -0.04, c, M["felt_caramel"], parent, seg=72, rings=32)
    for v in crown.data.vertices:
        x, y, z = v.co
        h = max(0.0, z / rz)
        v.co.z = z - 0.0055 * math.exp(-(x / 0.0055) ** 2) * h ** 2          # the crease along the top
        if y < 0:                                                           # the two front pinches
            v.co.x = x * (1 - 0.30 * h ** 1.5 * min(1.0, -y / ry) ** 1.2)
        v.co.y = y * (1 - 0.06 * h)                                         # a slightly tapered crown
    crown.data.update(); solid(crown, 0.0014)
    vs, fs = [], []
    nu, nv = 96, 10
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for j in range(nv + 1):
            t = j / nv
            ox, oy = rx - 0.0010 + 0.0205 * t, ry - 0.0010 + 0.0150 * t
            x, y = ox * math.cos(a), oy * math.sin(a)
            side = abs(math.cos(a))
            z = -0.0004 + 0.0095 * (side ** 3) * (t ** 2) - 0.0020 * (math.sin(a) ** 2) * t   # sides curl up, front/back dip
            vs.append((x, y, z))
    for i in range(nu):
        for j in range(nv):
            a0, b0 = i * (nv + 1) + j, ((i + 1) % nu) * (nv + 1) + j
            fs.append((a0, b0, b0 + 1, a0 + 1))
    brim = mesh("pm_Hat_Brim", vs, fs, c, M["felt_caramel"], parent); solid(brim, 0.0019)
    bs, bf = [], []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for zz in (0.0004, 0.0042):
            bs.append(((rx + 0.0007) * math.cos(a), (ry * (1 - 0.06 * zz / rz) + 0.0007) * math.sin(a), zz))
    for i in range(nu):
        a0, b0 = i * 2, ((i + 1) % nu) * 2
        bf.append((a0, b0, b0 + 1, a0 + 1))
    band = mesh("pm_Hat_Band", bs, bf, c, M["felt_brown"], parent); solid(band, 0.0008, levels=1)
    return [crown, brim, band]


def pm_tail(n=12):
    """One clean soft wedge: overlapping balls along a single gentle curve (out of the body's lower left, down
    and outward), tapering smoothly from wide at the join to a small rounded tip. Dense spacing = no lumps."""
    p0, cp, p2 = Vector((-1.25, 0, -0.95)), Vector((-1.85, 0, -2.25)), Vector((-2.70, 0, -2.55))
    els = []
    for i in range(n):
        u = i / (n - 1)
        pt = (1 - u) ** 2 * p0 + 2 * (1 - u) * u * cp + u ** 2 * p2
        r = 0.40 + (1.20 - 0.40) * (1 - u) ** 1.25
        els.append(("ELLIPSOID", tuple(pt), r, (1.0, 0.66, 1.0), (0, 0, 0)))
    return els

# ---------- The five ----------
def build(bot, M, offset=Vector((0, 0, 0))):
    c = coll(P + f"Bot_{bot}")
    root = anchor(f"EMPTY_{bot}", c, offset, (0, 0, 0))
    parts = []          # accessories that clear the fur under them
    face = []           # eyes: only a narrow clearing, so they sit in the pile

    if bot == "pm":
        # A plush rounded rectangle: a puffy pillow box, slightly wider than tall, generous corners.
        body, N = pillow_form("pm_Body", outline_rounded_rect(0.078, 0.064, 0.021), 0.0205)
    elif bot == "builder":
        # Our rounded block (a squircle), pillow-bulged.
        body, N = meta_form("builder_Body", [
            ("CUBE", (0, 0, 0), 2.1, (1.30, 0.46, 1.0), (0, 0, 0)),
            ("ELLIPSOID", (0, 0, 0), 2.3, (1.25, 0.70, 1.1), (0, 0, 0)),     # pillow bulge
        ])
    elif bot == "designer":
        # A soft five-petal flower: fat round petals around a plump centre.
        els = [("ELLIPSOID", (0, 0, 0), 2.15, (1.0, 0.55, 1.0), (0, 0, 0))]
        for k in range(5):
            a = math.radians(90 + 72 * k)
            els.append(("ELLIPSOID", (2.0 * math.cos(a), 0, 2.0 * math.sin(a)), 1.62, (1.0, 0.5, 1.0), (0, 0, 0)))
        body, N = meta_form("designer_Body", els)
    elif bot == "checker":
        # A round pebble/egg, wider at the bottom.
        body, N = meta_form("checker_Body", [
            ("ELLIPSOID", (0, 0, -0.55), 2.2, (1.12, 0.72, 0.92), (0, 0, 0)),
            ("ELLIPSOID", (0, 0, 0.65), 1.75, (0.98, 0.66, 0.95), (0, 0, 0)),
        ])
    elif bot == "fixer":
        # A soft rounded plus sign: two puffy capsules crossing.
        body, N = meta_form("fixer_Body", [
            ("CUBE", (0, 0, 0), 0.95, (2.10, 0.40, 0.34), (0, 0, 0)),      # broad, gently curved arm fronts (no ridge)
            ("CUBE", (0, 0, 0), 0.95, (0.34, 0.40, 2.10), (0, 0, 0)),
            ("ELLIPSOID", (0, 0, 0), 0.85, (1.0, 0.85, 1.0), (0, 0, 0)),       # a little stuffing in the middle
        ])
    link(body, c, root)
    tree = tree_of(body)
    vg = add_fur(bot, body, c, M)

    def bead(name, x, z, r=0.0024):
        loc, nor = front_hit(tree, x, z)
        o = sphere(name, r, c, M["bead"], root); o.location = loc + nor * (r * 0.55)
        face.append(o); return o

    if bot == "pm":
        # Sweet open eyes, sparkling and set into the plush: softly oval glossy black-brown beads,
        # a clear highlight at the upper left and a smaller one at the lower right, each in a gentle socket.
        RX, RY, RZ = 0.0045, 0.0026, 0.00575      # 9 x 11.5 mm tall soft ovals, about 8 x 10.5 mm showing above the pile
        sockets = []
        for side, sx in (("L", -1), ("R", 1)):
            loc, nor = front_hit(tree, sx * 0.0130, -0.0030)
            e = sphere(f"pm_Eye_{side}", 1.0, c, M["eye_gloss"], root, scale=(RX, RY, RZ))
            e.location = loc + nor * 0.0008                     # its front just clears the pile tips; the rest sits in
            # The pile parts snugly round each eye: clear it against a slightly smaller hidden stand-in.
            proxy = sphere(f"pm_Eye_{side}_ClearProxy", 1.0, c, None, root, scale=(RX, RY, RZ))
            proxy.location = e.location; proxy.hide_render = True; face.append(proxy)   # render-hidden only, so it's evaluated in place
            for nm, d, rr in (("Highlight", (-0.40, -0.80, 0.46), 0.00158), ("Highlight2", (0.42, -0.86, -0.32), 0.00062)):
                dv = Vector(d).normalized()
                k = 1.0 / math.sqrt((dv.x / RX) ** 2 + (dv.y / RY) ** 2 + (dv.z / RZ) ** 2)   # onto the eye's surface
                hl = sphere(f"pm_Eye_{side}_{nm}", rr, c, M["highlight"], e, scale=(1.0, 0.45, 1.0))
                hl.location = dv * k * 0.97
            # A plush lid behind the eye: hidden while it's open (only a soft fuzzy rim shows round it), it's what you
            # see when the eye closes in the blink, so the closed eye is a soft dark line on yellow plush, not a bare socket.
            if side == "L":                                    # the lid reads as the coat: its rendered colour as plush velvet
                lm, lb = principled("MAT_Lid_pm", (s2l(194), s2l(146), s2l(4)), 1.0, spec=0.02, sheen=0.22,
                                    sheen_tint=(1.0, 0.72, 0.15), sheen_rough=0.55)
                add_grain(lm, lb, scale=3200.0, strength=0.25)
            lid = sphere(f"pm_Eye_{side}_Lid", 1.0, c, lm, root, scale=(RX * 1.10, RY * 0.70, RZ * 1.08))
            lid.location = e.location
            lid.data.materials.append(body.data.materials[1])
            lvg = lid.vertex_groups.new(name="T2_LidFur")
            for v in lid.data.vertices:
                q = Vector((v.co.x / RX, v.co.y / RY, v.co.z / RZ)).length
                lvg.add([v.index], max(0.0, min(1.0, (q - 1.0) / 0.12)), "REPLACE")
            lps = body.particle_systems[0].settings.copy(); lps.name = P + f"PS_Lid_{side}"
            lps.count = 220; lps.hair_length = 0.0011; lps.rendered_child_count = 30
            lid.modifiers.new("LidFur", "PARTICLE_SYSTEM")
            lid.particle_systems[-1].settings = lps
            lid.particle_systems[-1].vertex_group_density = lvg.name; lid.particle_systems[-1].vertex_group_length = lvg.name
            lid.modifiers.move(lid.modifiers.find("LidFur"), 0)
            sockets.append(loc)
        # Gentle sockets: dent the body 0.5 mm under each eye, fading out 2.2 mm beyond it, so the pile dips in.
        for v in body.data.vertices:
            if v.co.y > 0: continue
            for l in sockets:
                rr2 = ((v.co.x - l.x) / (RX + 0.0022)) ** 2 + ((v.co.z - l.z) / (RZ + 0.0022)) ** 2
                if rr2 < 1.0:
                    v.co -= v.normal * 0.0005 * (1.0 - rr2) ** 2
        body.data.update()
        zt = top_z(tree, 0.0035, 0.0)
        h = anchor("pm_Hat", c, (0.0030, 0.0008, zt - 0.0005), (math.radians(-5), math.radians(8), 0), root)
        h.scale = (1.14, 1.14, 1.14)
        parts += cowboy_hat(c, h, M)
    elif bot == "builder":
        eyes = []
        for side, sx in (("L", -1), ("R", 1)):
            x, z = sx * 0.0128, 0.0045
            bead(f"builder_Eye_{side}", x, z)
            loc, nor = front_hit(tree, x, z)
            g = anchor(f"builder_Glasses_{side}", c, loc + nor * 0.0028, facing(nor), root)
            fr = torus(f"builder_Glasses_Frame_{side}", 0.0069, 0.00155, c, M["rubber"], g)
            sub = fr.modifiers.new("Sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
            parts.append(fr); eyes.append((loc, nor, g))
        # Chunky bridge and arms, matte rubber.
        (lL, nL, gL), (lR, nR, gR) = eyes
        bl = lL + nL * 0.0028 + Vector((0.0069, 0, 0.0012)); br = lR + nR * 0.0028 + Vector((-0.0069, 0, 0.0012))
        mid = (bl + br) / 2 + Vector((0, -0.0006, 0.0018))
        parts.append(curve("builder_Glasses_Bridge", [tuple(bl), tuple(mid), tuple(br)], c, M["rubber"], 0.0012, root))
        for (l, nn, g), sx in ((eyes[0], -1), (eyes[1], 1)):
            p0 = l + nn * 0.0028 + Vector((sx * 0.0069, 0, 0.0005))
            p1 = p0 + Vector((sx * 0.006, 0.006, 0.0)); p2 = p0 + Vector((sx * 0.009, 0.018, -0.0005))
            parts.append(curve(f"builder_Glasses_Arm_{sx}", [tuple(p0), tuple(p1), tuple(p2)], c, M["rubber"], 0.0011, root))
        # A matte yellow felt hard hat, sitting on top.
        zt = top_z(tree, 0, 0)
        rx, ry = 0.0272, 0.0218
        zr = zt - 0.0010            # on the pile on top of the block, its brim clear of the fur
        rz = 0.0185
        h = anchor("builder_Hat", c, (0, 0.0005, zr), (math.radians(-3), 0, 0), root)
        crown = ellipsoid_cap("builder_Hat_Crown", rx, ry, rz, -0.05, c, M["felt_yellow"], h); solid(crown, 0.0016)
        vs, fs = [], []
        nu, nv = 72, 6
        for i in range(nu):
            a = 2 * math.pi * i / nu
            for j in range(nv + 1):
                t = j / nv
                front = max(0.0, -math.sin(a))
                w = 0.0035 + 0.0050 * front          # a short lip all round, longer at the front
                vs.append(((rx - 0.0008 + w * t) * math.cos(a), (ry - 0.0008 + w * t) * math.sin(a), -0.0005 - 0.0018 * t * t))
        for i in range(nu):
            for j in range(nv):
                a0, b0 = i * (nv + 1) + j, ((i + 1) % nu) * (nv + 1) + j
                fs.append((a0, b0, b0 + 1, a0 + 1))
        brim = mesh("builder_Hat_Brim", vs, fs, c, M["felt_yellow"], h); solid(brim, 0.0022)
        ridge_pts = [(0.0, -ry * math.cos(math.radians(d)), rz * math.sin(math.radians(d)) + 0.0005) for d in (5, 30, 60, 90, 120, 150, 175)]
        curve("builder_Hat_Ridge", ridge_pts, c, M["felt_yellow"], 0.0017, h)
        parts += [crown, brim]
    elif bot == "designer":
        for side, sx in (("L", -1), ("R", 1)):
            bead(f"designer_Eye_{side}", sx * 0.0105, 0.0010)
        zt = top_z(tree, 0, 0)
        b = anchor("designer_Beret", c, (0.0035, 0.0005, zt - 0.0082), (math.radians(4), math.radians(18), 0), root)
        beret = ellipsoid_cap("designer_Beret_Cap", 0.0215, 0.0205, 0.0098, -0.45, c, M["felt_black"], b); solid(beret, 0.0014)
        band = torus("designer_Beret_Band", 0.0168, 0.0015, c, M["felt_black"], b)
        band.rotation_euler = (math.radians(90), 0, 0); band.location = (0, 0, -0.0040)
        pom = sphere("designer_Beret_Pom", 0.0042, c, M["felt_black"], b); pom.location = (0, 0, 0.0098 + 0.0036)
        # The pom-pom gets its own little black pile.
        pf = principled("MAT_Pom_Core", (0.01, 0.01, 0.011), 1.0, spec=0.0)[0]
        pom.data.materials.clear()
        pom.data.materials.append(pf)
        pfur = bpy.data.materials.new(P + "MAT_Pom_Hair"); pfur.use_nodes = True
        pn = pfur.node_tree
        for n in list(pn.nodes):
            if n.type != "OUTPUT_MATERIAL": pn.nodes.remove(n)
        ph = pn.nodes.new("ShaderNodeBsdfHairPrincipled"); ph.model = "CHIANG"; ph.parametrization = "COLOR"
        ph.inputs["Color"].default_value = (0.010, 0.010, 0.011, 1); ph.inputs["Roughness"].default_value = 0.9; ph.inputs["Radial Roughness"].default_value = 1.0; ph.inputs["Coat"].default_value = 0.0
        pn.links.new(ph.outputs[0], next(n for n in pn.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
        pom.data.materials.append(pfur)
        pm_ = pom.modifiers.new("PomFur", "PARTICLE_SYSTEM"); pps = pom.particle_systems[-1].settings; pps.name = P + "PS_Pom"
        pps.type = "HAIR"; pps.count = 2200; pps.hair_length = 0.0044; pps.child_type = "INTERPOLATED"; pps.rendered_child_count = 40
        pps.radius_scale = 0.00010; pps.tip_radius = 0.3; pps.use_close_tip = True; pps.material_slot = pfur.name
        pps.roughness_1 = 0.0007; pps.roughness_2 = 0.0016; pps.roughness_endpoint = 0.0010   # a frizzy, fuzzy ball
        pom.modifiers.move(pom.modifiers.find("PomFur"), 0)
        parts += [beret, band]
    elif bot == "checker":
        # Big round white eyes, pupils glancing to one side: inspecting.
        for side, sx in (("L", -1), ("R", 1)):
            loc, nor = front_hit(tree, sx * 0.0112, 0.0070)
            e = anchor(f"checker_Eye_{side}", c, loc + nor * 0.0016, facing(nor), root)
            w = sphere(f"checker_Eye_{side}_White", 0.0068, c, M["eye_white"], e, scale=(1.0, 0.5, 1.0))
            p = sphere(f"checker_Eye_{side}_Pupil", 0.0030, c, M["bead"], e, scale=(1.0, 0.55, 1.0))
            p.location = (0.0031, -0.0026, -0.0004)
            face.append(w)
    elif bot == "fixer":
        for side, sx in (("L", -1), ("R", 1)):
            bead(f"fixer_Eye_{side}", sx * 0.0085, 0.0040)
        # A small beige fabric plaster across the right arm, conforming to the plush.
        loc, nor = front_hit(tree, 0.0262, -0.0010)
        a = anchor("fixer_Plaster", c, loc + nor * 0.0008, facing(nor), root)
        a.rotation_euler.rotate_axis("Y", math.radians(-28))
        def rrect(w, hgt, r, n=6):
            pts = []
            for cx, cz, a0 in ((w / 2 - r, hgt / 2 - r, 0), (-w / 2 + r, hgt / 2 - r, 90), (-w / 2 + r, -hgt / 2 + r, 180), (w / 2 - r, -hgt / 2 + r, 270)):
                for k in range(n + 1):
                    an = math.radians(a0 + 90 * k / n); pts.append((cx + r * math.cos(an), 0.0, cz + r * math.sin(an)))
            return pts
        def patch(name, w, hgt, r, mat, lift):
            ring = rrect(w, hgt, r)
            vs = [(0.0, 0.0, 0.0)] + ring
            fs = [(0, i + 1, (i + 1) % len(ring) + 1) for i in range(len(ring))]
            o = mesh(name, vs, fs, c, mat, a)
            sub = o.modifiers.new("Sub", "SUBSURF"); sub.levels = sub.render_levels = 3; sub.subdivision_type = "SIMPLE"
            sw = o.modifiers.new("Wrap", "SHRINKWRAP"); sw.target = body; sw.wrap_method = "PROJECT"
            sw.use_project_y = True; sw.use_negative_direction = True; sw.use_positive_direction = True; sw.offset = lift
            so = o.modifiers.new("Solid", "SOLIDIFY"); so.thickness = 0.0007; so.offset = 1.0
            sm = o.modifiers.new("Soft", "SUBSURF"); sm.levels = sm.render_levels = 1
            return o
        strip = patch("fixer_Plaster_Strip", 0.0215, 0.0085, 0.0032, M["plaster"], 0.0006)
        patch("fixer_Plaster_Pad", 0.0078, 0.0058, 0.0016, M["pad"], 0.0012)
        parts.append(strip)

    clear_fur_near(body, vg, parts, near=0.0004, far=0.0028)
    clear_fur_near(body, vg, face, near=(0.0002 if bot == "pm" else 0.0001), far=(0.0016 if bot == "pm" else 0.0014))   # the PM's pile tapers into its eye sockets
    return c, body

# ---------- Studio: soft, matte light, no hot specular ----------
def studio(bot=None):
    w = bpy.data.worlds.new(P + "World"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.62, 0.62, 0.64, 1); bg.inputs["Strength"].default_value = 0.45
    def area(name, loc, size, energy, color=(1, 1, 1)):
        ld = bpy.data.lights.new(P + name, "AREA"); ld.shape = "DISK"; ld.size = size; ld.energy = energy; ld.color = color
        lo = bpy.data.objects.new(P + name, ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        ld.cycles.max_bounces = 8
        return lo
    area("LGT_Key", (-0.42, -0.62, 0.50), 1.1, 42.0, (1.0, 0.985, 0.96))
    area("LGT_Fill", (0.62, -0.48, 0.12), 1.2, 14.0, (0.96, 0.98, 1.0))
    area("LGT_Rim", (0.10, 0.55, 0.42), 0.7, 26.0)
    area("LGT_Under", (0.0, -0.4, -0.45), 1.0, 4.0)
    area("LGT_CamFill", (0.0, -0.95, 0.10), 0.9, CAMFILL.get(bot, 9.0))   # lights the pile where we look down it
    cd = bpy.data.cameras.new(P + "CAM"); cd.lens = 85; cd.sensor_width = 36
    cam = bpy.data.objects.new(P + "CAM_Team", cd); sc.collection.objects.link(cam)
    cam.location = (0.0, -0.31, 0.034)
    cam.rotation_euler = (Vector((0, 0, 0.002)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam

def render_settings(device="GPU"):
    if device == "GPU":
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"; prefs.get_devices()
        for d in prefs.devices: d.use = True
    sc.render.engine = "CYCLES"
    c = sc.cycles; c.device = device
    c.use_adaptive_sampling = True; c.adaptive_threshold = 0.006; c.adaptive_min_samples = 64
    c.sample_clamp_direct = 4.0; c.sample_clamp_indirect = float(os.environ.get("CLAMP_IND", "6"))
    c.glossy_bounces = 8; c.transmission_bounces = 12; c.diffuse_bounces = 4
    c.caustics_reflective = c.caustics_refractive = False; c.blur_glossy = 1.0
    c.max_bounces = 16; c.transparent_max_bounces = 16
    c.use_denoising = True; c.denoiser = "OPENIMAGEDENOISE"; c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
    c.seed = 11
    sc.cycles_curves.shape = "THICK"; sc.cycles_curves.subdivisions = 2
    sc.view_settings.view_transform = "Khronos PBR Neutral"; sc.view_settings.look = "None"; sc.view_settings.exposure = -0.8
    r = sc.render; r.film_transparent = True
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"; r.image_settings.color_depth = "16"

def load_colors():
    p = os.path.join(HERE, "colors.json")
    return json.load(open(p)) if os.path.exists(p) else {}

def initial(bot):
    return [s2l(v) * 0.85 for v in TARGET[bot]]

def measure(png, bot):
    img = bpy.data.images.load(png); w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    rgb = np.clip(px[:, :3], 0, 1)
    if img.is_float: rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
    al = px[:, 3]
    mx, mn = rgb.max(1), rgb.min(1); d = np.maximum(mx - mn, 1e-6)
    r_, g_, b_ = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    hue = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4)) * 60
    import colorsys
    th = colorsys.rgb_to_hsv(*[v / 255 for v in TARGET[bot]])[0] * 360
    dh = np.abs((hue - th + 180) % 360 - 180)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    sel = None
    for win in (20, 32, 48):
        m = (al > 0.99) & (sat > 0.3) & (mx > 0.25) & (dh < win)
        if m.sum() > 400: sel = rgb[m]; break
    bpy.data.images.remove(img)
    if sel is None: return None, 0
    return tuple(int(round(v * 255)) for v in np.median(sel, axis=0)), int(len(sel))

def render_still(path, res, samples):
    r = sc.render; r.resolution_x = r.resolution_y = res; r.resolution_percentage = 100
    sc.cycles.samples = samples; r.filepath = path
    bpy.ops.render.render(write_still=True)

M = materials()
studio(args[1] if mode in ("still", "calibrate", "loop") else None)

if mode == "save":
    colors = load_colors()
    for i, bot in enumerate(ORDER):
        build(bot, M, Vector(((i - 2) * 0.11, 0, 0)))
        set_coat(bot, colors.get(bot) or initial(bot))
    render_settings("GPU")
    bpy.ops.wm.save_as_mainfile(filepath=args[1], copy=True)
    print("SAVED", args[1])
elif mode == "calibrate":
    bot, out = args[1], args[2]; os.makedirs(out, exist_ok=True)
    build(bot, M); render_settings("GPU")
    colors = load_colors()
    lin = colors.get(bot) or initial(bot)
    tl = [s2l(v) for v in TARGET[bot]]; tgt = TARGET[bot]
    prev, best = None, (1e9, list(lin))
    for it in range(9):
        set_coat(bot, lin)
        path = os.path.join(out, f"{bot}_it{it}.png"); render_still(path, 192, 48)
        med, n = measure(path, bot)
        if med is None:
            print(f"CAL {bot} it={it} lost the coat; backing off", flush=True)
            lin = [math.exp((math.log(a) + math.log(b)) / 2) for a, b in zip(prev[0], lin)] if prev else [v * 0.8 for v in lin]
            continue
        err = max(abs(a - b) for i, (a, b) in enumerate(zip(med, tgt)) if not (lin[i] <= 1.2e-4 and a > b))
        print(f"CAL {bot} it={it} lin={[round(v, 5) for v in lin]} median={med} n={n} target={tgt} err={err}", flush=True)
        if err < best[0]: best = (err, list(lin))
        cs = load_colors(); cs[bot] = [round(v, 5) for v in best[1]]; json.dump(cs, open(os.path.join(HERE, "colors.json"), "w"), indent=1)
        if err <= 3: break
        ml = [max(s2l(v), 1e-4) for v in med]
        new = []
        for ch in range(3):
            x1, y1, ys = math.log(lin[ch]), math.log(ml[ch]), math.log(tl[ch])
            slope = 1.0
            if prev is not None:
                x0, y0 = math.log(prev[0][ch]), math.log(prev[1][ch])
                if abs(x1 - x0) > 1e-4 and (y1 - y0) / (x1 - x0) > 0: slope = max(0.15, min(3.0, (y1 - y0) / (x1 - x0)))
            step = max(-math.log(2.0), min(math.log(2.0), (ys - y1) / slope))
            new.append(min(1.0, max(1e-4, math.exp(x1 + step))))
        prev = (list(lin), ml); lin = new
    print("FINAL", bot, [round(v, 5) for v in best[1]], "err", best[0])
elif mode == "loop":
    # The Builder's login-page loops, seamless at 24 fps: idle (60 frames: breathe, the hat a beat behind, one
    # blink) and work (48 frames: one happy hop, the hat lagging). Every frame is keyed from periodic functions,
    # so frame 1 equals the frame after the last. Transparent RGBA PNGs; resumable (finished frames are skipped).
    bot, out, res, samples, kind = args[1], args[2], int(args[3]), int(args[4]), args[5]
    assert (bot, kind) in (("builder", "idle"), ("builder", "work"), ("pm", "blink"))
    os.makedirs(out, exist_ok=True)
    c, body = build(bot, M); render_settings("GPU")
    set_coat(bot, load_colors()[bot])
    root = bpy.data.objects[P + f"EMPTY_{bot}"]
    hat = bpy.data.objects[P + f"{bot}_Hat"]
    eyes = [bpy.data.objects[P + f"{bot}_Eye_{sd}"] for sd in ("L", "R")]
    eye_loc = [e.location.copy() for e in eyes]
    hat_scale = hat.scale.copy()
    zmin = min(v.co.z for v in body.data.vertices)          # the bottom stays on the ground while it squashes
    hat_loc, hat_rot = hat.location.copy(), hat.rotation_euler.copy()
    N = {"idle": 60, "work": 48, "blink": 48}[kind]
    HL_SCALE = {}
    # The PM's blink: closes smoothly over 4 frames (30-33), reopens over 3 (34-36).
    CLOSE = {30: 0.30, 31: 0.65, 32: 0.92, 33: 1.0, 34: 0.70, 35: 0.35, 36: 0.10}

    def bump(t, a, pk, b):
        if t <= a or t >= b: return 0.0
        u = (t - a) / (pk - a) if t <= pk else (b - t) / (b - pk)
        return 0.5 - 0.5 * math.cos(math.pi * u)

    def pose(t):
        """(lift above the ground, vertical scale) at frame offset t (periodic in N)."""
        t = t % N
        if kind == "idle":
            return 0.0, 1.0 + 0.016 * math.sin(2 * math.pi * t / N)
        if kind == "blink":                                     # a subtle breathe, a tiny squash with the blink
            return 0.0, 1.0 + 0.012 * math.sin(2 * math.pi * t / N) - 0.005 * CLOSE.get(t + 1, 0.0)
        air = 0.008 * (1 - ((t - 20) / 10) ** 2) if 10 <= t <= 30 else 0.0
        sz = (1 - 0.10 * bump(t, 0, 7, 11) + 0.07 * bump(t, 9, 12, 16) - 0.09 * bump(t, 29, 31, 36)
              + 0.03 * bump(t, 34, 38, 42) - 0.012 * bump(t, 41, 44, 47))
        return air, sz

    def top(t):
        air, sz = pose(t)
        return air + zmin * (1 - sz) + sz * hat_loc.z           # where the hat would sit, in world height

    for f in range(1, N + 1):
        t = f - 1
        air, sz = pose(t)
        sxy = 1 / math.sqrt(sz)                                  # volume-preserving squash and stretch
        root.scale = (sxy, sxy, sz); root.location = (0.0, 0.0, air + zmin * (1 - sz))
        root.keyframe_insert("scale", frame=f); root.keyframe_insert("location", frame=f)
        lag = max(-0.0005, min(0.0016, top(t - 2) - top(t)))    # the hat follows two frames behind, never into the head
        vel = top(t) - top(t - 1)
        hat.scale = (hat_scale.x / sxy, hat_scale.y / sxy, hat_scale.z / sz)   # felt hats don't squash with the body
        hat.location = (hat_loc.x, hat_loc.y, hat_loc.z + lag / sz)
        hat.rotation_euler = (hat_rot.x - 4.0 * vel, hat_rot.y, hat_rot.z)
        for k in ("scale", "location", "rotation_euler"): hat.keyframe_insert(k, frame=f)
        blink, widen, push = 1.0, 1.0, 0.0
        if kind == "idle":
            blink = {35: 0.55, 36: 0.12, 37: 0.12, 38: 0.12, 39: 0.55}.get(f, 1.0)
        elif kind == "blink":
            cl = CLOSE.get(f, 0.0)
            blink, widen, push = 1.0 - 0.90 * cl, 1.0 + 0.10 * cl, 0.00045 * cl   # to a soft line, a tiny cheek push
        for e, l0 in zip(eyes, eye_loc):
            e.scale = (widen, 1.0, blink); e.location = (l0.x, l0.y, l0.z + push)
            e.keyframe_insert("scale", frame=f); e.keyframe_insert("location", frame=f)
            for hl in [bpy.data.objects.get(e.name + n) for n in ("_Highlight", "_Highlight2")]:
                if hl:                                           # the highlights fade out as the lids close
                    s0 = HL_SCALE.setdefault(hl.name, hl.scale.copy())
                    k = max(0.0, 1.0 - 1.7 * (CLOSE.get(f, 0.0) if kind == "blink" else 0.0))
                    hl.scale = (s0.x * k, s0.y * k, s0.z * k); hl.keyframe_insert("scale", frame=f)
    for o in [root, hat] + eyes + [h for h in (bpy.data.objects.get(e.name + n) for e in eyes for n in ("_Highlight", "_Highlight2")) if h]:
        for fc in o.animation_data.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
    sc.frame_start, sc.frame_end, sc.render.fps = 1, N, 24
    r = sc.render; r.resolution_x = r.resolution_y = res; r.resolution_percentage = 100
    sc.cycles.samples = samples; sc.cycles.use_animated_seed = False
    r.use_persistent_data = True
    if os.environ.get("LOOP_TEST"):                   # check the motion: just these frames, as stills
        for f in [int(x) for x in os.environ["LOOP_TEST"].split(",")]:
            sc.frame_set(f); render_still(os.path.join(out, f"test_{f:04d}.png"), res, samples)
        print("DONE looptest", kind, out)
    else:
        r.use_overwrite, r.use_placeholder = False, True
        r.filepath = os.path.join(out, "frame_####")
        bpy.ops.render.render(animation=True)
        print("DONE loop", kind, out)
else:
    bot, out, res, samples = args[1], args[2], int(args[3]), int(args[4])
    os.makedirs(out, exist_ok=True)
    build(bot, M); render_settings("GPU")
    set_coat(bot, load_colors().get(bot) or initial(bot))
    path = os.path.join(out, f"{bot}.png"); render_still(path, res, samples)
    print("MEASURED", bot, measure(path, bot))
    print("DONE", bot, path)
