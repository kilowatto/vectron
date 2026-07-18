import { getStoredLang, setStoredLang, type Lang } from "../../i18n";
import { attachShadow } from "./shadow";
import css from "./langSwitcher.css?inline";

const LANGS: Lang[] = ["es", "en"];

/**
 * `<vx-lang-switcher>` — toggle ES/EN. Igual que `<vx-mode-switcher>`:
 * guarda el idioma elegido y recarga la página (no hay re-render en vivo
 * de textos dentro de una misma sesión de página).
 *
 * Sin atributos ni eventos — el idioma actual se lee de `localStorage`
 * en cada montaje.
 *
 * ### Ejemplo
 * ```html
 * <vx-lang-switcher></vx-lang-switcher>
 * ```
 */
export class VxLangSwitcher extends HTMLElement {
  connectedCallback() {
    const current = getStoredLang();
    const root = attachShadow(this, css);
    root.innerHTML = LANGS.map(
      (lang) =>
        `<button type="button" data-lang="${lang}" class="${lang === current ? "active" : ""}">${lang}</button>`,
    ).join("");

    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.dataset.lang as Lang;
        if (lang === current) return;
        setStoredLang(lang);
        location.reload();
      });
    });
  }
}

customElements.define("vx-lang-switcher", VxLangSwitcher);
