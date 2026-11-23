# Shrink graded, white-composited frames properly before they are encoded (Lanczos-3, in linear light).
# Browsers shrink video with plain bilinear sampling, so a 512 px clip shown at 67 px shimmers and turns the
# thin glasses rims and the helmet edge jagged. Pre-shrunk clips at about 2x their display size stay clean.
#   Blender -b --factory-startup --python resize.py -- <src_white_dir> <out_dir> <size>
import bpy, sys, os, glob
import numpy as np

src, out, size = sys.argv[sys.argv.index("--") + 1:][:3]
size = int(size)
os.makedirs(out, exist_ok=True)

def lanczos_matrix(n_in, n_out, a=3):
    scale = n_in / n_out
    support = a * scale
    W = np.zeros((n_out, n_in), dtype=np.float64)
    for i in range(n_out):
        x = (i + 0.5) * scale - 0.5
        j0, j1 = int(np.floor(x - support)), int(np.ceil(x + support))
        js = np.arange(max(j0, 0), min(j1, n_in - 1) + 1)
        t = (js - x) / scale
        w = np.sinc(t) * np.sinc(t / a)
        w[np.abs(t) >= a] = 0
        W[i, js] = w / w.sum()
    return W

to_lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
to_srgb = lambda c: np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, 1), 1 / 2.4) - 0.055)

files = sorted(glob.glob(os.path.join(src, "frame_*.png")))
assert files, f"no frames in {src}"
W = None
for k, f in enumerate(files):
    img = bpy.data.images.load(f)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[..., :3].astype(np.float64)
    if W is None:
        W = lanczos_matrix(w, size)
    lin = to_lin(px)
    small = np.stack([W @ lin[..., c] @ W.T for c in range(3)], axis=-1)   # same matrix for rows and columns
    rgb = to_srgb(np.clip(small, 0, 1))
    o = bpy.data.images.new(f"r{k}", size, size, alpha=True, float_buffer=False)
    o.pixels[:] = np.concatenate([rgb, np.ones((size, size, 1))], axis=-1).astype(np.float32).ravel()
    o.filepath_raw = os.path.join(out, f"frame_{k + 1:04d}.png")
    o.file_format = "PNG"
    o.save()
    bpy.data.images.remove(img)
    bpy.data.images.remove(o)
print("RESIZED", len(files), "frames to", size, "->", out)
