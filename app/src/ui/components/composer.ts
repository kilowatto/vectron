import { tokenizeBPE, tokenizeSimple, type Token } from "../../tokenizer";
import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import css from "./composer.css?inline";

export type TokenizerMode = "bpe" | "simple";

export interface TokensChangeDetail {
  tokens: Token[];
  mode: TokenizerMode;
  /** El texto tal cual se escribió, sin tokenizar — quien escucha lo
   * usa para buscar coincidencias de palabra/frase completa contra el
   * dataset, y <vx-token-strip> lo usa para tokenizar con BGE cuando
   * compare está activo (independiente de este componente). */
  text: string;
}

/**
 * `<vx-composer>` — barra flotante anclada abajo, sobre las partículas:
 * SOLO entrada de texto + toggle BPE/simplificado + ejemplos (P1: split
 * de lo que antes era `<vx-token-panel>` — ver `<vx-token-strip>` para
 * los chips). Nunca crece: es la única superficie que debe quedarse
 * siempre del mismo tamaño sin importar cuánto texto se escriba.
 *
 * ### Atributos
 * | nombre         | tipo    | default    | descripción                                              |
 * |----------------|---------|------------|-----------------------------------------------------------|
 * | `hide-toggle`  | boolean | ausente    | si está presente, oculta el switch BPE/Simplificado y fuerza tokenizador simple. Fijar antes de insertar. |
 * | `placeholder`  | string  | frase genérica | placeholder del input. Reactivo: se puede cambiar en cualquier momento. |
 *
 * ### Métodos públicos
 * - `clear()` — vacía el input (botón × visible sólo con texto, o tecla
 *   Escape) y dispara `vx-tokens-change` con texto vacío.
 *
 * ### Eventos
 * - `vx-tokens-change` — `CustomEvent<TokensChangeDetail>`, disparado
 *   cada vez que el texto se retokeniza.
 */
export class VxComposer extends HTMLElement {
  static readonly observedAttributes = ["placeholder"];

  #input!: HTMLInputElement;
  #clearBtn!: HTMLButtonElement;
  #examplesEl!: HTMLDivElement;
  #toggleButtons: HTMLButtonElement[] = [];
  #mode: TokenizerMode = "bpe";
  #requestSeq = 0;
  #hideToggle = false;

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)

    // Nota: hide-toggle se lee aquí, no en el constructor —
    // document.createElement() invoca el constructor ANTES de que el
    // código que crea el elemento tenga oportunidad de llamar
    // setAttribute() sobre él.
    this.#hideToggle = this.hasAttribute("hide-toggle");
    this.#mode = this.#hideToggle ? "simple" : "bpe";
    const lang = getStoredLang();

    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="row">
        <div class="input-wrap">
          <input type="text" autocomplete="off" spellcheck="false" />
          <button type="button" class="clear" aria-label="${t("tokenPanelClear", lang)}">×</button>
        </div>
        ${
          this.#hideToggle
            ? ""
            : `<div class="toggle">
                 <button type="button" data-mode="bpe" class="active">${t("tokenPanelToggleBpe", lang)}</button>
                 <button type="button" data-mode="simple">${t("tokenPanelToggleSimple", lang)}</button>
               </div>`
        }
      </div>
      <div class="examples"></div>
    `;

    this.#input = root.querySelector("input")!;
    this.#clearBtn = root.querySelector(".clear")!;
    this.#examplesEl = root.querySelector(".examples")!;
    this.#toggleButtons = Array.from(root.querySelectorAll(".toggle button"));

    this.#clearBtn.addEventListener("click", () => this.clear());
    this.#input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.clear();
    });

    this.#input.placeholder =
      this.getAttribute("placeholder") ?? t("tokenPanelPlaceholderDefault", lang);

    const examplePhrases = [
      t("examplePhrase1", lang),
      t("examplePhrase2", lang),
      t("examplePhrase3", lang),
      t("examplePhrase4", lang),
    ];
    examplePhrases.forEach((phrase) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "example";
      chip.textContent = phrase;
      chip.addEventListener("click", () => {
        this.#input.value = phrase;
        this.#render();
      });
      this.#examplesEl.appendChild(chip);
    });

    this.#toggleButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.#mode = btn.dataset.mode as TokenizerMode;
        this.#toggleButtons.forEach((b) => b.classList.toggle("active", b === btn));
        this.#render();
      });
    });

    this.#input.addEventListener("input", () => this.#render());
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === "placeholder" && this.#input) {
      this.#input.placeholder = value ?? "";
    }
  }

  /** Vacía el input y dispara `vx-tokens-change` con texto vacío, igual
   * que borrar todo a mano — usado por el botón × y por Escape. */
  clear(): void {
    this.#input.value = "";
    this.#render();
    this.#input.focus();
  }

  async #render() {
    const seq = ++this.#requestSeq;
    const text = this.#input.value;
    this.#clearBtn.classList.toggle("visible", text.length > 0);

    const tokens = text.trim()
      ? this.#mode === "bpe"
        ? await tokenizeBPE(text)
        : tokenizeSimple(text)
      : [];
    if (seq !== this.#requestSeq) return; // una escritura más reciente ya resolvió

    this.dispatchEvent(
      new CustomEvent<TokensChangeDetail>("vx-tokens-change", {
        detail: { tokens, mode: this.#mode, text },
      }),
    );
  }
}

customElements.define("vx-composer", VxComposer);
