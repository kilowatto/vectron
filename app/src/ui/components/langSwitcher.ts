import { getStoredLang, type Lang } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./langSwitcher.css?inline";

const LANGS: Lang[] = ["es", "en"];

export interface LangChangeDetail {
  lang: Lang;
}

/**
 * `<vx-lang-switcher current="es">` — toggle ES/EN. Igual que
 * `<vx-mode-switcher>`: elegir un idioma dispara `vx-lang-change` y
 * espera a que quien la escucha actualice el atributo `current` — no
 * recarga la página ni guarda nada por sí mismo, así el cambio de
 * idioma puede re-renderizar el texto en vivo en vez de recargar de
 * golpe (lo que antes hacía desaparecer las partículas igual que el
 * bug ya corregido del mode-switcher).
 *
 * ### Atributos
 * | nombre    | tipo   | default              | descripción                    |
 * |-----------|--------|----------------------|----------------------------------|
 * | `current` | string | `getStoredLang()`    | idioma activo (`es`\|`en`), resalta su botón |
 * | `variant` | string | `""`                 | `"stage"` — se posiciona relativo al `#stage` (esquina superior derecha del área de partículas) en vez de fijo a todo el viewport, para no superponerse con el dock. Sólo estilo. |
 *
 * ### Eventos
 * - `vx-lang-change` — `CustomEvent<{ lang: Lang }>`, disparado al elegir
 *   un idioma distinto a `current`.
 *
 * ### Ejemplo
 * ```html
 * <vx-lang-switcher current="es" variant="stage"></vx-lang-switcher>
 * <script>
 *   switcher.addEventListener("vx-lang-change", (e) => setLang(e.detail.lang));
 * </script>
 * ```
 */
export class VxLangSwitcher extends HTMLElement {
  static readonly observedAttributes = ["current"];

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #render() {
    const current = (this.getAttribute("current") as Lang | null) ?? getStoredLang();
    const root = this.shadowRoot ?? attachShadow(this, css);
    root.innerHTML = LANGS.map(
      (lang) =>
        `<button type="button" data-lang="${lang}" class="${lang === current ? "active" : ""}">${lang}</button>`,
    ).join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.dataset.lang as Lang;
        if (lang === current) return;
        this.dispatchEvent(
          // composed:true — este componente se usa tanto suelto (en la
          // app principal) como anidado dentro del shadow DOM de
          // vx-mode-select; sin composed el evento no cruzaría ese
          // límite y un listener en window no vería el segundo caso.
          new CustomEvent<LangChangeDetail>("vx-lang-change", {
            detail: { lang },
            bubbles: true,
            composed: true,
          }),
        );
      });
    });
  }
}

customElements.define("vx-lang-switcher", VxLangSwitcher);
