import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import css from "./nextTokenBars.css?inline";

/**
 * `<vx-next-token-bars>` — Módulo C del currículo de Intermedio (ver
 * DOCs/10-intermedio-licenciatura.md §3): intuición de "el modelo
 * adivina el siguiente token" con barras de probabilidad + un slider
 * de temperatura, SIN pedir la fórmula de Softmax.
 *
 * Vocabulario de demostración fijo y declarado como tal — pedido
 * explícito 2026-07-19: no hay un modelo generador real conectado
 * todavía (eso es RAG/P8 o un LLM real), así que en vez de fingir
 * números reales que no lo son, esto usa un puñado de continuaciones
 * ilustrativas fijas por última palabra — mismo espíritu que las
 * "aproximaciones declaradas" ya usadas en PCA/atención (ver
 * tokenMode.ts). El slider de temperatura SÍ hace matemática real
 * (softmax(logit/T) de verdad) sobre esos logits ilustrativos — el
 * comportamiento (más plano al subir T) es el real, sólo los números
 * de entrada son de ejemplo.
 */
const DEMO_CONTINUATIONS: Record<string, [string, number][]> = {
  el: [
    ["gato", 4.2],
    ["sol", 3.8],
    ["agua", 3.1],
    ["libro", 2.9],
    ["cielo", 2.5],
  ],
  la: [
    ["casa", 4.1],
    ["luna", 3.9],
    ["vida", 3.3],
    ["puerta", 2.8],
    ["noche", 2.6],
  ],
  un: [
    ["perro", 4.0],
    ["coche", 3.6],
    ["árbol", 3.0],
    ["amigo", 2.7],
    ["día", 2.4],
  ],
  es: [
    ["un", 3.9],
    ["una", 3.7],
    ["muy", 3.2],
    ["el", 2.9],
    ["así", 2.3],
  ],
  default: [
    ["que", 3.5],
    ["de", 3.2],
    ["es", 3.0],
    ["y", 2.7],
    ["no", 2.4],
  ],
};

function softmax(logits: number[], temperature: number): number[] {
  const t = Math.max(0.05, temperature);
  const scaled = logits.map((l) => l / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export class VxNextTokenBars extends HTMLElement {
  #barsEl!: HTMLDivElement;
  #sliderEl!: HTMLInputElement;
  #tempValueEl!: HTMLSpanElement;
  #temperature = 1;
  #lastWord = "";

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="head">
        <span class="label">${t("nextTokenLabel", lang)}</span>
        <span class="declared">${t("nextTokenDeclared", lang)}</span>
      </div>
      <div class="bars"></div>
      <div class="temp-row">
        <span class="temp-label">${t("nextTokenTemp", lang)}</span>
        <input type="range" min="0.3" max="2" step="0.1" value="1" />
        <span class="temp-value">1.0</span>
      </div>
    `;
    this.#barsEl = root.querySelector(".bars")!;
    this.#sliderEl = root.querySelector('input[type="range"]')!;
    this.#tempValueEl = root.querySelector(".temp-value")!;
    this.#sliderEl.addEventListener("input", () => {
      this.#temperature = Number(this.#sliderEl.value);
      this.#tempValueEl.textContent = this.#temperature.toFixed(1);
      this.#render();
    });
    this.#render();
  }

  setText(text: string): void {
    const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    this.#lastWord = words[words.length - 1] ?? "";
    this.#render();
  }

  #render() {
    if (!this.#barsEl) return;
    const candidates = DEMO_CONTINUATIONS[this.#lastWord] ?? DEMO_CONTINUATIONS.default;
    const probs = softmax(candidates.map((c) => c[1]), this.#temperature);
    this.#barsEl.innerHTML = candidates
      .map(([word], i) => {
        const pct = (probs[i] * 100).toFixed(1);
        return `<div class="bar-row">
          <span class="word">${word}</span>
          <div class="track"><div class="fill" style="width:${pct}%"></div></div>
          <span class="pct">${pct}%</span>
        </div>`;
      })
      .join("");
  }
}

customElements.define("vx-next-token-bars", VxNextTokenBars);
