import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import type { Mode } from "./modeStorage";
import css from "./kindLegend.css?inline";

/**
 * `<vx-kind-legend>` — fila de 2-5 micro-etiquetas explicando qué
 * significan tamaño/líneas/colores vivos en el cubo (P4, ver
 * DOCs/05-hud-legends-zoom-colors.md §3). Texto simple en vez de
 * inventar formas de malla por POS que hoy no existen — la regla
 * explícita del diseño ("no mentir con formas hasta que el mesh las
 * tenga").
 *
 * Colapsado por defecto detrás de un "peek" (mismo patrón que
 * <vx-color-key>, ver colorKey.ts) — bug real reportado en vivo: texto
 * explicativo denso, siempre visible, "flotando sin entenderse y
 * estorbando" cuando no se está buscando explícitamente qué significa
 * algo. Tocar el peek despliega la fila completa por encima.
 *
 * ### Atributos
 * | nombre | tipo   | descripción |
 * |--------|--------|-------------|
 * | `mode` | string | cambia qué chips se muestran. |
 */
export class VxKindLegend extends HTMLElement {
  #mode: Mode = "intermedio";
  #expanded = false;
  #peekEl!: HTMLButtonElement;
  #sheetEl!: HTMLDivElement;

  connectedCallback() {
    if (this.shadowRoot) return;
    this.#mode = (this.getAttribute("mode") as Mode) ?? "intermedio";
    const root = attachShadow(this, css);
    root.innerHTML = `
      <button type="button" class="peek">
        <span class="mark">?</span>
        <span class="label"></span>
      </button>
      <div class="sheet" hidden>
        <div class="row"></div>
      </div>
    `;
    this.#peekEl = root.querySelector(".peek")!;
    this.#sheetEl = root.querySelector(".sheet")!;
    this.#peekEl.addEventListener("click", () => {
      this.#expanded = !this.#expanded;
      this.#render();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.#expanded) {
        this.#expanded = false;
        this.#render();
      }
    });
    this.#render();
  }

  setMode(mode: Mode): void {
    this.#mode = mode;
    this.#render();
  }

  #render() {
    const lang = getStoredLang();
    this.#sheetEl.hidden = !this.#expanded;
    this.#peekEl.setAttribute("aria-expanded", String(this.#expanded));
    this.#peekEl.querySelector(".label")!.textContent = t("kindLegendPeek", lang);

    const chips: string[] = [
      `<span class="chip"><span class="dot big"></span>${t("kindLegendNotable", lang)}</span>`,
    ];
    if (this.#mode !== "principiante") {
      chips.push(
        `<span class="chip"><span class="line orange"></span>${t("kindLegendNeighbors", lang)}</span>`,
      );
    }
    chips.push(
      `<span class="chip"><span class="line cyan"></span>${t("kindLegendPath", lang)}</span>`,
    );
    if (this.#mode === "avanzado") {
      chips.push(
        `<span class="chip"><span class="dot bge"></span><span class="dot gpt"></span><span class="dot phrase"></span>${t("kindLegendTokens", lang)}</span>`,
      );
    }
    this.#sheetEl.querySelector(".row")!.innerHTML = chips.join("");
  }
}

customElements.define("vx-kind-legend", VxKindLegend);
