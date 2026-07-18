export type Lang = "es" | "en";

const STORAGE_KEY = "vectron_lang";

export function getStoredLang(): Lang {
  return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
}

export function setStoredLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang);
}

/**
 * Diccionario de textos de la interfaz. Un cambio de idioma recarga la
 * página (igual que un cambio de modo) — cada componente lee el idioma
 * una vez al montarse, no hay reactividad en vivo dentro de una misma
 * sesión de página.
 */
const STRINGS = {
  // --- vx-mode-select ---
  modeSelectSub: {
    es: "¿Con qué profundidad quieres explorar cómo piensa un LLM?",
    en: "How deep do you want to go into how an LLM thinks?",
  },
  modePrincipianteTag: { es: "Intuición", en: "Intuition" },
  modePrincipianteTitle: { es: "Principiante", en: "Beginner" },
  modePrincipianteDesc: {
    es: "Explora el cubo con palabras y analogías simples — sin jerga técnica, sin números.",
    en: "Explore the cube with words and simple analogies — no technical jargon, no numbers.",
  },
  modeIntermedioTag: { es: "Mecanismo", en: "Mechanism" },
  modeIntermedioTitle: { es: "Intermedio", en: "Intermediate" },
  modeIntermedioDesc: {
    es: "Tokenización con IDs reales, embeddings, y similitud de coseno con datos reales.",
    en: "Tokenization with real IDs, embeddings, and cosine similarity with real data.",
  },
  modeAvanzadoTag: { es: "Matemática real", en: "Real math" },
  modeAvanzadoTitle: { es: "Avanzado", en: "Advanced" },
  modeAvanzadoDesc: {
    es: "Todo lo anterior, más el grafo de tensores y las ecuaciones reales de atención.",
    en: "Everything above, plus the tensor graph and the real attention equations.",
  },

  // --- vx-token-panel ---
  tokenPanelTitle: { es: "1 · Tokenización", en: "1 · Tokenization" },
  tokenPanelPlaceholderDefault: {
    es: "Escribe una frase o elige un ejemplo…",
    en: "Write a sentence or pick an example…",
  },
  tokenPanelPlaceholderPrincipiante: {
    es: "Escribe algo o toca un ejemplo…",
    en: "Write something or tap an example…",
  },
  tokenPanelPlaceholderAvanzado: {
    es: "Escribe una frase — abajo verás cada paso hasta la atención",
    en: "Write a sentence — scroll down to see every step through attention",
  },
  tokenPanelToggleBpe: { es: "BPE real", en: "Real BPE" },
  tokenPanelToggleSimple: { es: "Simplificado", en: "Simplified" },
  examplePhrase1: {
    es: "El Rinoceronte Naranja que viene de la sabana le gusta el café Frida Café",
    en: "The Orange Rhinoceros that comes from the savanna likes Frida Café coffee",
  },
  examplePhrase2: {
    es: "Python es un lenguaje de programación",
    en: "Python is a programming language",
  },
  examplePhrase3: { es: "La gravedad y la luz son física", en: "Gravity and light are physics" },
  examplePhrase4: {
    es: "El agujero negro está en la vía láctea",
    en: "The black hole is in the milky way",
  },

  // --- vx-concept-card ---
  cardNeighborsHeadDetailed: {
    es: "vecinos más cercanos (coseno real)",
    en: "closest neighbors (real cosine)",
  },
  cardNeighborsHeadSimple: { es: "palabras parecidas", en: "similar words" },
  cardNeighborsSearching: { es: "buscando…", en: "searching…" },
  cardNeighborsCalculating: { es: "calculando…", en: "calculating…" },
  cardHint: { es: "clic fuera o Esc para cerrar", en: "click outside or Esc to close" },
  domainMatematicas: { es: "Matemáticas", en: "Mathematics" },
  domainFisica: { es: "Física", en: "Physics" },
  domainProgramacion: { es: "Programación", en: "Programming" },
  domainBiologiaAnimal: { es: "Biología · animal", en: "Biology · animal" },
  domainBiologiaVegetal: { es: "Biología · vegetal", en: "Biology · plant" },
  domainMateriales: { es: "Materiales", en: "Materials" },
  domainGeografia: { es: "Geografía", en: "Geography" },
  domainAstronomia: { es: "Astronomía", en: "Astronomy" },
  domainSociedad: { es: "Sociedad", en: "Society" },

  // --- vx-dock-header ---
  dockTagAvanzado: {
    es: "avanzado · matemática real, sin atajos",
    en: "advanced · real math, no shortcuts",
  },
  dockTagIntermedio: {
    es: "intermedio · el mecanismo real, sin la matemática",
    en: "intermediate · the real mechanism, without the math",
  },

  // --- vx-mechanism-explainer ---
  mechH2Embedding: { es: "2 · Qué es un embedding", en: "2 · What an embedding is" },
  mechPEmbedding: {
    es: 'Cada palabra del cubo pasó por un modelo de embeddings de Cloudflare Workers AI (<code>@cf/baai/bge-base-en-v1.5</code>), que la convirtió en un vector de <b>768 números</b>. Ese vector es demasiado grande para dibujarlo, así que se redujo a 3 coordenadas (x, y, z) — la posición que ves en el cubo — con una técnica llamada PCA, que conserva las direcciones donde las palabras varían más entre sí.',
    en: 'Every word in the cube went through a Cloudflare Workers AI embedding model (<code>@cf/baai/bge-base-en-v1.5</code>), which turned it into a vector of <b>768 numbers</b>. That vector is too large to draw, so it was reduced to 3 coordinates (x, y, z) — the position you see in the cube — using a technique called PCA, which keeps the directions where words vary the most from each other.',
  },
  mechH2Close: { es: "3 · Por qué quedan cerca", en: "3 · Why they end up close together" },
  mechPClose: {
    es: 'Dos palabras quedan cerca en el cubo cuando sus 768 números originales son parecidos entre sí. Eso se mide con <b>similitud de coseno</b>: 1.0 significa "casi idénticos" en significado para el modelo, 0.0 significa "sin relación". Al hacer clic en cualquier partícula, las líneas que se trazan van hacia sus vecinos reales — calculados en el momento contra los 153 vectores guardados en Vectorize, no precalculados a mano.',
    en: 'Two words end up close in the cube when their original 768 numbers are similar to each other. That\'s measured with <b>cosine similarity</b>: 1.0 means "nearly identical" in meaning to the model, 0.0 means "unrelated". Clicking any particle draws lines to its real neighbors — computed on the spot against the 153 vectors stored in Vectorize, not precomputed by hand.',
  },
  mechH2NotYet: { es: "4 · Qué no hace todavía", en: "4 · What it doesn't do yet" },
  mechPNotYet: {
    es: 'Esto no ejecuta un modelo generativo — no "piensa" ni responde. Es la mitad del trabajo real de un LLM (convertir texto a vectores y medir cercanía); la otra mitad, cómo un Transformer usa esos vectores para predecir la siguiente palabra, está en el modo Avanzado.',
    en: 'This doesn\'t run a generative model — it doesn\'t "think" or answer. It\'s half of what an LLM actually does (turning text into vectors and measuring closeness); the other half, how a Transformer uses those vectors to predict the next word, is in Advanced mode.',
  },

  // --- vx-advanced-panel ---
  advH2Pipeline: {
    es: "2 · De la palabra al vector — el pipeline real de Vectron",
    en: "2 · From word to vector — Vectron's real pipeline",
  },
  advPPipeline: {
    es: "Cada partícula del cubo llegó a su posición así: la palabra se mandó a Workers AI (<code>@cf/baai/bge-base-en-v1.5</code>), que devolvió un vector de 768 números (su embedding); ese vector de 768 dimensiones se redujo a 3 con un PCA propio (rotación que conserva las direcciones de mayor varianza); esas 3 coordenadas son la posición xyz que ves en el cubo. Es el mismo proceso para las 153 palabras del dataset — por eso conceptos relacionados (galaxia, tierra, universo) quedan cerca de verdad, no por diseño manual.",
    en: "Every particle in the cube got to its position like this: the word was sent to Workers AI (<code>@cf/baai/bge-base-en-v1.5</code>), which returned a vector of 768 numbers (its embedding); that 768-dimensional vector was reduced to 3 with a custom PCA (a rotation that keeps the directions of highest variance); those 3 coordinates are the xyz position you see in the cube. It's the same process for all 153 words in the dataset — that's why related concepts (galaxy, earth, universe) end up genuinely close, not by manual design.",
  },
  advH2Attention: {
    es: "3 · Mecanismo de atención — con las matemáticas reales",
    en: "3 · The attention mechanism — with the real math",
  },
  advPAttention: {
    es: "Esto es distinto del paso anterior: es cómo un <i>Transformer</i> (el tipo de red detrás de un LLM generativo) calcula la atención, generalizado a los <b>n</b> tokens de arriba. Vectron no ejecuta todavía este forward pass en vivo sobre un modelo generativo — se muestra con las dimensiones reales de su propio pipeline (768) para enseñar el mecanismo, no como una simulación inventada.",
    en: "This is different from the previous step: it's how a <i>Transformer</i> (the kind of network behind a generative LLM) computes attention, generalized to the <b>n</b> tokens above. Vectron doesn't run this forward pass live on a generative model yet — it's shown with the real dimensions of its own pipeline (768) to teach the mechanism, not as a made-up simulation.",
  },
  advStep1: {
    es: '<b>n</b> = número de tokens actuales (arriba). 768 es la dimensión real del modelo de embeddings de Vectron — no la del Transformer original (ver nota al pie).',
    en: '<b>n</b> = current number of tokens (above). 768 is the real dimension of Vectron\'s embedding model — not the original Transformer\'s (see footnote).',
  },
  advStep2: {
    es: "W<sup>Q</sup>, W<sup>K</sup>, W<sup>V</sup> ∈ ℝ<sup>768×768</sup> son matrices de pesos aprendidas durante el entrenamiento — un parámetro por celda de cada matriz, ajustado por descenso de gradiente, no elegido a mano.",
    en: "W<sup>Q</sup>, W<sup>K</sup>, W<sup>V</sup> ∈ ℝ<sup>768×768</sup> are weight matrices learned during training — one parameter per cell of each matrix, adjusted by gradient descent, not chosen by hand.",
  },
  advStep3: {
    es: 'QK<sup>t</sup> mide la similitud entre cada par de tokens; softmax normaliza cada fila a una distribución de probabilidad; el resultado pondera V según esa atención — así cada token "mira" a los demás antes de seguir a la próxima capa.',
    en: 'QK<sup>t</sup> measures the similarity between every pair of tokens; softmax normalizes each row into a probability distribution; the result weights V according to that attention — this is how each token "looks at" the others before moving to the next layer.',
  },
  advFootnote: {
    es: "<b>Nota sobre d<sub>k</sub>:</b> en atención multi-cabeza, d<sub>k</sub> = d<sub>model</sub> / h. El paper original usa d<sub>model</sub> = 512 con h = 8 cabezas, por lo que d<sub>k</sub> = 64 — cifras del paper, distintas de los 768 del modelo de embeddings que usa Vectron.",
    en: "<b>Note on d<sub>k</sub>:</b> in multi-head attention, d<sub>k</sub> = d<sub>model</sub> / h. The original paper uses d<sub>model</sub> = 512 with h = 8 heads, so d<sub>k</sub> = 64 — the paper's own figures, different from the 768 of the embedding model Vectron uses.",
  },
  advCite: {
    es: 'Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., &amp; Polosukhin, I. (2017). <i>Attention Is All You Need.</i> NeurIPS 2017. — <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">arXiv:1706.03762</a>',
    en: 'Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., &amp; Polosukhin, I. (2017). <i>Attention Is All You Need.</i> NeurIPS 2017. — <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">arXiv:1706.03762</a>',
  },
  advTodo: {
    es: "Próximamente: muestreo del siguiente token (temperatura, top-k, top-p) como cadena de Markov.",
    en: "Coming soon: next-token sampling (temperature, top-k, top-p) as a Markov chain.",
  },
  advGraphTokens: { es: "tokens", en: "tokens" },
  advGraphEmbedding: { es: "embedding", en: "embedding" },
  advGraphSimilarity: { es: "similitud", en: "similarity" },
  advGraphWeights: { es: "pesos de atención", en: "attention weights" },
  advGraphWeighted: { es: "suma ponderada", en: "weighted sum" },
  advGraphOutput: { es: "Output", en: "Output" },

  // --- HUD ---
  hudLoading: { es: "cargando…", en: "loading…" },
  hudUnitPrincipiante: { es: "palabras", en: "words" },
  hudUnitIntermedio: { es: "embeddings", en: "embeddings" },
  hudUnitAvanzado: { es: "embeddings · ℝ⁷⁶⁸", en: "embeddings · ℝ⁷⁶⁸" },
  hudWebgpu: { es: "WebGPU · compute activo", en: "WebGPU · compute active" },
  hudWebgl: { es: "WebGL · modo compatible", en: "WebGL · compatibility mode" },
  hudError: { es: "error al iniciar el motor 3D", en: "error starting the 3D engine" },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
