"""Trace the CraftHQ wordmark artwork into clean Bezier outlines.

Run with the system python3 (needs numpy + OpenCV):
    python3 trace_wordmark.py

Input : ref/wordmark_ref.png  (black artwork on white)
Output: work/wordmark_trace.json  (closed Bezier contours in artwork pixels, y down)
        work/trace_check.png      (fitted outline vs artwork, differences in colour)

Method
1. Blur slightly (sigma 1 px) to calm JPEG wobble, upsample x8 (cubic), threshold
   half-way between paper and ink, and take contours (outer + holes) at 1/8 px.
2. Resample each contour every 0.25 px and find sharp corners (turn of more than
   25 deg within +-1.5 px).  Every corner in this face is genuinely sharp.
3. Between corners, find straight runs (radius > 250 px, deviation < 0.3 px) and
   make them exact lines; what is left is fitted with cubic Beziers (Schneider's
   least-squares fit, tangent-continuous to neighbouring lines, 0.3 px tolerance).
4. Snap: near-horizontal lines become horizontal, stems share one italic angle,
   lines with near-equal angles become parallel, and horizontal edges at near-equal
   heights share one height (baseline, x-height, cap height).  Corners are then
   rebuilt as exact intersections and curves are refitted to the new end points.
"""
import json, math, os, sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref', 'wordmark_ref.png')
WORK = os.path.join(HERE, 'work')
os.makedirs(WORK, exist_ok=True)

UP = 8            # supersampling for the threshold contour
DS = 0.25         # resample spacing (px)
CORNER_TURN = math.radians(25)
BLUR_ZONE = 2.6   # px either side of a corner that the blur has rounded
MIN_PIECE = 8.0   # px: shortest Bezier piece a curve split may create


# ---------------------------------------------------------------- utilities
def resample_closed(c, ds):
    c = np.vstack([c, c[:1]])
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(c, axis=0).T))]
    n = int(round(d[-1] / ds))
    t = np.linspace(0, d[-1], n, endpoint=False)
    return np.c_[np.interp(t, d, c[:, 0]), np.interp(t, d, c[:, 1])]


def gsmooth_closed(p, sig_samples):
    k = int(3 * sig_samples) + 1
    x = np.arange(-k, k + 1)
    w = np.exp(-x ** 2 / (2 * sig_samples ** 2)); w /= w.sum()
    pp = np.vstack([p[-k:], p, p[:k]])
    return np.c_[np.convolve(pp[:, 0], w, 'valid'), np.convolve(pp[:, 1], w, 'valid')]


def gsmooth_open(p, sig_samples):
    if len(p) < 5:
        return p.copy()
    k = min(int(3 * sig_samples) + 1, len(p) - 1)
    x = np.arange(-k, k + 1)
    w = np.exp(-x ** 2 / (2 * sig_samples ** 2)); w /= w.sum()
    # reflect-pad around the end points (odd reflection keeps the ends in place)
    pre = 2 * p[0] - p[1:k + 1][::-1]
    post = 2 * p[-1] - p[-k - 1:-1][::-1]
    pp = np.vstack([pre, p, post])
    return np.c_[np.convolve(pp[:, 0], w, 'valid'), np.convolve(pp[:, 1], w, 'valid')]


def unit(v):
    v = np.asarray(v, float)
    return v / (np.linalg.norm(v) + 1e-12)


def fit_line(pts):
    c = pts.mean(0)
    u, s, vt = np.linalg.svd(pts - c)
    d = vt[0]
    if np.dot(pts[-1] - pts[0], d) < 0:
        d = -d
    nrm = np.array([-d[1], d[0]])
    dev = np.abs((pts - c) @ nrm)
    return c, d, dev.max() if len(dev) else 0.0


def line_intersect(p1, d1, p2, d2):
    A = np.array([d1, -d2]).T
    det = np.linalg.det(A)
    if abs(det) < 1e-9:
        return (p1 + p2) / 2
    t = np.linalg.solve(A, p2 - p1)
    return p1 + t[0] * d1


# ------------------------------------------------------ Schneider curve fit
def bez(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    mt = 1 - t
    return mt ** 3 * p0 + 3 * mt ** 2 * t * p1 + 3 * mt * t ** 2 * p2 + t ** 3 * p3


def bez_d1(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    mt = 1 - t
    return 3 * mt ** 2 * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t ** 2 * (p3 - p2)


def bez_d2(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    return 6 * (1 - t) * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)


def chord_param(pts):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(pts, axis=0).T))]
    return d / d[-1]


