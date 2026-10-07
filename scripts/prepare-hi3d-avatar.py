"""Prepare the owner's generated GLB for the static portfolio, without changing the source.

Run with Blender 4.2+: blender --background --threads 1 --python scripts/prepare-hi3d-avatar.py
Then run optimize-avatar-textures.py with Python + Pillow for the web GLB.
Single-thread reduction limits peak memory on the five-million-triangle source.
The earlier procedural character remains under avatar/versions/professional-v2/.
"""
import bpy
import json
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path(r'C:/Users/joshu/Downloads/Hi3D_Untitled_allparts_20261006_075531.glb')
OUT = ROOT / 'assets/avatar'
EDITABLE = ROOT / 'avatar/hi3d-portfolio.blend'
TARGET_TRIANGLES = 120_000
sys.path.insert(0, str(Path(__file__).resolve().parent))
from avatar_source import prepare_source, source_digest

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1
mesh, preparation = prepare_source(INPUT, TARGET_TRIANGLES)
meshes = [mesh]
source_triangles = preparation['sourceTriangles']
OUT.mkdir(parents=True, exist_ok=True)
EDITABLE.parent.mkdir(parents=True, exist_ok=True)
print('OPTIMIZED_MESH', json.dumps(preparation), flush=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'joshua-avatar.glb'), export_format='GLB',
    use_selection=True, export_animations=False, export_yup=True, export_image_format='AUTO')
bpy.ops.object.select_all(action='DESELECT')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 960
scene.render.resolution_y = 1120
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('Studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.65,.65,.65,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .45
scene.world = world
for name, loc, energy, size in [('Key',(-3,-4,7),450,4),('Fill',(4,-2,4),230,3),('Rim',(1,3,5),420,3)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.size = size
    light.rotation_euler = (Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.4,-8,3.6))
camera = bpy.context.object
camera.name = 'Portfolio camera'
camera.rotation_euler = (Vector((0,0,2.025))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 4.75
scene.camera = camera
scene.render.filepath = str(OUT/'joshua-avatar.png')
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_distance = 5.5
        area.spaces.active.region_3d.view_location = (0,0,2.025)
        area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
        area.spaces.active.shading.type = 'MATERIAL'
        area.spaces.active.overlay.show_extras = False
bpy.ops.object.select_all(action='DESELECT')
meshes[0].select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
note = bpy.data.texts.new('START HERE')
note.write('JOSHUA — IMAGE-GENERATED AVATAR\n\nImported from the owner supplied Hi3D GLB.\nThis working copy welds identical source positions before reduction, retains per-corner UVs, and uses smooth shading at 30 degrees. The generated texture maps are preserved.\nIt is a static mesh: there is no skeleton, skinning, facial rig, or animation.\nThe next animation step is topology preparation, rigging and weight painting.\nThe original download is unchanged. Earlier procedural avatars live under avatar/versions/.\n')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE))
manifest = {
    'name':'Joshua Bigaud','version':4,'type':'textured static mesh',
    'workflow':'User-generated concept images, multiple viewpoints, and image-to-3D generation',
    'sourceFile':INPUT.name,'sourceSha256':source_digest(INPUT),
    'sourceBytes':INPUT.stat().st_size,'sourceTriangles':source_triangles,
    'triangles':sum(len(o.data.loop_triangles) for o in meshes),
    'webBytes':(OUT/'joshua-avatar.glb').stat().st_size,
    'bones':[],'poses':[],'textures':True,
    'editableCopy':'avatar/hi3d-portfolio.blend',
    'preparation':'Exact source-position welding before reduction with per-corner UVs retained; uniformly scaled and centered; invalid faces removed; smooth shading at 30 degrees; texture maps preserved',
    **preparation,
}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
bpy.ops.render.render(write_still=True)
print('HI3D_READY', json.dumps(manifest), flush=True)
