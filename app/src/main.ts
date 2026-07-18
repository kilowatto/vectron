import "./style.css";
import "katex/dist/katex.min.css";
import * as THREE from "three/webgpu";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { pass } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createParticleField, spinField } from "./scene/particleField";
import { fetchConcepts, fetchSimilar } from "./data/concepts";
import { createConceptCard, type NeighborView } from "./ui/conceptCard";
import { createTokenPanel } from "./ui/tokenPanel";
import { getStoredMode, showModeSelect, createModeSwitcher } from "./ui/modeSelect";
import { staggerIn } from "./ui/motion";
import { createDockHeader } from "./ui/dockHeader";

const appEl = document.querySelector<HTMLDivElement>("#app")!;
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const backendTag = document.querySelector<HTMLSpanElement>("#backend-tag")!;
const fpsLabel = document.querySelector<HTMLSpanElement>("#fps")!;
const countLabel = document.querySelector<HTMLSpanElement>("#count")!;
const dockEl = document.querySelector<HTMLDivElement>("#dock")!;

async function main() {
  const mode = getStoredMode() ?? (await showModeSelect());
  createModeSwitcher(mode);

  countLabel.textContent = "cargando conceptos…";
  const concepts = await fetchConcepts();

  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
  });
  await renderer.init();

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  function stageSize(): { w: number; h: number } {
    const rect = canvas.parentElement!.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  const usingWebGPU =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ===
    true;
  backendTag.textContent = usingWebGPU
    ? "WebGPU · compute activo"
    : "WebGL · modo compatible";

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.22);

  const { w: initW, h: initH } = stageSize();
  const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.05, 50);
  camera.position.set(2.1, 1.5, 3.3);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initW, initH);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.8;
  controls.maxDistance = 6.5;

  const field = createParticleField(concepts);
  scene.add(field.group);

  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 2.8, 2.8)),
    new THREE.LineBasicMaterial({
      color: 0xd98a34,
      transparent: true,
      opacity: 0.12,
    }),
  );
  scene.add(cubeEdges);

  countLabel.textContent = `${field.count.toLocaleString("es-MX")} conceptos`;

  // --- Interacción: hover muestra tooltip, click fija la tarjeta + vecinos ---
  const card = createConceptCard({
    detailed: mode !== "principiante",
    pinnedAnchor: mode === "principiante" ? "center" : "bottom",
  });
  const defaultTopK = mode === "principiante" ? 5 : 6;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let hoveredId: number | null = null;
  let lastPointer = { x: 0, y: 0 };

  // id de Vectorize/D1 (1-based, estable) -> índice de instancia en el
  // InstancedMesh (0-based, orden de llegada del array).
  const idToInstanceId = new Map<number, number>();
  field.concepts.forEach((c, i) => idToInstanceId.set(c.id, i));

  function pickInstance(clientX: number, clientY: number): number | null {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObject(field.mesh);
    return hits.length > 0 ? (hits[0].instanceId ?? null) : null;
  }

  let currentPinnedInstanceId: number | null = null;

  async function loadNeighbors(instanceId: number, topK: number) {
    const concept = field.concepts[instanceId];
    const neighbors = await fetchSimilar(concept.id, topK);
    if (currentPinnedInstanceId !== instanceId) return; // se cerró/cambió mientras cargaba

    const neighborInstanceIds: number[] = [];
    const views: NeighborView[] = [];
    for (const n of neighbors) {
      const nInstanceId = idToInstanceId.get(n.id);
      if (nInstanceId === undefined) continue;
      neighborInstanceIds.push(nInstanceId);
      views.push({ concept: field.concepts[nInstanceId], score: n.score });
    }
    field.setSimilarityLines(instanceId, neighborInstanceIds);
    field.setSearchHighlights(neighborInstanceIds);
    card.showPinned(concept, views, topK, (newTopK) =>
      loadNeighbors(instanceId, newTopK),
    );
  }

  function pinInstance(instanceId: number) {
    currentPinnedInstanceId = instanceId;
    field.setPointerHighlight(instanceId);
    card.showPinned(field.concepts[instanceId], [], defaultTopK, (topK) =>
      loadNeighbors(instanceId, topK),
    );
    loadNeighbors(instanceId, defaultTopK);
  }

  function unpin() {
    currentPinnedInstanceId = null;
    card.hidePinned();
    field.setPointerHighlight(null);
    field.setSearchHighlights([]);
    field.setSimilarityLines(null, []);
  }

  canvas.addEventListener("pointermove", (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (card.isPinned()) return;
    const instanceId = pickInstance(event.clientX, event.clientY);
    if (instanceId === hoveredId) return;
    hoveredId = instanceId;
    field.setPointerHighlight(instanceId);
    if (instanceId !== null) {
      card.showHover(field.concepts[instanceId], event.clientX, event.clientY);
      canvas.style.cursor = "pointer";
    } else {
      card.hideHover();
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("click", () => {
    const instanceId = pickInstance(lastPointer.x, lastPointer.y);
    if (instanceId !== null) {
      pinInstance(instanceId);
    } else if (card.isPinned()) {
      unpin();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && card.isPinned()) {
      unpin();
    }
  });

  // --- Cada modo es su propia composición, no un panel con más o menos
  // botones (ver feedback-vectron-modes): Principiante es de pantalla
  // completa con una barra abajo; Intermedio y Avanzado abren un dock
  // permanente al costado, con contenido distinto en cada uno. ---
  const usesDock = mode === "intermedio" || mode === "avanzado";

  if (usesDock) {
    const tag =
      mode === "avanzado"
        ? "avanzado · matemática real, sin atajos"
        : "intermedio · el mecanismo real, sin la matemática";
    dockEl.appendChild(createDockHeader(tag));
  }

  const tokenPanel = createTokenPanel({
    showToggle: mode !== "principiante",
    showIds: mode !== "principiante",
    placeholder:
      mode === "principiante"
        ? "Escribe algo o toca un ejemplo…"
        : mode === "avanzado"
          ? "Escribe una frase — abajo verás cada paso hasta la atención"
          : undefined,
    mountTo: usesDock ? dockEl : undefined,
    variant: mode === "principiante" ? "bottom" : undefined,
  });

  // El contenido de cada dock se carga aquí, siempre visible de una vez
  // (no detrás de un botón).
  let advancedPanelUpdate: ((n: number) => void) | null = null;
  if (mode === "intermedio") {
    const { createMechanismExplainer } = await import("./ui/mechanismExplainer");
    dockEl.appendChild(createMechanismExplainer());
  } else if (mode === "avanzado") {
    const { createAdvancedPanelBody } = await import("./ui/advancedPanel");
    const panel = createAdvancedPanelBody();
    panel.root.classList.add("docked");
    dockEl.appendChild(panel.root);
    advancedPanelUpdate = panel.update;
  }

  if (usesDock) {
    // Todo el contenido ya existe: ahora sí se abre el layout y se pinta
    // el dock en cascada — nada aparece de golpe. Síncrono a propósito:
    // ya hubo varios `await` antes de este punto (fetch, import, init de
    // WebGPU), de sobra para que el navegador haya pintado el estado
    // "cerrado" — no depende de que un requestAnimationFrame llegue a
    // ejecutarse, que en una pestaña sin foco puede no pasar nunca.
    appEl.classList.add("has-dock");
    staggerIn(dockEl, { step: 90, initialDelay: 150, duration: 550 });
    const advScroll = dockEl.querySelector<HTMLElement>(".adv-scroll");
    if (advScroll) staggerIn(advScroll, { step: 70, initialDelay: 500, duration: 500 });
  }

  const wordIndex = new Map<string, number[]>();
  field.concepts.forEach((concept, instanceId) => {
    for (const w of [concept.word.es, concept.word.en]) {
      const key = w.toLowerCase();
      const list = wordIndex.get(key) ?? [];
      list.push(instanceId);
      wordIndex.set(key, list);
    }
  });

  tokenPanel.onChange((tokens) => {
    const matches = new Set<number>();
    for (const token of tokens) {
      const key = token.text.trim().toLowerCase();
      const ids = wordIndex.get(key);
      if (ids) ids.forEach((id) => matches.add(id));
    }
    field.setSearchHighlights([...matches]);
    advancedPanelUpdate?.(tokens.length);
  });

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode("output");
  const bloomPass = bloom(scenePassColor, 0.32, 0.18, 0.45);

  const renderPipeline = new THREE.RenderPipeline(renderer);
  renderPipeline.outputNode = scenePassColor.add(bloomPass);

  function onResize() {
    const { w, h } = stageSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  // Cubre tanto el resize de ventana como la transición CSS del layout de
  // Avanzado (grid-template-columns, 0.7s) — dispara en cada frame del
  // cambio, no sólo al final, así el canvas nunca se ve deformado.
  new ResizeObserver(onResize).observe(canvas.parentElement!);

  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;

  function tick() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    controls.update();
    spinField(field, dt);
    renderPipeline.render();

    fpsAccum += 1 / dt;
    fpsFrames += 1;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fpsLabel.textContent = `${Math.round(fpsAccum / fpsFrames)} fps`;
      fpsAccum = 0;
      fpsFrames = 0;
      fpsTimer = 0;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

main().catch((err) => {
  backendTag.textContent = "error al iniciar el motor 3D";
  countLabel.textContent = "—";
  console.error(err);
});
