import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import { DOMAIN_HUES } from "../../scene/particleField";
import { DOMAIN_LABEL_KEYS } from "./conceptCard";
import type { Mode } from "./modeStorage";
import css from "./chromeLegend.css?inline";

export interface DomainIsolateDetail {
  /** `null` = ya no hay ninguno aislado. */
  domain: string | null;
}

export interface DomainCount {
  domain: string;
  count: number;
}

/**
 * `<vx-chrome-legend>` — DOCs/11-screen-specs.md §1/§3: fusiona lo que
 * antes eran dos componentes separados (`vx-color-key` +
 * `vx-kind-legend`) en UN solo pill colapsable. Motivo real
 * (auditoría con captura): dos peeks independientes apilados sobre el
 * cubo, más el dock con el composer aparte, hacían que el chrome se
 * sintiera huérfano — una sola pieza, un solo lugar por shell, es más
 * legible.
 *
 * Colapsado (default): un pill con 4-5 swatches de dominio + etiqueta.
 * Expandido: fila de chips de "tipos" (tamaño/líneas/tokens vivos) +
 * lista completa de dominios visibles con conteo (clic para aislar).
 *
 * Quien la usa (main.ts) decide DÓNDE vive según el shell — este
 * componente no sabe de grids ni de docks, sólo de su propio contenido
 * y de un atributo `dock` para el caso "vive en flujo normal dentro
 * del panel lateral" en vez de flotar sobre el cubo (mismo patrón que
 * `composer`/`tokenStrip`).
 *
 * ### Atributos
 * | nombre | tipo    | descripción |
 * |--------|---------|-------------|
 * | `mode` | string  | cambia copy/chips visibles. |
 * | `dock` | boolean | si está presente, vive en flujo normal (pie del dock) en vez de flotar sobre el cubo. |
 *
 * ### Métodos públicos
 * - `setMode(mode)`
 * - `setVisibleDomains(domains)`
 *
 * ### Eventos
 * - `vx-domain-isolate` — `CustomEvent<DomainIsolateDetail>`.
 */
export class VxChromeLegend extends HTMLElement {
  #peekEl!: HTMLButtonElement;
  #sheetEl!: HTMLDivElement;
  #kindsEl!: HTMLDivElement;
  #listEl!: HTMLDivElement;
  #mode: Mode = "intermedio";
  #domains: DomainCount[] = [];
  #expanded = false;
  #isolated: string | null = null;

  connectedCallback() {
    if (this.shadowRoot) return;
    this.#mode = (this.getAttribute("mode") as Mode) ?? "intermedio";

    const root = attachShadow(this, css);
    root.innerHTML = `
      <button type="button" class="peek">
        <span class="swatches"></span>
        <span class="label"></span>
        <span class="chevron">▾</span>
      </button>
      <div class="sheet" hidden>
        <div class="kinds"></div>
        <div class="list"></div>
      </div>
    `;
    this.#peekEl = root.querySelector(".peek")!;
    this.#sheetEl = root.querySelector(".sheet")!;
    this.#kindsEl = root.querySelector(".kinds")!;
    this.#listEl = root.querySelector(".list")!;

    this.#peekEl.addEventListener("click", () => {
      this.#expanded = !this.#expanded;
      this.#render();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.#expanded) {
        this.#expanded = false;
        this.#render();
      }
    });

    this.#render();
  }

  setMode(mode: Mode): void {
    this.#mode = mode;
    this.#render();
  }

  setVisibleDomains(domains: DomainCount[]): void {
    this.#domains = domains.slice().sort((a, b) => b.count - a.count);
    if (this.#isolated && !this.#domains.some((d) => d.domain === this.#isolated)) {
      this.#isolated = null;
    }
    this.#render();
  }

  #swatch(domain: string, size: number): string {
    const hue = DOMAIN_HUES[domain];
    const hex = typeof hue === "number" ? `#${hue.toString(16).padStart(6, "0")}` : "#9aa5ad";
    return `<span class="dot" style="width:${size}px;height:${size}px;background:${hex}"></span>`;
  }

  #renderKinds(lang: Lang): string {
    const chips: string[] = [
      `<span class="chip"><span class="kdot big"></span>${t("kindLegendNotable", lang)}</span>`,
    ];
    if (this.#mode !== "principiante") {
      chips.push(
        `<span class="chip"><span class="kline orange"></span>${t("kindLegendNeighbors", lang)}</span>`,
      );
    }
    chips.push(
      `<span class="chip"><span class="kline cyan"></span>${t("kindLegendPath", lang)}</span>`,
    );
    if (this.#mode === "avanzado") {
      chips.push(
        `<span class="chip"><span class="kdot bge"></span><span class="kdot gpt"></span><span class="kdot phrase"></span>${t("kindLegendTokens", lang)}</span>`,
      );
    }
    return chips.join("");
  }

  #render() {
    const lang: Lang = getStoredLang();
    this.#sheetEl.hidden = !this.#expanded;
    this.#peekEl.setAttribute("aria-expanded", String(this.#expanded));

    const top = this.#domains.slice(0, 5);
    this.#peekEl.querySelector(".swatches")!.innerHTML = top
      .map((d) => this.#swatch(d.domain, 10))
      .join("");
    this.#peekEl.querySelector(".label")!.textContent =
      this.#mode === "principiante"
        ? t("colorKeyLabelSimple", lang)
        : this.#mode === "avanzado"
          ? t("colorKeyLabelAvanzado", lang)
          : t("colorKeyLabelIntermedio", lang);

    this.#kindsEl.innerHTML = this.#renderKinds(lang);

    this.#listEl.innerHTML = this.#domains
      .map((d) => {
        const key = DOMAIN_LABEL_KEYS[d.domain];
        const name = key ? t(key, lang) : d.domain;
        const idSuffix = this.#mode === "avanzado" ? ` <small>${d.domain}</small>` : "";
        const active = this.#isolated === d.domain ? " active" : "";
        return `<button type="button" class="row${active}" data-domain="${d.domain}">
          ${this.#swatch(d.domain, 12)}
          <span class="name">${name}${idSuffix}</span>
          <span class="count">${d.count}</span>
        </button>`;
      })
      .join("");

    this.#listEl.querySelectorAll<HTMLButtonElement>(".row").forEach((row) => {
      row.addEventListener("click", () => {
        const domain = row.dataset.domain!;
        this.#isolated = this.#isolated === domain ? null : domain;
        this.dispatchEvent(
          new CustomEvent<DomainIsolateDetail>("vx-domain-isolate", {
            detail: { domain: this.#isolated },
          }),
        );
        this.#render();
      });
    });
  }
}

customElements.define("vx-chrome-legend", VxChromeLegend);
