/**
 * C4 de `DOCs/27` — la mitad de R-14 que quedó pendiente: *"verificar a
 * mano vecindarios limpios"* para el conjunto de enseñanza de 300
 * conceptos de Principiante.
 *
 * A mano no es viable ni reproducible, así que se hace sistemático:
 * para cada concepto del conjunto se pide su lista REAL de vecinos a
 * Vectorize y se comprueba contra criterios explícitos. Lo que sale
 * marcado es lo que un humano tendría que mirar, no los 300.
 *
 * Criterios (y por qué):
 *  - `azar`      el mejor vecino no supera el suelo de azar medido
 *                (0.412, worker/diagnostics). Si el vecindario entero
 *                está al nivel del ruido, ese concepto no enseña nada.
 *  - `funcion`   la mayoría de sus vecinos son palabras función
 *                (artículos, preposiciones). Un vecindario de "de, la,
 *                el" no muestra semántica, muestra gramática.
 *  - `mismo`     todos los vecinos comparten dominio con él. No es un
 *                error, pero un concepto así no puede enseñar que la
 *                cercanía cruza categorías.
 *  - `plano`     la diferencia entre el vecino 1 y el 5 es mínima: no
 *                hay ranking legible que mostrar.
 *
 * Uso: node worker/scripts/verify-teaching-set.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://vectron.kilowatto.com";
const RESULTS = "worker/diagnostics";
const CONC = 6;
const TOPK = 6;

const diag = JSON.parse(readFileSync(`${RESULTS}/diagnostics.json`, "utf8"));
const CHANCE = diag.cosineScale.mean;

const concepts = await (await fetch(`${API}/api/concepts`)).json();
const all = Array.isArray(concepts) ? concepts : concepts.concepts;
const byId = new Map(all.map((c) => [c.id, c]));

// MISMA selección que app/src/main.ts pickTeachingSet — si divergen, se
// estaría verificando un conjunto distinto del que ve el usuario.
const ALLOWED = new Set(["sustantivo", "funcion"]);
const LIMIT = 300;
const byDomain = new Map();
all.forEach((c, i) => {
  if (!ALLOWED.has(c.partOfSpeech)) return;
  const b = byDomain.get(c.domain);
  if (b) b.push(i);
  else byDomain.set(c.domain, [i]);
});
const domains = [...byDomain.keys()].sort();
const picked = [];
for (let round = 0; picked.length < LIMIT; round++) {
  let added = false;
  for (const d of domains) {
    if (picked.length >= LIMIT) break;
    const b = byDomain.get(d);
    if (round < b.length) {
      picked.push(all[b[round]]);
      added = true;
    }
  }
  if (!added) break;
}
console.error(`conjunto de enseñanza: ${picked.length} conceptos · ${domains.length} dominios`);

const flagged = [];
const clean = [];
let done = 0;
const queue = picked.slice();
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (queue.length) {
      const c = queue.shift();
      try {
        const r = await fetch(`${API}/api/similar?id=${c.id}&topK=${TOPK}`);
        const j = await r.json();
        const nb = (j.neighbors ?? j.results ?? []).map((n) => ({
          id: n.id ?? n.conceptId,
          score: n.score,
        }));
        const withMeta = nb
          .map((n) => ({ ...n, c: byId.get(Number(n.id)) }))
          .filter((n) => n.c);
        const reasons = [];
        if (withMeta.length === 0) reasons.push("sin-vecinos");
        else {
          if (withMeta[0].score <= CHANCE) reasons.push("azar");
          const fn = withMeta.filter((n) => n.c.partOfSpeech === "funcion").length;
          if (fn > withMeta.length / 2) reasons.push("funcion");
          const same = withMeta.every((n) => n.c.domain === c.domain);
          if (same) reasons.push("mismo");
          const spread = withMeta[0].score - withMeta[withMeta.length - 1].score;
          if (spread < 0.02) reasons.push("plano");
        }
        const row = {
          id: c.id,
          word: c.word?.es ?? c.word,
          domain: c.domain,
          top: withMeta[0]
            ? { word: withMeta[0].c.word?.es, score: +withMeta[0].score.toFixed(3) }
            : null,
          reasons,
        };
        if (reasons.length) flagged.push(row);
        else clean.push(row);
      } catch (e) {
        flagged.push({ id: c.id, word: c.word?.es, reasons: ["error:" + e.message] });
      }
      if (++done % 50 === 0) console.error(`  ${done}/${picked.length}`);
    }
  }),
);

const byReason = {};
for (const f of flagged) for (const r of f.reasons) byReason[r] = (byReason[r] ?? 0) + 1;

const out = {
  what: "C4 de DOCs/27 — verificación de vecindarios del conjunto de enseñanza (R-14)",
  chanceFloor: CHANCE,
  total: picked.length,
  clean: clean.length,
  flagged: flagged.length,
  byReason,
  // Los mejores candidatos para la apertura guiada: vecindario limpio,
  // primer vecino claramente sobre el azar y ranking legible.
  bestForOpening: clean
    .filter((r) => r.top && r.top.score > CHANCE + 0.15)
    .sort((a, b) => b.top.score - a.top.score)
    .slice(0, 15),
  flaggedList: flagged.slice(0, 60),
};
writeFileSync(`${RESULTS}/teaching-set-audit.json`, JSON.stringify(out, null, 2));

console.log(`\n=== C4 · Vecindarios del conjunto de enseñanza ===`);
console.log(`limpios ${clean.length}/${picked.length}  ·  marcados ${flagged.length}`);
console.log(`por motivo: ${JSON.stringify(byReason)}`);
console.log(`\nMejores para la apertura guiada:`);
for (const r of out.bestForOpening.slice(0, 10)) {
  console.log(`  ${String(r.word).padEnd(18)} ${String(r.domain).padEnd(22)} → ${r.top.word} (${r.top.score})`);
}
console.log(`\n→ escrito ${RESULTS}/teaching-set-audit.json`);
