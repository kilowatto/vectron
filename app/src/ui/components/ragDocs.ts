import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import { embedTexts, cosineLocal } from "../../data/concepts";
import css from "./ragDocs.css?inline";

/**
 * `<vx-rag-docs>` — resto del checklist de Fase 5 (DOCs/13 §5/§19,
 * "Prepared docs. Archive/chunk visualization."): a diferencia de
 * `<vx-rag-stub>` (que recupera VECINOS del dataset del cubo — mismos
 * conceptos que ya viven ahí), esto recupera de un DOCUMENTO EXTERNO
 * preparado — el journey real que dibuja el doc: archivo → fragmentos
 * → recuperar → Cámara. Trocear + embeber son 100% reales
 * (embedTexts, bge-m3); la "respuesta" sigue siendo plantilla
 * declarada, igual que el stub — sin modelo generador conectado
 * todavía no hay honestidad posible fingiendo lo contrario.
 */
interface PreparedDoc {
  id: string;
  es: string;
  en: string;
  titleEs: string;
  titleEn: string;
}

const PREPARED_DOCS: PreparedDoc[] = [
  {
    id: "cube",
    titleEs: "sobre el cubo de significado",
    titleEn: "about the meaning cube",
    es: "El cubo de Vectron muestra palabras como partículas en un espacio de significado. Cada palabra se convierte primero en tokens con un identificador real. Cada token se embebe en un vector de 1024 números con el modelo bge-m3. Palabras con significados parecidos terminan cerca unas de otras, medido con similitud de coseno real. El cubo en pantalla es una proyección a tres dimensiones de ese espacio de 1024, usando un análisis de componentes principales real. Fijar una partícula muestra sus vecinos reales, no inventados.",
    en: "Vectron's cube shows words as particles in a meaning space. Each word is first cut into tokens with a real ID. Each token is embedded into a 1024-number vector using the bge-m3 model. Words with similar meanings end up close to each other, measured with real cosine similarity. The cube on screen is a three-dimensional projection of that 1024-dimensional space, using real principal component analysis. Pinning a particle shows its real neighbors, not made up ones.",
  },
  {
    id: "rhino",
    titleEs: "el rinoceronte naranja",
    titleEn: "the orange rhinoceros",
    es: "El rinoceronte naranja es uno de los ejemplos favoritos de Vectron. Viene de la sabana y le gusta el café de Frida Café. Es de color naranja, un color poco común entre los rinocerontes de verdad. Aparece en los ejemplos del compositor junto con Python, la gravedad y los agujeros negros. Nadie sabe si el rinoceronte naranja existe de verdad o es sólo una frase de prueba. Lo que sí es real es su embebido: vive en algún lugar del cubo, cerca de otros animales y de la palabra sabana.",
    en: "The orange rhinoceros is one of Vectron's favorite examples. It comes from the savanna and likes coffee from Frida Café. It is orange, an uncommon color for real rhinoceroses. It shows up in the composer's examples alongside Python, gravity, and black holes. Nobody knows if the orange rhinoceros really exists or if it's just a test sentence. What is real is its embedding: it lives somewhere in the cube, near other animals and the word savanna.",
  },
];

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export class VxRagDocs extends HTMLElement {
  #docSelect!: HTMLSelectElement;
  #chunkBtn!: HTMLButtonElement;
  #statusEl!: HTMLDivElement;
  #archiveEl!: HTMLDivElement;
  #questionInput!: HTMLInputElement;
  #askBtn!: HTMLButtonElement;
  #resultsEl!: HTMLDivElement;
  #answerEl!: HTMLDivElement;
  #chunks: { text: string; vector: number[] }[] = [];
  #onRetrieved: ((chunks: string[]) => void) | null = null;

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="head">
        <span class="label">${t("ragDocsHeading", lang)}</span>
      </div>
      <p class="declared-inline">${t("ragDocsIntro", lang)}</p>
      <div class="row">
        <select></select>
        <button type="button" class="chunk-btn"></button>
      </div>
      <div class="status"></div>
      <div class="archive-heading" hidden></div>
      <div class="archive"></div>
      <div class="row ask-row">
        <input type="text" placeholder="${t("ragDocsAskPlaceholder", lang)}" />
        <button type="button" class="ask-btn">${t("ragAsk", lang)}</button>
      </div>
      <div class="results-heading" hidden></div>
      <div class="results"></div>
      <div class="answer"></div>
    `;
    this.#docSelect = root.querySelector("select")!;
    this.#chunkBtn = root.querySelector(".chunk-btn")!;
    this.#statusEl = root.querySelector(".status")!;
    this.#archiveEl = root.querySelector(".archive")!;
    this.#questionInput = root.querySelector('input[type="text"]')!;
    this.#askBtn = root.querySelector(".ask-btn")!;
    this.#resultsEl = root.querySelector(".results")!;
    this.#answerEl = root.querySelector(".answer")!;

    this.#docSelect.innerHTML = PREPARED_DOCS.map(
      (doc) => `<option value="${doc.id}">${lang === "en" ? doc.titleEn : doc.titleEs}</option>`,
    ).join("");
    this.#chunkBtn.textContent = t("ragDocsChunkBtn", lang);
    this.#docSelect.addEventListener("change", () => {
      this.#chunks = [];
      this.#renderArchive();
    });
    this.#chunkBtn.addEventListener("click", () => void this.#handleChunk());
    const ask = () => void this.#handleAsk(this.#questionInput.value.trim());
    this.#askBtn.addEventListener("click", ask);
    this.#questionInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ask();
    });
  }

  /** main.ts inyecta esto — mismo patrón que ragStub.onRetrieved, para
   * meter los fragmentos recuperados al mismo ContextController que ya
   * alimenta la Cámara 3D (DOCs/13 §5: RAG → Cámara). */
  onRetrieved(fn: (chunks: string[]) => void): void {
    this.#onRetrieved = fn;
  }

  async #handleChunk(): Promise<void> {
    const lang: Lang = getStoredLang();
    const doc = PREPARED_DOCS.find((d) => d.id === this.#docSelect.value) ?? PREPARED_DOCS[0];
    const text = lang === "en" ? doc.en : doc.es;
    const sentences = splitIntoSentences(text);
    this.#statusEl.textContent = t("ragDocsChunking", lang);
    this.#chunks = [];
    this.#renderArchive();
    const vectors = await embedTexts(sentences);
    this.#statusEl.textContent = "";
    if (!vectors) {
      this.#statusEl.textContent = t("ragError", lang);
      return;
    }
    this.#chunks = sentences.map((sentence, i) => ({ text: sentence, vector: vectors[i] }));
    this.#renderArchive();
  }

  #renderArchive(): void {
    const lang: Lang = getStoredLang();
    const heading = this.shadowRoot!.querySelector<HTMLElement>(".archive-heading")!;
    heading.hidden = this.#chunks.length === 0;
    heading.textContent = t("ragDocsChunksHeading", lang);
    this.#archiveEl.innerHTML = this.#chunks
      .map((c, i) => `<span class="chunk archive-chunk">#${i + 1} ${c.text}</span>`)
      .join("");
  }

  async #handleAsk(question: string): Promise<void> {
    const lang: Lang = getStoredLang();
    if (!question) return;
    this.#resultsEl.innerHTML = "";
    this.#answerEl.innerHTML = "";
    if (this.#chunks.length === 0) {
      this.#statusEl.textContent = t("ragDocsNoChunks", lang);
      return;
    }
    this.#statusEl.textContent = t("ragRetrieving", lang);
    const [qVector] = (await embedTexts([question])) ?? [];
    this.#statusEl.textContent = "";
    if (!qVector) {
      this.#statusEl.textContent = t("ragError", lang);
      return;
    }
    const scored = this.#chunks
      .map((c) => ({ text: c.text, score: cosineLocal(qVector, c.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const resultsHeading = this.shadowRoot!.querySelector<HTMLElement>(".results-heading")!;
    resultsHeading.hidden = false;
    resultsHeading.textContent = t("ragDocsTopChunks", lang);
    this.#resultsEl.innerHTML = scored
      .map(({ text, score }) => `<span class="chunk">${text} <small>${score.toFixed(3)}</small></span>`)
      .join("");

    this.#onRetrieved?.(scored.map((s) => s.text));

    this.#answerEl.innerHTML = `
      <p class="declared-inline">${t("ragAnswerDeclared", lang)}</p>
      <p class="answer-text">${scored.map((s) => s.text).join(" ")}</p>
    `;
  }
}

customElements.define("vx-rag-docs", VxRagDocs);
