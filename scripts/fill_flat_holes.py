"""Rebuild flat faces that mesh simplification deleted, using only the surviving geometry.

When a simplifier drops the triangles of a flat face, the face's outline survives as closed loops
of "open" edges (edges used by only one triangle), all on one plane. The side faces next to each
loop (walls, chamfers, fillets) tell which side of the outline is solid:
  - side faces pointing away from the loop's centre: the loop is the outer edge of a solid region,
    whose missing face lies inside it ("pad");
  - side faces pointing towards the centre: the loop is the edge of an opening ("opening": a
    window, screw hole or bay).
Each pad is re-triangulated (with gmsh) with every opening loop inside it on the same plane as a
hole, so real openings stay open. Loops that are not flat, not closed or that cross themselves are
left alone. window_walls() rebuilds the lost side walls of plate windows from their matching top
and bottom outlines.

Used by swap_parts.py (housing floor, output frame, lower clamshell ring, shoulder bolt).
"""
import numpy as np


def _weld(P, I, tol=1e-3):
    key = np.round(P / tol).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return P[first], inv.reshape(-1)[I]


def _ear_clip(poly):
    """Triangulate a simple 2D polygon (N x 2, any winding). Returns index triples."""
    n = len(poly)
    idx = list(range(n))
    area = 0.5 * np.sum(poly[:, 0] * np.roll(poly[:, 1], -1) - np.roll(poly[:, 0], -1) * poly[:, 1])
    sgn = 1.0 if area > 0 else -1.0
    tris = []
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    guard = 0
    while len(idx) > 3 and guard < 10 * n * n:
        guard += 1
        clipped = False
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = poly[i0], poly[i1], poly[i2]
            if sgn * cross(a, b, c) <= 1e-12:
                continue  # reflex or degenerate corner
            inside = False
            for j in idx:
                if j in (i0, i1, i2): continue
                p = poly[j]
                if sgn * cross(a, b, p) >= 0 and sgn * cross(b, c, p) >= 0 and sgn * cross(c, a, p) >= 0:
                    inside = True; break
            if inside: continue
            tris.append((i0, i1, i2)); idx.pop(k); clipped = True; break
        if not clipped: return None  # not a simple polygon; leave it alone
    if len(idx) == 3: tris.append(tuple(idx))
    return tris


def _encloses(poly, pt):
    x, y = pt; inside = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i - 1], poly[i]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): inside = not inside
    return inside


def _loops(W, T, y_min, y_max):
    """Closed flat open-edge loops in a height band, with the triangles bordering each edge."""
    tri_n = np.cross(W[T[:, 1]] - W[T[:, 0]], W[T[:, 2]] - W[T[:, 0]])
    tri_n /= np.linalg.norm(tri_n, axis=1, keepdims=True) + 1e-12
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    owner = np.concatenate([np.arange(len(T))] * 3)
    es = np.sort(e, axis=1)
    u, inv, cnt = np.unique(es, axis=0, return_inverse=True, return_counts=True)
    is_open = cnt[inv] == 1
    adj, edge_tri = {}, {}
    for (a, b), t in zip(es[is_open], owner[is_open]):
        if not (y_min <= (W[a, 1] + W[b, 1]) / 2 <= y_max): continue
        adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a); edge_tri[(min(a, b), max(a, b))] = t
    out, seen = [], set()
    for start in list(adj):
        for nb in adj[start]:
            if (start, nb) in seen: continue
            loop = [start]; cur = nb; seen.add((start, nb)); seen.add((nb, start)); closed = False
            for _ in range(5000):
                loop.append(cur)
                nxt = [v for v in adj[cur] if (cur, v) not in seen]
                if not nxt: break
                v = nxt[0]; seen.add((cur, v)); seen.add((v, cur)); cur = v
                if cur == loop[0]: closed = True; break
            if not closed or len(loop) < 3: continue
            Q = W[loop]
            if np.ptp(Q[:, 1]) > 0.05: continue
            border = np.array([edge_tri[(min(loop[i], loop[(i + 1) % len(loop)]), max(loop[i], loop[(i + 1) % len(loop)]))] for i in range(len(loop))])
            out.append((Q, border))
    return out, tri_n


def _self_intersects(poly):
    """True if a closed polyline crosses itself (such outlines are left alone)."""
    a = poly; b = np.roll(poly, -1, axis=0); n = len(a)
    def orient(p, q, r):
        return np.sign((q[..., 0] - p[..., 0]) * (r[..., 1] - p[..., 1]) - (q[..., 1] - p[..., 1]) * (r[..., 0] - p[..., 0]))
    for i in range(n):
        j = np.arange(i + 2, n)
        if i == 0: j = j[j != n - 1]  # first and last segments share a point
        if not len(j): continue
        o1 = orient(a[i], b[i], a[j]); o2 = orient(a[i], b[i], b[j])
        o3 = orient(a[j], b[j], a[i][None]); o4 = orient(a[j], b[j], b[i][None])
        if np.any((o1 * o2 < 0) & (o3 * o4 < 0)): return True
    return False


