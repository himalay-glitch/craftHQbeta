# Builder "look v2": OpenDots-blue plush fur, clean (no static), our shape/helmet/glasses/eyes untouched.
# Runs headless on a COPY of design/blender/crafthq_bots_v001.blend:
#   Blender -b bots_copy.blend --python look_v2.py -- calibrate <out_dir>
#   Blender -b bots_copy.blend --python look_v2.py -- still <out_dir> <fur_r,g,b linear> <res> <samples> <frame>
#   Blender -b bots_copy.blend --python look_v2.py -- anim  <out_dir> <fur_r,g,b linear> <res> <samples> <f0> <f1>
import bpy, sys, os
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
mode, out_dir = args[0], args[1]
os.makedirs(out_dir, exist_ok=True)

# Measured from the OpenDots reference (sRGB): shadow p10, mid p50, highlight p90.
TARGET = {"p10": (30, 118, 222), "p50": (43, 136, 241), "p90": (66, 160, 251)}

sc = bpy.data.scenes["SC_BotAvatars"]
bpy.context.window.scene = sc
for name in ("03_Bot_Checker", "04_Bot_Asker"):          # all three robots share one spot: Builder alone
    bpy.data.collections[name].hide_render = True

# ---------- Fur coat ----------
ps = bpy.data.objects["SM_Builder_Body"].particle_systems[0].settings
ps.rendered_child_count = 60        # denser pile (was 40)
ps.radius_scale = 0.00016           # 0.2 mm strands, so fibres read as fibres (was 0.1 mm, sub-pixel haze)
ps.root_radius, ps.tip_radius = 1.0, 0.15
ps.use_close_tip = True
ps.clump_factor = 0.12              # gentle velvet tufting (was 0.08)
ps.clump_shape = 0.0
ps.use_clump_noise = False         # clump noise pulled long streaks out of the coat
ps.roughness_1 = 0.0002             # slight per-strand wander
ps.roughness_endpoint = 0.00025     # soft tips, not frizz (was 0.0001)

# The felt cheeks sit on the body under a 6.4 mm pile; the denser coat would bury them. Lift each patch
# straight out from the body centre so it sits in the fur surface, like felt sewn onto a plush.
from mathutils import Vector
BLUSH_LIFT = 0.0032
sc.frame_set(1)
_body = bpy.data.objects["SM_Builder_Body"]
_bc = sum((_body.matrix_world @ Vector(v) for v in _body.bound_box), Vector()) / 8
for _n in ("SM_Builder_Blush_L", "SM_Builder_Blush_R"):
    _o = bpy.data.objects[_n]
    _wc = sum((_o.matrix_world @ Vector(v) for v in _o.bound_box), Vector()) / 8
    _m = _o.matrix_world.copy()
    _m.translation += (_wc - _bc).normalized() * BLUSH_LIFT
    _o.matrix_world = _m

# Shorter, sparser fur right under the helmet rim: strands poking past the brim over the yellow plastic read
# as a teal fringe. Scale the existing density/length map down within ~5 mm of the rim.
from mathutils.bvhtree import BVHTree
_dg = bpy.context.evaluated_depsgraph_get()
_trees = []
for _n in ("SM_Builder_Helmet_Rim", "SM_Builder_Helmet_Shell", "SM_Builder_Helmet_Peak"):
    _ho = bpy.data.objects[_n].evaluated_get(_dg)
    _me = _ho.to_mesh(); _me.transform(_ho.matrix_world)
    _trees.append(BVHTree.FromPolygons([v.co.copy() for v in _me.vertices], [tuple(pl.vertices) for pl in _me.polygons]))
    _ho.to_mesh_clear()
_vg = _body.vertex_groups["VG_FurDensity"]
_mw = _body.matrix_world
_changed = 0
for _v in _body.data.vertices:
    _w = next((g.weight for g in _v.groups if g.group == _vg.index), None)
    if _w is None: continue
    _p = _mw @ _v.co
    _d = min((t.find_nearest(_p)[3] or 1.0) for t in _trees)
    if _d < 0.005:
        _k = 0.3 + 0.7 * max(_d - 0.001, 0.0) / 0.004
        _vg.add([_v.index], _w * _k, "REPLACE"); _changed += 1
print("UNDER_BRIM verts scaled:", _changed)

# No pink cheeks (user, 20 Nov): hide both felt blush patches.
for _n in ("SM_Builder_Blush_L", "SM_Builder_Blush_R"):
    bpy.data.objects[_n].hide_render = True

hair_mat = bpy.data.materials["MAT_Fur_Builder"]
nt = hair_mat.node_tree
hair = next(n for n in nt.nodes if n.type == "BSDF_HAIR_PRINCIPLED")
def sock(node, name):
    return next(i for i in node.inputs if i.name == name)
