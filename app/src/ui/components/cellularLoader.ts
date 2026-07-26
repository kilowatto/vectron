import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import { fadeOut, reducedMotion } from "../motion";
import css from "./cellularLoader.css?inline";

/**
 * `<vx-cellular-loader>` — loader celular Fibonacci (DOCs/21 §4.3, paso
 * F1.3; decisiones de ley R-2/R-7/R-8). REEMPLAZA al boot splash (que
 * queda en disco sin usarse, para rollback): la animación ES el loader —
 * una célula que se divide por sucesión Fibonacci (1→2→3→5→8→13…→233,
 * cap visual) ligada al progreso REAL de carga, nunca a un timeline fijo
 * ni a `Math.random` (criterio de salida F1: el porcentaje de muchos
 * decimales se alimenta de progreso real interpolado — HONESTO).
 *
 * Adaptativo: 8 s es la referencia ideal, no techo ni piso. Si la red va
 * rápida, las divisiones pendientes se comprimen (más concurrentes, más
 * cortas); si va lenta, las células ya vivas siguen con deriva/pulso
 * orgánico sin mentir. Error de red/GPU: la animación se PAUSA y se
 * muestra overlay bilingüe visible con botón de reintento — jamás el
 * splash infinito temblando del hallazgo UX-C2 (DOCs/18).
 * prefers-reduced-motion: sin divisiones animadas ni temblor — barra
 * estática + el mismo porcentaje y labels (DOCs/21 §4.3 / §5.5).
 *
 * ### CONTRATO F1.4 — renderer de células REEMPLAZABLE
 * El look líquido definitivo (gota + bioluminiscencia + burbuja, DOCs/21
 * §4.1) lo entrega el lab `/particula` y se porta aquí implementando la
 * interfaz `CellularRenderer` de abajo (probablemente con el shader
 * instanciado de §4.2) y pasándola al constructor vía `setRenderer()` —
 * la máquina de estados Fibonacci, el layout y la integración con
 * main.ts NO cambian. Hoy: `Canvas2DCellRenderer` (glow radial + wobble
 * senoidal + mitosis elipse→separación), deliberadamente simple y sin
 * dependencias de `app/src/particula/`.
 *
 * ### Métodos públicos (mismo contrato que el splash viejo + error)
 * - `setProgress(pct, phaseLabel)` — `pct` 0-100 monótono, label real de
 *   la etapa que está cargando AHORA (R-8).
 * - `finish()` — converge a 100%, crossfade-out, se quita del DOM.
 * - `showError(onRetry)` — pausa la animación y muestra el overlay de
 *   error bilingüe; `onRetry` se llama al pulsar Reintentar/Retry.
 */

/** Vista de una célula que el renderer dibuja — parte del contrato F1.4. */
export interface RenderCell {
  x: number;
  y: number;
  r: number;
  /** Progreso de mitosis: 0 = estable, (0,1) = dividiéndose. */
  division: number;
  /** Dirección (rad) y separación actual (px) del par durante la mitosis. */
  divisionAngle: number;
  divisionSep: number;
  /** Fase determinista para wobble/deriva (del índice, no Math.random). */
  seed: number;
}

/** Contrato del renderer de células — ver "CONTRATO F1.4" arriba. */
export interface CellularRenderer {
  resize(width: number, height: number, dpr: number): void;
  render(cells: readonly RenderCell[], timeMs: number): void;
}

/** Renderer 2D provisional: glow radial + wobble senoidal + mitosis
 * elipse→pellizco→separación. La división/look definitivos vendrán del
 * lab (/particula) en F1.4 — ver el contrato de arriba. */
