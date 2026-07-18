/**
 * Bloque de explicación del dock de Intermedio: el "cómo funciona" sin
 * fórmulas ni grafo de tensores (eso es exclusivo de Avanzado). Parte
 * permanente del layout, no un panel que se abre y cierra.
 */
export function createMechanismExplainer(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "dock-block";
  el.innerHTML = `
    <h3>2 · Qué es un embedding</h3>
    <p>
      Cada palabra del cubo pasó por un modelo de embeddings de Cloudflare
      Workers AI (<code>@cf/baai/bge-base-en-v1.5</code>), que la convirtió
      en un vector de <b>768 números</b>. Ese vector es demasiado grande
      para dibujarlo, así que se redujo a 3 coordenadas (x, y, z) — la
      posición que ves en el cubo — con una técnica llamada PCA, que
      conserva las direcciones donde las palabras varían más entre sí.
    </p>
    <h3>3 · Por qué quedan cerca</h3>
    <p>
      Dos palabras quedan cerca en el cubo cuando sus 768 números
      originales son parecidos entre sí. Eso se mide con
      <b>similitud de coseno</b>: 1.0 significa "casi idénticos" en
      significado para el modelo, 0.0 significa "sin relación". Al hacer
      clic en cualquier partícula, las líneas que se trazan van hacia sus
      vecinos reales — calculados en el momento contra los 153 vectores
      guardados en Vectorize, no precalculados a mano.
    </p>
    <h3>4 · Qué no hace todavía</h3>
    <p>
      Esto no ejecuta un modelo generativo — no "piensa" ni responde. Es la
      mitad del trabajo real de un LLM (convertir texto a vectores y medir
      cercanía); la otra mitad, cómo un Transformer usa esos vectores para
      predecir la siguiente palabra, está en el modo Avanzado.
    </p>
  `;
  return el;
}
