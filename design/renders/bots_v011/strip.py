# Composite PNGs (RGBA, any depth) over white, side by side, optional integer upscale.  -- <out.png> <scale> <in1> <in2> ...
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
out, k, ins = a[0], int(a[1]), a[2:]
tiles = []
for f in ins:
    i = bpy.data.images.load(f); w, h = i.size
    p = np.array(i.pixels[:], dtype=np.float32).reshape(h, w, 4)
    rgb = np.clip(p[..., :3], 0, 1)
    if i.is_float: rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
    al = p[..., 3:4]; rgb = rgb * al + (1 - al)
    tiles.append(np.concatenate([rgb, np.ones_like(al)], -1))
H = max(t.shape[0] for t in tiles)
tiles = [np.pad(t, ((0, H - t.shape[0]), (0, 0), (0, 0)), constant_values=1.0) for t in tiles]
row = np.concatenate(tiles, axis=1)
if k > 1: row = np.repeat(np.repeat(row, k, 0), k, 1)
o = bpy.data.images.new("s", row.shape[1], row.shape[0], alpha=False); o.pixels[:] = row.ravel()
o.filepath_raw = out; o.file_format = "PNG"; o.save(); print("STRIP", out, row.shape[1], row.shape[0])
