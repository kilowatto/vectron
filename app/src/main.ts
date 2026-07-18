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

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const backendTag = document.querySelector<HTMLSpanElement>("#backend-tag")!;
const fpsLabel = document.querySelector<HTMLSpanElement>("#fps")!;
const countLabel = document.querySelector<HTMLSpanElement>("#count")!;

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const usingWebGPU =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ===
    true;
  backendTag.textContent = usingWebGPU
    ? "WebGPU · compute activo"
    : "WebGL · modo compatible";

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.22);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.05,
    50,
  );
  camera.position.set(2.1, 1.5, 3.3);

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
  const card = createConceptCard({ detailed: mode !== "principiante" });
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
    pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
    pointerNdc.y = -(clientY / window.innerHeight) * 2 + 1;
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

  // --- Tokenización: resalta en el cubo las palabras del dataset que
  // aparecen en el texto escrito (§07 pasos 1 y 3 del plan) ---
  const tokenPanel = createTokenPanel({
    showToggle: mode !== "principiante",
    showIds: mode !== "principiante",
    placeholder:
      mode === "principiante"
        ? "Escribe algo o toca un ejemplo…"
        : undefined,
  });
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

  // --- Modo avanzado: grafo de tensores + matemáticas de atención,
  // parte integral de la experiencia "Avanzado" (no un extra oculto en
  // los otros modos), cargado sólo al abrirlo (KaTeX no bloquea el bundle) ---
  let advancedPanelUpdate: ((n: number) => void) | null = null;
  let advancedRoot: HTMLDivElement | null = null;

  if (mode === "avanzado") {
    const advancedToggle = document.createElement("button");
    advancedToggle.id = "advanced-toggle";
    advancedToggle.textContent = "Σ grafo de tensores";
    document.body.appendChild(advancedToggle);

    advancedToggle.addEventListener("click", async () => {
      if (!advancedRoot) {
        const { createAdvancedPanelBody } = await import("./ui/advancedPanel");
        const panel = createAdvancedPanelBody();
        advancedRoot = panel.root;
        advancedPanelUpdate = panel.update;
      }
      const visible = advancedRoot.style.display !== "none";
      advancedRoot.style.display = visible ? "none" : "block";
      advancedToggle.classList.toggle("active", !visible);
    });
  }

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode("output");
  const bloomPass = bloom(scenePassColor, 0.32, 0.18, 0.45);

  const renderPipeline = new THREE.RenderPipeline(renderer);
  renderPipeline.outputNode = scenePassColor.add(bloomPass);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

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
