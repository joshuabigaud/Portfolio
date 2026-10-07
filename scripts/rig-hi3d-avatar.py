"""Build a separate FK body rig for the prepared Hi3D avatar (Blender 4.2+).

Run: blender --background --threads 2 --python scripts/rig-hi3d-avatar.py
The prepared static .blend, static GLB, poster and original source are read-only.
Outputs a packed editable rig, a skinned web GLB, and a measured rig manifest.
"""
import bpy
import hashlib
import json
import math
import numpy as np
from pathlib import Path
from mathutils import Vector, Euler
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'avatar/hi3d-portfolio.blend'
OUT = ROOT / 'assets/avatar/joshua-avatar-rigged.glb'
EDITABLE = ROOT / 'avatar/hi3d-rigged.blend'

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

source_hash = digest(SOURCE)
static_hash = digest(ROOT / 'assets/avatar/joshua-avatar.glb')
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
scene.render.fps = 30
mesh = next(o for o in scene.objects if o.type == 'MESH')
assert len(mesh.data.vertices) == 60002, 'Review joint landmarks for changed source topology'
assert not any(o.type == 'ARMATURE' for o in scene.objects), 'Input already has a rig'

bpy.ops.object.select_all(action='DESELECT')
arm_data = bpy.data.armatures.new('Joshua body skeleton')
rig = bpy.data.objects.new('Joshua_Rig', arm_data)
scene.collection.objects.link(rig)
rig.show_in_front = True
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')

def bone(name, head, tail, parent=None, deform=True):
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    b.use_deform = deform
    if parent:
        b.parent = arm_data.edit_bones[parent]
        b.use_connect = (b.head - b.parent.tail).length < .0001
    return b