class Canvas2DCellRenderer implements CellularRenderer {
  #ctx: CanvasRenderingContext2D;
  #w = 0;
  #h = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.#ctx = canvas.getContext("2d")!;
  }

  resize(width: number, height: number, dpr: number): void {
    this.#w = width;
    this.#h = height;
    const canvas = this.#ctx.canvas;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(cells: readonly RenderCell[], timeMs: number): void {
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, this.#w, this.#h);
    ctx.globalCompositeOperation = "lighter";
    for (const cell of cells) {
      this.#drawCell(cell, timeMs);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  #drawCell(cell: RenderCell, timeMs: number): void {
    const ctx = this.#ctx;
    // Wobble senoidal + deriva orgánica (semilla determinista por índice
    // — el temblor aleatorio del splash viejo está PROHIBIDO aquí).
    const wobble = 1 + 0.07 * Math.sin(timeMs * 0.003 + cell.seed);
    const driftX = 3 * Math.sin(timeMs * 0.0006 + cell.seed * 1.7);
    const driftY = 3 * Math.cos(timeMs * 0.0005 + cell.seed * 2.3);
    const cx = cell.x + driftX;
    const cy = cell.y + driftY;
    const r = cell.r * wobble;

    if (cell.division > 0) {
      // Mitosis: estiramiento elipse → pellizco → separación del par.
      // t<0.5: elipse alargada hacia la hija; t>=0.5: dos cuerpos que se
      // separan unidos por un puente que se adelgaza (sin pop-in).
      const t = cell.division;
      const angle = cell.divisionAngle;
      const stretch = Math.sin(Math.min(t * 2, 1) * Math.PI * 0.5);
      const rx = r * (1 + 0.7 * stretch);
      const ry = r * (1 - 0.25 * stretch);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      this.#blob(0, 0, rx, ry, 0.85);
      ctx.restore();
      if (t >= 0.5) {
        const sepT = (t - 0.5) * 2;
        const sep = cell.divisionSep * sepT;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const childR = r * (0.55 + 0.45 * sepT);
        // Puente citoplasmático que se adelgaza hasta romperse.
        if (sepT < 0.85) {
          const bridgeW = r * 0.5 * (1 - sepT / 0.85);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          this.#blob(sep * 0.5, 0, sep * 0.5 + r * 0.4, bridgeW, 0.35);
          ctx.restore();
        }
        this.#glow(cx + dx * sep, cy + dy * sep, childR, 0.4 + 0.5 * sepT);
      }
      return;
    }
    this.#glow(cx, cy, r, 0.9);
  }

  /** Cuerpo de la célula: núcleo luminoso + halo (bioluminiscencia 2D). */
  #glow(x: number, y: number, r: number, alpha: number): void {
    const g = this.#ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, `rgba(231, 226, 214, ${0.85 * alpha})`);
    g.addColorStop(0.35, `rgba(217, 138, 52, ${0.5 * alpha})`);
    g.addColorStop(1, "rgba(217, 138, 52, 0)");
    this.#ctx.fillStyle = g;
    this.#ctx.beginPath();
    this.#ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    this.#ctx.fill();
  }

  #blob(x: number, y: number, rx: number, ry: number, alpha: number): void {
    const g = this.#ctx.createRadialGradient(x, y, 0, x, y, rx * 1.6);
    g.addColorStop(0, `rgba(231, 226, 214, ${0.7 * alpha})`);
    g.addColorStop(0.4, `rgba(217, 138, 52, ${0.45 * alpha})`);
    g.addColorStop(1, "rgba(217, 138, 52, 0)");
    this.#ctx.fillStyle = g;
    this.#ctx.beginPath();
    this.#ctx.ellipse(x, y, rx * 1.6, ry * 1.6, 0, 0, Math.PI * 2);
    this.#ctx.fill();
  }
}

/* --- Máquina de estados Fibonacci -------------------------------------
 * Poblaciones Fibonacci y su umbral de progreso real (0-100). Los
 * umbrales siguen los pesos reales del boot de main.ts (Shell 5 ·
 * Dataset 35 · GPU 25 · Tokenizers 20 · Warm 10 · Ready 5), así las
 * divisiones se reparten a lo largo de TODA la carga: el dataset libera
 * las primeras, la GPU las medias, tokenizers/warm las tardías. */
const FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
const FIB_STEP_PCT = [0, 8, 16, 26, 38, 50, 62, 74, 84, 92, 97, 100];
const GOLDEN_ANGLE = 2.399963229728653; // espiral filotáctica orgánica
const MAX_CONCURRENT_DIVISIONS = 12;

interface Cell {
  x: number;
  y: number;
  hx: number;
  hy: number;
  /** Radio actual (lerpea hacia `hr`) y radio hogar del layout. */
  r: number;
  hr: number;
  seed: number;
}

interface Division {
  parent: Cell;
  start: number;
  dur: number;
  angle: number;
  sep: number;
}

function targetPopulation(pct: number): number {
  let pop = FIBS[0];
  for (let i = 0; i < FIBS.length; i++) {
    if (pct >= FIB_STEP_PCT[i]) pop = FIBS[i];
  }
  return pop;
}

export class VxCellularLoader extends HTMLElement {
  #pctEl!: HTMLDivElement;
  #phaseEl!: HTMLDivElement;
  #barFillEl!: HTMLDivElement;
  #errorEl!: HTMLDivElement;
  #canvas!: HTMLCanvasElement;
  #renderer: CellularRenderer | null = null;