def gen_bezier(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    b0 = (1 - u) ** 3; b1 = 3 * u * (1 - u) ** 2; b2 = 3 * u ** 2 * (1 - u); b3 = u ** 3
    A1 = t1[None, :] * b1[:, None]
    A2 = t2[None, :] * b2[:, None]
    C = np.array([[np.sum(A1 * A1), np.sum(A1 * A2)], [np.sum(A1 * A2), np.sum(A2 * A2)]])
    tmp = pts - (np.outer(b0 + b1, p0) + np.outer(b2 + b3, p3))
    X = np.array([np.sum(A1 * tmp), np.sum(A2 * tmp)])
    det = C[0, 0] * C[1, 1] - C[0, 1] * C[1, 0]
    seg = np.linalg.norm(p3 - p0)
    if abs(det) > 1e-12:
        a1 = (X[0] * C[1, 1] - X[1] * C[0, 1]) / det
        a2 = (C[0, 0] * X[1] - C[1, 0] * X[0]) / det
    else:
        a1 = a2 = seg / 3
    eps = 1e-6 * seg
    if a1 < eps or a2 < eps:
        a1 = a2 = seg / 3
    return np.array([p0, p0 + t1 * a1, p3 + t2 * a2, p3])


def reparam(ctrl, pts, u):
    for _ in range(2):
        q = bez(ctrl, u) - pts
        d1 = bez_d1(ctrl, u)
        d2 = bez_d2(ctrl, u)
        num = np.sum(q * d1, 1)
        den = np.sum(d1 * d1, 1) + np.sum(q * d2, 1)
        step = np.where(np.abs(den) > 1e-12, num / den, 0)
        u = np.clip(u - step, 0, 1)
    return u


def max_err(ctrl, pts, u):
    d = np.hypot(*(bez(ctrl, u) - pts).T)
    i = int(np.argmax(d[1:-1])) + 1 if len(d) > 2 else 0
    return d[i], i


def local_tangent(pts, i, half):
    a = max(0, i - half); b = min(len(pts), i + half + 1)
    _, d, _ = fit_line(pts[a:b])
    return d


def fit_cubic(pts, t1, t2, err, depth=0):
    """t1: unit tangent leaving pts[0]; t2: unit tangent leaving pts[-1] backwards."""
    if len(pts) < 4:
        seg = np.linalg.norm(pts[-1] - pts[0])
        return [np.array([pts[0], pts[0] + t1 * seg / 3, pts[-1] + t2 * seg / 3, pts[-1]])]
    u = chord_param(pts)
    ctrl = gen_bezier(pts, u, t1, t2)
    e, split = max_err(ctrl, pts, u)
    if e < err:
        return [ctrl]
    for _ in range(30):
        u = reparam(ctrl, pts, u)
        ctrl = gen_bezier(pts, u, t1, t2)
        e, split = max_err(ctrl, pts, u)
        if e < err:
            return [ctrl]
    minpiece = int(MIN_PIECE / DS)
    if depth > 8 or len(pts) < 2 * minpiece + 2:
        return [ctrl]
    split = int(np.clip(split, minpiece, len(pts) - 1 - minpiece))
    tc = local_tangent(pts, split, 8)          # forward direction
    left = fit_cubic(pts[:split + 1], t1, -tc, err, depth + 1)
    right = fit_cubic(pts[split:], tc, t2, err, depth + 1)
    return left + right


# --------------------------------------------------------------- tracing
def load_contours():
    g = cv2.imread(REF, cv2.IMREAD_GRAYSCALE).astype(np.float32)
    ink = float(np.percentile(g[g < 100], 50)); paper = float(np.percentile(g[g > 200], 50))
    lvl = (ink + paper) / 2
    gb = cv2.GaussianBlur(g, (0, 0), 1.0)
    up = cv2.resize(gb, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    mask = (up < lvl).astype(np.uint8)
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for i, c in enumerate(cs):
        c = c[:, 0, :].astype(np.float64)
        c = (c + 0.5) / UP - 0.5           # supersampled pixel centres -> artwork px
        out.append(dict(pts=c, parent=int(hier[0][i][3])))
    return g, mask, out


def find_corners(p):
    n = len(p)
    tang = np.roll(p, -1, 0) - np.roll(p, 1, 0)
    th = np.arctan2(tang[:, 1], tang[:, 0])
    dth = np.angle(np.exp(1j * (np.roll(th, -1) - th)))
    W = int(1.5 / DS)
    cum = np.cumsum(np.r_[dth, dth, dth])
    idx = np.arange(n) + n
    turn = cum[idx + W] - cum[idx - W]
    cand = []
    for i in range(n):
        if abs(turn[i]) > CORNER_TURN:
            nb = [abs(turn[(i + j) % n]) for j in range(-3 * W, 3 * W + 1)]
            if abs(turn[i]) >= max(nb):
                if not cand or (i - cand[-1]) > 3 * W:
                    cand.append(i)
    if len(cand) > 1 and (cand[0] + n - cand[-1]) <= 3 * W:
        cand.pop()
    # blur rounds an acute corner over a longer stretch: zone ~ 1/sin(half angle)
    W5 = int(5.0 / DS)
    zones = []
    for i in cand:
        tot = abs(cum[i + n + W5] - cum[i + n - W5])
        interior = max(math.pi - tot, 0.2)
        zones.append(BLUR_ZONE / max(math.sin(interior / 2), 0.3))
    return cand, zones


def segment_pieces(seg, zs, ze):
    """Split one corner-to-corner run into straight lines and curve stretches.
    zs/ze: blur zone (px) at the start/end corner.
    Returns a list of ('L', i0, i1) / ('C', i0, i1) index ranges into seg."""
    n = len(seg)
    t0 = int(zs / DS); t1 = int(ze / DS)
    sm = gsmooth_open(seg, 2.0 / DS)
    tang = np.gradient(sm, axis=0)
    th = np.unwrap(np.arctan2(tang[:, 1], tang[:, 0]))
    kap = np.gradient(th) / DS
    trim = int(BLUR_ZONE / DS)
    straight = np.abs(kap) < 1 / 250
    straight[:trim] = straight[:trim] | False
    # whole segment straight?
    a, b = (t0, n - t1) if n > t0 + t1 + 8 else (0, n)
    _, _, dev = fit_line(seg[a:b])
    if dev < 0.6:
        return [('L', 0, n - 1)]
    runs = []
    i = 0
    minrun = int(10 / DS)
    while i < n:
        if straight[i]:
            j = i
            while j + 1 < n and straight[j + 1]:
                j += 1
            if j - i + 1 >= minrun:
                runs.append([i, j])
            i = j + 1
        else:
            i += 1
    lines = []
    lightly = gsmooth_open(seg, 0.6 / DS)
    for i0, i1 in runs:
        c, d, dev = fit_line(lightly[i0:i1 + 1])
        nrm = np.array([-d[1], d[0]])
        # extend while close to the line
        while i0 > 0 and abs((lightly[i0 - 1] - c) @ nrm) < 0.15:
            i0 -= 1
        while i1 < n - 1 and abs((lightly[i1 + 1] - c) @ nrm) < 0.15:
            i1 += 1
        # hand the last px before a smooth join back to the curve, so the curve
        # starts where the outline is still on the line (no kink at the join)
        back = int(1.0 / DS)
        if i0 > t0 + 8:
            i0 += back
        if i1 < n - 9 - t1:
            i1 -= back
        c, d, dev = fit_line(lightly[max(i0, 0):i1 + 1])
        anchored = i0 <= t0 + 8 or i1 >= n - 9 - t1
        if dev < 0.5 and (anchored or (i1 - i0) * DS >= 14.0):
            lines.append([i0, i1])
    # merge overlaps
    lines.sort()
    merged = []
    for l in lines:
        if merged and l[0] <= merged[-1][1] + int(2 / DS):
            merged[-1][1] = max(merged[-1][1], l[1])
        else:
            merged.append(l)
    # lines that reach into a blur zone are anchored to the corner
    # (a short leftover between a line and a corner is only blur rounding: the
    #  ink thins out at acute tips, so allow up to 2 zones / 12 px)
    for l in merged:
        if l[0] * DS <= max(2 * zs, 12.0):
            l[0] = 0
        if (n - 1 - l[1]) * DS <= max(2 * ze, 12.0):
            l[1] = n - 1
    pieces = []
    cur = 0
    for i0, i1 in merged:
        if i0 > cur:
            pieces.append(('C', cur, i0))
        pieces.append(('L', i0, i1))
        cur = i1
    if cur < n - 1:
        pieces.append(('C', cur, n - 1))
    return pieces


def trace():
    g, mask, contours = load_contours()
    result = []
    for ci, cd in enumerate(contours):
        p = resample_closed(cd['pts'], DS)
        p = gsmooth_closed(p, 0.5 / DS)
        corners, zones = find_corners(p)
        n = len(p)
        if not corners:
            raise SystemExit('contour %d has no corners: not handled' % ci)
        items = []   # sequence of pieces around the contour
        for k, a in enumerate(corners):
            b = corners[(k + 1) % len(corners)]
            idx = np.arange(a, b + (n if b <= a else 0) + 1) % n
            seg = p[idx]
            zs, ze = zones[k], zones[(k + 1) % len(corners)]
            for kind, i0, i1 in segment_pieces(seg, zs, ze):
                items.append(dict(kind=kind, data=seg[i0:i1 + 1],
                                  start_corner=(i0 == 0), end_corner=(i1 == len(seg) - 1),
                                  zs=zs if i0 == 0 else 0.0, ze=ze if i1 == len(seg) - 1 else 0.0))
        result.append(dict(items=items, parent=cd['parent']))
    return g, mask, result


# ----------------------------------------------------------- line snapping
def describe_lines(result):
    lines = []
    for ci, c in enumerate(result):
        for it in c['items']:
            if it['kind'] != 'L':
                continue
            d = it['data']
            a = int(it['zs'] / DS); b = int(it['ze'] / DS)
            core = d[a:len(d) - b] if len(d) > a + b + 8 else d
            cen, dirv, dev = fit_line(core)
            it['cen'] = cen; it['dir'] = dirv
            it['len'] = float(np.linalg.norm(d[-1] - d[0]))
            ang = math.degrees(math.atan2(dirv[1], dirv[0])) % 180
            it['ang'] = ang
            lines.append(it)
    return lines


def snap_lines(lines):
    # italic angle from long near-vertical stems
    stems = [l for l in lines if 100 < l['ang'] < 115 and l['len'] > 40]
    ital = sum(l['ang'] * l['len'] for l in stems) / sum(l['len'] for l in stems)
    print('italic angle (deg from +x, y down): %.3f  -> slant %.3f deg' % (ital, ital - 90))
    # cluster angles
    for l in lines:
        if min(l['ang'], 180 - l['ang']) < 1.0:
            l['snap'] = 0.0
        elif abs(l['ang'] - ital) < 1.0:
            l['snap'] = ital
    rest = sorted([l for l in lines if 'snap' not in l], key=lambda l: l['ang'])
    clusters = []
    for l in rest:
        if clusters and abs(l['ang'] - clusters[-1][-1]['ang']) < 1.2:
            clusters[-1].append(l)
        else:
            clusters.append([l])
    for cl in clusters:
        m = sum(l['ang'] * l['len'] for l in cl) / sum(l['len'] for l in cl)
        for l in cl:
            l['snap'] = m
    for l in lines:
        a = math.radians(l['snap'])
        d = np.array([math.cos(a), math.sin(a)])
        if np.dot(d, l['dir']) < 0:
            d = -d
        l['dir'] = d
    # shared heights for horizontals
    hs = sorted([l for l in lines if l['snap'] == 0.0], key=lambda l: l['cen'][1])
    groups = []
    for l in hs:
        # complete linkage: every member within 0.7 px of each other (no chaining)
        if groups and abs(l['cen'][1] - groups[-1][0]['cen'][1]) < 0.7:
            groups[-1].append(l)
        else:
            groups.append([l])
    for gr in groups:
        y = sum(l['cen'][1] * l['len'] for l in gr) / sum(l['len'] for l in gr)
        for l in gr:
            l['cen'] = np.array([l['cen'][0], y])
        if len(gr) > 1:
            print('  shared horizontal y=%.2f  (%d edges)' % (y, len(gr)))
    return ital


def end_tangent(data, at_start, zone):
    """Direction estimate just outside the blur zone at one end of a curve."""
    a = int(zone / DS); b = int((zone + 4.0) / DS)
    if len(data) < b + 2:
        a, b = 0, max(len(data) // 2, 2)
    if at_start:
        pts = data[a:b]
        c, d, _ = fit_line(pts)
        return c, d               # d points along the contour (forward)
    pts = data[len(data) - b:len(data) - a]
    c, d, _ = fit_line(pts)
    return c, d


def build(result):
    out = []
    for ci, c in enumerate(result):
        items = c['items']
        m = len(items)
        # resolve the joint between item k and item k+1
        joints = []
        for k in range(m):
            A = items[k]; B = items[(k + 1) % m]
            corner = A['end_corner'] and B['start_corner']
            if A['kind'] == 'L':
                pa, da = A['cen'], A['dir']
            else:
                pa, da = end_tangent(A['data'], False, max(A['ze'], BLUR_ZONE))
            if B['kind'] == 'L':
                pb, db = B['cen'], B['dir']
            else:
                pb, db = end_tangent(B['data'], True, max(B['zs'], BLUR_ZONE))
            if corner:
                P = line_intersect(pa, da, pb, db)
                moved = np.linalg.norm(P - A['data'][-1])
                if moved > 4.0:
                    print('  WARNING contour %d corner moved %.1f px from the traced outline' % (ci, moved))
                joints.append(dict(P=P, tin=da, tout=db))
            else:
                # smooth join: lie on the line (if any), keep its direction
                raw = A['data'][-1]
                if A['kind'] == 'L':
                    P = pa + np.dot(raw - pa, da) * da; t = da
                elif B['kind'] == 'L':
                    P = pb + np.dot(raw - pb, db) * db; t = db
                else:
                    P = raw; t = unit(da + db)
                joints.append(dict(P=P, tin=t, tout=t))
        segs = []
        for k in range(m):
            it = items[k]
            j0 = joints[(k - 1) % m]; j1 = joints[k]
            P0, P1 = j0['P'], j1['P']
            if it['kind'] == 'L':
                segs.append(np.array([P0, P0 + (P1 - P0) / 3, P0 + 2 * (P1 - P0) / 3, P1]))
            else:
                data = it['data']
                s = int(it['zs'] / DS) if it['start_corner'] else 0
                e = len(data) - int(it['ze'] / DS) if it['end_corner'] else len(data)
                core = gsmooth_open(data[s:e], 1.0 / DS)
                pts = np.vstack([P0, core[1:-1] if len(core) > 2 else core, P1])
                bz = fit_cubic(pts, unit(j0['tout']), -unit(j1['tin']), 0.3)
                segs.extend(bz)
        out.append(dict(parent=c['parent'], segs=[s.tolist() for s in segs]))
    return out


def flatten(segs, n=24):
    pts = []
    for s in segs:
        s = np.array(s)
        pts.append(bez(s, np.linspace(0, 1, n, endpoint=False)))
    return np.vstack(pts)


def check(g, mask, out):
    H, W = mask.shape
    fit = np.zeros((H, W), np.uint8)
    polys = [np.round((flatten(c['segs']) + 0.5) * UP - 0.5).astype(np.int32) for c in out]
    outer = [pp for pp, c in zip(polys, out) if c['parent'] < 0]
    holes = [pp for pp, c in zip(polys, out) if c['parent'] >= 0]
    cv2.fillPoly(fit, outer, 1)
    cv2.fillPoly(fit, holes, 0)
    diff = (fit != mask)
    # distance of differing pixels from the artwork edge, in artwork px
    edge = cv2.Canny(mask * 255, 50, 150)
    dist = cv2.distanceTransform((edge == 0).astype(np.uint8), cv2.DIST_L2, 5)
    dd = dist[diff] / UP
    print('mismatch: %.4f%% of ink area, worst %.2f px, p99 %.2f px' % (
        100 * diff.sum() / mask.sum(), dd.max() if dd.size else 0, np.percentile(dd, 99) if dd.size else 0))
    small = 2
    vis = cv2.cvtColor(cv2.resize(g.astype(np.uint8), None, fx=small, fy=small, interpolation=cv2.INTER_CUBIC), cv2.COLOR_GRAY2BGR)
    vis = (vis.astype(np.float32) * 0.4 + 150).astype(np.uint8)
    for c in out:
        pp = flatten(c['segs'], 48)
        cv2.polylines(vis, [np.round((pp + 0.5) * small - 0.5).astype(np.int32)], True, (200, 60, 0), 1, cv2.LINE_AA)
        for s in c['segs']:
            q = np.round((np.array(s[0]) + 0.5) * small - 0.5).astype(int)
            cv2.circle(vis, tuple(q), 2, (0, 0, 220), -1)
    cv2.imwrite(os.path.join(WORK, 'trace_check.png'), vis[500:980, 940:3420])
    big = np.zeros((H, W, 3), np.uint8) + 255
    big[mask.astype(bool)] = (60, 60, 60)
    big[(fit == 1) & (mask == 0)] = (0, 0, 255)
    big[(fit == 0) & (mask == 1)] = (255, 0, 0)
    sm = cv2.resize(big, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(WORK, 'trace_diff.png'), sm)


if __name__ == '__main__':
    g, mask, result = trace()
    lines = describe_lines(result)
    ital = snap_lines(lines)
    out = build(result)
    nseg = sum(len(c['segs']) for c in out)
    print('contours', len(out), 'bezier segments', nseg)
    check(g, mask, out)
    json.dump(dict(italic_deg=ital, contours=out), open(os.path.join(WORK, 'wordmark_trace.json'), 'w'))
    print('wrote', os.path.join(WORK, 'wordmark_trace.json'))