bone('Root', (0, 0, 0), (0, 0, .24), deform=False)
bone('Hips', (0, .095, 1.73), (0, .065, 2.03), 'Root')
bone('Spine', (0, .065, 2.03), (0, .04, 2.40), 'Hips')
bone('Chest', (0, .04, 2.40), (0, .045, 2.91), 'Spine')
bone('Neck', (0, .045, 2.91), (0, .035, 3.23), 'Chest')
bone('Head', (0, .035, 3.23), (0, .045, 3.94), 'Neck')
for side, s in [('L', 1), ('R', -1)]:
    bone('Clavicle.'+side, (s*.06, .04, 2.88), (s*.36, .05, 2.89), 'Chest')
    bone('UpperArm.'+side, (s*.36, .05, 2.89), (s*.465, .035, 2.43), 'Clavicle.'+side)
    bone('Forearm.'+side, (s*.465, .035, 2.43), (s*.515, .02, 1.96), 'UpperArm.'+side)
    bone('Hand.'+side, (s*.515, .02, 1.96), (s*.51, -.025, 1.70), 'Forearm.'+side)
    bone('Thigh.'+side, (s*.195, .10, 1.80), (s*.22, .065, 1.065), 'Hips')
    bone('Shin.'+side, (s*.22, .065, 1.065), (s*.22, .125, .285), 'Thigh.'+side)
    bone('Foot.'+side, (s*.22, .125, .285), (s*.22, -.15, .115), 'Shin.'+side)
    bone('Toe.'+side, (s*.22, -.15, .115), (s*.22, -.29, .10), 'Foot.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
# The generated surface has tiny holes that defeat bone heat. Build a temporary
# watertight voxel proxy, bind that, then barycentrically transfer weights back.
# Only weights are transferred; source geometry, UVs and material stay intact.
proxy = mesh.copy()
proxy.data = mesh.data.copy()
proxy.name = 'Weighting proxy'
scene.collection.objects.link(proxy)
bpy.ops.object.select_all(action='DESELECT')
proxy.select_set(True)
bpy.context.view_layer.objects.active = proxy
remesh = proxy.modifiers.new('Watertight weighting proxy', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = .022
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth = proxy.modifiers.new('Smooth proxy', 'SMOOTH')
smooth.factor, smooth.iterations = 1.0, 4
bpy.ops.object.modifier_apply(modifier=smooth.name)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
print('BIND_BEGIN', len(proxy.data.vertices), flush=True)
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
totals = [sum(g.weight for g in v.groups) for v in proxy.data.vertices]
print('PROXY_WEIGHT_SUMS', min(totals), max(totals), 'unbound', sum(t < 1e-6 for t in totals), flush=True)
assert sum(t < 1e-6 for t in totals) < len(totals)*.01, 'Proxy bone heat failed'
# Voxelization can leave tiny detached surface islands; copy the nearest valid
# proxy weights only within a small measured distance, otherwise fail closed.
tree = KDTree(sum(t > 1e-6 for t in totals))
for v, total in zip(proxy.data.vertices, totals):
    if total > 1e-6: tree.insert(v.co, v.index)
tree.balance()
repair_distances = []
for v, total in zip(proxy.data.vertices, totals):
    if total > 1e-6: continue
    _, nearest, distance = tree.find(v.co)
    assert distance < .075, 'Detached region too far from weighted surface'
    repair_distances.append(distance)
    for g in proxy.data.vertices[nearest].groups:
        proxy.vertex_groups[g.group].add([v.index], g.weight, 'REPLACE')
print('PROXY_ISLAND_REPAIRS', len(repair_distances), max(repair_distances, default=0), flush=True)
print('BIND_DONE', flush=True)
proxy.data.calc_loop_triangles()
triangles = [tuple(t.vertices) for t in proxy.data.loop_triangles]
coords = [v.co.copy() for v in proxy.data.vertices]
bvh = BVHTree.FromPolygons(coords, triangles, all_triangles=True)
for group in list(mesh.vertex_groups): mesh.vertex_groups.remove(group)
for group in proxy.vertex_groups: mesh.vertex_groups.new(name=group.name)
for vertex in mesh.data.vertices:
    point, normal, ti, distance = bvh.find_nearest(vertex.co)
    ids = triangles[ti]
    a, b, c = [coords[i] for i in ids]
    v0, v1, v2 = b-a, c-a, point-a
    d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1)
    denominator = d00*d11-d01*d01
    vb = (d11*d20-d01*d21)/denominator
    vc = (d00*d21-d01*d20)/denominator
    weights = {}
    for vi, factor in zip(ids, (1-vb-vc, vb, vc)):
        for group in proxy.data.vertices[vi].groups:
            weights[group.group] = weights.get(group.group, 0) + max(0, factor)*group.weight
    selected = sorted(weights.items(), key=lambda entry:entry[1], reverse=True)[:4]
    total = sum(w for _, w in selected)
    assert total > 0
    for gi, weight in selected:
        if weight > 1e-7: mesh.vertex_groups[gi].add([vertex.index], weight/total, 'REPLACE')
mesh.parent = rig
arm = mesh.modifiers.new('Joshua body deformation', 'ARMATURE')
arm.object = rig
bpy.data.objects.remove(proxy, do_unlink=True)
mesh.select_set(True)

# Keep the web and Blender deformation methods identical (linear skinning).
for mod in mesh.modifiers:
    if mod.type == 'ARMATURE':
        mod.use_deform_preserve_volume = False

# Bone heat on a voxel proxy can leak across the narrow sleeve/torso gap.
# Anatomical masks separate the intact lower sleeves from the jacket, and fade
# smoothly through the shared shoulder surface. No geometry is cut or replaced.
def smoothstep(a, b, value):
    t = max(0., min(1., (value-a)/(b-a)))
    return t*t*(3-2*t)

group_names = [g.name for g in mesh.vertex_groups]
arm_groups = {side: {i for i, name in enumerate(group_names) if name in [part+'.'+side for part in ('UpperArm', 'Forearm', 'Hand')]} for side in ('L', 'R')}
# Below the armpits, connected components distinguish fingers/sleeves from
# nearby jacket folds far more accurately than a spatial plane can.
neighbors = [[] for _ in mesh.data.vertices]
for edge in mesh.data.edges:
    a, b = edge.vertices
    if mesh.data.vertices[a].co.z < 2.5 and mesh.data.vertices[b].co.z < 2.5:
        neighbors[a].append(b)
        neighbors[b].append(a)
labels = {}
for vertex in mesh.data.vertices:
    if vertex.co.z >= 2.5 or vertex.index in labels: continue
    queue = [vertex.index]
    labels[vertex.index] = None
    component = []
    while queue:
        index = queue.pop()
        component.append(index)
        for neighbor in neighbors[index]:
            if neighbor not in labels:
                labels[neighbor] = None
                queue.append(neighbor)
    points = [mesh.data.vertices[i].co for i in component]
    label = 'L' if min(p.x for p in points) > .3 else 'R' if max(p.x for p in points) < -.3 else 'body'
    for index in component: labels[index] = label
for v in mesh.data.vertices:
    x, y, z = v.co
    if z < 1.48 or z > 3.12: continue
    side = 'L' if x > 0 else 'R'
    boundary = float(np.interp(z, [1.48, 2.0, 2.25, 2.45, 2.65, 2.9, 3.12], [.41,.387,.357,.331,.315,.30,.34]))
    width = float(np.interp(z, [2.45,2.75,2.95], [.012,.07,.10]))
    arm_fraction = smoothstep(boundary-width, boundary+width, abs(x))
    if v.index in labels:
        arm_fraction = 1. if labels[v.index] in ('L','R') else 0.
        if arm_fraction: side = labels[v.index]
    arm_values = {g.group:g.weight for g in v.groups if g.group in arm_groups[side]}
    body_values = {g.group:g.weight for g in v.groups if g.group not in arm_groups['L']|arm_groups['R']}
    for group in mesh.vertex_groups: group.remove([v.index])
    if not arm_values: arm_values = {mesh.vertex_groups['UpperArm.'+side].index:1.}
    if not body_values:
        target = 'Hips' if z < 2.03 else 'Spine' if z < 2.4 else 'Chest'
        body_values = {mesh.vertex_groups[target].index:1.}
    for values, fraction in ((arm_values,arm_fraction),(body_values,1-arm_fraction)):
        total = sum(values.values())
        if fraction < 1e-7: continue
        for gi,w in values.items():
            if w/total*fraction > 1e-7: mesh.vertex_groups[gi].add([v.index], w/total*fraction, 'REPLACE')

# Limit and normalize for glTF's four influences, without weights on Root.
bpy.context.view_layer.objects.active = mesh
rig.select_set(False)
bpy.ops.object.vertex_group_limit_total(limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
unbound = [v.index for v in mesh.data.vertices if sum(g.weight for g in v.groups) < .999]
assert not unbound, f'Unbound vertices after heat weighting: {len(unbound)}'

# Head details (eyes, eyebrows, beard and hair) move together. Avoid rubber face
# deformation from small heat-weight influences outside the head/neck boundary.
head_group = mesh.vertex_groups['Head']
head_vertices = [v.index for v in mesh.data.vertices if v.co.z >= 3.32]
for group in mesh.vertex_groups:
    group.remove(head_vertices)
head_group.add(head_vertices, 1.0, 'REPLACE')

# Smooth on actual surface adjacency (never across the air gap between sleeve
# and jacket) to remove abrupt masks at the armpits and head/neck boundary.
vertex_count, group_count = len(mesh.data.vertices), len(mesh.vertex_groups)
weights = np.zeros((vertex_count, group_count), dtype=np.float64)
for vertex in mesh.data.vertices:
    for group in vertex.groups: weights[vertex.index, group.group] = group.weight
edge_pairs = np.array([edge.vertices[:] for edge in mesh.data.edges], dtype=np.int32)
positions = np.array([vertex.co[:] for vertex in mesh.data.vertices])
edge_lengths = np.linalg.norm(positions[edge_pairs[:,0]]-positions[edge_pairs[:,1]],axis=1)
influence = 1/np.maximum(edge_lengths,.001)
source_indices = np.concatenate((edge_pairs[:,0],edge_pairs[:,1]))
neighbor_indices = np.concatenate((edge_pairs[:,1],edge_pairs[:,0]))
factors = np.concatenate((influence,influence))
degrees = np.bincount(source_indices,weights=factors,minlength=vertex_count)
for _ in range(24):
    averaged = np.empty_like(weights)
    for gi in range(group_count):
        sums = np.bincount(source_indices,weights=weights[neighbor_indices,gi]*factors,minlength=vertex_count)
        averaged[:,gi] = np.divide(sums,degrees,out=weights[:,gi].copy(),where=degrees>0)
    weights = .45*weights+.55*averaged
all_indices = list(range(vertex_count))
for group in mesh.vertex_groups: group.remove(all_indices)
for vi,row in enumerate(weights):
    chosen = np.argsort(row)[-4:]
    total = sum(row[gi] for gi in chosen)
    assert total > 0
    for gi in chosen:
        if row[gi] > 1e-7: mesh.vertex_groups[int(gi)].add([vi],float(row[gi]/total),'REPLACE')
print('TOPOLOGICAL_WEIGHT_SMOOTHING', 24, 'iterations', flush=True)

collections = {name: arm_data.collections.new(name) for name in ('Body', 'Arms', 'Legs')}
for b in arm_data.bones:
    category = 'Arms' if any(x in b.name for x in ('Clavicle', 'Arm', 'Forearm', 'Hand')) else 'Legs' if any(x in b.name for x in ('Thigh', 'Shin', 'Foot', 'Toe')) else 'Body'
    collections[category].assign(b)
    b.color.palette = 'THEME04' if b.name.endswith('.L') else 'THEME03' if b.name.endswith('.R') else 'THEME02'
for pb in rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb.lock_scale = (True, True, True)
    if pb.name != 'Root': pb.lock_location = (True, True, True)
rig['Rig type'] = 'FK body rig; rotate named bones in Pose Mode; Root moves the whole character'
rig['Limitations'] = 'No independent fingers, face or lip sync. Generated triangular topology: use moderate joint bends.'

def clear_pose():
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)

def rotate(name, xyz):
    pb = rig.pose.bones[name]
    rest = pb.bone.matrix_local.to_quaternion()
    q = Euler(tuple(math.radians(v) for v in xyz), 'XYZ').to_quaternion()
    pb.rotation_quaternion = rest.inverted() @ q @ rest

def set_pose(name, phase=0):
    clear_pose()
    if name in ('Greeting', 'Wave'):
        wave = math.sin(phase * math.tau) if name == 'Wave' else 0
        rotate('UpperArm.R', (4, 57, 0))
        rotate('Forearm.R', (0, 105 + wave*8, 0))
        rotate('Hand.R', (0, 8 + wave*7, 7))
        rotate('Head', (0, -3, -3))
        rotate('UpperArm.L', (0, -4, 0))
    elif name == 'Present':
        rotate('UpperArm.L', (8, -22, 0))
        rotate('Forearm.L', (-52, -32, 0))
        rotate('Hand.L', (0, 0, -20))
        rotate('Head', (0, 2, -5))
    elif name == 'Idle':
        breath = math.sin(phase * math.tau)
        rotate('Chest', (.6*breath, 0, .55*breath))
        rotate('Neck', (-.35*breath, 0, 0))
        rotate('Head', (0, 0, -.7*breath))
        rotate('UpperArm.L', (.5*breath, -1.3*breath, 0))
        rotate('UpperArm.R', (-.5*breath, -1.3*breath, 0))

rig.animation_data_create()
clips = []
for name, last in [('Rest', 31), ('Greeting', 31), ('Present', 31), ('Idle', 121), ('Wave', 61)]:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    frames = [1, last] if name in ('Rest', 'Greeting', 'Present') else list(range(1, last+1, 5))
    for frame in frames:
        set_pose(name, (frame-1)/(last-1))
        for pb in rig.pose.bones:
            pb.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=pb.name)
            if pb.name == 'Root': pb.keyframe_insert(data_path='location', frame=frame, group=pb.name)
    for curve in action.fcurves:
        for key in curve.keyframe_points: key.interpolation = 'LINEAR'
    clips.append({'name':name, 'durationSeconds':(last-1)/30, 'kind':'loop' if name in ('Idle','Wave') else 'pose'})
