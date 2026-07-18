export interface Concept {
  id: number;
  word: { es: string; en: string };
  domain: string;
  taxonomy: string[];
  distinctiveTrait: string | null;
  traits: Record<string, string | number | boolean>;
  coords: [number, number, number];
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
