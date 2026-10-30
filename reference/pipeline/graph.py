import sys,struct,re,json
D=sys.argv[1]
w=open(D+'/world','rb').read()
U=lambda s:s.encode('utf-16le')
def pat(n): return struct.pack('<I',len(n))+U(n)
ev=[]
for n in ['TransformAttribute','Instance','GroupNode','Body','SingleNodeWorld','Component','FColorEffectAttribute','FProteinEffectAttribute']:
    for m in re.finditer(re.escape(pat(n)),w): ev.append((m.start(),n))
FACE=pat('Face')+b'\x00\x00'
for m in re.finditer(re.escape(FACE),w): ev.append((m.start(),'Face'))
ev.sort()
def tf(L):
    base=L+4+len('TransformAttribute')*2
    for sk in range(0,12):
        f=struct.unpack_from('<16f',w,base+sk)
        if abs(f[15]-1)<1e-6 and abs(f[3])<1e-6 and abs(f[7])<1e-6 and abs(f[11])<1e-6 and all(abs(x)<1e4 for x in f):
            return list(f)
def gid(L):
    s=L+4+len('GroupNode')*2
    n=struct.unpack_from('<I',w,s)[0]
    return w[s+4:s+4+n*2].decode('utf-16le')
def face(pos):
    k=w.find(b'\x08\x00\x00\x07\x00\x00\x00',pos,pos+200)
    if k<0: return None
    k+=7
    pad,off,a,b_,c,ni,nadj=struct.unpack_from('<IIIIIII',w,k)
    if nadj>64: return None
    return (off,c//2,ni)
seq=[]
for p,n in ev:
    if n=='TransformAttribute':
        base=p+4+len('TransformAttribute')*2+5+64
        ln=struct.unpack_from('<I',w,base)[0]
        pid=w[base+4:base+4+ln*2].decode('utf-16le','replace') if ln<40 else None
        seq.append(('T',p,[tf(p),pid]))
    elif n=='GroupNode': seq.append(('G',p,gid(p)))
    elif n=='Face':
        f=face(p)
        if f: seq.append(('F',p,f))
        else: seq.append(('f',p,None))
    else: seq.append((n[0:3],p,None))
json.dump(seq,open('seq.json','w'))
# compact print
out=[];i=0
while i<len(seq):
    t,p,v=seq[i]
    if t in('F','f'):
        j=i
        while j<len(seq) and seq[j][0]==t: j+=1
        out.append(f'{p:9d} {t} x{j-i}'); i=j; continue
    if t=='T': out.append(f'{p:9d} T {v[1]} '+' '.join(f'{x:.3f}' for x in v[0][12:15]))
    elif t=='G': out.append(f'{p:9d} G {v}')
    else: out.append(f'{p:9d} {t}')
    i+=1
open('seq.txt','w').write('\n'.join(out))
