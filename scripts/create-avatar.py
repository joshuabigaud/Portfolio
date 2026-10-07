"""Build Joshua's editable cartoon avatar with Blender 4.2+.

Run: blender --background --python scripts/create-avatar.py
The reference photos are used by the artist, never embedded in the deliverables.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Quaternion, Euler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'avatar'
SOURCE = ROOT / 'avatar'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials):
    bpy.data.materials.remove(d)

def linear(v):
    return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4

def material(name, color, roughness=.48, metallic=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    rgb = tuple(linear(int(color[i:i+2], 16)/255) for i in (1,3,5))
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    m.diffuse_color = (*rgb, 1)
    return m

skin = material('Skin • warm tan', '#bc8869', .46)
inner = material('Ear and lip warmth', '#985e4e', .6)
lip = material('Lips', '#9f6555', .52)
hair = material('Hair • deep brown', '#201d1b', .59)
hair_light = material('Braid highlights', '#28231f', .62)
cropped_hair = material('Close-cropped sides', '#403027', .80)
beard = material('Beard', '#29221e', .72)
eye = material('Eyes • dark brown', '#151210', .15)
white = material('Eye glints', '#fff3db', .26)
shirt = material('Shirt • ivory', '#e9e6de', .78)
blazer = material('Blazer • navy', '#23334b', .79)
lapel = material('Blazer lapels', '#1d2b3f', .74)
seam = material('Blazer seams', '#1c293c', .83)
button = material('Jacket buttons', '#202735', .47)
trousers = material('Trousers • charcoal', '#383e47', .82)
shoe = material('Derby shoes • espresso', '#302b29', .39)
sole = material('Shoe soles and laces', '#1c2024', .64)
ceramic = material('Mug • terracotta', '#b95334', .29)
coffee = material('Coffee', '#301b13', .21)
computer = material('Laptop • graphite', '#454e52', .42, .35)
screen = material('Screen', '#c3d7cb', .45)

parts = []
def finish(obj, name, mat, bone=None):
    obj.name = name
    if mat: obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for p in obj.data.polygons: p.use_smooth = True
    if bone: parts.append((obj, bone))
    return obj

def sphere(name, loc, scale, mat, bone=None, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bone)

def rounded(name, loc, scale, bevel, mat, bone=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for p in obj.data.polygons: p.use_smooth = True
    mod = obj.modifiers.new('Soft corners', 'BEVEL'); mod.width = bevel; mod.segments = 4
    mod.harden_normals = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    norm = obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    bpy.ops.object.modifier_apply(modifier=norm.name)
    return finish(obj, name, mat, bone)

def tube(name, points, radius, mat, bone=None, resolution=3):
    curve = bpy.data.curves.new(name, 'CURVE'); curve.dimensions = '3D'
    curve.resolution_u = 3; curve.bevel_depth = radius; curve.bevel_resolution = resolution
    sp = curve.splines.new('BEZIER'); sp.bezier_points.add(len(points)-1)
    for p, co in zip(sp.bezier_points, points):
        p.co = co; p.handle_left_type = 'AUTO'; p.handle_right_type = 'AUTO'
    if name.startswith('Cornrow'):
        for i,p in enumerate(sp.bezier_points):p.radius=min(1,.35+i*.27)
    obj = bpy.data.objects.new(name, curve); bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return finish(obj, name, mat, bone)

def segment(name, a, b, rx, ry, mat, bone):
    a,b = Vector(a),Vector(b)
    obj = sphere(name, (a+b)/2, (rx,ry,(b-a).length/2+min(rx,ry)*.55), mat, bone)
    obj.rotation_mode = 'QUATERNION'; obj.rotation_quaternion = (b-a).to_track_quat('Z','Y')
    return obj

def ring_mesh(name, rings, mat, bone, n=48):
    # z, x radius, front depth, back depth, y offset; front faces -Y.
    verts=[]; faces=[]
    for z,rx,front,back,y in rings:
        for j in range(n):
            a = 2*math.pi*j/n
            s,c = math.sin(a),math.cos(a)
            verts.append((rx*s, y-c*(front if c>=0 else back), z))
    for k in range(len(rings)-1):
        for j in range(n):
            a=k*n+j; b=k*n+(j+1)%n
            faces.append((a,b,b+n,a+n))
    faces += [tuple(reversed(range(n))), tuple((len(rings)-1)*n+j for j in range(n))]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    finish(obj,name,mat,bone)
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    mod=obj.modifiers.new('Sculpted silhouette','SUBSURF'); mod.levels=2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    return obj

def polygon_piece(name, vertices, mat, bone='spine', thickness=.016):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[tuple(range(len(vertices)))]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    finish(obj,name,mat,bone)
    bpy.context.view_layer.objects.active=obj
    solid=obj.modifiers.new('Tailoring thickness','SOLIDIFY');solid.thickness=thickness
    bpy.ops.object.modifier_apply(modifier=solid.name)
    bevel=obj.modifiers.new('Soft garment edges','BEVEL');bevel.width=.008;bevel.segments=3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj

def fuse_skin(objects, name):
    # A continuous sculpted nose/face instead of intersecting primitive outlines.
    global parts
    parts=[(o,b) for o,b in parts if o not in objects]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();obj=bpy.context.object;obj.name=name
    remesh=obj.modifiers.new('Unified facial forms','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.009;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=obj.modifiers.new('Soft facial transitions','SMOOTH');smooth.factor=.7;smooth.iterations=4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    parts.append((obj,'head'))
    return obj

# All character forms are authored in the original coordinate system, then
# proportioned to a taller 4.1-unit figure together with the skeleton below.
ring_mesh('Ivory shirt',[(1.08,.30,.21,.20,0),(1.13,.35,.232,.22,0),(1.60,.39,.24,.23,0),(2.02,.40,.22,.21,0),(2.15,.22,.154,.15,0),(2.20,.16,.133,.13,0)],shirt,'spine')
sphere('Neck',(0,0,2.27),(.174,.168,.23),skin,'neck')

# Open-front tailored jacket; the gap narrows naturally toward the button.
jacket_rings=[(1.075,.33,.223,.208,.20),(1.10,.39,.251,.232,.20),(1.18,.408,.269,.24,.18),(1.45,.401,.268,.241,.06),(1.62,.415,.279,.247,.10),(1.85,.454,.280,.250,.34),(2.025,.480,.253,.235,.48),(2.12,.408,.208,.20,.60),(2.22,.215,.155,.148,.67)]
verts=[];faces=[];n=64
for z,rx,front,back,gap in jacket_rings:
    for j in range(n):
        a=gap+(2*math.pi-2*gap)*j/(n-1)
        c=math.cos(a)
        verts.append((rx*math.sin(a),-c*(front if c>=0 else back),z))
for k in range(len(jacket_rings)-1):
    for j in range(n-1):
        a=k*n+j;faces.append((a,a+1,a+1+n,a+n))
mesh=bpy.data.meshes.new('Tailored jacket');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Tailored jacket',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,blazer,'spine')
bpy.context.view_layer.objects.active=obj
sub=obj.modifiers.new('Soft tailoring','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
solid=obj.modifiers.new('Jacket fabric','SOLIDIFY');solid.thickness=.016;bpy.ops.object.modifier_apply(modifier=solid.name)
for side,s in [('L',1),('R',-1)]:
    polygon_piece('Notched lapel.'+side,[(s*.169,-.159,2.213),(s*.315,-.222,2.064),(s*.271,-.245,2.020),(s*.319,-.232,1.994),(s*.047,-.293,1.602),(s*.118,-.282,1.952)],lapel)
    polygon_piece('Open collar.'+side,[(s*.018,-.156,2.16),(s*.116,-.204,2.024),(s*.211,-.161,2.137),(s*.145,-.126,2.231)],shirt,thickness=.019)
    tube('Welt pocket.'+side,[(s*.17,-.248,1.326),(s*.24,-.225,1.314),(s*.305,-.194,1.299)],.008,seam,'spine',2)
    tube('Pocket lip.'+side,[(s*.17,-.249,1.338),(s*.24,-.226,1.326),(s*.305,-.195,1.311)],.007,blazer,'spine',2)
sphere('Jacket button',(.029,-.284,1.53),(.023,.010,.023),button,'spine',20,12)
tube('Breast pocket',[(.235,-.252,1.941),(.29,-.23,1.945),(.35,-.201,1.947)],.006,seam,'spine',2)

head_mesh=ring_mesh('Head',[(2.36,.11,.17,.145,0),(2.415,.265,.29,.23,0),(2.52,.40,.377,.31,0),(2.72,.509,.423,.403,0),(2.93,.552,.435,.452,0),(3.15,.555,.415,.463,0),(3.34,.490,.359,.404,0),(3.47,.32,.237,.285,0),(3.52,.07,.067,.08,0)],skin,'head')
facial_skin=[head_mesh]
facial_skin.append(sphere('Nose bridge',(0,-.404,2.95),(.065,.050,.114),skin,'head'))
facial_skin.append(sphere('Nose tip',(0,-.451,2.892),(.083,.077,.065),skin,'head'))
for s in [-1,1]:
    facial_skin.append(sphere('Nose wing',(s*.064,-.442,2.869),(.037,.047,.03),skin,'head',24,16))
head_mesh=fuse_skin(facial_skin,'Sculpted face')
for side,s in [('L',1),('R',-1)]:
    sphere('Ear.'+side,(s*.554,.0,2.94),(.104,.084,.159),skin,'head')
    sphere('Ear inset.'+side,(s*.586,-.068,2.953),(.052,.018,.09),inner,'head',24,16)
    sphere('Ear fold.'+side,(s*.585,-.083,2.918),(.029,.020,.039),skin,'head',20,12)
    sphere('Eye.'+side,(s*.218,-.408,3.016),(.079,.050,.09),eye,'head')
    sphere('Eye shine.'+side,(s*.198,-.453,3.043),(.017,.006,.019),white,'head',20,12)
    sphere('Eye glint.'+side,(s*.237,-.449,2.990),(.006,.003,.007),white,'head',16,8)
    brow=tube('Eyebrow.'+side,[(s*.101,-.411,3.168),(s*.168,-.421,3.208),(s*.248,-.405,3.222),(s*.324,-.370,3.200),(s*.365,-.343,3.174)],.032,hair,'head')
    sphere('Nostril.'+side,(s*.057,-.493,2.856),(.015,.007,.009),inner,'head',20,12)

# A close, rounded beard follows the actual sculpted face surface.
verts=[];faces=[];n=64
for k in range(10):
    t=k/9
    for j in range(n):
        a=2*math.pi*j/n;front=max(0,math.cos(a))
        top=2.990-.315*front**.68
        bottom=2.385+.105*abs(math.sin(a))+.22*max(0,-math.cos(a))
        z=bottom*(1-t)+top*t
        direction=Vector((math.sin(a),-math.cos(a),0))
        hit,location,normal,index=head_mesh.ray_cast(Vector((0,0,z)),direction)
        if not hit:raise RuntimeError('Beard surface ray missed')
        verts.append(tuple(location+direction*(.008+.003*(1-t))))
for k in range(9):
    for j in range(n):
        a=k*n+j;b=k*n+(j+1)%n;faces.append((a,b,b+n,a+n))
mesh=bpy.data.meshes.new('Beard contour');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Shaped beard',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,beard,'head')
bpy.context.view_layer.objects.active=obj
sub=obj.modifiers.new('Soft beard edge','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
solid=obj.modifiers.new('Beard thickness','SOLIDIFY');solid.thickness=.009;bpy.ops.object.modifier_apply(modifier=solid.name)

# A calm closed smile with a slight lift at the corners.
tube('Upper lip',[(-.142,-.391,2.747),(-.070,-.434,2.732),(0,-.444,2.729),(.074,-.434,2.738),(.142,-.391,2.758)],.010,lip,'head')
tube('Lower lip',[(-.139,-.391,2.744),(-.073,-.433,2.710),(0,-.446,2.703),(.074,-.433,2.718),(.139,-.391,2.753)],.012,lip,'head')
tube('Closed smile',[(-.135,-.397,2.743),(-.068,-.445,2.722),(0,-.457,2.717),(.072,-.444,2.729),(.135,-.397,2.754)],.005,beard,'head',2)
for s in [-1,1]:
    tube('Moustache',[(s*.012,-.43,2.792),(s*.058,-.433,2.794),(s*.105,-.415,2.779),(s*.156,-.383,2.751)],.025,beard,'head')
sphere('Soul patch',(0,-.421,2.646),(.034,.015,.031),beard,'head',24,16)

# Close-cropped sides and swept-back cornrows, fitted to the sculpted scalp.
scalp_center=Vector((0,0,2.99))
def scalp_point(direction,offset=.01):
    hit,loc,normal,index=head_mesh.ray_cast(scalp_center,Vector(direction).normalized())
    if not hit:raise RuntimeError('Scalp ray missed')
    return loc+normal*offset
verts=[];faces=[];around=56;rows=10
for k in range(rows):
    for j in range(around):
        # Only the sides and nape are closely cropped. Scalp remains visible
        # between the cornrows at the crown and along the front hairline.
        a=1.13+(2*math.pi-2.26)*j/(around-1)
        edge=.96+.89*(1-math.cos(a))/2
        start=1.17-.06*max(0,-math.cos(a))
        t=start+(edge-start)*k/(rows-1)
        verts.append(tuple(scalp_point((math.sin(t)*math.sin(a),-math.sin(t)*math.cos(a),math.cos(t)),.008)))
for k in range(rows-1):
    for j in range(around-1):
        a=k*around+j;b=a+1;faces.append((a,b,b+around,a+around))
mesh=bpy.data.meshes.new('Hair cap');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Fitted fade',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,cropped_hair,'head')
for i,x in enumerate([-.413,-.282,-.142,0,.142,.282,.413]):
    radius=math.sqrt(1-(x/.61)**2)
    points=[];samples=55
    for k in range(samples):
        t=.70+k/(samples-1)*2.17
        p=Vector((x,-.5*radius*math.cos(t),3.015+.555*radius*math.sin(t)))
        points.append(scalp_point(p-scalp_center,.027))
    tube('Cornrow %02d core'%i,points,.039,hair,'head',2)
    for strand in range(2):
        pp=[]
        for k,p in enumerate(points):
            t=.70+k/(samples-1)*2.17;phase=k*1.65+strand*math.pi
            pp.append(p+Vector((.030*math.cos(phase),-.020*math.sin(phase)*math.cos(t),.020*math.sin(phase)*math.sin(t))))
        tube('Cornrow %02d weave %d'%(i,strand),pp,.023,hair_light if strand==0 else hair,'head',2)
    end=points[-1];length=.73+.17*(1-abs(x)/.42)
    tail=[]
    for k in range(32):
        t=k/31
        tail.append(end+Vector((.022*math.sin(t*4+i),.077*math.sin(t*2),-length*t)))
    tube('Rear braid %02d'%i,tail,.028,hair,'head',2)
    for strand in range(2):
        pp=[p+Vector((.013*math.cos(k*1.5+strand*math.pi),.013*math.sin(k*1.5+strand*math.pi),0)) for k,p in enumerate(tail)]
        tube('Rear braid weave %02d %d'%(i,strand),pp,.014,hair_light if strand==0 else hair,'head',2)
    sphere('Braid tie %02d'%i,tail[-1],(.027,.027,.017),hair,'head',16,10)

# Smooth long sleeves with continuous elbow weights, tailored cuffs, and hands.
for side,s in [('L',1),('R',-1)]:
    sleeve=ring_mesh('Jacket sleeve.'+side,[(1.35,.082,.09,.09,0),(1.385,.099,.103,.103,0),(1.59,.115,.12,.12,0),(1.73,.13,.135,.135,0),(1.94,.161,.167,.167,0),(2.06,.172,.176,.176,0),(2.14,.115,.12,.12,0)],blazer,'upper_arm.'+side,32)
    for v in sleeve.data.vertices:
        z=v.co.z
        center=.70+(1.36-z)*(.05/.32) if z<=1.68 else .65-(z-1.68)*(.16/.355)
        v.co.x+=s*center
    segment('Shirt cuff.'+side,(s*.70,-.012,1.333),(s*.697,-.011,1.37),.087,.092,shirt,'forearm.'+side)
    sphere('Palm.'+side,(s*.708,-.018,1.274),(.110,.076,.128),skin,'hand.'+side)
    for k in range(4):
        x=s*(.632+k*.050);z=1.198-(.018 if k in [1,2] else 0)
        segment('Finger %s.%s'%(k,side),(x,-.02,1.253),(x+s*(k-1.5)*.006,-.013,z-.073),.029,.034,skin,'fingers.'+side)
    segment('Thumb.'+side,(s*.619,-.05,1.309),(s*.593,-.087,1.223),.041,.042,skin,'thumb.'+side)
    for k in range(2):
        sphere('Sleeve button %d.%s'%(k,side),(s*.778,.018,1.40+k*.045),(.009,.019,.016),button,'forearm.'+side,16,10)

sphere('Waist',(0,0,1.16),(.32,.20,.14),trousers,'hips')
for side,s in [('L',1),('R',-1)]:
    leg=ring_mesh('Trouser leg.'+side,[(.18,.131,.149,.149,0),(.225,.148,.165,.165,0),(.56,.162,.18,.18,0),(.70,.173,.187,.187,0),(.96,.182,.20,.20,0),(1.18,.16,.17,.17,0),(1.23,.13,.13,.13,0)],trousers,'thigh.'+side,32)
    for v in leg.data.vertices:v.co.x+=s*.225
    rounded('Derby sole.'+side,(s*.24,-.093,.051),(.335,.625,.080),.036,sole,'foot.'+side)
    rounded('Derby shoe.'+side,(s*.24,-.073,.134),(.32,.598,.20),.092,shoe,'foot.'+side)
    tube('Toe seam.'+side,[(s*.24-.13,-.214,.191),(s*.24,-.255,.220),(s*.24+.13,-.214,.191)],.004,sole,'foot.'+side,2)
    for k in range(3):
        tube('Lace %d.%s'%(k,side),[(s*.24-.066,-.115+k*.045,.227),(s*.24,-.125+k*.045,.245),(s*.24+.066,-.115+k*.045,.227)],.005,sole,'foot.'+side,2)

# No jewelry or tattoo geometry; the supplied animation contributes style only.

# Armature. Every visible part is weighted; Blender poses and glTF animations agree.
def avatar_z(z):
    if z <= 1.2:return z*1.25
    if z <= 2.3:return 1.5+(z-1.2)*1.15
    return z+.465

bpy.ops.object.select_all(action='DESELECT')
armdata=bpy.data.armatures.new('Joshua skeleton')
rig=bpy.data.objects.new('Joshua_Rig',armdata);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name)
    b.head=(head[0],head[1],avatar_z(head[2]));b.tail=(tail[0],tail[1],avatar_z(tail[2]))
    if parent:b.parent=armdata.edit_bones[parent]
bone('root',(0,0,0),(0,0,.25))
bone('hips',(0,0,1.13),(0,0,1.40),'root')
bone('spine',(0,0,1.35),(0,0,2.16),'hips')
bone('neck',(0,0,2.16),(0,0,2.41),'spine')
bone('head',(0,0,2.41),(0,0,3.4),'neck')
for side,s in [('L',1),('R',-1)]:
    bone('upper_arm.'+side,(s*.49,0,2.035),(s*.65,0,1.68),'spine')
    bone('forearm.'+side,(s*.65,0,1.68),(s*.70,-.015,1.36),'upper_arm.'+side)
    bone('hand.'+side,(s*.70,-.015,1.36),(s*.71,-.018,1.23),'forearm.'+side)
    bone('fingers.'+side,(s*.71,-.018,1.23),(s*.71,-.018,1.12),'hand.'+side)
    bone('thumb.'+side,(s*.627,-.055,1.313),(s*.599,-.092,1.225),'hand.'+side)
    bone('thigh.'+side,(s*.21,0,1.17),(s*.23,0,.65),'hips')
    bone('shin.'+side,(s*.23,0,.65),(s*.24,0,.22),'thigh.'+side)
    bone('foot.'+side,(s*.24,0,.22),(s*.24,-.36,.12),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front=True
for obj,bname in parts:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    vg=obj.vertex_groups.new(name=bname);vg.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
    if obj.name.startswith('Trouser leg.'):
        side=obj.name[-1]
        lower=obj.vertex_groups.new(name='shin.'+side)
        for v in obj.data.vertices:
            blend=max(0,min(1,(v.co.z-.51)/.27))
            vg.add([v.index],blend,'REPLACE');lower.add([v.index],1-blend,'REPLACE')
    if obj.name.startswith('Jacket sleeve.'):
        side=obj.name[-1]
        lower=obj.vertex_groups.new(name='forearm.'+side)
        for v in obj.data.vertices:
            blend=max(0,min(1,(v.co.z-1.56)/.24))
            vg.add([v.index],blend,'REPLACE');lower.add([v.index],1-blend,'REPLACE')
    for v in obj.data.vertices:v.co.z=avatar_z(v.co.z)
    mod=obj.modifiers.new('Joshua skeleton','ARMATURE');mod.object=rig
    obj.parent=rig

# Join by material to keep the web model efficient while retaining all bone weights.
joined=[]
material_groups=[(mat,[o for o,_ in parts if len(o.data.materials) and o.data.materials[0]==mat]) for mat in list(bpy.data.materials)]
for mat,group in material_groups:
    if not group:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    bpy.ops.object.join();obj=bpy.context.object;obj.name='Joshua_'+mat.name.split(' •')[0].replace(' ','_')
    joined.append(obj)

POSES={
    'Relaxed':{'hips':(0,0,-3),'spine':(-1,0,1),'upper_arm.L':(-7,2,0),'forearm.L':(-30,-12,0),'hand.L':(0,0,7),'upper_arm.R':(-3,-1,0),'forearm.R':(-9,1,0),'head':(0,-3,6),'foot.L':(0,0,5),'foot.R':(0,0,-5)},
    'Wave':{'upper_arm.L':(0,-48,-3),'forearm.L':(0,-107,0),'hand.L':(0,-6,0),'head':(0,0,4),'upper_arm.R':(-4,-2,0),'forearm.R':(-8,0,0)},
    'Present':{'upper_arm.L':(-9,-24,0),'forearm.L':(-65,-27,0),'hand.L':(0,0,-45),'head':(0,0,-6),'forearm.R':(-8,0,0)},
    'Coffee':{'upper_arm.R':(-17,-7,0),'forearm.R':(-85,0,0),'fingers.R':(-65,0,0),'thumb.R':(0,0,-12),'head':(0,0,5)},
    'Laptop':{'upper_arm.L':(-18,10,0),'upper_arm.R':(-18,-10,0),'forearm.L':(-94,0,-13),'forearm.R':(-94,0,13),'fingers.L':(-15,0,0),'fingers.R':(-15,0,0),'head':(7,0,0)},
}
def set_pose(name):
    for pb in rig.pose.bones:
        pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0)
    for bname,degrees in POSES[name].items():
        pb=rig.pose.bones[bname];basis=pb.bone.matrix_local.to_quaternion()
        world=Euler(tuple(math.radians(v) for v in degrees),'XYZ').to_quaternion()
        pb.rotation_quaternion=basis.inverted() @ world @ basis
    bpy.context.view_layer.update()

rig.animation_data_create()
for name in POSES:
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    set_pose(name)
    for frame in [1,31]:
        for pb in rig.pose.bones:pb.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=pb.name)
    action.use_fake_user=True
    track=rig.animation_data.nla_tracks.new();track.name=name
    track.strips.new(name,1,action);track.mute=True
rig.animation_data.action=None
set_pose('Relaxed')

# Export a neutral skeleton with five portable pose clips.
for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0)
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in joined:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'joshua-avatar.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True)

# Preserve separate editable prop collections in the .blend; web loads only the selected prop.
def prop_export(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    collection=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(collection)
    for obj in objects:
        for c in list(obj.users_collection):c.objects.unlink(obj)
        collection.objects.link(obj);obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name.lower()+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
    collection.hide_render=True;collection.hide_viewport=True

before=set(bpy.data.objects)
# Hollow ceramic mug with rolled lip and loop handle, authored at origin.
ring_mesh('Mug body',[(0,.092,.092,.092,0),(.015,.112,.112,.112,0),(.22,.126,.126,.126,0),(.237,.12,.12,.12,0),(.237,.101,.101,.101,0),(.035,.094,.094,.094,0)],ceramic,None,40)
tube('Mug handle',[(.112,0,.19),(.202,0,.188),(.218,0,.12),(.19,0,.066),(.108,0,.061)],.022,ceramic,None)
sphere('Coffee surface',(0,0,.205),(.103,.103,.006),coffee,None,32,12)
prop_export('Mug',list(set(bpy.data.objects)-before))
before=set(bpy.data.objects)
rounded('Laptop base',(0,0,.025),(.9,.62,.05),.025,computer)
rounded('Keyboard deck',(0,-.017,.052),(.77,.43,.006),.017,seam)
for row in range(4):
    for col in range(10):
        rounded('Key',(-.337+col*.074,.065+row*.069,.059),(.055,.045,.01),.008,computer)
rounded('Trackpad',(0,-.184,.057),(.27,.092,.007),.012,computer)
panel=rounded('Laptop display',(0,.29,.304),(.9,.043,.55),.025,computer)
display=rounded('Screen',(0,.266,.305),(.817,.009,.456),.015,screen)
for i,w in enumerate([.29,.40,.21,.32]):
    rounded('Code line',(-.18+w/2-.15,.256,.40-i*.06),(w,.006,.012),.003,computer)
prop_export('Laptop',list(set(bpy.data.objects)-before))

# Studio camera and soft lighting for the actual model's portfolio poster.
set_pose('Relaxed')
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=960;scene.render.resolution_y=1120;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.world.color=(.3,.3,.3)
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
def area(name,loc,energy,size):
    bpy.ops.object.light_add(type='AREA',location=loc);obj=bpy.context.object;obj.name=name;obj.data.energy=energy;obj.data.shape='DISK';obj.data.size=size
    obj.rotation_euler=(Vector((0,0,1.9))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(-3,-4,7),450,4)
area('Fill softbox',(4,-2,4),230,3)
area('Hair rim',(1,3,5),420,3)
bpy.ops.object.camera_add(location=(3.2,-8,4.4));camera=bpy.context.object;camera.name='Portfolio camera'
camera.rotation_euler=(Vector((0,0,2.05))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=4.8;scene.camera=camera
scene.render.filepath=str(OUT/'joshua-avatar.png')
scene.frame_start=1;scene.frame_end=31;scene.render.fps=30
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
for area_ui in bpy.context.screen.areas:
    if area_ui.type=='VIEW_3D':
        area_ui.spaces.active.region_3d.view_distance=5.5
        area_ui.spaces.active.region_3d.view_location=(0,0,2.05)
        area_ui.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
        area_ui.spaces.active.shading.type='MATERIAL'
        area_ui.spaces.active.overlay.show_extras=False
readme=bpy.data.texts.new('START HERE')
readme.write('JOSHUA — PROFESSIONAL CARTOON AVATAR\n\nSelect Joshua_Rig and switch to Pose Mode.\nNamed bones control head, arms, wrists, fingers, legs and feet.\nThe Action Editor contains Relaxed (Portrait), Wave (Welcome), Present, Coffee and Laptop.\nProp collections Mug and Laptop are hidden by default; enable in the Outliner.\nBlazer sleeves and trousers have blended elbow and knee weights.\nAll geometry and materials are editable; no external image textures, jewelry or tattoos.\nThis is a basic FK cartoon rig without facial animation or IK.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'joshua-avatar.blend'))
for obj in joined:obj.data.calc_loop_triangles()
manifest={'name':'Joshua Bigaud','version':2,'style':'rounded professional cartoon','hairstyle':'swept-back braids','outfit':'navy blazer, ivory open-collar shirt, charcoal trousers, dark derby shoes','defaultPose':'Relaxed','jewelry':False,'tattoos':False,'poses':list(POSES),'bones':[b.name for b in rig.data.bones],'triangles':sum(len(o.data.loop_triangles) for o in joined),'source':'avatar/joshua-avatar.blend','photoTextures':False}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.render.render(write_still=True)
print('AVATAR_COMPLETE',str(SOURCE/'joshua-avatar.blend'))
