import "./style.css";
import * as THREE from "three/webgpu";
import { createParticleField } from "./scene/particleField";
import { createEngine } from "./scene/engine";
import { setupConceptInteraction } from "./scene/conceptInteraction";
import { fetchConcepts } from "./data/concepts";
import { getStoredMode, setStoredMode, type Mode } from "./ui/components/modeStorage";
import "./ui/components/modeSelect";
import "./ui/components/modeSwitcher";
import type { ModeChangeDetail, VxModeSwitcher } from "./ui/components/modeSwitcher";
import "./ui/components/langSwitcher";
import type { LangChangeDetail } from "./ui/components/langSwitcher";
import type { VxConceptCard } from "./ui/components/conceptCard";
import "./ui/components/conceptCard";
import type { VxComposer, TokensChangeDetail } from "./ui/components/composer";
import "./ui/components/composer";
import type { VxTokenStrip } from "./ui/components/tokenStrip";
import "./ui/components/tokenStrip";
import type { ModePickDetail } from "./ui/components/modeSelect";
import type { VxZoomRail } from "./ui/components/zoomRail";
import "./ui/components/zoomRail";
import type { VxKindLegend } from "./ui/components/kindLegend";
import "./ui/components/kindLegend";
import type { VxColorKey, DomainIsolateDetail } from "./ui/components/colorKey";
import "./ui/components/colorKey";
import type { VxBootSplash } from "./ui/components/bootSplash";
import "./ui/components/bootSplash";
import "./ui/components/mathArena";
import type { VxSurfaceToggle, SurfaceChangeDetail, Surface } from "./ui/components/surfaceToggle";
import "./ui/components/surfaceToggle";
import { getStoredLang, setStoredLang, t } from "./i18n";
import { fadeIn, fadeOut, tweenNumber } from "./ui/motion";
import { tokenizeSimple, tokenizeBPE } from "./tokenizer";
import { tokenizeBGE } from "./bgeTokenizer";
import { fetchCosinePairs, type PartOfSpeech } from "./data/concepts";
import { setupTokenMode } from "./scene/tokenMode";

// Principiante=sustantivos+función, Intermedio=+adjetivos, Avanzado=+verbos
// (matriz POS cerrada 2026-07-19, ver DOCs/02-master-plan.md §03). Las
// palabras función (artículos, preposiciones, cópulas...) son visibles
// desde Principiante — sin ellas frases como "el agujero negro está en
// la vía láctea" nunca encienden completas ahí, sólo el sustantivo.
const MODE_POS: Record<Mode, Set<PartOfSpeech>> = {
  principiante: new Set(["sustantivo", "funcion"]),
  intermedio: new Set(["sustantivo", "funcion", "adjetivo"]),
  avanzado: new Set(["sustantivo", "funcion", "adjetivo", "verbo"]),
};

