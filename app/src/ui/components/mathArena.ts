import { getStoredLang, t, type Lang } from "../../i18n";
import { cosineLocal } from "../../data/concepts";
import { attachShadow } from "./shadow";
import css from "./mathArena.css?inline";

const TABS = ["Attention", "Softmax", "Cosine", "PCA", "Sampling"] as const;
type Tab = (typeof TABS)[number];

export interface MathArenaToken {
  label: string;
  vector: number[];
}

/**
 * `<vx-math-arena>` — P6 sólo pedía el hueco permanente en el shell de
 * Avanzado; P7 (ver DOCs/03-gui-responsive-avanzado-loading.md §4)
 * empieza a llenarlo — orden explícito del doc: "Cosine+PCA first
 * (reuse live vectors) → Softmax → Attention heatmap → Sampling". Esta
 * primera rebanada es la pestaña Cosine, con los MISMOS vectores
 * bge-m3 reales que ya vive tokenMode.ts (no otro embed nuevo) — el
 * resto de pestañas siguen siendo el placeholder hasta su turno.
 */
export class VxMathArena extends HTMLElement {
  #activeTab: Tab = "Cosine";
  #tokens: MathArenaToken[] = [];
  #selA = 0;
  #selB = 1;
  #tabsEl!: HTMLDivElement;
  #panelEl!: HTMLDivElement;

  connectedCallback() {
    if (this.shadowRoot) return;
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="tabs"></div>
      <div class="panel"></div>
    `;
    this.#tabsEl = root.querySelector(".tabs")!;
    this.#panelEl = root.querySelector(".panel")!;
    this.#renderTabs();
    this.#renderPanel();
  }

  /** main.ts llama esto con los embeddings vivos de tokenMode.ts (P7,
   * DOCs/03 §4.3 "reuse live vectors") — mismos números, sin pedir otro
   * embed nuevo sólo para esta pestaña. */
  setLiveTokens(tokens: MathArenaToken[]): void {
    this.#tokens = tokens;
    if (this.#selA >= tokens.length) this.#selA = 0;
    if (this.#selB >= tokens.length) this.#selB = Math.min(1, tokens.length - 1);
    if (this.#activeTab === "Cosine") this.#renderPanel();
  }

  #renderTabs() {
    const lang = getStoredLang();
    this.#tabsEl.innerHTML = TABS.map(
      (tab) =>
        `<button type="button" class="tab${tab === this.#activeTab ? " active" : ""}" data-tab="${tab}">${
          tab === "Cosine" ? t("mathArenaTabCosine", lang) : tab
        }</button>`,
    ).join("");
    this.#tabsEl.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.#activeTab = btn.dataset.tab as Tab;
        this.#renderTabs();
        this.#renderPanel();
      });
    });
  }

  #renderPanel() {
    if (this.#activeTab === "Cosine") {
      this.#renderCosinePanel();
    } else {
      this.#renderPlaceholder();
    }
  }

  #renderPlaceholder() {
    const lang = getStoredLang();
    this.#panelEl.innerHTML = `
      <div class="placeholder">
        <p class="headline">${t("mathArenaComingSoon", lang)}</p>
        <p class="note">${t("mathArenaNote", lang)}</p>
      </div>
    `;
  }

  #renderCosinePanel() {
    const lang: Lang = getStoredLang();
    if (this.#tokens.length < 2) {
      this.#panelEl.innerHTML = `<div class="empty">${t("mathArenaCosineEmpty", lang)}</div>`;
      return;
    }
    const options = (selected: number) =>
      this.#tokens
        .map((tok, i) => `<option value="${i}" ${i === selected ? "selected" : ""}>${tok.label}</option>`)
        .join("");

    const a = this.#tokens[this.#selA];
    const b = this.#tokens[this.#selB];
    const cos = cosineLocal(a.vector, b.vector);
    const dot = a.vector.reduce((s, v, i) => s + v * b.vector[i], 0);
    const magA = Math.sqrt(a.vector.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.vector.reduce((s, v) => s + v * v, 0));

    this.#panelEl.innerHTML = `
      <p class="intro">${t("mathArenaCosineIntro", lang)}</p>
      <div class="pickers">
        <select class="sel-a">${options(this.#selA)}</select>
        <span class="vs">↔</span>
        <select class="sel-b">${options(this.#selB)}</select>
      </div>
      <div class="formula">
        cos(θ) = (A · B) / (|A| |B|) = ${dot.toFixed(3)} / (${magA.toFixed(3)} × ${magB.toFixed(3)}) = <b>${cos.toFixed(4)}</b>
      </div>
      <div class="bar-wrap">
        <div class="bar"><div class="fill" style="width:${Math.max(0, cos) * 100}%"></div></div>
        <span class="bar-value">${cos.toFixed(4)}</span>
      </div>
      <div class="vectors">
        <div class="vec-row"><span class="vec-label">A (${a.label})</span><span class="vec-preview">[${a.vector.slice(0, 6).map((v) => v.toFixed(3)).join(", ")}, …] · ℝ${a.vector.length}</span></div>
        <div class="vec-row"><span class="vec-label">B (${b.label})</span><span class="vec-preview">[${b.vector.slice(0, 6).map((v) => v.toFixed(3)).join(", ")}, …] · ℝ${b.vector.length}</span></div>
      </div>
      <p class="footnote">${t("mathArenaCosineFootnote", lang)}</p>
    `;
    this.#panelEl.querySelector(".sel-a")!.addEventListener("change", (e) => {
      this.#selA = Number((e.target as HTMLSelectElement).value);
      this.#renderCosinePanel();
    });
    this.#panelEl.querySelector(".sel-b")!.addEventListener("change", (e) => {
      this.#selB = Number((e.target as HTMLSelectElement).value);
      this.#renderCosinePanel();
    });
  }
}

customElements.define("vx-math-arena", VxMathArena);
