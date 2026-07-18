import { MODES, setStoredMode, type Mode } from "./modeStorage";
import { attachShadow } from "./shadow";
import css from "./modeSwitcher.css?inline";

/**
 * `<vx-mode-switcher current="avanzado">` — control persistente para
 * cambiar de modo sin volver a la portada: cambiar de modo es cambiar
 * de app, no "salir" de la app. Guarda el nuevo modo y recarga directo
 * a él — la pantalla de selección (`<vx-mode-select>`) nunca vuelve a
 * aparecer una vez que hay un modo guardado.
 *
 * ### Atributos
 * | nombre    | tipo   | default | descripción                          |
 * |-----------|--------|---------|----------------------------------------|
 * | `current` | string | —       | modo activo (`principiante`\|`intermedio`\|`avanzado`), resalta su pestaña |
 *
 * No dispara eventos — la navegación (guardar + recargar) es interna.
 *
 * ### Ejemplo
 * ```html
 * <vx-mode-switcher current="avanzado"></vx-mode-switcher>
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
    const root = this.shadowRoot ?? attachShadow(this, css);
    root.innerHTML = MODES.map(
      (m) => `<button type="button" data-mode="${m.id}" class="${m.id === current ? "active" : ""}">${m.title}</button>`,
    ).join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode as Mode;
        if (mode === current) return;
        setStoredMode(mode);
        location.reload();
      });
    });
  }
}

customElements.define("vx-mode-switcher", VxModeSwitcher);
