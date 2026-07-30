import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import css from "./failureLab.css?inline";
import experiments from "../../data/diagnostics/experiments.json";

/**
 * `<vx-failure-lab>` — los tres experimentos de fallo (D1–D3 de
 * `DOCs/27`).
 *
 * ### Por qué "fallo" y no "demostración"
 * `15` R-19: la plantilla predecir → ejecutar → observar → explicar de
 * `13` §2.14 es *"el patrón instruccional más fuerte del corpus"*, y
 * estaba confinada al capítulo de fallos. Chi et al. (1989),
 * Kapur (2008, fracaso productivo) y Bjork y Bjork (2011, dificultades
 * deseables) coinciden: predecir mal y ver por qué enseña más que leer
 * la respuesta correcta.
 *
 * Los tres experimentos atacan las tres cosas que el producto podría
 * estar enseñando mal sin darse cuenta:
 *   D1 · que la cercanía en pantalla signifique parecido    (`15` R-11)
 *   D2 · que "relacionado" signifique "de acuerdo"          (`16` R-14a)
 *   D3 · que todos los conceptos tengan el mismo peso       (`16` R-14b)
 *
 * ### Ningún número está escrito a mano
 * Todo sale de `experiments.json`, que genera
 * `worker/scripts/experiments.mjs` sobre el corpus real y escribe a la
 * vez en `worker/diagnostics/` y aquí. Un ejemplo pedagógico inventado
 * que resulta ser falso es peor que no tener ejemplo: enseña con la
 * autoridad del producto. Y si alguien recalcula, la interfaz no puede
 * quedarse con cifras viejas.
 */

type Stage = "predict" | "reveal";

/** Barra desde el SUELO DE AZAR, igual que en la tarjeta de concepto y
 * en la apertura. Llenarla desde 0 haría que 0.23 pintara casi un
 * cuarto del ancho cuando en realidad está POR DEBAJO de dos palabras
 * al azar — el experimento diría lo contrario de lo que pretende. */
function bar(cosine: number, chance: number): string {
  const above = (cosine - chance) / (1 - chance);
  const w = Math.max(0, Math.min(1, above));
  const cls = cosine < chance ? "bar-fill below" : "bar-fill";
  return `<div class="bar"><div class="${cls}" style="width:${Math.max(pctNum(w), 1.5)}%"></div></div>`;
}
const pctNum = (x: number) => Math.round(x * 100);

export class VxFailureLab extends HTMLElement {
  #root!: ShadowRoot;
  #open: "d1" | "d2" | "d3" | null = null;
  #stage: Stage = "predict";

  connectedCallback() {
    if (this.shadowRoot) return;
    this.#root = attachShadow(this, css);
    this.#render();
  }

  /** El idioma cambia en vivo (ver langSwitcher) — hay que poder
   * repintar sin perder en qué experimento estaba el usuario. */
  refresh(): void {
    if (this.shadowRoot) this.#render();
  }

  #render(): void {
    const lang: Lang = getStoredLang();
    const chance = experiments.chanceFloor;

    const cards = (["d1", "d2", "d3"] as const)
      .map((id) => {
        const open = this.#open === id;
        return `
        <section class="exp ${open ? "open" : ""}">
          <button class="exp-head" data-exp="${id}" aria-expanded="${open}">
            <span class="exp-title">${t(`fail_${id}_title` as never, lang)}</span>
            <span class="exp-chev">${open ? "−" : "+"}</span>
          </button>
          ${open ? this.#body(id, lang, chance) : ""}
        </section>`;
      })
      .join("");

