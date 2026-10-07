import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (selector) => document.querySelector(selector);
const stage = $('#stage');
const status = $('#action-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const anglePresets = {
  'three-quarter': { radians: Math.PI / 8, label: 'Three-quarter' },
  front: { radians: 0, label: 'Front' },
  side: { radians: Math.PI / 2, label: 'Side' },
  back: { radians: Math.PI, label: 'Back' },
};
const clipPresets = {
  Rest: { label: 'Rest', animated: false },
  Greeting: { label: 'Greeting', animated: false },
  Present: { label: 'Present', animated: false },
  Idle: { label: 'Idle', animated: true },
  Wave: { label: 'Wave', animated: true },
};
const animationClips = new Map();
const modelBounds = new THREE.Box3();
const modelSize = new THREE.Vector3();
const modelCenter = new THREE.Vector3();
let renderer, scene, camera, controls, floor, shadow;
let mixer, activeAction, currentClip = null, animationPlaying = false;
let portrait = false, currentAngle = 'three-quarter', fittedDistance = 0;
let animationId, exporting = false, contextLost = false, renderNeeded = true;
let lastFrame = performance.now();

function requestRender() { renderNeeded = true; }
function setStatus(message) { status.textContent = message; }
function setControlsEnabled(enabled) {
  for (const element of document.querySelectorAll('fieldset, .avatar-downloads button, .stage-toolbar button')) element.disabled = !enabled;
  syncAnimationControls();
}
function syncAnimationControls() {
  document.querySelectorAll('[data-clip]').forEach(button => {
    button.disabled = !animationClips.has(button.dataset.clip);
    button.setAttribute('aria-pressed', String(button.dataset.clip === currentClip));
  });
  const canPlay = Boolean(activeAction && clipPresets[currentClip]?.animated);
  $('#play-animation').disabled = !canPlay;
  $('#play-animation').textContent = animationPlaying ? 'Pause animation' : 'Play animation';
  $('#play-animation').setAttribute('aria-pressed', String(animationPlaying));
  $('#reset-pose').disabled = !animationClips.has('Rest');
  $('#motion-preference').hidden = !reducedMotion.matches;
}
function selectClip(name, { play = false, announce = true } = {}) {
  const clip = animationClips.get(name);
  if (!mixer || !clip) return;
  mixer.stopAllAction();
  currentClip = name;
  animationPlaying = play && clipPresets[name].animated;
  activeAction = mixer.clipAction(clip);
  activeAction.reset();
  activeAction.setLoop(clipPresets[name].animated ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  activeAction.clampWhenFinished = true;
  activeAction.play();
  activeAction.paused = !animationPlaying;
  mixer.update(0);
  syncAnimationControls();
  requestRender();
  if (announce) setStatus(clipPresets[name].animated
    ? `${clipPresets[name].label} animation ${animationPlaying ? 'playing' : 'paused'}.`
    : `${clipPresets[name].label} pose selected.`);
}
function pauseAnimation() {
  animationPlaying = false;
  if (activeAction) activeAction.paused = true;
  syncAnimationControls();
  requestRender();
}
function syncAngleButtons() {
  $('#angle-options').querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.angle === currentAngle));
  });
}
function stopTurntable() {
  $('#turntable').checked = false;
  controls.autoRotate = false;
}
function framing() {
  const height = modelSize.y;
  const width = Math.hypot(modelSize.x, modelSize.z);
  const viewHeight = portrait ? height * .57 : height * 1.16;
  const viewWidth = portrait ? Math.min(width, height * .62) * 1.16 : Math.max(width * 1.12, height * .64);
  const target = modelCenter.clone();
  target.y = portrait ? modelBounds.max.y - height * .255 : modelCenter.y;
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = Math.max(viewHeight / (2 * tangent), viewWidth / (2 * tangent * camera.aspect)) + modelSize.z * .2;
  return { target, distance };
}
function fitView(radians) {
  const view = framing();
  // Flush residual drag damping before applying an exact angle or framing preset.
  controls.enableDamping = false;
  controls.update();
  controls.target.copy(view.target);
  const elevation = portrait ? .065 : .1;
  const offset = new THREE.Vector3(Math.sin(radians) * Math.cos(elevation), Math.sin(elevation), Math.cos(radians) * Math.cos(elevation));
  camera.position.copy(view.target).addScaledVector(offset, view.distance);
  fittedDistance = view.distance;
  controls.maxDistance = Math.max(modelSize.y * 5, view.distance * 2.5);
  controls.update();
  controls.enableDamping = true;
  requestRender();
}
function selectAngle(name, announce = true) {
  stopTurntable();
  currentAngle = name;
  fitView(anglePresets[name].radians);
  syncAngleButtons();
  if (announce) setStatus(`${anglePresets[name].label} view selected.`);
}
function resize() {
  const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  if (fittedDistance) {
    const nextDistance = framing().distance;
    // Preserve the visitor's orbit and relative zoom when the layout changes.
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(nextDistance / fittedDistance);
    camera.position.copy(controls.target).add(offset);
    fittedDistance = nextDistance;
    controls.maxDistance = Math.max(modelSize.y * 5, nextDistance * 2.5);
    controls.update();
  }
  requestRender();
}
function frame(now) {
  animationId = requestAnimationFrame(frame);
  const delta = Math.min((now - lastFrame) / 1000, .05);
  lastFrame = now;
  if (document.hidden || exporting || contextLost) return;
  if (animationPlaying && mixer) mixer.update(delta);
  controls.autoRotate = $('#turntable').checked && !reducedMotion.matches;
  const moving = controls.update(delta);
  if (renderNeeded || moving || controls.autoRotate || animationPlaying) {
    renderer.render(scene, camera);
    renderNeeded = false;
  }
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function savePNG() {
  if (exporting || contextLost) return;
  exporting = true;
  setControlsEnabled(false);
  controls.enabled = false;
  const size = renderer.getSize(new THREE.Vector2());
  const pixelRatio = renderer.getPixelRatio();
  try {
    setStatus('Preparing your transparent image…');
    floor.visible = false; shadow.visible = false;
    renderer.setPixelRatio(1);
    const width = Math.min(2000, Math.round(size.x / size.y * 1800));
    renderer.setSize(width, Math.round(width / camera.aspect), false);
    renderer.render(scene, camera);
    const blob = await new Promise(resolve => renderer.domElement.toBlob(resolve, 'image/png'));
    if (!blob || contextLost) throw new Error('PNG export interrupted');
    download(blob, `joshua-${(currentClip || 'rest').toLowerCase()}-${portrait ? 'portrait' : 'full-body'}-${currentAngle || 'custom'}.png`);
    setStatus('Transparent PNG ready. Check your downloads.');
  } catch (error) {
    setStatus('Image export failed. Please try again.');
    console.error(error);
  } finally {
    floor.visible = true; shadow.visible = true;
    renderer.setPixelRatio(pixelRatio); renderer.setSize(size.x, size.y, false);
    exporting = false;
    controls.enabled = !contextLost;
    setControlsEnabled(!contextLost);
    requestRender();
  }
}
function markCustomAngle() {
  currentAngle = null;
  syncAngleButtons();
}
function onKeyDown(event) {
  if (exporting || contextLost || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
  event.preventDefault();
  stopTurntable();
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') spherical.theta -= .13;
  if (event.key === 'ArrowRight') spherical.theta += .13;
  if (event.key === 'ArrowUp') spherical.phi -= .1;
  if (event.key === 'ArrowDown') spherical.phi += .1;
  if (['+', '='].includes(event.key)) spherical.radius *= .9;
  if (event.key === '-') spherical.radius *= 1.1;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
  controls.update(); markCustomAngle(); requestRender();
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Joshua in 3D. Drag or use the arrow keys to rotate. Scroll, pinch, or use plus and minus to zoom.');
    renderer.domElement.setAttribute('aria-describedby', 'stage-hint');
    stage.append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); contextLost = true; cancelAnimationFrame(animationId);
      if (controls) { controls.enabled = false; stopTurntable(); }
      pauseAnimation();
      $('#poster').hidden = false; $('#load-status').hidden = false;
      $('#load-status').textContent = 'The 3D view was interrupted. Reload this page to reconnect.';
      stage.setAttribute('aria-busy', 'false');
      setControlsEnabled(false);
      renderer.domElement.hidden = true;
    });
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, .06, 80);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .09; controls.enablePan = false;
    controls.autoRotateSpeed = .35;
    controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI * .52;
    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', () => { stopTurntable(); markCustomAngle(); });
    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x85877f, 2));
    const key = new THREE.DirectionalLight(0xfff0df, 2.2);
    key.position.set(-3, 6, 5); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -2; key.shadow.normalBias = .025; key.shadow.bias = -.0001;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe6edff, .8); fill.position.set(4, 4, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff3e0, 1.1); rim.position.set(2, 4, -3); scene.add(rim);

    const result = await new GLTFLoader().loadAsync('assets/avatar/joshua-avatar-rigged.glb', progress => {
      if (contextLost) return;
      $('#load-status').textContent = progress.total ? `Loading the 3D avatar… ${Math.round(progress.loaded / progress.total * 100)}%` : 'Loading the 3D avatar…';
    });
    if (contextLost) return;
    const avatar = result.scene;
    avatar.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    scene.add(avatar);
    mixer = new THREE.AnimationMixer(avatar);
    for (const clip of result.animations) {
      if (clipPresets[clip.name]) animationClips.set(clip.name, clip);
    }
    const initialClip = animationClips.has('Rest') ? 'Rest' : animationClips.keys().next().value;
    if (initialClip) selectClip(initialClip, { announce: false });
    modelBounds.setFromObject(avatar); modelBounds.getSize(modelSize); modelBounds.getCenter(modelCenter);
    if (!Number.isFinite(modelSize.y) || modelSize.y <= 0) throw new Error('The avatar has no usable bounds');
    controls.minDistance = modelSize.y * .38;
    const radius = Math.max(modelSize.y * .285, Math.hypot(modelSize.x, modelSize.z) * .52);
    floor = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .045, 96), new THREE.MeshStandardMaterial({ color: 0xd3d5c7, roughness: .9 }));
    floor.position.set(modelCenter.x, modelBounds.min.y - .027, modelCenter.z); floor.receiveShadow = true; scene.add(floor);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .13 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = modelBounds.min.y - .052; shadow.receiveShadow = true; scene.add(shadow);
    resize(); selectAngle('three-quarter', false); renderer.render(scene, camera);
    $('#poster').hidden = true; $('#load-status').hidden = true; stage.setAttribute('aria-busy', 'false');
    setControlsEnabled(true);
    if (!animationClips.size) setStatus('Pose and animation clips are unavailable. You can still explore and save a view.');
    document.querySelectorAll('[data-clip]').forEach(button => button.addEventListener('click', () => {
      selectClip(button.dataset.clip, { play: clipPresets[button.dataset.clip].animated && !reducedMotion.matches });
    }));
    $('#play-animation').addEventListener('click', () => {
      if (!activeAction || !clipPresets[currentClip]?.animated) return;
      animationPlaying = !animationPlaying;
      activeAction.paused = !animationPlaying;
      syncAnimationControls();
      requestRender();
      setStatus(`${clipPresets[currentClip].label} animation ${animationPlaying ? 'playing' : 'paused'}.`);
    });
    $('#reset-pose').addEventListener('click', () => selectClip('Rest'));
    $('#angle-options').addEventListener('click', event => {
      const button = event.target.closest('[data-angle]');
      if (button) selectAngle(button.dataset.angle);
    });
    $('#reset-view').addEventListener('click', () => selectAngle('three-quarter'));
    $('#framing').addEventListener('click', () => {
      stopTurntable(); portrait = !portrait;
      $('#framing').textContent = portrait ? 'Full body view' : 'Portrait view';
      fitView(currentAngle ? anglePresets[currentAngle].radians : controls.getAzimuthalAngle());
      setStatus(portrait ? 'Portrait framing selected.' : 'Full body framing selected.');
    });
    $('#turntable').addEventListener('change', () => {
      if (reducedMotion.matches && $('#turntable').checked) {
        stopTurntable(); setStatus('Automatic rotation is off to follow your reduced-motion preference.');
      } else {
        controls.autoRotate = $('#turntable').checked;
        if (controls.autoRotate) markCustomAngle();
        setStatus(controls.autoRotate ? 'Slow rotation on. Drag the avatar to pause.' : 'Slow rotation paused.');
      }
      requestRender();
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        stopTurntable(); pauseAnimation();
        setStatus('Motion paused to follow your reduced-motion preference. Use Play animation to start it yourself.');
      }
      syncAnimationControls();
      requestRender();
    });
    $('#save-png').addEventListener('click', savePNG);
    renderer.domElement.addEventListener('keydown', onKeyDown);
    new ResizeObserver(resize).observe(stage);
    document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); requestRender(); });
    animationId = requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    if (renderer) renderer.domElement.hidden = true;
    if (controls) controls.enabled = false;
    setControlsEnabled(false);
    $('#poster').hidden = false; $('#load-status').hidden = false;
    stage.setAttribute('aria-busy', 'false');
    $('#load-status').textContent = 'The 3D view could not load. Your browser may need WebGL enabled. You can still download the model.';
  }
}
init();
