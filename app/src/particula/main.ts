import * as THREE from "three/webgpu";
import { createEngine } from "../scene/engine";
import { createHeroParticle, ensureEnvironment } from "./heroParticle";
import { ParticulaState } from "./state";
import { BIRTH_VARIANTS } from "./animations/birth";
import { DIVISION_VARIANTS } from "./animations/division";
import { UNION_VARIANTS } from "./animations/union";
import { DEATH_VARIANTS } from "./animations/death";
import { CONNECTOR_STYLES } from "./connectorLines";
import { loadConfig, saveConfig, exportConfigJSON, type ParticulaConfig } from "./particulaConfig";

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

  setupUi(state, engine.camera, canvas, loadConfig());

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

function setupUi(state: ParticulaState, camera: THREE.Camera, canvas: HTMLCanvasElement, config: ParticulaConfig) {
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
  const colorSection = document.querySelector<HTMLDivElement>("#color-section")!;
  const hueSlider = document.querySelector<HTMLInputElement>("#color-hue-slider")!;
  const hueOutput = document.querySelector<HTMLSpanElement>("#color-hue-output")!;
  const intensitySlider = document.querySelector<HTMLInputElement>("#color-intensity-slider")!;
  const intensityOutput = document.querySelector<HTMLSpanElement>("#color-intensity-output")!;
  const exportBtn = document.querySelector<HTMLButtonElement>("#export-config-btn")!;

  populateSelect(styleNacer, BIRTH_VARIANTS, config.styles.nacer);
  populateSelect(styleDividir, DIVISION_VARIANTS, config.styles.dividir);
  populateSelect(styleUnir, UNION_VARIANTS, config.styles.unir);
  populateSelect(styleMorir, DEATH_VARIANTS, config.styles.morir);
  populateSelect(styleConector, CONNECTOR_STYLES, config.styles.conector);
  durationSlider.value = String(config.duration);
  durationOutput.textContent = `${config.duration.toFixed(1)}s`;
  connectorToggle.checked = config.connectorEnabled;
  state.setConnectorEnabled(config.connectorEnabled);
  state.setConnectorStyle(config.styles.conector);
  intensitySlider.min = String(config.color.intensityMin);
  intensitySlider.max = String(config.color.intensityMax);
  intensitySlider.value = String(config.color.intensityDefault);
  intensityOutput.textContent = config.color.intensityDefault.toFixed(2);
  hueSlider.min = String(config.color.hueMinDeg);
  hueSlider.max = String(config.color.hueMaxDeg);

  // Todo lo que el usuario ajusta en la UI se auto-guarda de
  // inmediato — pedido explícito ("guardar la configuración que voy
  // haciendo") para que no se pierda entre recargas mientras se
  // prueba, y para que "Exportar configuración" siempre refleje
  // exactamente lo que se ve en pantalla, no un snapshot viejo.
  durationSlider.addEventListener("input", () => {
    durationOutput.textContent = `${Number(durationSlider.value).toFixed(1)}s`;
    config.duration = Number(durationSlider.value);
    saveConfig(config);
  });

  settingsToggle.addEventListener("click", () => {
    sheet.classList.toggle("open");
  });

  connectorToggle.addEventListener("change", () => {
    state.setConnectorEnabled(connectorToggle.checked);
    config.connectorEnabled = connectorToggle.checked;
    saveConfig(config);
  });
  styleConector.addEventListener("change", () => {
    state.setConnectorStyle(styleConector.value);
    config.styles.conector = styleConector.value;
    saveConfig(config);
  });
  styleNacer.addEventListener("change", () => {
    config.styles.nacer = styleNacer.value;
    saveConfig(config);
  });
  styleDividir.addEventListener("change", () => {
    config.styles.dividir = styleDividir.value;
    saveConfig(config);
  });
  styleUnir.addEventListener("change", () => {
    config.styles.unir = styleUnir.value;
    saveConfig(config);
  });
  styleMorir.addEventListener("change", () => {
    config.styles.morir = styleMorir.value;
    saveConfig(config);
  });

  // Slider de color — pedido explícito ("si le selecciono una me sale
  // un slider para moverme por toda la gama de colores"). Sólo actúa
  // sobre la partícula EXPLÍCITAMENTE seleccionada (ver
  // state.getSelectedColor/setSelectedHue), no sobre la "más
  // reciente" — por eso el panel se muestra/oculta con
  // `state.getSelectedId()`, no con `targetId()`.
  hueSlider.addEventListener("input", () => {
    const hue = Number(hueSlider.value);
    hueOutput.textContent = `${Math.round(hue)}°`;
    state.setSelectedHue(hue);
  });
  intensitySlider.addEventListener("input", () => {
    const value = Number(intensitySlider.value);
    intensityOutput.textContent = value.toFixed(2);
    state.setSelectedEmissiveIntensity(value);
  });

  const exportOverlay = document.querySelector<HTMLDivElement>("#export-overlay")!;
  const exportTextarea = document.querySelector<HTMLTextAreaElement>("#export-textarea")!;
  const exportCloseBtn = document.querySelector<HTMLButtonElement>("#export-close-btn")!;

  // `navigator.clipboard.writeText` puede fallar en silencio en varios
  // contextos (sin "activación confiable" del click, iOS Safari en
  // ciertos casos, HTTP sin TLS) — en vez de depender de que funcione,
  // SIEMPRE se muestra el JSON completo y seleccionado en un textarea;
  // el usuario tiene garantizado poder llevárselo aunque el
  // portapapeles automático no haya funcionado.
  exportBtn.addEventListener("click", async () => {
    const json = exportConfigJSON(config);
    exportTextarea.value = json;
    exportOverlay.hidden = false;
    exportTextarea.focus();
    exportTextarea.select();
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      /* ya queda visible y seleccionado para copiar a mano */
    }
  });
  exportCloseBtn.addEventListener("click", () => {
    exportOverlay.hidden = true;
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

  // Sólo se vuelve a leer el color desde `state` cuando la SELECCIÓN
  // cambia (no en cada refreshUi) — si no, cada vez que el usuario
  // arrastra el hue slider, éste dispara setSelectedHue -> onChange ->
  // refreshUi, que le leería el mismo color de vuelta al slider en
  // pleno arrastre (inofensivo pero redundante, y frágil si el
  // redondeo de HSL<->hex no fuera exacto).
  let lastSyncedSelection: number | null = null;
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

    const selectedId = state.getSelectedId();
    colorSection.hidden = selectedId === null;
    if (selectedId !== lastSyncedSelection) {
      lastSyncedSelection = selectedId;
      const c = selectedId !== null ? state.getSelectedColor() : null;
      if (c) {
        hueSlider.value = String(Math.round(c.hue));
        hueOutput.textContent = `${Math.round(c.hue)}°`;
        intensitySlider.value = String(c.intensity);
        intensityOutput.textContent = c.intensity.toFixed(2);
      }
    }
  }
  state.onChange = refreshUi;
  refreshUi();
}

main();
