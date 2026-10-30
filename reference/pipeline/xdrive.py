"""Procedural MKS XDrive Mini model (board-local mm frame: x right, y up = terminal edge, z out of component side; z=0 board bottom).
Sources: Makerbase dimension drawing (63 x 58 mm, 6x d3.3 holes, 56.6 x 24/27.5 mm) mirrored in Smurf/xdrive-mini-docs;
Makerbase pinout image; product photos supplied by the user (positions measured, +/-~1 mm). Heights of parts are estimates."""
import numpy as np, trimesh, json, base64, sys
from shapely.geometry import Polygon, Point, box as sbox
from shapely import affinity
sys.path.insert(0,'/home/claude/work/build')
T=1.6  # PCB thickness
def rrect(w,h,r,cx=0,cy=0): return sbox(cx-w/2+r,cy-h/2+r,cx+w/2-r,cy+h/2-r).buffer(r,resolution=8)
def ext(poly,h,z0=0):
    m=trimesh.creation.extrude_polygon(poly,h); m.apply_translation([0,0,z0]); return m
def bx(x0,x1,y0,y1,z0,z1):
    m=trimesh.creation.box(extents=[x1-x0,y1-y0,z1-z0]); m.apply_translation([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2]); return m
def cyl(r,z0,z1,cx=0,cy=0,sec=32):
    m=trimesh.creation.cylinder(radius=r,height=z1-z0,sections=sec); m.apply_translation([cx,cy,(z0+z1)/2]); return m
def hexp(af,z0,z1,cx,cy):
    R=af/np.sqrt(3); p=Polygon([(cx+R*np.cos(a),cy+R*np.sin(a)) for a in np.arange(6)*np.pi/3]); return ext(p,z1-z0,z0)
def cat(ms): return trimesh.util.concatenate(ms)
HOLES=[(sx*28.3,hy) for sx in (-1,1) for hy in (25.75,1.75,-25.75)]
P={}  # name -> (mesh, material, extra)
# ---- main board
board=rrect(63,58,2.5)
for hx,hy in HOLES: board=board.difference(Point(hx,hy).buffer(1.65,resolution=12))
P['board']=(ext(board,T),'pcbMask')
# gold thermal pads (top), measured
PADS=[(-21.3,14.4),(-13.0,13.9),(-7.0,11.6),(1.9,13.9),(7.9,11.6),(16.2,13.9),(22.3,11.6),(-23.7,7.3)]
P['pads']=(cat([bx(x-2.1,x+2.1,y-2.1,y+2.1,T,T+0.06) for x,y in PADS]),'pcbGold')
# electrolytic caps 100uF 63V (RVT): can d10 x 10.2 on 10.3 sq base
CAPX=[0.8+11.75*k for k in (-2,-1,0,1,2)]; CAPY=-5.3
base=Polygon([(-5.15,-5.15),(5.15,-5.15),(5.15,3.6),(3.6,5.15),(-3.6,5.15),(-5.15,3.6)])
P['capBase']=(cat([ext(affinity.translate(base,x,CAPY),1.6,T) for x in CAPX]),'blackPlastic')
P['capCan']=(cat([cyl(5.0,T+1.6,T+10.4,x,CAPY,48) for x in CAPX]),'aluCan')
# SOIC-8 CAN transceiver
sx,sy=-19.6,-17.6
so=[bx(sx-1.95,sx+1.95,sy-2.45,sy+2.45,T+0.1,T+1.55)]
leads=[]
for i in range(4):
    yy=sy-1.905+i*1.27
    leads+= [bx(sx-3.0,sx-1.95,yy-0.2,yy+0.2,T,T+0.25), bx(sx+1.95,sx+3.0,yy-0.2,yy+0.2,T,T+0.25)]
P['chips']=(cat(so),'epoxy'); P['leads']=(cat(leads),'steelBright')
# tactile switches RESET / BOOT
sw=[];swc=[]
for x in (-8.8,10.2):
    sw.append(bx(x-3.0,x+3.0,-17.6,-14.2,T,T+1.6)); swc.append(cyl(1.25,T+1.6,T+2.4,x,-15.9,24))
