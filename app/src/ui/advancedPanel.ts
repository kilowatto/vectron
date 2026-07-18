import katex from "katex";
import { drawTensorGraph } from "./motion";

/**
 * Dimensión real del modelo de embeddings que usa Vectron
 * (Workers AI, @cf/baai/bge-base-en-v1.5). No es la dimensión del
 * Transformer original — eso se aclara aparte, ver nota al pie.
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

function buildGraph(n: number): string {
  const nn = `${n}×${n}`;
  const nd = `${n}×${D_MODEL}`;
  return `
  <svg viewBox="0 0 320 620" class="tensor-graph">
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" class="arrowhead" />
      </marker>
    </defs>

    ${box(90, 8, 140, 40, `tokens · n = ${n}`)}
    ${arrow(160, 48, 160, 72)}

    ${box(60, 74, 200, 44, "X", `embedding · ℝ^${nd}`)}
    ${arrow(160, 118, 160, 142)}
    ${arrow(160, 130, 60, 150)}
    ${arrow(160, 130, 260, 150)}

    ${box(10, 152, 80, 40, "Q = X·Wq", `ℝ^${nd}`)}
    ${box(120, 152, 80, 40, "K = X·Wk", `ℝ^${nd}`)}
    ${box(230, 152, 80, 40, "V = X·Wv", `ℝ^${nd}`)}

    ${arrow(50, 192, 140, 226)}
    ${arrow(160, 192, 160, 226)}
    ${arrow(270, 192, 190, 290)}

    ${box(80, 228, 160, 44, "QKᵗ", `similitud · ℝ^${nn}`)}
    ${arrow(160, 272, 160, 296)}

    ${box(60, 298, 200, 44, "softmax(QKᵗ / √d_k)", `pesos de atención · ℝ^${nn}`)}
    ${arrow(160, 342, 160, 366)}

    ${box(80, 368, 160, 40, "× V", "suma ponderada")}
    ${arrow(160, 408, 160, 432)}

    ${box(60, 434, 200, 44, "Output", `ℝ^${nd}`)}
  </svg>`;
}

export interface AdvancedPanelBody {
  root: HTMLDivElement;
  update: (tokenCount: number) => void;
}

/**
 * Construye la sección de matemáticas/tensores del modo Avanzado (usa
 * KaTeX). No se oculta ni se colapsa: es una sección más del dock de
 * Avanzado, siempre visible, importada de forma diferida sólo porque
 * KaTeX es pesado — no como un panel que el usuario tenga que abrir.
 */
export function createAdvancedPanelBody(): AdvancedPanelBody {
  const root = document.createElement("div");
  root.id = "advanced-panel";
  root.innerHTML = `
    <div class="adv-scroll">
      <h3>2 · De la palabra al vector — el pipeline real de Vectron</h3>
      <p class="adv-note">
        Cada partícula del cubo llegó a su posición así: la palabra se mandó
        a Workers AI (<code>@cf/baai/bge-base-en-v1.5</code>), que devolvió un
        vector de 768 números (su embedding); ese vector de 768 dimensiones se
        redujo a 3 con un PCA propio (rotación que conserva las direcciones de
        mayor varianza); esas 3 coordenadas son la posición xyz que ves en el
        cubo. Es el mismo proceso para las 153 palabras del dataset — por eso
        conceptos relacionados (galaxia, tierra, universo) quedan cerca de
        verdad, no por diseño manual.
      </p>

      <h3>3 · Mecanismo de atención — con las matemáticas reales</h3>
      <p class="adv-note">
        Esto es distinto del paso anterior: es cómo un <i>Transformer</i>
        (el tipo de red detrás de un LLM generativo) calcula la atención,
        generalizado a los <b>n</b> tokens de arriba. Vectron no ejecuta
        todavía este forward pass en vivo sobre un modelo generativo — se
        muestra con las dimensiones reales de su propio pipeline (768) para
        enseñar el mecanismo, no como una simulación inventada.
      </p>

      <div class="adv-step">
        <div class="adv-formula" id="adv-f1"></div>
        <p><b>n</b> = número de tokens actuales (arriba). 768 es la dimensión
        real del modelo de embeddings de Vectron — no la del Transformer
        original (ver nota al pie).</p>
      </div>

      <div class="adv-step">
        <div class="adv-formula" id="adv-f2"></div>
        <p>W<sup>Q</sup>, W<sup>K</sup>, W<sup>V</sup> ∈ ℝ<sup>768×768</sup> son
        matrices de pesos aprendidas durante el entrenamiento — un parámetro
        por celda de cada matriz, ajustado por descenso de gradiente, no
        elegido a mano.</p>
      </div>

      <div class="adv-step">
        <div class="adv-formula" id="adv-f3"></div>
        <p>QK<sup>t</sup> mide la similitud entre cada par de tokens; softmax
        normaliza cada fila a una distribución de probabilidad; el resultado
        pondera V según esa atención — así cada token "mira" a los demás
        antes de seguir a la próxima capa.</p>
      </div>

      <div id="adv-graph"></div>

      <p class="adv-footnote">
        <b>Nota sobre d<sub>k</sub>:</b> en atención multi-cabeza,
        d<sub>k</sub> = d<sub>model</sub> / h. El paper original usa
        d<sub>model</sub> = 512 con h = 8 cabezas, por lo que d<sub>k</sub> = 64
        — cifras del paper, distintas de los 768 del modelo de embeddings que
        usa Vectron.
      </p>

      <p class="adv-cite">
        Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez,
        A. N., Kaiser, Ł., &amp; Polosukhin, I. (2017).
        <i>Attention Is All You Need.</i> NeurIPS 2017. —
        <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">arXiv:1706.03762</a>
      </p>

      <p class="adv-todo">Próximamente: muestreo del siguiente token (temperatura, top-k, top-p) como cadena de Markov.</p>
    </div>
  `;

  root.querySelector("#adv-f1")!.innerHTML = tex("X \\in \\mathbb{R}^{n \\times 768}");
  root.querySelector("#adv-f2")!.innerHTML = tex(
    "Q = XW^Q,\\quad K = XW^K,\\quad V = XW^V",
  );
  root.querySelector("#adv-f3")!.innerHTML = tex(
    "\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
  );

  const graphEl = root.querySelector<HTMLDivElement>("#adv-graph")!;
  let currentN = 1;

  function update(tokenCount: number) {
    currentN = Math.max(tokenCount, 1);
    graphEl.innerHTML = buildGraph(currentN);
    const svg = graphEl.querySelector<SVGSVGElement>("svg.tensor-graph");
    if (svg) drawTensorGraph(svg);
  }
  update(1);

  return { root, update };
}
