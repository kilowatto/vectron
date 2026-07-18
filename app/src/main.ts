import "./style.css";
import "katex/dist/katex.min.css";
import * as THREE from "three/webgpu";
import { createParticleField, spinField } from "./scene/particleField";
import { createEngine } from "./scene/engine";
import { setupConceptInteraction } from "./scene/conceptInteraction";
import { fetchConcepts } from "./data/concepts";
import { createConceptCard } from "./ui/conceptCard";
import { composeModeUI } from "./ui/modeComposition";
import { getStoredMode, showModeSelect, createModeSwitcher } from "./ui/modeSelect";

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

  const engine = await createEngine(canvas);
  backendTag.textContent = engine.usingWebGPU
    ? "WebGPU · compute activo"
    : "WebGL · modo compatible";

  const field = createParticleField(concepts);
  engine.scene.add(field.group);

  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 2.8, 2.8)),
    new THREE.LineBasicMaterial({
      color: 0xd98a34,
      transparent: true,
      opacity: 0.12,
    }),
  );
  engine.scene.add(cubeEdges);

  countLabel.textContent = `${field.count.toLocaleString("es-MX")} conceptos`;

  const card = createConceptCard({
    detailed: mode !== "principiante",
    pinnedAnchor: mode === "principiante" ? "center" : "bottom",
  });

  setupConceptInteraction({
    canvas,
    camera: engine.camera,
    field,
    card,
    defaultTopK: mode === "principiante" ? 5 : 6,
  });

  await composeModeUI(mode, appEl, dockEl, field);

  engine.start(
    (dt) => spinField(field, dt),
    (fps) => {
      fpsLabel.textContent = `${fps} fps`;
    },
  );
}

main().catch((err) => {
  backendTag.textContent = "error al iniciar el motor 3D";
  countLabel.textContent = "—";
  console.error(err);
});
