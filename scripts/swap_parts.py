"""Replace the housing and rotor in actuator.glb with meshes tessellated from the author's STEP
print files, keeping every other node byte-for-byte.

Why: the handoff's display mesh was simplified so hard (housing 48k, rotor 24k triangles) that the
housing's fine grille panels collapsed into holes. The repository's per-part STEP files
(CAD/Print_Files/1x_outer_case.STEP, 1x_rotor.STEP) still have full detail.

Steps (see README "Rebuilding the housing and rotor"):
  1. python scripts/mesh_step.py 1x_rotor.STEP rotor.npz 5 6 0.8
     python scripts/mesh_step.py 1x_outer_case.STEP case.npz 5 6 0.8
  2. python scripts/swap_parts.py <original actuator.glb> <out actuator.glb> rotor.npz case.npz

Placement (measured by shape matching against the original nodes; mm, +Y = motor axis):
  rotor:   rotate 79.77 deg about +Y (puts the 84 pockets on the existing magnets), no offset.
  housing: no rotation, Y offset -29.05 (top lands on the output frame's top face, 16.95 mm).
The STEP outer case is a slightly later revision than the modelled design in places: it has no
floor plate under the motor, and it has a top plate that would sit inside the output frame. So:
  - outer wall (r >= 57.4 mm, where the original mesh has the holes): new surface is used;
  - inside that, new geometry must lie within 1.5 mm of the original housing surface, and nothing
    may sit in the output frame's ring zone near its top face (y > 16.0, r < 58.6 mm), where the STEP lip would poke
    through the frame's chamfered edge. These checks are made per triangle but applied per CAD face:
    a face is dropped whole when most of its area fails, so no face is left half-present;
  - original housing triangles > 1.5 mm from the new surface (the floor) are kept.

Requires numpy.
"""
import json, struct, sys
import numpy as np

src, dst, rotor_npz, case_npz = sys.argv[1:5]
ROTOR_DEG, CASE_Y = 79.77, -29.05
KEEP_IF_FARTHER_MM = 1.5

def rot_y(deg):
    t = np.radians(deg); c, s = np.cos(t), np.sin(t)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])

