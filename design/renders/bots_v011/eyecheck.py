# Full still on white | 3x crop of the eyes | the face at 40 px and 24 px (box-filtered, then enlarged for viewing).
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
src, out = a[0], a[1]
i = bpy.data.images.load(src); w, h = i.size
p = np.array(i.pixels[:], dtype=np.float32).reshape(h, w, 4)
rgb = np.clip(p[..., :3], 0, 1)
if i.is_float: rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
al = p[..., 3:4]; img = rgb * al + (1 - al)
top = img[::-1]
def down(im, n):
    k = im.shape[0] // n
    return im[:k * n, :k * n].reshape(n, k, n, k, 3).mean(axis=(1, 3))
def up(im, s): return np.repeat(np.repeat(im, s, 0), s, 1)
crop = top[int(h * 0.36):int(h * 0.76), int(w * 0.20):int(w * 0.80)]   # the face, 2x
crop = up(crop, 2)
face = top[int(h * 0.12):int(h * 0.88), int(w * 0.12):int(w * 0.88)]
a40 = up(down(face, 40), 8); a24 = up(down(face, 24), 13)
H = max(top.shape[0], crop.shape[0])
def pad(x): return np.pad(x, ((0, H - x.shape[0]), (0, 12), (0, 0)), constant_values=1.0)
row = np.concatenate([pad(top), pad(crop), pad(a40), pad(a24)], axis=1)[::-1]
o = bpy.data.images.new("c", row.shape[1], row.shape[0], alpha=False)
o.pixels[:] = np.concatenate([row, np.ones(row.shape[:2] + (1,), np.float32)], -1).ravel()
o.filepath_raw = out; o.file_format = "PNG"; o.save(); print("EYECHECK", row.shape)
