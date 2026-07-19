/** Copia exacta de app/src/data/concepts.ts (mismo nombre, misma
 * aritmética) — el Worker no puede importar del proyecto app/ (build
 * separado), así que esta proyección vive duplicada a propósito. Si
 * se toca una, tocar la otra. */
export interface PcaBasis {
  mean: number[];
  components: number[][];
  maxAbs: number[];
  cubeScale: number;
}

/** Proyecta un embedding 1024-d a la MISMA base guardada por el seed
 * original — así los conceptos nuevos caen en el mismo cubo que las
 * partículas existentes sin recalcular PCA (que movería a TODAS). */
export function projectWithBasis(vector: number[], basis: PcaBasis): [number, number, number] {
  const out: number[] = [];
  for (let c = 0; c < basis.components.length; c++) {
    const comp = basis.components[c];
    let dot = 0;
    for (let i = 0; i < vector.length; i++) {
      dot += (vector[i] - basis.mean[i]) * comp[i];
    }
    const scaled = basis.maxAbs[c] > 0 ? (dot / basis.maxAbs[c]) * basis.cubeScale : 0;
    out.push(Math.max(-basis.cubeScale, Math.min(basis.cubeScale, scaled)));
  }
  return out as [number, number, number];
}
