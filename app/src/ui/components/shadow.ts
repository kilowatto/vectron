/**
 * Monta un Shadow DOM abierto en `el` con `css` como su única hoja de
 * estilos (vía `adoptedStyleSheets`, no un `<style>` de texto — evita
 * reparsear la hoja por instancia si el navegador la cachea por
 * identidad de CSSStyleSheet, aunque aquí cada componente construye la
 * suya propia). Las custom properties definidas en :root (ver
 * src/style.css) atraviesan el límite del shadow root normalmente, así
 * que el CSS de cada componente puede usar var(--ink) etc. sin
 * necesidad de duplicarlas.
 */
export function attachShadow(el: HTMLElement, css: string): ShadowRoot {
  const root = el.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  root.adoptedStyleSheets = [sheet];
  return root;
}
