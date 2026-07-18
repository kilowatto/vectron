import "./style.css";
import * as THREE from "three/webgpu";
import { createParticleField, spinField } from "./scene/particleField";
import { createEngine } from "./scene/engine";
import { setupConceptInteraction } from "./scene/conceptInteraction";
import { fetchConcepts } from "./data/concepts";
import { getStoredMode, setStoredMode, type Mode } from "./ui/components/modeStorage";
import "./ui/components/modeSelect";
import "./ui/components/modeSwitcher";
import type { ModeChangeDetail } from "./ui/components/modeSwitcher";
import "./ui/components/langSwitcher";
import type { LangChangeDetail } from "./ui/components/langSwitcher";
import type { VxConceptCard } from "./ui/components/conceptCard";
import "./ui/components/conceptCard";
import type { VxComposer, TokensChangeDetail } from "./ui/components/composer";
import "./ui/components/composer";
import type { VxTokenStrip } from "./ui/components/tokenStrip";
import "./ui/components/tokenStrip";
import type { ModePickDetail } from "./ui/components/modeSelect";
import { getStoredLang, setStoredLang, t } from "./i18n";
import { fadeIn, fadeOut, tweenNumber } from "./ui/motion";
import { tokenizeSimple } from "./tokenizer";
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

  const initialMode = getStoredMode() ?? (await pickMode());

  const switcher = document.createElement("vx-mode-switcher");
  document.body.appendChild(switcher);
  const langSwitcher = document.createElement("vx-lang-switcher");
  langSwitcher.setAttribute("current", lang);
  document.body.appendChild(langSwitcher);

  countLabel.textContent = t("hudLoading", lang);
  const concepts = await fetchConcepts();

  const engine = await createEngine(canvas);

  const CUBE_EDGE_OPACITY = 0.12;
  const cubeEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0xd98a34,
    transparent: true,
    opacity: CUBE_EDGE_OPACITY,
  });
  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 2.8, 2.8)),
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

  const card = document.createElement("vx-concept-card") as VxConceptCard;
  stageEl.appendChild(card);

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
    // Acercarse al fijar; al volver al centro, quedarse a distancia de vista general.
    const targetDist = worldPos ? Math.min(currentDist, 1.15) : Math.max(currentDist, 3.2);
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
  let liveTokenCount = 0;
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
  function mountComposerAndStrip(mode: Mode): { composer: VxComposer; strip: VxTokenStrip } {
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
    stageEl.appendChild(composer);
    stageEl.appendChild(strip);
    fadeIn(composer, { duration: 420, rise: 16 });
    fadeIn(strip, { duration: 420, rise: -16 });
    return { composer, strip };
  }

  let composer: VxComposer | null = null;
  let tokenStrip: VxTokenStrip | null = null;
  let currentMode: Mode = initialMode;

  // El "cambio de stage" real: nunca recrea el motor 3D ni recarga la
  // página — las partículas siguen girando durante todo el cambio, sólo
  // la barra de tokenización y la tarjeta de concepto se reconfiguran.
  async function applyMode(mode: Mode) {
    currentMode = mode;
    allowedPos = MODE_POS[mode];
    switcher.setAttribute("current", mode);
    backendTag.textContent = engine.usingWebGPU ? t("hudWebgpu", lang) : t("hudWebgl", lang);

    card.configure({ simple: mode === "principiante", lang });
    interaction.setDefaultTopK(mode === "principiante" ? 5 : 6);
    interaction.reset();
    tokenMode.setEnabled(mode === "avanzado");
    const visibleCount = field.setPartOfSpeechFilter(allowedPos);

    // El HUD también habla el idioma de cada modo: Principiante no dice
    // "vector", los otros sí (con la notación ℝ en Avanzado).
    const countUnit =
      mode === "principiante"
        ? t("hudUnitPrincipiante", lang)
        : mode === "intermedio"
          ? t("hudUnitIntermedio", lang)
          : t("hudUnitAvanzado", lang);
    baseCountText = `${visibleCount.toLocaleString(lang === "en" ? "en-US" : "es-MX")} ${countUnit}`;
    if (!composer) {
      renderCountLabel();
    } else {
      fadeOut(countLabel, { duration: 150 }).then(() => {
        renderCountLabel();
        fadeIn(countLabel, { duration: 200, rise: 0 });
      });
    }

    if (composer && tokenStrip) {
      await Promise.all([
        fadeOut(composer, { duration: 220 }),
        fadeOut(tokenStrip, { duration: 220 }),
      ]);
      composer.remove();
      tokenStrip.remove();
    }
    ({ composer, strip: tokenStrip } = mountComposerAndStrip(mode));
  }

  switcher.addEventListener("vx-mode-change", (event) => {
    const { mode } = (event as CustomEvent<ModeChangeDetail>).detail;
    setStoredMode(mode);
    void applyMode(mode);
  });

  await applyMode(initialMode);
  appReady = true;

  engine.start(
    (dt) => {
      // La rotación automática se pausa mientras algo está fijado o hay
      // tokens vivos de tu frase — sin esto, atinarle con el cursor a
      // una partícula específica es una cacería (se mueve ~4px/s).
      if (!card.isPinned() && liveTokenCount === 0) spinField(field, dt);
    },
    (fps) => {
      fpsLabel.textContent = `${fps} fps`;
    },
  );
}

main().catch((err) => {
  backendTag.textContent = t("hudError", getStoredLang());
  countLabel.textContent = "—";
  console.error(err);
});
