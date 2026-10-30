import json,numpy as np,base64
d=np.load('build/dec.npz'); s=json.load(open('test/scene.json')); PL=json.load(open('test/placements.json'))
W=s['worlds']
def M4(p): return np.array(p['M'],float).reshape(4,4).T
def mesh(w,b): return d[f'{w}__{b}__P'],d[f'{w}__{b}__N'],d[f'{w}__{b}__F']
WID={ 'rotorasm':'00000208C1094878','clam':'00000208C74765D8','carrier':'00000208C83602D8','sun':'00000208C9BCF438','planet':'00000208C9B128F8',
 'pbear':'00000208C9A82B78','insM3':'00000208C978F9D8','insM4':'00000208CAD56E98','m2x25':'00000208CB468698','m2nut':'00000208CB3B5E58',
 'm25cs':'00000208CB329E58','insM25':'00000208CB2A2C18','m3x6':'00000208CBDF0D78','b6710':'00000208CBCF6498','b6805':'00000208CBC9DDB8',
 'spacer':'00000208CCC256D8','shoulder':'00000208CCBD9EF8','m4wash':'00000208CC8DAC18','m4nut':'00000208CC8D8418','housing':'00000208CC834378',
 'pcb':'00000208D10A42D8','xt30':'00000208D504A7B8','encoder':'00000208D5B08F58','ctrlplate':'00000208CB0198'}
WID['ctrlplate']='00000208CB0198'
inv={v:k for k,v in WID.items()}
FAST={'insM3','insM4','m2x25','m2nut','m25cs','insM25','m3x6'}
# ---- build part list: (group, kin, explode_y, worldkey, body, M)
parts=[]
def add(group,kin,ey,w,b,M,extra=None):
    parts.append(dict(group=group,kin=kin,ey=ey,w=w,b=b,M=M,extra=extra or {}))
# root: stator + coils (dedupe coils to coil0 rotated)
rootb=W['ROOT']
coil0=rootb[0]; P0=d[f'ROOT__{coil0}__P']; c0=P0.mean(0); a0=np.arctan2(c0[2],c0[0])
for b in rootb:
    P=d[f'ROOT__{b}__P']
    if len(d[f'ROOT__{b}__F'])>9000 and b==rootb[36] or b==rootb[-1] and len(P)>9000 and False: pass
for i,b in enumerate(rootb):
    P=d[f'ROOT__{b}__P']
    if i==36:
        add('stator','static',0,'ROOT',b,np.eye(4)); continue
    c=P.mean(0); th=np.arctan2(c[2],c[0])-a0
    R=np.eye(4); R[0,0]=np.cos(th); R[0,2]=-np.sin(th); R[2,0]=np.sin(th); R[2,2]=np.cos(th)
    add('coils','static',0,'ROOT',coil0,R,{'coilIndex':i,'angle':float(np.degrees(np.arctan2(c[2],c[0])))})
# placements by world
byw={}
for p in PL:
    if p['world']=='ROOT': continue
    byw.setdefault(p['world'],[]).append(p)
w=WID['rotorasm']; p=byw[w][0]; M=M4(p)
for b in W[w]:
    P=d[f'{w}__{b}__P']
    if len(P)>5000: add('rotor','input',-5.0,w,b,M); continue
    c=P.mean(0); ang=np.arctan2(c[2],c[0]); t=np.array([-np.sin(ang),0,np.cos(ang)])
    tw=np.ptp((P-c)@t)
    add('magMain' if tw>0.4 else 'magHal','input',-5.0,w,b,M,{'angle':float(np.degrees(ang))})
w=WID['clam']; M=M4(byw[w][0]); b=W[w]
add('frame','static',7.0,w,b[0],M); add('retainer','static',-4.6,w,b[1],M); add('ring','static',1.8,w,b[2],M,{'half':'top'}); add('ring','static',-1.8,w,b[3],M,{'half':'bottom'})
w=WID['carrier']; M=M4(byw[w][0]); b=W[w]
# b order: 126 plate top,127-132 washers,133-135 pins,136-138 spacers,139 plate bottom,140-142 dowels
add('carrier','carrier',3.6,w,b[0],M)
for bb in b[1:7]:
    P=d[f'{w}__{bb}__P']; y=(P@M[:3,:3].T+M[:3,3])[:,1].mean()
    add('pins','carrier',1.0 if y>0 else -1.0,w,bb,M,{'kind':'washer'})
