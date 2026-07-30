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
  const config = loadConfig();
  // Lote masivo puede formar una nube de decenas de unidades de radio
  // — muy por encima de lo que el cubo real necesita — así que aquí
  // se pide alcance de cámara/niebla mucho mayor (ver SceneOverrides
  // en scene/engine.ts); el cubo real (src/main.ts, sin overrides)
  // sigue exactamente igual. Subido de nuevo (60/30 -> 350/180) para
  // el nivel instanciado (ver INSTANCE_THRESHOLD en state.ts, pedido
  // explícito "quiero ver qué pasa si tenemos 25000") — a esa escala
  // el radio de la nube puede pasar largamente de lo que necesitaba el
  // lote de sólo 2000 de antes.
  const engine = await createEngine(canvas, {
    bloom: config.bloom,
    fogDensity: null,
    cameraFar: 350,
    controlsMaxDistance: 180,
  });
  ensureEnvironment(engine.renderer, engine.scene);

  // "que se cree una partícula en el centro con zoom donde se vea
  // bien" — engine.ts trae una cámara calibrada para el cubo de miles
  // de conceptos de la app real; aquí sólo hay 1-8 partículas de
  // ~0.32 de radio, así que la acercamos mucho más para que llene
  // buena parte del cuadro desde el primer instante.
  engine.camera.position.set(0.9, 0.65, 1.5);
  engine.controls.target.set(0, 0, 0);
  engine.controls.minDistance = 0.5;
  engine.controls.autoRotate = false;
  engine.controls.saveState(); // punto al que vuelve el botón ⌂

  // Navegación sin arrastre — la misma que ya tiene el cubo (index.html
  // + main.ts). El lab no tenía NINGUNA: ni canvas enfocable, ni teclado,
  // ni botones. Se porta aquí porque el lab es el laboratorio de TODO,
  // no sólo del look: probar una interacción en el cubo y no poder
  // probarla aquí es justo lo que hace que las dos superficies se
  // separen.
  const ptCanvas = document.querySelector<HTMLCanvasElement>("#particula-canvas")!;
  function nudgeZoom(factor: number): void {
    const cam = engine.camera;
    const target = engine.controls.target;
    const dir = cam.position.clone().sub(target);
    const dist = dir.length() * factor;
    const clamped = Math.min(
      Math.max(dist, engine.controls.minDistance),
      engine.controls.maxDistance,
    );
    cam.position.copy(target).addScaledVector(dir.normalize(), clamped);
    engine.controls.update();
  }
  document.querySelector("#pt-zoom-in")?.addEventListener("click", () => nudgeZoom(0.8));
  document.querySelector("#pt-zoom-out")?.addEventListener("click", () => nudgeZoom(1.25));
  document.querySelector("#pt-reset-view")?.addEventListener("click", () => {
    engine.controls.reset();
  });

  // El teclado cuelga del CANVAS, no de window: así los atajos de un
  // solo carácter sólo están vivos con el foco puesto (WCAG 2.1.4) y no
  // secuestran la escritura en los campos del panel, que aquí son muchos.
  //
  // Modelo IDÉNTICO al del cubo (main.ts applyKeyboardNav): teclas
  // sostenidas + coordenadas esféricas + velocidad por SEGUNDO, no un
  // salto por pulsación. Que las dos superficies se muevan igual es el
  // punto — si el lab navegara distinto, probar aquí no diría nada del
  // cubo.
  const ptPressed = new Set<"left" | "right" | "forward" | "back">();
  const PT_KEYS: Record<string, "left" | "right" | "forward" | "back"> = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "forward", w: "forward", W: "forward",
    ArrowDown: "back", s: "back", S: "back",
  };
  const PT_ORBIT_SPEED = 1.1; // rad/s
  const PT_DOLLY_SPEED = 1.6; // factor exponencial de distancia/s
  ptCanvas.addEventListener("keydown", (event) => {
    if (event.key === "Home") {
      engine.controls.reset();
      event.preventDefault();
      return;
    }
    const dir = PT_KEYS[event.key];
    if (!dir) return;
    ptPressed.add(dir);
    event.preventDefault(); // que las flechas no hagan scroll de página
  });
  ptCanvas.addEventListener("keyup", (event) => {
    const dir = PT_KEYS[event.key];
    if (dir) ptPressed.delete(dir);
  });
  // Sin esto, salir de la pestaña con una tecla pulsada deja la cámara
  // girando sola para siempre (no llega el keyup).
  ptCanvas.addEventListener("blur", () => ptPressed.clear());
  window.addEventListener("blur", () => ptPressed.clear());

  function applyParticulaNav(dt: number): void {
    if (ptPressed.size === 0) return;
    const controls = engine.controls;
    const camera = engine.camera;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (ptPressed.has("left")) spherical.theta -= PT_ORBIT_SPEED * dt;
    if (ptPressed.has("right")) spherical.theta += PT_ORBIT_SPEED * dt;
    let distScale = 1;
    if (ptPressed.has("forward")) distScale *= Math.exp(-PT_DOLLY_SPEED * dt);
    if (ptPressed.has("back")) distScale *= Math.exp(PT_DOLLY_SPEED * dt);
    spherical.radius = Math.min(
      Math.max(spherical.radius * distScale, controls.minDistance),
      controls.maxDistance,
    );
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
  }

  // Luz ambiental + direccional suave: MeshPhysicalMaterial necesita
  // luces reales en la escena para que transmisión/clearcoat/fresnel
  // tengan algo que reflejar además del mapa de entorno.
  //
  // Intensidades bajadas (0.4/1.1 -> 0.22/0.55): estaban calibradas
  // para transmission=0.75, donde buena parte de esa luz seguía de
  // largo. Con la esfera ahora mucho más opaca (pedido explícito del
  // usuario, "muy poco transparente"), la MISMA luz se refleja casi
  // entera de vuelta a cámara — bug real visto en vivo: la esfera se
  // veía pálida/sobreexpuesta (perdía el color, no "brillaba") aun con
  // el bloom completamente apagado, confirmando que el problema era la
  // luz de base, no el bloom ni el emissive.
  engine.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
  keyLight.position.set(2, 3, 2);
  engine.scene.add(keyLight);

  const state = new ParticulaState(engine.scene);
  state.attachCamera(engine.camera, engine.controls);
  // La partícula líquida reutiliza el MISMO PMREM RoomEnvironment que
  // la hero (un solo bake compartido, ver heroParticle.ts) y toma su
  // look del bloque `liquid` de la config.
  state.attachLiquidSupport(ensureEnvironment(engine.renderer, engine.scene), config.liquid);
  state.setParticleStyle(config.particleStyle);

  // Primera partícula, ya en el centro, revelada con el estilo de
  // nacimiento por defecto pero instantánea (duración corta fija) —
  // no queremos que la carga de la página dependa del slider.
  if (state.getParticleStyle() === "liquid") {
    state.seedLiquid(0x5fc9ff, new THREE.Vector3(0, 0, 0));
  } else {
    const seedMesh = createHeroParticle(0x5fc9ff);
    seedMesh.position.set(0, 0, 0);
    engine.scene.add(seedMesh);
    state.seed(seedMesh);
  }

  setupUi(state, engine.camera, canvas, config);

  engine.start(
    (dt) => {
      applyParticulaNav(dt);
      state.tick(dt);
    },
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
  const movementSpeedSlider = document.querySelector<HTMLInputElement>("#movement-speed-slider")!;
  const movementSpeedOutput = document.querySelector<HTMLSpanElement>("#movement-speed-output")!;
  const movementIntensitySlider = document.querySelector<HTMLInputElement>("#movement-intensity-slider")!;
  const movementIntensityOutput = document.querySelector<HTMLSpanElement>("#movement-intensity-output")!;
  const batchModeToggle = document.querySelector<HTMLDivElement>("#batch-mode-toggle")!;
  const batchModeButtons = batchModeToggle.querySelectorAll<HTMLButtonElement>(".segment");
  const batchTargetInput = document.querySelector<HTMLInputElement>("#batch-target-input")!;
  const batchDurationSlider = document.querySelector<HTMLInputElement>("#batch-duration-slider")!;
  const batchDurationOutput = document.querySelector<HTMLSpanElement>("#batch-duration-output")!;
  const batchConcurrentSlider = document.querySelector<HTMLInputElement>("#batch-concurrent-slider")!;
  const batchConcurrentOutput = document.querySelector<HTMLSpanElement>("#batch-concurrent-output")!;
  const batchStaggerSlider = document.querySelector<HTMLInputElement>("#batch-stagger-slider")!;
  const batchStaggerOutput = document.querySelector<HTMLSpanElement>("#batch-stagger-output")!;
  const batchReframeToggle = document.querySelector<HTMLInputElement>("#batch-reframe-toggle")!;
  const batchStartBtn = document.querySelector<HTMLButtonElement>("#batch-start-btn")!;
  const batchStatus = document.querySelector<HTMLParagraphElement>("#batch-status")!;
  const styleToggleButtons = document.querySelectorAll<HTMLButtonElement>("#particle-style-toggle .segment");
  const liquidSection = document.querySelector<HTMLDivElement>("#liquid-section")!;
  const liquidCoreSlider = document.querySelector<HTMLInputElement>("#liquid-core-slider")!;
  const liquidCoreOutput = document.querySelector<HTMLSpanElement>("#liquid-core-output")!;
  const liquidFresnelSlider = document.querySelector<HTMLInputElement>("#liquid-fresnel-slider")!;
  const liquidFresnelOutput = document.querySelector<HTMLSpanElement>("#liquid-fresnel-output")!;
  const liquidIridSlider = document.querySelector<HTMLInputElement>("#liquid-irid-slider")!;
  const liquidIridOutput = document.querySelector<HTMLSpanElement>("#liquid-irid-output")!;
  const liquidEnvSlider = document.querySelector<HTMLInputElement>("#liquid-env-slider")!;
  const liquidEnvOutput = document.querySelector<HTMLSpanElement>("#liquid-env-output")!;
  const liquidWobbleSlider = document.querySelector<HTMLInputElement>("#liquid-wobble-slider")!;
  const liquidWobbleOutput = document.querySelector<HTMLSpanElement>("#liquid-wobble-output")!;
  const liquidBreathSlider = document.querySelector<HTMLInputElement>("#liquid-breath-slider")!;
  const liquidBreathOutput = document.querySelector<HTMLSpanElement>("#liquid-breath-output")!;

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
  movementSpeedSlider.min = String(config.movement.speedMin);
  movementSpeedSlider.max = String(config.movement.speedMax);
  movementSpeedSlider.value = String(config.movement.speedDefault);
  movementSpeedOutput.textContent = config.movement.speedDefault.toFixed(2);
  movementIntensitySlider.min = String(config.movement.intensityMin);
  movementIntensitySlider.max = String(config.movement.intensityMax);
  movementIntensitySlider.value = String(config.movement.intensityDefault);
  movementIntensityOutput.textContent = config.movement.intensityDefault.toFixed(2);
  state.setMovementSpeed(config.movement.speedDefault);
  state.setMovementIntensity(config.movement.intensityDefault);

  // Estilo de partícula (hero clásica | líquida) + sliders del look
  // líquido — el toggle convierte la población existente conservando
  // ids/colores (ver state.setParticleStyle); se deshabilita mientras
  // hay animaciones o un lote en curso (refreshUi lo mantiene al día).
  liquidCoreSlider.value = String(config.liquid.coreEmissive);
  liquidCoreOutput.textContent = config.liquid.coreEmissive.toFixed(2);
  liquidFresnelSlider.value = String(config.liquid.fresnelPower);
  liquidFresnelOutput.textContent = config.liquid.fresnelPower.toFixed(1);
  liquidIridSlider.value = String(config.liquid.iridescenceStrength);
  liquidIridOutput.textContent = config.liquid.iridescenceStrength.toFixed(2);
  liquidEnvSlider.value = String(config.liquid.envReflect);
  liquidEnvOutput.textContent = config.liquid.envReflect.toFixed(2);
  liquidWobbleSlider.value = String(config.liquid.wobbleAmp);
  liquidWobbleOutput.textContent = config.liquid.wobbleAmp.toFixed(3);
  liquidBreathSlider.value = String(config.liquid.breathAmp);
  liquidBreathOutput.textContent = config.liquid.breathAmp.toFixed(3);

  styleToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.dataset.style as "hero" | "liquid";
      state.setParticleStyle(style);
      config.particleStyle = state.getParticleStyle();
      saveConfig(config);
      refreshUi();
    });
  });
  liquidCoreSlider.addEventListener("input", () => {
    const value = Number(liquidCoreSlider.value);
    liquidCoreOutput.textContent = value.toFixed(2);
    config.liquid.coreEmissive = value;
    state.applyLiquidLook(config.liquid);
    saveConfig(config);
  });
  liquidFresnelSlider.addEventListener("input", () => {
    const value = Number(liquidFresnelSlider.value);
    liquidFresnelOutput.textContent = value.toFixed(1);
    config.liquid.fresnelPower = value;
    state.applyLiquidLook(config.liquid);
    saveConfig(config);
  });
  liquidIridSlider.addEventListener("input", () => {
    const value = Number(liquidIridSlider.value);
    liquidIridOutput.textContent = value.toFixed(2);
    config.liquid.iridescenceStrength = value;
    state.applyLiquidLook(config.liquid);
    saveConfig(config);
  });
  liquidEnvSlider.addEventListener("input", () => {
    const value = Number(liquidEnvSlider.value);
    liquidEnvOutput.textContent = value.toFixed(2);
    config.liquid.envReflect = value;
    state.applyLiquidLook(config.liquid);
    saveConfig(config);
  });
  liquidWobbleSlider.addEventListener("input", () => {
    const value = Number(liquidWobbleSlider.value);
    liquidWobbleOutput.textContent = value.toFixed(3);
    config.liquid.wobbleAmp = value;
    state.applyLiquidLook(config.liquid);
    saveConfig(config);
  });
  liquidBreathSlider.addEventListener("input", () => {
    const value = Number(liquidBreathSlider.value);
    liquidBreathOutput.textContent = value.toFixed(3);
    config.liquid.breathAmp = value;
    state.applyLiquidLook(config.liquid);
    saveConfig(config);
  });

  batchTargetInput.min = String(config.batch.targetMin);
  batchTargetInput.max = String(config.batch.targetMax);
  // Recorta también un valor viejo guardado en localStorage de antes
  // de este fix (ej. un 25000 tecleado a mano en una sesión anterior)
  // — sin esto, `config.batch.targetCount` seguiría sin tope hasta que
  // el usuario tocara el campo.
  config.batch.targetCount = THREE.MathUtils.clamp(config.batch.targetCount, config.batch.targetMin, config.batch.targetMax);
  batchTargetInput.value = String(config.batch.targetCount);
  batchDurationSlider.min = String(config.batch.durationMin);
  batchDurationSlider.max = String(config.batch.durationMax);
  batchDurationSlider.value = String(config.batch.duration);
  batchDurationOutput.textContent = `${config.batch.duration.toFixed(2)}s`;
  batchConcurrentSlider.min = String(config.batch.maxConcurrentMin);
  batchConcurrentSlider.max = String(config.batch.maxConcurrentMax);
  batchConcurrentSlider.value = String(config.batch.maxConcurrent);
  batchConcurrentOutput.textContent = String(config.batch.maxConcurrent);
  batchStaggerSlider.min = String(config.batch.staggerMin);
  batchStaggerSlider.max = String(config.batch.staggerMax);
  batchStaggerSlider.value = String(config.batch.staggerSeconds);
  batchStaggerOutput.textContent = `${config.batch.staggerSeconds.toFixed(2)}s`;
  batchReframeToggle.checked = config.batch.autoReframe;
  batchModeButtons.forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mode === config.batch.mode);
  });

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

  // Sliders de movimiento — pedido explícito tras probarlo en vivo
  // ("no veo el movimiento browniano... pon un slider para configurar
  // la velocidad y la intensidad"). Globales (afectan a TODAS las
  // partículas), a diferencia del slider de color que sólo actúa
  // sobre la seleccionada — el movimiento no es algo que se "elige"
  // partícula por partícula.
  movementSpeedSlider.addEventListener("input", () => {
    const value = Number(movementSpeedSlider.value);
    movementSpeedOutput.textContent = value.toFixed(2);
    state.setMovementSpeed(value);
    config.movement.speedDefault = value;
    saveConfig(config);
  });
  movementIntensitySlider.addEventListener("input", () => {
    const value = Number(movementIntensitySlider.value);
    movementIntensityOutput.textContent = value.toFixed(2);
    state.setMovementIntensity(value);
    config.movement.intensityDefault = value;
    saveConfig(config);
  });

  // Animación masiva ("dividir o unir mil en una animación") — pedido
  // explícito del usuario, pensado a detalle: además de cuántas
  // (cantidad objetivo) y cuánto dura cada una, expone cuántas pueden
  // animarse A LA VEZ (simultáneas por oleada) y qué tan separadas en
  // el tiempo salen las oleadas (retraso) — juntos son lo que hace la
  // diferencia entre "explosión instantánea" y "cascada legible", y
  // entre "fluido" y "el framerate se cae" en celular con estilos
  // pesados (mitosis/fusión son shaders raymarcheados, más caros que
  // una esfera simple).
  batchModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode as "dividir" | "unir";
      config.batch.mode = mode;
      batchModeButtons.forEach((b) => b.classList.toggle("selected", b === btn));
      saveConfig(config);
    });
  });
  batchTargetInput.addEventListener("input", () => {
    // `max`/`min` en un <input type="number"> sólo afectan las flechas
    // del spinner — un valor tecleado a mano (o pegado) por encima del
    // máximo pasa derecho sin que nada lo detenga. Bug real reportado
    // en vivo: escribir 25000 (muy por encima del máximo real de 2000)
    // lo mandó tal cual a `startBatch`, y cada partícula es una malla
    // COMPLETA aparte (SphereGeometry 64×64 + MeshPhysicalMaterial
    // propio, sin instancing) — a esa escala cuelga o tira la pestaña.
    // Recortar aquí, no sólo en el atributo, es lo que de verdad limita
    // cuánto se le puede pedir al lote.
    const clamped = THREE.MathUtils.clamp(Math.round(Number(batchTargetInput.value) || config.batch.targetMin), config.batch.targetMin, config.batch.targetMax);
    batchTargetInput.value = String(clamped);
    config.batch.targetCount = clamped;
    saveConfig(config);
  });
  batchDurationSlider.addEventListener("input", () => {
    const value = Number(batchDurationSlider.value);
    batchDurationOutput.textContent = `${value.toFixed(2)}s`;
    config.batch.duration = value;
    saveConfig(config);
  });
  batchConcurrentSlider.addEventListener("input", () => {
    const value = Number(batchConcurrentSlider.value);
    batchConcurrentOutput.textContent = String(value);
    config.batch.maxConcurrent = value;
    saveConfig(config);
  });
  batchStaggerSlider.addEventListener("input", () => {
    const value = Number(batchStaggerSlider.value);
    batchStaggerOutput.textContent = `${value.toFixed(2)}s`;
    config.batch.staggerSeconds = value;
    saveConfig(config);
  });
  batchReframeToggle.addEventListener("change", () => {
    config.batch.autoReframe = batchReframeToggle.checked;
    saveConfig(config);
  });
  batchStartBtn.addEventListener("click", () => {
    if (state.isBatchActive()) {
      state.stopBatch();
      return;
    }
    const variantKey = config.batch.mode === "dividir" ? styleDividir.value : styleUnir.value;
    // Segunda barrera aparte del listener del input — cualquier otro
    // camino que llegue a fijar `config.batch.targetCount` (ej. un
    // valor viejo restaurado de localStorage) tampoco puede pasar de
    // largo sin recorte justo antes de arrancar el lote real.
    state.startBatch({
      mode: config.batch.mode,
      variantKey,
      targetCount: THREE.MathUtils.clamp(config.batch.targetCount, config.batch.targetMin, config.batch.targetMax),
      duration: config.batch.duration,
      maxConcurrent: config.batch.maxConcurrent,
      staggerSeconds: config.batch.staggerSeconds,
      autoReframe: config.batch.autoReframe,
    });
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
    // Estilo hero: mallas propias, raycast normal de THREE. Estilo
    // líquido: una sola InstancedMesh sin `instanceMatrix`, con picking
    // ray-esfera propio (ver liquidParticle.ts's pickSlotAtRay).
    const hits = raycaster.intersectObjects(state.meshes());
    const id = hits.length > 0 ? ((hits[0].object.userData.particleId as number | undefined) ?? null) : state.pickLiquidAtRay(raycaster);
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

    // Toggle de estilo: seleccionado según el estilo ACTUAL del state
    // (no el del config, por si setParticleStyle rechazó el cambio por
    // estar ocupado) y deshabilitado mientras convertir sería inseguro.
    const currentStyle = state.getParticleStyle();
    const styleLocked = !state.canBirth();
    styleToggleButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.style === currentStyle);
      btn.disabled = styleLocked;
    });
    liquidSection.hidden = currentStyle !== "liquid";
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

    const runningBatch = state.getBatchStatus();
    if (runningBatch) {
      batchStartBtn.textContent = "Detener animación masiva";
      batchStartBtn.classList.add("active");
      batchStatus.hidden = false;
      const noun = runningBatch.mode === "dividir" ? "dividiendo" : "uniendo";
      batchStatus.textContent = `${noun}… ${runningBatch.count} / ${runningBatch.target} partículas (${runningBatch.inFlight} en vuelo)`;
    } else {
      batchStartBtn.textContent = "Iniciar animación masiva";
      batchStartBtn.classList.remove("active");
      batchStatus.hidden = true;
    }
    // Mientras corre el lote, los controles individuales de
    // nacer/dividir/unir/morir ya se deshabilitan arriba (canBirth()
    // etc. devuelven false con batchActive) — pero el propio botón de
    // iniciar/detener el lote debe seguir habilitado siempre para
    // poder detenerlo.
    batchStartBtn.disabled = !state.isBatchActive() && (state.isBusy() || !(state.canDivide() || state.canUnite()));
  }
  state.onChange = refreshUi;
  refreshUi();
}

main();
