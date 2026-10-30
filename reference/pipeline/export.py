import json,sys,struct,numpy as np
D=sys.argv[1]; mode=sys.argv[2]
m=open(D+'/Fusion_mesh_000','rb').read()
seq=json.load(open('seq.json'))
seq=[s for s in seq if s[0] not in('FCo','FPr')]
# bodies by world (data copies only)
worlds={'ROOT':[]};bodies=[];cur=None;curworld='ROOT'
insts=[];lastT=None;i=0;n=len(seq)
Ts=[]
while i<n:
    t,p,v=seq[i]
    if t=='T':
        Ts.append(v[0])
        if i+2<n and seq[i+1][0]=='Ins':
            selfid=seq[i+2][2]; wid=None; j=i+3
            if j+1<n and seq[j][0]=='Sin': wid=seq[j+1][2]; j+=2
            insts.append({'TA':v[0],'TB':lastT,'id':selfid,'world':wid})
            curworld=wid; worlds.setdefault(wid,[]); cur=None
            lastT=v[0]; i=j; continue
        lastT=v[0]
        curworld=None
    if t=='F' and curworld is not None:
        if cur is None or cur['closed']:
            cur={'faces':[],'closed':False}; bodies.append(cur); worlds[curworld].append(len(bodies)-1)
        cur['faces'].append(v)
    if t=='Bod' and cur: cur['closed']=True
    i+=1
# geometry
geo=[]
for b in bodies:
    P=[];N=[];I=[];base=0
    for off,nv,ni in b['faces']:
        a=np.frombuffer(m,dtype='<f4',count=nv*8,offset=off).reshape(nv,8)
        idx=np.frombuffer(m,dtype='<u4',count=ni,offset=off+nv*32)
        P.append(a[:,:3]);N.append(a[:,3:6]);I.append(idx+base);base+=nv
    geo.append((np.concatenate(P),np.concatenate(N),np.concatenate(I)))
print('bodies',len(bodies),'verts',sum(len(g[0]) for g in geo),'tris',sum(len(g[2]) for g in geo)//3)
json.dump({'worlds':worlds,'insts':insts},open('scene.json','w'))
np.savez_compressed('geo.npz',**{f'p{k}':g[0] for k,g in enumerate(geo)},**{f'n{k}':g[1] for k,g in enumerate(geo)},**{f'i{k}':g[2] for k,g in enumerate(geo)})
