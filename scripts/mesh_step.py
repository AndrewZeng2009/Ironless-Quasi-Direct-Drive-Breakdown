"""Tessellate a STEP file with gmsh into a triangle mesh suitable for the web viewer.

- Each CAD face becomes its own patch (vertices not shared across faces), so normals computed
  in the browser stay smooth within a face and sharp across edges, like Fusion's display mesh.
- Triangles are oriented outward using gmsh's oriented volume boundaries (the viewer shades
  back faces as section-cut faces, so winding matters).

Usage: python mesh_step.py <in.step> <out.npz> [size_max_mm] [curv_elems_per_2pi] [size_min_mm] [--info]
"""
import sys
import numpy as np
import gmsh

info_only = '--info' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
src, out = args[0], args[1]
size_max = float(args[2]) if len(args) > 2 else 4.0
curv = float(args[3]) if len(args) > 3 else 12
size_min = float(args[4]) if len(args) > 4 else 0.25

gmsh.initialize()
gmsh.option.setNumber('General.Terminal', 0)
gmsh.option.setString('Geometry.OCCTargetUnit', 'MM')
gmsh.model.occ.importShapes(src)
gmsh.model.occ.synchronize()
vols = gmsh.model.getEntities(3)
surfs = gmsh.model.getEntities(2)
bb = gmsh.model.getBoundingBox(-1, -1)
print(f'{src.split(chr(92))[-1]}: volumes={len(vols)} faces={len(surfs)} bbox_mm=({bb[0]:.1f},{bb[1]:.1f},{bb[2]:.1f})-({bb[3]:.1f},{bb[4]:.1f},{bb[5]:.1f})')
if info_only:
    gmsh.finalize(); sys.exit(0)

# orientation of each face relative to its volume (negative = reversed)
sign = {}
for v in vols:
    for d, t in gmsh.model.getBoundary([v], oriented=True, combined=False):
        sign[abs(t)] = 1 if t > 0 else -1

gmsh.option.setNumber('Mesh.MeshSizeMax', size_max)
gmsh.option.setNumber('Mesh.MeshSizeMin', size_min)
gmsh.option.setNumber('Mesh.MeshSizeFromCurvature', curv)
gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary', 1)
gmsh.option.setNumber('Mesh.Algorithm', 6)  # Frontal-Delaunay for 2D
gmsh.model.mesh.generate(2)

node_tags, coords, _ = gmsh.model.mesh.getNodes()
pos = {int(t): i for i, t in enumerate(node_tags)}
coords = coords.reshape(-1, 3)
vol_tag = vols[0][1]

# --- collect each CAD face's triangles (gmsh node indices; boundaries shared between faces)
patches = []
for d, s in surfs:
    etypes, _, enodes = gmsh.model.mesh.getElements(d, s)
    tris = [np.array([pos[int(n)] for n in en], dtype=np.int64).reshape(-1, 3) for et, en in zip(etypes, enodes) if et == 2]
    if tris: patches.append(np.concatenate(tris))

# --- orient patches consistently: two neighbouring patches agree when they traverse their shared
# edge in opposite directions. Propagate flips across the patch graph (breadth-first).
edge_owner = {}  # directed edge (a, b) -> patch index
for pi, tri in enumerate(patches):
    for a, b_ in ((0, 1), (1, 2), (2, 0)):
        for u, v in zip(tri[:, a], tri[:, b_]):
            edge_owner.setdefault((int(u), int(v)), []).append(pi)
nbr = [dict() for _ in patches]  # patch -> {neighbour: +1 same-direction edges seen / -1 opposite}
for (u, v), owners in edge_owner.items():
    rev = edge_owner.get((v, u), [])
    for p in owners:
        for q in owners:
            if q != p: nbr[p][q] = nbr[p].get(q, 0) + 1   # same direction -> must flip one of them
        for q in rev:
            if q != p: nbr[p][q] = nbr[p].get(q, 0) - 1   # opposite -> consistent
flip = [None] * len(patches); unsure = 0
for start in range(len(patches)):
    if flip[start] is not None: continue
    flip[start] = False; queue = [start]
    while queue:
        p = queue.pop()
        for q, score in nbr[p].items():
            if score == 0: unsure += 1; continue
            want = flip[p] if score < 0 else (not flip[p])
            if flip[q] is None: flip[q] = want; queue.append(q)

P_all, I_all, base, flipped = [], [], 0, 0
for tri, f in zip(patches, flip):
    if f: tri = tri[:, ::-1]; flipped += 1
    used, local = np.unique(tri, return_inverse=True)
    P_all.append(coords[used]); I_all.append(local.reshape(-1, 3) + base); base += len(used)
P = np.concatenate(P_all).astype(np.float32); I = np.concatenate(I_all).astype(np.uint32)
# signed volume: positive when the triangles face outward
v0, v1, v2 = P[I[:, 0]].astype(np.float64), P[I[:, 1]].astype(np.float64), P[I[:, 2]].astype(np.float64)
vol = np.einsum('ij,ij->i', v0, np.cross(v1, v2)).sum() / 6.0
if vol < 0:  # whole part came out inside-out: flip everything
    I = I[:, ::-1].copy(); vol = -vol
occ_vol = gmsh.model.occ.getMass(3, vol_tag)
print(f'  mesh: {len(I)} triangles, {len(P)} vertices, faces flipped={flipped}, unsure={unsure}, '
      f'signed volume={vol/1000:.2f} cm3 (CAD solid: {occ_vol/1000:.2f} cm3)')
np.savez_compressed(out, P=P, I=I)
gmsh.finalize()
