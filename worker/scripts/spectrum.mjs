/**
 * Espectro de valores propios BIEN calculado — cierra la deuda declarada
 * en `diagnostics.mjs`, donde la iteración de potencia con deflación
 * secuencial no convergía en la cola (salía CP7 > CP6, imposible en
 * valores propios reales: por definición son decrecientes).
 *
 * Método: se materializa la covarianza 1024×1024 UNA vez (aprovechando
 * simetría) y luego se corre iteración ORTOGONAL por bloques — un bloque
 * de K vectores que se re-ortogonaliza (Gram-Schmidt) en cada paso. A
 * diferencia de la deflación secuencial, aquí la ortogonalidad se impone
 * en cada iteración en vez de acumular error, y el orden decreciente
 * sale garantizado. Además, con C materializada cada iteración cuesta
 * D²·K en vez de N·D·K, o sea ~9× menos.
 *
 * Uso: node --max-old-space-size=4096 worker/scripts/spectrum.mjs
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const OUT = "worker/scripts/out";        // insumos (ignorados por git: 187 MB)
const RESULTS = "worker/diagnostics";   // resultados (versionados — el plan pide cifras rastreables)
const D = 1024;
const K = 16; // componentes a extraer
const ITERS = 300;

const basis = JSON.parse(readFileSync(`${OUT}/pca_basis.json`, "utf8"));
const mean = Float64Array.from(basis.mean);

console.error("cargando vectores…");
const rows = [];
{
  const rl = createInterface({ input: createReadStream(`${OUT}/vectors.ndjson`) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const v = JSON.parse(line).values;
    const r = new Float64Array(D);
    for (let d = 0; d < D; d++) r[d] = v[d] - mean[d];
    rows.push(r);
  }
}
const N = rows.length;
console.error(`  ${N} vectores centrados`);

// ---------- covarianza (simétrica, se llena media matriz) ----------
console.error("covarianza 1024×1024…");
const t0 = Date.now();
const C = new Float64Array(D * D);
for (let i = 0; i < N; i++) {
  const r = rows[i];
  for (let a = 0; a < D; a++) {
    const ra = r[a];
    if (ra === 0) continue;
    const off = a * D;
    for (let b = a; b < D; b++) C[off + b] += ra * r[b];
  }
}
const denom = N - 1;
for (let a = 0; a < D; a++) {
  for (let b = a; b < D; b++) {
    const v = C[a * D + b] / denom;
    C[a * D + b] = v;
    C[b * D + a] = v; // espejo
  }
}
let totalVar = 0;
for (let a = 0; a < D; a++) totalVar += C[a * D + a]; // traza
console.error(`  hecha en ${((Date.now() - t0) / 1000).toFixed(1)}s · traza ${totalVar.toFixed(6)}`);

// ---------- iteración ortogonal por bloques ----------
console.error(`iteración ortogonal (K=${K}, ${ITERS} pasos)…`);
let Q = [];
for (let k = 0; k < K; k++) {
  const v = new Float64Array(D);
  // Semilla determinista — el diagnóstico debe reproducirse exactamente.
  for (let d = 0; d < D; d++) v[d] = Math.sin((d + 1) * (k + 1) * 12.9898) * 43758.5453 % 1;
  Q.push(v);
}
function gramSchmidt(vs) {
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i];
    for (let j = 0; j < i; j++) {
      const u = vs[j];
      let dot = 0;
      for (let d = 0; d < D; d++) dot += v[d] * u[d];
      for (let d = 0; d < D; d++) v[d] -= dot * u[d];
    }
    let nrm = 0;
    for (let d = 0; d < D; d++) nrm += v[d] * v[d];
    nrm = Math.sqrt(nrm) || 1;
    for (let d = 0; d < D; d++) v[d] /= nrm;
  }
}
gramSchmidt(Q);
for (let it = 0; it < ITERS; it++) {
  const next = [];
  for (const v of Q) {
    const w = new Float64Array(D);
    for (let a = 0; a < D; a++) {
      let s = 0;
      const off = a * D;
      for (let b = 0; b < D; b++) s += C[off + b] * v[b];
      w[a] = s;
    }
    next.push(w);
  }
  gramSchmidt(next);
  Q = next;
}
// Cociente de Rayleigh: λ = qᵀ C q
const eig = Q.map((v) => {
  let s = 0;
  for (let a = 0; a < D; a++) {
    let t = 0;
    const off = a * D;
    for (let b = 0; b < D; b++) t += C[off + b] * v[b];
    s += v[a] * t;
  }
  return s;
});

// Comprobación de sanidad: ¿salen decrecientes? Si no, no convergió.
let monotone = true;
for (let k = 1; k < eig.length; k++) if (eig[k] > eig[k - 1] + 1e-12) monotone = false;

const ratios = eig.map((e) => e / totalVar);
const cum = [];
let acc = 0;
for (const r of ratios) {
  acc += r;
  cum.push(acc);
}

// ¿Cuántos componentes harían falta para el 50 % y el 90 %? Con el
// espectro plano la respuesta es el argumento entero: muchísimos.
const rest = 1 - acc;
const avgTail = rest / (D - K);

const out = {
  method: "iteración ortogonal por bloques sobre covarianza materializada",
  vectors: N,
  dims: D,
  components: K,
  iterations: ITERS,
  monotoneDecreasing: monotone,
  totalVariance: totalVar,
  explainedVarianceRatio: ratios,
  cumulative: cum,
  tail: {
    remainingRatio: rest,
    remainingComponents: D - K,
    averagePerRemainingComponent: avgTail,
  },
};
writeFileSync(`${RESULTS}/spectrum.json`, JSON.stringify(out, null, 2));

const pct = (x) => (x * 100).toFixed(3) + "%";
console.log("\n=== Espectro (iteración ortogonal, convergencia comprobada) ===");
console.log("decreciente monótono:", monotone ? "SÍ ✓" : "NO ✗ (no convergió)");
ratios.forEach((r, k) => {
  console.log(`  CP${String(k + 1).padStart(2)}  ${pct(r).padStart(8)}   acumulada ${pct(cum[k])}`);
});
console.log(`\nCola: ${D - K} componentes restantes suman ${pct(rest)}`);
console.log(`      → media por componente restante: ${pct(avgTail)}`);
console.log(`→ escrito ${RESULTS}/spectrum.json`);