rig.animation_data.action = bpy.data.actions['Rest']
scene.frame_start, scene.frame_end = 1, 121
scene.frame_set(1)
clear_pose()

# A small hand-local attachment point for future props, with no baked-in props.
for side in ('L', 'R'):
    empty = bpy.data.objects.new('Grip.'+side, None)
    scene.collection.objects.link(empty)
    empty.empty_display_type = 'SPHERE'
    empty.empty_display_size = .05
    empty.parent = rig
    empty.parent_type = 'BONE'
    empty.parent_bone = 'Hand.'+side
    empty.location = (0, -.09, 0)
    empty.hide_render = True

note = bpy.data.texts.get('START HERE') or bpy.data.texts.new('START HERE')
note.clear()
note.write('JOSHUA - POSEABLE BODY RIG\n\nSelect Joshua_Rig and enter Pose Mode (Ctrl+Tab). Rotate named bones with R; Root moves the whole body. Body/Arms/Legs bone collections organize controls. Alt+R resets selected rotations.\n\nActions in the Action Editor: Rest, Greeting and Present (held poses), Idle (4s loop), Wave (2s loop), at 30fps. Choose an action and scrub or play. Actions are saved with fake users.\n\nGrip.L and Grip.R are hand-parented attachment empties. Align a prop to a grip and parent it there. No props are included.\n\nLinear skinning with at most four normalized weights per vertex. Generated triangle topology, not a production retopology: use moderate body poses and inspect new extreme bends. No finger, facial or lip-sync rig.\n\nStatic input files and original download are unchanged. Rebuild script: scripts/rig-hi3d-avatar.py.\n')

bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.overlay.show_extras = True
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE))

# Resize copies in memory AFTER saving: editable file retains packed source maps.
for img in bpy.data.images:
    if img.type == 'IMAGE' and img.size[0] > 2048:
        ratio = 2048/max(img.size)
        img.scale(round(img.size[0]*ratio), round(img.size[1]*ratio))
        img.pack()
mesh.select_set(True)
for obj in scene.objects:
    if obj.name.startswith('Grip.'): obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS', export_frame_range=False,
    export_force_sampling=True, export_anim_single_armature=True,
    export_def_bones=False, export_yup=True, export_image_format='JPEG', export_jpeg_quality=92,
    export_skins=True, export_all_influences=False, export_extras=True)

manifest = {
    'name':'Joshua Bigaud - body rig', 'version':1,
    'inputBlend':'avatar/hi3d-portfolio.blend', 'inputBlendSha256':source_hash,
    'staticGlbSha256':static_hash, 'editableCopy':'avatar/hi3d-rigged.blend',
    'webAsset':'assets/avatar/joshua-avatar-rigged.glb', 'webBytes':OUT.stat().st_size,
    'webSha256':digest(OUT), 'vertices':len(mesh.data.vertices), 'triangles':len(mesh.data.polygons),
    'bones':[b.name for b in rig.data.bones], 'deformBoneCount':sum(b.use_deform for b in rig.data.bones),
    'maxInfluences':4, 'weighting':'Watertight voxel proxy bone heat; barycentric surface transfer; connected sleeve/torso masks; rigid head detail correction; 24 adjacency smoothing passes; four-influence normalization',
    'clips':clips, 'attachmentNodes':['Grip.L','Grip.R'], 'framesPerSecond':30,
    'limitations':['FK body rig with moderate pose range on generated triangular topology',
        'No individual finger, facial, blink or lip-sync controls', 'No IK controllers or humanoid retargeting preset'],
}
assert digest(SOURCE) == source_hash and digest(ROOT/'assets/avatar/joshua-avatar.glb') == static_hash
(OUT.parent/'rig-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('RIG_READY', json.dumps(manifest), flush=True)
