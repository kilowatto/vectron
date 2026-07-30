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
 * main.ts NO cambian. Renderer por defecto: `Liquid2DCellRenderer`
 * (aproximación Canvas 2D del look líquido del lab: gota + rim fresnel +
 * núcleo bioluminiscente + iridiscencia de burbuja — F1.4). Queda
 * `Canvas2DCellRenderer` (glow radial + wobble senoidal + mitosis
 * elipse→separación) como fallback simple, sin dependencias de
 * `app/src/particula/`.
 *
 * ### Métodos públicos (mismo contrato que el splash viejo + error)
 * - `setProgress(pct, phaseLabel)` — `pct` 0-100 monótono, label real de
 *   la etapa que está cargando AHORA (R-8).
 * - `finish()` — converge a 100%, crossfade-out, se quita del DOM.
 * - `showError(onRetry)` — pausa la animación y muestra el overlay de
 *   error bilingüe; `onRetry` se llama al pulsar Reintentar/Retry.
 */

/** Vista de una célula que el renderer dibuja — parte del contrato F1.4. */

/** Formateo de miles del contador (es-MX para ambos idiomas: el
 * separador de millar es el mismo y evita un segundo formatter). */
const NUM_FMT = new Intl.NumberFormat("es-MX");

export class VxCellularLoader extends HTMLElement {
  #pctEl!: HTMLDivElement;
  #countEl!: HTMLDivElement;
  #ofEl!: HTMLDivElement;
  #phaseEl!: HTMLDivElement;
  #barFillEl!: HTMLDivElement;
  #errorEl!: HTMLDivElement;

  #targetPct = 0;
  #displayPct = 0;
  #done = false;
  #failed = false;


  /** Total de palabras del modo — el denominador. Hasta que main() lo
   * sepa (hay que bajar el dataset primero) el loader ya está en
   * pantalla, así que arranca con un valor neutro y `setTotal` lo
   * corrige en cuanto se conoce. */
  #total = 1;
  #population = 1;

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="brand">VECTRON</div>
      <div class="tagline">${t("bootTagline", lang)}</div>
      <div class="bar"><div class="bar-fill"></div></div>
      <div class="count">1</div>
      <div class="of"></div>
      <div class="pct">0.000000%</div>
      <div class="phase"></div>
      <div class="error" hidden>
        <div class="error-title">${t("bootErrorTitle", lang)}</div>
        <div class="error-body">${t("bootErrorBody", lang)}</div>
        <button class="retry" type="button">${t("bootRetry", lang)}</button>
      </div>
    `;
    this.#pctEl = root.querySelector(".pct")!;
    this.#countEl = root.querySelector(".count")!;
    this.#ofEl = root.querySelector(".of")!;
    this.#phaseEl = root.querySelector(".phase")!;
    this.#barFillEl = root.querySelector(".bar-fill")!;
    this.#errorEl = root.querySelector(".error")!;
    this.#phaseEl.textContent = t("bootShell", lang);
    if (reducedMotion) this.classList.add("reduced-motion");
  }

  /** Fija el denominador: cuántas palabras tiene el modo al que vamos.
   * Se llama en cuanto el dataset aterriza. */
  setTotal(total: number): void {
    this.#total = Math.max(1, Math.floor(total));
    const lang = getStoredLang();
    this.#ofEl.textContent = t("bootOfWords", lang).replace(
      "{n}",
      NUM_FMT.format(this.#total),
    );
    this.#paint();
  }

  setProgress(pct: number, phaseLabel: string): void {
    this.#targetPct = Math.max(this.#targetPct, Math.min(pct, 100)); // monótona
    this.#phaseEl.textContent = phaseLabel;
    this.#displayPct = this.#targetPct;
    this.#barFillEl.style.width = `${this.#displayPct}%`;
  }

  /** Conteo de células VIVAS en el cubo 3D. Lo empuja main.ts desde el
   * mismo bucle que alimenta el crecimiento celular real, así que el
   * número y lo que se ve en pantalla salen de UNA fuente. Antes este
   * componente llevaba su propia población en un canvas 2D encima del
   * cubo: dos animaciones celulares a la vez, y lo que el usuario leía
   * como "al final cambia por las partículas viejas" era simplemente
   * esta capa desapareciendo y dejando ver la de verdad, que llevaba
   * ahí desde el principio. */
  setCount(current: number): void {
    this.#population = Math.max(0, Math.min(Math.round(current), this.#total));
    this.#paint();
  }

  /** Escribe el conteo (héroe) y su porcentaje (secundario). El número
   * grande es el CONTEO y no el porcentaje por una razón de legibilidad
   * medida: duplicando, el porcentaje pasa 9 de sus 14 escalones por
   * debajo del 5% — "0.019%" → "0.038%" no lo percibe nadie, mientras
   * que "2" → "4" es inequívoco. Es la misma fracción, contada por el
   * lado que sí se ve moverse. */
  #paint(): void {
    const shown = Math.min(this.#population, this.#total);
    this.#countEl.textContent = NUM_FMT.format(shown);
    this.#pctEl.textContent = `${((shown / this.#total) * 100).toFixed(4)}%`;
  }

  async finish(): Promise<void> {
    this.#targetPct = 100;
    if (!reducedMotion) {
      // Espera a que el contador ALCANCE el total en vez de un plazo
      // fijo. Con todo en caché la carga real puede acabar en ~1.5 s
      // mientras las duplicaciones necesitan ~2.4 s de reloj: sin esta
      // espera el cierre pegaba un salto de "256" a "10 383" y el
      // usuario se perdía justo las oleadas más vistosas. El tope de
      // 1.2 s es el seguro — el boot nunca se alarga más que eso por
      // esperar a la animación.
      const limite = performance.now() + 1200;
      while (this.#population < this.#total && performance.now() < limite) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    this.#done = true;
    // El contador cierra en el total exacto: las duplicaciones son
    // potencias de 2 y el total casi nunca lo es, así que el último
    // escalón siempre es parcial (8 192 → 10 383, no → 16 384).
    this.#population = this.#total;
    this.#paint();
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
    this.#errorEl.hidden = false;
    this.#errorEl.querySelector(".retry")!.addEventListener("click", onRetry, { once: true });
  }

}

customElements.define("vx-cellular-loader", VxCellularLoader);
