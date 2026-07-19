import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import css from "./blockDiagram.css?inline";

/**
 * `<vx-block-diagram>` — capítulo "Bloques" de Transformer (DOCs/13
 * §11.3): 2.5D, sin materiales/pesos reales — un esquema (Embed →
 * Atención → Residual+norma → MLP → se repite ×N → Salida). Las
 * "siluetas de repetición" (copias fantasma detrás de la pila
 * principal) son la forma barata de decir "esto se repite muchas
 * veces" sin dibujar N bloques reales — mismo espíritu que el resto
 * del proyecto: declarar la aproximación, no fingir que es Avanzado.
 */
export class VxBlockDiagram extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="head">
        <span class="label">${t("blockDiagramLabel", lang)}</span>
        <span class="declared">${t("blockDiagramDeclared", lang)}</span>
      </div>
      <div class="flow">
        <div class="node embed">${t("blockDiagramEmbed", lang)}</div>
        <div class="arrow"></div>
        <div class="stack">
          <div class="ghost ghost-2"></div>
          <div class="ghost ghost-1"></div>
          <div class="block">
            <div class="plate attention">${t("blockDiagramAttention", lang)}</div>
            <div class="plate residual">${t("blockDiagramResidual", lang)}</div>
            <div class="plate mlp">${t("blockDiagramMlp", lang)}</div>
          </div>
          <div class="repeat-label">${t("blockDiagramRepeat", lang)}</div>
        </div>
        <div class="arrow"></div>
        <div class="node output">${t("blockDiagramOutput", lang)}</div>
      </div>
    `;
  }
}

customElements.define("vx-block-diagram", VxBlockDiagram);
