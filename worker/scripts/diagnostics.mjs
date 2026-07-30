/**
 * Diagnósticos de proyección y de geometría del espacio de embeddings.
 * Fase B del plan `DOCs/27` — implementa `DOCs/16` R-4 y R-5.
 *
 * Contexto: la auditoría técnica halló que "las métricas correctas
 * existen y ninguna se calcula" (grep de varian|eigen|trustworth sobre
 * worker/ y app/ devolvía CERO). Esto las calcula sobre los embeddings
 * REALES de la siembra y escribe un JSON versionado.
 *
 * Uso: node worker/scripts/diagnostics.mjs
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const OUT = "worker/scripts/out";        // insumos (ignorados por git: 187 MB)
const RESULTS = "worker/diagnostics";   // resultados (versionados — el plan pide cifras rastreables)
const D = 1024;

// ---------- carga ----------
console.error("cargando vectores…");
const basis = JSON.parse(readFileSync(`${OUT}/pca_basis.json`, "utf8"));
const ids = [];
const rows = [];
{
  const rl = createInterface({ input: createReadStream(`${OUT}/vectors.ndjson`) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    ids.push(o.id);
    rows.push(Float64Array.from(o.values));
  }
}
const N = rows.length;
console.error(`  ${N} vectores × ${D} dims`);

// ---------- B1a · varianza explicada (exacta) ----------
// Se calcula con la MISMA media y los MISMOS componentes que usa el
// pipeline de producción, no con un PCA nuevo: la cifra tiene que
// describir la proyección que el usuario ve, no una hipotética.
const mean = Float64Array.from(basis.mean);
// Varianza total = traza de la covarianza = suma de varianzas por dim.
let totalVar = 0;
const dimVar = new Float64Array(D);
for (let d = 0; d < D; d++) {
  let s = 0;
  for (let i = 0; i < N; i++) {
    const x = rows[i][d] - mean[d];
    s += x * x;
  }
  dimVar[d] = s / (N - 1);
  totalVar += dimVar[d];
}
// Varianza a lo largo de cada componente principal.
const comps = basis.components.map((c) => Float64Array.from(c));
const pcVar = [];
const proj3 = new Float64Array(N * 3);
for (let k = 0; k < comps.length; k++) {
  const c = comps[k];
  let s = 0;
  let m = 0;
  const vals = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const r = rows[i];
    let dot = 0;
    for (let d = 0; d < D; d++) dot += (r[d] - mean[d]) * c[d];
    vals[i] = dot;
    m += dot;
  }
  m /= N;
  for (let i = 0; i < N; i++) {
    const x = vals[i] - m;
    s += x * x;
    proj3[i * 3 + k] = vals[i];
  }
  pcVar.push(s / (N - 1));
}
const evr = pcVar.map((v) => v / totalVar);

// ---------- espectro ----------
// Se LEE de spectrum.json en vez de recalcularse aquí. La primera
// versión usaba iteración de potencia con deflación secuencial y no
// convergía en la cola (salía CP7 > CP6, imposible en valores propios).
// `spectrum.mjs` lo hace con iteración ortogonal por bloques sobre la
// covarianza materializada, comprueba la monotonía y es ~9x más rápido.
// Dos implementaciones de lo mismo es justo la clase de deuda que este
// repo ya pagó cara, así que aquí sólo se referencia.
let spectrum = null;
try {
  spectrum = JSON.parse(readFileSync(`${RESULTS}/spectrum.json`, "utf8")).explainedVarianceRatio;
} catch {
  console.error("aviso: spectrum.json no existe — corre spectrum.mjs primero");
}

// ---------- muestra compartida para las métricas de vecindario ----------
// Muestreo declarado: Q_NX y hubness exactos sobre 9 591 puntos son
// ~46M distancias de 1024 dims. Con 1 500 la estimación es estable y el
// coste baja dos órdenes de magnitud. El muestreo es determinista.
const SAMPLE = 1500;
const step = Math.max(1, Math.floor(N / SAMPLE));
const sIdx = [];
for (let i = 0; i < N && sIdx.length < SAMPLE; i += step) sIdx.push(i);
const M = sIdx.length;

// Vectores normalizados de la muestra (para coseno vía producto punto).
const hi = new Float64Array(M * D);
for (let a = 0; a < M; a++) {
  const r = rows[sIdx[a]];
  let nrm = 0;
  for (let d = 0; d < D; d++) nrm += r[d] * r[d];
  nrm = Math.sqrt(nrm) || 1;
  for (let d = 0; d < D; d++) hi[a * D + d] = r[d] / nrm;
}

console.error(`vecindarios sobre muestra de ${M}…`);
// Rangos en alta dimensión (coseno) y en 3D (euclídea sobre la proyección).
const K_LIST = [5, 10, 20];
const KMAX = Math.max(...K_LIST);
const hiNN = new Int32Array(M * KMAX);
const loNN = new Int32Array(M * KMAX);
const hiRankOf = [];

const dHi = new Float64Array(M);
const dLo = new Float64Array(M);
const order = new Int32Array(M);
for (let a = 0; a < M; a++) {
  for (let b = 0; b < M; b++) {
    let dot = 0;
    for (let d = 0; d < D; d++) dot += hi[a * D + d] * hi[b * D + d];
    dHi[b] = 1 - dot; // distancia coseno
    const dx = proj3[sIdx[a] * 3] - proj3[sIdx[b] * 3];
    const dy = proj3[sIdx[a] * 3 + 1] - proj3[sIdx[b] * 3 + 1];
    const dz = proj3[sIdx[a] * 3 + 2] - proj3[sIdx[b] * 3 + 2];
    dLo[b] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  for (let b = 0; b < M; b++) order[b] = b;
  const oh = Array.from(order).filter((b) => b !== a).sort((x, y) => dHi[x] - dHi[y]);
  const ol = Array.from(order).filter((b) => b !== a).sort((x, y) => dLo[x] - dLo[y]);
  for (let k = 0; k < KMAX; k++) {
    hiNN[a * KMAX + k] = oh[k];
    loNN[a * KMAX + k] = ol[k];
  }
  const rk = new Int32Array(M);
  for (let p = 0; p < oh.length; p++) rk[oh[p]] = p + 1;
  hiRankOf.push(rk);
}

// Trustworthiness (Venna & Kaski): penaliza vecinos que la proyección
// INVENTA — los que se ven cerca en 3D pero están lejos en 1024.
function trustworthiness(K) {
  let sum = 0;
  for (let a = 0; a < M; a++) {
    const inHi = new Set();
    for (let k = 0; k < K; k++) inHi.add(hiNN[a * KMAX + k]);
    for (let k = 0; k < K; k++) {
      const b = loNN[a * KMAX + k];
      if (!inHi.has(b)) sum += hiRankOf[a][b] - K;
    }
  }
  const norm = (2 / (M * K * (2 * M - 3 * K - 1))) * sum;
  return 1 - norm;
}
// Continuity: penaliza vecinos que la proyección PIERDE.
function continuity(K) {
  let sum = 0;
  const loRank = [];
  for (let a = 0; a < M; a++) {
    const rk = new Int32Array(M);
    const arr = [];
    for (let b = 0; b < M; b++) if (b !== a) arr.push(b);
    arr.sort((x, y) => {
      const dx1 = proj3[sIdx[a] * 3] - proj3[sIdx[x] * 3];
      const dy1 = proj3[sIdx[a] * 3 + 1] - proj3[sIdx[x] * 3 + 1];
      const dz1 = proj3[sIdx[a] * 3 + 2] - proj3[sIdx[x] * 3 + 2];
      const dx2 = proj3[sIdx[a] * 3] - proj3[sIdx[y] * 3];
      const dy2 = proj3[sIdx[a] * 3 + 1] - proj3[sIdx[y] * 3 + 1];
      const dz2 = proj3[sIdx[a] * 3 + 2] - proj3[sIdx[y] * 3 + 2];
      return dx1 * dx1 + dy1 * dy1 + dz1 * dz1 - (dx2 * dx2 + dy2 * dy2 + dz2 * dz2);
    });
    for (let p = 0; p < arr.length; p++) rk[arr[p]] = p + 1;
    loRank.push(rk);
  }
  for (let a = 0; a < M; a++) {
    const inLo = new Set();
    for (let k = 0; k < K; k++) inLo.add(loNN[a * KMAX + k]);
    for (let k = 0; k < K; k++) {
      const b = hiNN[a * KMAX + k];
      if (!inLo.has(b)) sum += loRank[a][b] - K;
    }
  }
  const norm = (2 / (M * K * (2 * M - 3 * K - 1))) * sum;
  return 1 - norm;
}

// ---------- B3 · coseno de pares aleatorios ----------
// Si la masa cae en 0.6–0.8 la escala está comprimida: el RANKING sigue
// siendo válido, pero ningún umbral fijo lo es (`16` R-5a).
const PAIRS = 10000;
const cos = [];
for (let p = 0; p < PAIRS; p++) {
  // Determinista: pares por avance coprimo, no Math.random.
  const a = (p * 7919) % M;
  const b = (p * 104729 + 17) % M;
  if (a === b) continue;
  let dot = 0;
  for (let d = 0; d < D; d++) dot += hi[a * D + d] * hi[b * D + d];
  cos.push(dot);
}
cos.sort((x, y) => x - y);
const q = (f) => cos[Math.min(cos.length - 1, Math.floor(cos.length * f))];
const cosMean = cos.reduce((s, x) => s + x, 0) / cos.length;

// ---------- B4 · hubness (k-ocurrencia) ----------
// Cola derecha pesada = firma de hubness (Radovanović et al.): unos
// pocos conceptos aparecen en muchísimas listas de vecinos.
const K_HUB = 10;
const occ = new Int32Array(M);
for (let a = 0; a < M; a++) for (let k = 0; k < K_HUB; k++) occ[hiNN[a * KMAX + k]]++;
const occArr = Array.from(occ);
const occMean = occArr.reduce((s, x) => s + x, 0) / M;
const occSd = Math.sqrt(occArr.reduce((s, x) => s + (x - occMean) ** 2, 0) / M);
const skew = occArr.reduce((s, x) => s + ((x - occMean) / occSd) ** 3, 0) / M;
const topHubs = occArr
  .map((c, a) => ({ id: ids[sIdx[a]], count: c }))
  .sort((x, y) => y.count - x.count)
  .slice(0, 5);

// ---------- salida ----------
const out = {
  generatedFor: "DOCs/27 Fase B · DOCs/16 R-4 y R-5",
  dataset: {
    vectorsFile: "vectors.ndjson",
    vectors: N,
    dims: D,
    note:
      "Corpus COMPLETO: la siembra (2026-07-19) más los conceptos que añadió " +
      "el cron, recuperados de Vectorize vía /api/vectors " +
      "(fetch-missing-vectors.mjs). Antes esto cubría sólo el 46.8 % y las " +
      "cifras salían optimistas — ver DOCs/27 §5.",
  },
  projection: {
    explainedVarianceRatio: { pc1: evr[0], pc2: evr[1], pc3: evr[2] },
    cumulative3: evr[0] + evr[1] + evr[2],
    totalVariance: totalVar,
    screePartial: spectrum,
    screeSource: "spectrum.json (iteración ortogonal por bloques, monotonía comprobada)",
    screeNote:
      "Diez primeros valores propios como fracción de la varianza total, por " +
      "iteración de potencia con deflación. La ausencia de codo es el punto: " +
      "no hay 3 direcciones dominantes que justifiquen llamar 'fiel' a la vista.",
  },
  neighbourhood: {
    sample: M,
    sampleNote:
      "Muestreo determinista (paso fijo). Q_NX exacto sobre " + N +
      " puntos son ~46M distancias de 1024 dims; con " + M + " la estimación es estable.",
    trustworthiness: Object.fromEntries(K_LIST.map((K) => [`k${K}`, trustworthiness(K)])),
    continuity: Object.fromEntries(K_LIST.map((K) => [`k${K}`, continuity(K)])),
  },
  cosineScale: {
    randomPairs: cos.length,
    mean: cosMean,
    p01: q(0.01), p25: q(0.25), p50: q(0.5), p75: q(0.75), p99: q(0.99),
    interpretation:
      "Si la masa cae claramente por encima de 0 la escala está comprimida " +
      "(anisotropía): el ORDEN de los vecinos sigue siendo informativo, pero " +
      "ningún umbral absoluto de 'similar' lo es. DOCs/16 R-5a.",
  },
  hubness: {
    k: K_HUB,
    kOccurrenceMean: occMean,
    kOccurrenceSd: occSd,
    skewness: skew,
    topHubs,
    interpretation:
      "Asimetría alta = cola derecha pesada = unos pocos conceptos aparecen en " +
      "muchas listas de vecinos (Radovanović et al. 2010). DOCs/16 R-5b.",
  },
};
writeFileSync(`${RESULTS}/diagnostics.json`, JSON.stringify(out, null, 2));

// ---------- informe legible ----------
const pct = (x) => (x * 100).toFixed(2) + "%";
console.log("\n=== B1 · Varianza explicada (media centrada, base de producción) ===");
console.log(`CP1 ${pct(evr[0])}   CP2 ${pct(evr[1])}   CP3 ${pct(evr[2])}`);
console.log(`Acumulada CP1-3: ${pct(out.projection.cumulative3)}`);
if (spectrum) console.log("Espectro: " + spectrum.slice(0, 8).map((s) => pct(s)).join("  "));
console.log("\n=== B1 · Preservación de vecindarios (muestra " + M + ") ===");
for (const K of K_LIST) {
  console.log(
    `k=${String(K).padStart(2)}  trustworthiness ${out.neighbourhood.trustworthiness["k" + K].toFixed(4)}` +
      `   continuity ${out.neighbourhood.continuity["k" + K].toFixed(4)}`,
  );
}
console.log("\n=== B3 · Coseno de " + cos.length + " pares aleatorios ===");
console.log(
  `media ${cosMean.toFixed(4)}  p01 ${q(0.01).toFixed(3)}  p25 ${q(0.25).toFixed(3)}` +
    `  p50 ${q(0.5).toFixed(3)}  p75 ${q(0.75).toFixed(3)}  p99 ${q(0.99).toFixed(3)}`,
);
console.log("\n=== B4 · Hubness (k=" + K_HUB + ") ===");
console.log(`k-ocurrencia media ${occMean.toFixed(2)}  sd ${occSd.toFixed(2)}  asimetría ${skew.toFixed(3)}`);
console.log("top hubs (id·veces): " + topHubs.map((h) => `${h.id}·${h.count}`).join("  "));
console.log(`\n→ escrito ${RESULTS}/diagnostics.json`);
