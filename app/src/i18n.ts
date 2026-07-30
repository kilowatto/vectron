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
  // --- vx-level-select ---
  levelSelectSub: {
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
  // E3 (DOCs/27, 16 R-10): el borrado de acentos, visible.
  tokenAccentStripped: {
    es: "El tokenizador quita mayúsculas y acentos antes de mirar tu texto — para el modelo, esto es lo mismo:",
    en: "The tokenizer strips case and accents before looking at your text — to the model, these are identical:",
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
  // "coseno real" era falso aquí y lo marcó la auditoría técnica
  // (`DOCs/16` R-6): esta lista sale de `VECTORIZE.query()`, que es
  // búsqueda APROXIMADA de vecinos (ANN, con IVF + cuantización de
  // producto) y devuelve una puntuación aproximada, no el coseno exacto.
  // El coseno exacto sí existe en el producto, pero en otro sitio:
  // `/api/cosine` del Math Lab, que sigue etiquetado como real porque lo
  // es. Mezclar los dos nombres enseñaba una precisión que no hay.
  cardNeighborsHeadDetailed: {
    es: "vecinos aproximados (ANN · coseno aprox.)",
    en: "approximate neighbors (ANN · approx. cosine)",
  },
  cardNeighborsHeadSimple: { es: "palabras parecidas", en: "similar words" },
  cardNeighborsSearching: { es: "buscando…", en: "searching…" },
  cardNeighborsCalculating: { es: "calculando…", en: "calculating…" },
  // F2 §5.3/§5.5 (P-22): la onda/resortes entre vecinas al fijar un
  // concepto es espectáculo con metáfora DECLARADA — un LLM no propaga
  // activación entre embeddings almacenados. Visible en Int/Avanzado.
  // Corrección 3 de `26` D-4: rótulo VISIBLE. Sin él, las líneas se leen
  // como "aquí está el grafo de conceptos" — un hecho del modelo. Con
  // él son lo que de verdad son: el resultado de UNA consulta con UN k
  // elegido. Un embedding es un espacio métrico, no un grafo; el grafo
  // no existe hasta que eliges k.
  kSliderAria: { es: "Cuántos vecinos mostrar", en: "How many neighbours to show" },
  kSliderLesson: {
    es: "Muévelo: la red aparece y desaparece con tu mano. No es una estructura del modelo — es el corte que TÚ elegiste. Todo concepto tiene una distancia a todos los demás; el grafo no existe hasta que fijas un k.",
    en: "Move it: the network appears and disappears with your hand. It isn't a structure in the model — it's the cut YOU chose. Every concept has a distance to every other; the graph doesn't exist until you fix a k.",
  },
  linesDeclared: {
    es: "las {k} más cercanas de {total}, por similitud coseno en ℝ¹⁰²⁴",
    en: "the {k} closest of {total}, by cosine similarity in ℝ¹⁰²⁴",
  },
  linesAsymmetric: {
    es: "las líneas cortadas no devuelven el favor: tú eres su vecino, ellas no el tuyo (hubness)",
    en: "cut lines don't return the favour: you're their neighbour, they're not yours (hubness)",
  },
  cardMetaphorLabel: { es: "metáfora, no mecanismo", en: "metaphor, not mechanism" },
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
  // F2 §5.2 — caption sobrio del cambio de nivel: el morph de modo queda
  // absorbido en un cambio de filtro; el presupuesto de motion vive en
  // las transiciones celulares (15 R-8 / 20 H-02).
  modeFilterCaption: { es: "el modelo no cambió, tu filtro sí", en: "the model didn't change, your filter did" },
  // F2 §5.4 — tag del QualityGovernor al bajar de tier: la degradación
  // se COMUNICA, nunca es silenciosa (18 §5).
  hudQualityMode: { es: "modo rendimiento", en: "performance mode" },
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

  // --- F1.3: vx-cellular-loader (DOCs/21 §4.3) ---
  // Línea de orientación (advance organizer): estática, bajo la marca.
  bootTagline: {
    // C5 de DOCs/27 §7.2. Antes decía "las que significan parecido viven
    // cerca" — la afirmación que `15` §3.4 y `16` R-3 declaran
    // indefendible, y que la Fase B convirtió en una CONTRADICCIÓN
    // interna: el Math Lab publica que ~31 % de lo que se ve cerca NO lo
    // está (trustworthiness 0.694 medida sobre los 20 473 conceptos).
    // Y estaba mal repartida: la frase falsa la leía todo el mundo en la
    // primera pantalla; la corrección sólo llegaba a quien entrara a
    // Avanzado y abriera una pestaña.
    //
    // La promesa honesta se ata a la CONSULTA y al destello, no a la
    // geometría: "pide una palabra y las relacionadas se encienden" es
    // enteramente cierto — el destello sale de una búsqueda en las 1024
    // dimensiones completas, no de la distancia en pantalla.
    es: "Cada luz es una palabra. Pide una y las relacionadas se encienden.",
    en: "Each light is a word. Ask for one and the related ones light up.",
  },
  // Denominador del contador de boot. {n} se sustituye con el total de
  // palabras del modo, ya formateado con separador de miles.
  bootOfWords: { es: "de {n} palabras", en: "of {n} words" },
  bootErrorTitle: { es: "No pudimos arrancar", en: "We couldn't start" },
  bootErrorBody: {
    es: "Falló la red, el dataset o la GPU durante la carga. Revisa tu conexión y reintenta.",
    en: "The network, dataset, or GPU failed during loading. Check your connection and retry.",
  },
  bootRetry: { es: "Reintentar", en: "Retry" },

  // --- F2 §5.4: vx-drawer (cajones del rediseño GUI) ---
  drawerClose: { es: "Cerrar", en: "Close" },
  drawerSurfacesLabel: { es: "Superficies", en: "Surfaces" },
  drawerMathLabel: { es: "Laboratorio de matemáticas", en: "Math Lab" },
  drawerZoomLabel: { es: "Zoom", en: "Zoom" },

  // --- P6: vx-math-lab + vx-surface-toggle ---
  mathLabComingSoon: { es: "Math Lab — próximamente", en: "Math Lab — coming soon" },
  mathLabNote: {
    es: "Atención, softmax, coseno, PCA y muestreo con números y fórmulas reales, en vivo con tu frase — P7.",
    en: "Attention, softmax, cosine, PCA and sampling with live real numbers and formulas from your sentence — P7.",
  },
  surfaceCube: { es: "Cubo", en: "Cube" },
  surfaceMath: { es: "Matemáticas", en: "Math" },
  // Bug real reportado en vivo ("no veo cómo activar el vaso"): en
  // angosto, el panel de Transformer/RAG cubre TODA la pantalla
  // (#side-pane fixed, ver style.css) — sin este botón no hay forma de
  // ver la Cámara de Contexto (u otra visualización de la superficie),
  // que sólo existe detrás de ese panel, nunca dentro de él.
  chamberPeekShow: { es: "Ver escena 3D", en: "View 3D scene" },
  chamberPeekHide: { es: "Volver al texto", en: "Back to text" },
  // --- Intermedio: nav de 3 superficies hermanas (DOCs/13 §3-4) ---
  intermediateSurfaceCube: { es: "Cubo", en: "Cube" },
  intermediateSurfaceTransformer: { es: "Transformer", en: "Transformer" },
  intermediateSurfaceRag: { es: "RAG", en: "RAG" },
  // --- Fase 4: nav de capítulos + diagrama de bloques (DOCs/13 §11) ---
  transformerChapterInput: { es: "Entrada", en: "Input" },
  transformerChapterContext: { es: "Contexto", en: "Context" },
  transformerChapterAttention: { es: "Atención", en: "Attention" },
  transformerChapterBlocks: { es: "Bloques", en: "Blocks" },
  transformerChapterPrediction: { es: "Predicción", en: "Prediction" },
  transformerInputStageNote: {
    es: "La entrada ya se ve en vivo en el Cubo: tu texto se corta en tokens con ID real y cada uno se embebe en ℝ¹⁰²⁴. Vuelve a Cubo para verlo, o sigue a Contexto →",
    en: "Input already lives in the Cube: your text is cut into tokens with a real ID and each one embeds into ℝ¹⁰²⁴. Go to Cube to see it, or continue to Context →",
  },
  blockDiagramLabel: { es: "Bloques del transformer", en: "Transformer blocks" },
  blockDiagramDeclared: { es: "esquema ilustrativo, no pesos reales", en: "illustrative schematic, not real weights" },
  blockDiagramEmbed: { es: "embeber", en: "embed" },
  blockDiagramAttention: { es: "atención", en: "attention" },
  blockDiagramResidual: { es: "residual + norma", en: "residual + norm" },
  blockDiagramMlp: { es: "MLP", en: "MLP" },
  blockDiagramRepeat: { es: "se repite × N capas", en: "repeats × N layers" },
  blockDiagramOutput: { es: "salida → siguiente token", en: "output → next token" },
  transformerDockIntro: {
    es: "Cómo se mira, se atiende y se predice el siguiente token dentro del modelo — capítulos Contexto → Atención → Predicción.",
    en: "How the model looks at, attends to, and predicts the next token — chapters Context → Attention → Prediction.",
  },
  // --- Cámara de Contexto 3D (DOCs/13 §2.7/§9, Phase 2) ---
  contextChamberLabel: { es: "Cámara de contexto (3D)", en: "Context chamber (3D)" },
  contextChamberIntro: {
    es: "Conversación simulada, turnos y tokens reales: cada turno es una gota. Cuando ya no cabe, FIFO expulsa el turno más viejo — nunca el más nuevo.",
    en: "Simulated conversation, real turns and tokens: each turn is a drop. When it stops fitting, FIFO evicts the oldest turn — never the newest.",
  },
  // D4 · DOCs/27, 16 R-7. La cita es Liu et al. (TACL 2024): la curva de
  // recuperación por posición es una U — extremos fiables, medio no.
  contextChamberLostMiddle: {
    es: "Fíjate en el brillo: las gotas del MEDIO se ven más apagadas. Estar en la ventana no es lo mismo que ser usado — los modelos recuperan lo del medio de un contexto largo de forma medible menos fiable que lo del principio o el final (Liu et al., TACL 2024).",
    en: "Watch the brightness: the drops in the MIDDLE look dimmer. Being in the window isn't the same as being used — models retrieve information from the middle of a long context measurably less reliably than from either end (Liu et al., TACL 2024).",
  },
  // D5 · etiquetas ancladas a las gotas de la cámara.
  recallWorst: { es: "menos fiable", en: "less reliable" },
  recallBest: { es: "más fiable", en: "more reliable" },
  contextChamberSendTurn: { es: "enviar turno de ejemplo", en: "send example turn" },
  contextChamberReset: { es: "vaciar cámara", en: "empty chamber" },
  contextChamberPolicyReject: { es: "rechazar", en: "reject" },
  contextChamberPolicyFifo: { es: "FIFO", en: "FIFO" },
  contextChamberUsage: { es: "{used} / {budget} tokens", en: "{used} / {budget} tokens" },
  // --- Fase 3: compactación / destilador (DOCs/13 §5, Phase 3) ---
  contextChamberPolicyCompact: { es: "compactar", en: "compact" },
  contextChamberCompactNow: { es: "compactar ahora", en: "compact now" },
  contextChamberCompactResult: {
    es: "{dropped} turno(s) → 1 resumen ({before} → {after} tokens) — detalle perdido a propósito",
    en: "{dropped} turn(s) → 1 summary ({before} → {after} tokens) — detail lost on purpose",
  },
  contextChamberCompactNothing: {
    es: "nada que compactar todavía — llena la cámara primero",
    en: "nothing to compact yet — fill the chamber first",
  },
  contextChamberMangoTest: { es: "prueba MANGO-47", en: "MANGO-47 test" },
  // --- Fase 6: dolly de escala de capacidad (DOCs/13 §10) ---
  contextChamberScaleHeading: {
    es: "comparar escala (la cámara vuela y el vessel crece × cbrt(capacidad/500))",
    en: "compare scale (camera flies out, vessel grows × cbrt(capacity/500))",
  },
  contextChamberRecoverHeading: {
    es: "recuperar de turnos evictados/compactados",
    en: "recover from evicted/compacted turns",
  },
  contextChamberRecoverEmpty: {
    es: "nada evictado todavía — llena y expulsa/compacta para ver esto",
    en: "nothing evicted yet — fill and evict/compact to see this",
  },
  contextChamberRecoverReveal: { es: "ver original", en: "reveal original" },
  contextChamberRecoverQuiz: {
    es: "¿Recuerdas la clave secreta de arriba? Míralo en el resumen del chat — si ya no aparece, se perdió en la compactación. Recupérala aquí:",
    en: "Remember the secret key from above? Look in the chat summary — if it's gone, it was lost in compaction. Recover it here:",
  },
  ragDockIntro: {
    es: "Recuperar antes de generar: una pregunta trae trozos reales de un archivo externo a la mesa de trabajo, en vez de que el modelo invente.",
    en: "Retrieve before generating: a question brings real chunks from an external file to the working desk, instead of the model making things up.",
  },
  // --- P7: vx-math-lab, pestaña Cosine (primera rebanada real) ---
  mathLabTabCosine: { es: "Coseno", en: "Cosine" },
  mathLabCosineEmpty: {
    es: "Escribe una frase (Avanzado) para tener al menos dos embeddings vivos que comparar.",
    en: "Type a phrase (Avanzado) to have at least two live embeddings to compare.",
  },
  mathLabCosineIntro: {
    es: "Los mismos embeddings bge-m3 reales de tu frase (ℝ¹⁰²⁴) — elige dos y compara su similitud de coseno real, con la fórmula y los números de verdad.",
    en: "The same real bge-m3 embeddings from your phrase (ℝ¹⁰²⁴) — pick two and compare their real cosine similarity, with the actual formula and numbers.",
  },
  mathLabCosineFootnote: {
    es: "A y B se muestran truncados a 6 de 1024 dimensiones para que quepan en pantalla — el cálculo usa el vector completo.",
    en: "A and B are shown truncated to 6 of 1024 dimensions to fit on screen — the calculation uses the full vector.",
  },
  mathLabTabPca: { es: "PCA", en: "PCA" },
  mathLabPcaLoading: { es: "cargando la base PCA real…", en: "loading the real PCA basis…" },
  mathLabPcaIntro: {
    es: "De ℝ¹⁰²⁴ a ℝ³: la misma base PCA real que ya coloca esta partícula en el cubo — restar la media, proyectar sobre cada eje, escalar al tamaño del cubo. El resultado de abajo es EXACTAMENTE dónde vive ahora mismo.",
    en: "From ℝ¹⁰²⁴ to ℝ³: the same real PCA basis that already places this particle in the cube — subtract the mean, project onto each axis, scale to the cube. The result below is EXACTLY where it lives right now.",
  },
  mathLabPcaComputed: { es: "recalculado aquí", en: "recomputed here" },
  mathLabPcaReal: { es: "posición real de la partícula", en: "particle's real position" },
  mathLabPcaFootnote: {
    es: "Si los dos renglones no coinciden, es un bug — deberían ser el mismo número siempre (misma base, mismo vector).",
    en: "If the two rows don't match, that's a bug — they should always be the same number (same basis, same vector).",
  },
  // --- C1-C3 · apertura guiada de Principiante (DOCs/27, 15 R-6) ---
  // Estructura provocar → contradecir → nombrar. El aprendiz APUESTA
  // antes de ver nada: sin interpretación previa no hay insight que
  // producir (Kounios y Beeman 2014, vía 15 §3.3).
  openingAria: { es: "Lección de apertura", en: "Opening lesson" },
  openingSkip: { es: "saltar e ir al cubo", en: "skip and go to the cube" },
  openingContinue: { es: "Continuar", en: "Continue" },
  openingEnter: { es: "Entrar al cubo", en: "Enter the cube" },

  openingBeat1Kicker: { es: "Antes de empezar · adivina", en: "Before we start · guess" },
  openingBeat1Ask: {
    es: "Buscas {seed}. ¿Cuál crees que encuentra la computadora?",
    en: "You search for {seed}. Which one do you think the computer finds?",
  },
  openingOptLexical: {
    es: "se parece en las LETRAS",
    en: "similar in LETTERS",
  },
  openingOptSemantic: {
    es: "se parece en el SIGNIFICADO",
    en: "similar in MEANING",
  },

  openingBeat2Kicker: { es: "Esto es lo que pasó de verdad", en: "Here's what actually happened" },
  // Acertar y fallar reciben marcos distintos a propósito: acertar no
  // debe sentirse como que la lección sobraba, y fallar no debe sentirse
  // como castigo — es fracaso productivo (Kapur 2008), la parte que
  // enseña.
  openingBeat2Right: {
    es: "Acertaste. {sem} gana, y no comparte ni una letra con la palabra buscada. {lex} se parece muchísimo escrita, y aun así pierde.",
    en: "You got it. {sem} wins, and it shares not one letter with the searched word. {lex} looks almost the same written, and still loses.",
  },
  openingBeat2Wrong: {
    es: "Casi todo el mundo elige {lex} — comparte cinco letras. Pero gana {sem}, que no comparte ninguna. La computadora no está mirando cómo se escribe.",
    en: "Almost everyone picks {lex} — it shares five letters. But {sem} wins, sharing none. The computer isn't looking at how it's spelled.",
  },
  openingBeat2Chance: {
    es: "Dos palabras al azar de este cubo dan {chance}. Así que ese parecido de letras casi no supera al ruido.",
    en: "Two random words from this cube score {chance}. So that letter resemblance barely beats noise.",
  },

  openingBeat3Kicker: { es: "Dilo tú", en: "You say it" },
  openingBeat3Ask: {
    es: "Entonces, ¿qué usa la computadora para decidir qué está cerca?",
    en: "So, what does the computer use to decide what's close?",
  },
  openingRuleLetters: {
    es: "Cómo se escriben las palabras",
    en: "How the words are spelled",
  },
  openingRuleMeaning: {
    es: "Lo que las palabras significan",
    en: "What the words mean",
  },
  // Se nombra UNA vez, y sólo después de que el aprendiz enunció la
  // regla — no antes (15 §3.3, tiempo 3).
  openingNamed: {
    es: "Eso se llama similitud semántica. Cada palabra del cubo es una lista de 1024 números que capturan su significado, y la computadora compara esas listas — nunca las letras.",
    en: "That's called semantic similarity. Every word in the cube is a list of 1,024 numbers capturing its meaning, and the computer compares those lists — never the letters.",
  },

  // --- D1-D3 · laboratorio de fallos (DOCs/27, 15 R-11/R-19, 16 R-14) ---
  // D6 · continuidad Principiante -> Intermedio (DOCs/27, 15 R-18).
  // Nombra la MISMA operación que el aprendiz ya entendió, no una nueva.
  continuityTitle: {
    es: "Ya sabías esto.",
    en: "You already knew this.",
  },
  continuityBody: {
    es: "Las luces que se encendían al pedir una palabra eran similitud de coseno. Mismo cubo, mismos vectores reales — ahora además vas a ver el número.",
    en: "Those lights that came on when you asked for a word were cosine similarity. Same cube, same real vectors — now you get to see the number too.",
  },
  drawerFailLabel: { es: "¿Qué puede salir mal?", en: "What can go wrong?" },
  failLabIntro: {
    es: "Tres cosas que este cubo podría estar enseñándote mal. Adivina primero — luego mira los datos reales.",
    en: "Three things this cube might be teaching you wrong. Guess first — then look at the real data.",
  },
  failLabSource: {
    es: "Todas las cifras salen de los {n} conceptos reales del cubo, no de ejemplos inventados.",
    en: "Every figure comes from the cube's {n} real concepts, not from made-up examples.",
  },
  failScreen: { es: "en pantalla:", en: "on screen:" },
  failCosine: { es: "coseno real:", en: "real cosine:" },
  failTagReal: { es: "· datos reales, no simulados", en: "· real data, not simulated" },

  fail_d1_title: { es: "1 · ¿La distancia miente?", en: "1 · Does distance lie?" },
  fail_d1_q: {
    es: "Dos partículas que se ven pegadas en el cubo, ¿están siempre relacionadas?",
    en: "Two particles that look adjacent in the cube — are they always related?",
  },
  fail_d1_a: { es: "Sí, por eso están cerca", en: "Yes, that's why they're close" },
  fail_d1_b: { es: "No necesariamente", en: "Not necessarily" },
  fail_d1_verdict: {
    es: "No necesariamente — y falla en las dos direcciones.",
    en: "Not necessarily — and it fails in both directions.",
  },
  fail_d1_caseInvented: { es: "Vecino inventado", en: "Invented neighbour" },
  fail_d1_caseLost: { es: "Vecino perdido", en: "Lost neighbour" },
  fail_d1_noteInvented: {
    es: "Se tocan en pantalla, pero su coseno está POR DEBAJO de {chance}, que es lo que dan dos palabras al azar. Verlos juntos no significa nada.",
    en: "They touch on screen, yet their cosine is BELOW {chance}, which is what two random words score. Seeing them together means nothing.",
  },
  fail_d1_noteLost: {
    es: "Están en extremos opuestos del cubo y sin embargo son vecinos top-5 de verdad. La proyección los separó; el modelo no.",
    en: "They sit at opposite ends of the cube yet are genuine top-5 neighbours. The projection split them; the model didn't.",
  },
  fail_d1_explain: {
    es: "Comprimir 1024 dimensiones a 3 no cabe. En una muestra del cubo aparecen {inv} pares inventados y {lost} perdidos. Por eso las listas de vecinos se calculan en las 1024 dimensiones completas, nunca a partir de lo que ves.",
    en: "Squeezing 1,024 dimensions into 3 doesn't fit. In a sample of the cube there are {inv} invented pairs and {lost} lost ones. That's why neighbour lists are computed in the full 1,024 dimensions, never from what you see.",
  },

  fail_d2_title: { es: "2 · ¿Lo contrario está lejos?", en: "2 · Are opposites far apart?" },
  fail_d2_q: {
    es: "Palabras que significan lo CONTRARIO, ¿quedan lejos una de otra?",
    en: "Words that mean the OPPOSITE — do they end up far from each other?",
  },
  fail_d2_a: { es: "Sí, son opuestas", en: "Yes, they're opposites" },
  fail_d2_b: { es: "No, quedan muy cerca", en: "No, they end up very close" },
  fail_d2_verdict: {
    es: "Quedan cerquísima. {top} es de los pares más altos del cubo.",
    en: "They end up extremely close. {top} is among the highest-scoring pairs in the cube.",
  },
  fail_d2_explain: {
    es: "El modelo aprende de CONTEXTOS, y los antónimos aparecen en los mismos: \"el café está caliente\" / \"el café está frío\". Así que mide RELACIÓN, no acuerdo. Con el azar en {chance}, estos valores son altísimos. Es la salvedad más profunda de todo esto: cerca no quiere decir que digan lo mismo.",
    en: "The model learns from CONTEXTS, and antonyms appear in the same ones: \"the coffee is hot\" / \"the coffee is cold\". So it measures RELATEDNESS, not agreement. With chance at {chance}, these values are very high. It's the deepest caveat here: close doesn't mean they say the same thing.",
  },

  fail_d3_title: { es: "3 · ¿Todos pesan igual?", en: "3 · Does every concept weigh the same?" },
  fail_d3_q: {
    es: "¿Aparece cada concepto en más o menos el mismo número de listas de vecinos?",
    en: "Does each concept show up in roughly the same number of neighbour lists?",
  },
  fail_d3_a: { es: "Sí, más o menos igual", en: "Yes, roughly the same" },
  fail_d3_b: { es: "No, unos pocos dominan", en: "No, a few dominate" },
  fail_d3_verdict: {
    es: "Unos pocos dominan. {word} aparece en {count} listas; la media es {mean}.",
    en: "A few dominate. {word} shows up in {count} lists; the average is {mean}.",
  },
  fail_d3_explain: {
    es: "Se llama hubness y es geometría de alta dimensión, no un fallo del cubo: en muchas dimensiones unos pocos puntos acaban siendo vecinos de casi todo. Significa que \"aparece en tu búsqueda\" no siempre quiere decir \"tiene que ver contigo\".",
    en: "It's called hubness, and it's high-dimensional geometry rather than a cube bug: in many dimensions a few points end up being neighbours of almost everything. It means \"it showed up in your search\" doesn't always mean \"it's about you\".",
  },

  // --- C6 · sonda de ubicación (R-17) ---
  probeKicker: { es: "Una cosa más", en: "One more thing" },
  probe_q1: {
    es: "¿Sabes lo que es un token?",
    en: "Do you know what a token is?",
  },
  probe_q2: {
    es: "¿Has oído hablar de la similitud de coseno?",
    en: "Have you heard of cosine similarity?",
  },
  probe_q3: {
    es: "¿Sabrías explicar qué hace la atención en un Transformer?",
    en: "Could you explain what attention does in a Transformer?",
  },
  probeYes: { es: "Sí", en: "Yes" },
  probeNo: { es: "No / no estoy seguro", en: "No / not sure" },
  probeStay: {
    es: "Perfecto — {mode} es tu sitio. Siempre puedes subir de nivel arriba a la derecha.",
    en: "Perfect — {mode} is your place. You can always level up from the top right.",
  },
  probeSuggest: {
    es: "Por lo que respondiste, {mode} te va mejor. Tú decides — y puedes cambiar cuando quieras arriba a la derecha.",
    en: "From your answers, {mode} suits you better. Your call — and you can switch any time from the top right.",
  },
  probeAccept: { es: "Sí, llévame ahí", en: "Yes, take me there" },
  probeDecline: { es: "Me quedo en Principiante", en: "I'll stay in Beginner" },

  // --- Fase B · diagnósticos de proyección (DOCs/16 R-4/R-5, DOCs/27) ---
  // La auditoría técnica marcó como P0 que el producto AFIRMA honestidad
  // ("proyección con pérdida") sin publicar una sola cifra. Estas cadenas
  // son las que convierten la etiqueta en número.
  diagResidualLabel: {
    es: "error de reconstrucción",
    en: "reconstruction error",
  },
  diagResidualHelp: {
    es: "Lo que se PIERDE al comprimir: distancia entre el vector original de 1024 dimensiones y el que se puede reconstruir desde estas 3 coordenadas. Si fuera 0, la proyección no perdería nada.",
    en: "What is LOST in compression: distance between the original 1024-dimensional vector and the one reconstructible from these 3 coordinates. If it were 0, the projection would lose nothing.",
  },
  diagVarianceLabel: {
    es: "varianza retenida (CP1-3)",
    en: "retained variance (PC1-3)",
  },
  diagVarianceHelp: {
    es: "Estos 3 ejes conservan {pct} de la variación del espacio original. No hay tres direcciones dominantes: hacen falta cientos de componentes para el resto.",
    en: "These 3 axes retain {pct} of the original space's variation. There are no three dominant directions: hundreds of components are needed for the rest.",
  },
  diagTrustLabel: {
    es: "vecinos inventados",
    en: "invented neighbours",
  },
  diagTrustHelp: {
    es: "Alrededor del {pct} de lo que se ve cerca en pantalla NO está cerca en las 1024 dimensiones reales. Medido (trustworthiness {trust} a k=10) sobre los {n} conceptos del cubo.",
    en: "Around {pct} of what looks close on screen is NOT close in the real 1024 dimensions. Measured (trustworthiness {trust} at k=10) over the cube's {n} concepts.",
  },
  diagCosineScaleLabel: {
    es: "el 0 no existe aquí",
    en: "zero doesn't exist here",
  },
  diagCosineScaleHelp: {
    es: "Dos conceptos SIN relación dan {mean} de coseno, no 0. Así que {example} no es \"muy parecido\": está apenas por encima del azar. El ORDEN de los vecinos sí es informativo; ningún umbral fijo lo es.",
    en: "Two UNRELATED concepts give a cosine of {mean}, not 0. So {example} isn't \"very similar\": it's barely above chance. The ORDER of neighbours is informative; no fixed threshold is.",
  },
  diagMeasuredOn: {
    es: "medido sobre {n} conceptos reales · {date}",
    en: "measured over {n} real concepts · {date}",
  },
  diagHubnessLabel: {
    es: "concentración de vecinos",
    en: "neighbour concentration",
  },
  diagHubnessHelp: {
    es: "En muchas dimensiones unos pocos conceptos aparecen en desproporcionadamente muchas listas de vecinos — se llama hubness. Aquí el más extremo sale en {top} listas frente a una media de {mean} (asimetría {skew}). No es un bug del cubo: es geometría de alta dimensión.",
    en: "In many dimensions a few concepts appear in disproportionately many neighbour lists — this is called hubness. Here the most extreme one appears in {top} lists against a mean of {mean} (skewness {skew}). It isn't a cube bug: it's high-dimensional geometry.",
  },
  diagNeighborsCaveat: {
    es: "orden real en ℝ¹⁰²⁴ — la cercanía en pantalla es otra cosa",
    en: "real ordering in ℝ¹⁰²⁴ — on-screen closeness is a different thing",
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
  // E4 · DOCs/27, 16 R-15. Va donde se INTRODUCEN los arcos, no en una
  // nota al pie: quien ve el dibujo por primera vez es quien está
  // formando la idea de que "esto es lo que el modelo mira".
  attentionInterpDebate: {
    es: "Y aunque fueran pesos reales: si la atención muestra lo que un modelo \"usa\" es una pregunta abierta y disputada en la literatura (Jain y Wallace 2019; Wiegreffe y Pinter 2019; Serrano y Smith 2019). Cambiarlos por trazas reales los haría más reales, no más explicativos.",
    en: "And even with real weights: whether attention shows what a model \"uses\" is an open, disputed question in the literature (Jain & Wallace 2019; Wiegreffe & Pinter 2019; Serrano & Smith 2019). Swapping in real traces would make them more real, not more explanatory.",
  },
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
  ragInjectedNote: {
    es: "→ enviado a la Cámara de Contexto (Transformer · Contexto) como turno \"retrieval\" — ocupa espacio real en la ventana, no es gratis.",
    en: "→ sent to the Context Chamber (Transformer · Context) as a \"retrieval\" turn — it takes up real space in the window, it isn't free.",
  },
  // --- Fase 5 (resto del checklist): documento preparado + archivo de
  // fragmentos reales, en vez de recuperar sólo del dataset del cubo ---
  ragDocsHeading: { es: "documento preparado", en: "prepared document" },
  ragDocsIntro: {
    es: "Elige un documento externo, tocéalo en fragmentos y embébelos de verdad (bge-m3) — luego pregunta: la recuperación compara tu pregunta contra cada fragmento con coseno real, no contra el dataset del cubo.",
    en: "Pick an external document, chunk it, and really embed each chunk (bge-m3) — then ask: retrieval compares your question against every chunk with real cosine, not against the cube's dataset.",
  },
  ragDocSelectCube: { es: "sobre el cubo de significado", en: "about the meaning cube" },
  ragDocSelectRhino: { es: "el rinoceronte naranja", en: "the orange rhinoceros" },
  ragDocsChunkBtn: { es: "trocear y embeber", en: "chunk & embed" },
  ragDocsChunking: { es: "troceando y embebiendo de verdad…", en: "chunking and really embedding…" },
  ragDocsChunksHeading: { es: "archivo (fragmentos reales)", en: "archive (real chunks)" },
  ragDocsAskPlaceholder: { es: "pregunta sobre el documento…", en: "ask about the document…" },
  ragDocsNoChunks: { es: "trocea un documento primero", en: "chunk a document first" },
  ragDocsTopChunks: { es: "fragmentos recuperados (coseno real)", en: "retrieved chunks (real cosine)" },

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
