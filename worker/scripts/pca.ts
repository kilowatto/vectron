/**
 * Minimal PCA (power iteration + deflation) — no external deps.
 * Good enough for a few hundred points at build/seed time. UMAP with a
 * real neighbor graph is the upgrade path noted in the plan for Fase 2+.
 */
export function pcaReduce(vectors: number[][], componentCount = 3): number[][] {
  const n = vectors.length;
  const dim = vectors[0].length;

  const mean = new Float64Array(dim);
  for (const v of vectors) {
    for (let j = 0; j < dim; j++) mean[j] += v[j];
  }
  for (let j = 0; j < dim; j++) mean[j] /= n;

  const centered = vectors.map((v) => {
    const c = new Float64Array(dim);
    for (let j = 0; j < dim; j++) c[j] = v[j] - mean[j];
    return c;
  });

  // Covariance matrix (dim x dim), flattened row-major.
  const cov = new Float64Array(dim * dim);
  for (const v of centered) {
    for (let i = 0; i < dim; i++) {
      const vi = v[i];
      if (vi === 0) continue;
      for (let j = 0; j < dim; j++) {
        cov[i * dim + j] += vi * v[j];
      }
    }
  }
  for (let i = 0; i < cov.length; i++) cov[i] /= n;

  function matVec(mat: Float64Array, vec: Float64Array): Float64Array {
    const out = new Float64Array(dim);
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      const rowOffset = i * dim;
      for (let j = 0; j < dim; j++) sum += mat[rowOffset + j] * vec[j];
      out[i] = sum;
    }
    return out;
  }

  function normalize(vec: Float64Array): number {
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < dim; i++) vec[i] /= norm;
    return norm;
  }

  const components: Float64Array[] = [];
  const workingCov = cov.slice();

  for (let c = 0; c < componentCount; c++) {
    let v = new Float64Array(dim);
    for (let i = 0; i < dim; i++) v[i] = Math.random() - 0.5;
    normalize(v);

    let eigenvalue = 0;
    for (let iter = 0; iter < 120; iter++) {
      const next = matVec(workingCov, v);
      eigenvalue = normalize(next);
      v = next;
    }

    components.push(v);

    // Deflate: workingCov -= eigenvalue * v v^T
    for (let i = 0; i < dim; i++) {
      const vi = v[i];
      const rowOffset = i * dim;
      for (let j = 0; j < dim; j++) {
        workingCov[rowOffset + j] -= eigenvalue * vi * v[j];
      }
    }
  }

  return centered.map((v) => {
    const point: number[] = [];
    for (const comp of components) {
      let dot = 0;
      for (let i = 0; i < dim; i++) dot += v[i] * comp[i];
      point.push(dot);
    }
    return point;
  });
}

/** Rescale each axis independently so the cloud fills roughly [-scale, scale]. */
export function normalizeToCube(points: number[][], scale = 1.25): number[][] {
  const dims = points[0].length;
  const maxAbs = new Array(dims).fill(0);
  for (const p of points) {
    for (let i = 0; i < dims; i++) maxAbs[i] = Math.max(maxAbs[i], Math.abs(p[i]));
  }
  return points.map((p) => p.map((v, i) => (maxAbs[i] > 0 ? (v / maxAbs[i]) * scale : 0)));
}