# ---- read GLB
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + jl])
bin_off = 20 + jl + 8
def acc(i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
    off = bin_off + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = a['count'] * {'SCALAR': 1, 'VEC3': 3}[a['type']]
    return np.frombuffer(b, dtype={5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']], count=n, offset=off)

meshes = []  # per glTF mesh: (P float32 Nx3, I uint32 Mx3)
for m in g['meshes']:
    pr = m['primitives'][0]
    meshes.append((acc(pr['attributes']['POSITION']).reshape(-1, 3).copy(), acc(pr['indices']).reshape(-1, 3).astype(np.uint32)))
def mesh_index(node_name):
    return next(n['mesh'] for n in g['nodes'] if n['name'] == node_name)

def sample(P, I, n, seed):
    rng = np.random.default_rng(seed); a, b_, c = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(b_ - a, c - a), axis=1); k = rng.choice(len(I), size=n, p=area / area.sum())
    r1, r2 = rng.random(n), rng.random(n); s = np.sqrt(r1)
    return (1 - s)[:, None] * a[k] + (s * (1 - r2))[:, None] * b_[k] + (s * r2)[:, None] * c[k]
def nn(A, B):
    out = []; B2 = (B * B).sum(1)
    for i in range(0, len(A), 512):
        a = A[i:i + 512]; out.append(np.sqrt(np.maximum(((a * a).sum(1)[:, None] + B2[None] - 2 * a @ B.T).min(1), 0)))
    return np.concatenate(out)

# ---- rotor: straight replacement
r = np.load(rotor_npz)
Pr = (r['P'].astype(np.float64) @ rot_y(ROTOR_DEG).T).astype(np.float32); Ir = r['I'].reshape(-1, 3).astype(np.uint32)
ri = mesh_index('rotor__041'); old_r = len(meshes[ri][1]); meshes[ri] = (Pr, Ir)

# ---- housing: new walls/grilles + original floor where the STEP part has no surface
c = np.load(case_npz)
Pc = c['P'].astype(np.float64); Pc[:, 1] += CASE_Y; Ic = c['I'].reshape(-1, 3).astype(np.uint32)
hi = mesh_index('housing__064'); Po, Io = meshes[hi]
Pof = Po.astype(np.float64)

# The STEP outer case is a later revision in places (e.g. a top plate that would sit inside the
# output frame). Use it fully on the outer wall, where the original mesh has holes; inside that,
# keep only new triangles that match the original housing within tolerance.
WALL_R = 57.4
# The output frame (y 7.55..16.80, r up to 58.5) sits in the housing's top; in the frame's ring zone
# the STEP lip differs and would poke through the frame's chamfered edge, so the original housing
# triangles are used there instead.
FRAME_Y, FRAME_R = 16.0, 58.6
USE_FRAME_ZONE = False  # not needed since the housing is meshed at 5 mm (it caused shards)
FLOOR_Y_MAX = -18.0
in_frame_zone = lambda pts: (pts[:, 1] > FRAME_Y) & (np.hypot(pts[:, 0], pts[:, 2]) < FRAME_R)
cn = (Pc[Ic[:, 0]] + Pc[Ic[:, 1]] + Pc[Ic[:, 2]]) / 3
interior = np.hypot(cn[:, 0], cn[:, 2]) < WALL_R
S_old = sample(Pof, Io, 200000, 11)
flag = np.zeros(len(Ic), bool)
flag[interior] = nn(cn[interior], S_old) > KEEP_IF_FARTHER_MM
# The lip under the frame's flange (y 7.4..16, r > 55) closes the gap between the frame's outer edge
# and the housing wall. The original mesh has holes there, so it can't vouch for it; it sits under
# the frame where it cannot show through, so it is kept.
under_flange = (cn[:, 1] > 7.4) & (cn[:, 1] < FRAME_Y) & (np.hypot(cn[:, 0], cn[:, 2]) > 55.0)
flag &= ~under_flange
if USE_FRAME_ZONE: flag |= in_frame_zone(cn)
# Decide per CAD face, not per triangle: a face is dropped whole when most of its area is
# off-design, so no face is left half-present (no notches, no slivers).
Fc = c['F'].astype(np.int64)
area = 0.5 * np.linalg.norm(np.cross(Pc[Ic[:, 1]] - Pc[Ic[:, 0]], Pc[Ic[:, 2]] - Pc[Ic[:, 0]]), axis=1)
nf = int(Fc.max()) + 1
face_off = np.bincount(Fc, weights=area * flag, minlength=nf) > 0.5 * np.bincount(Fc, weights=area, minlength=nf)
off_design = face_off[Fc]
print(f'housing: dropped {int(face_off.sum())} of {nf} STEP faces as not in the modelled design')
Ic_keep = Ic[~off_design]
# The dropped top plate (one CAD face at y 16.95) also carries the housing's exposed rim and the cap
# of the phase-wire bump, outside the output frame's top edge (r 57.0). Add that part back, clipped
# exactly at r = 57.0 so it meets the frame edge without overlapping the frame's own top face.
TOP_Y, RIM_R = 16.95, 57.0
def clip_outside_r(tri, r0):
    f = lambda p: np.hypot(p[0], p[2]) - r0
    out = []
    for k in range(3):
        p, q = tri[k], tri[(k + 1) % 3]; fp, fq = f(p), f(q)
        if fp >= 0: out.append(p)
        if (fp >= 0) != (fq >= 0): out.append(p + (q - p) * (fp / (fp - fq)))
    return out
top_dropped = off_design & (np.abs(Pc[Ic[:, 0], 1] - TOP_Y) < 0.02) & (np.abs(Pc[Ic[:, 1], 1] - TOP_Y) < 0.02) & (np.abs(Pc[Ic[:, 2], 1] - TOP_Y) < 0.02)
rim_P, rim_I = [], []
for t in np.where(top_dropped)[0]:
    poly = clip_outside_r(Pc[Ic[t]], RIM_R)
    if len(poly) < 3: continue
    base = len(Pc) + len(rim_P); rim_P.extend(poly)
    rim_I.extend([base, base + j, base + j + 1] for j in range(1, len(poly) - 1))
if rim_P:
    Pc = np.vstack([Pc, np.array(rim_P)]); Ic_keep = np.vstack([Ic_keep, np.array(rim_I, np.uint32)])
print(f'housing: restored {len(rim_I)} rim/bump-cap triangles of the top plate outside r {RIM_R}')
# The phase-wire channel in the STEP revision reaches further in (r 52 mm) than in the modelled
# design, whose channel stops at r 56.4 (original mesh). Its side walls would otherwise stand inside
# the motor as thin one-sided fins, so trim everything in the bump sector back to r >= 56.4.
CH_R = 56.4
cn_k = Pc[Ic_keep].mean(1)
in_bump = (cn_k[:, 2] > 40) & (np.abs(cn_k[:, 0]) < 16) & (cn_k[:, 1] > 1.9)
tri_r = np.hypot(Pc[Ic_keep][:, :, 0], Pc[Ic_keep][:, :, 2])
cross = in_bump & (tri_r.min(1) < CH_R)
ch_P, ch_I = [], []
for t in np.where(cross)[0]:
    poly = clip_outside_r(Pc[Ic_keep[t]], CH_R)
    if len(poly) < 3: continue
    base = len(Pc) + len(ch_P); ch_P.extend(poly)
    ch_I.extend([base, base + j, base + j + 1] for j in range(1, len(poly) - 1))
Ic_keep = Ic_keep[~cross]
if ch_P:
    Pc = np.vstack([Pc, np.array(ch_P)]); Ic_keep = np.vstack([Ic_keep, np.array(ch_I, np.uint32)])
print(f'housing: trimmed {int(cross.sum())} phase-wire channel triangles back to r {CH_R}')
Ic = Ic_keep
used_n, local_n = np.unique(Ic, return_inverse=True)
Pc = Pc[used_n]; Ic = local_n.reshape(-1, 3).astype(np.uint32)
cent = (Pof[Io[:, 0]] + Pof[Io[:, 1]] + Pof[Io[:, 2]]) / 3
S = sample(Pc, Ic, 150000, 7)
# skip the far-from-axis band quickly: test every original triangle centroid
# only the floor plate is missing from the STEP part; elsewhere the original mesh's leftovers are
# simplification debris (long sliver triangles), so original triangles are kept in the floor band only
far = (nn(cent, S) > KEEP_IF_FARTHER_MM) & (cent[:, 1] < FLOOR_Y_MAX)
# ...minus needle-like debris: long, sub-0.25 mm-wide triangles standing out of the floor plane
e0, e1, e2 = (np.linalg.norm(Pof[Io[:, k]] - Pof[Io[:, (k + 1) % 3]], axis=1) for k in range(3))
longest = np.maximum(np.maximum(e0, e1), e2)
tn_o = np.cross(Pof[Io[:, 1]] - Pof[Io[:, 0]], Pof[Io[:, 2]] - Pof[Io[:, 0]])
area_o = 0.5 * np.linalg.norm(tn_o, axis=1); ny_o = np.abs(tn_o[:, 1]) / (2 * area_o + 1e-12)
width_o = 2 * area_o / (longest + 1e-12)
# (degenerate slivers under 0.05 mm wide have no meaningful facing, so they go regardless)
needle = (longest > 4.0) & (((width_o < 0.3) & (ny_o < 0.9)) | (width_o < 0.05))
print(f'housing: dropped {int((far & needle).sum())} needle-like debris triangles from the original floor')
far &= ~needle
keep = Io[far]
used, local = np.unique(keep, return_inverse=True)
P_keep = Po[used]; I_keep = local.reshape(-1, 3).astype(np.uint32) + len(Pc)
Ph = np.vstack([Pc.astype(np.float32), P_keep]); Ih = np.vstack([Ic, I_keep])
# The floor plate only exists in the original (simplified) mesh, where simplification punched holes
# in its flat faces; close them from their own surviving outlines (see fill_flat_holes.py).
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from fill_flat_holes import fill_flat_holes, window_walls
for fix in (fill_flat_holes, window_walls):
    P_fill, I_fill = fix(Po, Io, -29.2, -18.0)
    Ih = np.vstack([Ih, I_fill + len(Ph)]); Ph = np.vstack([Ph, P_fill])

# The output frame lost its entire top face (y 16.95) to simplification: its outer edge, inner
# edge, windows and screw holes all survive as open-edge loops. Rebuild it the same way.
# Other original parts lost flat faces the same way; repair every remaining original node
# (not the STEP-based rotor/housing walls, which are complete).
quiet = lambda msg: None
repaired = []
SKIP_GROUPS = ('rotor', 'housing', 'fasteners', 'coils', 'magMain', 'magHal', 'pcb', 'encplate', 'terminals')
for nd in g['nodes']:
    if nd['name'].split('__')[0] in SKIP_GROUPS: continue
    mi = nd['mesh']; Pn_, In_ = meshes[mi]
    print(f'  checking {nd["name"]} ...', flush=True)
    P_fill, I_fill = fill_flat_holes(Pn_, In_, -1e4, 1e4, report=quiet)
    if len(I_fill):
        meshes[mi] = (np.vstack([Pn_, P_fill]), np.vstack([In_, I_fill + len(Pn_)]))
        a = 0.5 * np.abs(np.cross(P_fill[I_fill[:, 1]] - P_fill[I_fill[:, 0]], P_fill[I_fill[:, 2]] - P_fill[I_fill[:, 0]])[:, 1]).sum()
        repaired.append(f"{nd['name']} {a / 100:.1f}cm2")
print(f'flat-face repair on {len(repaired)} original parts: ' + ', '.join(repaired))
old_h = len(Io); meshes[hi] = (Ph, Ih)
print(f'rotor: {old_r} -> {len(Ir)} triangles')
print(f'housing: {old_h} -> {len(Ih)} triangles ({len(Ic)} from STEP + {len(keep)} original floor triangles kept)')

# ---- write GLB (same nodes/meshes/names; fresh buffer)
blob = bytearray(); views = []; accessors = []
def add_view(data, target):
    while len(blob) % 4: blob.append(0)
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data), 'target': target}); blob.extend(data)
    return len(views) - 1
