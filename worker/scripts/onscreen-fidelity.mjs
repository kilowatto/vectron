/**
 * Fidelidad de lo que se VE, no de la PCA teórica.
 *
 * Deuda encontrada al revisar `diagnostics.mjs`: allí trustworthiness y
 * continuity se calculan contra la proyección PCA pura (componentes ·
 * vector). Pero las coordenadas ALMACENADAS —las que colocan cada
 * partícula en pantalla— pasan después por tres transformaciones más:
 * reescalado por percentil por eje, recorte al borde del cubo y una
 * relajación de separación local (declump). Así que la cifra de la PCA
 * es una COTA SUPERIOR optimista de lo que el usuario tiene delante.
 *
 * Esto mide lo otro: los mismos vectores de 1024 dims contra las
 * coordenadas REALES servidas por /api/concepts.
 *
 * Uso: node --max-old-space-size=4096 worker/scripts/onscreen-fidelity.mjs <concepts.json>
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const OUT = "worker/scripts/out";        // insumos (ignorados por git: 187 MB)
const RESULTS = "worker/diagnostics";   // resultados (versionados — el plan pide cifras rastreables)
const D = 1024;
const K_LIST = [5, 10, 20];
const SAMPLE = 1500;

const live = JSON.parse(readFileSync(process.argv[2], "utf8"));
const byId = new Map();
for (const p of Array.isArray(live) ? live : live.concepts) {
  if (p.coords) byId.set(String(p.id), p.coords);
}

console.error("cargando vectores…");
const ids = [];
const vecs = [];
{
  const rl = createInterface({ input: createReadStream(`${OUT}/vectors.ndjson`) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (!byId.has(String(o.id))) continue; // sólo los que siguen vivos
    ids.push(String(o.id));
    vecs.push(o.values);
  }
}
const N = ids.length;
console.error(`  ${N} conceptos con vector Y coordenada servida`);

// Muestreo determinista, igual que en diagnostics.mjs.
const step = Math.max(1, Math.floor(N / SAMPLE));
const sIdx = [];
for (let i = 0; i < N && sIdx.length < SAMPLE; i += step) sIdx.push(i);
const M = sIdx.length;

// Alta dimensión: coseno sobre vectores normalizados.
const hi = new Float64Array(M * D);
for (let a = 0; a < M; a++) {
  const v = vecs[sIdx[a]];
  let nrm = 0;
  for (let d = 0; d < D; d++) nrm += v[d] * v[d];
  nrm = Math.sqrt(nrm) || 1;
  for (let d = 0; d < D; d++) hi[a * D + d] = v[d] / nrm;
}
// Baja dimensión: la coordenada REAL, la que dibuja la partícula.
const lo = new Float64Array(M * 3);
for (let a = 0; a < M; a++) {
  const c = byId.get(ids[sIdx[a]]);
  lo[a * 3] = c[0];
  lo[a * 3 + 1] = c[1];
  lo[a * 3 + 2] = c[2];
}

console.error(`rangos sobre muestra de ${M}…`);
const KMAX = Math.max(...K_LIST);
const hiNN = [];
const loNN = [];
const hiRank = [];
const loRank = [];
for (let a = 0; a < M; a++) {
  const dh = new Float64Array(M);
  const dl = new Float64Array(M);
  for (let b = 0; b < M; b++) {
    let dot = 0;
    for (let d = 0; d < D; d++) dot += hi[a * D + d] * hi[b * D + d];
    dh[b] = 1 - dot;
    const dx = lo[a * 3] - lo[b * 3];
    const dy = lo[a * 3 + 1] - lo[b * 3 + 1];
    const dz = lo[a * 3 + 2] - lo[b * 3 + 2];
    dl[b] = dx * dx + dy * dy + dz * dz;
  }
  const others = [];
  for (let b = 0; b < M; b++) if (b !== a) others.push(b);
  const oh = others.slice().sort((x, y) => dh[x] - dh[y]);
  const ol = others.slice().sort((x, y) => dl[x] - dl[y]);
  hiNN.push(oh.slice(0, KMAX));
  loNN.push(ol.slice(0, KMAX));
  const rh = new Int32Array(M);
  const rl2 = new Int32Array(M);
  for (let p = 0; p < oh.length; p++) rh[oh[p]] = p + 1;
  for (let p = 0; p < ol.length; p++) rl2[ol[p]] = p + 1;
  hiRank.push(rh);
  loRank.push(rl2);
}

const norm = (K) => 2 / (M * K * (2 * M - 3 * K - 1));
function trust(K) {
  let s = 0;
  for (let a = 0; a < M; a++) {
    const inHi = new Set(hiNN[a].slice(0, K));
    for (const b of loNN[a].slice(0, K)) if (!inHi.has(b)) s += hiRank[a][b] - K;
  }
  return 1 - norm(K) * s;
}
function cont(K) {
  let s = 0;
  for (let a = 0; a < M; a++) {
    const inLo = new Set(loNN[a].slice(0, K));
    for (const b of hiNN[a].slice(0, K)) if (!inLo.has(b)) s += loRank[a][b] - K;
  }
  return 1 - norm(K) * s;
}

const out = {
  what: "Fidelidad de las coordenadas SERVIDAS (lo que se ve), no de la PCA teórica",
  sample: M,
  ofPool: N,
  trustworthiness: Object.fromEntries(K_LIST.map((K) => [`k${K}`, trust(K)])),
  continuity: Object.fromEntries(K_LIST.map((K) => [`k${K}`, cont(K)])),
  note:
    "Las coordenadas servidas pasan por reescalado por percentil por eje, " +
    "recorte al borde y relajación de separación (declump) DESPUÉS de la PCA. " +
    "Por eso estas cifras, no las de diagnostics.json, son las que describen " +
    "lo que el usuario tiene delante.",
};
writeFileSync(`${RESULTS}/onscreen-fidelity.json`, JSON.stringify(out, null, 2));

console.log("\n=== Fidelidad EN PANTALLA (coordenadas servidas) ===");
for (const K of K_LIST) {
  console.log(`k=${String(K).padStart(2)}  trustworthiness ${trust(K).toFixed(4)}   continuity ${cont(K).toFixed(4)}`);
}
console.log(`→ escrito ${RESULTS}/onscreen-fidelity.json`);
