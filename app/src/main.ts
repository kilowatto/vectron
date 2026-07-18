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
import type { VxTokenPanel, TokensChangeDetail } from "./ui/components/tokenPanel";
import "./ui/components/tokenPanel";
import type { ModePickDetail } from "./ui/components/modeSelect";
import { getStoredLang, setStoredLang, t } from "./i18n";
import { fadeIn, fadeOut, tweenNumber } from "./ui/motion";
import { tokenizeSimple } from "./tokenizer";
import type { PartOfSpeech } from "./data/concepts";

// Principiante=sustantivos, Intermedio=+adjetivos, Avanzado=+verbos —
// mismo diseño confirmado para el tipo de palabra visible por modo.
const MODE_POS: Record<Mode, Set<PartOfSpeech>> = {
  principiante: new Set(["sustantivo"]),
  intermedio: new Set(["sustantivo", "adjetivo"]),
  avanzado: new Set(["sustantivo", "adjetivo", "verbo"]),
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

  const interaction = setupConceptInteraction({
    canvas,
    camera: engine.camera,
    field,
    card,
    defaultTopK: 6,
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

  function mountTokenPanel(mode: Mode): VxTokenPanel {
    const panel = document.createElement("vx-token-panel") as VxTokenPanel;
    if (mode === "principiante") {
      panel.setAttribute("hide-toggle", "");
      panel.setAttribute("hide-ids", "");
    }
    panel.setAttribute(
      "placeholder",
      mode === "principiante"
        ? t("tokenPanelPlaceholderPrincipiante", lang)
        : t("tokenPanelPlaceholderDefault", lang),
    );
    panel.addEventListener("vx-tokens-change", (event) => {
      const { text } = (event as CustomEvent<TokensChangeDetail>).detail;
      const { matches, ordered } = findWordMatches(text);
      field.setSearchHighlights(matches);
      field.setChainLines(ordered);
    });
    stageEl.appendChild(panel);
    fadeIn(panel, { duration: 420, rise: 16 });
    return panel;
  }

  let tokenPanel: VxTokenPanel | null = null;
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
    const visibleCount = field.setPartOfSpeechFilter(allowedPos);

    // El HUD también habla el idioma de cada modo: Principiante no dice
    // "vector", los otros sí (con la notación ℝ en Avanzado).
    const countUnit =
      mode === "principiante"
        ? t("hudUnitPrincipiante", lang)
        : mode === "intermedio"
          ? t("hudUnitIntermedio", lang)
          : t("hudUnitAvanzado", lang);
    const countText = `${visibleCount.toLocaleString(lang === "en" ? "en-US" : "es-MX")} ${countUnit}`;
    if (!tokenPanel) {
      countLabel.textContent = countText;
    } else {
      fadeOut(countLabel, { duration: 150 }).then(() => {
        countLabel.textContent = countText;
        fadeIn(countLabel, { duration: 200, rise: 0 });
      });
    }

    if (tokenPanel) {
      await fadeOut(tokenPanel, { duration: 220 });
      tokenPanel.remove();
    }
    tokenPanel = mountTokenPanel(mode);
  }

  switcher.addEventListener("vx-mode-change", (event) => {
    const { mode } = (event as CustomEvent<ModeChangeDetail>).detail;
    setStoredMode(mode);
    void applyMode(mode);
  });

  await applyMode(initialMode);
  appReady = true;

  engine.start(
    (dt) => spinField(field, dt),
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
