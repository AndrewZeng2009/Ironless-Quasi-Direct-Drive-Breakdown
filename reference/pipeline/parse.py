import sys,struct,re,json
D=sys.argv[1]
w=open(D+'/world','rb').read()
m=open(D+'/Fusion_mesh_000','rb').read()
U=lambda s:s.encode('utf-16le')
FACE=b'\x04\x00\x00\x00'+U('Face')+b'\x00\x00'
BODY=b'\x04\x00\x00\x00'+U('Body')+b'\x00\x00'
ev=[]
for mm in re.finditer(re.escape(FACE),w): ev.append((mm.start(),'F'))
for mm in re.finditer(re.escape(BODY),w): ev.append((mm.start(),'B'))
ev.sort()
bodies=[{'pos':0,'faces':[]}];cur=bodies[0];tot=0;bad=0
for pos,t in ev:
    if t=='B':
        cur={'pos':pos,'faces':[]};bodies.append(cur);continue
    # find marker 08 00 00 07 after face
    k=w.find(b'\x08\x00\x00\x07\x00\x00\x00',pos,pos+200)
    if k<0: bad+=1;continue
    k+=7
    pad,off,a,b_,c,ni,four=struct.unpack_from('<IIIIIII',w,k)
    bb=struct.unpack_from('<6d',w,k+28+four*4)
    nv=c//2
    if four>64: bad+=1
    cur['faces'].append((off,nv,ni,bb,pad))
    tot+=nv*32+ni*4
print('bodies',len(bodies),'faces',sum(len(b['faces']) for b in bodies),'bytes',tot,len(m),'bad',bad)
import collections
print(collections.Counter(f[4] for b in bodies for f in b['faces']).most_common(5))
print(max(f[1]+0 for b in bodies for f in b['faces']))
json.dump([{'pos':b['pos'],'faces':b['faces']} for b in bodies],open('/home/claude/work/bodies.json','w'))
