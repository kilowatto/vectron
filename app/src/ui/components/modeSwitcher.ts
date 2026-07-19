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
    const modes = MODE_IDS.map((id) => describeMode(id, lang));
    const activeTitle = modes.find((m) => m.id === current)?.title ?? "";
    // Cajón sólo en móvil (ver modeSwitcher.css): en escritorio
    // .drawer-toggle nunca se muestra, así que esto no cambia nada ahí
    // — colapsado por defecto, la flechita lo abre/cierra.
    root.innerHTML = `
      <button type="button" class="drawer-toggle">
        <span class="current-label">${activeTitle}</span>
        <span class="chevron">▾</span>
      </button>
      <div class="options">
        ${modes
          .map(
            (m) =>
              `<button type="button" data-mode="${m.id}" class="${m.id === current ? "active" : ""}">${m.title}</button>`,
          )
          .join("")}
      </div>
    `;

    root.querySelector(".drawer-toggle")?.addEventListener("click", () => {
      this.toggleAttribute("expanded");
    });

    root.querySelectorAll<HTMLButtonElement>(".options button").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.removeAttribute("expanded"); // el cajón se cierra al elegir
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
