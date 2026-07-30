/**
 * Datos de los tres experimentos de fallo de Intermedio — D1, D2 y D3
 * de `DOCs/27` (`15` R-11/R-19, `16` R-14a/R-14b).
 *
 * TODO sale del corpus real. Ninguna cifra ni ningún par está escrito a
 * mano: un ejemplo pedagógico inventado que resulta ser falso es peor
 * que no tener ejemplo, porque enseña con la autoridad del producto.
 *
 * D1 · "la distancia miente" — busca los dos fallos SIMÉTRICOS de la
 *      proyección, que es justo lo que trustworthiness y continuity
 *      miden por separado:
 *        · INVENTADOS: pares pegados en pantalla con coseno real bajo.
 *        · PERDIDOS:   pares lejísimos en pantalla que son vecinos top.
 *      Con trustworthiness 0.694 y continuity 0.775 medidas, sabemos que
 *      ambos existen; esto los saca con nombre y apellido.
 *
 * D2 · antónimos — relación ≠ acuerdo. La semántica distribucional pone
 *      "caliente" y "frío" cerca porque aparecen en los mismos
 *      contextos. Es la salvedad más profunda del modelo y el producto
 *      no la usaba.
 *
 * D3 · hubs — los conceptos que aparecen en más listas de vecinos
 *      (Radovanović et al. 2010). No es un bug del cubo: es geometría de
 *      alta dimensión.
 *
 * Uso: node --max-old-space-size=6144 worker/scripts/experiments.mjs
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const OUT = "worker/scripts/out";
const RESULTS = "worker/diagnostics";
const APP_RESULTS = "app/src/data/diagnostics";
const API = "https://vectron.kilowatto.com";
const D = 1024;

const diag = JSON.parse(readFileSync(`${RESULTS}/diagnostics.json`, "utf8"));
const CHANCE = diag.cosineScale.mean;

console.error("cargando conceptos y vectores…");
const live = await (await fetch(`${API}/api/concepts`)).json();
const arr = Array.isArray(live) ? live : live.concepts;
const meta = new Map(arr.map((c) => [String(c.id), c]));
const word = (c) => c?.word?.es ?? c?.word ?? "?";

const ids = [];
const vecs = [];
{
  const rl = createInterface({ input: createReadStream(`${OUT}/vectors.ndjson`) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (!meta.has(String(o.id))) continue;
    ids.push(String(o.id));
    // Normalizado: el coseno pasa a ser un producto punto.
    const v = new Float64Array(D);
    let n = 0;
    for (let d = 0; d < D; d++) n += o.values[d] * o.values[d];
    n = Math.sqrt(n) || 1;
    for (let d = 0; d < D; d++) v[d] = o.values[d] / n;
    vecs.push(v);
  }
}
const N = ids.length;
console.error(`  ${N} conceptos con vector y coordenada`);

const pos = ids.map((id) => meta.get(id).coords);
const cos = (a, b) => {
  let s = 0;
  const x = vecs[a];
  const y = vecs[b];
  for (let d = 0; d < D; d++) s += x[d] * y[d];
  return s;
};
const dist3 = (a, b) => Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1], pos[a][2] - pos[b][2]);

// ---------- D1 ----------
// Muestra determinista: comparar los 20 473 contra todos serían 210M
// pares de 1024 dims. Con 2 000 hay 2M pares, suficiente para encontrar
// ejemplos EXTREMOS, que es lo único que se necesita.
const SAMPLE = 2000;
const step = Math.max(1, Math.floor(N / SAMPLE));
const S = [];
for (let i = 0; i < N && S.length < SAMPLE; i += step) S.push(i);

console.error(`D1 · buscando fallos de proyección sobre ${S.length}…`);
const invented = []; // pegados en pantalla, coseno bajo
const lost = []; // lejos en pantalla, vecinos reales
for (let a = 0; a < S.length; a++) {
  const ia = S[a];
  // Vecinos reales de ia dentro de la muestra
  const sims = [];
  for (let b = 0; b < S.length; b++) {
    if (a === b) continue;
    sims.push([S[b], cos(ia, S[b])]);
  }
  sims.sort((x, y) => y[1] - x[1]);
  const top5 = new Set(sims.slice(0, 5).map((x) => x[0]));

  for (let b = a + 1; b < S.length; b++) {
    const ib = S[b];
    const d3 = dist3(ia, ib);
    const c = cos(ia, ib);
    // INVENTADO: casi tocándose en pantalla pero por DEBAJO del azar.
    // Que esté bajo el azar es la clave — no es "algo menos parecido",
    // es indistinguible de dos palabras al azar.
    if (d3 < 0.09 && c < CHANCE) invented.push({ a: ia, b: ib, d3, c });
    // PERDIDO: vecino top-5 real, pero en extremos opuestos del cubo.
    if (top5.has(ib) && d3 > 1.6) lost.push({ a: ia, b: ib, d3, c });
  }
}
invented.sort((x, y) => x.c - y.c || x.d3 - y.d3);
lost.sort((x, y) => y.d3 - x.d3);

const shape = (p) => ({
  a: { id: ids[p.a], word: word(meta.get(ids[p.a])), domain: meta.get(ids[p.a]).domain },
  b: { id: ids[p.b], word: word(meta.get(ids[p.b])), domain: meta.get(ids[p.b]).domain },
  screenDistance: +p.d3.toFixed(3),
  cosine: +p.c.toFixed(3),
});

// ---------- D2 ----------
console.error("D2 · antónimos…");
const ANTONYMS = [
  ["caliente", "frío"], ["grande", "pequeño"], ["rápido", "lento"],
  ["alto", "bajo"], ["duro", "blando"], ["claro", "oscuro"],
  ["húmedo", "seco"], ["fuerte", "débil"], ["nuevo", "viejo"],
];
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const idxByWord = new Map();
ids.forEach((id, i) => idxByWord.set(norm(word(meta.get(id))), i));
const antonyms = [];
for (const [x, y] of ANTONYMS) {
  const ia = idxByWord.get(norm(x));
  const ib = idxByWord.get(norm(y));
  if (ia === undefined || ib === undefined) continue;
  antonyms.push({
    a: { id: ids[ia], word: word(meta.get(ids[ia])) },
    b: { id: ids[ib], word: word(meta.get(ids[ib])) },
    cosine: +cos(ia, ib).toFixed(3),
    screenDistance: +dist3(ia, ib).toFixed(3),
  });
}
antonyms.sort((p, q) => q.cosine - p.cosine);

// ---------- D3 ----------
console.error("D3 · hubs sobre la muestra completa…");
const K_HUB = 10;
const occ = new Int32Array(S.length);
for (let a = 0; a < S.length; a++) {
  const sims = [];
  for (let b = 0; b < S.length; b++) {
    if (a === b) continue;
    sims.push([b, cos(S[a], S[b])]);
  }
  sims.sort((x, y) => y[1] - x[1]);
  for (let k = 0; k < K_HUB; k++) occ[sims[k][0]]++;
}
const mean = occ.reduce((s, x) => s + x, 0) / S.length;
const hubs = Array.from(occ)
  .map((count, i) => ({ id: ids[S[i]], word: word(meta.get(ids[S[i]])), domain: meta.get(ids[S[i]]).domain, count }))
  .sort((x, y) => y.count - x.count)
  .slice(0, 6);

const out = {
  generatedFor: "DOCs/27 Fase D · experimentos de fallo",
  corpus: N,
  chanceFloor: +CHANCE.toFixed(3),
  sample: S.length,
  d1: {
    what: "La distancia miente — los dos fallos simétricos de la proyección",
    invented: invented.slice(0, 5).map(shape),
    lost: lost.slice(0, 5).map(shape),
    counts: { invented: invented.length, lost: lost.length },
  },
  d2: {
    what: "Antónimos: relación no es acuerdo",
    pairs: antonyms,
  },
  d3: {
    what: "Hubness: unos pocos conceptos aparecen en muchísimas listas",
    k: K_HUB,
    meanOccurrence: +mean.toFixed(2),
    hubs,
  },
};
for (const dir of [RESULTS, APP_RESULTS]) {
  writeFileSync(`${dir}/experiments.json`, JSON.stringify(out, null, 2));
}

console.log("\n=== D1 · la distancia miente ===");
console.log(`INVENTADOS (pegados en pantalla, coseno bajo el azar ${CHANCE.toFixed(2)}): ${invented.length}`);
for (const p of out.d1.invented.slice(0, 3))
  console.log(`   ${p.a.word} ↔ ${p.b.word}  ·  pantalla ${p.screenDistance}  ·  coseno ${p.cosine}`);
console.log(`PERDIDOS (vecinos top-5 en extremos opuestos): ${lost.length}`);
for (const p of out.d1.lost.slice(0, 3))
  console.log(`   ${p.a.word} ↔ ${p.b.word}  ·  pantalla ${p.screenDistance}  ·  coseno ${p.cosine}`);

console.log("\n=== D2 · antónimos ===");
for (const p of antonyms.slice(0, 6)) console.log(`   ${p.a.word} ↔ ${p.b.word}  coseno ${p.cosine}`);

console.log("\n=== D3 · hubs ===");
console.log(`media de apariciones: ${mean.toFixed(1)}`);
for (const h of hubs) console.log(`   ${String(h.word).padEnd(22)} ${h.count}  [${h.domain}]`);
console.log(`\n→ escrito experiments.json en worker/diagnostics/ y app/src/data/diagnostics/`);
