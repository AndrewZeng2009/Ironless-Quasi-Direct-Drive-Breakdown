import json,numpy as np,trimesh
g=np.load('geo.npz'); parts=json.load(open('build/parts.json'))
def tm(q):
    P=g[f"p{q['b']}"] if False else None
mesh_cache={}
def world_mesh(q):
    # full-res geometry from geo.npz uses body index directly
    P=g[f"p{q['b']}"].astype(float); I=g[f"i{q['b']}"].reshape(-1,3)
    M=np.array(q['M']); P=P@M[:3,:3].T+M[:3,3]
    m=trimesh.Trimesh(P,I,process=True)
    return m
def section_paths(m,y):
    s=m.section(plane_origin=[0,y,0],plane_normal=[0,1,0])
    if s is None: return []
    out=[]
    for ent in s.entities:
        pts=s.vertices[ent.points]
        out.append(pts[:,[0,2]]*10.0)  # mm, (x,z)
    # merge to closed loops via discrete
    try:
        loops=[np.asarray(d)[:,[0,2]]*10.0 for d in s.discrete]
        return loops
    except Exception: return out
from shapely.geometry import LineString
def rdp(pts,eps):
    return np.asarray(LineString(pts).simplify(eps,preserve_topology=False).coords)
def to_path(loops,eps=0.03,cx=0,cy=0):
    s=[]
    for L in loops:
        L=np.asarray(L)
        if len(L)<3: continue
        L2=rdp(np.vstack([L,L[:1]]),eps)[:-1] if len(L)>8 else L
        s.append('M'+' L'.join(f'{x-cx:.2f} {y-cy:.2f}' for x,y in L2)+'Z')
    return ''.join(s)
out={}
sel=lambda grp: [q for q in parts if q['group']==grp]
Y=0.3
# gearbox
out['sun']=to_path(section_paths(world_mesh(sel('sun')[0]),Y))
pl=sel('planets'); out['planets']=[]
for q in pl:
    M=np.array(q['M']); cx,cy=M[0,3]*10,M[2,3]*10
    out['planets'].append({'cx':round(cx,3),'cy':round(cy,3),'d':to_path(section_paths(world_mesh(q),Y),cx=cx,cy=cy)})
ring=[q for q in sel('ring') if q['ey']>0][0]
out['ring']=to_path(section_paths(world_mesh(ring),Y))
# carrier plate outline at y=0.6 (top plate) for context? use bottom plate y=-0.8
cb=[q for q in sel('carrier') if q['ey']==-3.0][0]
out['carrier']=to_path(section_paths(world_mesh(cb),-0.8),eps=0.05)
pb=sel('pbearings')
# pins at y=0.3
out['pins']=to_path(sum([section_paths(world_mesh(q),Y) for q in sel('pins') if q['ey']==2.4],[]))
# motor slice at y=0
Ym=0.0
out['stator']=to_path(section_paths(world_mesh(sel('stator')[0]),Ym),eps=0.02)
# coils: use first coil mesh rotated (from parts) - full res body = coil0 rotated
coil_loops=[]
for q in sel('coils'): coil_loops+=section_paths(world_mesh(q),Ym)
from shapely.geometry import MultiPoint
hulls=[]
for L in coil_loops:
    L=np.asarray(L)
    if len(L)<3: continue
    h=MultiPoint([tuple(p) for p in L]).convex_hull
    if h.geom_type=='Polygon' and h.area>0.5: hulls.append(np.asarray(h.exterior.coords)[:-1])
out['coils']=to_path(hulls,eps=0.05)
print('coil hulls',len(hulls))
mm=[];mh=[]
for q in sel('magMain'): mm.append((q,section_paths(world_mesh(q),Ym)))
for q in sel('magHal'): mh.append((q,section_paths(world_mesh(q),Ym)))
def magdata(lst,kind):
    res=[]
    for q,loops in lst:
        L=np.vstack(loops); c=L.mean(0); ang=float(np.degrees(np.arctan2(c[1],c[0])))
        res.append({'d':to_path(loops,eps=0.01),'cx':round(float(c[0]),2),'cy':round(float(c[1]),2),'a':round(ang,2),'r':round(float(np.hypot(*c)),3),'rin':round(float(np.min(np.hypot(L[:,0],L[:,1]))),3),'rout':round(float(np.max(np.hypot(L[:,0],L[:,1]))),3)})
    res.sort(key=lambda m:m['a'])
    return res
out['magMain']=magdata(mm,'main'); out['magHal']=magdata(mh,'hal')
rl=[]
for yy in (0.0,-0.2,-0.4,0.2):
    rl=section_paths(world_mesh(sel('rotor')[0]),yy)
    if rl: print('rotor slice at',yy); break
out['rotor']=to_path(rl,eps=0.03)
hs=[q for q in sel('housing')][0]
out['housing']=to_path(section_paths(world_mesh(hs),Ym),eps=0.04)
# radii
S=np.vstack(section_paths(world_mesh(sel('stator')[0]),Ym)); rs=np.hypot(S[:,0],S[:,1])
print('stator r',rs.min().round(3),rs.max().round(3))
print('main mag rin',min(m['rin'] for m in out['magMain']),'hal rin',min(m['rin'] for m in out['magHal']),'main rout',max(m['rout'] for m in out['magMain']))
json.dump(out,open('build/slices.json','w'))
print({k:(len(v) if isinstance(v,str) else len(v)) for k,v in out.items()})
