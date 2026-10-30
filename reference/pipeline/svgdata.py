import json,numpy as np
from shapely.geometry import Polygon
s=json.load(open('build/slices.json')); parts=json.load(open('build/parts.json'))
import re
def parse(d):
    loops=[]
    for seg in d.split('Z'):
        if not seg.strip(): continue
        pts=[tuple(map(float,p.strip().split())) for p in seg.replace('M','').split('L')]
        loops.append(np.array(pts))
    return loops
def simp(d,eps):
    out=[]
    for L in parse(d):
        if len(L)<4: continue
        P=Polygon(L).simplify(eps,preserve_topology=True)
        if P.is_empty: continue
        c=np.asarray(P.exterior.coords)[:-1]
        out.append('M'+' '.join(f'{x:.2f},{y:.2f}' for x,y in c)+'Z')
    return ''.join(out)
res={}
res['sun']=simp(s['sun'],0.03); res['ring']=simp(s['ring'],0.04)
res['planets']=[{'cx':p['cx'],'cy':p['cy'],'d':simp(p['d'],0.03)} for p in s['planets']]
res['carrier']=simp(s['carrier'],0.08); res['pins']=simp(s['pins'],0.05)
res['stator']=simp(s['stator'],0.05); res['housing']=simp(s['housing'],0.1)
# coils: hull loops; group by nearest coil angle; take loops of coil 0 (angle closest to -90)
loops=parse(s['coils']); cents=[L.mean(0) for L in loops]; angs=[np.degrees(np.arctan2(c[1],c[0])) for c in cents]
coils=[q for q in parts if q['group']=='coils']; ca=sorted([q['extra']['angle'] for q in coils])
a0=min(ca,key=lambda a:abs(a+89.76))
sel=[L for L,a in zip(loops,angs) if abs(((a-a0+180)%360)-180)<5.5]
res['coil0']='' .join('M'+' '.join(f'{x:.2f},{y:.2f}' for x,y in Polygon(L).simplify(0.05).exterior.coords[:-1])+'Z' for L in sel)
res['coilAngles']=[round(a-a0,2) for a in ca]; res['coilA0']=a0
res['mainA']=[m['a'] for m in s['magMain']]; res['halA']=[m['a'] for m in s['magHal']]
res['mainR']=[min(m['rin'] for m in s['magMain']),max(m['rout'] for m in s['magMain'])]
res['halR']=[min(m['rin'] for m in s['magHal']),max(m['rout'] for m in s['magHal'])]
json.dump(res,open('build/svgdata.json','w'))
for k,v in res.items(): print(k, len(v) if isinstance(v,(str,list)) else v)
print('coil loops sel',len(sel))
