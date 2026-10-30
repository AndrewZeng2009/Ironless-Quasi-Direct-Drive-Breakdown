import json,numpy as np,base64
d=np.load('build/dec.npz'); parts=json.load(open('build/parts.json'))
# polarity for magnets
for grp in ('magMain','magHal'):
    ms=[q for q in parts if q['group']==grp]
    ms.sort(key=lambda q:q['extra']['angle'])
    for i,q in enumerate(ms): q['extra']['pol']=i%2
meshes={};mlist=[]
def b64(a): return base64.b64encode(a.tobytes()).decode()
for q in parts:
    key=(q['w'],q['b'])
    if key in meshes: continue
    P=d[f"{q['w']}__{q['b']}__P"].astype(np.float64); N=d[f"{q['w']}__{q['b']}__N"]; F=d[f"{q['w']}__{q['b']}__F"]
    mn=P.min(0); mx=P.max(0); ext=np.maximum(mx-mn,1e-6)
    qp=np.round((P-mn)/ext*65535-32768).clip(-32768,32767).astype('<i2')
    qn=np.round(N*127).clip(-127,127).astype('i1')
    idx=F.reshape(-1).astype('<u2' if len(P)<65536 else '<u4')
    meshes[key]=len(mlist)
    mlist.append({'min':[round(x,5) for x in mn],'ext':[round(x,6) for x in ext],'nv':len(P),'p':b64(qp),'n':b64(qn),'i':b64(idx),'it':'u16' if idx.dtype=='<u2' or idx.dtype==np.uint16 else 'u32'})
STAGE={'sun':1,'planets':1,'pbearings':1,'pins':1,'carrier':1,'ring':1,'frame':2,'retainer':2,'b6710':2,'b6805':2,'axle':2,
       'stator':3,'coils':3,'rotor':4,'magMain':4,'magHal':4,'encoder':4,'housing':5,'pcb':6,'cover':6,'xt30':6}
out_parts=[]
for q in parts:
    M=np.array(q['M']); m=[round(float(x),5) for x in M[:3,:].T.reshape(-1)]  # column-major 3x4 -> 12
    grp=q['group']; st=STAGE.get(grp) if grp!='fasteners' else STAGE.get(q['extra']['parent'],5)
    e={'m':meshes[(q['w'],q['b'])],'g':grp,'k':q['kin'],'e':q['ey'],'s':st,'t':m}
    ex=q['extra']
    if 'planet' in ex: e['pl']=ex['planet']
    if 'pol' in ex: e['pol']=ex['pol']
    if 'coilIndex' in ex: e['ci']=ex['coilIndex']; e['ca']=round(ex['angle'],3)
    if 'kind' in ex: e['kd']=ex['kind']
    if 'parent' in ex: e['par']=ex['parent']
    out_parts.append(e)
# planet centers
pc={}
for q in parts:
    if q['group']=='planets': M=np.array(q['M']); pc[q['extra']['planet']]=[round(M[0,3],5),round(M[2,3],5)]
model={'v':1,'units':'cm','source':'Decimated display mesh extracted from "Caden Kraft Quasi Direct Drive Actuator.f3d" (Fusion 360). Original design by Caden Kraft (MIT, credit required).',
       'meshes':mlist,'parts':out_parts,'planetCenters':pc,'ratio':{'sun':6,'planet':15,'ring':36}}
js=json.dumps(model,separators=(',',':'))
open('build/qdd-model.json','w').write(js)
print('meshes',len(mlist),'parts',len(out_parts),'bytes',len(js))