P['switch']=(cat(sw),'whitePlastic'); P['switchCap']=(cat(swc),'beige')
# USB-C receptacle, opening at +x edge
P['usb']=(bx(24.3,31.7,-21.1,-12.2,T,T+3.2),'steelBright')
P['usbHole']=(bx(31.68,31.75,-20.2,-13.1,T+0.6,T+2.6),'epoxy')
# CAN 2-pin, 120R jumper
P['can']=(bx(-32.1,-27.6,-19.7,-13.6,T,T+4.3),'creamPlastic')
P['canHole']=(bx(-32.15,-32.05,-18.9,-14.4,T+0.8,T+3.6),'epoxy')
P['jumper']=(bx(-31.2,-28.6,-12.3,-6.8,T,T+6.0),'blackPlastic')
# 4 JST-style side-entry connectors along bottom edge (5,5,6,6 pin per pinout)
J=[(-23.2,-13.5),(-11.6,-2.3),(0.0,10.2),(12.5,23.2)]
P['jst']=(cat([bx(a,b,-29.2,-23.6,T,T+4.4) for a,b in J]),'creamPlastic')
P['jstHole']=(cat([bx(a+0.9,b-0.9,-29.25,-29.15,T+0.7,T+3.4) for a,b in J]),'epoxy')
# small SMD parts visible in photo (LEDs/resistors) – representative
smd=[]
for x,y in [(-12.5,-14.5),(-13.6,-17.8),(-15.5,-20.4),(5.6,-14.6),(15.2,-15.0),(17.4,-17.8),(20.2,-17.0),(22.2,-19.6),(24.4,-18.2),(22.9,-11.5),(26.5,-10.6),(-14.9,-11.4),(-3.6,-11.6),(8.2,-11.6)]:
    smd.append(bx(x-0.8,x+0.8,y-0.4,y+0.4,T,T+0.5))
P['smd']=(cat(smd),'epoxy')
# board screws (pan head, top)
scr=[]; cross=[]
for hx,hy in HOLES:
    scr.append(cyl(2.75,T,T+1.9,hx,hy,32))
    cross += [bx(hx-1.6,hx+1.6,hy-0.3,hy+0.3,T+1.85,T+1.95), bx(hx-0.3,hx+0.3,hy-1.6,hy+1.6,T+1.85,T+1.95)]
P['screws']=(cat(scr),'blackOxide'); P['screwCross']=(cat(cross),'epoxy')
# ---- bottom side: AS5047P (TSSOP-14) at board centre + a few parts seen through the slots
P['as5047']=(cat([bx(-2.5,2.5,-2.2,2.2,-1.0,0.0)]+[bx(-3.2,-2.5,-1.95+i*0.65-0.12,-1.95+i*0.65+0.12,-0.25,0) for i in range(7)]+[bx(2.5,3.2,-1.95+i*0.65-0.12,-1.95+i*0.65+0.12,-0.25,0) for i in range(7)]),'epoxy')
bot=[]
for x,y in [(-9.5,-10.5),(-11.0,-12.0),(-12.4,-13.2),(-14.2,-14.6)]: bot.append(bx(x-0.6,x+0.6,y-0.35,y+0.35,-0.5,0))
bot.append(bx(9.2,15.0,-14.4,-10.6,-0.9,0))
P['botSmd']=(cat(bot),'epoxy')
# ---- encoder-side cover plate + standoffs (stack heights from the author's CAD: 3.0 mm standoff, 1.4 mm plate)
SO=3.0; PT=1.4
plate=rrect(63,58,2.5)
for hx,hy in HOLES: plate=plate.difference(Point(hx,hy).buffer(1.65,resolution=12))
plate=plate.difference(Point(0,0.3).buffer(5.25,resolution=24))
for sxn,syn in [(-1,1),(1,1),(-1,-1),(1,-1)]:
    c=(sxn*12.0,syn*11.8); L=12.8; Wd=4.2
    seg=affinity.rotate(rrect(L,Wd,Wd/2-0.01),45 if sxn*syn<0 else -45,origin=(0,0))
    plate=plate.difference(affinity.translate(seg,*c))
P['plate']=(ext(plate,PT,-SO-PT),'pcbMask')
P['standoff']=(cat([hexp(5.5,-SO,0,hx,hy) for hx,hy in HOLES]),'steelDark')
# ---- stock screw terminals (green), hidden by default in the assembly
TH=14.5; ty0,ty1=17.0,32.0; step=21.2
tb=[];twell=[];tscrew=[];tdark=[]
for x0,n in [(-23.9,3),(6.58,2)]:
    x1=x0+10.16*n
    tb.append(bx(x0+0.1,x1-0.1,step,ty1,T,T+TH)); tb.append(bx(x0+0.1,x1-0.1,ty0,step,T,T+8.5))
    for k in range(n):
        xc=x0+10.16*(k+0.5)
        twell.append(cyl(3.4,T+TH-2.6,T+TH+0.02,xc,27.0,32))
        tscrew.append(cyl(3.0,T+TH-2.8,T+TH-1.6,xc,27.0,32))
        tdark.append(bx(xc-1.2,xc+1.2,18.3,19.9,T+8.5,T+8.56))
        tdark.append(bx(xc-3.4,xc+3.4,ty1-0.02,ty1+0.04,T+2.5,T+9.0))
