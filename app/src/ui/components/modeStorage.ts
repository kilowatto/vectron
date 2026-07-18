export type Mode = "principiante" | "intermedio" | "avanzado";

const STORAGE_KEY = "vectron_mode";

export const MODES: { id: Mode; title: string; tag: string; desc: string }[] = [
  {
    id: "principiante",
    title: "Principiante",
    tag: "Intuición",
    desc: "Explora el cubo con palabras y analogías simples — sin jerga técnica, sin números.",
  },
  {
    id: "intermedio",
    title: "Intermedio",
    tag: "Mecanismo",
    desc: "Tokenización con IDs reales, embeddings, y similitud de coseno con datos reales.",
  },
  {
    id: "avanzado",
    title: "Avanzado",
    tag: "Matemática real",
    desc: "Todo lo anterior, más el grafo de tensores y las ecuaciones reales de atención.",
  },
];

export function getStoredMode(): Mode | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "principiante" || v === "intermedio" || v === "avanzado" ? v : null;
}

export function setStoredMode(mode: Mode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}