  #targetPct = 0;
  #displayPct = 0;
  #raf = 0;
  #done = false;
  #failed = false;

  #cells: Cell[] = [];
  #divisions: Division[] = [];
  #queuedDivisions = 0;
  #nextParentIdx = 0;
  #onResize = () => this.#resize();

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <canvas class="cells"></canvas>
      <div class="brand">VECTRON</div>
      <div class="tagline">${t("bootTagline", lang)}</div>
      <div class="bar"><div class="bar-fill"></div></div>
      <div class="pct">0.000000%</div>
      <div class="phase"></div>
      <div class="error" hidden>
        <div class="error-title">${t("bootErrorTitle", lang)}</div>
        <div class="error-body">${t("bootErrorBody", lang)}</div>
        <button class="retry" type="button">${t("bootRetry", lang)}</button>
      </div>
    `;
    this.#pctEl = root.querySelector(".pct")!;
    this.#phaseEl = root.querySelector(".phase")!;
    this.#barFillEl = root.querySelector(".bar-fill")!;
    this.#errorEl = root.querySelector(".error")!;
    this.#canvas = root.querySelector(".cells")!;
    this.#phaseEl.textContent = t("bootShell", lang);

    if (reducedMotion) {
      // Sin divisiones animadas ni temblor: barra estática + el mismo
      // porcentaje y labels (el canvas queda oculto por CSS).
      this.classList.add("reduced-motion");
      return;
    }

    this.#renderer = new Canvas2DCellRenderer(this.#canvas);
    this.#resize();
    window.addEventListener("resize", this.#onResize);
    // Arranca con UNA célula viva en el centro — toda la población nace
    // de divisiones visibles a partir de ella (R-2/R-4).
    const { width, height } = this.getBoundingClientRect();
    const first: Cell = {
      x: width / 2,
      y: height * 0.55,
      hx: width / 2,
      hy: height * 0.55,
      r: 26,
      hr: 26,
      seed: 0,
    };
    this.#cells.push(first);
    this.#layout();
    this.#raf = requestAnimationFrame(this.#tick);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#raf);
    window.removeEventListener("resize", this.#onResize);
  }

  /** Inyección del renderer definitivo del lab (F1.4) — ver el contrato
   * en la doc de la clase. Reemplaza al Canvas2D provisional. */
  setRenderer(renderer: CellularRenderer): void {
    this.#renderer = renderer;
    this.#resize();
  }

  setProgress(pct: number, phaseLabel: string): void {
    this.#targetPct = Math.max(this.#targetPct, Math.min(pct, 100)); // monótona
    this.#phaseEl.textContent = phaseLabel;
    if (reducedMotion) {
      this.#displayPct = this.#targetPct;
      this.#pctEl.textContent = `${this.#displayPct.toFixed(6)}%`;
      this.#barFillEl.style.width = `${this.#displayPct}%`;
    }
  }

  async finish(): Promise<void> {
    this.#targetPct = 100;
    if (!reducedMotion) {
      // Deja converger el número y completar las últimas divisiones.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    this.#done = true;
    cancelAnimationFrame(this.#raf);
    this.#pctEl.textContent = "100.000000%";
    this.#barFillEl.style.width = "100%";
    await fadeOut(this, { duration: 280 });
    this.remove();
  }

  /** Error de boot (red/GPU/dataset): pausa la animación y muestra el
   * overlay bilingüe visible con botón de reintento — nunca un tag de
   * 9 px ni un splash infinito (DOCs/18 UX-C2). */
  showError(onRetry: () => void): void {
    if (this.#failed || this.#done) return;
    this.#failed = true;
    cancelAnimationFrame(this.#raf);
    this.#errorEl.hidden = false;
    this.#errorEl.querySelector(".retry")!.addEventListener("click", onRetry, { once: true });
  }

  #resize(): void {
    if (!this.#renderer) return;
    const { width, height } = this.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.#renderer.resize(width, height, Math.min(devicePixelRatio || 1, 2));
    this.#layout();
  }

  /** Layout filotáctico (espiral de ángulo dorado): cada célula tiene un
   * "hogar" hacia el que lerpea; al crecer la población los hogares se
   * recomputan y el cluster se reorganiza orgánicamente, nunca pop-in. */
  #layout(): void {
    const { width, height } = this.getBoundingClientRect();
    const planned = this.#cells.length + this.#queuedDivisions + this.#divisions.length;
    const n = Math.max(planned, 1);
    const cx = width / 2;
    const cy = height * 0.55;
    const hr = Math.max(5, Math.min(26, 340 / (Math.sqrt(n) * 2.4)));
    const maxRad = Math.min(width, height) * 0.3;
    const spacing = Math.min(hr * 2.4, maxRad / Math.sqrt(n));
    this.#cells.forEach((cell, i) => {
      const angle = i * GOLDEN_ANGLE;
      const rad = spacing * Math.sqrt(i + 0.5);
      cell.hx = cx + Math.cos(angle) * rad;
      cell.hy = cy + Math.sin(angle) * rad;
      cell.hr = hr;
    });
  }

  /** Duración adaptativa de cada mitosis: con muchas divisiones en cola
   * (carga rápida) se comprimen — la secuencia Fibonacci se mantiene pero
   * corre más rápido; 8 s es referencia ideal, no techo (R-7). */
  #divisionDuration(): number {
    const backlog = this.#queuedDivisions + this.#divisions.length;
    if (backlog > 20) return 60;
    if (backlog > 8) return 120;
    if (backlog > 3) return 220;
    return 380;
  }

  #tick = () => {
    if (this.#done || this.#failed) return;
    const now = performance.now();

    // Porcentaje HONESTO: interpola hacia el progreso real reportado,
    // monótono, sin jitter aleatorio (los decimales "corren" porque el
    // objetivo real se mueve, no por Math.random).
    const diff = this.#targetPct - this.#displayPct;
    this.#displayPct += diff * 0.12;
    if (Math.abs(diff) < 0.0005) this.#displayPct = this.#targetPct;
    this.#pctEl.textContent = `${this.#displayPct.toFixed(6)}%`;

    // Liberar divisiones según el progreso real: cada hito Fibonacci
    // cruzado encola las mitosis necesarias para la siguiente población.
    const target = targetPopulation(this.#displayPct);
    const planned = this.#cells.length + this.#divisions.length + this.#queuedDivisions;
    if (planned < target) {
      this.#queuedDivisions += target - planned;
      this.#layout(); // los hogares ya consideran a las futuras hijas
    }

    // Arrancar mitosis hasta el tope de concurrencia (round-robin sobre
    // las células vivas — todas se dividen, no siempre la misma).
    while (this.#queuedDivisions > 0 && this.#divisions.length < MAX_CONCURRENT_DIVISIONS) {
      const parent = this.#cells[this.#nextParentIdx % this.#cells.length];
      this.#nextParentIdx++;
      this.#queuedDivisions--;
      const angle = (parent.seed + this.#nextParentIdx) * GOLDEN_ANGLE;
      this.#divisions.push({
        parent,
        start: now,
        dur: this.#divisionDuration(),
        angle,
        sep: parent.hr * 2.2,
      });
    }

    // Avanzar mitosis; al completarse, la hija nace en el cuerpo de la
    // madre y lerpea hacia su hogar (nacimiento visible, R-4).
    const frameCells: RenderCell[] = [];
    for (const cell of this.#cells) {
      cell.x += (cell.hx - cell.x) * 0.08;
      cell.y += (cell.hy - cell.y) * 0.08;
      cell.r += (cell.hr - cell.r) * 0.08; // el radio también crece/encoge suave
      frameCells.push({
        x: cell.x,
        y: cell.y,
        r: cell.r,
        division: 0,
        divisionAngle: 0,
        divisionSep: 0,
        seed: cell.seed,
      });
    }
    for (let i = this.#divisions.length - 1; i >= 0; i--) {
      const div = this.#divisions[i];
      const t = Math.min((now - div.start) / div.dur, 1);
      // Sustituir la entrada estable del padre por su versión en mitosis.
      const idx = this.#cells.indexOf(div.parent);
      if (idx >= 0) {
        frameCells[idx] = {
          x: div.parent.x,
          y: div.parent.y,
          r: div.parent.r,
          division: t,
          divisionAngle: div.angle,
          divisionSep: div.sep,
          seed: div.parent.seed,
        };
      }
      if (t >= 1) {
        this.#divisions.splice(i, 1);
        const child: Cell = {
          x: div.parent.x,
          y: div.parent.y,
          hx: div.parent.hx,
          hy: div.parent.hy,
          r: div.parent.r * 0.55,
          hr: div.parent.hr,
          seed: this.#cells.length * GOLDEN_ANGLE,
        };
        this.#cells.push(child);
        this.#layout();
      }
    }

    this.#renderer?.render(frameCells, now);
    this.#raf = requestAnimationFrame(this.#tick);
  };
}

customElements.define("vx-cellular-loader", VxCellularLoader);
