"""Render one shot of the v002 logo.

    Blender -b design/blender/crafthq_logo_glass_v002.blend --python render_logo.py -- <shot> <out.png> [percent] [samples]

shot: front | hero | mark | mark_boldC
  front       CAM_LogoV2_Front, wordmark, front studio, transparent background
  mark        CAM_LogoV2_Mark, monogram (wordmark C), front studio, transparent
  mark_boldC  CAM_LogoV2_MarkBold, monogram with the C emboldened to the H/Q weight
  hero        CAM_LogoV2_Hero, wordmark, hero studio, white floor (opaque)
percent: resolution percentage (100 = 2400 px wide for front/hero, 1600 for mark)
samples: Cycles samples (default 512; OIDN denoising is always on)
crop (optional, for quick checks): x0,x1,y0,y1 as fractions of the frame (y from the bottom)
"""
import bpy, sys

argv = sys.argv[sys.argv.index('--') + 1:]
shot, out = argv[0], argv[1]
pct = int(argv[2]) if len(argv) > 2 else 100
samples = int(argv[3]) if len(argv) > 3 else 512

scene = bpy.context.scene
vl = bpy.context.view_layer


def set_coll(name, on):
    lc = vl.layer_collection.children.get(name)
    lc.exclude = not on


# GPU if there is one
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dev_type in ('METAL', 'OPTIX', 'CUDA', 'HIP'):
        try:
            prefs.compute_device_type = dev_type
        except TypeError:
            continue
        prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type != 'CPU']
        if gpus:
            for d in prefs.devices:
                d.use = d.type != 'CPU'
            scene.cycles.device = 'GPU'
            print('render device:', dev_type, [d.name for d in gpus])
            break
except Exception as e:
    print('GPU setup failed, CPU render:', e)

set_coll('99_Source', False)
MARKS = {'mark': ('03_Monogram', 'CAM_LogoV2_Mark'), 'mark_boldC': ('03_Monogram_BoldC', 'CAM_LogoV2_MarkBold')}
if shot in ('front', 'mark', 'mark_boldC'):
    set_coll('02_Wordmark', shot == 'front')
    for s, (coll, _) in MARKS.items():
        set_coll(coll, shot == s)
    set_coll('01_Lights_Front', True)
    set_coll('01_Lights_Hero', False)
    set_coll('04_Studio', False)
    scene.render.film_transparent = True
    scene.camera = bpy.data.objects['CAM_LogoV2_Front' if shot == 'front' else MARKS[shot][1]]
elif shot == 'hero':
    set_coll('02_Wordmark', True)
    for coll, _ in MARKS.values():
        set_coll(coll, False)
    set_coll('01_Lights_Front', False)
    set_coll('01_Lights_Hero', True)
    set_coll('04_Studio', True)
    scene.render.film_transparent = False
    scene.camera = bpy.data.objects['CAM_LogoV2_Hero']
else:
    raise SystemExit('unknown shot ' + shot)

cam = scene.camera
scene.render.resolution_x = int(cam['res_x'])
scene.render.resolution_y = int(cam['res_y'])
scene.render.resolution_percentage = pct
scene.cycles.samples = samples
im = scene.render.image_settings
im.file_format = 'PNG'
im.color_mode = 'RGBA' if scene.render.film_transparent else 'RGB'
im.color_depth = '16'
if len(argv) > 4:   # optional crop for quick checks: x0 x1 y0 y1 as fractions
    x0, x1, y0, y1 = map(float, argv[4].split(','))
    scene.render.use_border = True
    scene.render.use_crop_to_border = True
    scene.render.border_min_x, scene.render.border_max_x = x0, x1
    scene.render.border_min_y, scene.render.border_max_y = y0, y1
scene.render.filepath = out
print('rendering', shot, scene.render.resolution_x, scene.render.resolution_y, pct, '% samples', samples)
bpy.ops.render.render(write_still=True)
print('wrote', out)
