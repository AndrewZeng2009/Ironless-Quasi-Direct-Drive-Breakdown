import sys,struct,re,json
D=sys.argv[1]
w=open(D+'/world','rb').read()
U=lambda s:s.encode('utf-16le')
T=struct.pack('<I',18)+U('TransformAttribute')
res={}
hexre=re.compile(rb'\x10\x00\x00\x00((?:[0-9A-F]\x00){16})')
for m in re.finditer(re.escape(T),w):
    L=m.start(); base=L+len(T)
    f=None
    for sk in range(0,12):
        ff=struct.unpack_from('<16f',w,base+sk)
        if abs(ff[15]-1)<1e-6 and abs(ff[3])<1e-6 and abs(ff[7])<1e-6 and abs(ff[11])<1e-6: f=ff;end=base+sk+64;break
    mm=hexre.search(w,end,end+40)
    oid=mm.group(1).decode('utf-16le') if mm else None
    res[L]=(oid,list(f))
json.dump({str(k):v for k,v in res.items()},open('owners.json','w'))
print(sum(1 for v in res.values() if v[0]))
