import type { Concept } from "../../data/concepts";
import { DOMAIN_HUES } from "../../scene/particleField";
import { fadeIn, fadeOut } from "../motion";
import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang, type StringKey } from "../../i18n";
import css from "./conceptCard.css?inline";

const DOMAIN_LABEL_KEYS: Record<string, StringKey> = {
  matematicas: "domainMatematicas",
  fisica: "domainFisica",
  programacion: "domainProgramacion",
  biologia_animal: "domainBiologiaAnimal",
  biologia_vegetal: "domainBiologiaVegetal",
  materiales: "domainMateriales",
  geografia: "domainGeografia",
  astronomia: "domainAstronomia",
  sociedad: "domainSociedad",
  historia: "domainHistoria",
  mitologia: "domainMitologia",
  quimica: "domainQuimica",
  tecnologia: "domainTecnologia",
  cualidades_y_acciones: "domainCualidadesYAcciones",
  deportes: "domainDeportes",
  gastronomia: "domainGastronomia",
  musica: "domainMusica",
  arte_y_cultura: "domainArteYCultura",
  medicina_y_salud: "domainMedicinaYSalud",
  economia_y_negocios: "domainEconomiaYNegocios",
  personajes: "domainPersonajes",
  emociones: "domainEmociones",
  hogar: "domainHogar",
  transporte: "domainTransporte",
  ropa: "domainRopa",
  clima: "domainClima",
  herramientas: "domainHerramientas",
  videojuegos: "domainVideojuegos",
  festividades: "domainFestividades",
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

/** Palabra principal según el idioma de la interfaz, la otra como subtítulo. */
function wordPair(concept: Concept, lang: Lang): { primary: string; secondary: string } {
  return lang === "en"
    ? { primary: concept.word.en, secondary: concept.word.es }
    : { primary: concept.word.es, secondary: concept.word.en };
}

function traitsToRows(concept: Concept): string {
  return Object.entries(concept.traits)
    .map(([key, value]) => `<div class="row"><span>${key}</span><span>${String(value)}</span></div>`)
    .join("");
}

function cardBody(concept: Concept, detailed: boolean, lang: Lang): string {
  const hue = hueToCss(DOMAIN_HUES[concept.domain] ?? 0x9aa5ad);
  const domainKey = DOMAIN_LABEL_KEYS[concept.domain];
  const domainLabel = domainKey ? t(domainKey, lang) : concept.domain;
  const { primary, secondary } = wordPair(concept, lang);
  return `
    <div class="head">
      <div class="swatch" style="background:${hue}"></div>
      <div class="body">
        <div class="words">
          <span class="primary">${primary}</span>
          <span class="secondary">${secondary}</span>
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
 * La tarjeta fijada siempre se centra en medio del cubo — la barra de
 * tokenización ocupa la parte baja de la pantalla en los 3 modos, así
 * que no hay un "abajo" libre donde anclarla.
 *
 * ### Atributos
 * | nombre           | tipo    | default    | descripción                                                    |
 * |------------------|---------|------------|------------------------------------------------------------------|
 * | `simple`         | boolean | ausente    | si está presente, oculta taxonomía/atributos/coordenadas y los scores de coseno (Principiante). Config inicial — fijar antes de insertar. |
 *
 * ### Métodos públicos
 * (reciben datos complejos — por eso son métodos, no atributos)
 * - `showHover(concept, x, y)` — tooltip no interactivo cerca del cursor.
 * - `hideHover()`
 * - `showPinned(concept, neighbors, topK)` — tarjeta fija e interactiva.
 * - `hidePinned()`
 * - `isPinned(): boolean`
 * - `configure({simple?, lang?})` — cambia la config en vivo (a
 *   diferencia de los atributos de arriba, que sólo se leen al
 *   insertar). Pensado para cambio de modo/idioma sin recrear el
 *   elemento: oculta cualquier estado visible al instante, sin
 *   animación — es un detalle menor frente a la transición más grande
 *   que lo rodea.
 *
 * ### Eventos
 * - `vx-topk-change` — `CustomEvent<{ topK: number }>`, disparado al
 *   soltar el slider de vecinos (no en cada tick de arrastre).
 *
 * ### Ejemplo
 * ```html
 * <vx-concept-card simple></vx-concept-card>
 * <script>
 *   card.showPinned(concept, neighbors, 6);
 *   card.addEventListener("vx-topk-change", (e) => refetch(e.detail.topK));
 * </script>
 * ```
 */
export class VxConceptCard extends HTMLElement {
  #shadow!: ShadowRoot;
  #detailed = true;
  #visibility: Visibility = "none";
  #lang: Lang = "es";

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)
    // simple se lee aquí, no en el constructor: quien crea este elemento
    // con document.createElement() + setAttribute() recién aplica el
    // atributo DESPUÉS de que el constructor ya corrió — para esa hora
    // es tarde para leerlo ahí. connectedCallback (tras appendChild) sí
    // lo ve.
    this.#detailed = !this.hasAttribute("simple");
    this.#lang = getStoredLang();
    this.#shadow = attachShadow(this, css);
  }

  showHover(concept: Concept, x: number, y: number): void {
    if (this.#visibility === "pinned") return;
    this.className = "hover";
    this.style.left = `${x + 18}px`;
    this.style.top = `${y + 18}px`;
    this.#shadow.innerHTML = cardBody(concept, false, this.#lang);
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
    this.className = "pinned";
    this.style.pointerEvents = "";
    this.style.left = "";
    this.style.top = "";
    this.#shadow.innerHTML =
      cardBody(concept, this.#detailed, this.#lang) +
      this.#neighborsBlock(neighbors, topK) +
      `<div class="hint">${t("cardHint", this.#lang)}</div>`;
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

  configure({ simple, lang }: { simple?: boolean; lang?: Lang }): void {
    if (simple !== undefined) this.#detailed = !simple;
    if (lang !== undefined) this.#lang = lang;
    if (this.#visibility !== "none") {
      this.getAnimations().forEach((a) => a.cancel());
      this.className = "";
      this.style.opacity = "0";
      this.style.pointerEvents = "none";
      this.#visibility = "none";
    }
  }

  #neighborsBlock(neighbors: NeighborView[], topK: number): string {
    const lang = this.#lang;
    if (!this.#detailed) {
      const words = neighbors.map((n) => wordPair(n.concept, lang).primary).join(", ");
      return `
        <div class="neighbors simple">
          <div class="neighbors-head"><span>${t("cardNeighborsHeadSimple", lang)}</span></div>
          <p class="neighbor-plain">${words || t("cardNeighborsSearching", lang)}</p>
        </div>`;
    }
    const rows = neighbors
      .map((n) => {
        const pct = Math.round(Math.max(n.score, 0) * 100);
        return `<div class="neighbor">
          <span class="nword">${wordPair(n.concept, lang).primary}</span>
          <div class="nbar"><div class="nbar-fill" style="width:${pct}%"></div></div>
          <span class="nscore">${n.score.toFixed(3)}</span>
        </div>`;
      })
      .join("");
    return `
      <div class="neighbors">
        <div class="neighbors-head">
          <span>${t("cardNeighborsHeadDetailed", lang)}</span>
          <span class="topk-value">${topK}</span>
        </div>
        <input type="range" min="1" max="20" step="1" value="${topK}" />
        ${rows || `<div class="neighbor-empty">${t("cardNeighborsCalculating", lang)}</div>`}
      </div>`;
  }
}

customElements.define("vx-concept-card", VxConceptCard);
