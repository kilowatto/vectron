import { getStoredLang, t, type Lang } from "../../i18n";
import { cosineLocal, fetchPcaBasis, type PcaBasis } from "../../data/concepts";
import { attachShadow } from "./shadow";
import css from "./mathLab.css?inline";

const TABS = ["Attention", "Softmax", "Cosine", "PCA", "Sampling"] as const;
type Tab = (typeof TABS)[number];

export interface MathLabToken {
  label: string;
  vector: number[];
  /** Coordenadas reales ya proyectadas de esta partícula (ver
   * tokenMode.ts LiveToken) — la pestaña PCA compara su propio
   * recálculo contra esto, no contra un número aparte. */
  coords: [number, number, number];
}

/**
 * `<vx-math-lab>` — P6 sólo pedía el hueco permanente en el shell de
 * Avanzado; P7 (ver DOCs/03-gui-responsive-avanzado-loading.md §4)
 * empieza a llenarlo — orden explícito del doc: "Cosine+PCA first
 * (reuse live vectors) → Softmax → Attention heatmap → Sampling". Esta
 * primera rebanada es la pestaña Cosine, con los MISMOS vectores
 * bge-m3 reales que ya vive tokenMode.ts (no otro embed nuevo) — el
 * resto de pestañas siguen siendo el placeholder hasta su turno.
 */
let pcaBasisPromise: Promise<PcaBasis | null> | null = null;
function loadPcaBasisOnce(): Promise<PcaBasis | null> {
  if (!pcaBasisPromise) pcaBasisPromise = fetchPcaBasis();
  return pcaBasisPromise;
}

export class VxMathLab extends HTMLElement {
  #activeTab: Tab = "Cosine";
  #tokens: MathLabToken[] = [];
  #selA = 0;
  #selB = 1;
  #selPca = 0;
  #pcaBasis: PcaBasis | null = null;
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
    void loadPcaBasisOnce().then((basis) => {
      this.#pcaBasis = basis;
      if (this.#activeTab === "PCA") this.#renderPanel();
    });
  }

  /** main.ts llama esto con los embeddings vivos de tokenMode.ts (P7,
   * DOCs/03 §4.3 "reuse live vectors") — mismos números, sin pedir otro
   * embed nuevo sólo para esta pestaña. */
  setLiveTokens(tokens: MathLabToken[]): void {
    this.#tokens = tokens;
    if (this.#selA >= tokens.length) this.#selA = 0;
    if (this.#selB >= tokens.length) this.#selB = Math.min(1, tokens.length - 1);
    if (this.#selPca >= tokens.length) this.#selPca = 0;
    if (this.#activeTab === "Cosine" || this.#activeTab === "PCA") this.#renderPanel();
  }

  #renderTabs() {
    const lang = getStoredLang();
    this.#tabsEl.innerHTML = TABS.map(
      (tab) =>
        `<button type="button" class="tab${tab === this.#activeTab ? " active" : ""}" data-tab="${tab}">${
          tab === "Cosine" ? t("mathLabTabCosine", lang) : tab === "PCA" ? t("mathLabTabPca", lang) : tab
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
    } else if (this.#activeTab === "PCA") {
      this.#renderPcaPanel();
    } else {
      this.#renderPlaceholder();
    }
  }

  #renderPlaceholder() {
    const lang = getStoredLang();
    this.#panelEl.innerHTML = `
      <div class="placeholder">
        <p class="headline">${t("mathLabComingSoon", lang)}</p>
        <p class="note">${t("mathLabNote", lang)}</p>
      </div>
    `;
  }

  #renderCosinePanel() {
    const lang: Lang = getStoredLang();
    if (this.#tokens.length < 2) {
      this.#panelEl.innerHTML = `<div class="empty">${t("mathLabCosineEmpty", lang)}</div>`;
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
      <p class="intro">${t("mathLabCosineIntro", lang)}</p>
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
      <p class="footnote">${t("mathLabCosineFootnote", lang)}</p>
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

  #renderPcaPanel() {
    const lang: Lang = getStoredLang();
    if (this.#tokens.length === 0) {
      this.#panelEl.innerHTML = `<div class="empty">${t("mathLabCosineEmpty", lang)}</div>`;
      return;
    }
    if (!this.#pcaBasis) {
      this.#panelEl.innerHTML = `<div class="empty">${t("mathLabPcaLoading", lang)}</div>`;
      return;
    }
    const basis = this.#pcaBasis;
    const tok = this.#tokens[this.#selPca];
    const options = this.#tokens
      .map((t2, i) => `<option value="${i}" ${i === this.#selPca ? "selected" : ""}>${t2.label}</option>`)
      .join("");

    // Mismo cálculo real que projectWithBasis (data/concepts.ts) —
    // repetido aquí paso a paso, a propósito, para mostrar cada parte
    // en vez de sólo el resultado final ya empacado en una función.
    const rawDots = basis.components.map((comp) => {
      let dot = 0;
      for (let i = 0; i < tok.vector.length; i++) dot += (tok.vector[i] - basis.mean[i]) * comp[i];
      return dot;
    });
    const scaled = rawDots.map((d, c) =>
      basis.maxAbs[c] > 0
        ? Math.max(-basis.cubeScale, Math.min(basis.cubeScale, (d / basis.maxAbs[c]) * basis.cubeScale))
        : 0,
    );
    const axisLabel = ["x", "y", "z"];

    this.#panelEl.innerHTML = `
      <p class="intro">${t("mathLabPcaIntro", lang)}</p>
      <div class="pickers">
        <select class="sel-pca">${options}</select>
      </div>
      <div class="formula">
        ${axisLabel
          .map(
            (axis, c) =>
              `${axis} = (v − media) · eje${c + 1} = ${rawDots[c].toFixed(3)} → <b>${scaled[c].toFixed(3)}</b>`,
          )
          .join("<br/>")}
      </div>
      <div class="vectors">
        <div class="vec-row"><span class="vec-label">${t("mathLabPcaComputed", lang)}</span><span class="vec-preview">[${scaled.map((v) => v.toFixed(3)).join(", ")}]</span></div>
        <div class="vec-row"><span class="vec-label">${t("mathLabPcaReal", lang)}</span><span class="vec-preview">[${tok.coords.map((v) => v.toFixed(3)).join(", ")}]</span></div>
      </div>
      <p class="footnote">${t("mathLabPcaFootnote", lang)}</p>
    `;
    this.#panelEl.querySelector(".sel-pca")!.addEventListener("change", (e) => {
      this.#selPca = Number((e.target as HTMLSelectElement).value);
      this.#renderPcaPanel();
    });
  }
}

customElements.define("vx-math-lab", VxMathLab);
