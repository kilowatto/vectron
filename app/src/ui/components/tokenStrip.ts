import { tokenizeBGE } from "../../bgeTokenizer";
import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import type { Token } from "../../tokenizer";
import type { TokenizerMode } from "./composer";
import css from "./tokenStrip.css?inline";

/**
 * `<vx-token-strip>` — franja superior, SOLO despliegue de tokens (P1:
 * split de lo que antes era `<vx-token-panel>` — ver `<vx-composer>`
 * para la entrada de texto). No tokeniza con GPT/simplificado por su
 * cuenta — quien la usa (main.ts) le pasa el resultado ya calculado por
 * `<vx-composer>` vía `setTokens()`; si `compare` está activo, ESTE
 * componente sí tokeniza con BGE de forma independiente (no depende del
 * composer para eso).
 *
 * ### Atributos
 * | nombre         | tipo    | default | descripción |
 * |----------------|---------|---------|--------------|
 * | `hide-ids`     | boolean | ausente | si está presente, los chips no muestran el ID numérico del token. Fijar antes de insertar. |
 * | `compare`      | boolean | ausente | modo token de Avanzado: agrega la fila colapsable del tokenizador WordPiece real de bge-base-en-v1.5 (referencia) + disclaimer. Fijar antes de insertar. |
 *
 * ### Métodos públicos
 * - `setTokens(tokens, mode, text)` — reemplaza los chips mostrados.
 */
export class VxTokenStrip extends HTMLElement {
  #tokensEl!: HTMLDivElement;
  #bgeTokensEl!: HTMLDivElement;
  #gptLabelEl!: HTMLDivElement;
  #bgeLabelEl!: HTMLDivElement;
  #bgeToggleBtn!: HTMLButtonElement;
  #bgeToggleLabelEl!: HTMLSpanElement;
  #bgeDetailEl!: HTMLDivElement;
  #hideIds = false;
  #compare = false;
  #requestSeq = 0;
  /** La comparación BGE (segunda fila + disclaimer) empieza colapsada
   * — son ~20 chips más que compiten con el cubo por pantalla y sólo
   * hacen falta cuando alguien quiere ver el tokenizador real, no en
   * cada tecla. Se resetea a colapsado sólo cuando el texto se vacía. */
  #bgeExpanded = false;

  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)

    this.#hideIds = this.hasAttribute("hide-ids");
    this.#compare = this.hasAttribute("compare");

    const root = attachShadow(this, css);
    root.innerHTML = `
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
          <div class="disclaimer"></div>
        </div>
      </div>
    `;

    this.#tokensEl = root.querySelector(".tokens:not(.bge)")!;
    this.#bgeTokensEl = root.querySelector(".tokens.bge")!;
    this.#gptLabelEl = root.querySelector(".gpt-label")!;
    this.#bgeLabelEl = root.querySelector(".bge-label")!;
    this.#bgeToggleBtn = root.querySelector(".bge-toggle")!;
    this.#bgeToggleLabelEl = root.querySelector(".bge-toggle-label")!;
    this.#bgeDetailEl = root.querySelector(".bge-detail")!;
    root.querySelector(".disclaimer")!.textContent = t("tokenDisclaimer", getStoredLang());

    this.#bgeToggleBtn.addEventListener("click", () => {
      this.#bgeExpanded = !this.#bgeExpanded;
      this.#syncBgeExpanded();
    });
  }

  #syncBgeExpanded() {
    this.#bgeDetailEl.classList.toggle("expanded", this.#bgeExpanded);
    this.#bgeToggleBtn.classList.toggle("expanded", this.#bgeExpanded);
    this.#bgeToggleBtn.setAttribute("aria-expanded", String(this.#bgeExpanded));
  }

  #renderChips(el: HTMLDivElement, tokens: Token[]) {
    el.innerHTML = tokens
      .map(
        (tok) =>
          `<span class="token"><b>${tok.text.replace(/\s/g, "·")}</b>${
            this.#hideIds ? "" : `<small>${tok.id}</small>`
          }</span>`,
      )
      .join("");
  }

  /** Reemplaza los chips de la fila primaria (GPT/simplificado, ya
   * tokenizada por quien llama) y, si `compare` está activo, tokeniza
   * el texto crudo con BGE por su cuenta para la fila de referencia. */
  async setTokens(tokens: Token[], mode: TokenizerMode, text: string): Promise<void> {
    const seq = ++this.#requestSeq;
    const lang = getStoredLang();
    this.#renderChips(this.#tokensEl, tokens);

    if (!this.#compare) return;

    const hasText = text.trim().length > 0;
    this.#gptLabelEl.hidden = !hasText;
    this.#bgeToggleBtn.hidden = !hasText;
    if (!hasText) {
      this.#bgeExpanded = false; // colapsa de nuevo al borrar
      this.#syncBgeExpanded();
      this.#renderChips(this.#bgeTokensEl, []);
      return;
    }
    this.#syncBgeExpanded();
    this.#gptLabelEl.textContent =
      mode === "bpe" ? t("tokenRowGpt", lang) : t("tokenRowSimple", lang);
    this.#bgeLabelEl.textContent = t("tokenRowBge", lang);

    const bgeTokens = await tokenizeBGE(text);
    if (seq !== this.#requestSeq) return; // una escritura más reciente ya resolvió

    this.#bgeToggleLabelEl.textContent = `${t("tokenCompareToggle", lang)} · ${bgeTokens.length}`;
    this.#renderChips(this.#bgeTokensEl, bgeTokens);
  }
}

customElements.define("vx-token-strip", VxTokenStrip);
