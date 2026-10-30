import numpy as np
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
