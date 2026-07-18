import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import { DOMAIN_HUES } from "../../scene/particleField";
import { DOMAIN_LABEL_KEYS } from "./conceptCard";
import type { Mode } from "./modeStorage";
import css from "./colorKey.css?inline";

export interface DomainIsolateDetail {
  /** `null` = ya no hay ninguno aislado (se volvió a tocar el mismo, o
   * se cerró el panel). */
  domain: string | null;
}

export interface DomainCount {
  domain: string;
  count: number;
}

/**
 * `<vx-color-key>` — "peek + sheet": unos cuantos swatches siempre
 * visibles, tocar expande la lista completa de dominios VISIBLES en el
 * modo actual (P4, ver DOCs/05-hud-legends-zoom-colors.md §5). Aislar
 * un dominio es responsabilidad de quien la usa (main.ts) — este
 * componente sólo avisa qué se tocó vía `vx-domain-isolate`.
 *
 * ### Atributos
 * | nombre | tipo   | descripción |
 * |--------|--------|-------------|
 * | `mode` | string | `principiante`\|`intermedio`\|`avanzado` — cambia el copy y si se muestra el id crudo del dominio. |
 *
 * ### Métodos públicos
 * - `setVisibleDomains(domains)` — lista `{domain, count}` de lo que
 *   está VISIBLE ahora mismo (ya filtrado por POS) — llamar después de
 *   cada `applyMode`/morph.
 *
 * ### Eventos
 * - `vx-domain-isolate` — `CustomEvent<DomainIsolateDetail>`.
 */
export class VxColorKey extends HTMLElement {
  #peekEl!: HTMLButtonElement;
  #sheetEl!: HTMLDivElement;
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
      </button>
      <div class="sheet" hidden>
        <div class="list"></div>
      </div>
    `;
    this.#peekEl = root.querySelector(".peek")!;
    this.#sheetEl = root.querySelector(".sheet")!;
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
    // Si el dominio aislado ya no está visible (cambió el modo), soltar.
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

customElements.define("vx-color-key", VxColorKey);
