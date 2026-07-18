import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import { fadeOut } from "../motion";
import css from "./bootSplash.css?inline";

/**
 * `<vx-boot-splash>` — pantalla de arranque, SIN barra de progreso: un
 * porcentaje con muchos decimales (5-6) que da la sensación de carga
 * veloz (pedido explícito del usuario), arriba de la pantalla, para no
 * tapar el cubo que se puebla de partículas detrás en vivo (P5, ver
 * DOCs/03-gui-responsive-avanzado-loading.md §6). El número nunca
 * retrocede en el entero real, pero los últimos decimales sí "tiemblan"
 * a propósito entre actualizaciones reales — es cosmético, no telemetría.
 * Desaparece (fade out) justo al llegar a 100%.
 *
 * ### Métodos públicos
 * - `setProgress(pct, phaseLabel)` — `pct` 0-100, el entero sólo sube.
 * - `finish()` — converge a 100%, fade out, se quita del DOM. `Promise<void>`.
 */
export class VxBootSplash extends HTMLElement {
  #pctEl!: HTMLDivElement;
  #phaseEl!: HTMLDivElement;
  #targetPct = 0;
  #displayPct = 0;
  #raf = 0;
  #done = false;

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="brand">VECTRON</div>
      <div class="pct">0.000000%</div>
      <div class="phase"></div>
    `;
    this.#pctEl = root.querySelector(".pct")!;
    this.#phaseEl = root.querySelector(".phase")!;
    this.#phaseEl.textContent = t("bootShell", lang);
    this.#raf = requestAnimationFrame(this.#tick);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#raf);
  }

  #tick = () => {
    const diff = this.#targetPct - this.#displayPct;
    // Se acerca rápido al valor real; una vez cerca, sigue "temblando"
    // en los últimos decimales para verse ocupado aunque no haya llegado
    // todavía la siguiente actualización real (fetch/GPU tardando).
    this.#displayPct +=
      Math.abs(diff) < 0.05 ? -Math.random() * 0.02 : diff * 0.15;
    if (this.#displayPct < 0) this.#displayPct = 0;
    if (this.#displayPct > this.#targetPct) this.#displayPct = this.#targetPct;
    this.#pctEl.textContent = `${this.#displayPct.toFixed(6)}%`;
    if (!this.#done) this.#raf = requestAnimationFrame(this.#tick);
  };

  setProgress(pct: number, phaseLabel: string): void {
    this.#targetPct = Math.max(this.#targetPct, Math.min(pct, 100)); // monótona
    this.#phaseEl.textContent = phaseLabel;
  }

  async finish(): Promise<void> {
    this.#targetPct = 100;
    await new Promise((resolve) => setTimeout(resolve, 250)); // deja converger el número
    this.#done = true;
    cancelAnimationFrame(this.#raf);
    this.#pctEl.textContent = "100.000000%";
    await fadeOut(this, { duration: 280 });
    this.remove();
  }
}

customElements.define("vx-boot-splash", VxBootSplash);
