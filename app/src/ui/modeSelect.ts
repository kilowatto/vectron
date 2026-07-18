import { fadeIn, fadeOut, staggerIn } from "./motion";

export type Mode = "principiante" | "intermedio" | "avanzado";

const STORAGE_KEY = "vectron_mode";

const MODES: { id: Mode; title: string; tag: string; desc: string }[] = [
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

function setStoredMode(mode: Mode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

/** Pantalla de entrada: elegir modo es elegir qué app abrir, no un ajuste. */
export function showModeSelect(): Promise<Mode> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.id = "mode-select";
    root.innerHTML = `
      <div class="mode-select-inner">
        <div class="mode-select-brand">VECTRON</div>
        <p class="mode-select-sub">¿Con qué profundidad quieres explorar cómo piensa un LLM?</p>
        <div class="mode-cards">
          ${MODES.map(
            (m) => `
            <button class="mode-card" data-mode="${m.id}">
              <span class="mode-card-tag">${m.tag}</span>
              <span class="mode-card-title">${m.title}</span>
              <span class="mode-card-desc">${m.desc}</span>
            </button>`,
          ).join("")}
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const brand = root.querySelector<HTMLElement>(".mode-select-brand")!;
    const sub = root.querySelector<HTMLElement>(".mode-select-sub")!;
    const cardsWrap = root.querySelector<HTMLElement>(".mode-cards")!;
    fadeIn(brand, { duration: 450, delay: 0 });
    fadeIn(sub, { duration: 450, delay: 90 });
    staggerIn(cardsWrap, { initialDelay: 220, step: 90, duration: 500 });

    root.querySelectorAll<HTMLButtonElement>(".mode-card").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.dataset.mode as Mode;
        setStoredMode(mode);
        await fadeOut(root, { duration: 380 });
        root.remove();
        resolve(mode);
      });
    });
  });
}

/**
 * Control persistente para cambiar de modo sin volver a la portada:
 * cambiar de modo es cambiar de app, no "salir" de la app — el nuevo
 * modo ya queda guardado antes de recargar, así que se entra directo
 * a él, nunca a la pantalla de selección.
 */
export function createModeSwitcher(current: Mode): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.id = "mode-switcher";
  wrap.innerHTML = MODES.map(
    (m) =>
      `<button data-mode="${m.id}" class="${m.id === current ? "active" : ""}">${m.title}</button>`,
  ).join("");

  wrap.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode as Mode;
      if (mode === current) return;
      setStoredMode(mode);
      location.reload();
    });
  });

  document.body.appendChild(wrap);
  return wrap;
}
