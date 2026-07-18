import type { Mode } from "./modeSelect";
import type { ParticleField } from "../scene/particleField";
import { createTokenPanel } from "./tokenPanel";
import { createDockHeader } from "./dockHeader";
import { staggerIn } from "./motion";

/**
 * Monta la UI 2D del modo elegido — panel de tokenización + lo que viva
 * en el dock (nada en Principiante, la explicación del mecanismo en
 * Intermedio, el grafo de tensores en Avanzado). Cada modo es su propia
 * composición (ver feedback-vectron-modes), esta función es el único
 * lugar que decide "qué UI le toca a cada modo".
 */
export async function composeModeUI(
  mode: Mode,
  appEl: HTMLElement,
  dockEl: HTMLElement,
  field: ParticleField,
): Promise<void> {
  const usesDock = mode === "intermedio" || mode === "avanzado";

  if (usesDock) {
    const tag =
      mode === "avanzado"
        ? "avanzado · matemática real, sin atajos"
        : "intermedio · el mecanismo real, sin la matemática";
    dockEl.appendChild(createDockHeader(tag));
  }

  const tokenPanel = createTokenPanel({
    showToggle: mode !== "principiante",
    showIds: mode !== "principiante",
    placeholder:
      mode === "principiante"
        ? "Escribe algo o toca un ejemplo…"
        : mode === "avanzado"
          ? "Escribe una frase — abajo verás cada paso hasta la atención"
          : undefined,
    mountTo: usesDock ? dockEl : undefined,
    variant: mode === "principiante" ? "bottom" : undefined,
  });

  // El contenido de cada dock se carga aquí, siempre visible de una vez
  // (no detrás de un botón).
  let advancedPanelUpdate: ((n: number) => void) | null = null;
  if (mode === "intermedio") {
    const { createMechanismExplainer } = await import("./mechanismExplainer");
    dockEl.appendChild(createMechanismExplainer());
  } else if (mode === "avanzado") {
    const { createAdvancedPanelBody } = await import("./advancedPanel");
    const panel = createAdvancedPanelBody();
    panel.root.classList.add("docked");
    dockEl.appendChild(panel.root);
    advancedPanelUpdate = panel.update;
  }

  if (usesDock) {
    // Todo el contenido ya existe: ahora sí se abre el layout y se pinta
    // el dock en cascada — nada aparece de golpe. Síncrono a propósito:
    // ya hubo varios `await` antes de este punto (fetch, import, init de
    // WebGPU), de sobra para que el navegador haya pintado el estado
    // "cerrado" — no depende de que un requestAnimationFrame llegue a
    // ejecutarse, que en una pestaña sin foco puede no pasar nunca.
    appEl.classList.add("has-dock");
    staggerIn(dockEl, { step: 90, initialDelay: 150, duration: 550 });
    const advScroll = dockEl.querySelector<HTMLElement>(".adv-scroll");
    if (advScroll) staggerIn(advScroll, { step: 70, initialDelay: 500, duration: 500 });
  }

  // Resalta en el cubo las palabras del dataset que aparecen en el texto
  // escrito (§07 pasos 1 y 3 del plan).
  const wordIndex = new Map<string, number[]>();
  field.concepts.forEach((concept, instanceId) => {
    for (const w of [concept.word.es, concept.word.en]) {
      const key = w.toLowerCase();
      const list = wordIndex.get(key) ?? [];
      list.push(instanceId);
      wordIndex.set(key, list);
    }
  });

  tokenPanel.onChange((tokens) => {
    const matches = new Set<number>();
    for (const token of tokens) {
      const key = token.text.trim().toLowerCase();
      const ids = wordIndex.get(key);
      if (ids) ids.forEach((id) => matches.add(id));
    }
    field.setSearchHighlights([...matches]);
    advancedPanelUpdate?.(tokens.length);
  });
}