sock(hair, "Roughness").default_value = 0.5           # softer sheen, fewer glints (was 0.42)
sock(hair, "Radial Roughness").default_value = 0.8    # (was 0.65)
sock(hair, "Coat").default_value = 0.1                # (was 0.15)
sock(hair, "Reflection").default_value = 0.3          # less white sheen: keeps the blue saturated (was 1.0)
sock(hair, "Secondary Reflection").default_value = 0.6  # (was 1.0)
sock(hair, "Random Color").default_value = 0.06
sock(hair, "Random Roughness").default_value = 0.2
info = nt.nodes.new("ShaderNodeHairInfo"); info.location = (-700, 0)
ramp = nt.nodes.new("ShaderNodeMapRange"); ramp.location = (-500, 0)
ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = 0.0, 0.85
mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.location = (-300, 0)
nt.links.new(info.outputs["Intercept"], ramp.inputs["Value"])
nt.links.new(ramp.outputs["Result"], mix.inputs["Factor"])
nt.links.new(mix.outputs["Result"], sock(hair, "Color"))
under = next(n for n in bpy.data.materials["MAT_Body_Builder_Under"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")

def set_fur(lin):
    root = [v * 0.72 for v in lin]                     # darker roots give depth between fibres
    # Brighter tips catch the light; less red in them keeps highlights azure instead of periwinkle.
    tip = [min(lin[0] * 0.5, 1.0), min(lin[1] * 1.22, 1.0), min(lin[2] * 1.15, 1.0)]
    mix.inputs["A"].default_value = (*root, 1.0)
    mix.inputs["B"].default_value = (*tip, 1.0)
    # More saturated than the fur (little red), so the short face fur doesn't go pale/lavender under the front light.
    under.inputs["Base Color"].default_value = (lin[0] * 0.2, lin[1] * 0.7, lin[2] * 0.75, 1.0)

# ---------- Fur-only fill (light linking) ----------
# Our scene is lit moodier than the reference; a soft neutral front fill that ONLY reaches the body + fur
# lifts the coat to the reference brightness without touching the helmet, glasses, eyes or cheeks.
FUR_FILL = float(os.environ.get("FUR_FILL", "0"))
if FUR_FILL > 0:
    ld = bpy.data.lights.new("LGT_FurFill", "AREA"); ld.energy = FUR_FILL; ld.size = 0.6
    ld.color = (0.97, 0.98, 1.0)
    lo = bpy.data.objects.new("LGT_FurFill", ld); sc.collection.objects.link(lo)
    lo.location = (0.0, -0.55, 0.12)
    lo.rotation_euler = (Vector((0, 0, 0.0)) - lo.location).to_track_quat("-Z", "Y").to_euler()
    rc = bpy.data.collections.new("LL_FurOnly"); rc.objects.link(bpy.data.objects["SM_Builder_Body"])
    lo.light_linking.receiver_collection = rc
    print("FUR_FILL", FUR_FILL)

# ---------- Rim light: full on helmet/glasses/eyes, softer on the fur ----------
# At full strength the white rim clips the bright blue fur tips to cyan (under the helmet's right edge).
# The original rim now skips the body; a copy at 45 % lights only the body, so the coat keeps a soft edge glow.
_rim = bpy.data.objects["LGT_Rim"]
_body = bpy.data.objects["SM_Builder_Body"]
_no_fur = bpy.data.collections.new("LL_NoFur"); _no_fur.objects.link(_body)
_no_fur.collection_objects[0].light_linking.link_state = "EXCLUDE"   # original rim: everything but the body
_rim.light_linking.receiver_collection = _no_fur
_fur_only = bpy.data.collections.new("LL_RimFur"); _fur_only.objects.link(_body)   # INCLUDE by default
_rim2 = _rim.copy(); _rim2.data = _rim.data.copy(); _rim2.name = "LGT_Rim_Fur"; sc.collection.objects.link(_rim2)
_rim2.data.energy = _rim.data.energy * 0.45
_rim2.light_linking.receiver_collection = _fur_only

# ---------- Warm key / pink left rim: unchanged on helmet, glasses, eyes; neutral white on the fur ----------
# Warm light on the brightest fur pushes highlights towards periwinkle; the reference's highlights lean azure.
for _ln in ("LGT_Key", "LGT_RimLeft"):
    _lo = bpy.data.objects[_ln]
    _lo.light_linking.receiver_collection = _no_fur            # original: everything but the body
    _cp = _lo.copy(); _cp.data = _lo.data.copy(); _cp.name = _ln + "_Fur"; sc.collection.objects.link(_cp)
    _cp.data.color = (1.0, 1.0, 1.0)
    _cp.light_linking.receiver_collection = _fur_only          # copy: the body only

# ---------- Under-body: matte, so short face fur stays saturated blue (no lavender sky reflection) ----------
under.inputs["Roughness"].default_value = 1.0
next(i for i in under.inputs if i.name == "Specular IOR Level").default_value = 0.08

# ---------- Clean render ----------
c = sc.cycles
c.use_adaptive_sampling = True
c.adaptive_threshold = 0.008
c.adaptive_min_samples = 64
c.sample_clamp_direct = 4.0         # kill white fireflies from glossy fibres (was off)
c.sample_clamp_indirect = 2.0       # (was 10)
c.caustics_reflective = c.caustics_refractive = False
c.blur_glossy = 1.0
c.use_denoising = True
c.denoiser = "OPENIMAGEDENOISE"
c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
c.denoising_prefilter = "ACCURATE"
c.seed = 7
c.use_animated_seed = False
r = sc.render
r.film_transparent = True
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
r.image_settings.color_depth = "16"

# Diagnostics: LIGHT_OFF=<name> hides one light; BORDER=x0,x1,y0,y1 renders only that region (0..1, y from bottom).
if os.environ.get("LIGHT_OFF"):
    for _ln in os.environ["LIGHT_OFF"].split(","):
        if _ln in bpy.data.objects: bpy.data.objects[_ln].hide_render = True
if os.environ.get("BORDER"):
    _b = [float(v) for v in os.environ["BORDER"].split(",")]
    r.use_border, r.use_crop_to_border = True, True
    r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = _b

def render(path_prefix, res, samples, f0, f1):
    r.use_persistent_data = (f1 > f0)    # animations: keep scene data between frames
    r.resolution_x = r.resolution_y = res
    r.resolution_percentage = 100
    c.samples = samples
    r.filepath = path_prefix
    sc.frame_start, sc.frame_end = f0, f1
    # Resumable: skip frames already on disk (run.sh deletes empty placeholders from an interrupted frame).
    r.use_overwrite, r.use_placeholder = False, True
    bpy.ops.render.render(animation=True, scene=sc.name)

def srgb_to_lin(v): return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def measure(png):
    img = bpy.data.images.load(png); w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    a = px[..., 3:4]; rgb = px[..., :3] * a + (1 - a)          # over white, like the page
    img_srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(np.clip(rgb, 0, 1), 1 / 2.4) - 0.055) \
        if img.colorspace_settings.name != "sRGB" or img.is_float else rgb
    R, G, B = img_srgb[..., 0], img_srgb[..., 1], img_srgb[..., 2]
    m = (B > 0.45) & (B - R > 0.35) & (B - G > 0.12) & (a[..., 0] > 0.99)
    blue = img_srgb[m]; L = 0.2126 * blue[:, 0] + 0.7152 * blue[:, 1] + 0.0722 * blue[:, 2]
    res = {}
    for k, p in (("p10", 10), ("p50", 50), ("p90", 90)):
        t = np.percentile(L, p); sel = blue[np.abs(L - t) < 0.02]
        res[k] = tuple(int(round(v * 255)) for v in np.median(sel, axis=0))
    res["median"] = tuple(int(round(v * 255)) for v in np.median(blue, axis=0))   # stable: all fur pixels
    bpy.data.images.remove(img)
    return res

if mode == "calibrate":
    # The hair shader's colour response is strongly non-linear, so step each channel in log space along the
    # slope measured between its last two renders (secant), damped, until the median of all fur pixels matches.
    import math
    target = [srgb_to_lin(v / 255) for v in TARGET["p50"]]
    fur = [0.15, 0.30, 1.0]                       # starting guess from the earlier runs
    hist = []
    for it in range(7):
        set_fur(fur)
        prefix = os.path.join(out_dir, f"cal{it}_")
        render(prefix + "####", 256, 160, 1, 1)
        got = measure(prefix + "0001.png")
        err = sum(abs(a - b) for a, b in zip(got["median"], TARGET["p50"]))
        print(f"CAL it={it} fur_lin={[round(v, 4) for v in fur]} median={got['median']} p10={got['p10']} p90={got['p90']} target={TARGET['p50']} err={err}")
        hist.append((list(fur), [srgb_to_lin(v / 255) for v in got["median"]]))
        if err <= 6: break
        new = []
        for ch in range(3):
            f, g = hist[-1][0][ch], max(hist[-1][1][ch], 1e-4)
            slope = 2.0                           # d log(rendered) / d log(fur), first guess
            if len(hist) > 1:
                f0, g0 = hist[-2][0][ch], max(hist[-2][1][ch], 1e-4)
                if abs(math.log(f) - math.log(max(f0, 1e-4))) > 1e-3:
                    slope = min(max((math.log(g) - math.log(g0)) / (math.log(f) - math.log(max(f0, 1e-4))), 0.4), 4.0)
            step = 0.8 * (math.log(target[ch]) - math.log(g)) / slope
            new.append(min(max(math.exp(math.log(max(f, 1e-4)) + step), 0.001), 1.0))
        fur = new
    print("FINAL_FUR", ",".join(f"{v:.5f}" for v in fur))
else:
    fur = [float(v) for v in args[2].split(",")]
    set_fur(fur)
    res, samples = int(args[3]), int(args[4])
    f0 = int(args[5]); f1 = int(args[6]) if mode == "anim" else f0
    render(os.path.join(out_dir, "frame_####"), res, samples, f0, f1)
    if mode == "still":
        print("MEASURED", measure(os.path.join(out_dir, f"frame_{f0:04d}.png")))
    print("DONE", mode, out_dir)
