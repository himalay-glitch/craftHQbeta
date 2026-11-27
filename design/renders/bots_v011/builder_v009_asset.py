# The original blue Builder (bots_v009, read-only) as a transparent tile for the black team sheet: the same frame
# as idle_white/frame_0001.png, with the same OKLCH blue grade, but keeping its alpha.
import bpy, sys, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "bots_v010"))
from huefix_blue import grade
src = os.path.join(HERE, "..", "bots_v009", "idle", "frame_0001.png")
img = bpy.data.images.load(src); w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
rgb = np.clip(px[:, :3], 0, 1)
if img.is_float: rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
rgb = grade(rgb)
o = bpy.data.images.new("b", w, h, alpha=True, float_buffer=False)
o.pixels[:] = np.concatenate([rgb, px[:, 3:4]], -1).ravel()
o.filepath_raw = os.path.join(HERE, "sheet_assets", "builder_v009.png"); o.file_format = "PNG"; o.save()
print("ASSET", w, h)
