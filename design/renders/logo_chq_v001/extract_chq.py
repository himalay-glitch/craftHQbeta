"""Lay out the CHQ mark from Poppins ExtraBold and add the red slash.

    python3 -I extract_chq.py          (system python3 with fontTools)

Writes work/chq_outlines.json: glyphs C, H, Q (the bowl is Poppins' "O"; the slash
replaces the Q's own tail) and Slash. Poppins' own C has short arms with horizontal
terminal faces; the reference C is a half ring with long straight arms cut vertically,
so the C is built from the left half of Poppins' O plus straight arms. as closed cubic Bezier contours in metres,
x to the right, y up, baseline at y = 0.
"""
import json, os
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, 'fonts', 'poppins_Poppins-ExtraBold.ttf')
OUT = os.path.join(HERE, 'work', 'chq_outlines.json')

CAP = 0.045          # cap height (H) in metres: the mark is ~0.14 m wide
GAP = 0.03           # gap between glyph ink, in cap heights (tight, as in the reference)
# Slash: parallelogram with horizontal top and bottom, placed on the bowl like the
# reference (fractions of the bowl's width from its left edge, heights in cap heights)
SLASH_TOP, SLASH_BOTTOM = 0.43, -0.045
SLASH_TL, SLASH_TR, SLASH_BL = 0.415, 0.735, 0.76   # x fractions; BR = BL + (TR - TL)
C_WIDTH = 0.96       # the reference C: half ring + straight arms, 0.96 cap heights wide


class SegPen(BasePen):
    """Collects closed contours as cubic segments (quadratics are converted by BasePen)."""
    def __init__(self, gs):
        super().__init__(gs)
        self.contours = []; self.cur = None; self.start = None; self.last = None

    def _moveTo(self, p):
        self.cur = []; self.start = p; self.last = p

    def _lineTo(self, p):
        a = self.last
        self.cur.append([a, (a[0] + (p[0] - a[0]) / 3, a[1] + (p[1] - a[1]) / 3),
                         (a[0] + 2 * (p[0] - a[0]) / 3, a[1] + 2 * (p[1] - a[1]) / 3), p])
        self.last = p

    def _curveToOne(self, c1, c2, p):
        self.cur.append([self.last, c1, c2, p]); self.last = p

    def _closePath(self):
        if self.last != self.start:
            self._lineTo(self.start)
        self.contours.append(self.cur); self.cur = None

    _endPath = _closePath


def point_in(poly, pt):
    x, y = pt; inside = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i - 1], poly[i]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            inside = not inside
    return inside


font = TTFont(FONT)
gs = font.getGlyphSet(); cmap = font.getBestCmap()
H_TOP = 705.0                       # Poppins ExtraBold H height (units)
s = CAP / H_TOP


def glyph(ch):
    g = gs[cmap[ord(ch)]]
    pen = SegPen(gs); g.draw(pen)
    bp = BoundsPen(gs); g.draw(bp)
    return pen.contours, bp.bounds


def rev(seg):
    return [seg[3], seg[2], seg[1], seg[0]]


def line(a, b):
    return [list(a), [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3],
            [a[0] + 2 * (b[0] - a[0]) / 3, a[1] + 2 * (b[1] - a[1]) / 3], list(b)]


def left_half(c):
    """Segments of a closed O contour from its top point to its bottom point, round the left."""
    n = len(c)
    it = max(range(n), key=lambda i: c[i][0][1]); ib = min(range(n), key=lambda i: c[i][0][1])
    h1 = [c[(it + k) % n] for k in range((ib - it) % n)]
    h2 = [c[(ib + k) % n] for k in range((it - ib) % n)]
    mean_x = lambda h: sum(seg[0][0] for seg in h) / len(h)
    if mean_x(h1) < mean_x(h2):
        return h1                                    # already top -> bottom
    return [rev(seg) for seg in reversed(h2)]        # h2 runs bottom -> top: flip it


def stadium_c():
    """C of the reference: the left half of Poppins' O (so it matches the Q's bowl),
    flattened to the H's height, with straight arms ending in vertical cuts."""
    cons, (x0, y0, x1, y1) = glyph('O')
    k = H_TOP / (y1 - y0)                            # no overshoot on the flat arms
    cons = [[[(p[0], (p[1] - y0) * k) for p in seg] for seg in c] for c in cons]
    outer = max(cons, key=lambda c: max(p[0][1] for p in c) - min(p[0][1] for p in c))
    inner = [c for c in cons if c is not outer][0]
    lo, li = left_half(outer), left_half(inner)
    xt = x0 + C_WIDTH * H_TOP
    to_, bo = lo[0][0], lo[-1][3]; ti, bi = li[0][0], li[-1][3]
    segs = list(lo)
    segs += [line(bo, (xt, bo[1])), line((xt, bo[1]), (xt, bi[1])), line((xt, bi[1]), bi)]
    segs += [rev(seg) for seg in reversed(li)]
    segs += [line(ti, (xt, ti[1])), line((xt, ti[1]), (xt, to_[1])), line((xt, to_[1]), to_)]
    return [segs], (x0, 0.0, xt, H_TOP)


out = {}
x = 0.0
bounds = {}
for name, ch in [('C', 'C'), ('H', 'H'), ('Q', 'O')]:
    cons, (x0, y0, x1, y1) = stadium_c() if name == 'C' else glyph(ch)
    dx = x - x0 * s
    contours = []
    for c in cons:
        contours.append([[[p[0] * s + dx, p[1] * s] for p in seg] for seg in c])
    polys = [[seg[0] for seg in c] for c in contours]
    items = []
    for i, c in enumerate(contours):
        parent = -1
        for j, poly in enumerate(polys):
            if j != i and point_in(poly, polys[i][0]):
                parent = j
        items.append(dict(segs=c, parent=parent))
    out[name] = items
    bounds[name] = (x0 * s + dx, y0 * s, x1 * s + dx, y1 * s)
    x = x1 * s + dx + GAP * CAP

qx0, _, qx1, _ = bounds['Q']
qw = qx1 - qx0
top, bot = SLASH_TOP * CAP, SLASH_BOTTOM * CAP
tl = qx0 + SLASH_TL * qw; tr = qx0 + SLASH_TR * qw
bl = qx0 + SLASH_BL * qw; br = bl + (tr - tl)
pts = [(tl, top), (bl, bot), (br, bot), (tr, top)]     # any orientation; the builder fixes it
segs = []
for i in range(4):
    a, b = pts[i], pts[(i + 1) % 4]
    segs.append([list(a), [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3],
                 [a[0] + 2 * (b[0] - a[0]) / 3, a[1] + 2 * (b[1] - a[1]) / 3], list(b)])
out['Slash'] = [dict(segs=segs, parent=-1)]

# centre the mark on x = 0
xmin = min(b[0] for b in bounds.values()); xmax = max(max(b[2] for b in bounds.values()), br)
cx = (xmin + xmax) / 2
for items in out.values():
    for it in items:
        it['segs'] = [[[p[0] - cx, p[1]] for p in seg] for seg in it['segs']]
json.dump(dict(cap=CAP, font='Poppins ExtraBold (H, O); C built from the O', glyphs=out), open(OUT, 'w'))
print('mark width %.4f m, cap %.3f m, contours %s' % (xmax - xmin, CAP, {k: len(v) for k, v in out.items()}))
