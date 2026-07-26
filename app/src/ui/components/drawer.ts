import { getStoredLang, t } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./drawer.css?inline";

export interface DrawerChangeDetail {
  open: boolean;
}

/**
 * `<vx-drawer label="…" side="left|right">` — cajón reutilizable del
 * rediseño GUI (DOCs/21 §5.4, R-12): todo módulo secundario vive detrás
 * de un disparador visible y su panel sólo se abre a demanda — ningún
 * módulo secundario visible sin acción del usuario.
 *
 * Contenido: lo que se ponga como hijo (slot) vive dentro del panel.
 *
 * ### Atributos
 * | nombre    | tipo    | default | descripción |
 * |-----------|---------|---------|-------------|
 * | `label`   | string  | —       | texto del disparador (ya traducido por quien monta). |
 * | `side`    | string  | `right` | borde desde el que se desliza el panel (`left`\|`right`). |
 * | `trigger` | string  | `edge`  | `top` = disparador arriba a la derecha (bajo los switchers) en vez de centrado en el borde. |
 * | `fit`     | boolean | ausente | panel con ancho ajustado al contenido en vez de `min(420px, 92vw)`. |
 * | `dock`    | boolean | ausente | flujo normal (dentro del dock) en vez de flotante. |
 * | `open`    | boolean | ausente | estado; también `open()`/`close()`/`toggle()`. |
 *
 * ### Comportamiento
 * - `aria-expanded` en el disparador, `role="dialog"` en el panel, foco
 *   entra al panel al abrir y regresa al disparador al cerrar; Esc cierra.
 * - `history.pushState` al abrir: el botón Atrás del navegador cierra el
 *   cajón en vez de salir de la app (18 P0.5). Cerrar por UI consume la
 *   entrada con `history.back()`, así no quedan entradas fantasma.
 * - Animación de deslizamiento desactivada con `prefers-reduced-motion`
 *   (ver drawer.css).
 *
 * ### Eventos
 * - `vx-drawer-change` — `CustomEvent<DrawerChangeDetail>`, burbujea.
 */
export class VxDrawer extends HTMLElement {
  static readonly observedAttributes = ["open", "label"];

  #trigger!: HTMLButtonElement;
  #labelEl!: HTMLSpanElement;
  #panel!: HTMLDivElement;
  /** true cuando este cajón empujó una entrada al historial que aún no
   * se ha consumido (ver comentario de clase sobre Atrás). */
  #pushed = false;
  #onPopState = () => {
    if (!this.#pushed) return;
    this.#pushed = false;
    this.removeAttribute("open");
  };

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = attachShadow(this, css);
      root.innerHTML = `
        <button type="button" class="trigger" aria-expanded="false" aria-controls="drawer-panel">
          <span class="label"></span>
          <span class="chevron" aria-hidden="true">▾</span>
        </button>
        <div class="panel" id="drawer-panel" role="dialog" tabindex="-1" hidden>
          <button type="button" class="close" aria-label=""></button>
          <div class="content"><slot></slot></div>
        </div>
      `;
      this.#trigger = root.querySelector(".trigger")!;
      this.#labelEl = root.querySelector(".label")!;
      this.#panel = root.querySelector(".panel")!;
      const closeBtn = root.querySelector<HTMLButtonElement>(".close")!;
      closeBtn.textContent = "✕";

      this.#trigger.addEventListener("click", () => this.toggle());
      closeBtn.addEventListener("click", () => this.close());
      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.open) this.close();
      });
    }
    window.removeEventListener("popstate", this.#onPopState);
    window.addEventListener("popstate", this.#onPopState);
    this.#syncLabel();
    this.#applyOpen(this.hasAttribute("open"), { silent: true });
  }

  disconnectedCallback() {
    window.removeEventListener("popstate", this.#onPopState);
  }

  attributeChangedCallback(name: string) {
    if (!this.shadowRoot) return;
    if (name === "label") this.#syncLabel();
    if (name === "open") this.#applyOpen(this.hasAttribute("open"));
  }

  get open(): boolean {
    return this.hasAttribute("open");
  }

  /** Abre/cierra como si fuera el usuario (historial incluido). */
  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    if (this.open) return;
    history.pushState({ vxDrawer: this.id || true }, "");
    this.#pushed = true;
    this.setAttribute("open", "");
  }

  close(): void {
    if (!this.open) return;
    this.removeAttribute("open");
    if (this.#pushed) {
      // Cierre por UI: consume la entrada que `show()` empujó — el
      // popstate resultante no encuentra #pushed y no hace nada más.
      this.#pushed = false;
      history.back();
    }
  }

  #syncLabel() {
    const label = this.getAttribute("label") ?? "";
    this.#labelEl.textContent = label;
    this.#trigger.setAttribute("aria-label", label);
    this.#panel.setAttribute("aria-label", label);
    const closeBtn = this.shadowRoot!.querySelector<HTMLButtonElement>(".close")!;
    closeBtn.setAttribute("aria-label", t("drawerClose", getStoredLang()));
  }

  #applyOpen(open: boolean, opts: { silent?: boolean } = {}) {
    const wasOpen = !this.#panel.hidden;
    this.#panel.hidden = !open;
    this.#trigger.setAttribute("aria-expanded", String(open));
    if (open && !wasOpen) {
      this.#panel.focus({ preventScroll: true });
    } else if (
      !open &&
      wasOpen &&
      (this.shadowRoot!.activeElement === this.#panel ||
        this.#panel.contains(this.shadowRoot!.activeElement))
    ) {
      this.#trigger.focus({ preventScroll: true });
    }
    if (!opts.silent && wasOpen !== open) {
      this.dispatchEvent(
        new CustomEvent<DrawerChangeDetail>("vx-drawer-change", {
          detail: { open },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }
}

customElements.define("vx-drawer", VxDrawer);
