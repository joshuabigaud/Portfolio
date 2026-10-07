import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This checks the exported deliverable, independently of Blender's rig script.
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = path.join(projectRoot, 'assets/avatar/joshua-avatar.glb');
const rigPath = path.resolve(projectRoot, process.argv[2] || 'assets/avatar/joshua-avatar-rigged.glb');
const sourceHash = 'bfca35cae1fd52455f2bae6bf05c790a27d02748722f2b90320edf0fd5a13fd3';
const expectedClips = ['Rest', 'Greeting', 'Present', 'Idle', 'Wave'];
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const readers = {
  5120: 'readInt8', 5121: 'readUInt8', 5122: 'readInt16LE',
  5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE',
};
function integer(value, message) {
  assert.ok(Number.isInteger(value) && value >= 0, message);
  return value;
}
function normalize(value, type) {
  if (type === 5120) return Math.max(value / 127, -1);
  if (type === 5121) return value / 255;
  if (type === 5122) return Math.max(value / 32767, -1);
  if (type === 5123) return value / 65535;
  assert.fail(`Invalid normalized component type: ${type}`);
}

async function loadGlb(filename) {
  const bytes = await readFile(filename);
  assert.ok(bytes.length >= 20, `${filename}: GLB header exists`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${filename}: GLB magic`);
  assert.equal(bytes.readUInt32LE(4), 2, `${filename}: GLB version 2`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${filename}: GLB byte length`);
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    assert.ok(offset + 8 <= bytes.length, 'Complete GLB chunk header');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0, 'GLB chunk is four-byte aligned');
    assert.ok(offset + 8 + length <= bytes.length, 'GLB chunk fits file');
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.equal(chunks[0]?.type, 0x4e4f534a, 'First GLB chunk is JSON');
  assert.equal(chunks.filter(chunk => chunk.type === 0x4e4f534a).length, 1, 'One JSON chunk');
  assert.equal(chunks.filter(chunk => chunk.type === 0x004e4942).length, 1, 'One BIN chunk');
  const gltf = JSON.parse(chunks[0].data.toString('utf8'));
  const binary = chunks.find(chunk => chunk.type === 0x004e4942).data;
  assert.equal(gltf.asset?.version, '2.0', 'glTF version 2');
  assert.equal(gltf.buffers?.length, 1, 'One self-contained binary buffer');
  assert.equal(gltf.buffers[0].uri, undefined, 'No external buffer URI');
  const bufferLength = integer(gltf.buffers[0].byteLength, 'Valid buffer byte length');
  assert.ok(binary.length >= bufferLength && binary.length - bufferLength <= 3, 'BIN length matches buffer plus padding');
  for (const [index, view] of (gltf.bufferViews || []).entries()) {
    assert.equal(view.buffer, 0, `bufferView ${index}: valid buffer`);
    const offset = integer(view.byteOffset ?? 0, `bufferView ${index}: offset`);
    const length = integer(view.byteLength, `bufferView ${index}: length`);
    assert.ok(offset + length <= bufferLength, `bufferView ${index}: fits buffer`);
    if (view.byteStride !== undefined) {
      assert.ok(Number.isInteger(view.byteStride) && view.byteStride >= 4 && view.byteStride <= 252 && view.byteStride % 4 === 0,
        `bufferView ${index}: valid byte stride`);
    }
  }
  for (const [index, image] of (gltf.images || []).entries()) {
    assert.equal(image.uri, undefined, `image ${index}: embedded image`);
    assert.ok(gltf.bufferViews[image.bufferView], `image ${index}: valid bufferView`);
  }
  const cache = new Map();
  function accessor(index) {
    integer(index, 'Accessor index is nonnegative integer');
    if (cache.has(index)) return cache.get(index);
    const definition = gltf.accessors?.[index];
    assert.ok(definition, `Accessor ${index} exists`);
    assert.equal(definition.sparse, undefined, `Accessor ${index}: expected ordinary Blender accessor`);
    const width = components[definition.type];
    const size = componentBytes[definition.componentType];
    assert.ok(width && size, `Accessor ${index}: known type`);
    // Matrix columns using 8/16-bit types have extra alignment; Blender's
    // inverse-bind MAT4 accessors are FLOAT and need no such padding.
    assert.ok(!definition.type.startsWith('MAT') || definition.componentType === 5126,
      `Accessor ${index}: floating-point matrix`);
    const count = integer(definition.count, `Accessor ${index}: count`);
    assert.ok(count > 0, `Accessor ${index}: not empty`);
    const view = gltf.bufferViews?.[definition.bufferView];
    assert.ok(view, `Accessor ${index}: bufferView exists`);
    const offset = integer(definition.byteOffset ?? 0, `Accessor ${index}: offset`);
    const stride = view.byteStride ?? width * size;
    assert.ok(stride >= width * size && stride % size === 0, `Accessor ${index}: valid stride`);
    assert.equal(((view.byteOffset ?? 0) + offset) % size, 0, `Accessor ${index}: component alignment`);
    assert.ok(offset + (count - 1) * stride + width * size <= view.byteLength, `Accessor ${index}: fits bufferView`);
    const values = new Float64Array(count * width);
    for (let item = 0; item < count; item++) {
      for (let component = 0; component < width; component++) {
        const byteOffset = (view.byteOffset ?? 0) + offset + item * stride + component * size;
        let value = binary[readers[definition.componentType]](byteOffset);
        if (definition.normalized) value = normalize(value, definition.componentType);
        assert.ok(Number.isFinite(value), `Accessor ${index}: finite value at ${item}/${component}`);
        values[item * width + component] = value;
      }
    }
    const result = { definition, width, count, values };
    cache.set(index, result);
    return result;
  }
  for (let index = 0; index < (gltf.accessors || []).length; index++) accessor(index);
  return { gltf, bytes, accessor };
}

