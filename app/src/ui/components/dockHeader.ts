import { attachShadow } from "./shadow";
import css from "./dockHeader.css?inline";

/**
 * `<vx-dock-header>` — encabezado fijo del dock (Intermedio/Avanzado).
 *
 * ### Atributos
 * | nombre | tipo   | default | descripción                                   |
 * |--------|--------|---------|------------------------------------------------|
 * | `tag`  | string | `""`    | línea bajo "VECTRON", p.ej. "avanzado · matemática real, sin atajos" |
 *
 * ### Ejemplo
 * ```html
 * <vx-dock-header tag="intermedio · el mecanismo real, sin la matemática"></vx-dock-header>
 * ```
 */
export class VxDockHeader extends HTMLElement {
  static readonly observedAttributes = ["tag"];

  #tagEl: HTMLSpanElement;

  constructor() {
    super();
    const root = attachShadow(this, css);
    root.innerHTML = `<span class="brand">VECTRON</span><span class="tag"></span>`;
    this.#tagEl = root.querySelector(".tag")!;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === "tag") this.#tagEl.textContent = value ?? "";
  }

  /** Equivalente a leer/escribir el atributo `tag`. */
  get tag(): string {
    return this.getAttribute("tag") ?? "";
  }
  set tag(value: string) {
    this.setAttribute("tag", value);
  }
}

customElements.define("vx-dock-header", VxDockHeader);
