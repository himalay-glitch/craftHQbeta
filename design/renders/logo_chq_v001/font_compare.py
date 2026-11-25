"""Compare candidate fonts' C, H, O silhouettes with option A of the material sheet.
python3 font_compare.py   -> work/font_scores.txt, work/compare_<font>.png"""
import os, sys
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref', 'materials_ref.png')
W = os.path.join(HERE, 'work'); os.makedirs(W, exist_ok=True)
F = os.path.join(HERE, 'fonts')
S = '/System/Library/Fonts/'; SS = S + 'Supplemental/'
CANDS = [
    ('Futura Bold', SS + 'Futura.ttc', 2), ('Futura CondExtraBold', SS + 'Futura.ttc', 4),
    ('Avenir Next Heavy', S + 'Avenir Next.ttc', 8), ('Avenir Next Bold', S + 'Avenir Next.ttc', 0),
    ('Avenir Black', S + 'Avenir.ttc', 2), ('Helvetica Neue Bold', S + 'HelveticaNeue.ttc', 1),
    ('Arial Black', SS + 'Arial Black.ttf', 0), ('Gill Sans UltraBold', SS + 'GillSans.ttc', 6),
    ('DIN Alternate Bold', SS + 'DIN Alternate Bold.ttf', 0),
    ('Montserrat Black', F + '/Montserrat-Black.ttf', 0), ('Montserrat ExtraBold', F + '/Montserrat-ExtraBold.ttf', 0),
    ('Poppins Black', F + '/poppins_Poppins-Black.ttf', 0), ('Poppins Bold', F + '/poppins_Poppins-Bold.ttf', 0), ('Poppins ExtraBold', F + '/poppins_Poppins-ExtraBold.ttf', 0),
    ('SF Pro Black', S + 'SFNS.ttf', 'sf'),
]
# --- reference mask (option A, upscaled x4 for precision)
im = cv2.imread(REF)
crop = im[20:245, 100:700]
UP = 4
crop = cv2.resize(crop, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
b, g, r = [crop[:, :, i].astype(int) for i in range(3)]
red = (r > 120) & (r - g > 60)
dark = (np.maximum(np.maximum(r, g), b) < 140) & ~red
dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9 * UP // 2, 9 * UP // 2), np.uint8))
# fill holes smaller than the counters: flood fill from border keeps counters white
n, lab, st, cen = cv2.connectedComponentsWithStats(dark)
keep = [i for i in range(1, n) if st[i, 4] > 2000 * UP * UP]
ref = np.isin(lab, keep).astype(np.uint8)
redm = cv2.dilate(red.astype(np.uint8), np.ones((7, 7), np.uint8))
cols = np.where(ref.any(0))[0]; rows = np.where(ref.any(1))[0]
# split glyphs by empty columns
occ = ref.any(0)
runs = []; i = 0
while i < len(occ):
    if occ[i]:
        j = i
        while j < len(occ) and occ[j]: j += 1
        runs.append((i, j)); i = j
    else: i += 1
runs = [r_ for r_ in runs if r_[1] - r_[0] > 40 * UP]
if len(runs) < 3:   # the glyphs nearly touch in the reference: columns read off the crop by eye
    runs = [(12 * UP, 192 * UP), (199 * UP, 374 * UP), (377 * UP, 566 * UP)]
print('ref glyph columns', runs)
top, bot = rows.min(), rows.max()
capH = bot - top
print('ref cap height px (x%d):' % UP, capH)
cv2.imwrite(os.path.join(W, 'ref_mask.png'), ref * 255)

def glyph_mask(path, idx, ch, cap):
    if idx == 'sf':
        font = ImageFont.truetype(path, 400)
        try: font.set_variation_by_axes([100, 96, 400, 900])
        except Exception as e: print('sf var', e)
    else:
        font = ImageFont.truetype(path, 400, index=idx)
    img = Image.new('L', (800, 800), 0)
    ImageDraw.Draw(img).text((100, 50), ch, font=font, fill=255)
    a = np.array(img) > 127
    ys, xs = np.nonzero(a)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.uint8)
    # scale by cap height of 'H'
    return a

scores = []
for name, path, idx in CANDS:
    try:
        Hm = glyph_mask(path, idx, 'H', None)
    except Exception as e:
        print('skip', name, e); continue
    s = capH / Hm.shape[0]
    canvas = np.zeros_like(ref)
    tot_iou = []
    for (x0, x1), ch in zip(runs[:3], 'CHO'):
        m = glyph_mask(path, idx, ch, None)
        m = cv2.resize(m, (max(1, int(round(m.shape[1] * s))), max(1, int(round(m.shape[0] * s)))), interpolation=cv2.INTER_AREA)
        # glyph O/C may overshoot cap height: centre vertically on the reference band
        y0 = top + (capH - m.shape[0]) // 2
        best = None
        for dx in range(-40, 41, 4):
            xx = x0 + dx
            c = np.zeros_like(ref)
            hh, ww = m.shape
            if xx < 0 or xx + ww > c.shape[1] or y0 < 0 or y0 + hh > c.shape[0]: continue
            c[y0:y0 + hh, xx:xx + ww] = m
            win = slice(max(x0 - 60, 0), min(x1 + 60, c.shape[1]))
            A = c[:, win].astype(bool); B = ref[:, win].astype(bool); M = ~redm[:, win].astype(bool)
            iou = (A & B & M).sum() / max(((A | B) & M).sum(), 1)
            if best is None or iou > best[0]: best = (iou, xx)
        iou, xx = best
        canvas[y0:y0 + m.shape[0], xx:xx + m.shape[1]] |= m
        tot_iou.append(iou)
    score = float(np.mean(tot_iou))
    scores.append((score, name, [round(v, 3) for v in tot_iou]))
    vis = np.zeros(ref.shape + (3,), np.uint8) + 255
    vis[ref.astype(bool)] = (170, 170, 170)
    vis[canvas.astype(bool) & ~ref.astype(bool)] = (0, 0, 255)
    vis[~canvas.astype(bool) & ref.astype(bool)] = (255, 120, 0)
    vis[canvas.astype(bool) & ref.astype(bool)] = (60, 60, 60)
    cv2.imwrite(os.path.join(W, 'compare_%s.png' % name.replace(' ', '_')), cv2.resize(vis, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
scores.sort(reverse=True)
with open(os.path.join(W, 'font_scores.txt'), 'w') as f:
    for s_ in scores:
        line = '%.3f  %-24s C/H/O IoU %s' % s_
        print(line); f.write(line + '\n')
