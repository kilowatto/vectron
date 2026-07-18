import type { Concept } from "../data/concepts";
import { DOMAIN_HUES } from "../scene/particleField";

const DOMAIN_LABELS: Record<string, string> = {
  matematicas: "Matemáticas",
  fisica: "Física",
  programacion: "Programación",
  biologia_animal: "Biología · animal",
  biologia_vegetal: "Biología · vegetal",
  materiales: "Materiales",
  geografia: "Geografía",
  astronomia: "Astronomía",
  sociedad: "Sociedad",
};

export interface NeighborView {
  concept: Concept;
  score: number;
}

export interface ConceptCard {
  root: HTMLDivElement;
  showHover(concept: Concept, x: number, y: number): void;
  showPinned(
    concept: Concept,
    neighbors: NeighborView[],
    topK: number,
    onTopKChange: (topK: number) => void,
  ): void;
  hideHover(): void;
  hidePinned(): void;
  isPinned(): boolean;
}

function hueToCss(hue: number): string {
  return `#${hue.toString(16).padStart(6, "0")}`;
}

function traitsToRows(concept: Concept): string {
  return Object.entries(concept.traits)
    .map(
      ([key, value]) =>
        `<div class="row"><span>${key}</span><span>${String(value)}</span></div>`,
    )
    .join("");
}

function cardBody(concept: Concept, detailed: boolean): string {
  const hue = hueToCss(DOMAIN_HUES[concept.domain] ?? 0x9aa5ad);
  const domainLabel = DOMAIN_LABELS[concept.domain] ?? concept.domain;
  return `
    <div class="head">
      <div class="swatch" style="background:${hue}"></div>
      <div class="body">
        <div class="words">
          <span class="es">${concept.word.es}</span>
          <span class="en">${concept.word.en}</span>
        </div>
        <div class="domain">${domainLabel}</div>
        ${
          detailed
            ? `<div class="taxonomy">${concept.taxonomy.join(" › ")}</div>
               <div class="traits">${traitsToRows(concept)}</div>
               <div class="coords">xyz ${concept.coords.map((c) => c.toFixed(2)).join(", ")}</div>`
            : ""
        }
      </div>
    </div>
  `;
}

export interface ConceptCardOptions {
  /** Principiante: sin taxonomía/atributos/coordenadas ni scores de coseno. */
  detailed?: boolean;
}

export function createConceptCard(
  options: ConceptCardOptions = {},
): ConceptCard {
  const { detailed = true } = options;
  const root = document.createElement("div");
  root.id = "concept-card";
  root.style.display = "none";
  document.body.appendChild(root);

  let pinned = false;

  function showHover(concept: Concept, x: number, y: number) {
    if (pinned) return;
    root.className = "hover";
    root.style.display = "flex";
    root.style.left = `${x + 18}px`;
    root.style.top = `${y + 18}px`;
    root.innerHTML = cardBody(concept, false);
  }

  function hideHover() {
    if (pinned) return;
    root.style.display = "none";
  }

  function neighborsBlock(
    neighbors: NeighborView[],
    topK: number,
  ): string {
    if (!detailed) {
      const words = neighbors.map((n) => n.concept.word.es).join(", ");
      return `
        <div class="neighbors simple">
          <div class="neighbors-head"><span>palabras parecidas</span></div>
          <p class="neighbor-plain">${words || "buscando…"}</p>
        </div>`;
    }
    const rows = neighbors
      .map((n) => {
        const pct = Math.round(Math.max(n.score, 0) * 100);
        return `<div class="neighbor">
          <span class="nword">${n.concept.word.es}</span>
          <div class="nbar"><div class="nbar-fill" style="width:${pct}%"></div></div>
          <span class="nscore">${n.score.toFixed(3)}</span>
        </div>`;
      })
      .join("");
    return `
      <div class="neighbors">
        <div class="neighbors-head">
          <span>vecinos más cercanos (coseno real)</span>
          <span class="topk-value">${topK}</span>
        </div>
        <input type="range" id="topk-slider" min="1" max="20" step="1" value="${topK}" />
        ${rows || '<div class="neighbor-empty">calculando…</div>'}
      </div>`;
  }

  function showPinned(
    concept: Concept,
    neighbors: NeighborView[],
    topK: number,
    onTopKChange: (topK: number) => void,
  ) {
    pinned = true;
    root.className = "pinned";
    root.style.left = "";
    root.style.top = "";
    root.style.display = "flex";
    root.innerHTML =
      cardBody(concept, detailed) +
      neighborsBlock(neighbors, topK) +
      `<div class="hint">clic fuera o Esc para cerrar</div>`;

    const slider = root.querySelector<HTMLInputElement>("#topk-slider");
    const valueLabel = root.querySelector<HTMLSpanElement>(".topk-value");
    // 'input' sólo actualiza la etiqueta (sin re-renderizar, para no
    // interrumpir el arrastre); 'change' dispara el refetch real al soltar.
    slider?.addEventListener("input", (e) => {
      if (valueLabel) valueLabel.textContent = (e.target as HTMLInputElement).value;
    });
    slider?.addEventListener("change", (e) => {
      onTopKChange(Number((e.target as HTMLInputElement).value));
    });
  }

  function hidePinned() {
    pinned = false;
    root.style.display = "none";
  }

  return {
    root,
    showHover,
    showPinned,
    hideHover,
    hidePinned,
    isPinned: () => pinned,
  };
}
