export type PartOfSpeech = "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio";

export interface Concept {
  id: number;
  word: { es: string; en: string };
  domain: string;
  taxonomy: string[];
  distinctiveTrait: string | null;
  traits: Record<string, string | number | boolean>;
  coords: [number, number, number];
  partOfSpeech: PartOfSpeech;
}

// En producción el mismo Worker sirve el frontend y la API (misma
// origin). En dev local (Vite en :5173) no hay Worker corriendo ahí,
// así que se apunta directo al deploy en workers.dev.
const API_BASE = import.meta.env.DEV
  ? "https://vectron-api.esteban-rey.workers.dev"
  : "";

export async function fetchConcepts(): Promise<Concept[]> {
  const res = await fetch(`${API_BASE}/api/concepts`);
  if (!res.ok) {
    throw new Error(`No se pudo cargar el dataset (${res.status})`);
  }
  return res.json();
}

export interface Neighbor {
  id: number;
  score: number;
}

/** Vecinos más cercanos reales, vía Vectorize (similitud de coseno). */
export async function fetchSimilar(
  id: number,
  topK = 6,
): Promise<Neighbor[]> {
  const res = await fetch(
    `${API_BASE}/api/similar?id=${id}&topK=${topK}`,
  );
  if (!res.ok) return [];
  const body = await res.json();
  return body.ok ? body.neighbors : [];
}

/** Base de PCA de la corrida de seed vigente — para proyectar embeddings
 * vivos (tokens/frase del modo token) al mismo cubo que las partículas. */
export interface PcaBasis {
  mean: number[];
  components: number[][];
  maxAbs: number[];
  cubeScale: number;
}

export async function fetchPcaBasis(): Promise<PcaBasis | null> {
  const res = await fetch(`${API_BASE}/api/pca-basis`);
  if (!res.ok) return null;
  return res.json();
}

/** Proyección de un embedding 1024-d al cubo 3D con la base guardada —
 * exactamente la misma aritmética que seed.ts/pca.ts aplicó al dataset:
 * centrar con la media, producto punto con cada eje, escalar por eje,
 * recortar (clip) al borde del cubo — mismo motivo que normalizeToCube
 * en pca.ts: sin el clip, una frase/token en vivo cuyo embedding cae
 * fuera del percentil 98 usado para calibrar `maxAbs` se dibujaría
 * fuera del cubo visible en vez de quedarse en su borde. */
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

/** Embeddings reales en vivo — cada texto va a Workers AI con el mismo
 * modelo del dataset (bge-m3) y regresa su vector 1024-d. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const res = await fetch(`${API_BASE}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.ok ? body.vectors : null;
}

/** Similitud de coseno real entre pares de conceptos del dataset (por id). */
export async function fetchCosinePairs(pairs: [number, number][]): Promise<(number | null)[]> {
  const res = await fetch(`${API_BASE}/api/cosine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairs }),
  });
  if (!res.ok) return pairs.map(() => null);
  const body = await res.json();
  return body.ok ? body.scores : pairs.map(() => null);
}

/** Vecinos reales para un vector arbitrario (partícula de token en vivo). */
export async function fetchSimilarByVector(vector: number[], topK = 6): Promise<Neighbor[]> {
  const res = await fetch(`${API_BASE}/api/similar-by-vector`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vector, topK }),
  });
  if (!res.ok) return [];
  const body = await res.json();
  return body.ok ? body.neighbors : [];
}

/** Coseno local entre dos vectores crudos (para líneas del modo token,
 * donde el cliente ya tiene ambos vectores — sin llamada extra). */
export function cosineLocal(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}
