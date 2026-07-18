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
import { fadeIn, fadeOut } from "./ui/motion";

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

  const card = document.createElement("vx-concept-card") as VxConceptCard;
  stageEl.appendChild(card);

  const interaction = setupConceptInteraction({
    canvas,
    camera: engine.camera,
    field,
    card,
    defaultTopK: 6,
  });

  // Índice palabra -> instancias del InstancedMesh, para resaltar en el
  // cubo qué partículas coinciden con el texto tokenizado y trazar el
  // camino entre ellas (mismo orden que las palabras en la frase).
  const wordIndex = new Map<string, number[]>();
  field.concepts.forEach((concept, instanceId) => {
    for (const w of [concept.word.es, concept.word.en]) {
      const key = w.toLowerCase();
      const list = wordIndex.get(key) ?? [];
      list.push(instanceId);
      wordIndex.set(key, list);
    }
  });

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
      const { tokens } = (event as CustomEvent<TokensChangeDetail>).detail;
      const matches = new Set<number>();
      // Orden de la frase, no de aparición en el dataset — así la línea
      // que conecta las partículas traza el mismo camino que las
      // palabras escritas.
      const ordered: number[] = [];
      for (const token of tokens) {
        const key = token.text.trim().toLowerCase();
        const ids = wordIndex.get(key);
        if (!ids) continue;
        ids.forEach((id) => matches.add(id));
        ordered.push(ids[0]);
      }
      field.setSearchHighlights([...matches]);
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
    switcher.setAttribute("current", mode);
    backendTag.textContent = engine.usingWebGPU ? t("hudWebgpu", lang) : t("hudWebgl", lang);

    card.configure({ simple: mode === "principiante", lang });
    interaction.setDefaultTopK(mode === "principiante" ? 5 : 6);
    interaction.reset();

    // El HUD también habla el idioma de cada modo: Principiante no dice
    // "vector", los otros sí (con la notación ℝ en Avanzado).
    const countUnit =
      mode === "principiante"
        ? t("hudUnitPrincipiante", lang)
        : mode === "intermedio"
          ? t("hudUnitIntermedio", lang)
          : t("hudUnitAvanzado", lang);
    const countText = `${field.count.toLocaleString(lang === "en" ? "en-US" : "es-MX")} ${countUnit}`;
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
