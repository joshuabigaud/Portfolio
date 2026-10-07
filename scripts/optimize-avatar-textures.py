"""Resize embedded web GLB textures while retaining geometry, UVs and PBR channels.

Run after prepare-hi3d-avatar.py with Python + Pillow. The supplied Hi3D original
and the packed Blender working file are never changed by this step.
"""
from io import BytesIO
import json
from pathlib import Path
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'assets/avatar/joshua-avatar.glb'
raw = PATH.read_bytes()
assert raw[:4] == b'glTF' and struct.unpack_from('<I', raw, 4)[0] == 2
json_size, json_type = struct.unpack_from('<II', raw, 12)
assert json_type == 0x4E4F534A
doc = json.loads(raw[20:20+json_size])
bin_size, bin_type = struct.unpack_from('<II', raw, 20+json_size)
assert bin_type == 0x004E4942 and len(doc['buffers']) == 1
binary = raw[28+json_size:28+json_size+bin_size]
replacements = {}
report = []
for entry in doc.get('images', []):
    index = entry['bufferView']
    view = doc['bufferViews'][index]
    start = view.get('byteOffset', 0)
    image = Image.open(BytesIO(binary[start:start+view['byteLength']]))
    original_size = image.size
    image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    output = BytesIO()
    # No color conversion: encoded RGB channels retain the source map meaning.
    image.convert('RGB').save(output, format='JPEG', quality=92, subsampling=0, optimize=True)
    replacements[index] = output.getvalue()
    entry['mimeType'] = 'image/jpeg'
    report.append({'sourceSize':original_size,'webSize':image.size,'bytes':len(replacements[index])})
parts = bytearray()
for index, view in enumerate(doc['bufferViews']):
    parts.extend(b'\x00' * (-len(parts) % 4))
    start = view.get('byteOffset', 0)
    data = replacements.get(index, binary[start:start+view['byteLength']])
    view['byteOffset'] = len(parts)
    view['byteLength'] = len(data)
    parts.extend(data)
doc['buffers'][0]['byteLength'] = len(parts)
parts.extend(b'\x00' * (-len(parts) % 4))
encoded = json.dumps(doc,separators=(',',':')).encode('utf-8')
encoded += b' ' * (-len(encoded) % 4)
result = struct.pack('<III',0x46546C67,2,28+len(encoded)+len(parts))
result += struct.pack('<II',len(encoded),0x4E4F534A) + encoded
result += struct.pack('<II',len(parts),0x004E4942) + parts
PATH.write_bytes(result)
manifest_path = PATH.with_name('manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['webBytes'] = len(result)
manifest['webTextures'] = report
manifest['preparation'] += '; web texture maps resized to 2048px'
manifest_path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'webBytes':len(result),'textures':report}))
