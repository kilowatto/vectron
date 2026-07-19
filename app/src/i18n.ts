export type Lang = "es" | "en";

const COOKIE_KEY = "vectron_lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

/** Inglés primero por default — sólo español si la cookie lo dice explícitamente. */
export function getStoredLang(): Lang {
  return readCookie(COOKIE_KEY) === "es" ? "es" : "en";
}

export function setStoredLang(lang: Lang): void {
  writeCookie(COOKIE_KEY, lang);
}

/**
 * Diccionario de textos de la interfaz. El cambio de idioma se
 * re-renderiza en vivo (ver vx-lang-change en langSwitcher.ts /
 * main.ts) — cada componente relevante vuelve a leer `getStoredLang()`
 * cuando se le pide reconstruirse, no hay que recargar la página.
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
    es: "El mismo mecanismo real que Intermedio, por ahora — la matemática completa (atención, tensores) vuelve con el dataset ampliado.",
    en: "The same real mechanism as Intermediate, for now — the full math (attention, tensors) returns with the expanded dataset.",
  },

  // --- vx-token-panel ---
  tokenPanelPlaceholderDefault: {
    es: "Escribe una frase o elige un ejemplo…",
    en: "Write a sentence or pick an example…",
  },
  tokenPanelPlaceholderPrincipiante: {
    es: "Escribe algo o toca un ejemplo…",
    en: "Write something or tap an example…",
  },
  tokenPanelClear: { es: "Limpiar", en: "Clear" },
  tokenPanelToggleBpe: { es: "BPE real", en: "Real BPE" },
  tokenRowGpt: { es: "GPT · cl100k_base", en: "GPT · cl100k_base" },
  tokenRowSimple: { es: "Simplificado (no real)", en: "Simplified (not real)" },
  tokenRowBge: {
    es: "BGE WordPiece (bge-base-en-v1.5) — cortes de referencia",
    en: "BGE WordPiece (bge-base-en-v1.5) — reference cuts",
  },
  tokenDisclaimer: {
    // Acortado (pedido explícito 2026-07-19, "menos alto... no gastar
    // espacio innecesario"): mismas dos advertencias reales (tokenizador
    // de referencia distinto del de bge-m3; posición aproximada por
    // embeberse aislado) en una fracción del espacio — el detalle de
    // SentencePiece/XLM-RoBERTa y de los cortes de GPT era información
    // real pero de más para un disclaimer en vivo, no algo que se
    // pierda (sigue documentado en DOCs).
    es: "Cortes de referencia del WordPiece real de BGE (bge-m3 usa otro tokenizador, no implementado aquí). Cada fragmento se embebe aislado — su posición es una aproximación; el modelo real lee todo en contexto.",
    en: "Reference cuts from BGE's real WordPiece tokenizer (bge-m3 uses a different one, not implemented here). Each fragment is embedded in isolation — its position is an approximation; the real model reads everything in context.",
  },
  tokenPhraseLabel: { es: "frase completa", en: "full phrase" },
  tokenCompareToggle: {
    es: "comparar con el tokenizador WordPiece de BGE (referencia)",
    en: "compare with BGE's WordPiece tokenizer (reference)",
  },
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
  domainHistoria: { es: "Historia", en: "History" },
  domainMitologia: { es: "Mitología", en: "Mythology" },
  domainQuimica: { es: "Química", en: "Chemistry" },
  domainTecnologia: { es: "Tecnología", en: "Technology" },
  domainCualidadesYAcciones: { es: "Cualidades y acciones", en: "Qualities and actions" },
  domainDeportes: { es: "Deportes", en: "Sports" },
  domainGastronomia: { es: "Gastronomía", en: "Gastronomy" },
  domainMusica: { es: "Música", en: "Music" },
  domainArteYCultura: { es: "Arte y Cultura", en: "Art and Culture" },
  domainMedicinaYSalud: { es: "Medicina y Salud", en: "Medicine and Health" },
  domainEconomiaYNegocios: { es: "Economía y Negocios", en: "Economy and Business" },
  domainPersonajes: { es: "Personajes", en: "Notable People" },
  domainEmociones: { es: "Emociones", en: "Emotions" },
  domainHogar: { es: "Hogar", en: "Home" },
  domainTransporte: { es: "Transporte", en: "Transportation" },
  domainRopa: { es: "Ropa", en: "Clothing" },
  domainClima: { es: "Clima", en: "Weather" },
  domainHerramientas: { es: "Herramientas", en: "Tools" },
  domainVideojuegos: { es: "Videojuegos", en: "Video Games" },
  domainFestividades: { es: "Festividades", en: "Holidays" },
  domainFilosofia: { es: "Filosofía", en: "Philosophy" },
  domainIdiomas: { es: "Idiomas", en: "Languages" },
  domainGramatica: { es: "Gramática", en: "Grammar" },
  domainLexicoVerbal: { es: "Léxico · verbos", en: "Lexicon · verbs" },
  domainLexicoAdjetival: { es: "Léxico · adjetivos", en: "Lexicon · adjectives" },
  domainTokenVivo: { es: "Token en vivo", en: "Live token" },

  // --- HUD ---
  hudLoading: { es: "cargando…", en: "loading…" },
  hudUnitPrincipiante: { es: "palabras", en: "words" },
  hudUnitIntermedio: { es: "embeddings", en: "embeddings" },
  hudUnitAvanzado: {
    es: "embeddings · ℝ¹⁰²⁴ · ~600M parámetros",
    en: "embeddings · ℝ¹⁰²⁴ · ~600M parameters",
  },
  hudWebgpu: { es: "WebGPU · compute activo", en: "WebGPU · compute active" },
  hudWebgl: { es: "WebGL · modo compatible", en: "WebGL · compatibility mode" },
  hudError: { es: "error al iniciar el motor 3D", en: "error starting the 3D engine" },

  // --- P4: vx-color-key ---
  colorKeyLabelSimple: { es: "colores = temas", en: "colors = themes" },
  colorKeyLabelIntermedio: { es: "dominios", en: "domains" },
  colorKeyLabelAvanzado: { es: "domain hues", en: "domain hues" },

  // --- P5: vx-boot-splash ---
  bootShell: { es: "iniciando…", en: "starting…" },
  bootDataset: { es: "cargando conceptos…", en: "loading concepts…" },
  bootGpu: { es: "preparando GPU…", en: "preparing GPU…" },
  bootTokenizers: { es: "cargando tokenizadores…", en: "loading tokenizers…" },
  bootWarm: { es: "calentando motor…", en: "warming up engine…" },
  bootReady: { es: "listo", en: "ready" },

  // --- P6: vx-math-arena + vx-surface-toggle ---
  mathArenaComingSoon: { es: "Math Arena — próximamente", en: "Math Arena — coming soon" },
  mathArenaNote: {
    es: "Atención, softmax, coseno, PCA y muestreo con números y fórmulas reales, en vivo con tu frase — P7.",
    en: "Attention, softmax, cosine, PCA and sampling with live real numbers and formulas from your sentence — P7.",
  },
  surfaceCube: { es: "Cubo", en: "Cube" },
  surfaceMath: { es: "Matemáticas", en: "Math" },
  // --- Intermedio: nav de 3 superficies hermanas (DOCs/13 §3-4) ---
  intermediateSurfaceCube: { es: "Cubo", en: "Cube" },
  intermediateSurfaceTransformer: { es: "Transformer", en: "Transformer" },
  intermediateSurfaceRag: { es: "RAG", en: "RAG" },
  transformerDockIntro: {
    es: "Cómo se mira, se atiende y se predice el siguiente token dentro del modelo — capítulos Contexto → Atención → Predicción.",
    en: "How the model looks at, attends to, and predicts the next token — chapters Context → Attention → Prediction.",
  },
  ragDockIntro: {
    es: "Recuperar antes de generar: una pregunta trae trozos reales de un archivo externo a la mesa de trabajo, en vez de que el modelo invente.",
    en: "Retrieve before generating: a question brings real chunks from an external file to the working desk, instead of the model making things up.",
  },
  // --- P7: vx-math-arena, pestaña Cosine (primera rebanada real) ---
  mathArenaTabCosine: { es: "Coseno", en: "Cosine" },
  mathArenaCosineEmpty: {
    es: "Escribe una frase (Avanzado) para tener al menos dos embeddings vivos que comparar.",
    en: "Type a phrase (Avanzado) to have at least two live embeddings to compare.",
  },
  mathArenaCosineIntro: {
    es: "Los mismos embeddings bge-m3 reales de tu frase (ℝ¹⁰²⁴) — elige dos y compara su similitud de coseno real, con la fórmula y los números de verdad.",
    en: "The same real bge-m3 embeddings from your phrase (ℝ¹⁰²⁴) — pick two and compare their real cosine similarity, with the actual formula and numbers.",
  },
  mathArenaCosineFootnote: {
    es: "A y B se muestran truncados a 6 de 1024 dimensiones para que quepan en pantalla — el cálculo usa el vector completo.",
    en: "A and B are shown truncated to 6 of 1024 dimensions to fit on screen — the calculation uses the full vector.",
  },
  mathArenaTabPca: { es: "PCA", en: "PCA" },
  mathArenaPcaLoading: { es: "cargando la base PCA real…", en: "loading the real PCA basis…" },
  mathArenaPcaIntro: {
    es: "De ℝ¹⁰²⁴ a ℝ³: la misma base PCA real que ya coloca esta partícula en el cubo — restar la media, proyectar sobre cada eje, escalar al tamaño del cubo. El resultado de abajo es EXACTAMENTE dónde vive ahora mismo.",
    en: "From ℝ¹⁰²⁴ to ℝ³: the same real PCA basis that already places this particle in the cube — subtract the mean, project onto each axis, scale to the cube. The result below is EXACTLY where it lives right now.",
  },
  mathArenaPcaComputed: { es: "recalculado aquí", en: "recomputed here" },
  mathArenaPcaReal: { es: "posición real de la partícula", en: "particle's real position" },
  mathArenaPcaFootnote: {
    es: "Si los dos renglones no coinciden, es un bug — deberían ser el mismo número siempre (misma base, mismo vector).",
    en: "If the two rows don't match, that's a bug — they should always be the same number (same basis, same vector).",
  },
  pipelineDockText: { es: "1 · Texto", en: "1 · Text" },
  pipelineDockTokens: { es: "2 · Tokens + IDs", en: "2 · Tokens + IDs" },
  // DOCs/10-intermedio-licenciatura.md: currículo de licenciatura, no
  // el paper de Attention — vocabulario correcto, sin álgebra.
  pipelineDockIntro: {
    es: "1-2 · Tu texto se corta en tokens con ID real (arriba). 3 · Cada token se embebe en ℝ¹⁰²⁴ (bge-m3, números reales).",
    en: "1-2 · Your text is cut into tokens with a real ID (above). 3 · Each token embeds into ℝ¹⁰²⁴ (bge-m3, real numbers).",
  },
  pipelineDockNeighbors: {
    es: "4 · Fija una partícula en el cubo para ver sus vecinos reales",
    en: "4 · Pin a particle in the cube to see its real neighbors",
  },
  failureModesNote: {
    es: "G · Fallos reales: la misma palabra puede ser dos conceptos distintos (polisemia) — prueba a escribir \"banco\" o \"hoja\" arriba y mira dos partículas separadas encenderse. Cuando los vecinos son débiles, la respuesta puede \"sonar bien\" y estar mal — eso es alucinación.",
    en: "G · Real failure modes: the same word can be two different concepts (polysemy) — try typing \"banco\" or \"hoja\" above and watch two separate particles light up. When neighbors are weak, an answer can \"sound right\" and be wrong — that's hallucination.",
  },
  // --- Módulo E: vx-context-lab (DOCs/12-context-window-lab.md) ---
  contextLabLabel: { es: "E · laboratorio de ventana de contexto", en: "E · context window lab" },
  contextLabContract: {
    es: "La ventana de contexto es todo lo que el modelo puede ver a la vez para responder: tu mensaje, el historial, herramientas… y su propia respuesta. No es su memoria para siempre. No es lo que aprendió en el entrenamiento.",
    en: "The context window is everything the model can see at once to answer: your message, history, tools… and its own reply. It's not permanent memory. It's not what it learned during training.",
  },
  contextLabLabWindow: {
    es: "ventana de laboratorio (500) — artificial, para que sientas el límite",
    en: "lab window (500) — artificial so you can feel the limit",
  },
  contextLabPasteLong: { es: "pegar texto largo", en: "paste long text" },
  contextLabReset: { es: "reiniciar", en: "reset" },
  contextLabOverflowNote: {
    es: "Los tokens más antiguos ya no entran — el modelo no los ve. (FIFO expulsa lo viejo, no lo nuevo.)",
    en: "The oldest tokens no longer fit — the model doesn't see them. (FIFO evicts the old, not the new.)",
  },
  contextLabEmpty: { es: "escribe algo arriba para llenar la mesa", en: "type something above to fill the desk" },
  contextLabCompareHead: { es: "comparar escritorios reales (≈ jul 2026)", en: "compare real desks (≈ jul 2026)" },
  contextLabModelLab: { es: "lab (aquí)", en: "lab (here)" },
  contextLabModelChatgpt: { es: "ChatGPT Thinking", en: "ChatGPT Thinking" },
  contextLabModelClaude: { es: "Claude Sonnet 5", en: "Claude Sonnet 5" },
  contextLabTermWindow: { es: "ventana de contexto", en: "context window" },
  contextLabTermWindowDesc: {
    es: "mesa de trabajo de esta conversación",
    en: "the working desk for this conversation",
  },
  contextLabTermTraining: { es: "conocimiento del entrenamiento", en: "training knowledge" },
  contextLabTermTrainingDesc: {
    es: "lo aprendido al entrenar — no cabe \"todo el mundo\" en la ventana",
    en: "what it learned during training — the window can't hold \"everything\"",
  },
  contextLabTermRag: { es: "memoria / RAG / archivos", en: "memory / RAG / files" },
  contextLabTermRagDesc: {
    es: "guardar fuera y traer trozos a la mesa (ver Módulo F)",
    en: "store elsewhere and bring pieces to the desk (see Module F)",
  },
  contextLabFootnote: {
    es: "GPT-5 (familia, API) soporta ~400 000 — ese NO es el límite del producto ChatGPT, es un número de API distinto. bge-m3 (el embedder real que ya usa el cubo) soporta hasta 8 192 tokens — nota aparte, no es el número protagonista arriba.",
    en: "GPT-5 (family, API) supports ~400,000 — that is NOT the ChatGPT product limit, it's a separate API number. bge-m3 (the real embedder the cube already uses) supports up to 8,192 tokens — a separate footnote, not the hero number above.",
  },
  truthLabelReal: { es: "real", en: "real" },
  truthLabelIllustrative: { es: "ilustrativo", en: "illustrative" },
  truthLabelSimulation: { es: "simulado", en: "simulated" },
  nextTokenLabel: { es: "C · intuición del siguiente token", en: "C · next-token intuition" },
  nextTokenDeclared: { es: "vocabulario de ejemplo, declarado", en: "demo vocabulary, declared" },
  nextTokenTemp: { es: "temperatura", en: "temperature" },
  attentionArcsLabel: { es: "D · cómo se miran los tokens", en: "D · how tokens attend" },
  attentionArcsDeclared: { es: "pesos ilustrativos, declarados", en: "illustrative weights, declared" },
  attentionArcsEmpty: { es: "escribe algo arriba para ver los arcos", en: "type something above to see the arcs" },
  ragLabel: { es: "F · RAG: pregunta → chunks → respuesta", en: "F · RAG: question → chunks → answer" },
  ragDeclared: { es: "recuperación real, respuesta de ejemplo", en: "real retrieval, demo answer" },
  ragPlaceholder: { es: "haz una pregunta…", en: "ask a question…" },
  ragAsk: { es: "preguntar", en: "ask" },
  ragRetrieving: { es: "buscando vecinos reales…", en: "searching real neighbors…" },
  ragError: { es: "no se pudo calcular el embedding", en: "couldn't compute the embedding" },
  ragNoChunks: { es: "sin vecinos suficientemente cercanos", en: "no sufficiently close neighbors" },
  ragAnswerDeclared: {
    es: "sin un modelo generador conectado todavía (ver P8) — esto es una plantilla sobre los conceptos de arriba, de verdad recuperados, no una respuesta generada.",
    en: "no generator model connected yet (see P8) — this is a template over the concepts above, really retrieved, not a generated answer.",
  },
  ragAnswerPrefix: {
    es: "Lo más relacionado con tu pregunta en el dataset es:",
    en: "The most related things to your question in the dataset are:",
  },

  // --- P4: vx-kind-legend ---
  kindLegendNotable: { es: "luz grande = destacado", en: "big light = notable" },
  kindLegendNeighbors: { es: "vecinos (coseno real)", en: "neighbors (real cosine)" },
  kindLegendPath: { es: "camino de tu frase", en: "your phrase's path" },
  kindLegendTokens: { es: "BGE · GPT · frase (vivo)", en: "BGE · GPT · phrase (live)" },
  kindLegendPeek: { es: "¿qué significa esto?", en: "what does this mean?" },

  // --- P2: explicación pedagógica del embedding de frase (tokenMode.ts) ---
  tokenPhraseExplainIntro: {
    es: "Esta es la luz grande: el embedding de tu FRASE COMPLETA, no de un token suelto — un vector propio que el modelo calcula para el significado conjunto, no el promedio de sus piezas. Por eso puede proyectarse lejos de sus tokens en el cubo: no es un error de posición, es la geometría real.",
    en: "This is the big light: the embedding of your FULL PHRASE, not a single token — its own vector, computed by the model for the combined meaning, not the average of its pieces. That's why it can project far from its tokens in the cube: not a position bug, just real geometry.",
  },
  tokenPhraseExplainMetricPrefix: {
    es: "Si fuera un simple promedio de sus",
    en: "If it were a simple average of its",
  },
  tokenPhraseExplainMetricMid: {
    es: "tokens, su coseno con ese promedio sería 1.000 — en la realidad es",
    en: "tokens, its cosine with that average would be 1.000 — in reality it's",
  },
  tokenPhraseExplainGap: {
    es: "Esa diferencia es justo lo que el modelo entiende más allá de la suma de las partes.",
    en: "That gap is exactly what the model understands beyond the sum of its parts.",
  },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
