import * as THREE from "three/webgpu";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { pass } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface Engine {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  usingWebGPU: boolean;
  /** Arranca el loop de render; onFrame corre antes de cada cuadro, onFps cada ~0.5s. */
  start(onFrame: (dt: number) => void, onFps: (fps: number) => void): void;
}

function stageSizeOf(canvas: HTMLCanvasElement): { w: number; h: number } {
  const rect = canvas.parentElement!.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

/**
 * Motor 3D genérico: renderer WebGPU (con fallback WebGL), cámara,
 * OrbitControls, bloom y el resize/render-loop. No sabe nada de
 * conceptos, modos ni partículas — sólo el "cómo se ve y se mueve".
 */
export async function createEngine(canvas: HTMLCanvasElement): Promise<Engine> {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const usingWebGPU =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.22);

  const { w: initW, h: initH } = stageSizeOf(canvas);
  const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.05, 50);
  // Escalado ×1.52 junto con CUBE_SCALE en seed.ts (1.25->1.9): el cubo
  // real ahora ocupa más volumen, la cámara/órbita tienen que crecer en
  // la misma proporción o quedarían calibradas para un cubo que ya no
  // existe (ver seed.ts para el motivo completo — dataset casi 3x).
  camera.position.set(3.2, 2.3, 5.0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initW, initH);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  // Navegación fina entre partículas: acercamiento mucho mayor que el
  // original (0.35 vs 1.8) y el zoom de la rueda va HACIA el cursor,
  // no hacia el centro — es lo que hace posible "bucear" a un clúster.
  controls.minDistance = 0.53;
  controls.maxDistance = 9.9;
  controls.zoomToCursor = true;
  // Bug real reportado en vivo con grabación de pantalla: el giro
  // automático (antes: field.group.rotation.y += ...) rotaba TODO el
  // grupo alrededor del ORIGEN del mundo — si el centroide de lo
  // visible en el modo actual está lejos del origen (recenterToMode en
  // main.ts ya lo detecta y mueve la cámara ahí), ese giro sacaba el
  // cúmulo entero de cuadro varias veces por vuelta, dejando la
  // pantalla en negro. autoRotate de OrbitControls gira la CÁMARA
  // alrededor de `controls.target` — el mismo punto que recenterToMode
  // ya mantiene sobre el centroide — así que el giro automático queda
  // centrado en lo mismo que ve la cámara, sin importar dónde esté ese
  // punto en el espacio del mundo. autoRotateSpeed en "vueltas/60fps",
  // no rad/s — 0.33 iguala la velocidad visual del giro anterior
  // (0.035 rad/s).
  controls.autoRotateSpeed = 0.33;

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode("output");
  // Restaurado cerca del original (ver particleField.ts baseScaleOf):
  // el espaciado real (CUBE_SCALE en seed.ts) ya resuelve el traslape,
  // apagar el bloom encima de eso dejaba todo sin vida sobre todo en
  // vistas poco densas como Principiante.
  const bloomPass = bloom(scenePassColor, 0.27, 0.18, 0.58);
  const renderPipeline = new THREE.RenderPipeline(renderer);
  renderPipeline.outputNode = scenePassColor.add(bloomPass);

  function onResize() {
    const { w, h } = stageSizeOf(canvas);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  // Cubre resize de ventana y la transición CSS del layout con dock
  // (grid-template-columns, 0.7s) — dispara en cada frame del cambio,
  // no sólo al final, así el canvas nunca se ve deformado.
  new ResizeObserver(onResize).observe(canvas.parentElement!);

  function start(onFrame: (dt: number) => void, onFps: (fps: number) => void) {
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let fpsTimer = 0;

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      controls.update();
      onFrame(dt);
      renderPipeline.render();

      fpsAccum += 1 / dt;
      fpsFrames += 1;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        onFps(Math.round(fpsAccum / fpsFrames));
        fpsAccum = 0;
        fpsFrames = 0;
        fpsTimer = 0;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  return { renderer, scene, camera, controls, usingWebGPU, start };
}
