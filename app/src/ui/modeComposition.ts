import type { Mode } from "./components/modeStorage";
import type { ParticleField } from "../scene/particleField";
import type { VxTokenPanel, TokensChangeDetail } from "./components/tokenPanel";
import "./components/tokenPanel";
import "./components/dockHeader";
// staggerIn ya llega al bundle principal vía conceptCard.ts (siempre
// cargado) — importarlo "de forma diferida" aquí no lo movería a otro
// chunk, así que se importa directo (ver aviso INEFFECTIVE_DYNAMIC_IMPORT).
import { staggerIn } from "./motion";

/**
 * Monta la UI 2D del modo elegido — panel de tokenización + lo que viva
 * en el dock (nada en Principiante, la explicación del mecanismo en
 * Intermedio, el grafo de tensores en Avanzado). Cada modo es su propia
 * composición (ver feedback-vectron-modes), esta función es el único
 * lugar que decide "qué componentes le tocan a cada modo".
 */
export async function composeModeUI(
  mode: Mode,
  appEl: HTMLElement,
  dockEl: HTMLElement,
  field: ParticleField,
): Promise<void> {
  const usesDock = mode === "intermedio" || mode === "avanzado";

  if (usesDock) {
    const header = document.createElement("vx-dock-header");
    header.setAttribute(
      "tag",
      mode === "avanzado"
        ? "avanzado · matemática real, sin atajos"
        : "intermedio · el mecanismo real, sin la matemática",
    );
    dockEl.appendChild(header);
  }

  const tokenPanel = document.createElement("vx-token-panel") as VxTokenPanel;
  if (mode === "principiante") {
    tokenPanel.setAttribute("variant", "bottom");
    tokenPanel.setAttribute("hide-toggle", "");
    tokenPanel.setAttribute("hide-ids", "");
    tokenPanel.setAttribute("placeholder", "Escribe algo o toca un ejemplo…");
  } else if (mode === "avanzado") {
    tokenPanel.setAttribute("variant", "docked");
    tokenPanel.setAttribute(
      "placeholder",
      "Escribe una frase — abajo verás cada paso hasta la atención",
    );
  } else {
    tokenPanel.setAttribute("variant", "docked");
  }
  (usesDock ? dockEl : document.body).appendChild(tokenPanel);

  // El contenido de cada dock se carga aquí, siempre visible de una vez
  // (no detrás de un botón). Importado de forma diferida porque el de
  // Avanzado carga KaTeX, no porque esté oculto.
  let advancedPanel: HTMLElement & { tokenCount: number } | null = null;
  if (mode === "intermedio") {
    await import("./components/mechanismExplainer");
    dockEl.appendChild(document.createElement("vx-mechanism-explainer"));
  } else if (mode === "avanzado") {
    await import("./components/advancedPanel");
    advancedPanel = document.createElement("vx-advanced-panel") as HTMLElement & {
      tokenCount: number;
    };
    dockEl.appendChild(advancedPanel);
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
    // Shadow DOM abierto: se puede seguir el cascadeo hacia dentro del
    // contenido de Avanzado (cada fórmula/sección, no sólo el panel entero).
    const advScroll = advancedPanel?.shadowRoot?.querySelector<HTMLElement>(".scroll");
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

  tokenPanel.addEventListener("vx-tokens-change", (event) => {
    const { tokens } = (event as CustomEvent<TokensChangeDetail>).detail;
    const matches = new Set<number>();
    for (const token of tokens) {
      const key = token.text.trim().toLowerCase();
      const ids = wordIndex.get(key);
      if (ids) ids.forEach((id) => matches.add(id));
    }
    field.setSearchHighlights([...matches]);
    if (advancedPanel) advancedPanel.tokenCount = tokens.length;
  });
}
