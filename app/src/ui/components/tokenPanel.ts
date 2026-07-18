import { tokenizeBPE, tokenizeSimple, type Token } from "../../tokenizer";
import { tokenizeBGE } from "../../bgeTokenizer";
import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import css from "./tokenPanel.css?inline";

export type TokenizerMode = "bpe" | "simple";

export interface TokensChangeDetail {
  tokens: Token[];
  mode: TokenizerMode;
  /** El texto tal cual se escribió, sin tokenizar — quien escucha lo
   * usa para buscar coincidencias de palabra/frase completa contra el
   * dataset (los tokens de BPE son fragmentos de subpalabra, no sirven
   * para eso; y ni BPE ni el modo simple agrupan varias palabras en un
   * solo token, así que tampoco alcanzan para conceptos de 2+ palabras
   * como "black hole"). */
  text: string;
}

/**
 * `<vx-token-panel>` — barra flotante anclada abajo, sobre las
 * partículas: entrada de texto + tokenización en vivo (BPE real o
 * simplificada). Es la única UI 2D de la app además de la tarjeta de
 * concepto — compartida por los 3 modos con distinta configuración.
 *
 * ### Atributos
 * | nombre         | tipo    | default    | descripción                                              |
 * |----------------|---------|------------|-----------------------------------------------------------|
 * | `hide-toggle`  | boolean | ausente    | si está presente, oculta el switch BPE/Simplificado y fuerza tokenizador simple. Fijar antes de insertar. |
 * | `hide-ids`     | boolean | ausente    | si está presente, los chips no muestran el ID numérico del token. Fijar antes de insertar. |
 * | `compare`      | boolean | ausente    | modo token de Avanzado: muestra DOS filas etiquetadas — la tokenización elegida (GPT cl100k / simplificada) y la del tokenizador REAL de BGE (el modelo del cubo) — más la nota de honestidad técnica. Fijar antes de insertar. |
 * | `placeholder`  | string  | frase genérica | placeholder del input. Reactivo: se puede cambiar en cualquier momento. |
 *
 * ### Métodos públicos
 * - `clear()` — vacía el input (botón × visible sólo con texto, o tecla
 *   Escape) y dispara `vx-tokens-change` con texto vacío, como si se
 *   hubiera borrado a mano.
 *
 * ### Eventos
 * - `vx-tokens-change` — `CustomEvent<{ tokens: Token[]; mode: "bpe"\|"simple"; text: string }>`,
 *   disparado cada vez que el texto se retokeniza (con debounce natural
 *   por ser async — una escritura más reciente cancela la anterior).
 *
 * ### Ejemplo
 * ```html
 * <vx-token-panel placeholder="Escribe una frase…"></vx-token-panel>
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
  #clearBtn!: HTMLButtonElement;
  #tokensEl!: HTMLDivElement;
  #bgeTokensEl!: HTMLDivElement;
  #gptLabelEl!: HTMLDivElement;
  #bgeLabelEl!: HTMLDivElement;
  #examplesEl!: HTMLDivElement;
  #bgeToggleBtn!: HTMLButtonElement;
  #bgeToggleLabelEl!: HTMLSpanElement;
  #bgeDetailEl!: HTMLDivElement;
  #toggleButtons: HTMLButtonElement[] = [];
  #mode: TokenizerMode = "bpe";
  #requestSeq = 0;
  #hideToggle = false;
  #hideIds = false;
  #compare = false;
  /** La comparación BGE (segunda fila + disclaimer) empieza colapsada
   * — son ~20 chips más que compiten con el cubo por pantalla y sólo
   * hacen falta cuando alguien quiere ver el tokenizador real, no en
   * cada tecla. Se resetea a colapsado sólo cuando el texto se vacía. */
  #bgeExpanded = false;

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)

    // Nota: hide-toggle/hide-ids se leen aquí, no en el constructor —
    // document.createElement() invoca el constructor ANTES de que el
    // código que crea el elemento tenga oportunidad de llamar
    // setAttribute() sobre él, así que a esa hora el atributo todavía no
    // existe. connectedCallback corre después de appendChild(), cuando
    // ya se aplicaron.
    this.#hideToggle = this.hasAttribute("hide-toggle");
    this.#hideIds = this.hasAttribute("hide-ids");
    this.#compare = this.hasAttribute("compare");
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
      <div class="tokens-zone">
        <div class="rowlabel gpt-label" hidden></div>
        <div class="tokens"></div>
        <button type="button" class="bge-toggle" hidden aria-expanded="false">
          <span class="chevron">▸</span>
          <span class="bge-toggle-label"></span>
        </button>
        <div class="bge-detail">
          <div class="rowlabel bge-label"></div>
          <div class="tokens bge"></div>
          <div class="disclaimer">${t("tokenDisclaimer", lang)}</div>
        </div>
      </div>
    `;

    this.#input = root.querySelector("input")!;
    this.#clearBtn = root.querySelector(".clear")!;
    this.#tokensEl = root.querySelector(".tokens:not(.bge)")!;
    this.#bgeTokensEl = root.querySelector(".tokens.bge")!;
    this.#gptLabelEl = root.querySelector(".gpt-label")!;
    this.#bgeLabelEl = root.querySelector(".bge-label")!;
    this.#examplesEl = root.querySelector(".examples")!;
    this.#bgeToggleBtn = root.querySelector(".bge-toggle")!;
    this.#bgeToggleLabelEl = root.querySelector(".bge-toggle-label")!;
    this.#bgeDetailEl = root.querySelector(".bge-detail")!;

    this.#bgeToggleBtn.addEventListener("click", () => {
      this.#bgeExpanded = !this.#bgeExpanded;
      this.#syncBgeExpanded();
    });

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

  /** Vacía el input y apaga cualquier resalte/línea que hubiera quedado
   * (dispara `vx-tokens-change` con texto vacío, igual que borrar todo
   * a mano) — usado por el botón × y por Escape. */
  clear(): void {
    this.#input.value = "";
    this.#render();
    this.#input.focus();
  }

  #syncBgeExpanded() {
    this.#bgeDetailEl.classList.toggle("expanded", this.#bgeExpanded);
    this.#bgeToggleBtn.classList.toggle("expanded", this.#bgeExpanded);
    this.#bgeToggleBtn.setAttribute("aria-expanded", String(this.#bgeExpanded));
  }

  #renderChips(el: HTMLDivElement, tokens: Token[]) {
    el.innerHTML = tokens
      .map(
        (t) =>
          `<span class="token"><b>${t.text.replace(/\s/g, "·")}</b>${
            this.#hideIds ? "" : `<small>${t.id}</small>`
          }</span>`,
      )
      .join("");
  }

  async #render() {
    const seq = ++this.#requestSeq;
    const text = this.#input.value;
    const lang = getStoredLang();
    this.#clearBtn.classList.toggle("visible", text.length > 0);

    const tokens = text.trim()
      ? this.#mode === "bpe"
        ? await tokenizeBPE(text)
        : tokenizeSimple(text)
      : [];
    const bgeTokens = this.#compare && text.trim() ? await tokenizeBGE(text) : [];
    if (seq !== this.#requestSeq) return; // una escritura más reciente ya resolvió

    this.#renderChips(this.#tokensEl, tokens);

    if (this.#compare) {
      const hasText = text.trim().length > 0;
      this.#gptLabelEl.hidden = !hasText;
      this.#bgeToggleBtn.hidden = !hasText;
      if (!hasText) this.#bgeExpanded = false; // colapsa de nuevo al borrar
      this.#syncBgeExpanded();
      this.#gptLabelEl.textContent =
        this.#mode === "bpe" ? t("tokenRowGpt", lang) : t("tokenRowSimple", lang);
      this.#bgeLabelEl.textContent = t("tokenRowBge", lang);
      this.#bgeToggleLabelEl.textContent = `${t("tokenCompareToggle", lang)} · ${bgeTokens.length}`;
      this.#renderChips(this.#bgeTokensEl, bgeTokens);
    }

    this.dispatchEvent(
      new CustomEvent<TokensChangeDetail>("vx-tokens-change", {
        detail: { tokens, mode: this.#mode, text },
      }),
    );
  }
}

customElements.define("vx-token-panel", VxTokenPanel);
