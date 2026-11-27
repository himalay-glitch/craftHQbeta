# Web copies of the team stills: each <id>_white.png (512 px, on white) shrunk properly (Lanczos-3 in linear light)
# to 128, 256 and 384 px WebP, so avatars from 22 px to the 124 px hero stay crisp on 1x and 2x screens.
#   Blender -b --factory-startup --python web_stills.py -- <out_dir> <web_dir> <id> [<id> ...]
import bpy, sys, os
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
src, dst, ids = args[0], args[1], args[2:]
os.makedirs(dst, exist_ok=True)

def lanczos(n_in, n_out, a=3):
    scale = n_in / n_out
    W = np.zeros((n_out, n_in))
    for i in range(n_out):
        x = (i + 0.5) * scale - 0.5
        js = np.arange(max(int(np.floor(x - a * scale)), 0), min(int(np.ceil(x + a * scale)), n_in - 1) + 1)
        t = (js - x) / scale
        w = np.sinc(t) * np.sinc(t / a)
        w[np.abs(t) >= a] = 0
        W[i, js] = w / w.sum()
    return W

to_lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
to_srgb = lambda c: np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, 1), 1 / 2.4) - 0.055)

for bot in ids:
    img = bpy.data.images.load(os.path.join(src, f"{bot}_white.png"))
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float64).reshape(h, w, 4)[..., :3]
    if img.is_float:
        px = to_srgb(px)
    lin = to_lin(px)
    for size in (128, 256, 384):
        W = lanczos(w, size)
        rgb = to_srgb(np.clip(np.stack([W @ lin[..., c] @ W.T for c in range(3)], -1), 0, 1))
        o = bpy.data.images.new(f"{bot}{size}", size, size, alpha=False, float_buffer=False)
        o.pixels[:] = np.concatenate([rgb, np.ones((size, size, 1))], -1).astype(np.float32).ravel()
        o.filepath_raw = os.path.join(dst, f"{bot}-{size}.webp")
        o.file_format = "WEBP"
        o.save(quality=92)
        bpy.data.images.remove(o)
    bpy.data.images.remove(img)
    print("WEB", bot, "->", dst)
