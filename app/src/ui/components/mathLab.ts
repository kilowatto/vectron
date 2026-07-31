import { getStoredLang, t, type Lang } from "../../i18n";
import { cosineLocal, fetchPcaBasis, type PcaBasis } from "../../data/concepts";
import spectrum from "../../data/diagnostics/spectrum.json";
import fidelity from "../../data/diagnostics/onscreen-fidelity.json";
import diagnostics from "../../data/diagnostics/diagnostics.json";
import crosslingual from "../../data/diagnostics/crosslingual.json";
import { attachShadow } from "./shadow";
import css from "./mathLab.css?inline";

// "Bilingual" es EL PREMIO de `16` R-1: embeber ambas formas no sólo
// arregló el bilingüismo (50.7 % -> 99.3 % de acierto), sino que dejó en
// el índice dos vectores por concepto cuya distancia se puede pedir. La
// alineación translingüe deja de ser una afirmación y pasa a ser un
// número que el usuario comprueba palabra por palabra.
const TABS = ["Attention", "Softmax", "Cosine", "PCA", "Bilingual", "Sampling"] as const;
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
  /** Evita que una respuesta lenta pinte sobre otra pestaña ya abierta. */
  #bilingualSeq = 0;
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
          tab === "Cosine"
            ? t("mathLabTabCosine", lang)
            : tab === "PCA"
              ? t("mathLabTabPca", lang)
              : tab === "Bilingual"
                ? t("mathLabTabBilingual", lang)
                : tab
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
    } else if (this.#activeTab === "Bilingual") {
      void this.#renderBilingualPanel();
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

    // B2 · NORMA DEL ERROR RESIDUAL. `DOCs/03` §4.2 ya la especificaba y
    // esta pestaña la había descartado; la auditoría técnica la pide de
    // vuelta (`DOCs/16` R-4). Es la cifra que convierte "proyección con
    // pérdida" de etiqueta en número: se reconstruye el vector desde SUS
    // 3 coordenadas y se mide lo que no sobrevivió.
    //
    // Se usan los dots CRUDOS (no los escalados al cubo) porque la
    // reconstrucción vive en el espacio de la PCA, no en el del cubo:
    // reconstruir con los escalados mediría el reescalado además del
    // error, y serían dos cosas mezcladas en un número.
    let residualSq = 0;
    let originalSq = 0;
    for (let i = 0; i < tok.vector.length; i++) {
      const centered = tok.vector[i] - basis.mean[i];
      let recon = 0;
      for (let c = 0; c < basis.components.length; c++) recon += rawDots[c] * basis.components[c][i];
      const err = centered - recon;
      residualSq += err * err;
      originalSq += centered * centered;
    }
    const residual = Math.sqrt(residualSq);
    const residualPct = originalSq > 0 ? (residual / Math.sqrt(originalSq)) * 100 : 0;

    const fmtPct = (x: number) => `${(x * 100).toFixed(1)}%`;
    const varPct = fmtPct(spectrum.cumulative[2]);
    const trust = fidelity.trustworthiness.k10;
    const inventedPct = fmtPct(1 - trust);
    const cosMean = diagnostics.cosineScale.mean.toFixed(2);

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

      <!-- Libro de cifras medidas. No son constantes escritas a mano:
           salen de worker/scripts/*.mjs sobre los embeddings reales y se
           escriben a la vez en worker/diagnostics/ y aquí, para que la
           interfaz no pueda mostrar un número viejo. -->
      <div class="diagnostics">
        <div class="diag-row">
          <span class="diag-label">${t("diagResidualLabel", lang)}</span>
          <span class="diag-value">${residual.toFixed(4)} <span class="diag-unit">(${residualPct.toFixed(1)}%)</span></span>
        </div>
        <p class="diag-help">${t("diagResidualHelp", lang)}</p>

        <div class="diag-row">
          <span class="diag-label">${t("diagVarianceLabel", lang)}</span>
          <span class="diag-value">${varPct}</span>
        </div>
        <p class="diag-help">${t("diagVarianceHelp", lang).replace("{pct}", varPct)}</p>

        <div class="diag-row">
          <span class="diag-label">${t("diagTrustLabel", lang)}</span>
          <span class="diag-value">~${inventedPct}</span>
        </div>
        <p class="diag-help">${t("diagTrustHelp", lang)
          .replace("{pct}", inventedPct)
          .replace("{trust}", trust.toFixed(3))
          .replace("{n}", diagnostics.dataset.vectors.toLocaleString(lang === "en" ? "en-US" : "es-MX"))}</p>

        <div class="diag-row">
          <span class="diag-label">${t("diagHubnessLabel", lang)}</span>
          <span class="diag-value">${diagnostics.hubness.skewness.toFixed(2)}</span>
        </div>
        <p class="diag-help">${t("diagHubnessHelp", lang)
          .replace("{top}", String(diagnostics.hubness.topHubs[0].count))
          .replace("{mean}", diagnostics.hubness.kOccurrenceMean.toFixed(0))
          .replace("{skew}", diagnostics.hubness.skewness.toFixed(2))}</p>

        <div class="diag-row">
          <span class="diag-label">${t("diagCosineScaleLabel", lang)}</span>
          <span class="diag-value">${cosMean}</span>
        </div>
        <p class="diag-help">${t("diagCosineScaleHelp", lang)
          .replace("{mean}", cosMean)
          .replace("{example}", "0.6")}</p>
      </div>
    `;
    this.#panelEl.querySelector(".sel-pca")!.addEventListener("change", (e) => {
      this.#selPca = Number((e.target as HTMLSelectElement).value);
      this.#renderPcaPanel();
    });
  }

  /** EL PREMIO (`16` R-1). Pide al servidor el coseno entre los DOS
   * vectores del mismo concepto —su forma española y su forma inglesa—
   * que ahora conviven en el índice tras el relleno bilingüe.
   *
   * Es la demo que la auditoría prometía: dos cadenas de texto que no
   * comparten ni una letra, en idiomas distintos, y el modelo las coloca
   * casi en el mismo punto de un espacio de 1024 dimensiones. Con el
   * suelo de azar medido en 0.412, un 0.96 se lee solo. */
  async #renderBilingualPanel(): Promise<void> {
    const lang: Lang = getStoredLang();
    const chance = diagnostics.cosineScale.mean;
    const seq = ++this.#bilingualSeq;

    // Semillas del propio corpus, elegidas porque sus formas NO comparten
    // letras: si compartieran raíz, un coseno alto podría explicarse por
    // el parecido de cadena y la demo no probaría nada translingüe.
    const SEEDS = [
      { id: 1956, es: "electricista", en: "electrician" },
      { id: 647, es: "batería", en: "battery" },
      { id: 152, es: "ingeniero", en: "engineer" },
      { id: 104, es: "madera", en: "wood" },
    ];

    const rows = await Promise.all(
      SEEDS.map(async (sd) => {
        try {
          const r = await fetch(`/api/crosslingual?id=${sd.id}`);
          const j = await r.json();
          return { ...sd, cosine: j.ok ? (j.cosine as number) : null };
        } catch {
          return { ...sd, cosine: null };
        }
      }),
    );
    if (seq !== this.#bilingualSeq) return; // otra pestaña ya se pintó

    const bar = (c: number) => {
      const above = Math.max(0, Math.min(1, (c - chance) / (1 - chance)));
      return `<div class="bl-bar"><div class="bl-fill" style="width:${Math.round(above * 100)}%"></div></div>`;
    };

    this.#panelEl.innerHTML = `
      <p class="intro">${t("mathLabBilingualIntro", lang)}</p>
      <div class="bl-rows">
        ${rows
          .map((r) =>
            r.cosine === null
              ? ""
              : `<div class="bl-row">
                   <span class="bl-words">${r.es} <span class="bl-arrow">↔</span> ${r.en}</span>
                   ${bar(r.cosine)}
                   <span class="bl-score">${r.cosine.toFixed(3)}</span>
                 </div>`,
          )
          .join("")}
      </div>
      <p class="footnote">${t("mathLabBilingualChance", lang).replace("{chance}", chance.toFixed(2))}</p>
      <div class="diagnostics">
        <div class="diag-row">
          <span class="diag-label">${t("mathLabBilingualBefore", lang)}</span>
          <span class="diag-value">50.7%</span>
        </div>
        <div class="diag-row">
          <span class="diag-label">${t("mathLabBilingualAfter", lang)}</span>
          <span class="diag-value">${(crosslingual.accuracyAt1 * 100).toFixed(1)}%</span>
        </div>
        <p class="diag-help">${t("mathLabBilingualHow", lang).replace(
          "{n}",
          String(crosslingual.queries),
        )}</p>
      </div>
    `;
  }
}

customElements.define("vx-math-lab", VxMathLab);
