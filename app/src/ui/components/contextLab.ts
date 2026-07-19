import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang, type StringKey } from "../../i18n";
import css from "./contextLab.css?inline";

/**
 * `<vx-context-lab>` — Módulo E del currículo de Intermedio (ver
 * DOCs/12-context-window-lab.md, que evoluciona el `vx-context-meter`
 * original). Contrato explícito del doc: la ventana de contexto es la
 * "mesa de trabajo" del modelo para ESTE turno — no memoria
 * permanente, no lo aprendido en entrenamiento — y se enseña dejando
 * que el usuario LLENE, DESBORDE y COMPARE una ventana de laboratorio
 * chica contra ventanas reales de modelos de chat de verdad.
 *
 * Números (anti-goals explícitos del doc — NO cambiar sin revisar
 * ahí primero):
 * - Ventana de laboratorio: 500 tokens — ARTIFICIAL, a propósito
 *   chica para que el desborde pase en segundos. Etiquetada como tal.
 * - GPT-5 (familia, API): ~400 000 — comparación de escala, no un
 *   número que Vectron mida en vivo.
 * - Claude Sonnet 5: 1 000 000 — idem.
 * - bge-m3 (el embedder real que ya usa el cubo): 8 192 — nota al
 *   pie, NUNCA el número protagonista (anti-goal explícito: no usar
 *   8192 como si fuera el contexto de un LLM de chat).
 * Vectron NO llama a Claude/GPT de verdad aquí — sólo cuenta tokens
 * reales (BPE/BGE) y compara contra ventanas publicadas.
 */
const LAB_MAX = 500;
const MODEL_WINDOWS: { key: StringKey; tokens: number }[] = [
  { key: "contextLabModelLab", tokens: LAB_MAX },
  { key: "contextLabModelGpt5", tokens: 400_000 },
  { key: "contextLabModelClaude", tokens: 1_000_000 },
];
const MAX_VISIBLE_CHIPS = 40;
/** Palabras de relleno para la demo de desborde — nunca se afirma que
 * sean texto real del usuario, sólo estiran el largo hasta desbordar. */
const FILLER_WORDS = [
  "texto",
  "de",
  "relleno",
  "para",
  "la",
  "demostración",
  "del",
  "desborde",
  "artificial",
];

