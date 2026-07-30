/**
 * E5 · Prueba de alineación translingüe — `DOCs/16` R-2.
 *
 * El producto afirma ser bilingüe. Nadie lo ha medido nunca, y la
 * auditoría técnica es explícita en que las puntuaciones de MIRACL no
 * pueden aportarlo: MIRACL es monolingüe por construcción. R-2 pide
 * ejecutar el experimento de LAReQA directamente.
 *
 * El diseño aquí es aún más duro que LAReQA, y a propósito. `seed.ts`
 * línea 115 embebe SÓLO `wordEn`, así que el índice entero está en
 * inglés. La prueba es entonces: consultar EN ESPAÑOL contra un índice
 * inglés y ver si el concepto correcto sale primero. Si el español
 * funciona, es puramente por la alineación translingüe de bge-m3 — no
 * hay ningún texto español que emparejar.
 *
 * Métricas: acierto-en-1, acierto-en-5 y el rango medio recíproco (MRR).
 *
 * Uso: node worker/scripts/crosslingual.mjs [N]
 */
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://vectron.kilowatto.com";
const RESULTS = "worker/diagnostics";
const APP_RESULTS = "app/src/data/diagnostics";
const N = Number(process.argv[2] ?? 200);
const TOPK = 10;
const CONC = 4;

const all = await (await fetch(`${API}/api/concepts`)).json();
const arr = Array.isArray(all) ? all : all.concepts;

// Sólo conceptos donde las dos formas existen y DIFIEREN: si "chocolate"
// se escribe igual en los dos idiomas, acertar no prueba alineación
// translingüe, prueba coincidencia de cadena. Incluirlos inflaría el
// resultado sin que nadie lo notara.
const norm = (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const usable = arr.filter(
  (c) => c.word?.es && c.word?.en && norm(c.word.es) !== norm(c.word.en) && !/\s/.test(c.word.es),
);
console.error(`conceptos usables (es != en): ${usable.length} de ${arr.length}`);

// Muestreo determinista por paso fijo.
const step = Math.max(1, Math.floor(usable.length / N));
const sample = [];
for (let i = 0; i < usable.length && sample.length < N; i += step) sample.push(usable[i]);

const byId = new Map(arr.map((c) => [Number(c.id), c]));
/** Cuántos aciertos vinieron de un id DISTINTO con la misma palabra
 * inglesa — o sea, cuántos duplicados hay en el corpus. Es un hallazgo
 * lateral que merece publicarse, no esconderse en el denominador. */
let duplicateCredited = 0;
let hit1 = 0;
let hit5 = 0;
let mrrSum = 0;
let done = 0;
const misses = [];
const queue = sample.slice();

async function run(c) {
  try {
    // 1) Embeber la palabra ESPAÑOLA con el mismo modelo del índice.
    const er = await fetch(`${API}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [c.word.es] }),
    });
    const ej = await er.json();
    const vec = ej.vectors?.[0] ?? ej.data?.[0] ?? ej.embeddings?.[0];
    if (!Array.isArray(vec)) throw new Error("sin vector: " + JSON.stringify(ej).slice(0, 90));

    // 2) Buscar en el índice (que está en INGLÉS).
    const sr = await fetch(`${API}/api/similar-by-vector`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector: vec, topK: TOPK }),
    });
    const sj = await sr.json();
    const hits = (sj.neighbors ?? sj.results ?? []).map((n) => Number(n.id ?? n.conceptId));
    // Acierto por SIGNIFICADO, no por id. Primera versión comparaba ids
    // y salía 46.7 %, pero los fallos delataron el error: "vacío" →
    // devolvía "empty", y "vestido" → "dress". La palabra inglesa era
    // la correcta; el id, otro. El dataset tiene conceptos duplicados,
    // así que comparar ids medía la limpieza del corpus ADEMÁS de la
    // alineación translingüe, y las mezclaba en una sola cifra.
    const wantEn = norm(c.word.en);
    const rank = hits.findIndex((id) => {
      const h = byId.get(id);
      return h && norm(h.word?.en) === wantEn;
    });
    const rankById = hits.indexOf(Number(c.id));
    if (rank >= 0 && rankById !== rank) duplicateCredited++;
    if (rank === 0) hit1++;
    if (rank >= 0 && rank < 5) hit5++;
    mrrSum += rank >= 0 ? 1 / (rank + 1) : 0;
    if (rank !== 0 && misses.length < 12) {
      const top = arr.find((x) => x.id === hits[0]);
      misses.push({
        es: c.word.es,
        en: c.word.en,
        rank: rank < 0 ? null : rank + 1,
        gotInstead: top ? top.word?.en : null,
      });
    }
  } catch (e) {
    misses.push({ es: c.word?.es, error: String(e.message).slice(0, 70) });
  }
  if (++done % 25 === 0) console.error(`  ${done}/${sample.length}`);
}

await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (queue.length) await run(queue.shift());
  }),
);

const n = sample.length;
const out = {
  what: "E5 · alineación translingüe ES->EN (DOCs/16 R-2, protocolo LAReQA)",
  design:
    "El índice está embebido SÓLO en inglés (seed.ts:115). Se consulta con la " +
    "palabra ESPAÑOLA y se comprueba si el mismo concepto sale primero. Sólo " +
    "se usan conceptos cuyas formas es/en DIFIEREN: si coinciden, acertar " +
    "probaría coincidencia de cadena, no alineación translingüe.",
  queries: n,
  duplicateCredited,
  duplicateNote:
    "Aciertos donde el id devuelto difiere del pedido pero la palabra " +
    "inglesa es la misma: conceptos DUPLICADOS en el corpus. Se cuentan " +
    "como acierto porque el significado es correcto; se publica la cifra " +
    "porque es un problema real de datos que esta prueba destapó.",
  accuracyAt1: +(hit1 / n).toFixed(4),
  accuracyAt5: +(hit5 / n).toFixed(4),
  mrr: +(mrrSum / n).toFixed(4),
  examplesOfFailure: misses,
};
for (const dir of [RESULTS, APP_RESULTS]) {
  writeFileSync(`${dir}/crosslingual.json`, JSON.stringify(out, null, 2));
}

console.log("\n=== E5 · ¿es bilingüe de verdad? ===");
console.log(`consultas en español contra índice inglés: ${n}`);
console.log(`  acierto-en-1 : ${(100 * hit1 / n).toFixed(1)}%`);
console.log(`  acierto-en-5 : ${(100 * hit5 / n).toFixed(1)}%`);
console.log(`  MRR          : ${(mrrSum / n).toFixed(3)}`);
console.log(`  aciertos vía DUPLICADO (mismo significado, otro id): ${duplicateCredited}`);
if (misses.length) {
  console.log("\nfallos de ejemplo:");
  for (const m of misses.slice(0, 6))
    console.log(`   ${String(m.es).padEnd(18)} (${m.en ?? "?"}) → rango ${m.rank ?? "fuera de top-10"}${m.gotInstead ? `, salió "${m.gotInstead}"` : ""}${m.error ? " · " + m.error : ""}`);
}
console.log(`\n→ escrito crosslingual.json`);
