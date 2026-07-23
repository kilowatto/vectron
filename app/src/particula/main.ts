import * as THREE from "three/webgpu";
import { createEngine } from "../scene/engine";
import { createHeroParticle, ensureEnvironment } from "./heroParticle";
import { ParticulaState } from "./state";
import { BIRTH_VARIANTS } from "./animations/birth";
import { DIVISION_VARIANTS } from "./animations/division";
import { UNION_VARIANTS } from "./animations/union";
import { DEATH_VARIANTS } from "./animations/death";
import { CONNECTOR_STYLES } from "./connectorLines";

const canvas = document.querySelector<HTMLCanvasElement>("#particula-canvas")!;

async function main() {
  const engine = await createEngine(canvas);
  ensureEnvironment(engine.renderer, engine.scene);

  // "que se cree una partícula en el centro con zoom donde se vea
  // bien" — engine.ts trae una cámara calibrada para el cubo de miles
  // de conceptos de la app real; aquí sólo hay 1-8 partículas de
  // ~0.32 de radio, así que la acercamos mucho más para que llene
  // buena parte del cuadro desde el primer instante.
  engine.camera.position.set(0.9, 0.65, 1.5);
  engine.controls.target.set(0, 0, 0);
  engine.controls.minDistance = 0.5;
  engine.controls.maxDistance = 6;
  engine.controls.autoRotate = false;

  // Luz ambiental + direccional suave: MeshPhysicalMaterial necesita
  // luces reales en la escena para que transmisión/clearcoat/fresnel
  // tengan algo que reflejar además del mapa de entorno.
  engine.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(2, 3, 2);
  engine.scene.add(keyLight);

  const state = new ParticulaState(engine.scene);
  state.attachCamera(engine.camera, engine.controls);

  // Primera partícula, ya en el centro, revelada con el estilo de
  // nacimiento por defecto pero instantánea (duración corta fija) —
  // no queremos que la carga de la página dependa del slider.
  const seedMesh = createHeroParticle(0x5fc9ff);
  seedMesh.position.set(0, 0, 0);
  engine.scene.add(seedMesh);
  state.seed(seedMesh);

  setupUi(state, engine.camera, canvas);

  engine.start(
    (dt) => state.tick(dt),
    (fps) => {
      const el = document.querySelector<HTMLSpanElement>("#particula-count");
      if (el) el.dataset.fps = String(fps);
    },
  );
}

function populateSelect(select: HTMLSelectElement, variants: Record<string, { label: string }>, defaultKey: string) {
  select.innerHTML = "";
  for (const [key, v] of Object.entries(variants)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = v.label;
    select.appendChild(opt);
  }
  select.value = defaultKey;
}

function setupUi(state: ParticulaState, camera: THREE.Camera, canvas: HTMLCanvasElement) {
  const durationSlider = document.querySelector<HTMLInputElement>("#duration-slider")!;
  const durationOutput = document.querySelector<HTMLSpanElement>("#duration-output")!;
  const styleNacer = document.querySelector<HTMLSelectElement>("#style-nacer")!;
  const styleDividir = document.querySelector<HTMLSelectElement>("#style-dividir")!;
  const styleUnir = document.querySelector<HTMLSelectElement>("#style-unir")!;
  const styleMorir = document.querySelector<HTMLSelectElement>("#style-morir")!;
  const styleConector = document.querySelector<HTMLSelectElement>("#style-conector")!;
  const connectorToggle = document.querySelector<HTMLInputElement>("#connector-toggle")!;
  const settingsToggle = document.querySelector<HTMLButtonElement>("#particula-settings-toggle")!;
  const sheet = document.querySelector<HTMLDivElement>("#particula-sheet")!;
  const countEl = document.querySelector<HTMLSpanElement>("#particula-count")!;
  const actionButtons = document.querySelectorAll<HTMLButtonElement>(".pbtn[data-action]");

  populateSelect(styleNacer, BIRTH_VARIANTS, "fundido");
  populateSelect(styleDividir, DIVISION_VARIANTS, "espontanea");
  populateSelect(styleUnir, UNION_VARIANTS, "gravitacional");
  populateSelect(styleMorir, DEATH_VARIANTS, "burbuja");
  populateSelect(styleConector, CONNECTOR_STYLES, "sinapsis");

  durationSlider.addEventListener("input", () => {
    durationOutput.textContent = `${Number(durationSlider.value).toFixed(1)}s`;
  });

  settingsToggle.addEventListener("click", () => {
    sheet.classList.toggle("open");
  });

  connectorToggle.addEventListener("change", () => {
    state.setConnectorEnabled(connectorToggle.checked);
  });
  styleConector.addEventListener("change", () => {
    state.setConnectorStyle(styleConector.value);
  });

  function duration(): number {
    return Number(durationSlider.value);
  }

  actionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "nacer") state.birth(styleNacer.value, duration());
      else if (action === "dividir") state.divide(styleDividir.value, duration());
      else if (action === "unir") state.unite(styleUnir.value, duration());
      else if (action === "morir") state.die(styleMorir.value, duration());
    });
  });

  // Tocar/clickear una partícula la selecciona; tocar vacío la
  // deselecciona (vuelve al criterio "más reciente").
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(state.meshes());
    if (hits.length === 0) {
      state.select(null);
      return;
    }
    const id = hits[0].object.userData.particleId as number | undefined;
    state.select(id ?? null);
  }
  canvas.addEventListener("pointerup", (e) => {
    // Evita interpretar un arrastre de OrbitControls como un tap.
    if (e.button !== 0) return;
    pick(e.clientX, e.clientY);
  });

  function refreshUi() {
    const n = state.count();
    countEl.textContent = `${n} ${n === 1 ? "partícula" : "partículas"}`;
    actionButtons.forEach((btn) => {
      const action = btn.dataset.action;
      let enabled = true;
      if (action === "nacer") enabled = state.canBirth();
      else if (action === "dividir") enabled = state.canDivide();
      else if (action === "unir") enabled = state.canUnite();
      else if (action === "morir") enabled = state.canDie();
      btn.disabled = !enabled;
    });
  }
  state.onChange = refreshUi;
  refreshUi();
}

main();
