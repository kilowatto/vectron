import { attachShadow } from "./shadow";
import { getStoredLang, t } from "../../i18n";
import css from "./attentionArcs.css?inline";

/**
 * `<vx-attention-arcs>` — Módulo D del currículo de Intermedio (ver
 * DOCs/10-intermedio-licenciatura.md §3-4): "los tokens se miran entre
 * sí" como conducta, NO el heatmap PhD con \(QK^\top/\sqrt{d_k}\) (eso
 * es Avanzado → Math Lab). Tokens reales (los mismos que ya tokeniza
 * el composer) en una tira 2D; los arcos entre ellos son GROSOR
 * ILUSTRATIVO, declarado como tal — pedido explícito 2026-07-19: no
 * hay un forward pass real corriendo aquí, sería necesario correr un
 * transformer real (client-side o vía Workers AI) sólo para esta
 * demostración. El peso de cada arco es una función determinista del
 * PAR de tokens (mismo par → mismo peso siempre, no aleatorio en cada
 * frame) para que se sienta como "un patrón", no ruido.
 */
function pairWeight(a: string, b: string): number {
  const s = a + "|" + b;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 0.15 + ((h % 1000) / 1000) * 0.85; // 0.15..1.0, nunca invisible del todo
}

export class VxAttentionArcs extends HTMLElement {
  static readonly observedAttributes = ["stage"];
  #canvas!: HTMLCanvasElement;
  #ctx!: CanvasRenderingContext2D;
  #tokens: string[] = [];
  #hoverIdx: number | null = null;

  attributeChangedCallback() {
    this.#draw();
  }

  connectedCallback() {
    if (this.shadowRoot) return;
    const lang = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="head">
        <span class="label">${t("attentionArcsLabel", lang)}</span>
        <span class="declared">${t("attentionArcsDeclared", lang)}</span>
      </div>
      <canvas></canvas>
      <div class="empty">${t("attentionArcsEmpty", lang)}</div>
    `;
    this.#canvas = root.querySelector("canvas")!;
    this.#ctx = this.#canvas.getContext("2d")!;
    this.#canvas.addEventListener("pointermove", (e) => this.#onPointerMove(e));
    this.#canvas.addEventListener("pointerleave", () => {
      this.#hoverIdx = null;
      this.#draw();
    });
    new ResizeObserver(() => this.#draw()).observe(this.#canvas);
    this.#draw();
  }

  setTokens(tokens: string[]): void {
    this.#tokens = tokens.slice(0, 14); // tira legible, no una fila que no cabe
    this.#draw();
  }

  #tokenBoxes(): { x: number; w: number }[] {
    const stage = this.hasAttribute("stage");
    const width = this.#canvas.clientWidth || 280;
    const n = this.#tokens.length;
    if (n === 0) return [];
    const gap = stage ? 12 : 6;
    const boxW = Math.min(stage ? 96 : 56, (width - gap * (n - 1)) / n);
    const totalW = boxW * n + gap * (n - 1);
    const startX = (width - totalW) / 2;
    return this.#tokens.map((_, i) => ({ x: startX + i * (boxW + gap), w: boxW }));
  }

  #onPointerMove(e: PointerEvent) {
    const rect = this.#canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const boxes = this.#tokenBoxes();
    const idx = boxes.findIndex((b) => x >= b.x && x <= b.x + b.w);
    if (idx !== this.#hoverIdx) {
      this.#hoverIdx = idx === -1 ? null : idx;
      this.#draw();
    }
  }

  #draw() {
    if (!this.#ctx) return;
    // Promoción "stage size" (DOCs/13 §11.2, Phase 4) — mismo canvas,
    // mismo cálculo de arcos, sólo más grande cuando vive a pantalla
    // sobre #cube-pane en vez del dock chico.
    const stage = this.hasAttribute("stage");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.#canvas.clientWidth || 280;
    const height = stage ? Math.max(220, this.#canvas.clientHeight || 320) : 92;
    this.#canvas.width = width * dpr;
    this.#canvas.height = height * dpr;
    this.#canvas.style.height = `${height}px`;
    const ctx = this.#ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const root = this.shadowRoot!;
    (root.querySelector(".empty") as HTMLElement).hidden = this.#tokens.length > 0;
    if (this.#tokens.length === 0) return;

    const boxes = this.#tokenBoxes();
    const boxY = height - (stage ? 48 : 24);
    const arcBaseY = boxY - 4;

    // Arcos primero (detrás de las cajas) — de cada token hacia el
    // anterior y hacia el siguiente, y un puñado de saltos más largos
    // para que se sienta como "todos con todos", no sólo vecinos.
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (j - i > 1 && pairWeight(this.#tokens[i], this.#tokens[j]) < 0.55) continue;
        const w = pairWeight(this.#tokens[i], this.#tokens[j]);
        const highlighted = this.#hoverIdx === i || this.#hoverIdx === j;
        const cx1 = boxes[i].x + boxes[i].w / 2;
        const cx2 = boxes[j].x + boxes[j].w / 2;
        const archHeight = Math.min(50, Math.abs(cx2 - cx1) * 0.35);
        ctx.beginPath();
        ctx.moveTo(cx1, arcBaseY);
        ctx.bezierCurveTo(cx1, arcBaseY - archHeight, cx2, arcBaseY - archHeight, cx2, arcBaseY);
        ctx.strokeStyle = highlighted
          ? `rgba(217, 138, 52, ${0.5 + w * 0.5})`
          : `rgba(79, 184, 196, ${w * 0.55})`;
        ctx.lineWidth = highlighted ? 1.5 + w * 1.5 : 0.5 + w * 1.5;
        ctx.stroke();
      }
    }

    // Cajas de tokens.
    const boxH = stage ? 36 : 20;
    boxes.forEach((b, i) => {
      const active = this.#hoverIdx === i;
      ctx.fillStyle = active ? "rgba(217, 138, 52, 0.22)" : "rgba(231, 226, 214, 0.08)";
      ctx.strokeStyle = active ? "rgba(217, 138, 52, 0.6)" : "rgba(231, 226, 214, 0.18)";
      ctx.lineWidth = 1;
      const r = 4;
      ctx.beginPath();
      ctx.roundRect(b.x, boxY, b.w, boxH, r);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? "#e7e2d6" : "#9aa5ad";
      ctx.font = stage ? "13px var(--font-mono), monospace" : "9px var(--font-mono), monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxChars = stage ? 12 : 8;
      const label =
        this.#tokens[i].length > maxChars ? this.#tokens[i].slice(0, maxChars - 1) + "…" : this.#tokens[i];
      ctx.fillText(label, b.x + b.w / 2, boxY + boxH / 2);
    });
  }
}

customElements.define("vx-attention-arcs", VxAttentionArcs);
