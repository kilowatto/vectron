import { MODE_IDS, describeMode, type Mode } from "./modeStorage";
import { getStoredLang } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./modeSwitcher.css?inline";

export interface ModeChangeDetail {
  mode: Mode;
}

/**
 * `<vx-mode-switcher current="avanzado">` — control persistente para
 * cambiar de modo sin volver a la portada: cambiar de modo es cambiar
 * de app, no "salir" de la app. Elegir una pestaña dispara `vx-mode-change`
 * y espera a que quien la escucha actualice el atributo `current` — no
 * recarga la página ni guarda nada por sí mismo, así el cambio de modo
 * puede animarse en vivo en lugar de recargar de golpe.
 *
 * ### Atributos
 * | nombre    | tipo   | default | descripción                          |
 * |-----------|--------|---------|----------------------------------------|
 * | `current` | string | —       | modo activo (`principiante`\|`intermedio`\|`avanzado`), resalta su pestaña |
 *
 * ### Eventos
 * - `vx-mode-change` — `CustomEvent<{ mode: Mode }>`, disparado al elegir
 *   una pestaña distinta a `current`.
 *
 * ### Ejemplo
 * ```html
 * <vx-mode-switcher current="avanzado"></vx-mode-switcher>
 * <script>
 *   switcher.addEventListener("vx-mode-change", (e) => switchTo(e.detail.mode));
 * </script>
 * ```
 */
export class VxModeSwitcher extends HTMLElement {
  static readonly observedAttributes = ["current"];

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #render() {
    const current = this.getAttribute("current") as Mode | null;
    const lang = getStoredLang();
    const root = this.shadowRoot ?? attachShadow(this, css);
    root.innerHTML = MODE_IDS.map((id) => describeMode(id, lang))
      .map(
        (m) => `<button type="button" data-mode="${m.id}" class="${m.id === current ? "active" : ""}">${m.title}</button>`,
      )
      .join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode as Mode;
        if (mode === current) return;
        this.dispatchEvent(
          new CustomEvent<ModeChangeDetail>("vx-mode-change", { detail: { mode }, bubbles: true }),
        );
      });
    });
  }
}

customElements.define("vx-mode-switcher", VxModeSwitcher);
