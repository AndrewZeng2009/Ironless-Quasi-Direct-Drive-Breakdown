import json,numpy as np,fast_simplification,sys
g=np.load('geo.npz'); s=json.load(open('test/scene.json'))
W=s['worlds']
def weld(P,I,tol=1e-4):
    q=np.round(P/tol).astype(np.int64)
    _,inv,first=None,None,None
    u,idx,inv=np.unique(q,axis=0,return_index=True,return_inverse=True)
    P2=P[idx]; I2=inv.reshape(-1)[I]
    I2=I2.reshape(-1,3)
    ok=(I2[:,0]!=I2[:,1])&(I2[:,1]!=I2[:,2])&(I2[:,0]!=I2[:,2])
    return P2,I2[ok]
def crease(P,F,ang=32):
    v0,v1,v2=P[F[:,0]],P[F[:,1]],P[F[:,2]]
    fn=np.cross(v1-v0,v2-v0); area=np.linalg.norm(fn,axis=1,keepdims=True)+1e-20; fnu=fn/area
    # per (vertex,face) corner; group corners of same vertex by normal similarity
    nv=len(P); corners=F.reshape(-1); cf=np.repeat(np.arange(len(F)),3)
    order=np.argsort(corners,kind='stable'); cs=corners[order]; cfs=cf[order]
    bounds=np.flatnonzero(np.diff(cs))+1; starts=np.r_[0,bounds]; ends=np.r_[bounds,len(cs)]
    cosT=np.cos(np.radians(ang))
    newP=[];newN=[];cornerIdx=np.empty(len(corners),np.int64)
    for a,b in zip(starts,ends):
        v=cs[a]; fs=cfs[a:b]; ns=fnu[fs]; ws=area[fs,0]
        assigned=-np.ones(len(fs),int); clusters=[]
        for i in range(len(fs)):
            if assigned[i]>=0: continue
            sim=ns@ns[i]; m=(sim>cosT)&(assigned<0); assigned[m]=len(clusters); clusters.append(np.flatnonzero(m))
        for ci,mem in enumerate(clusters):
            n=(ns[mem]*ws[mem,None]).sum(0); n/=np.linalg.norm(n)+1e-20
            k=len(newP); newP.append(P[v]); newN.append(n)
            cornerIdx[order[a+mem]]=k
    return np.array(newP),np.array(newN),cornerIdx.reshape(-1,3)
def target_for(w,b,nt):
    t={'ROOT':1500,'00000208C978F9D8':40,'00000208CAD56E98':45,'00000208CB329E58':420,'00000208CB2A2C18':260,'00000208CBDF0D78':420,
       '00000208C9A82B78':900,'00000208C9B128F8':7000,'00000208C9BCF438':5000}.get(w)
    if w=='ROOT' and nt<15000: t=14000  # stator
    if w=='00000208C1094878': t=24000 if nt>5000 else 120
    if w=='00000208C74765D8': t={122:9000,123:2500,124:9000,125:9000}.get(b,4000)
    if w=='00000208CC834378': t=48000 if nt>5000 else 1500
    if t is None: t=min(nt,3000)
    return min(nt,t)
out={}
for w,bs in W.items():
    for b in bs:
        P=g[f'p{b}'].astype(np.float64); I=g[f'i{b}'].astype(np.int64)
        P2,F=weld(P,I)
        nt=len(F); t=target_for(w,b,nt)
        if t<nt*0.95 and nt>60:
            try:
                P3,F3=fast_simplification.simplify(P2.astype(np.float32),F.astype(np.int32),target_reduction=1-t/nt,agg=7)
            except Exception as e:
                print('fail',w,b,e); P3,F3=P2,F
        else: P3,F3=P2,F
        P4,N4,F4=crease(np.asarray(P3,np.float64),np.asarray(F3,np.int64))
        out[f'{w}|{b}']=(P4.astype(np.float32),N4.astype(np.float32),F4.astype(np.uint32))
        sys.stdout.write(f'{w[-6:]} b{b}: {nt}->{len(F4)} tris, {len(P4)} v\n')
np.savez_compressed('build/dec.npz',**{k.replace('|','__')+'__P':v[0] for k,v in out.items()},**{k.replace('|','__')+'__N':v[1] for k,v in out.items()},**{k.replace('|','__')+'__F':v[2] for k,v in out.items()})
