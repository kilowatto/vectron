import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import { embedTexts, fetchSimilarByVector } from "../../data/concepts";
import type { Concept } from "../../data/concepts";
import css from "./ragStub.css?inline";

/**
 * `<vx-rag-stub>` — Módulo F del currículo de Intermedio (ver
 * DOCs/10-intermedio-licenciatura.md §3, Módulo F): "RAG: pregunta →
 * chunks que brillan → respuesta". Pedido explícito 2026-07-19: quiere
 * un F básico YA, aunque sea ilustrativo — no esperar a WebLLM (P8).
 *
 * Mitad real, mitad declarada honestamente: RECUPERAR es 100% real
 * (embedTexts + fetchSimilarByVector, el mismo Vectorize del resto de
 * la app — coseno real, no inventado). GENERAR es el stub: sin un
 * modelo generador conectado todavía (eso es P8/WebLLM), la
 * "respuesta" es una plantilla que usa los conceptos recuperados de
 * verdad, declarada como tal en vez de fingir que un LLM la escribió.
 */
export class VxRagStub extends HTMLElement {
  #inputEl!: HTMLInputElement;
  #buttonEl!: HTMLButtonElement;
  #chunksEl!: HTMLDivElement;
  #answerEl!: HTMLDivElement;
  #statusEl!: HTMLDivElement;
  #setConceptFocus: ((ids: number[]) => void) | null = null;
  #lookupConcept: ((id: number) => Concept | undefined) | null = null;

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="head">
        <span class="label">${t("ragLabel", lang)}</span>
        <span class="declared">${t("ragDeclared", lang)}</span>
      </div>
      <div class="row">
        <input type="text" placeholder="${t("ragPlaceholder", lang)}" />
        <button type="button">${t("ragAsk", lang)}</button>
      </div>
      <div class="status"></div>
      <div class="chunks"></div>
      <div class="answer"></div>
    `;
    this.#inputEl = root.querySelector("input")!;
    this.#buttonEl = root.querySelector("button")!;
    this.#chunksEl = root.querySelector(".chunks")!;
    this.#answerEl = root.querySelector(".answer")!;
    this.#statusEl = root.querySelector(".status")!;
    const ask = () => void this.#handleAsk(this.#inputEl.value.trim());
    this.#buttonEl.addEventListener("click", ask);
    this.#inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ask();
    });
  }

  /** main.ts inyecta esto para poder resaltar en el cubo los conceptos
   * de verdad recuperados — este componente no conoce particleField. */
  onConceptFocus(fn: (ids: number[]) => void): void {
    this.#setConceptFocus = fn;
  }

  /** main.ts inyecta esto para resolver id -> Concept (word real,
   * `Neighbor` de fetchSimilarByVector sólo trae id+score). */
  setConceptLookup(fn: (id: number) => Concept | undefined): void {
    this.#lookupConcept = fn;
  }

  async #handleAsk(question: string): Promise<void> {
    const lang: Lang = getStoredLang();
    if (!question) return;
    this.#statusEl.textContent = t("ragRetrieving", lang);
    this.#chunksEl.innerHTML = "";
    this.#answerEl.innerHTML = "";
    const [vector] = (await embedTexts([question])) ?? [];
    if (!vector) {
      this.#statusEl.textContent = t("ragError", lang);
      return;
    }
    const neighbors = await fetchSimilarByVector(vector, 5);
    this.#statusEl.textContent = "";
    const resolved = neighbors
      .map((n) => ({ concept: this.#lookupConcept?.(n.id), score: n.score }))
      .filter((r): r is { concept: Concept; score: number } => r.concept !== undefined);
    if (resolved.length === 0) {
      this.#answerEl.textContent = t("ragNoChunks", lang);
      return;
    }
    this.#chunksEl.innerHTML = resolved
      .map(
        ({ concept, score }) =>
          `<span class="chunk">${lang === "en" ? concept.word.en : concept.word.es} <small>${score.toFixed(3)}</small></span>`,
      )
      .join("");
    this.#setConceptFocus?.(resolved.map((r) => r.concept.id));

    const words = resolved.map(({ concept }) => (lang === "en" ? concept.word.en : concept.word.es));
    this.#answerEl.innerHTML = `
      <p class="declared-inline">${t("ragAnswerDeclared", lang)}</p>
      <p class="answer-text">${t("ragAnswerPrefix", lang)} ${words.join(", ")}.</p>
    `;
  }
}

customElements.define("vx-rag-stub", VxRagStub);
