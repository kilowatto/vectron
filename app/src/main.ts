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
import type { VxConceptCard } from "./ui/components/conceptCard";
import "./ui/components/conceptCard";
import { mountModeDock, type DockHandle } from "./ui/modeComposition";
import type { ModePickDetail } from "./ui/components/modeSelect";
import { getStoredLang, t } from "./i18n";
import { fadeIn, fadeOut } from "./ui/motion";

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
  const initialMode = getStoredMode() ?? (await pickMode());
  const lang = getStoredLang();

  const switcher = document.createElement("vx-mode-switcher");
  document.body.appendChild(switcher);
  document.body.appendChild(document.createElement("vx-lang-switcher"));

  countLabel.textContent = t("hudLoading", lang);
  const concepts = await fetchConcepts();

  const engine = await createEngine(canvas);
  backendTag.textContent = engine.usingWebGPU ? t("hudWebgpu", lang) : t("hudWebgl", lang);

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
  document.getElementById("stage")!.appendChild(card);

  const interaction = setupConceptInteraction({
    canvas,
    camera: engine.camera,
    field,
    card,
    defaultTopK: 6,
  });

  let currentDock: DockHandle | null = null;
  let isFirstApply = true;

  // El "cambio de stage" real: nunca recrea el motor 3D ni recarga la
  // página — las partículas siguen girando durante todo el cambio, sólo
  // el dock/tarjeta/HUD alrededor se desmontan y vuelven a montar. La
  // transición del grid (grid-template-columns, 0.7s en style.css) y el
  // teardown del dock anterior (~220ms) arrancan juntos, así el panel se
  // abre/cierra mientras su contenido viejo se desvanece — el contenido
  // nuevo entra en cascada una vez que el viejo ya se fue.
  async function applyMode(mode: Mode) {
    switcher.setAttribute("current", mode);

    const usesDock = mode !== "principiante";
    const teardown = currentDock?.teardown();
    appEl.classList.toggle("has-dock", usesDock);

    card.configure({
      simple: mode === "principiante",
      pinnedAnchor: mode === "principiante" ? "center" : "bottom",
      lang,
    });
    interaction.setDefaultTopK(mode === "principiante" ? 5 : 6);
    interaction.reset();

    // El HUD también habla el idioma de cada modo: Principiante no dice
    // "vector", Avanzado sí y hasta con la notación ℝ del panel de tensores.
    const countUnit =
      mode === "principiante"
        ? t("hudUnitPrincipiante", lang)
        : mode === "intermedio"
          ? t("hudUnitIntermedio", lang)
          : t("hudUnitAvanzado", lang);
    const countText = `${field.count.toLocaleString(lang === "en" ? "en-US" : "es-MX")} ${countUnit}`;
    if (isFirstApply) {
      countLabel.textContent = countText;
    } else {
      fadeOut(countLabel, { duration: 150 }).then(() => {
        countLabel.textContent = countText;
        fadeIn(countLabel, { duration: 200, rise: 0 });
      });
    }
    isFirstApply = false;

    if (teardown) await teardown;
    currentDock = await mountModeDock(mode, dockEl, field);
  }

  switcher.addEventListener("vx-mode-change", (event) => {
    const { mode } = (event as CustomEvent<ModeChangeDetail>).detail;
    setStoredMode(mode);
    void applyMode(mode);
  });

  await applyMode(initialMode);

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
