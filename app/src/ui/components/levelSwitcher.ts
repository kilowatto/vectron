import { MODE_IDS, describeMode, type Mode } from "./modeStorage";
import { getStoredLang } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./levelSwitcher.css?inline";

export interface LevelChangeDetail {
  mode: Mode;
}

/**
 * `<vx-level-switcher current="avanzado">` — control persistente para
 * cambiar de modo sin volver a la portada: cambiar de modo es cambiar
 * de app, no "salir" de la app. Elegir una pestaña dispara `vx-level-change`
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
 * - `vx-level-change` — `CustomEvent<{ mode: Mode }>`, disparado al elegir
 *   una pestaña distinta a `current`.
 *
 * ### Ejemplo
 * ```html
 * <vx-level-switcher current="avanzado"></vx-level-switcher>
 * <script>
 *   switcher.addEventListener("vx-level-change", (e) => switchTo(e.detail.mode));
 * </script>
 * ```
 */
interface PillRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class VxLevelSwitcher extends HTMLElement {
  static readonly observedAttributes = ["current"];

  // El corte de golpe reportado en vivo ("la animación de dividirse o
  // unirse se hace de golpe") no era sólo de las partículas — este
  // switcher reconstruye su innerHTML entero en cada cambio de `current`,
  // así que la pastilla resaltada (antes: sólo `background` en el botón
  // activo) desaparecía y volvía a aparecer en la nueva posición sin
  // ningún fotograma intermedio. Con el DOM reconstruido de raíz cada
  // vez, un <span> nuevo no tiene "posición anterior" de la que partir
  // para que el navegador anime nada — se necesita la técnica FLIP:
  // guardamos el último rect en el que se dejó la pastilla (en píxeles
  // locales, no requiere getBoundingClientRect), la reinsertamos AHÍ sin
  // transición, y en el siguiente frame la movemos a su posición real
  // con la transición activada — el navegador anima ese último tramo.
  #lastPillRect: PillRect | null = null;

  // Duración real de la ola de partículas para el cambio en curso —
  // pedido explícito 2026-07-19: la pastilla deslizaba en 0.32s fijos
  // mientras el morph real (dinámico, ver computeMorphPlan en
  // particleField.ts) podía tardar hasta 3.4s en cambios grandes, así
  // que el switcher "terminaba" mucho antes que el cubo. Quien llama
  // (main.ts) debe fijar esto con estimateMorphDuration() JUSTO ANTES
  // de cambiar `current` — si nunca se fija, 320ms es el valor de
  // siempre (primera carga, o si alguien usa este componente sin ese
  // paso extra).
  #transitionMs = 320;

  setTransitionMs(ms: number) {
    this.#transitionMs = Math.max(1, ms);
  }

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
    // Cajón sólo en móvil (ver levelSwitcher.css): en escritorio
    // .drawer-toggle nunca se muestra, así que esto no cambia nada ahí
    // — colapsado por defecto, la flechita lo abre/cierra.
    root.innerHTML = `
      <button type="button" class="drawer-toggle">
        <span class="current-label">${activeTitle}</span>
        <span class="chevron">▾</span>
      </button>
      <div class="options">
        <span class="pill" aria-hidden="true"></span>
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
      // En móvil, `.options` (donde vive la pastilla) está oculto
      // mientras el cajón está cerrado — offsetLeft/Width de un botón
      // dentro de un ancestro `display:none` siempre da 0, así que
      // #positionPill no puede medir nada útil en ese estado y su
      // llamada normal (disparada por #render en cada cambio de modo,
      // que en móvil pasa con el cajón YA cerrado) se salta sola (ver
      // guard de ancho 0 ahí abajo). Al abrir el cajón hay que
      // reposicionar de una vez, sin animar — recién se hizo visible,
      // no venía de ningún lado que animar.
      if (this.hasAttribute("expanded")) this.#positionPill(root, { instant: true });
    });

    root.querySelectorAll<HTMLButtonElement>(".options button").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.removeAttribute("expanded"); // el cajón se cierra al elegir
        const mode = btn.dataset.mode as Mode;
        if (mode === current) return;
        this.dispatchEvent(
          new CustomEvent<LevelChangeDetail>("vx-level-change", { detail: { mode }, bubbles: true }),
        );
      });
    });

    this.#positionPill(root);
  }

  #positionPill(root: ShadowRoot, opts: { instant?: boolean } = {}) {
    const pill = root.querySelector<HTMLElement>(".pill");
    const activeBtn = root.querySelector<HTMLButtonElement>(".options button.active");
    if (!pill || !activeBtn) return;
    // `.options` oculto (cajón móvil cerrado): offsetWidth da 0 para
    // todo lo de dentro, no es una posición real que guardar ni animar
    // hacia ella — se deja como estaba, #positionPill se vuelve a
    // llamar (con instant:true) en cuanto el cajón se abra de verdad.
    if (activeBtn.offsetWidth === 0 && activeBtn.offsetHeight === 0) return;

    const next: PillRect = {
      left: activeBtn.offsetLeft,
      top: activeBtn.offsetTop,
      width: activeBtn.offsetWidth,
      height: activeBtn.offsetHeight,
    };
    const prev = this.#lastPillRect;
    this.#lastPillRect = next;

    if (!prev || opts.instant) {
      // Primer render (o volvió de estar desconectado): sin punto de
      // partida que animar, se coloca directo en su posición final.
      pill.style.transition = "none";
      Object.assign(pill.style, {
        left: `${next.left}px`,
        top: `${next.top}px`,
        width: `${next.width}px`,
        height: `${next.height}px`,
      });
      return;
    }

    pill.style.transition = "none";
    Object.assign(pill.style, {
      left: `${prev.left}px`,
      top: `${prev.top}px`,
      width: `${prev.width}px`,
      height: `${prev.height}px`,
    });
    requestAnimationFrame(() => {
      const s = `${this.#transitionMs}ms`;
      pill.style.transition = `left ${s} cubic-bezier(0.4, 0, 0.2, 1), width ${s} cubic-bezier(0.4, 0, 0.2, 1)`;
      Object.assign(pill.style, {
        left: `${next.left}px`,
        top: `${next.top}px`,
        width: `${next.width}px`,
        height: `${next.height}px`,
      });
    });
  }
}

customElements.define("vx-level-switcher", VxLevelSwitcher);