P['term']=(cat(tb),'greenTerm'); P['termWell']=(cat(twell),'termDark'); P['termScrew']=(cat(tscrew),'steelBright'); P['termDark']=(cat(tdark),'epoxy')
aux=[bx(-32.0,-24.8,17.4,28.0,T,T+8.5)]; auxs=[cyl(1.4,T+8.5,T+8.7,-28.0,yy,24) for yy in (25.4,22.0)]
auxd=[bx(-32.05,-31.95,yy-1.3,yy+1.3,T+1.5,T+4.5) for yy in (25.4,22.0)]
P['aux']=(cat(aux),'greenTerm'); P['auxScrew']=(cat(auxs),'steelBright'); P['auxDark']=(cat(auxd),'epoxy')
# ---- decal quads (uv) : top silkscreen, encoder plate silkscreen, cap tops
def quad(x0,x1,y0,y1,z,flipx=False,normal=1):
    V=np.array([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],float)
    U=np.array([[0,0],[1,0],[1,1],[0,1]],float)
    if flipx: U[:,0]=1-U[:,0]
    F=np.array([[0,1,2],[0,2,3]]) if normal>0 else np.array([[0,2,1],[0,3,2]])
    return V,U,F
DEC={'silkTop':quad(-31.5,31.5,-29,29,T+0.07),'silkEnc':quad(-31.5,31.5,-29,29,-SO-PT-0.07,flipx=True,normal=-1),'capTop':quad(-5,5,-5,5,0)}
CAPZ=T+10.4+0.05
groups={ 'board':'pcb','pads':'pcb','capBase':'pcb','capCan':'pcb','chips':'pcb','leads':'pcb','switch':'pcb','switchCap':'pcb','usb':'pcb','usbHole':'pcb','can':'pcb','canHole':'pcb','jumper':'pcb','jst':'pcb','jstHole':'pcb','smd':'pcb','screws':'pcb','screwCross':'pcb','as5047':'pcb','botSmd':'pcb',
 'plate':'encplate','standoff':'encplate','term':'terminals','termWell':'terminals','termScrew':'terminals','termDark':'terminals','aux':'terminals','auxScrew':'terminals','auxDark':'terminals'}
from creasemod import crease
out={'meshes':[],'parts':[]}
def b64(a): return base64.b64encode(a.tobytes()).decode()
def addmesh(V,F,N=None,U=None):
    V=np.asarray(V,float)
    if N is None:
        P2,N2,F2=crease(V,np.asarray(F,np.int64),ang=40); V,N,F=P2,N2,F2
    mn=V.min(0); mx=V.max(0); e=np.maximum(mx-mn,1e-6)
    qp=np.round((V-mn)/e*65535-32768).clip(-32768,32767).astype('<i2'); qn=np.round(np.asarray(N)*127).clip(-127,127).astype('i1')
    m={'min':[round(float(x),5) for x in mn],'ext':[round(float(x),6) for x in e],'nv':len(V),'p':b64(qp),'n':b64(qn),'i':b64(np.asarray(F).reshape(-1).astype('<u2')),'it':'u16'}
    if U is not None: m['u']=b64(np.round(np.asarray(U)*65535).astype('<u2'))
    out['meshes'].append(m); return len(out['meshes'])-1
# local mm -> world cm : X=x/10, Y=-2.44-z/10, Z=y/10   (column-major 3x4)
def tmat(dx=0,dy=0,dz=0):
    # translate in local mm first
    return [0.1,0,0, 0,0,0.1, 0,-0.1,0, dx*0.1, -2.44-dz*0.1, dy*0.1]
EY={'pcb':-13.5,'encplate':-12.4,'terminals':-15.0}
tris=0
for name,(m,mt) in P.items():
    m.merge_vertices()
    mi=addmesh(m.vertices,m.faces); tris+=len(m.faces)
    g=groups[name]; ey=EY[g]
    if name=='standoff': ey=-12.8
    out['parts'].append({'m':mi,'g':g,'k':'static','e':ey,'s':6,'t':tmat(),'mt':mt})
for name,(V,U,F) in DEC.items():
    N=np.tile([0,0,1.0 if name!='silkEnc' else -1.0],(4,1))
    mi=addmesh(V,F,N=N,U=U)
    if name=='capTop':
        for x in CAPX: out['parts'].append({'m':mi,'g':'pcb','k':'static','e':EY['pcb'],'s':6,'t':tmat(x,CAPY,CAPZ),'tx':'capTop'})
    else:
        g='pcb' if name=='silkTop' else 'encplate'
        out['parts'].append({'m':mi,'g':g,'k':'static','e':EY[g],'s':6,'t':tmat(),'tx':name})
json.dump(out,open('/home/claude/work/build/xdrive.json','w'))
print('meshes',len(out['meshes']),'parts',len(out['parts']),'tris',tris)
