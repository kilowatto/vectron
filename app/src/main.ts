import "./style.css";
import * as THREE from "three/webgpu";
import { createParticleField, spinField } from "./scene/particleField";
import { createEngine } from "./scene/engine";
import { setupConceptInteraction } from "./scene/conceptInteraction";
import { fetchConcepts } from "./data/concepts";
import { getStoredMode, type Mode } from "./ui/components/modeStorage";
import "./ui/components/modeSelect";
import "./ui/components/modeSwitcher";
import type { VxConceptCard } from "./ui/components/conceptCard";
import "./ui/components/conceptCard";
import { composeModeUI } from "./ui/modeComposition";
import type { ModePickDetail } from "./ui/components/modeSelect";

const appEl = document.querySelector<HTMLDivElement>("#app")!;
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const backendTag = document.querySelector<HTMLSpanElement>("#backend-tag")!;
const fpsLabel = document.querySelector<HTMLSpanElement>("#fps")!;
const countLabel = document.querySelector<HTMLSpanElement>("#count")!;
const dockEl = document.querySelector<HTMLDivElement>("#dock")!;

/** Muestra <vx-mode-select> y resuelve cuando el usuario elige un modo. */
function pickMode(): Promise<Mode> {
  return new Promise((resolve) => {
    const picker = document.createElement("vx-mode-select");
    picker.addEventListener(
      "vx-mode-pick",
      (event) => resolve((event as CustomEvent<ModePickDetail>).detail.mode),
      { once: true },
    );
    document.body.appendChild(picker);
  });
}

async function main() {
  const mode = getStoredMode() ?? (await pickMode());

  const switcher = document.createElement("vx-mode-switcher");
  switcher.setAttribute("current", mode);
  document.body.appendChild(switcher);

  // El HUD también habla el idioma de cada modo: Principiante no dice
  // "vector", Avanzado sí y hasta con la notación ℝ del panel de tensores.
  const countUnit =
    mode === "principiante" ? "palabras" : mode === "intermedio" ? "embeddings" : "embeddings · ℝ⁷⁶⁸";

  countLabel.textContent = "cargando…";
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

  countLabel.textContent = `${field.count.toLocaleString("es-MX")} ${countUnit}`;

  const card = document.createElement("vx-concept-card") as VxConceptCard;
  if (mode === "principiante") {
    card.setAttribute("simple", "");
    card.setAttribute("pinned-anchor", "center");
  }
  document.getElementById("stage")!.appendChild(card);

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
