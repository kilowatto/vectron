import { getStoredLang, t } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./mathArena.css?inline";

const TABS = ["Attention", "Softmax", "Cosine", "PCA", "Sampling"] as const;

/**
 * `<vx-math-arena>` — P6 sólo pide el hueco permanente en el shell de
 * Avanzado; el contenido real (heatmaps, KaTeX, sliders) es P7 (ver
 * DOCs/03-gui-responsive-avanzado-loading.md §4). Este placeholder
 * existe para que el layout dividido no se vea roto/vacío mientras
 * tanto, y para fijar ya el tag que P7 va a llenar en el mismo sitio.
 */
export class VxMathArena extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="tabs">
        ${TABS.map((tab, i) => `<span class="tab${i === 0 ? " active" : ""}">${tab}</span>`).join("")}
      </div>
      <div class="placeholder">
        <p class="headline">${t("mathArenaComingSoon", lang)}</p>
        <p class="note">${t("mathArenaNote", lang)}</p>
      </div>
    `;
  }
}

customElements.define("vx-math-arena", VxMathArena);