const stageEl = document.querySelector<HTMLDivElement>("#stage")!;
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const backendTag = document.querySelector<HTMLSpanElement>("#backend-tag")!;
const fpsLabel = document.querySelector<HTMLSpanElement>("#fps")!;
const countLabel = document.querySelector<HTMLSpanElement>("#count")!;
const sashEl = document.querySelector<HTMLDivElement>("#sash")!;
const sidePaneEl = document.querySelector<HTMLDivElement>("#side-pane")!;
const consolePaneEl = document.querySelector<HTMLDivElement>("#console-pane")!;

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
  let lang = getStoredLang();
  let appReady = false;
  // Declaradas arriba (no en su punto de uso original) porque el loop de
  // render arranca DURANTE el boot splash ahora — el callback de
  // engine.start necesita leer estas dos ya en los primeros frames,
  // mucho antes de que card/tokenMode existan de verdad más abajo.
  let card: VxConceptCard | null = null;
  let liveTokenCount = 0;

  // El switcher de idioma vive en dos sitios: dentro del shadow DOM de
  // <vx-mode-select> (antes de elegir modo — ahí no hay nada más
  // construido, así que un reload no cuesta nada) y, una vez adentro de
  // la app, la instancia de abajo (appReady=true, re-renderiza en vivo).
  // `composed:true` en el evento (ver langSwitcher.ts) es lo que permite
  // que este único listener en window capture ambos casos aunque el
  // primero esté anidado dentro de otro shadow root.
  window.addEventListener("vx-lang-change", (event) => {
    const { lang: newLang } = (event as CustomEvent<LangChangeDetail>).detail;
    if (newLang === lang) return;
    setStoredLang(newLang);
    if (!appReady) {
      location.reload();
      return;
    }
    lang = newLang;
    langSwitcher.setAttribute("current", lang);
    void applyMode(currentMode);
  });

  // P5 — splash con progreso ponderado (ver DOCs/03 §6): el costo real
  // de dataset+GPU+tokenizers se paga UNA vez, al frente, antes incluso
  // de mostrar mode-select — así nadie ve "cargando…" plano ni el
  // "funciona-después-de-romperse" de un tokenizer que llega tarde en
  // Avanzado. Pesos: Shell 5 · Dataset 35 · GPU 25 · Tokenizers 20 ·
  // Warm 10 · Ready 5 = 100.
  const splash = document.createElement("vx-boot-splash") as VxBootSplash;
  document.body.appendChild(splash);

  splash.setProgress(5, t("bootShell", lang));

  splash.setProgress(5, t("bootDataset", lang));
  const concepts = await fetchConcepts();
  splash.setProgress(40, t("bootDataset", lang));

  // Bug de UX real reportado en vivo (grabaciones de pantalla): para
  // quien ya tiene un modo guardado de una visita anterior, el boot
  // revelaba SIEMPRE el dataset completo y luego, apenas terminaba el
  // splash, applyMode lo achicaba de golpe al subconjunto real del
  // modo — un "crece mucho y luego se encoge" que Avanzado casi no
  // sufre (su subconjunto es casi todo el dataset) pero Principiante/
  // Intermedio sí, y se leía como que algo se rompía. Si ya hay un
  // modo guardado, el universo de la revelación es DIRECTAMENTE el de
  // ese modo — el boot crece derecho hacia su tamaño final.
  const bootStoredMode = getStoredMode();
  const bootAllowedIds = bootStoredMode
    ? concepts.reduce<number[]>((ids, c, i) => {
        if (MODE_POS[bootStoredMode].has(c.partOfSpeech)) ids.push(i);
        return ids;
      }, [])
    : undefined;

  splash.setProgress(40, t("bootGpu", lang));
  const engine = await createEngine(canvas);
  splash.setProgress(65, t("bootGpu", lang));

  const CUBE_EDGE_OPACITY = 0.12;
  const cubeEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0xd98a34,
    transparent: true,
    opacity: CUBE_EDGE_OPACITY,
  });
  // 2.8 -> 4.26 (×1.52, mismo factor que CUBE_SCALE en seed.ts): las
  // aristas dibujadas tienen que crecer junto con el cubo real de
  // coordenadas o las partículas empiezan a desbordarse visualmente
  // fuera de la caja.
  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.26, 4.26, 4.26)),
    cubeEdgeMaterial,
  );
  engine.scene.add(cubeEdges);

  // Atenuar las aristas junto con las partículas no seleccionadas
  // cuando hay foco activo (buscar texto o fijar una partícula) — todo
  // el "ruido visual" de fondo baja a la vez, refuerza el efecto.
  const field = createParticleField(concepts, {
    onFocusChange: (active) => {
      tweenNumber(cubeEdgeMaterial.opacity, active ? 0.015 : CUBE_EDGE_OPACITY, 300, (v) => {
        cubeEdgeMaterial.opacity = v;
      });
    },
  });
  engine.scene.add(field.group);
  field.revealProgressively(0, bootAllowedIds); // arranca vacío — se puebla durante el resto del boot
  countLabel.textContent = "0 embeddings";

  // El render arranca AQUÍ, no al final: así el cubo ya gira y se va
  // poblando de partículas detrás del splash mientras cargan
  // tokenizadores (idea pedida por el usuario). `card` y `liveTokenCount`
  // todavía no tienen su valor final — se declaran arriba y esta closure
  // los lee por referencia, ya resueltos cuando el usuario llegue a
  // interactuar (mucho después de que termine el splash).
  engine.start(
    () => {
      // Bug real corregido (ver engine.ts): el giro automático ahora es
      // controls.autoRotate (gira la cámara alrededor de
      // controls.target, no el grupo alrededor del origen del mundo) —
      // aquí sólo se prende/apaga con la misma condición de antes.
      engine.controls.autoRotate = !card?.isPinned() && liveTokenCount === 0;
    },
    (fps) => {
      fpsLabel.textContent = `${fps} fps`;
    },
  );

  // Prefetch de los DOS tokenizadores reales (BPE ~1.7MB, vocab BGE
  // ~300KB) — memoizados en sus propios módulos, así que esta llamada
  // "gratis" con texto vacío es lo que hace que Avanzado nunca tenga
  // que esperar un fetch tardío la primera vez que alguien escribe ahí.
  // Corre en paralelo con la animación de poblado (no depende de ella):
  // ambas deben terminar antes de dar por listo el arranque.
  splash.setProgress(65, t("bootTokenizers", lang));
  const revealDone = new Promise<void>((resolve) => {
    const start = performance.now();
    const durationMs = 2200;
    const revealTotal = bootAllowedIds?.length ?? concepts.length;
    function step() {
      const elapsed = Math.min((performance.now() - start) / durationMs, 1);
      field.revealProgressively(elapsed, bootAllowedIds);
      splash.setProgress(65 + elapsed * 35, t(elapsed < 0.6 ? "bootTokenizers" : "bootWarm", lang));
      const shown = Math.round(elapsed * revealTotal);
      countLabel.textContent = `${shown.toLocaleString(lang === "en" ? "en-US" : "es-MX")} embeddings`;
      if (elapsed < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
  await Promise.all([tokenizeBPE(" "), tokenizeBGE(" "), revealDone]);

  splash.setProgress(100, t("bootReady", lang));
  await splash.finish(); // fade out ANTES de mode-select — nunca se superponen

  const initialMode = getStoredMode() ?? (await pickMode());

  const switcher = document.createElement("vx-mode-switcher") as VxModeSwitcher;
  document.body.appendChild(switcher);
  const langSwitcher = document.createElement("vx-lang-switcher");
  langSwitcher.setAttribute("current", lang);
  document.body.appendChild(langSwitcher);

  countLabel.textContent = t("hudLoading", lang);

  // P4 — chrome discreto: rail de zoom + leyenda de tipos + llave de
  // colores (ver DOCs/05-hud-legends-zoom-colors.md). Se crean UNA vez
  // (como los switchers), no por modo — sólo cambian de copy/contenido.
  const zoomRail = document.createElement("vx-zoom-rail") as VxZoomRail;
  zoomRail.setAttribute("readout", "");
  stageEl.appendChild(zoomRail);
  zoomRail.attach(engine.camera, engine.controls);

  const kindLegend = document.createElement("vx-kind-legend") as VxKindLegend;
  stageEl.appendChild(kindLegend);

  const colorKey = document.createElement("vx-color-key") as VxColorKey;
  stageEl.appendChild(colorKey);

  // Índice dominio -> instancias, para que "aislar" en la llave de
  // colores reutilice el mismo atenuado que ya existe para búsqueda de
  // texto (setSearchHighlights) — sin nueva API en particleField.
  const domainIndex = new Map<string, number[]>();
  field.concepts.forEach((c, i) => {
    const list = domainIndex.get(c.domain) ?? [];
    list.push(i);
    domainIndex.set(c.domain, list);
  });
  colorKey.addEventListener("vx-domain-isolate", (event) => {
    const { domain } = (event as CustomEvent<DomainIsolateDetail>).detail;
    field.setSearchHighlights(domain ? (domainIndex.get(domain) ?? []) : []);
  });

  function refreshColorKey() {
    const counts = new Map<string, number>();
    for (const c of field.concepts) {
      if (!allowedPos.has(c.partOfSpeech)) continue;
      counts.set(c.domain, (counts.get(c.domain) ?? 0) + 1);
    }
    colorKey.setVisibleDomains(
      [...counts.entries()].map(([domain, count]) => ({ domain, count })),
    );
  }

  card = document.createElement("vx-concept-card") as VxConceptCard;
  stageEl.appendChild(card);

  // P6 — tres shells reales (ver DOCs/03 §3): Intermedio agrega un dock
  // fijo en escritorio, Avanzado agrega un Math Arena con separador
  // arrastrable + consola de ancho completo. `canvas.parentElement` es
  // ahora #cube-pane (ver index.html) — el ResizeObserver de engine.ts
  // ya lo escucha, así que angostar la columna del cubo reproyecta la
  // cámara sola, sin cablear nada más.
  const DESKTOP_INTERMEDIO = "(min-width: 1024px)";
  const DESKTOP_AVANZADO = "(min-width: 1100px)";
  const isDockLayout = (mode: Mode) =>
    (mode === "intermedio" && matchMedia(DESKTOP_INTERMEDIO).matches) ||
    (mode === "avanzado" && matchMedia(DESKTOP_AVANZADO).matches);

  const AVANZADO_SASH_KEY = "vectron_avanzado_sash";
  function applySashWidth(pct: number) {
    stageEl.style.setProperty("--avanzado-cube", `${pct}%`);
  }
  {
    const stored = Number(localStorage.getItem(AVANZADO_SASH_KEY));
    applySashWidth(Number.isFinite(stored) && stored >= 30 && stored <= 75 ? stored : 58);
  }
  let sashDragging = false;
  sashEl.addEventListener("pointerdown", (e) => {
    sashDragging = true;
    sashEl.classList.add("dragging");
    sashEl.setPointerCapture(e.pointerId);
  });
  sashEl.addEventListener("pointermove", (e) => {
    if (!sashDragging) return;
    const pct = Math.min(75, Math.max(30, (e.clientX / window.innerWidth) * 100));
    applySashWidth(pct);
  });
  function endSashDrag() {
    if (!sashDragging) return;
    sashDragging = false;
    sashEl.classList.remove("dragging");
    const pct = parseFloat(stageEl.style.getPropertyValue("--avanzado-cube"));
    if (Number.isFinite(pct)) localStorage.setItem(AVANZADO_SASH_KEY, String(pct));
  }
  sashEl.addEventListener("pointerup", endSashDrag);
  sashEl.addEventListener("pointercancel", endSashDrag);

  // Avanzado angosto: Cubo|Matemáticas son superficies hermanas, no un
  // toggle débil (ver DOCs/03 §3.3) — el cubo sigue montado y girando
  // detrás, el Math Arena sólo se le pone encima a pantalla completa.
  let mobileSurface: Surface = "cube";
  const surfaceToggle = document.createElement("vx-surface-toggle") as VxSurfaceToggle;
  surfaceToggle.setAttribute("current", mobileSurface);
  surfaceToggle.addEventListener("vx-surface-change", (event) => {
    mobileSurface = (event as CustomEvent<SurfaceChangeDetail>).detail.surface;
    surfaceToggle.setAttribute("current", mobileSurface);
    stageEl.dataset.surface = mobileSurface;
  });

  function applyShellLayout(mode: Mode) {
    stageEl.dataset.mode = mode;
    sidePaneEl.replaceChildren();
    consolePaneEl.replaceChildren();

    if (mode === "avanzado") {
      sidePaneEl.appendChild(document.createElement("vx-math-arena"));
      if (!matchMedia(DESKTOP_AVANZADO).matches) {
        stageEl.dataset.surface = mobileSurface;
        if (!surfaceToggle.isConnected) stageEl.appendChild(surfaceToggle);
      } else if (surfaceToggle.isConnected) {
        surfaceToggle.remove();
        delete stageEl.dataset.surface;
      }
    } else if (surfaceToggle.isConnected) {
      surfaceToggle.remove();
      delete stageEl.dataset.surface;
    }
  }

  // Redistribuir en vivo si la ventana cruza un breakpoint sin cambiar
  // de modo (ej. rotar una tablet) — reusa runApplyModeChrome en vez de
  // duplicar la lógica de reparentar composer/strip.
  for (const query of [DESKTOP_INTERMEDIO, DESKTOP_AVANZADO]) {
    matchMedia(query).addEventListener("change", () => {
      if (appReady) void applyMode(currentMode);
    });
  }

  // Vuelo suave de cámara hacia la partícula fijada (y de regreso al
  // centro al soltar): mueve el target de OrbitControls Y la cámara
  // conservando la dirección de vista actual — después del vuelo, orbitar
  // y hacer zoom giran alrededor de la partícula, no del centro.
  const flyState = { id: 0 };
  function flyTo(worldPos: THREE.Vector3 | null) {
    const id = ++flyState.id;
    const controls = engine.controls;
    const camera = engine.camera;
    const dest = worldPos ?? new THREE.Vector3(0, 0, 0);
    const currentDist = camera.position.distanceTo(controls.target);
    // Acercarse al fijar; al volver al centro, quedarse a distancia de
    // vista general. 1.15/3.2 -> 1.75/4.86 (×1.52, mismo factor que
    // CUBE_SCALE — ver seed.ts).
    const targetDist = worldPos ? Math.min(currentDist, 1.75) : Math.max(currentDist, 4.86);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const fromT = controls.target.clone();
    const fromC = camera.position.clone();
    const toC = dest.clone().add(dir.multiplyScalar(targetDist));
    const duration = 700;
    const start = performance.now();
    function tick() {
      if (id !== flyState.id) return; // otro vuelo lo reemplazó
      const t = Math.min((performance.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(fromT, dest, e);
      camera.position.lerpVectors(fromC, toC, e);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Bug real reportado con capturas en vivo: el PCA centra TODO el
  // dataset en el origen, pero un subconjunto (ej. sólo sustantivos+
  // función en Principiante) no queda centrado ahí — su propio
  // centroide queda desplazado hacia donde vive esa región semántica.
  // Como la órbita siempre giraba alrededor del origen fijo, cambiar de
  // modo dejaba lo visible "de un lado", descentrado, y la rotación se
  // sentía desbalanceada. Recalcula el centroide de lo visible en cada
  // cambio de modo y desliza la cámara (target + posición, mismo
  // offset relativo — un paneo, no un dolly) hacia allá.
  const recenterState = { id: 0 };
  function recenterToMode(allowed: Set<PartOfSpeech>) {
    const visible = field.concepts.filter((c) => allowed.has(c.partOfSpeech));
    if (visible.length === 0) return;
    const centroid = new THREE.Vector3();
    for (const c of visible) centroid.add(new THREE.Vector3(...c.coords));
    centroid.divideScalar(visible.length);

    const id = ++recenterState.id;
    const controls = engine.controls;
    const camera = engine.camera;
    const fromT = controls.target.clone();
    const fromC = camera.position.clone();
    const delta = centroid.clone().sub(fromT);
    const toC = fromC.clone().add(delta);
    const duration = 1100;
    const start = performance.now();
    function tick() {
      if (id !== recenterState.id) return;
      const t = Math.min((performance.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(fromT, centroid, e);
      camera.position.lerpVectors(fromC, toC, e);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const interaction = setupConceptInteraction({
    canvas,
    camera: engine.camera,
    field,
    card,
    defaultTopK: 6,
    onFocusPoint: flyTo,
  });

  // HUD: base por modo + sufijo de tokens vivos (modo token, Avanzado).
  let baseCountText = "";
  function renderCountLabel() {
    countLabel.textContent =
      liveTokenCount > 0 ? `${baseCountText} + ${liveTokenCount} tokens` : baseCountText;
  }

  const tokenMode = setupTokenMode({
    canvas,
    camera: engine.camera,
    field,
    card,
    onCountChange: (n) => {
      liveTokenCount = n;
      renderCountLabel();
    },
    onFocusPoint: flyTo,
  });

  // Índice palabra/frase -> instancias del InstancedMesh, para resaltar
  // en el cubo qué partículas coinciden con el texto escrito y trazar
  // el camino entre ellas (mismo orden que las palabras en la frase).
  // La llave puede tener varias palabras ("black hole", "número primo")
  // — maxNgram guarda cuántas como máximo, para el escaneo de abajo.
  const wordIndex = new Map<string, number[]>();
  let maxNgram = 1;
  field.concepts.forEach((concept, instanceId) => {
    for (const w of [concept.word.es, concept.word.en]) {
      const key = w.toLowerCase();
      const list = wordIndex.get(key) ?? [];
      list.push(instanceId);
      wordIndex.set(key, list);
      maxNgram = Math.max(maxNgram, key.split(/\s+/).length);
    }
  });

  // Coincidencias por frase completa, no sólo por token: ni el BPE ni
  // el modo simple agrupan varias palabras en un solo token, así que
  // comparar token-por-token nunca encontraría "black hole" o "número
  // primo" — se re-tokeniza el texto crudo en palabras sueltas (al
  // margen del tokenizador elegido para mostrar) y se buscan las frases
  // más largas primero en cada posición. Sólo cuentan coincidencias
  // cuyo tipo de palabra esté visible en el modo actual — si no, un
  // verbo en Principiante conectaría hacia una partícula invisible
  // (escala 0), una línea que apunta a la nada.
  let allowedPos: Set<PartOfSpeech> = MODE_POS.principiante;
  function findWordMatches(text: string): { matches: number[]; ordered: number[] } {
    const words = tokenizeSimple(text)
      .map((tok) => tok.text)
      .filter((w) => /[\p{L}\p{N}]/u.test(w));
    const matches = new Set<number>();
    const ordered: number[] = [];
    let i = 0;
    while (i < words.length) {
      let consumed = 0;
      for (let len = Math.min(maxNgram, words.length - i); len >= 1; len--) {
        const allIds = wordIndex.get(words.slice(i, i + len).join(" ").toLowerCase());
        const ids = allIds?.filter((id) => allowedPos.has(field.concepts[id].partOfSpeech));
        if (ids && ids.length > 0) {
          ids.forEach((id) => matches.add(id));
          ordered.push(ids[0]);
          consumed = len;
          break;
        }
      }
      i += consumed || 1;
    }
    return { matches: [...matches], ordered };
  }

  // P1: composer (entrada, abajo) y strip (chips, franja superior) son
  // dos componentes separados que se montan juntos — la franja de
  // tokens ya no vive en la misma barra que el input, así que puede
  // crecer (comparación BGE) sin competir con él por espacio ni tapar
  // el centro del cubo (ver DOCs/04-build-order.md P1).
  function mountComposerAndStrip(
    mode: Mode,
    fadeMs = 420,
  ): { composer: VxComposer; strip: VxTokenStrip } {
    const composer = document.createElement("vx-composer") as VxComposer;
    const strip = document.createElement("vx-token-strip") as VxTokenStrip;
    if (mode === "principiante") {
      composer.setAttribute("hide-toggle", "");
      strip.setAttribute("hide-ids", "");
    }
    if (mode === "avanzado") {
      // Modo token: dos filas comparadas (GPT vs BGE) + partículas
      // efímeras de tu frase embebidas en vivo.
      strip.setAttribute("compare", "");
    }
    composer.setAttribute(
      "placeholder",
      mode === "principiante"
        ? t("tokenPanelPlaceholderPrincipiante", lang)
        : t("tokenPanelPlaceholderDefault", lang),
    );
    composer.addEventListener("vx-tokens-change", (event) => {
      const { tokens, mode: tokMode, text } = (event as CustomEvent<TokensChangeDetail>).detail;
      void strip.setTokens(tokens, tokMode, text);
      const { matches, ordered } = findWordMatches(text);
      field.setSearchHighlights(matches);
      const chainObj = field.setChainLines(ordered);
      if (chainObj && ordered.length >= 2) {
        // Hover con similitud de coseno REAL por segmento: los vectores
        // 1024-d del dataset viven en Vectorize, así que se piden al
        // worker (una llamada por frase, no por segmento).
        const pairs: [number, number][] = [];
        for (let i = 0; i < ordered.length - 1; i++) {
          pairs.push([field.concepts[ordered[i]].id, field.concepts[ordered[i + 1]].id]);
        }
        fetchCosinePairs(pairs).then((scores) => {
          // Si la línea ya fue reemplazada por otra frase, no tocarla.
          if (!chainObj.parent) return;
          chainObj.userData.segments = scores.map((s, i) => {
            const a = field.concepts[ordered[i]].word;
            const b = field.concepts[ordered[i + 1]].word;
            const wa = lang === "en" ? a.en : a.es;
            const wb = lang === "en" ? b.en : b.es;
            return s === null ? "" : `${wa} ↔ ${wb} · cos(θ) = ${s.toFixed(3)}`;
          });
        });
      }
      tokenMode.setText(text);
    });
    if (isDockLayout(mode)) {
      // P6: hijos de flujo normal dentro del dock (Intermedio) o la
      // consola de ancho completo (Avanzado) — no overlays flotantes.
      composer.setAttribute("dock", "");
      strip.setAttribute("dock", "");
      const target = mode === "intermedio" ? sidePaneEl : consolePaneEl;
      if (mode === "intermedio") {
        target.appendChild(composer);
        target.appendChild(strip);
        const note = document.createElement("div");
        note.className = "dock-note";
        note.innerHTML = `<p>${t("pipelineDockEmbedding", lang)}</p><p>${t("pipelineDockNeighbors", lang)}</p>`;
        target.appendChild(note);
      } else {
        target.appendChild(strip);
        target.appendChild(composer);
      }
    } else {
      stageEl.appendChild(composer);
      stageEl.appendChild(strip);
    }
    fadeIn(composer, { duration: fadeMs, rise: 16 });
    fadeIn(strip, { duration: fadeMs, rise: -16 });
    return { composer, strip };
  }

  let composer: VxComposer | null = null;
  let tokenStrip: VxTokenStrip | null = null;
  let currentMode: Mode = initialMode;

  // El fundido de salida/entrada del composer/tokenStrip ahora dura lo
  // mismo que la ola de partículas (hasta 3.4s en cambios grandes, ver
  // chromeFadeMs en runApplyModeChrome) — si se esperara (`await`)
  // adentro de runApplyModeChrome como antes, applyModeBusy se
  // quedaría trabado ese mismo tiempo, reintroduciendo justo el
  // problema que se acaba de arreglar (un segundo cambio de modo a
  // medio camino debe reaccionar YA, no esperar en cola). Por eso esto
  // corre SIN esperar, con su propio contador de secuencia — si un
  // cambio de modo más nuevo llega mientras este fundido todavía está
  // en el aire, éste no debe pisar el composer/tokenStrip que el más
  // nuevo ya montó.
  let chromeSwapSeq = 0;

  async function swapComposerAndStrip(mode: Mode, fadeMs: number) {
    const seq = ++chromeSwapSeq;
    const prevComposer = composer;
    const prevStrip = tokenStrip;
    if (prevComposer && prevStrip) {
      await Promise.all([
        fadeOut(prevComposer, { duration: fadeMs }),
        fadeOut(prevStrip, { duration: fadeMs }),
      ]);
      if (seq !== chromeSwapSeq) return; // un cambio más nuevo ya se encargó
      prevComposer.remove();
      prevStrip.remove();
    }
    if (seq !== chromeSwapSeq) return;
    ({ composer, strip: tokenStrip } = mountComposerAndStrip(mode, fadeMs));
  }

  // El "cambio de stage" real: nunca recrea el motor 3D ni recarga la
  // página — las partículas siguen girando durante todo el cambio, sólo
  // la barra de tokenización y la tarjeta de concepto se reconfiguran.
  // P2: bloquear reentrada mientras un morph está en curso, y sólo
  // encolar el ÚLTIMO modo pedido (no cada clic intermedio) — ver
  // DOCs/06-mode-morph-cells.md §6/§11 "User spam-clicks modes: queue
  // last mode only". Sin este guard, clics rápidos lanzan varios
  // applyMode concurrentes que pisan las variables compartidas
  // (baseCountText, composer/tokenStrip) fuera de orden — bug real
  // encontrado spam-clickeando P/I/A/P en producción: el HUD se quedaba
  // mostrando el modo equivocado aunque el switcher sí marcaba el
  // correcto.
  //
  // El guard sólo envuelve el "chrome" (switcher/HUD/shell/composer —
  // rápido, tiene que quedar en orden) — la morph de partículas se
  // dispara sin esperarla (ver runApplyModeChrome). Pedido explícito
  // 2026-07-19: cambiar de modo otra vez ANTES de que la ola anterior
  // termine debe arrancar de inmediato, no esperar en cola a que la
  // vieja acabe — morphToPartOfSpeechFilter ya sabe interrumpir la
  // suya propia sin saltos (ver morphSeq/scaleArray en particleField.ts),
  // sólo hacía falta que aquí no la esperáramos dentro del candado.
  let applyModeBusy = false;
  let queuedMode: Mode | null = null;

  async function applyMode(mode: Mode) {
    if (applyModeBusy) {
      queuedMode = mode;
      return;
    }
    applyModeBusy = true;
    try {
      await runApplyModeChrome(mode);
    } finally {
      applyModeBusy = false;
      if (queuedMode !== null) {
        const next = queuedMode;
        queuedMode = null;
        void applyMode(next);
      }
    }
  }

  async function runApplyModeChrome(mode: Mode) {
    currentMode = mode;
    allowedPos = MODE_POS[mode];
    // Pedido explícito 2026-07-19: el switcher deslizaba su pastilla
    // (y el composer/tokenStrip se desvanecían al remontarse) en una
    // duración fija, desacoplada de cuánto tarda en realidad la ola de
    // partículas (dinámica, 0.7-3.4s según cuántas cambian, ver
    // computeMorphPlan en particleField.ts) — el "chrome" terminaba su
    // transición mucho antes de que el cubo terminara la suya.
    // estimateMorphDuration calcula esa misma duración SIN animar nada,
    // así que switcher/composer/tokenStrip pueden sincronizarse a ella
    // antes de que la morph real arranque más abajo.
    const morphMs = field.estimateMorphDuration(allowedPos);
    switcher.setTransitionMs(morphMs > 0 ? morphMs : 320);
    switcher.setAttribute("current", mode);
    backendTag.textContent = engine.usingWebGPU ? t("hudWebgpu", lang) : t("hudWebgl", lang);

    card!.configure({ simple: mode === "principiante", lang }); // runApplyModeChrome sólo corre tras asignar card, arriba
    interaction.setDefaultTopK(mode === "principiante" ? 5 : 6);
    interaction.reset(); // suelta el pin ANTES del morph — mismo orden que "cancela al empezar" (06 §6)
    tokenMode.setEnabled(mode === "avanzado");
    kindLegend.setMode(mode);
    colorKey.setMode(mode);
    field.setSearchHighlights([]); // suelta cualquier dominio aislado del modo anterior

    // Todo el "chrome" de la app (shell, composer/strip, HUD, color key)
    // se actualiza YA — bug real reportado en vivo: antes esperaba a que
    // terminara la morph de partículas (hasta varios segundos) para
    // recién ahí cambiar el dock/Math Arena/toggle Cubo|Matemáticas, así
    // que durante toda la animación el switcher ya mostraba el modo
    // nuevo pero el layout seguía siendo el del modo anterior.
    const isFirstCall = composer === null;
    const chromeFadeMs = morphMs > 0 ? morphMs : 220;
    applyShellLayout(mode);
    void swapComposerAndStrip(mode, chromeFadeMs);

    // El conteo real no depende de que la morph termine — se puede
    // calcular directo del filtro, así el HUD también es instantáneo.
    const visibleCount = field.concepts.filter((c) => allowedPos.has(c.partOfSpeech)).length;
    refreshColorKey();
    // El HUD también habla el idioma de cada modo: Principiante no dice
    // "vector", los otros sí (con la notación ℝ en Avanzado).
    const countUnit =
      mode === "principiante"
        ? t("hudUnitPrincipiante", lang)
        : mode === "intermedio"
          ? t("hudUnitIntermedio", lang)
          : t("hudUnitAvanzado", lang);
    baseCountText = `${visibleCount.toLocaleString(lang === "en" ? "en-US" : "es-MX")} ${countUnit}`;
    if (isFirstCall) {
      renderCountLabel();
    } else {
      fadeOut(countLabel, { duration: 150 }).then(() => {
        renderCountLabel();
        fadeIn(countLabel, { duration: 200, rise: 0 });
      });
    }

    // Recentrar la órbita al centroide de lo visible corre EN PARALELO
    // con la morph, no bloquea nada — ver recenterToMode arriba.
    recenterToMode(allowedPos);

    // P2: mitosis (nacen las que entran) / fusión (las que salen se
    // comen hacia una vecina) en vez del corte instantáneo de antes —
    // ver DOCs/06-mode-morph-cells.md. Duración calculada según cuántas
    // partículas hay que animar (ver computeMorphPlan en
    // particleField.ts). NO se espera aquí adentro (antes sí, con
    // `await`) — hacerlo bloqueaba applyModeBusy hasta varios segundos,
    // así que un segundo cambio de modo mientras la ola seguía en el
    // aire se quedaba en cola esperando en vez de interrumpirla de
    // inmediato. morphToPartOfSpeechFilter ya resuelve la interrupción
    // por su cuenta (morphSeq cancela la promesa vieja sin saltar,
    // scaleArray/posArray hacen que la nueva continúe desde donde cada
    // partícula de verdad esté).
    const reducedMotion =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    void field.morphToPartOfSpeechFilter(allowedPos, { reducedMotion });
  }

  switcher.addEventListener("vx-mode-change", (event) => {
    const { mode } = (event as CustomEvent<ModeChangeDetail>).detail;
    setStoredMode(mode);
    void applyMode(mode);
  });

  await applyMode(initialMode);
  appReady = true;
}

main().catch((err) => {
  backendTag.textContent = t("hudError", getStoredLang());
  countLabel.textContent = "—";
  console.error(err);
});
