# <frame.png> (16-bit RGBA) -> out/<id>.png (transparent copy) + out/<id>.webp and out/<id>_white.png (on white, q90).
#   Blender -b --factory-startup --python finish2.py -- <id> <frame.png>
import bpy, sys, os, shutil, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
bid, src = a[0], a[1]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"); os.makedirs(out, exist_ok=True)
shutil.copyfile(src, os.path.join(out, f"{bid}.png"))
img = bpy.data.images.load(src); w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
rgb = np.clip(px[:, :3], 0, 1)
if img.is_float: rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
al = px[:, 3:4]; white = rgb * al + (1 - al)
o = bpy.data.images.new("w", w, h, alpha=False, float_buffer=False)
o.pixels[:] = np.concatenate([white, np.ones_like(al)], -1).ravel()
o.filepath_raw = os.path.join(out, f"{bid}.webp"); o.file_format = "WEBP"; o.save(quality=90)
o.filepath_raw = os.path.join(out, f"{bid}_white.png"); o.file_format = "PNG"; o.save()
print("FINISHED", bid, w, h)
