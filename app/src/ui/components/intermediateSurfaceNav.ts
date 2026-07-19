import { getStoredLang, t } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./intermediateSurfaceNav.css?inline";

export type IntermediateSurface = "cube" | "transformer" | "rag";

export interface IntermediateSurfaceChangeDetail {
  surface: IntermediateSurface;
}

/**
 * `<vx-intermediate-surface current="cube">` — nav local de Intermedio
 * entre sus tres superficies hermanas (DOCs/13-intermedio-3d-journey-
 * implementation.md §2-4): Cubo · Transformer · RAG. La Cámara de
 * Contexto NO es una cuarta superficie — vive dentro de Transformer.
 *
 * Con `dock`: fila inline al tope del panel lateral (escritorio ≥1024).
 * Sin `dock`: flotante fija sobre el cubo (mismo patrón que
 * <vx-surface-toggle>, para Intermedio angosto donde no hay dock).
 */
export class VxIntermediateSurface extends HTMLElement {
  static readonly observedAttributes = ["current"];

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #render() {
    const current = (this.getAttribute("current") as IntermediateSurface | null) ?? "cube";
    const lang = getStoredLang();
    const root = this.shadowRoot ?? attachShadow(this, css);
    const items: [IntermediateSurface, string][] = [
      ["cube", t("intermediateSurfaceCube", lang)],
      ["transformer", t("intermediateSurfaceTransformer", lang)],
      ["rag", t("intermediateSurfaceRag", lang)],
    ];
    root.innerHTML = items
      .map(
        ([id, label]) =>
          `<button type="button" data-surface="${id}" class="${id === current ? "active" : ""}">${label}</button>`,
      )
      .join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const surface = btn.dataset.surface as IntermediateSurface;
        if (surface === current) return;
        this.dispatchEvent(
          new CustomEvent<IntermediateSurfaceChangeDetail>("vx-intermediate-surface-change", {
            detail: { surface },
            bubbles: true,
          }),
        );
      });
    });
  }
}

customElements.define("vx-intermediate-surface", VxIntermediateSurface);
