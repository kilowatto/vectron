import { tokenizeBPE, tokenizeSimple, type Token } from "../../tokenizer";
import { attachShadow } from "./shadow";
import css from "./tokenPanel.css?inline";

export type TokenizerMode = "bpe" | "simple";

export interface TokensChangeDetail {
  tokens: Token[];
  mode: TokenizerMode;
}

const EXAMPLE_PHRASES = [
  "El Rinoceronte Naranja que viene de la sabana le gusta el café Frida Café",
  "Python es un lenguaje de programación",
  "La gravedad y la luz son física",
  "El agujero negro está en la vía láctea",
];

/**
 * `<vx-token-panel>` — entrada de texto + tokenización en vivo (BPE real
 * o simplificada), compartido por los 3 modos con distinta configuración.
 *
 * ### Atributos
 * | nombre         | tipo    | default    | descripción                                              |
 * |----------------|---------|------------|-----------------------------------------------------------|
 * | `variant`      | string  | `""`       | `"bottom"` (Principiante) o `"docked"` (Intermedio/Avanzado) — sólo estilo. Fijar antes de insertar en el DOM. |
 * | `hide-toggle`  | boolean | ausente    | si está presente, oculta el switch BPE/Simplificado y fuerza tokenizador simple. Fijar antes de insertar. |
 * | `hide-ids`     | boolean | ausente    | si está presente, los chips no muestran el ID numérico del token. Fijar antes de insertar. |
 * | `placeholder`  | string  | frase genérica | placeholder del input. Reactivo: se puede cambiar en cualquier momento. |
 *
 * ### Eventos
 * - `vx-tokens-change` — `CustomEvent<{ tokens: Token[]; mode: "bpe"\|"simple" }>`,
 *   disparado cada vez que el texto se retokeniza (con debounce natural
 *   por ser async — una escritura más reciente cancela la anterior).
 *
 * ### Ejemplo
 * ```html
 * <vx-token-panel variant="docked" placeholder="Escribe una frase…"></vx-token-panel>
 * <script>
 *   panel.addEventListener("vx-tokens-change", (e) => {
 *     console.log(e.detail.tokens, e.detail.mode);
 *   });
 * </script>
 * ```
 */
export class VxTokenPanel extends HTMLElement {
  static readonly observedAttributes = ["placeholder"];

  #input!: HTMLInputElement;
  #tokensEl!: HTMLDivElement;
  #examplesEl!: HTMLDivElement;
  #toggleButtons: HTMLButtonElement[] = [];
  #mode: TokenizerMode = "bpe";
  #requestSeq = 0;
  #hideToggle = false;
  #hideIds = false;

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)

    // Nota: hide-toggle/hide-ids se leen aquí, no en el constructor —
    // document.createElement() invoca el constructor ANTES de que el
    // código que crea el elemento tenga oportunidad de llamar
    // setAttribute() sobre él, así que a esa hora el atributo todavía no
    // existe. connectedCallback corre después de appendChild(), cuando
    // ya se aplicaron. (Si el atributo viniera del HTML parseado en el
    // documento, sí estaría disponible desde el constructor — pero no es
    // como se usa este componente aquí.)
    this.#hideToggle = this.hasAttribute("hide-toggle");
    this.#hideIds = this.hasAttribute("hide-ids");
    this.#mode = this.#hideToggle ? "simple" : "bpe";

    const root = attachShadow(this, css);
    root.innerHTML = `
      <h3 class="title">1 · Tokenización</h3>
      <div class="row">
        <input type="text" autocomplete="off" spellcheck="false" />
        ${
          this.#hideToggle
            ? ""
            : `<div class="toggle">
                 <button type="button" data-mode="bpe" class="active">BPE real</button>
                 <button type="button" data-mode="simple">Simplificado</button>
               </div>`
        }
      </div>
      <div class="examples"></div>
      <div class="tokens"></div>
    `;

    this.#input = root.querySelector("input")!;
    this.#tokensEl = root.querySelector(".tokens")!;
    this.#examplesEl = root.querySelector(".examples")!;
    this.#toggleButtons = Array.from(root.querySelectorAll(".toggle button"));

    this.#input.placeholder =
      this.getAttribute("placeholder") ?? "Escribe una frase o elige un ejemplo…";

    EXAMPLE_PHRASES.forEach((phrase) => {
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

  async #render() {
    const seq = ++this.#requestSeq;
    const text = this.#input.value;
    const tokens = text.trim()
      ? this.#mode === "bpe"
        ? await tokenizeBPE(text)
        : tokenizeSimple(text)
      : [];
    if (seq !== this.#requestSeq) return; // una escritura más reciente ya resolvió

    this.#tokensEl.innerHTML = tokens
      .map(
        (t) =>
          `<span class="token"><b>${t.text.replace(/\s/g, "·")}</b>${
            this.#hideIds ? "" : `<small>${t.id}</small>`
          }</span>`,
      )
      .join("");

    this.dispatchEvent(
      new CustomEvent<TokensChangeDetail>("vx-tokens-change", {
        detail: { tokens, mode: this.#mode },
      }),
    );
  }
}

customElements.define("vx-token-panel", VxTokenPanel);
