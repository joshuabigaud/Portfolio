"""Memory-bounded preparation for the supplied, single-mesh Hi3D GLB.

Weld identical source positions before decimation, retaining UVs per corner.
The glTF importer is used only for a tiny material carrier after reduction; it
never creates a second copy of the five-million-triangle source mesh.
"""
import copy
import gc
import hashlib
import json
import math
import mmap
import struct
import tempfile
from pathlib import Path

import bpy
import numpy as np

SOURCE_SHA256 = 'ebe65a7249fd0faaa706c6b3575e97990759fb14961a5b0cf7e7565ac5f15b64'


def source_digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def read_source(path):
    """Validate the exact supported source layout; never guess new transforms."""
    assert source_digest(path) == SOURCE_SHA256, 'Different Hi3D source: review topology and transform assumptions first'
    handle = Path(path).open('rb')
    raw = mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ)
    assert struct.unpack_from('<III', raw, 0) == (0x46546C67, 2, len(raw))
    json_size, json_type = struct.unpack_from('<II', raw, 12)
    assert json_type == 0x4E4F534A
    doc = json.loads(raw[20:20 + json_size])
    bin_size, bin_type = struct.unpack_from('<II', raw, 20 + json_size)
    offset = 28 + json_size
    assert bin_type == 0x004E4942 and offset + bin_size == len(raw)
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    assert not any(doc.get(key) for key in ('skins', 'animations', 'extensionsRequired'))
    assert doc['scenes'][doc.get('scene', 0)]['nodes'] == [0]
    assert len(doc['nodes']) == 3 and doc['nodes'][0]['children'] == [1]
    assert doc['nodes'][1]['children'] == [2] and doc['nodes'][2]['mesh'] == 0
    assert len(doc['nodes'][0]['matrix']) == 16
    assert not any(key in node for node in doc['nodes'][1:] for key in ('matrix', 'translation', 'rotation', 'scale'))
    assert len(doc['meshes']) == 1 and len(doc['meshes'][0]['primitives']) == 1
    primitive = doc['meshes'][0]['primitives'][0]
    assert primitive.get('mode', 4) == 4 and not primitive.get('targets')
    assert set(primitive['attributes']) == {'POSITION', 'NORMAL', 'TEXCOORD_0'}
    assert primitive['material'] == 0 and len(doc['materials']) == 1
    return handle, raw, doc, offset


def accessor(raw, doc, binary_offset, index):
    entry = doc['accessors'][index]
    view = doc['bufferViews'][entry['bufferView']]
    assert not entry.get('sparse') and not entry.get('normalized')
    assert view['buffer'] == 0
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[entry['type']]
    dtype = np.dtype({5126: '<f4', 5125: '<u4', 5123: '<u2'}[entry['componentType']])
    stride = width * dtype.itemsize
    assert view.get('byteStride', stride) == stride, 'Interleaved data needs a different reader'
    start = view.get('byteOffset', 0) + entry.get('byteOffset', 0)
    assert entry.get('byteOffset', 0) + entry['count'] * stride <= view['byteLength']
    return np.ndarray((entry['count'], width), dtype=dtype, buffer=raw, offset=binary_offset + start)