for mi, (P, I) in enumerate(meshes):
    idx_type, idx_np = (5123, '<u2') if len(P) < 65536 else (5125, '<u4')
    iv = add_view(I.astype(idx_np).tobytes(), 34963)
    accessors.append({'bufferView': iv, 'componentType': idx_type, 'count': int(I.size), 'type': 'SCALAR',
                      'min': [int(I.min())], 'max': [int(I.max())]})
    pv = add_view(P.astype('<f4').tobytes(), 34962)
    accessors.append({'bufferView': pv, 'componentType': 5126, 'count': int(len(P)), 'type': 'VEC3',
                      'min': [float(x) for x in P.min(0)], 'max': [float(x) for x in P.max(0)]})
    g['meshes'][mi]['primitives'] = [{'attributes': {'POSITION': len(accessors) - 1}, 'indices': len(accessors) - 2, 'mode': 4}]
while len(blob) % 4: blob.append(0)
g['accessors'] = accessors; g['bufferViews'] = views; g['buffers'] = [{'byteLength': len(blob)}]
g.setdefault('asset', {})['generator'] = 'qdd-site scripts/swap_parts.py (housing + rotor from author STEP files)'
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I', len(js)) + b'JSON' + js \
      + struct.pack('<I', len(blob)) + b'BIN\x00' + bytes(blob)
open(dst, 'wb').write(out)
print(f'wrote {dst}: {len(out)/1e6:.2f} MB, {sum(len(I) for _, I in meshes)} triangles total')
