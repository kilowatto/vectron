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

export function clearStoredMode() {
  localStorage.removeItem(STORAGE_KEY);
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

    root.querySelectorAll<HTMLButtonElement>(".mode-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode as Mode;
        setStoredMode(mode);
        root.remove();
        resolve(mode);
      });
    });
  });
}

/** Control persistente y discreto para volver a elegir modo. */
export function createModeSwitcher(current: Mode): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = "mode-switcher";
  btn.textContent = `modo: ${current}`;
  btn.addEventListener("click", () => {
    clearStoredMode();
    location.reload();
  });
  document.body.appendChild(btn);
  return btn;
}