def material_carrier(raw, doc, offset, path):
    """Preserve material definitions and original image bytes in a tiny GLB."""
    carrier = {key: copy.deepcopy(doc[key]) for key in ('asset', 'materials', 'textures', 'samplers', 'images')}
    payload = bytearray()
    views = []
    def append(data):
        payload.extend(b'\0' * (-len(payload) % 4))
        views.append({'buffer': 0, 'byteOffset': len(payload), 'byteLength': len(data)})
        payload.extend(data)
        return len(views) - 1
    for image in carrier['images']:
        view = doc['bufferViews'][image['bufferView']]
        start = offset + view.get('byteOffset', 0)
        image['bufferView'] = append(raw[start:start + view['byteLength']])
    position_view = append(struct.pack('<9f', 0, 0, 0, 1, 0, 0, 0, 1, 0))
    uv_view = append(struct.pack('<6f', 0, 0, 1, 0, 0, 1))
    carrier.update({
        'scenes': [{'nodes': [0]}], 'scene': 0, 'nodes': [{'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'TEXCOORD_0': 1}, 'material': 0}]}],
        'accessors': [
            {'bufferView': position_view, 'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [0, 0, 0], 'max': [1, 1, 0]},
            {'bufferView': uv_view, 'componentType': 5126, 'count': 3, 'type': 'VEC2'}],
        'bufferViews': views, 'buffers': [{'byteLength': len(payload)}]})
    payload.extend(b'\0' * (-len(payload) % 4))
    encoded = json.dumps(carrier, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    Path(path).write_bytes(struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(payload))
                          + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
                          + struct.pack('<II', len(payload), 0x004E4942) + payload)


def prepare_source(path, target_triangles=120_000):
    handle, raw, doc, offset = read_source(path)
    primitive = doc['meshes'][0]['primitives'][0]
    positions = accessor(raw, doc, offset, primitive['attributes']['POSITION'])
    uv = accessor(raw, doc, offset, primitive['attributes']['TEXCOORD_0'])
    indices = accessor(raw, doc, offset, primitive['indices']).ravel()
    assert len(positions) == len(uv) and len(indices) % 3 == 0
    assert np.isfinite(positions).all() and np.isfinite(uv).all()
    assert int(indices.max()) < len(positions)
    source_triangles = len(indices) // 3
    source_vertices = len(positions)
    unique, inverse = np.unique(positions, axis=0, return_inverse=True)
    unique_count = len(unique)
    matrix = np.array(doc['nodes'][0]['matrix'], dtype=np.float32).reshape(4, 4).T
    assert np.linalg.det(matrix[:3, :3]) > 0
    world = unique @ matrix[:3, :3].T + matrix[:3, 3]
    verts = world[:, [0, 2, 1]].copy()
    verts[:, 1] *= -1
    low, high = verts.min(axis=0), verts.max(axis=0)
    center = np.array([(high[0] + low[0]) / 2, (high[1] + low[1]) / 2, low[2]], dtype=np.float32)
    verts = (verts - center) * (4.05 / (high[2] - low[2]))
    face_indices = inverse[indices].astype(np.int32)
    corner_uvs = uv[indices].copy()
    corner_uvs[:, 1] = 1 - corner_uvs[:, 1]
    del unique, inverse, world, positions, uv, indices
    gc.collect()
    mesh = bpy.data.meshes.new('Source_welded_topology')
    mesh.vertices.add(len(verts))
    mesh.vertices.foreach_set('co', verts.ravel())
    mesh.loops.add(len(face_indices))
    mesh.loops.foreach_set('vertex_index', face_indices)
    mesh.polygons.add(source_triangles)
    mesh.polygons.foreach_set('loop_start', np.arange(source_triangles, dtype=np.int32) * 3)
    mesh.polygons.foreach_set('loop_total', np.full(source_triangles, 3, dtype=np.int32))
    mesh.uv_layers.new(name='UVMap').data.foreach_set('uv', corner_uvs.ravel())
    del verts, face_indices, corner_uvs
    gc.collect()
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new('Joshua_Hi3D', mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new('Exact-welded source reduction', 'DECIMATE')
    modifier.ratio = target_triangles / source_triangles
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    if mesh != obj.data and mesh.users == 0:
        bpy.data.meshes.remove(mesh)
    del mesh
    gc.collect()
    before_validation = len(obj.data.polygons)
    obj.data.validate(clean_customdata=False)
    obj.data.update()
    removed_faces = before_validation - len(obj.data.polygons)
    if obj.data.has_custom_normals:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30), keep_sharp_edges=False)
    obj.data.calc_loop_triangles()
    # Load the full-resolution material only after the large mesh is reduced.
    with tempfile.TemporaryDirectory(prefix='portfolio-avatar-material-') as temp:
        carrier = Path(temp) / 'material.glb'
        material_carrier(raw, doc, offset, carrier)
        raw.close()
        handle.close()
        existing = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(carrier))
        imported = [item for item in bpy.data.objects if item not in existing]
        obj.data.materials.append(next(item.data.materials[0] for item in imported if item.type == 'MESH'))
        for item in imported:
            data = item.data if item.type == 'MESH' else None
            bpy.data.objects.remove(item, do_unlink=True)
            if data and not data.users:
                bpy.data.meshes.remove(data)
        bpy.ops.file.pack_all()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj, {
        'sourceVertices': source_vertices, 'exactWeldedSourceVertices': unique_count,
        'sourceTriangles': source_triangles, 'removedInvalidFaces': removed_faces,
        'smoothAngleDegrees': 30, 'triangles': len(obj.data.loop_triangles)}
