"""Finish the raw CHQ renders into the deliverables (system python3 with numpy + OpenCV).

    python3 finish_chq.py <raw_dir> <out_dir>

raw_dir holds front.png (16-bit RGBA, transparent) and, once rendered, hero.png (16-bit RGB)
from render_chq.py.  Writes, all 16-bit PNG:
  chq_front.png        tight crop of front.png, transparent
  chq_front_white.png  the same over white (display-space "over", like a browser)
  chq_hero.png         hero.png with the paper levelled to pure white
"""
import os, sys
import cv2
import numpy as np

raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
MAX = 65535.0


def read(p):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im is None:
        raise SystemExit('missing ' + p)
    assert im.dtype == np.uint16, p + ' is not 16-bit'
    return im.astype(np.float64) / MAX


def write(p, im):
    cv2.imwrite(p, np.clip(np.round(im * MAX), 0, MAX).astype(np.uint16), [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print('wrote', p, im.shape[1], 'x', im.shape[0])


def tight(im, margin_frac):
    """Crop to the alpha bounding box plus a margin of margin_frac * width."""
    a = im[:, :, 3]
    ys, xs = np.nonzero(a > 1.0 / 512)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    m = int(round(margin_frac * (x1 - x0)))
    pad = np.zeros((im.shape[0] + 2 * m, im.shape[1] + 2 * m, 4))
    pad[m:m + im.shape[0], m:m + im.shape[1]] = im
    return pad[y0:y1 + 2 * m, x0:x1 + 2 * m]


def over_white(im):
    a = im[:, :, 3:4]
    return im[:, :, :3] * a + (1.0 - a)


front = tight(read(os.path.join(raw, 'front.png')), 0.015)
write(os.path.join(out, 'chq_front.png'), front)
write(os.path.join(out, 'chq_front_white.png'), over_white(front))
if not os.path.exists(os.path.join(raw, 'hero.png')):
    sys.exit(0)

hero = read(os.path.join(raw, 'hero.png'))[:, :, :3]
# level the paper: the lit floor renders a little under 1.0; scale so the far,
# untouched paper (top band, away from the logo) reaches white, then clip.
top = hero[: hero.shape[0] // 8].mean(axis=2)
white = np.percentile(top, 35)
gain = 1.0 / max(white, 0.5)
print('hero paper level %.4f -> gain %.4f' % (white, gain))
hero = np.clip(hero * gain, 0, 1)
# The far paper at the very top of frame falls off a little (it is farthest from
# the lights). Flatten that band only: everything above the logo (with a 60 px
# gap) is plain paper, so its blurred brightness is the paper's own falloff.
lum = hero.mean(axis=2)
logo_top = int(np.argmax((lum < 0.5).any(axis=1)))
R = max(logo_top - 60, 0)
if R > 20:
    band = cv2.GaussianBlur(lum[:R].astype(np.float32), (0, 0), sigmaX=24, sigmaY=2, borderType=cv2.BORDER_REFLECT)
    g = np.clip(1.0 / np.maximum(band, 0.4), 1.0, 2.0)
    hero[:R] = np.clip(hero[:R] * g[:, :, None], 0, 1)
    print('hero paper falloff flattened in rows 0..%d (max gain %.3f)' % (R, g.max()))
write(os.path.join(out, 'chq_hero.png'), hero)
