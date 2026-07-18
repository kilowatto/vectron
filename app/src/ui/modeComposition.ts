import type { Mode } from "./components/modeStorage";
import type { ParticleField } from "../scene/particleField";
import type { VxTokenPanel, TokensChangeDetail } from "./components/tokenPanel";
import "./components/tokenPanel";
import "./components/dockHeader";
import { staggerIn, fadeIn, fadeOut } from "./motion";
import { getStoredLang, t } from "../i18n";

export interface DockHandle {
  usesDock: boolean;
  /** Desvanece el contenido actual sin quitarlo del DOM todavía — la siguiente llamada a `mountModeDock` lo reemplaza una vez resuelto. */
  teardown(): Promise<void>;
}

/**
 * Monta la UI 2D de un modo (header del dock + token panel + lo que viva
 * en el dock: nada en Principiante, el explicador del mecanismo en
 * Intermedio, el grafo de tensores en Avanzado) dentro de `dockEl`. Cada
 * modo es su propia composición (ver feedback-vectron-modes) — esta
 * función es el único lugar que decide "qué componentes le tocan a cada
 * modo".
 *
 * Pensada para llamarse repetidas veces (cambio de modo en vivo, sin
 * recargar la página): construye todo el contenido nuevo ANTES de tocar
 * el DOM (import dinámico + creación de elementos), y sólo entonces hace
 * un swap atómico con `replaceChildren` — nunca hay un estado a medio
 * construir visible. Quien llama es responsable de, si hubo un montaje
 * anterior, esperar su `DockHandle.teardown()` antes de volver a llamar.
 */
export async function mountModeDock(
  mode: Mode,
  dockEl: HTMLElement,
  field: ParticleField,
): Promise<DockHandle> {
  const usesDock = mode === "intermedio" || mode === "avanzado";
  const lang = getStoredLang();

  const tokenPanel = document.createElement("vx-token-panel") as VxTokenPanel;
  if (mode === "principiante") {
    tokenPanel.setAttribute("variant", "bottom");
    tokenPanel.setAttribute("hide-toggle", "");
    tokenPanel.setAttribute("hide-ids", "");
    tokenPanel.setAttribute("placeholder", t("tokenPanelPlaceholderPrincipiante", lang));
  } else if (mode === "avanzado") {
    tokenPanel.setAttribute("variant", "docked");
    tokenPanel.setAttribute("placeholder", t("tokenPanelPlaceholderAvanzado", lang));
  } else {
    tokenPanel.setAttribute("variant", "docked");
  }

  const nodes: HTMLElement[] = [];
  if (usesDock) {
    const header = document.createElement("vx-dock-header");
    header.setAttribute(
      "tag",
      mode === "avanzado" ? t("dockTagAvanzado", lang) : t("dockTagIntermedio", lang),
    );
    nodes.push(header);
  }
  // variant="bottom" se posiciona fijo por su cuenta (:host{position:fixed}
  // en tokenPanel.css) — da igual que su padre en el DOM sea #dock, así
  // que siempre vive ahí y el teardown/swap de abajo es uniforme para
  // los 3 modos, sin un caso especial para Principiante.
  nodes.push(tokenPanel);

  let advancedPanel: (HTMLElement & { tokenCount: number }) | null = null;
  if (mode === "intermedio") {
    await import("./components/mechanismExplainer");
    nodes.push(document.createElement("vx-mechanism-explainer"));
  } else if (mode === "avanzado") {
    await import("./components/advancedPanel");
    advancedPanel = document.createElement("vx-advanced-panel") as HTMLElement & {
      tokenCount: number;
    };
    nodes.push(advancedPanel);
  }

  dockEl.replaceChildren(...nodes);

  if (usesDock) {
    // Mismo timing que el montaje inicial: un pequeño delay para que el
    // panel ya esté abriéndose (grid-template-columns, 0.7s) antes de que
    // el contenido empiece a aparecer — nada aparece de golpe ni antes de
    // que haya espacio para verlo.
    staggerIn(dockEl, { step: 90, initialDelay: 150, duration: 550 });
    const advScroll = advancedPanel?.shadowRoot?.querySelector<HTMLElement>(".scroll");
    if (advScroll) staggerIn(advScroll, { step: 70, initialDelay: 500, duration: 500 });
  } else {
    fadeIn(tokenPanel, { duration: 450, rise: 16 });
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

  return {
    usesDock,
    async teardown() {
      await Promise.all(
        Array.from(dockEl.children).map((el) => fadeOut(el as HTMLElement, { duration: 220 })),
      );
    },
  };
}
