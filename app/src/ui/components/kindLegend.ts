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
 * ### Atributos
 * | nombre | tipo   | descripción |
 * |--------|--------|-------------|
 * | `mode` | string | cambia qué chips se muestran. |
 */
export class VxKindLegend extends HTMLElement {
  #mode: Mode = "intermedio";

  connectedCallback() {
    if (this.shadowRoot) return;
    this.#mode = (this.getAttribute("mode") as Mode) ?? "intermedio";
    attachShadow(this, css);
    this.#render();
  }

  setMode(mode: Mode): void {
    this.#mode = mode;
    this.#render();
  }

  #render() {
    const lang = getStoredLang();
    const root = this.shadowRoot!;
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
    root.innerHTML = `<div class="row">${chips.join("")}</div>`;
  }
}

customElements.define("vx-kind-legend", VxKindLegend);
