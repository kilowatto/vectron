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
  /** Arranca el loop de render; onFrame corre antes de cada cuadro, onFps cada ~0.5s.
   * onFrame puede devolver `true` ("hay actividad/animación") — en modo
   * render-on-demand (tier Lite, F2) es lo que decide si el cuadro se
   * renderiza o se salta. */
  start(onFrame: (dt: number) => void | boolean, onFps: (fps: number) => void): void;
  /** Renderiza un cuadro ya mismo por el pipeline real (con bloom),
   * sin esperar al próximo rAF — pensado para herramientas que avanzan
   * la simulación a mano (ver /particula) donde rAF puede no estar
   * corriendo. `start()` sigue siendo el camino normal para la app. */
  renderNow(): void;
  /** QualityGovernor (F2 §5.4): se alimenta con el frametime CRUDO por
   * cuadro (antes del clamp de simulación). Tipo estructural para no
   * acoplar el engine al módulo. */
  attachQualityGovernor(g: { update(frameMs: number): void }): void;
  /** Palanca DPR del governor: pixel ratio = min(devicePixelRatio, cap). */
  setDprCap(cap: number): void;
  /** Palanca bloom: reconstruye el outputNode en caliente — REVERSIBLE
   * (prohibido el downgrade one-way de 18 §5). */
  setBloom(strength: number, enabled: boolean): void;
  /** Palanca Lite: con `on`, el loop sigue vivo (controls/damping lo
   * necesitan) pero el render se salta salvo interacción o actividad
   * reportada por onFrame — la escena quieta cuesta ~0. */
  setRenderOnDemand(on: boolean): void;
}

function stageSizeOf(canvas: HTMLCanvasElement): { w: number; h: number } {
  const rect = canvas.parentElement!.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

export interface BloomOptions {
  strength?: number;
  radius?: number;
  threshold?: number;
}

/** Igual que `bloomOverride` — el cubo real (miles de partículas
 * dentro de CUBE_SCALE~1.9) nunca necesita alejar la cámara más de
 * ~9.9 unidades ni niebla más allá de density=0.22, así que esos
 * números viven hardcoded abajo. /particula's lote masivo puede crecer
 * a una nube de mucho más volumen (bug real reportado en vivo:
 * "no hace zoom out para poder ver todo" con apenas 267 partículas) —
 * necesita poder pedir un alcance de cámara/niebla mucho mayor sin
 * tocar los valores calibrados de producción. Omitir `overrides` (como
 * ya hace src/main.ts) deja el comportamiento idéntico al de antes. */
export interface SceneOverrides {
  bloom?: BloomOptions;
  /** `null` apaga la niebla por completo — a las distancias que puede
   * necesitar un lote masivo (decenas de unidades) la FogExp2 real
   * (density=0.22, cuadrática) ya funde todo con el fondo negro mucho
   * antes de esa distancia, así que no basta con sólo alejar la
   * cámara. */
  fogDensity?: number | null;
  cameraFar?: number;
  controlsMaxDistance?: number;
}

/**
 * Motor 3D genérico: renderer WebGPU (con fallback WebGL), cámara,
 * OrbitControls, bloom y el resize/render-loop. No sabe nada de
 * conceptos, modos ni partículas — sólo el "cómo se ve y se mueve".
 */
/** `bloomOverride` — pedido explícito del usuario en /particula ("no
 * se ve eléctrico, debe emitir algo de luz"): el bloom global (0.27
 * fuerza / 0.18 radio / 0.58 umbral) está calibrado para el cubo real
 * con miles de partículas de emissiveIntensity baja — subirlo ahí
 * volaría el contraste de toda la escena de producción. El playground
 * de partículas necesita su propio umbral/fuerza para que el brillo
 * "eléctrico" de 1-8 partículas se lea de verdad, sin tocar el valor
 * que usa la app real (por defecto, si no se pasa `bloomOverride`,
 * el comportamiento es idéntico al de antes). */
export async function createEngine(canvas: HTMLCanvasElement, overrides?: SceneOverrides): Promise<Engine> {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const usingWebGPU =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;

  const scene = new THREE.Scene();
  // `??` no distingue `null` explícito de "no vino" (undefined) — con
  // `overrides?.fogDensity ?? 0.22` un `fogDensity: null` (pedido por
  // /particula para apagar la niebla) se colaba de vuelta a 0.22,
  // bug real visto en vivo (la niebla seguía activa pese al override).
  const fogDensity = overrides && "fogDensity" in overrides ? overrides.fogDensity : 0.22;
  scene.fog = fogDensity === null ? null : new THREE.FogExp2(0x05070a, fogDensity);

  const { w: initW, h: initH } = stageSizeOf(canvas);
  const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.05, overrides?.cameraFar ?? 50);
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
  controls.maxDistance = overrides?.controlsMaxDistance ?? 9.9;
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
  const bloomOverride = overrides?.bloom;
  const renderPipeline = new THREE.RenderPipeline(renderer);
  // Palancas del QualityGovernor (F2 §5.4) — el bloom se reconstruye en
  // caliente (reversible en ambas direcciones); la fuerza/umbral base
  // siguen siendo los de siempre salvo override del lab.
  let bloomStrength = bloomOverride?.strength ?? 0.27;
  let bloomEnabled = true;
  function applyBloomNode() {
    renderPipeline.outputNode = bloomEnabled
      ? scenePassColor.add(bloom(scenePassColor, bloomStrength, bloomOverride?.radius ?? 0.18, bloomOverride?.threshold ?? 0.58))
      : scenePassColor;
  }
  applyBloomNode();

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

  let qualityGovernor: { update(frameMs: number): void } | null = null;
  let renderOnDemand = false;
  let demandDirty = true; // arranca renderizando siempre
  controls.addEventListener("change", () => {
    demandDirty = true;
  });

  function start(onFrame: (dt: number) => void | boolean, onFps: (fps: number) => void) {
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let fpsTimer = 0;

    function tick() {
      const now = performance.now();
      const rawMs = now - last;
      // El governor mide el frametime CRUDO, antes del clamp — el clamp
      // queda sólo para la simulación (18 §5: sin esto la EMA nunca vería
      // un frametime peor que 100ms aunque el dispositivo se arrastre).
      qualityGovernor?.update(rawMs);
      const dt = Math.min(rawMs / 1000, 0.1);
      last = now;

      controls.update();
      const activity = onFrame(dt) === true;
      // Lite (render-on-demand): el rAF sigue vivo (OrbitControls con
      // damping lo necesita para terminar los gestos) pero el render se
      // salta cuando nada cambió — escena quieta a costo ~0.
      if (!renderOnDemand || demandDirty || activity) {
        renderPipeline.render();
        demandDirty = false;
      }

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

  return {
    renderer,
    scene,
    camera,
    controls,
    usingWebGPU,
    start,
    renderNow: () => renderPipeline.render(),
    attachQualityGovernor(g) {
      qualityGovernor = g;
    },
    setDprCap(cap) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
      onResize();
    },
    setBloom(strength, enabled) {
      bloomStrength = strength;
      bloomEnabled = enabled;
      applyBloomNode();
      demandDirty = true;
    },
    setRenderOnDemand(on) {
      renderOnDemand = on;
      demandDirty = true;
    },
  };
}
