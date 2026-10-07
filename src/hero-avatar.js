import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const instances = new WeakMap();
const radians = THREE.MathUtils.degToRad;

function disposeObject(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object?.traverse(node => {
    node.shadow?.dispose();
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

/** Enhance the hero's poster with its existing fixed-pose model. Safe to call twice. */
export function initHeroAvatar() {
  const host = document.querySelector('[data-hero-avatar]');
  if (!host) return Promise.resolve(null);
  if (!instances.has(host)) instances.set(host, createHeroAvatar(host));
  return instances.get(host);
}

async function createHeroAvatar(host) {
  const mount = host.querySelector('[data-avatar-canvas]');
  const poster = host.querySelector('.hero-poster');
  const status = host.querySelector('[data-avatar-status]');
  const controls = document.querySelector('[data-avatar-controls]');
  const resetButton = controls?.querySelector('[data-avatar-reset]');
  if (!mount || !poster || !host.dataset.model) return null;

  const events = new AbortController();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const scene = new THREE.Scene();
  const pivot = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 100);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  const rect = host.getBoundingClientRect();
  let visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
  let renderer, canvas, resizeObserver, intersectionObserver;
  let disposed = false, failed = false, loaded = false, ready = false;
  let hasSize = false, suspended = false, frameId = 0, previousTime = 0;
  let currentYaw = 0, currentPitch = 0, spinYaw = 0, peekYaw = 0, peekPitch = 0;
  let pointer = null;

  const setStatus = message => { if (status) status.textContent = message; };
  const canRender = () => loaded && hasSize && visible && !document.hidden && !suspended && !disposed && !failed;
  const listen = (target, name, handler, options = {}) => target.addEventListener(name, handler, { ...options, signal: events.signal });

  function stopFrames() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
  }

  function requestRender() {
    if (canRender() && !frameId) frameId = requestAnimationFrame(render);
  }

  function showPoster() {
    poster.hidden = false;
    if (canvas) canvas.hidden = true;
    if (controls) controls.hidden = true;
    host.classList.remove('is-ready', 'is-loading');
    host.setAttribute('aria-busy', 'false');
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopFrames();
    events.abort();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    disposeObject(scene);
    renderer?.dispose();
    canvas?.remove();
    showPoster();
    instances.delete(host);
  }

  function fallback() {
    if (disposed || failed) return;
    failed = true;
    host.classList.add('is-fallback');
    setStatus('The interactive view is unavailable. The avatar image is still shown.');
    dispose();
  }

  function render(now) {
    frameId = 0;
    if (!canRender()) return;
    const delta = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60;
    previousTime = now;
    const targetYaw = spinYaw + peekYaw;
    const alpha = reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 15);
    currentYaw += (targetYaw - currentYaw) * alpha;
    currentPitch += (peekPitch - currentPitch) * alpha;
    const moving = Math.abs(targetYaw - currentYaw) > .0001 || Math.abs(peekPitch - currentPitch) > .0001;
    if (!moving) { currentYaw = targetYaw; currentPitch = peekPitch; }
    pivot.rotation.set(currentPitch, currentYaw, 0, 'YXZ');
    try {
      renderer.render(scene, camera);
    } catch {
      fallback();
      return;
    }
    if (disposed || failed) return;
    if (renderer.getContext().isContextLost()) { fallback(); return; }
    if (!ready) {
      ready = true;
      canvas.hidden = false;
      poster.hidden = true;
      host.classList.remove('is-loading', 'is-fallback');
      host.classList.add('is-ready');
      host.setAttribute('aria-busy', 'false');
      if (controls) controls.hidden = false;
      setStatus('Interactive avatar ready. Drag horizontally or use the left and right arrow keys to rotate.');
    }
    if (moving) requestRender();
    else previousTime = 0;
  }

  function resize() {
    if (disposed || !renderer) return;
    const width = mount.clientWidth || host.clientWidth;
    const height = mount.clientHeight || host.clientHeight;
    hasSize = width > 0 && height > 0;
    if (!hasSize) { stopFrames(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (loaded) {
      // Reserve room for the same full body at every horizontal rotation.
      const tangent = Math.tan(radians(camera.fov / 2));
      const viewWidth = Math.hypot(size.x, size.z) * 1.14;
      const distance = Math.max(size.y * 1.13 / (2 * tangent), viewWidth / (2 * tangent * camera.aspect)) + size.z * .2;
      camera.position.set(0, size.y * .54, distance);
      camera.lookAt(0, size.y * .5, 0);
    }
    requestRender();
  }

  function reset() {
    spinYaw = peekYaw = peekPitch = 0;
    requestRender();
    setStatus('Avatar returned to the front view.');
  }

  function clearPointer() {
    if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
    pointer = null;
    canvas.style.cursor = 'grab';
  }

  function clearPeek() {
    peekYaw = peekPitch = 0;
    requestRender();
  }

  host.classList.remove('is-fallback');
  host.classList.add('is-loading');
  host.setAttribute('aria-busy', 'true');
  if (controls) controls.hidden = true;
  setStatus('Loading the interactive avatar.');

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.hidden = true;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D avatar. Drag horizontally or use the left and right arrow keys to rotate. Press Home to reset.');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;';
    mount.append(canvas);
    listen(canvas, 'webglcontextlost', event => { event.preventDefault(); fallback(); });

    scene.add(pivot);
    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x85877f, 2));
    const key = new THREE.DirectionalLight(0xfff0df, 2.2);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -2;
    key.shadow.normalBias = .025; key.shadow.bias = -.0001;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe6edff, .8);
    fill.position.set(4, 4, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff3e0, 1.1);
    rim.position.set(2, 4, -3); scene.add(rim);

    listen(canvas, 'pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || !ready) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: spinYaw, dragging: false, vertical: false };
    });
    listen(canvas, 'pointermove', event => {
      if (pointer?.id === event.pointerId) {
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        if (pointer.vertical) return;
        if (!pointer.dragging) {
          if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { pointer.vertical = true; return; }
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
          pointer.dragging = true;
          canvas.setPointerCapture(event.pointerId);
          canvas.focus({ preventScroll: true });
          canvas.style.cursor = 'grabbing';
          peekYaw = peekPitch = 0;
        }
        spinYaw = pointer.yaw + dx / Math.max(240, mount.clientWidth) * Math.PI * 2;
        requestRender();
      } else if (!pointer && finePointer.matches && !reducedMotion.matches && event.pointerType !== 'touch') {
        const bounds = canvas.getBoundingClientRect();
        const x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
        const y = THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
        peekYaw = x * radians(8);
        peekPitch = -y * radians(4);
        requestRender();
      }
    });
    listen(canvas, 'pointerup', event => { if (pointer?.id === event.pointerId) clearPointer(); });
    listen(canvas, 'pointercancel', clearPointer);
    listen(canvas, 'lostpointercapture', () => { pointer = null; canvas.style.cursor = 'grab'; });
    listen(canvas, 'pointerleave', () => { if (!pointer?.dragging) { clearPointer(); clearPeek(); } });
    listen(canvas, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') reset();
      else {
        spinYaw += radians(event.key === 'ArrowLeft' ? -10 : 10);
        peekYaw = peekPitch = 0;
        requestRender();
      }
    });
    if (resetButton) listen(resetButton, 'click', reset);
    listen(reducedMotion, 'change', clearPeek);
    listen(finePointer, 'change', clearPeek);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { clearPointer(); stopFrames(); }
      else requestRender();
    });
    listen(window, 'pagehide', event => {
      if (event.persisted) { suspended = true; clearPointer(); stopFrames(); }
      else dispose();
    });
    listen(window, 'pageshow', () => { suspended = false; resize(); requestRender(); });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) requestRender();
      else { clearPointer(); stopFrames(); }
    });
    intersectionObserver.observe(host);

    const gltf = await new GLTFLoader().loadAsync(host.dataset.model);
    if (disposed) { disposeObject(gltf.scene); return null; }
    const avatar = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(avatar);
    bounds.getSize(size); bounds.getCenter(center);
    if (!Number.isFinite(size.y) || size.y <= 0) { disposeObject(avatar); throw new Error('Invalid avatar bounds'); }
    avatar.position.x -= center.x;
    avatar.position.y -= bounds.min.y;
    avatar.position.z -= center.z;
    avatar.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    pivot.add(avatar);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size.y * 3, size.y * 3), new THREE.ShadowMaterial({ opacity: .13 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -.025;
    shadow.receiveShadow = true;
    scene.add(shadow);
    loaded = true;
    resize();
    return { reset, dispose };
  } catch {
    fallback();
    return null;
  }
}
