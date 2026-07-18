import katex from "katex";
import katexCss from "katex/dist/katex.min.css?inline";
import { drawTensorGraph } from "../motion";
import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import css from "./advancedPanel.css?inline";

// El CSS de KaTeX es indispensable, no cosmético: sin él, el árbol MathML
// de accesibilidad que katex.min.css oculta (display:none) queda visible
// como texto sin estilo junto al HTML renderizado — un Shadow DOM no
// hereda hojas de estilo globales (sólo custom properties), así que hay
// que inyectarla explícitamente dentro de cada shadow root que use katex.
const styles = `${katexCss}\n${css}`;

/**
 * Dimensión real del modelo de embeddings que usa Vectron (Workers AI,
 * @cf/baai/bge-base-en-v1.5). No es la dimensión del Transformer
 * original — eso se aclara aparte, ver la nota al pie del componente.
 */
const D_MODEL = 768;

function tex(formula: string): string {
  return katex.renderToString(formula, { throwOnError: false, displayMode: true });
}

function box(x: number, y: number, w: number, h: number, label: string, sub = ""): string {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="node" />
    <text x="${x + w / 2}" y="${y + h / 2 - (sub ? 6 : 0)}" text-anchor="middle" class="node-label">${label}</text>
    ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 12}" text-anchor="middle" class="node-sub">${sub}</text>` : ""}
  `;
}

function arrow(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge" marker-end="url(#arrowhead)" />`;
}

function buildGraph(n: number, lang: Lang): string {
  const nn = `${n}×${n}`;
  const nd = `${n}×${D_MODEL}`;
  return `
  <svg viewBox="0 0 320 620" class="tensor-graph">
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" class="arrowhead" />
      </marker>
    </defs>

    ${box(90, 8, 140, 40, `${t("advGraphTokens", lang)} · n = ${n}`)}
    ${arrow(160, 48, 160, 72)}

    ${box(60, 74, 200, 44, "X", `${t("advGraphEmbedding", lang)} · ℝ^${nd}`)}
    ${arrow(160, 118, 160, 142)}
    ${arrow(160, 130, 60, 150)}
    ${arrow(160, 130, 260, 150)}

    ${box(10, 152, 80, 40, "Q = X·Wq", `ℝ^${nd}`)}
    ${box(120, 152, 80, 40, "K = X·Wk", `ℝ^${nd}`)}
    ${box(230, 152, 80, 40, "V = X·Wv", `ℝ^${nd}`)}

    ${arrow(50, 192, 140, 226)}
    ${arrow(160, 192, 160, 226)}
    ${arrow(270, 192, 190, 290)}

    ${box(80, 228, 160, 44, "QKᵗ", `${t("advGraphSimilarity", lang)} · ℝ^${nn}`)}
    ${arrow(160, 272, 160, 296)}

    ${box(60, 298, 200, 44, "softmax(QKᵗ / √d_k)", `${t("advGraphWeights", lang)} · ℝ^${nn}`)}
    ${arrow(160, 342, 160, 366)}

    ${box(80, 368, 160, 40, "× V", t("advGraphWeighted", lang))}
    ${arrow(160, 408, 160, 432)}

    ${box(60, 434, 200, 44, t("advGraphOutput", lang), `ℝ^${nd}`)}
  </svg>`;
}

/**
 * `<vx-advanced-panel>` — sección fija del dock de Avanzado: el pipeline
 * real de embeddings→PCA, el mecanismo de atención con fórmulas KaTeX y
 * el grafo de tensores que se "dibuja" al cambiar `token-count`. Nunca
 * se oculta detrás de un botón (ver feedback-vectron-modes) — es
 * contenido permanente del dock, no un panel colapsable.
 *
 * Este módulo importa KaTeX de forma pesada a propósito — quien lo use
 * debe cargarlo con `import()` dinámico y sólo para el modo Avanzado
 * (ver ui/modeComposition.ts), así el bundle principal no crece por los
 * otros dos modos.
 *
 * ### Atributos / propiedades
 * | nombre        | tipo   | default | descripción                                                    |
 * |---------------|--------|---------|------------------------------------------------------------------|
 * | `token-count` | number | `1`     | número de tokens actuales — redibuja el grafo (con animación) al cambiar. Reactivo en cualquier momento. |
 *
 * También expuesto como propiedad `tokenCount` (get/set), equivalente al
 * atributo. El idioma se lee de `localStorage` una vez al montarse (ver
 * src/i18n.ts) — no es reactivo dentro de una misma sesión de página.
 *
 * ### Ejemplo
 * ```html
 * <vx-advanced-panel token-count="1"></vx-advanced-panel>
 * <script>
 *   panel.tokenCount = tokens.length; // o panel.setAttribute("token-count", tokens.length)
 * </script>
 * ```
 */
export class VxAdvancedPanel extends HTMLElement {
  static readonly observedAttributes = ["token-count"];

  #graphEl!: HTMLDivElement;
  #lang: Lang = "es";

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)
    this.#lang = getStoredLang();
    const lang = this.#lang;
    const root = attachShadow(this, styles);
    root.innerHTML = `
      <div class="scroll">
        <h3>${t("advH2Pipeline", lang)}</h3>
        <p class="note">${t("advPPipeline", lang)}</p>

        <h3>${t("advH2Attention", lang)}</h3>
        <p class="note">${t("advPAttention", lang)}</p>

        <div class="step">
          <div class="formula" id="f1"></div>
          <p>${t("advStep1", lang)}</p>
        </div>

        <div class="step">
          <div class="formula" id="f2"></div>
          <p>${t("advStep2", lang)}</p>
        </div>

        <div class="step">
          <div class="formula" id="f3"></div>
          <p>${t("advStep3", lang)}</p>
        </div>

        <div class="graph"></div>

        <p class="footnote">${t("advFootnote", lang)}</p>

        <p class="cite">${t("advCite", lang)}</p>

        <p class="todo">${t("advTodo", lang)}</p>
      </div>
    `;

    root.querySelector("#f1")!.innerHTML = tex("X \\in \\mathbb{R}^{n \\times 768}");
    root.querySelector("#f2")!.innerHTML = tex("Q = XW^Q,\\quad K = XW^K,\\quad V = XW^V");
    root.querySelector("#f3")!.innerHTML = tex(
      "\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
    );

    this.#graphEl = root.querySelector(".graph")!;
    this.#renderGraph(this.tokenCount);
  }

  attributeChangedCallback(name: string) {
    if (name === "token-count" && this.#graphEl) this.#renderGraph(this.tokenCount);
  }

  get tokenCount(): number {
    return Math.max(Number(this.getAttribute("token-count")) || 1, 1);
  }
  set tokenCount(value: number) {
    this.setAttribute("token-count", String(Math.max(value, 1)));
  }

  #renderGraph(n: number) {
    this.#graphEl.innerHTML = buildGraph(n, this.#lang);
    const svg = this.#graphEl.querySelector<SVGSVGElement>("svg.tensor-graph");
    if (svg) drawTensorGraph(svg);
  }
}

customElements.define("vx-advanced-panel", VxAdvancedPanel);