    this.#root.innerHTML = `
      <div class="lab">
        <p class="lab-intro">${t("failLabIntro", lang)}</p>
        ${cards}
        <p class="lab-source">${t("failLabSource", lang).replace(
          "{n}",
          experiments.corpus.toLocaleString(lang === "en" ? "en-US" : "es-MX"),
        )}</p>
      </div>`;

    this.#root.querySelectorAll<HTMLButtonElement>("[data-exp]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.exp as "d1" | "d2" | "d3";
        this.#open = this.#open === id ? null : id;
        this.#stage = "predict";
        this.#render();
      }),
    );
    this.#root.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((b) =>
      b.addEventListener("click", () => {
        this.#stage = "reveal";
        this.#render();
      }),
    );
  }

  #body(id: "d1" | "d2" | "d3", lang: Lang, chance: number): string {
    if (this.#stage === "predict") {
      return `
        <div class="exp-body">
          <p class="q">${t(`fail_${id}_q` as never, lang)}</p>
          <div class="answers">
            <button class="ans" data-answer="a">${t(`fail_${id}_a` as never, lang)}</button>
            <button class="ans" data-answer="b">${t(`fail_${id}_b` as never, lang)}</button>
          </div>
        </div>`;
    }
    return `<div class="exp-body">${this.#reveal(id, lang, chance)}</div>`;
  }

  #reveal(id: "d1" | "d2" | "d3", lang: Lang, chance: number): string {
    if (id === "d1") {
      const inv = experiments.d1.invented[0];
      const lost = experiments.d1.lost[0];
      return `
        <p class="verdict">${t("fail_d1_verdict", lang)}</p>
        <div class="case">
          <div class="case-label">${t("fail_d1_caseInvented", lang)}</div>
          <div class="pair"><b>${inv.a.word}</b> ↔ <b>${inv.b.word}</b></div>
          <div class="metrics">
            <span>${t("failScreen", lang)} <b>${inv.screenDistance}</b></span>
            <span>${t("failCosine", lang)} <b>${inv.cosine}</b></span>
          </div>
          ${bar(inv.cosine, chance)}
          <p class="note">${t("fail_d1_noteInvented", lang).replace("{chance}", String(chance))}</p>
        </div>
        <div class="case">
          <div class="case-label">${t("fail_d1_caseLost", lang)}</div>
          <div class="pair"><b>${lost.a.word}</b> ↔ <b>${lost.b.word}</b></div>
          <div class="metrics">
            <span>${t("failScreen", lang)} <b>${lost.screenDistance}</b></span>
            <span>${t("failCosine", lang)} <b>${lost.cosine}</b></span>
          </div>
          ${bar(lost.cosine, chance)}
          <p class="note">${t("fail_d1_noteLost", lang)}</p>
        </div>
        <p class="explain">${t("fail_d1_explain", lang)
          .replace("{inv}", String(experiments.d1.counts.invented))
          .replace("{lost}", String(experiments.d1.counts.lost))}</p>
        <p class="tag">${t("failTagReal", lang)}</p>`;
    }

    if (id === "d2") {
      const rows = experiments.d2.pairs
        .slice(0, 5)
        .map(
          (p) => `
          <div class="row">
            <span class="row-words">${p.a.word} ↔ ${p.b.word}</span>
            ${bar(p.cosine, chance)}
            <span class="row-score">${p.cosine}</span>
          </div>`,
        )
        .join("");
      return `
        <p class="verdict">${t("fail_d2_verdict", lang).replace(
          "{top}",
          `<b>${experiments.d2.pairs[0].a.word} ↔ ${experiments.d2.pairs[0].b.word}</b>`,
        )}</p>
        <div class="rows">${rows}</div>
        <p class="explain">${t("fail_d2_explain", lang).replace("{chance}", String(chance))}</p>
        <p class="tag">${t("failTagReal", lang)}</p>`;
    }

    const hubs = experiments.d3.hubs.slice(0, 5);
    const max = hubs[0].count;
    const rows = hubs
      .map(
        (h) => `
        <div class="row">
          <span class="row-words">${h.word}</span>
          <div class="bar"><div class="bar-fill" style="width:${Math.round((h.count / max) * 100)}%"></div></div>
          <span class="row-score">${h.count}</span>
        </div>`,
      )
      .join("");
    return `
      <p class="verdict">${t("fail_d3_verdict", lang)
        .replace("{word}", `<b>${hubs[0].word}</b>`)
        .replace("{count}", String(hubs[0].count))
        .replace("{mean}", String(Math.round(experiments.d3.meanOccurrence)))}</p>
      <div class="rows">${rows}</div>
      <p class="explain">${t("fail_d3_explain", lang)}</p>
      <p class="tag">${t("failTagReal", lang)}</p>`;
  }
}

customElements.define("vx-failure-lab", VxFailureLab);
