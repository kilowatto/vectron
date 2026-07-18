import type { Concept } from "../../data/concepts";
import { DOMAIN_HUES } from "../../scene/particleField";
import { fadeIn, fadeOut } from "../motion";
import { attachShadow } from "./shadow";
import css from "./conceptCard.css?inline";

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

export interface TopKChangeDetail {
  topK: number;
}

function hueToCss(hue: number): string {
  return `#${hue.toString(16).padStart(6, "0")}`;
}

function traitsToRows(concept: Concept): string {
  return Object.entries(concept.traits)
    .map(([key, value]) => `<div class="row"><span>${key}</span><span>${String(value)}</span></div>`)
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

type Visibility = "none" | "hover" | "pinned";

/**
 * `<vx-concept-card>` — tooltip al pasar el cursor, tarjeta fijada con
 * vecinos reales al hacer clic. Usado por los 3 modos; lo que cambia es
 * su nivel de detalle, no el componente.
 *
 * ### Atributos
 * | nombre           | tipo    | default    | descripción                                                    |
 * |------------------|---------|------------|------------------------------------------------------------------|
 * | `simple`         | boolean | ausente    | si está presente, oculta taxonomía/atributos/coordenadas y los scores de coseno (Principiante). Fijar antes de insertar. |
 * | `pinned-anchor`  | string  | `"bottom"` | `"bottom"` o `"center"` — dónde se centra la tarjeta fijada. Fijar antes de insertar. |
 *
 * ### Métodos públicos
 * (reciben datos complejos — por eso son métodos, no atributos)
 * - `showHover(concept, x, y)` — tooltip no interactivo cerca del cursor.
 * - `hideHover()`
 * - `showPinned(concept, neighbors, topK)` — tarjeta fija e interactiva.
 * - `hidePinned()`
 * - `isPinned(): boolean`
 *
 * ### Eventos
 * - `vx-topk-change` — `CustomEvent<{ topK: number }>`, disparado al
 *   soltar el slider de vecinos (no en cada tick de arrastre).
 *
 * ### Ejemplo
 * ```html
 * <vx-concept-card pinned-anchor="center"></vx-concept-card>
 * <script>
 *   card.showPinned(concept, neighbors, 6);
 *   card.addEventListener("vx-topk-change", (e) => refetch(e.detail.topK));
 * </script>
 * ```
 */
export class VxConceptCard extends HTMLElement {
  #shadow!: ShadowRoot;
  #detailed = true;
  #pinnedAnchor: "bottom" | "center" = "bottom";
  #visibility: Visibility = "none";

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)
    // simple/pinned-anchor se leen aquí, no en el constructor: quien crea
    // este elemento con document.createElement() + setAttribute() recién
    // aplica los atributos DESPUÉS de que el constructor ya corrió — para
    // esa hora es tarde para leerlos ahí. connectedCallback (tras
    // appendChild) sí los ve.
    this.#detailed = !this.hasAttribute("simple");
    this.#pinnedAnchor = this.getAttribute("pinned-anchor") === "center" ? "center" : "bottom";
    this.#shadow = attachShadow(this, css);
  }

  showHover(concept: Concept, x: number, y: number): void {
    if (this.#visibility === "pinned") return;
    this.className = "hover";
    this.style.left = `${x + 18}px`;
    this.style.top = `${y + 18}px`;
    this.#shadow.innerHTML = cardBody(concept, false);
    if (this.#visibility === "none") fadeIn(this, { duration: 220, rise: 6 });
    this.#visibility = "hover";
  }

  hideHover(): void {
    if (this.#visibility !== "hover") return;
    this.#visibility = "none";
    this.style.pointerEvents = "none";
    fadeOut(this, { duration: 150 });
  }

  showPinned(concept: Concept, neighbors: NeighborView[], topK: number): void {
    const wasPinned = this.#visibility === "pinned";
    this.#visibility = "pinned";
    this.className = this.#pinnedAnchor === "center" ? "pinned centered" : "pinned";
    this.style.pointerEvents = "";
    this.style.left = "";
    this.style.top = "";
    this.#shadow.innerHTML =
      cardBody(concept, this.#detailed) +
      this.#neighborsBlock(neighbors, topK) +
      `<div class="hint">clic fuera o Esc para cerrar</div>`;
    if (!wasPinned) fadeIn(this, { duration: 320, rise: 14 });

    const slider = this.#shadow.querySelector<HTMLInputElement>('input[type="range"]');
    const valueLabel = this.#shadow.querySelector<HTMLSpanElement>(".topk-value");
    // 'input' sólo actualiza la etiqueta (sin re-renderizar, para no
    // interrumpir el arrastre); 'change' dispara el evento real al soltar.
    slider?.addEventListener("input", (e) => {
      if (valueLabel) valueLabel.textContent = (e.target as HTMLInputElement).value;
    });
    slider?.addEventListener("change", (e) => {
      const newTopK = Number((e.target as HTMLInputElement).value);
      this.dispatchEvent(
        new CustomEvent<TopKChangeDetail>("vx-topk-change", { detail: { topK: newTopK } }),
      );
    });
  }

  hidePinned(): void {
    if (this.#visibility !== "pinned") return;
    this.#visibility = "none";
    this.style.pointerEvents = "none";
    fadeOut(this, { duration: 250 });
  }

  isPinned(): boolean {
    return this.#visibility === "pinned";
  }

  #neighborsBlock(neighbors: NeighborView[], topK: number): string {
    if (!this.#detailed) {
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
        <input type="range" min="1" max="20" step="1" value="${topK}" />
        ${rows || '<div class="neighbor-empty">calculando…</div>'}
      </div>`;
  }
}

customElements.define("vx-concept-card", VxConceptCard);
