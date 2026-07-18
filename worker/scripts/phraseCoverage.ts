import { SEED_CONCEPTS, type PartOfSpeech } from "../src/data/seedConcepts";

/**
 * Script de cobertura de frases (P0, ver DOCs/04-build-order.md). Replica
 * el mismo escaneo greedy de n-gramas que `main.ts` usa para las líneas
 * de camino, sobre el dataset crudo (sin necesidad de desplegar). Marca
 * dos tipos de resultado distintos, no uno solo:
 *
 * - GAP real: la palabra no existe en el dataset en ningún modo — hueco
 *   de contenido de verdad, hay que sembrarla.
 * - Filtrado por POS (esperado): la palabra existe pero su tipo no es
 *   visible en ese modo (ej. un verbo léxico en Principiante) — eso es
 *   el diseño de la matriz POS, no un bug.
 */

type Lang = "es" | "en";

const MODE_POS: Record<string, Set<PartOfSpeech>> = {
  principiante: new Set(["sustantivo", "funcion"]),
  intermedio: new Set(["sustantivo", "funcion", "adjetivo"]),
  avanzado: new Set(["sustantivo", "funcion", "adjetivo", "verbo"]),
};

const EXAMPLE_PHRASES: Record<Lang, string[]> = {
  es: [
    "El Rinoceronte Naranja que viene de la sabana le gusta el café Frida Café",
    "Python es un lenguaje de programación",
    "La gravedad y la luz son física",
    "El agujero negro está en la vía láctea",
  ],
  en: [
    "The Orange Rhinoceros that comes from the savanna likes Frida Café coffee",
    "Python is a programming language",
    "Gravity and light are physics",
    "The black hole is in the milky way",
  ],
};

function tokenizeSimple(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 0);
}

function buildIndex(lang: Lang): { index: Map<string, PartOfSpeech[]>; maxNgram: number } {
  const index = new Map<string, PartOfSpeech[]>();
  let maxNgram = 1;
  for (const c of SEED_CONCEPTS) {
    const word = lang === "es" ? c.wordEs : c.wordEn;
    const key = word.toLowerCase();
    const pos = c.partOfSpeech ?? "sustantivo";
    const list = index.get(key) ?? [];
    list.push(pos);
    index.set(key, list);
    maxNgram = Math.max(maxNgram, key.split(/\s+/).length);
  }
  return { index, maxNgram };
}

function checkPhrase(
  phrase: string,
  lang: Lang,
  index: Map<string, PartOfSpeech[]>,
  maxNgram: number,
): { word: string; status: "ok" | "pos-filtered" | "gap"; allowedIn: string[] }[] {
  const words = tokenizeSimple(phrase);
  const results: { word: string; status: "ok" | "pos-filtered" | "gap"; allowedIn: string[] }[] = [];
  let i = 0;
  while (i < words.length) {
    let consumed = 0;
    for (let len = Math.min(maxNgram, words.length - i); len >= 1; len--) {
      const key = words.slice(i, i + len).join(" ").toLowerCase();
      const posList = index.get(key);
      if (posList && posList.length > 0) {
        const allowedIn = Object.entries(MODE_POS)
          .filter(([, set]) => posList.some((p) => set.has(p)))
          .map(([mode]) => mode);
        results.push({
          word: words.slice(i, i + len).join(" "),
          status: allowedIn.length === 3 ? "ok" : "pos-filtered",
          allowedIn,
        });
        consumed = len;
        break;
      }
    }
    if (consumed === 0) {
      results.push({ word: words[i], status: "gap", allowedIn: [] });
      consumed = 1;
    }
    i += consumed;
  }
  return results;
}

let hasRealGaps = false;

for (const lang of ["es", "en"] as Lang[]) {
  const { index, maxNgram } = buildIndex(lang);
  console.log(`\n=== ${lang.toUpperCase()} ===`);
  for (const phrase of EXAMPLE_PHRASES[lang]) {
    console.log(`\n"${phrase}"`);
    const results = checkPhrase(phrase, lang, index, maxNgram);
    for (const r of results) {
      if (r.status === "ok") {
        console.log(`  ✓ ${r.word}`);
      } else if (r.status === "pos-filtered") {
        console.log(`  ~ ${r.word}  (visible solo en: ${r.allowedIn.join(", ") || "ninguno"})`);
      } else {
        console.log(`  ✗ ${r.word}  GAP REAL — no existe en el dataset`);
        hasRealGaps = true;
      }
    }
  }
}

console.log(
  hasRealGaps
    ? "\nHay GAPS reales — sembrar las palabras marcadas con ✗ antes de dar por cerrado P0."
    : "\nSin gaps reales. Las marcadas con ~ son filtrado por POS esperado (diseño de la matriz), no huecos.",
);

if (hasRealGaps) process.exit(1);
