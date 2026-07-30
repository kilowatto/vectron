/**
 * Completa `vectors.ndjson` con los conceptos que el cron añadió después
 * de la siembra. Sin esto los diagnósticos cubrían el 46.8 % del corpus
 * (9 591 de 20 473) y toda cifra sobre el resto era suposición.
 *
 * Uso: node worker/scripts/fetch-missing-vectors.mjs
 */
import { appendFileSync, createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const API = "https://vectron.kilowatto.com";
const OUT = "worker/scripts/out";
const BATCH = 20;    // límite duro de Vectorize.getByIds (medido: 21 revienta)
const CONC = 8;      // peticiones en paralelo

// Qué ids ya tenemos en disco.
const have = new Set();
if (existsSync(`${OUT}/vectors.ndjson`)) {
  const rl = createInterface({ input: createReadStream(`${OUT}/vectors.ndjson`) });
  for await (const line of rl) {
    if (line.trim()) have.add(String(JSON.parse(line).id));
  }
}
console.error(`en disco: ${have.size}`);

// Qué ids existen en vivo.
const live = await (await fetch(`${API}/api/concepts`)).json();
const all = (Array.isArray(live) ? live : live.concepts).map((c) => String(c.id));
const missing = all.filter((id) => !have.has(id));
console.error(`en vivo: ${all.length} · faltan: ${missing.length}`);
if (missing.length === 0) {
  console.log("nada que traer — cobertura ya al 100 %");
  process.exit(0);
}

const batches = [];
for (let i = 0; i < missing.length; i += BATCH) batches.push(missing.slice(i, i + BATCH));

let done = 0;
let got = 0;
let notFound = 0;
async function runBatch(b) {
  // Reintento simple: un 5xx puntual de Vectorize no debe tirar la
  // recolección entera a mitad de camino.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${API}/api/vectors?ids=${b.join(",")}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error ?? "respuesta no ok");
      const lines = j.vectors.map((v) => JSON.stringify({ id: v.id, values: v.values })).join("\n");
      if (lines) appendFileSync(`${OUT}/vectors.ndjson`, "\n" + lines);
      got += j.found;
      notFound += b.length - j.found;
      return;
    } catch (e) {
      if (attempt === 2) {
        console.error(`  lote fallido tras 3 intentos: ${e.message}`);
        notFound += b.length;
        return;
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

const queue = batches.slice();
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (queue.length) {
      const b = queue.shift();
      await runBatch(b);
      done++;
      if (done % 50 === 0) console.error(`  ${done}/${batches.length} lotes · ${got} vectores`);
    }
  }),
);

console.log(`\ntraídos ${got} vectores · ${notFound} no encontrados en el índice`);
console.log(`cobertura ahora: ${have.size + got} de ${all.length} (${(((have.size + got) / all.length) * 100).toFixed(1)} %)`);
