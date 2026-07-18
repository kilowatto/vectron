import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import css from "./mechanismExplainer.css?inline";

/**
 * `<vx-mechanism-explainer>` — sección fija del dock de Intermedio:
 * qué es un embedding, por qué quedan cerca las palabras, y qué no hace
 * todavía Vectron. Sin fórmulas ni grafo de tensores (eso es exclusivo
 * de `<vx-advanced-panel>`, en Avanzado).
 *
 * No tiene atributos ni eventos — es contenido estático (bilingüe según
 * el idioma guardado, ver src/i18n.ts).
 *
 * ### Ejemplo
 * ```html
 * <vx-mechanism-explainer></vx-mechanism-explainer>
 * ```
 */
export class VxMechanismExplainer extends HTMLElement {
  constructor() {
    super();
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <h3>${t("mechH2Embedding", lang)}</h3>
      <p>${t("mechPEmbedding", lang)}</p>
      <h3>${t("mechH2Close", lang)}</h3>
      <p>${t("mechPClose", lang)}</p>
      <h3>${t("mechH2NotYet", lang)}</h3>
      <p>${t("mechPNotYet", lang)}</p>
    `;
  }
}

customElements.define("vx-mechanism-explainer", VxMechanismExplainer);
