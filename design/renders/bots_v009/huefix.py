# Hue-vs-hue grade for the blue fur: in OKLCH, pull the hue of blue pixels toward the reference azure,
# keeping each pixel's lightness and chroma. Pure per-pixel colour mapping (a LUT), so it can't flicker.
# Why: the front fur fill pushes the face centre's blue near its ceiling, where the view transform's
# highlight desaturation reads as a lavender "blush" around the mouth (measured 218° vs 207° HSV hue).
import numpy as np

def _to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def _to_srgb(c):
    c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
def lin_to_oklab(x): return np.cbrt(x @ M1.T) @ M2.T
def oklab_to_lin(x): return (np.linalg.solve(M2, x.T).T ** 3) @ np.linalg.inv(M1).T

REF = np.array([43, 136, 241]) / 255.0            # OpenDots blue
_ref = lin_to_oklab(_to_lin(REF)[None])[0]
H_REF = np.arctan2(_ref[2], _ref[1])

def grade(srgb, k=0.35, full=np.radians(22), edge=np.radians(40), c_min=0.04, c_full=0.09):
    """srgb: (..., 3) floats 0..1 (display sRGB). k = fraction of the hue offset kept (0 = all snap to ref)."""
    lab = lin_to_oklab(_to_lin(srgb.reshape(-1, 3)))
    L, a, b = lab[:, 0], lab[:, 1], lab[:, 2]
    C = np.hypot(a, b); h = np.arctan2(b, a)
    d = (h - H_REF + np.pi) % (2 * np.pi) - np.pi
    w_h = np.clip((edge - np.abs(d)) / (edge - full), 0, 1); w_h = w_h * w_h * (3 - 2 * w_h)
    w_c = np.clip((C - c_min) / (c_full - c_min), 0, 1); w_c = w_c * w_c * (3 - 2 * w_c)
    w = w_h * w_c
    h2 = H_REF + d * (k + (1 - k) * (1 - w))
    out = np.stack([L, C * np.cos(h2), C * np.sin(h2)], -1)
    return _to_srgb(oklab_to_lin(out)).reshape(srgb.shape)
