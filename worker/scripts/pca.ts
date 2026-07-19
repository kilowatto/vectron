/**
 * Minimal PCA (power iteration + deflation) — no external deps.
 * Good enough for a few thousand points at build/seed time. UMAP with a
 * real neighbor graph is the upgrade path noted in the plan for Fase 2+.
 */

/** Todo lo necesario para proyectar un embedding NUEVO al mismo espacio
 * 3D del cubo sin re-correr PCA: se guarda junto al dataset (R2) y el
 * cliente lo usa para posicionar tokens/frases embebidos en vivo. */
export interface PcaBasis {
  mean: number[];
  components: number[][]; // componentCount x dim
  /** máximo absoluto por eje ANTES de escalar al cubo (ver normalizeToCube) */
  maxAbs: number[];
  cubeScale: number;
}

export function pcaReduce(
  vectors: number[][],
  componentCount = 3,
): { points: number[][]; mean: number[]; components: number[][] } {
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

  const points = centered.map((v) => {
    const point: number[] = [];
    for (const comp of components) {
      let dot = 0;
      for (let i = 0; i < dim; i++) dot += v[i] * comp[i];
      point.push(dot);
    }
    return point;
  });

  return {
    points,
    mean: Array.from(mean),
    components: components.map((c) => Array.from(c)),
  };
}

/**
 * Rescale each axis independently so the cloud fills roughly
 * [-scale, scale]. Bug real reportado en vivo (2026-07-19, con
 * capturas): escalar por el máximo absoluto EXACTO deja que un solo
 * outlier defina la escala de TODO el eje — el 99% de los puntos
 * quedaba comprimido cerca del centro mientras ese outlier terminaba
 * clavado justo en el borde del cubo, lejísimos de todo. Eso explicaba
 * tres síntomas a la vez: el cúmulo principal se veía chico/apagado,
 * partículas sueltas quedaban "muy muy lejos", y la mitosis/fusión
 * (que busca el vecino estable más cercano en 3D) le tocaba estirarse
 * a través de esa distancia artificial para esos outliers.
 *
 * Fix: usar el percentil 98 de |coordenada| por eje como referencia de
 * escala (no el máximo exacto), y recortar (clip) cualquier valor más
 * allá de [-scale, scale] después de escalar. El 98% "normal" de los
 * puntos ahora usa el cubo completo de verdad; el ~2% de outliers
 * reales se quedan pegados al borde del cubo — visibles, pero a una
 * distancia acotada, no arbitrariamente lejos. La posición real de PCA
 * sigue siendo honesta (un solo espacio compartido por los 3 modos,
 * ver DOCs/02 §01) — esto sólo cambia CÓMO se escala/acota, no reordena
 * ni separa nada por modo.
 */
export function normalizeToCube(
  points: number[][],
  scale = 1.25,
  percentile = 0.98,
): { points: number[][]; maxAbs: number[] } {
  const dims = points[0].length;
  const maxAbs = new Array(dims).fill(0);
  for (let i = 0; i < dims; i++) {
    const sorted = points.map((p) => Math.abs(p[i])).sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * percentile));
    maxAbs[i] = sorted[idx] || 1;
  }
  return {
    points: points.map((p) =>
      p.map((v, i) => {
        const scaled = maxAbs[i] > 0 ? (v / maxAbs[i]) * scale : 0;
        return Math.max(-scale, Math.min(scale, scaled));
      }),
    ),
    maxAbs,
  };
}

/**
 * Separación local (bug real reportado en vivo, con captura de zoom
 * máximo sobre un clúster de biología/animales — "sigo sin poder
 * entender esto porque siguen muy juntas"): reescalar TODO el cubo por
 * igual (normalizeToCube/CUBE_SCALE) no ayuda con bolsas LOCALES
 * genuinamente densas — regiones semánticas reales donde muchas
 * palabras son de verdad parecidas entre sí caen muy cerca unas de
 * otras en el espacio de PCA, sin importar cuánto se agrande el cubo
 * completo (la proporción relativa entre esa bolsa y el resto no
 * cambia con un reescalado uniforme). Y por geometría de cámara en
 * perspectiva, hacer zoom TAMPOCO ayuda — la razón entre el tamaño en
 * pantalla de una partícula y su separación de la vecina es constante
 * sin importar la distancia de cámara; sólo la separación REAL en el
 * espacio 3D puede resolverlo.
 *
 * Este es exactamente el mismo problema que resuelven los diagramas de
 * puntos "jittered"/beeswarm, o el término repulsivo de UMAP/t-SNE:
 * una relajación local que empuja SÓLO a los pares que de verdad se
 * traslapan, dejando intacto todo lo demás — la posición semántica
 * real de PCA se conserva a escala grande (mismo vecindario, mismo
 * clúster), sólo se separan los pares que quedarían indistinguibles
 * sin importar el zoom.
 *
 * Grid uniforme (no todos-contra-todos — O(n²) sería lento de verdad
 * con miles de puntos) + relajación por iteraciones con amortiguación,
 * el patrón estándar para esto.
 */
export function declumpPoints(
  points: number[][],
  minDist: number,
  iterations = 60,
  bound?: number,
): number[][] {
  const n = points.length;
  const pts = points.map((p) => [...p]);
  const cellOf = (p: number[]) =>
    `${Math.floor(p[0] / minDist)},${Math.floor(p[1] / minDist)},${Math.floor(p[2] / minDist)}`;

  for (let iter = 0; iter < iterations; iter++) {
    const grid = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const key = cellOf(pts[i]);
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }

    const disp: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
    let overlaps = 0;

    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const cx = Math.floor(p[0] / minDist);
      const cy = Math.floor(p[1] / minDist);
      const cz = Math.floor(p[2] / minDist);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const bucket = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j <= i) continue; // cada par una sola vez
              const q = pts[j];
              const ddx = p[0] - q[0];
              const ddy = p[1] - q[1];
              const ddz = p[2] - q[2];
              const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
              if (d >= minDist) continue;
              overlaps++;
              // Puntos casi coincidentes (embeddings ~idénticos): empuje
              // en una dirección aleatoria fija, no hay vector real que seguir.
              const [nx, ny, nz] =
                d > 1e-6
                  ? [ddx / d, ddy / d, ddz / d]
                  : [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
              const push = (minDist - d) * 0.5;
              disp[i][0] += nx * push;
              disp[i][1] += ny * push;
              disp[i][2] += nz * push;
              disp[j][0] -= nx * push;
              disp[j][1] -= ny * push;
              disp[j][2] -= nz * push;
            }
          }
        }
      }
    }

    if (overlaps === 0) break; // ya no hay nada que separar
    for (let i = 0; i < n; i++) {
      pts[i][0] += disp[i][0];
      pts[i][1] += disp[i][1];
      pts[i][2] += disp[i][2];
      // Bug real encontrado verificando esta misma corrida: recortar al
      // borde del cubo DESPUÉS de que toda la relajación terminó (un
      // paso separado) podía volver a juntar a dos puntos que la
      // separación ya había resuelto, si ambos quedaban más allá del
      // borde en el mismo eje — el clip los aplastaba al mismo valor
      // exacto. Recortar aquí, DENTRO de cada iteración, deja que el
      // límite del cubo actúe como una pared más contra la que
      // rebotar, resuelto junto con la separación, no después.
      if (bound !== undefined) {
        pts[i][0] = Math.max(-bound, Math.min(bound, pts[i][0]));
        pts[i][1] = Math.max(-bound, Math.min(bound, pts[i][1]));
        pts[i][2] = Math.max(-bound, Math.min(bound, pts[i][2]));
      }
    }
  }
  return pts;
}