function triangleCount({ gltf, accessor }) {
  let triangles = 0;
  for (const [meshIndex, mesh] of (gltf.meshes || []).entries()) {
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, `Mesh ${meshIndex}: triangle primitive`);
      const positions = accessor(primitive.attributes.POSITION);
      assert.equal(positions.definition.type, 'VEC3', 'Positions are VEC3');
      const indices = primitive.indices === undefined ? null : accessor(primitive.indices);
      const count = indices?.count ?? positions.count;
      assert.equal(count % 3, 0, 'Complete triangles');
      if (indices) {
        assert.equal(indices.definition.type, 'SCALAR', 'Indices are scalar');
        assert.ok([5121, 5123, 5125].includes(indices.definition.componentType), 'Indices use unsigned integers');
        assert.ok(!indices.definition.normalized, 'Indices are not normalized');
        for (const value of indices.values) assert.ok(value < positions.count, 'Triangle index in range');
      }
      triangles += count / 3;
    }
  }
  return triangles;
}

const source = await loadGlb(sourcePath);
assert.equal(createHash('sha256').update(source.bytes).digest('hex'), sourceHash, 'Original static avatar is preserved byte-for-byte');
const rig = await loadGlb(rigPath);
const { gltf, accessor } = rig;
assert.ok(gltf.skins?.length > 0, 'At least one skin exists');
const skinnedNodes = (gltf.nodes || []).filter(node => node.mesh !== undefined && node.skin !== undefined);
assert.ok(skinnedNodes.length > 0, 'A mesh node actually uses a skin');
const jointCounts = [];
for (const [skinIndex, skin] of gltf.skins.entries()) {
  assert.ok(skin.joints.length >= 15, `Skin ${skinIndex}: humanoid has at least 15 joints`);
  assert.equal(new Set(skin.joints).size, skin.joints.length, `Skin ${skinIndex}: distinct joints`);
  for (const joint of skin.joints) assert.ok(gltf.nodes[joint], `Skin ${skinIndex}: joint node exists`);
  const inverseBinds = accessor(skin.inverseBindMatrices);
  assert.equal(inverseBinds.definition.type, 'MAT4', `Skin ${skinIndex}: inverse-bind matrices`);
  assert.equal(inverseBinds.count, skin.joints.length, `Skin ${skinIndex}: one inverse bind per joint`);
  jointCounts.push(skin.joints.length);
}
let boundVertices = 0;
let maxWeightError = 0;
for (const node of skinnedNodes) {
  const mesh = gltf.meshes?.[node.mesh];
  const skin = gltf.skins[node.skin];
  assert.ok(mesh && skin, 'Skinned node resolves its mesh and skin');
  for (const primitive of mesh.primitives) {
    const positions = accessor(primitive.attributes.POSITION);
    const sets = Object.keys(primitive.attributes).filter(name => /^JOINTS_\d+$/.test(name)).sort();
    assert.ok(sets.includes('JOINTS_0'), 'Primitive includes JOINTS_0');
    const pairs = sets.map(name => {
      const joints = accessor(primitive.attributes[name]);
      const weights = accessor(primitive.attributes[name.replace('JOINTS_', 'WEIGHTS_')]);
      assert.ok([5121, 5123].includes(joints.definition.componentType) && !joints.definition.normalized, 'Joint indices use unnormalized unsigned bytes/shorts');
      assert.ok(weights.definition.componentType === 5126 || ([5121, 5123].includes(weights.definition.componentType) && weights.definition.normalized), 'Weights use floats or normalized unsigned integers');
      for (const data of [joints, weights]) {
        assert.equal(data.definition.type, 'VEC4', 'Skin attributes are VEC4');
        assert.equal(data.count, positions.count, 'Every position has matching skin attributes');
      }
      return { joints, weights };
    });
    for (let vertex = 0; vertex < positions.count; vertex++) {
      let total = 0;
      for (const { joints, weights } of pairs) {
        for (let component = 0; component < 4; component++) {
          const index = vertex * 4 + component;
          assert.ok(joints.values[index] < skin.joints.length, `Vertex ${vertex}: joint index in skin range`);
          const weight = weights.values[index];
          assert.ok(weight >= 0 && weight <= 1, `Vertex ${vertex}: weight in [0,1]`);
          total += weight;
        }
      }
      maxWeightError = Math.max(maxWeightError, Math.abs(total - 1));
      assert.ok(Math.abs(total - 1) <= 0.0001, `Vertex ${vertex}: normalized weights bind the vertex (sum ${total})`);
    }
    boundVertices += positions.count;
  }
}
const triangles = triangleCount(rig);
assert.equal(triangles, triangleCount(source), 'Rig preserves source triangle count');
const animations = gltf.animations || [];
assert.equal(new Set(animations.map(animation => animation.name)).size, animations.length, 'Animation names are unique');
const clipReports = [];
for (const name of expectedClips) {
  const animation = animations.find(candidate => candidate.name === name);
  assert.ok(animation, `Clip ${name} exists`);
  assert.ok(animation.channels?.length > 0, `Clip ${name}: animation channels exist`);
  let earliest = Infinity;
  let latest = -Infinity;
  let varyingTransforms = 0;
  for (const channel of animation.channels) {
    const sampler = animation.samplers[channel.sampler];
    assert.ok(sampler, `Clip ${name}: channel sampler exists`);
    assert.ok(gltf.nodes[channel.target.node], `Clip ${name}: target node exists`);
    assert.ok(['translation', 'rotation', 'scale'].includes(channel.target.path), `Clip ${name}: skeletal transform channel`);
    const input = accessor(sampler.input);
    const output = accessor(sampler.output);
    assert.equal(input.definition.type, 'SCALAR', `Clip ${name}: scalar keyframe times`);
    assert.equal(input.definition.componentType, 5126, `Clip ${name}: float keyframe times`);
    assert.equal(output.definition.componentType, 5126, `Clip ${name}: float transforms`);
    const interpolation = sampler.interpolation ?? 'LINEAR';
    assert.ok(['LINEAR', 'STEP', 'CUBICSPLINE'].includes(interpolation), `Clip ${name}: valid interpolation`);
    const cubic = interpolation === 'CUBICSPLINE';
    assert.equal(output.count, input.count * (cubic ? 3 : 1), `Clip ${name}: matching time/value counts`);
    assert.equal(output.width, channel.target.path === 'rotation' ? 4 : 3, `Clip ${name}: matching transform dimensions`);
    for (let frame = 0; frame < input.count; frame++) {
      const time = input.values[frame];
      assert.ok(time >= 0 && (frame === 0 || time > input.values[frame - 1]), `Clip ${name}: increasing nonnegative times`);
    }
    earliest = Math.min(earliest, input.values[0]);
    latest = Math.max(latest, input.values[input.count - 1]);
    const frameValues = frame => output.values.subarray((frame * (cubic ? 3 : 1) + (cubic ? 1 : 0)) * output.width,
      (frame * (cubic ? 3 : 1) + (cubic ? 2 : 1)) * output.width);
    const first = frameValues(0);
    let varying = false;
    for (let frame = 0; frame < input.count; frame++) {
      const values = frameValues(frame);
      if (channel.target.path === 'rotation') {
        assert.ok(Math.abs(Math.hypot(...values) - 1) < 0.0001, `Clip ${name}: normalized rotation quaternion`);
        // q and -q are the same orientation, so a sign flip is not motion.
        const direct = Math.hypot(...values.map((value, index) => value - first[index]));
        const flipped = Math.hypot(...values.map((value, index) => value + first[index]));
        if (Math.min(direct, flipped) > 0.00001) varying = true;
      } else if (values.some((value, index) => Math.abs(value - first[index]) > 0.00001)) varying = true;
    }
    if (varying) varyingTransforms++;
  }
  const duration = latest - earliest;
  assert.ok(duration > 0, `Clip ${name}: positive duration`);
  if (name === 'Idle' || name === 'Wave') assert.ok(varyingTransforms > 0, `Clip ${name}: actual changing transform data`);
  clipReports.push({ name, durationSeconds: Number(duration.toFixed(4)), channels: animation.channels.length, varyingTransforms });
}
console.log(JSON.stringify({
  verified: true, file: path.relative(projectRoot, rigPath), sourceSha256: sourceHash,
  riggedSha256: createHash('sha256').update(rig.bytes).digest('hex'),
  triangles, boundVertices, skins: gltf.skins.length, jointCounts,
  maxWeightError, clips: clipReports,
}, null, 2));
