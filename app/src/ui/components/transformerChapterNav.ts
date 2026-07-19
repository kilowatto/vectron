import { getStoredLang, t } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./transformerChapterNav.css?inline";

export type TransformerChapter = "input" | "context" | "attention" | "blocks" | "prediction";

export interface TransformerChapterChangeDetail {
  chapter: TransformerChapter;
}

/**
 * `<vx-transformer-chapter current="context">` — sub-nav DENTRO de la
 * superficie Transformer (DOCs/13 §2.7/§11): Entrada → Contexto →
 * Atención → Bloques → Predicción. A diferencia de
 * <vx-intermediate-surface>, vive siempre dentro del panel del dock
 * (nunca flota) — el dock ya es visible (escritorio) o full-bleed
 * (angosto) cuando esta superficie está activa.
 */
export class VxTransformerChapter extends HTMLElement {
  static readonly observedAttributes = ["current"];

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #render() {
    const current = (this.getAttribute("current") as TransformerChapter | null) ?? "context";
    const lang = getStoredLang();
    const root = this.shadowRoot ?? attachShadow(this, css);
    const items: [TransformerChapter, string][] = [
      ["input", t("transformerChapterInput", lang)],
      ["context", t("transformerChapterContext", lang)],
      ["attention", t("transformerChapterAttention", lang)],
      ["blocks", t("transformerChapterBlocks", lang)],
      ["prediction", t("transformerChapterPrediction", lang)],
    ];
    root.innerHTML = items
      .map(
        ([id, label]) =>
          `<button type="button" data-chapter="${id}" class="${id === current ? "active" : ""}">${label}</button>`,
      )
      .join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chapter = btn.dataset.chapter as TransformerChapter;
        if (chapter === current) return;
        this.dispatchEvent(
          new CustomEvent<TransformerChapterChangeDetail>("vx-transformer-chapter-change", {
            detail: { chapter },
            bubbles: true,
          }),
        );
      });
    });
  }
}

customElements.define("vx-transformer-chapter", VxTransformerChapter);
