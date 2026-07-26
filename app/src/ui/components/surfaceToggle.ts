import { getStoredLang, t } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./surfaceToggle.css?inline";

export type Surface = "cube" | "math";

export interface SurfaceChangeDetail {
  surface: Surface;
}

/**
 * `<vx-surface-toggle current="cube">` — nav de app, no un "ocultar
 * math" débil (ver DOCs/03 §3.3 "Mobile / narrow — dual surface, not a
 * weak toggle"): en Avanzado angosto, el cubo y el Math Lab son dos
 * superficies pares, cada una full-bleed por turnos — este control es
 * cómo se navega entre ellas, igual espíritu que <vx-level-switcher>.
 */
export class VxSurfaceToggle extends HTMLElement {
  static readonly observedAttributes = ["current"];

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #render() {
    const current = (this.getAttribute("current") as Surface | null) ?? "cube";
    const lang = getStoredLang();
    const root = this.shadowRoot ?? attachShadow(this, css);
    const items: [Surface, string][] = [
      ["cube", t("surfaceCube", lang)],
      ["math", t("surfaceMath", lang)],
    ];
    root.innerHTML = items
      .map(
        ([id, label]) =>
          `<button type="button" data-surface="${id}" class="${id === current ? "active" : ""}">${label}</button>`,
      )
      .join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const surface = btn.dataset.surface as Surface;
        if (surface === current) return;
        this.dispatchEvent(
          new CustomEvent<SurfaceChangeDetail>("vx-surface-change", {
            detail: { surface },
            bubbles: true,
          }),
        );
      });
    });
  }
}

customElements.define("vx-surface-toggle", VxSurfaceToggle);