for bb in b[7:10]: add('pins','carrier',2.4,w,bb,M,{'kind':'pin'})
for bb in b[10:13]: add('carrier','carrier',3.6,w,bb,M,{'kind':'spacer'})
add('carrier','carrier',-3.0,w,b[13],M)
for bb in b[14:17]: add('carrier','carrier',3.6,w,bb,M,{'kind':'dowel'})
w=WID['sun']; add('sun','input',-1.7,w,W[w][0],M4(byw[w][0]))
for i,p in enumerate(byw[WID['planet']]): add('planets','planet',0,WID['planet'],W[WID['planet']][0],M4(p),{'planet':i})
for p in byw[WID['pbear']]: add('pbearings','carrier',0,WID['pbear'],W[WID['pbear']][0],M4(p))
for p in byw[WID['b6710']]:
    M=M4(p); y=M[1,3]; add('b6710','static',5.6 if y>0 else -4.2,WID['b6710'],W[WID['b6710']][0],M)
for p in byw[WID['b6805']]:
    M=M4(p); y=M[1,3]; add('b6805','static',5.0 if y>0 else -3.6,WID['b6805'],W[WID['b6805']][0],M)
add('axle','static',6.2,WID['spacer'],W[WID['spacer']][0],M4(byw[WID['spacer']][0]),{'kind':'spacer'})
add('axle','static',10.0,WID['shoulder'],W[WID['shoulder']][0],M4(byw[WID['shoulder']][0]),{'kind':'bolt'})
add('axle','static',-6.0,WID['m4wash'],W[WID['m4wash']][0],M4(byw[WID['m4wash']][0]),{'kind':'washer'})
add('axle','static',-6.6,WID['m4nut'],W[WID['m4nut']][0],M4(byw[WID['m4nut']][0]),{'kind':'nut'})
w=WID['housing']; M=M4(byw[w][0]); add('housing','static',-9.5,w,W[w][0],M); add('cover','static',-17.0,w,W[w][1],M)
add('xt30','static',-17.0,WID['xt30'],W[WID['xt30']][0],M4(byw[WID['xt30']][0]))
w=WID['encoder']
for bb in W[w]: add('encoder','input',-7.2,w,bb,M4(byw[w][0]))
# controller: everything else in placements with inst 75..102 not yet used
used={'ROOT'}|set(WID.values())
for p in PL:
    wk=p['world']
    if wk in used or wk=='ROOT': continue
    if wk.endswith('CB0198'): 
        for bb in W[wk]: add('pcb','static',-12.4,wk,bb,M4(p),{'kind':'plate'})
        continue
    k=p['inst']
    ey=-12.8 if 76<=k<=81 else -13.5
    for bb in W[wk]: add('pcb','static',ey,wk,bb,M4(p))
# fasteners: explicit rules from positions
RULES=[]
fl=[]
for key in FAST:
    w=WID[key]
    for p in byw[w]:
        M=M4(p); pts=np.concatenate([d[f'{w}__{bb}__P']@M[:3,:3].T+M[:3,3] for bb in W[w]]); c=pts.mean(0); r=float(np.hypot(c[0],c[2])); y=float(c[1])
        if key=='insM25': par,kin,ey=('frame','static',7.0)
        elif key=='insM3': par,kin,ey=(('carrier','carrier',3.6) if y>0 else ('ring','static',-1.8))
        elif key=='insM4': par,kin,ey=(('housing','static',-9.5) if y<0 else ('frame','static',7.0))
        elif key=='m25cs':
            if y>1.0: par,kin,ey=('frame','static',8.3)
            elif y<-2: par,kin,ey=('cover','static',-18.3)
            else: par,kin,ey=('carrier','carrier',3.6)
        elif key=='m2x25': par,kin,ey=('frame','static',8.3)
        elif key=='m2nut': par,kin,ey=('retainer','static',-5.9)
        elif key=='m3x6': par,kin,ey=('retainer','static',-5.9)
        for bb in W[w]:
            add('fasteners',kin,ey,w,bb,M,{'kind':key,'parent':par})
        fl.append((key,par))
import collections; print(collections.Counter(fl))
json.dump([{k:(v.tolist() if isinstance(v,np.ndarray) else v) for k,v in q.items()} for q in parts],open('build/parts.json','w'))
print('parts',len(parts))