export class VxContextLab extends HTMLElement {
  #tapeEl!: HTMLDivElement;
  #barEl!: HTMLDivElement;
  #countEl!: HTMLSpanElement;
  #overflowNoteEl!: HTMLDivElement;
  #compareEl!: HTMLDivElement;
  #pasteBtn!: HTMLButtonElement;
  #resetBtn!: HTMLButtonElement;
  #realTokens: string[] = [];
  #demoActive = false;

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="head">
        <span class="label">${t("contextLabLabel", lang)}</span>
      </div>
      <p class="contract">${t("contextLabContract", lang)}</p>
      <div class="meter-head">
        <span class="meter-title">${t("contextLabLabWindow", lang)}</span>
        <span class="count"></span>
      </div>
      <div class="track"><div class="bar"></div></div>
      <div class="tape"></div>
      <div class="overflow-note" hidden></div>
      <div class="actions">
        <button type="button" class="paste">${t("contextLabPasteLong", lang)}</button>
        <button type="button" class="reset" hidden>${t("contextLabReset", lang)}</button>
      </div>
      <div class="compare-head">${t("contextLabCompareHead", lang)}</div>
      <div class="compare"></div>
      <div class="memory-callout">
        <div><b>${t("contextLabTermWindow", lang)}</b> — ${t("contextLabTermWindowDesc", lang)}</div>
        <div><b>${t("contextLabTermTraining", lang)}</b> — ${t("contextLabTermTrainingDesc", lang)}</div>
        <div><b>${t("contextLabTermRag", lang)}</b> — ${t("contextLabTermRagDesc", lang)}</div>
      </div>
      <div class="footnote">${t("contextLabFootnote", lang)}</div>
    `;
    this.#tapeEl = root.querySelector(".tape")!;
    this.#barEl = root.querySelector(".bar")!;
    this.#countEl = root.querySelector(".count")!;
    this.#overflowNoteEl = root.querySelector(".overflow-note")!;
    this.#compareEl = root.querySelector(".compare")!;
    this.#pasteBtn = root.querySelector(".paste")!;
    this.#resetBtn = root.querySelector(".reset")!;

    this.#pasteBtn.addEventListener("click", () => {
      this.#demoActive = true;
      this.#render();
    });
    this.#resetBtn.addEventListener("click", () => {
      this.#demoActive = false;
      this.#render();
    });

    this.#renderCompare();
    this.#render();
  }

  /** main.ts llama esto con los tokens BGE reales (strings, no sólo el
   * conteo) cada vez que el composer cambia — Beat B del doc: "Live
   * fill (typing)". */
  setTokens(tokens: string[]): void {
    this.#realTokens = tokens;
    this.#render();
  }

  #effectiveTokens(): string[] {
    if (!this.#demoActive) return this.#realTokens;
    // Estira con relleno declarado hasta pasar la ventana de
    // laboratorio — Beat C: "el desborde que se queda pegado".
    const padded = [...this.#realTokens];
    let i = 0;
    while (padded.length <= LAB_MAX) {
      padded.push(FILLER_WORDS[i % FILLER_WORDS.length]);
      i++;
    }
    return padded;
  }

  #render() {
    if (!this.#tapeEl) return;
    const lang: Lang = getStoredLang();
    const tokens = this.#effectiveTokens();
    const n = tokens.length;
    const overflowing = n > LAB_MAX;

    const pct = Math.min(100, (n / LAB_MAX) * 100);
    this.#barEl.style.width = `${pct}%`;
    this.#barEl.classList.toggle("amber", pct >= 60 && pct < 90);
    this.#barEl.classList.toggle("red", pct >= 90);
    this.#countEl.textContent = `${n.toLocaleString()} / ${LAB_MAX.toLocaleString()}`;

    this.#resetBtn.hidden = !this.#demoActive;
    this.#pasteBtn.hidden = this.#demoActive;
    this.#overflowNoteEl.hidden = !overflowing;
    if (overflowing) {
      this.#overflowNoteEl.textContent = t("contextLabOverflowNote", lang);
    }

    // Cinta: primeros chips + últimos chips visibles, el resto sólo se
    // cuenta (renderizar 500 nodos de verdad no ayuda a la intuición,
    // sólo pesa la página) — los que caen más allá de LAB_MAX se ven
    // apagados/tachados, los mismos índices sin importar cuántos se
    // vean de verdad.
    const headCount = overflowing ? 24 : Math.min(n, MAX_VISIBLE_CHIPS);
    const tailCount = overflowing ? 10 : 0;
    const head = tokens.slice(0, headCount);
    const tail = tailCount > 0 ? tokens.slice(-tailCount) : [];
    const hiddenCount = n - head.length - tail.length;

    const chipHtml = (tok: string, idx: number) =>
      `<span class="chip${idx >= LAB_MAX ? " dim" : ""}">${tok.replace(/\s/g, "·") || "·"}</span>`;

    let html = head.map((tok, i) => chipHtml(tok, i)).join("");
    if (hiddenCount > 0) {
      html += `<span class="gap">… +${hiddenCount.toLocaleString()} …</span>`;
    }
    html += tail.map((tok, i) => chipHtml(tok, n - tailCount + i)).join("");
    this.#tapeEl.innerHTML = html || `<span class="empty">${t("contextLabEmpty", lang)}</span>`;
  }

  #renderCompare() {
    const lang: Lang = getStoredLang();
    // Escala log — comparar 500 vs 1 000 000 en escala lineal deja la
    // barra del lab invisible; log es lo honesto para "se ve la
    // diferencia real" sin mentir con proporciones lineales falsas.
    const maxLog = Math.log10(MODEL_WINDOWS[MODEL_WINDOWS.length - 1].tokens);
    this.#compareEl.innerHTML = MODEL_WINDOWS.map(({ key, tokens }) => {
      const pct = (Math.log10(tokens) / maxLog) * 100;
      return `<div class="compare-row">
        <span class="compare-label">${t(key, lang)}</span>
        <div class="compare-track"><div class="compare-fill" style="width:${pct}%"></div></div>
        <span class="compare-value">${tokens.toLocaleString()}</span>
      </div>`;
    }).join("");
  }
}

customElements.define("vx-context-lab", VxContextLab);