def _triangulate_with_holes(outer, holes):
    """Triangulate a flat region (xz polygons) with gmsh; returns (V Nx2, F Mx3) or None."""
    if len(outer) < 3 or _self_intersects(outer) or any(_self_intersects(h) for h in holes):
        return None
    import gmsh
    started = gmsh.isInitialized()
    if not started: gmsh.initialize()
    gmsh.option.setNumber('General.Terminal', 0)
    gmsh.model.add('fill')
    try:
        def loop_tag(poly):
            pts = [gmsh.model.geo.addPoint(float(x), float(z), 0.0) for x, z in poly]
            lines = [gmsh.model.geo.addLine(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts))]
            return gmsh.model.geo.addCurveLoop(lines)
        tags = [loop_tag(outer)] + [loop_tag(h) for h in holes]
        gmsh.model.geo.addPlaneSurface(tags)
        gmsh.model.geo.synchronize()
        gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary', 1)
        gmsh.option.setNumber('Mesh.MeshSizeMax', 6.0)
        gmsh.model.mesh.generate(2)
        nt, xyz, _ = gmsh.model.mesh.getNodes()
        pos = {int(t): i for i, t in enumerate(nt)}
        V = xyz.reshape(-1, 3)[:, :2]
        et, _, en = gmsh.model.mesh.getElements(2)
        F = np.array([pos[int(n)] for n in en[0]], dtype=np.int64).reshape(-1, 3)
        return V, F
    except Exception:
        return None
    finally:
        gmsh.model.remove()
        if not started: gmsh.finalize()


def fill_flat_holes(P, I, y_min, y_max, report=print):
    """Rebuild flat faces lost to simplification. Returns (P_add float32, I_add uint32)."""
    W, T = _weld(P.astype(np.float64), I.astype(np.int64))
    loops, tri_n = _loops(W, T, y_min, y_max)
    tri_c = W[T].mean(1)
    info = []
    for Q, border in loops:
        poly = Q[:, [0, 2]]; c = poly.mean(0)
        side = np.abs(tri_n[border, 1]) < 0.9  # walls, chamfers, fillets: anything not in the plane
        kind = 'face-exists'  # bordered by in-plane triangles: a hole in an existing face
        if side.mean() >= 0.3:
            mid = (poly + np.roll(poly, -1, axis=0)) / 2
            outward = np.sum(tri_n[border][:, [0, 2]] * (mid - c), axis=1)
            facing_out = np.mean(outward[side] > 0)
            # side faces (walls or chamfers) facing away from the loop's centre bound a solid region
            # whose flat face is inside (the rest of such a border may run along surviving parts of
            # the same face); side faces facing the centre bound an opening (window, hole)
            if facing_out > 0.5: kind = 'pad'
            elif side.mean() >= 0.6: kind = 'opening'
        walls_above = np.mean(tri_c[border, 1] > Q[:, 1].mean()) > 0.5
        info.append(dict(Q=Q, poly=poly, y=Q[:, 1].mean(), kind=kind, up=not walls_above))
    out_P, out_I, filled, area_sum = [], [], 0, 0.0
    for k, L in enumerate(info):
        if L['kind'] != 'pad': continue
        holes = [H['poly'] for j, H in enumerate(info)
                 if j != k and abs(H['y'] - L['y']) < 0.05 and H['kind'] != 'pad' and _encloses(L['poly'], tuple(H['poly'][0]))]
        res = _triangulate_with_holes(L['poly'], holes)
        if res is None: continue
        V2, F = res
        V = np.column_stack([V2[:, 0], np.full(len(V2), L['y']), V2[:, 1]])
        n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
        if (n[:, 1].sum() > 0) != L['up']: F = F[:, ::-1]
        base = sum(len(p) for p in out_P)
        out_P.append(V.astype(np.float32)); out_I.append(F + base)
        filled += 1; area_sum += 0.5 * np.abs(n[:, 1]).sum()
    kinds = {kd: sum(1 for L in info if L['kind'] == kd) for kd in ('pad', 'opening', 'face-exists')}
    report(f'  floor repair: {len(info)} flat loops ({kinds}); rebuilt {filled} missing faces ({area_sum / 100:.1f} cm2)')
    if not out_P: return np.zeros((0, 3), np.float32), np.zeros((0, 3), np.uint32)
    return np.concatenate(out_P), np.concatenate(out_I).astype(np.uint32)


