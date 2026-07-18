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

export interface ConceptCard {
  root: HTMLDivElement;
  showHover(concept: Concept, x: number, y: number): void;
  showPinned(concept: Concept): void;
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
  `;
}

export function createConceptCard(): ConceptCard {
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

  function showPinned(concept: Concept) {
    pinned = true;
    root.className = "pinned";
    root.style.left = "";
    root.style.top = "";
    root.style.display = "flex";
    root.innerHTML =
      cardBody(concept, true) +
      `<div class="hint">clic fuera o Esc para cerrar</div>`;
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
