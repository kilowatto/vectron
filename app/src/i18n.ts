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
    es: "Cada fragmento se embebe aislado con bge-m3 (números 100% reales, el mismo modelo del cubo); el modelo real lee los tokens en contexto, con atención mutua — su posición aquí es una aproximación declarada. Los cortes de esta fila usan el tokenizador WordPiece real de bge-base-en-v1.5, no el de bge-m3 (que usa SentencePiece/XLM-RoBERTa y todavía no está implementado aquí) — se muestran como referencia, no como el tokenizador exacto del cubo. Los cortes de GPT también se embeben con bge-m3 para ubicarlos en el mismo espacio.",
    en: "Each fragment is embedded in isolation with bge-m3 (100% real numbers, the same model as the cube); the real model reads tokens in context, with mutual attention — their position here is a declared approximation. This row's cuts use bge-base-en-v1.5's real WordPiece tokenizer, not bge-m3's (which uses SentencePiece/XLM-RoBERTa and isn't implemented here yet) — shown as a reference, not the cube's exact tokenizer. GPT's cuts are also embedded with bge-m3 so they can live in the same space.",
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

  // --- P4: vx-kind-legend ---
  kindLegendNotable: { es: "luz grande = destacado", en: "big light = notable" },
  kindLegendNeighbors: { es: "vecinos (coseno real)", en: "neighbors (real cosine)" },
  kindLegendPath: { es: "camino de tu frase", en: "your phrase's path" },
  kindLegendTokens: { es: "BGE · GPT · frase (vivo)", en: "BGE · GPT · phrase (live)" },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
