"""Replace the housing and rotor in actuator.glb with meshes tessellated from the author's STEP
print files, keeping every other node byte-for-byte.

Why: the handoff's display mesh was simplified so hard (housing 48k, rotor 24k triangles) that the
housing's fine grille panels collapsed into holes. The repository's per-part STEP files
(CAD/Print_Files/1x_outer_case.STEP, 1x_rotor.STEP) still have full detail.

Steps (see README "Rebuilding the housing and rotor"):
  1. python scripts/mesh_step.py 1x_rotor.STEP rotor.npz 14 4 0.8
     python scripts/mesh_step.py 1x_outer_case.STEP case.npz 14 4 0.8
  2. python scripts/swap_parts.py <original actuator.glb> <out actuator.glb> rotor.npz case.npz

Placement (measured by shape matching against the original nodes; mm, +Y = motor axis):
  rotor:   rotate 79.77 deg about +Y (puts the 84 pockets on the existing magnets), no offset.
  housing: no rotation, Y offset -29.05 (top lands on the output frame's top face, 16.95 mm).
The STEP outer case is a slightly later revision than the modelled design in places: it has no
floor plate under the motor, and it has a top plate that would sit inside the output frame. So:
  - outer wall (r >= 57.4 mm, where the original mesh has the holes): new surface is used;
  - inside that, new triangles are kept only within 1.5 mm of the original housing surface;
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
cn = (Pc[Ic[:, 0]] + Pc[Ic[:, 1]] + Pc[Ic[:, 2]]) / 3
interior = np.hypot(cn[:, 0], cn[:, 2]) < WALL_R
S_old = sample(Pof, Io, 200000, 11)
off_design = np.zeros(len(Ic), bool)
off_design[interior] = nn(cn[interior], S_old) > KEEP_IF_FARTHER_MM
Ic = Ic[~off_design]
used_n, local_n = np.unique(Ic, return_inverse=True)
Pc = Pc[used_n]; Ic = local_n.reshape(-1, 3).astype(np.uint32)
print(f'housing: dropped {off_design.sum()} STEP triangles inside r<{WALL_R} mm that are not in the modelled design')
cent = (Pof[Io[:, 0]] + Pof[Io[:, 1]] + Pof[Io[:, 2]]) / 3
S = sample(Pc, Ic, 150000, 7)
# skip the far-from-axis band quickly: test every original triangle centroid
far = nn(cent, S) > KEEP_IF_FARTHER_MM
keep = Io[far]
used, local = np.unique(keep, return_inverse=True)
P_keep = Po[used]; I_keep = local.reshape(-1, 3).astype(np.uint32) + len(Pc)
Ph = np.vstack([Pc.astype(np.float32), P_keep]); Ih = np.vstack([Ic, I_keep])
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
