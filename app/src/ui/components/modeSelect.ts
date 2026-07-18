import { fadeIn, fadeOut, staggerIn } from "../motion";
import { MODES, type Mode } from "./modeStorage";
import { attachShadow } from "./shadow";
import css from "./modeSelect.css?inline";

export interface ModePickDetail {
  mode: Mode;
}

/**
 * `<vx-mode-select>` — pantalla de entrada: elegir modo es elegir qué
 * app abrir, no un ajuste. Se autodestruye (se quita del DOM) después
 * de disparar su evento, con un fade-out primero.
 *
 * Sin atributos — el contenido (las 3 tarjetas) es fijo.
 *
 * ### Eventos
 * - `vx-mode-pick` — `CustomEvent<{ mode: Mode }>`, disparado después del
 *   fade-out, justo antes de que el elemento se remueva del DOM.
 *
 * ### Ejemplo
 * ```html
 * <vx-mode-select></vx-mode-select>
 * <script>
 *   document.querySelector("vx-mode-select")
 *     .addEventListener("vx-mode-pick", (e) => boot(e.detail.mode));
 * </script>
 * ```
 */
export class VxModeSelect extends HTMLElement {
  connectedCallback() {
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="inner">
        <div class="brand">VECTRON</div>
        <p class="sub">¿Con qué profundidad quieres explorar cómo piensa un LLM?</p>
        <div class="cards">
          ${MODES.map(
            (m) => `
            <button type="button" class="card" data-mode="${m.id}">
              <span class="card-tag">${m.tag}</span>
              <span class="card-title">${m.title}</span>
              <span class="card-desc">${m.desc}</span>
            </button>`,
          ).join("")}
        </div>
      </div>
    `;

    const brand = root.querySelector<HTMLElement>(".brand")!;
    const sub = root.querySelector<HTMLElement>(".sub")!;
    const cardsWrap = root.querySelector<HTMLElement>(".cards")!;
    fadeIn(brand, { duration: 450, delay: 0 });
    fadeIn(sub, { duration: 450, delay: 90 });
    staggerIn(cardsWrap, { initialDelay: 220, step: 90, duration: 500 });

    root.querySelectorAll<HTMLButtonElement>(".card").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.dataset.mode as Mode;
        await fadeOut(this, { duration: 380 });
        this.dispatchEvent(
          new CustomEvent<ModePickDetail>("vx-mode-pick", { detail: { mode }, bubbles: true }),
        );
        this.remove();
      });
    });
  }
}

customElements.define("vx-mode-select", VxModeSelect);