def window_walls(P, I, y_min, y_max, centre_tol=2.5, report=print):
    """Rebuild the missing side walls of through-openings in a flat plate.

    A window in the plate shows up as two closed, flat open-edge loops with about the same outline
    and area, one on the plate's bottom face and one on its top face (centres within a couple of mm;
    the window walls can be slanted). The triangles bordering them are not vertical walls, so the
    faces survived and the wall between them was lost. The wall is rebuilt as a ruled surface:
    both outlines are resampled to the same number of points by arc length, aligned, and stitched.
    Walls face into the opening."""
    W, T = _weld(P.astype(np.float64), I.astype(np.int64))
    tri_n = np.cross(W[T[:, 1]] - W[T[:, 0]], W[T[:, 2]] - W[T[:, 0]])
    tri_n /= np.linalg.norm(tri_n, axis=1, keepdims=True) + 1e-12
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    owner = np.concatenate([np.arange(len(T))] * 3)
    es = np.sort(e, axis=1)
    u, inv, cnt = np.unique(es, axis=0, return_inverse=True, return_counts=True)
    is_open = cnt[inv] == 1
    adj, edge_tri = {}, {}
    for (a, b), t in zip(es[is_open], owner[is_open]):
        if not (y_min <= (W[a, 1] + W[b, 1]) / 2 <= y_max): continue
        adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a); edge_tri[(min(a, b), max(a, b))] = t
    loops, seen = [], set()
    for start in list(adj):
        for nb in adj[start]:
            if (start, nb) in seen: continue
            loop = [start]; cur = nb; seen.add((start, nb)); seen.add((nb, start)); closed = False
            for _ in range(5000):
                loop.append(cur)
                nxt = [v for v in adj[cur] if (cur, v) not in seen]
                if not nxt: break
                v = nxt[0]; seen.add((cur, v)); seen.add((v, cur)); cur = v
                if cur == loop[0]: closed = True; break
            if not closed or len(loop) < 3: continue
            Q = W[loop]
            if np.ptp(Q[:, 1]) > 0.05: continue
            border = [edge_tri[(min(loop[i], loop[(i + 1) % len(loop)]), max(loop[i], loop[(i + 1) % len(loop)]))] for i in range(len(loop))]
            if np.mean(np.abs(tri_n[border, 1]) < 0.3) >= 0.6: continue  # walls survived: fill case, not this
            if _encloses(Q[:, [0, 2]], (0.0, 0.0)): continue
            loops.append(Q)

    def area2d(Q):
        x, z = Q[:, 0], Q[:, 2]
        return 0.5 * abs(np.sum(x * np.roll(z, -1) - np.roll(x, -1) * z))

    def resample(Q, n):
        closed = np.vstack([Q, Q[:1]])
        seg = np.linalg.norm(np.diff(closed, axis=0), axis=1); s = np.r_[0, np.cumsum(seg)]
        t = np.linspace(0, s[-1], n, endpoint=False)
        return np.stack([np.interp(t, s, closed[:, k]) for k in range(3)], axis=1)

    out_P, out_I, used, walls = [], [], set(), 0
    N = 64
    for i, A in enumerate(loops):
        if i in used: continue
        best = None
        for j, B in enumerate(loops):
            if j == i or j in used or abs(A[0, 1] - B[0, 1]) < 0.5: continue
            if abs(area2d(A) - area2d(B)) > 0.05 * max(area2d(A), area2d(B)): continue
            dc = np.linalg.norm(A[:, [0, 2]].mean(0) - B[:, [0, 2]].mean(0))
            if dc <= centre_tol and (best is None or dc < best[0]): best = (dc, j)
        if best is None: continue
        j = best[1]; B = loops[j]
        lo, hi = (A, B) if A[0, 1] < B[0, 1] else (B, A)
        a = resample(lo, N); b = resample(hi, N)
        # same winding, then the start offset that best lines the outlines up
        def signed(Q):
            x, z = Q[:, 0], Q[:, 2]; return np.sum(x * np.roll(z, -1) - np.roll(x, -1) * z)
        if np.sign(signed(a)) != np.sign(signed(b)): b = b[::-1]
        shift = min(range(N), key=lambda k: np.sum(np.linalg.norm(a[:, [0, 2]] - np.roll(b, -k, axis=0)[:, [0, 2]], axis=1)))
        b = np.roll(b, -shift, axis=0)
        q = []
        for s_ in range(N):
            t_ = (s_ + 1) % N
            q += [(s_, t_, N + t_), (s_, N + t_, N + s_)]
        q = np.array(q, dtype=np.int64); V = np.vstack([a, b])
        c = a[:, [0, 2]].mean(0)
        nrm = np.cross(V[q[:, 1]] - V[q[:, 0]], V[q[:, 2]] - V[q[:, 0]]); mid = V[q].mean(1)
        if np.sum(nrm[:, [0, 2]] * (c - mid[:, [0, 2]])) < 0: q = q[:, ::-1]
        base = sum(len(p) for p in out_P)
        out_P.append(V.astype(np.float32)); out_I.append(q + base)
        used.update((i, j)); walls += 1
    report(f'  floor repair: rebuilt the side walls of {walls} plate openings')
    if not out_P: return np.zeros((0, 3), np.float32), np.zeros((0, 3), np.uint32)
    return np.concatenate(out_P), np.concatenate(out_I).astype(np.uint32)
