import { tokenizeBPE, tokenizeSimple, type Token } from "../tokenizer";

const EXAMPLE_PHRASES = [
  "El Rinoceronte Naranja que viene de la sabana le gusta el café Frida Café",
  "Python es un lenguaje de programación",
  "La gravedad y la luz son física",
  "El agujero negro está en la vía láctea",
];

export type TokenizerMode = "bpe" | "simple";

export interface TokenPanelOptions {
  /** Principiante: sin toggle BPE/Simplificado, tokenizador simple fijo. */
  showToggle?: boolean;
  /** Principiante: los chips no muestran el ID numérico del token. */
  showIds?: boolean;
  placeholder?: string;
  /** Intermedio/Avanzado: se monta dentro del dock como sección permanente. */
  mountTo?: HTMLElement;
  /** Principiante: barra ancha anclada abajo, look de app simple, no de tarjeta técnica. */
  variant?: "bottom";
}

export interface TokenPanel {
  root: HTMLDivElement;
  onChange: (handler: (tokens: Token[], mode: TokenizerMode) => void) => void;
}

export function createTokenPanel(options: TokenPanelOptions = {}): TokenPanel {
  const { showToggle = true, showIds = true, mountTo, variant } = options;

  const root = document.createElement("div");
  root.id = "token-panel";
  root.innerHTML = `
    ${mountTo ? `<h3 class="token-panel-title">1 · Tokenización</h3>` : ""}
    <div class="row">
      <input id="token-input" type="text" placeholder="${options.placeholder ?? "Escribe una frase o elige un ejemplo…"}" autocomplete="off" spellcheck="false" />
      ${
        showToggle
          ? `<div class="toggle" id="tokenizer-toggle">
               <button data-mode="bpe" class="active">BPE real</button>
               <button data-mode="simple">Simplificado</button>
             </div>`
          : ""
      }
    </div>
    <div class="examples" id="examples"></div>
    <div class="tokens" id="tokens"></div>
  `;

  if (mountTo) {
    root.classList.add("docked");
    mountTo.appendChild(root);
  } else {
    if (variant === "bottom") root.classList.add("bottom-bar");
    document.body.appendChild(root);
  }

  const input = root.querySelector<HTMLInputElement>("#token-input")!;
  const tokensEl = root.querySelector<HTMLDivElement>("#tokens")!;
  const examplesEl = root.querySelector<HTMLDivElement>("#examples")!;
  const toggleButtons = root.querySelectorAll<HTMLButtonElement>(
    "#tokenizer-toggle button",
  );

  let mode: TokenizerMode = showToggle ? "bpe" : "simple";
  let handler: ((tokens: Token[], mode: TokenizerMode) => void) | null = null;
  let requestSeq = 0;

  async function render() {
    const seq = ++requestSeq;
    const text = input.value;
    const tokens = text.trim()
      ? mode === "bpe"
        ? await tokenizeBPE(text)
        : tokenizeSimple(text)
      : [];
    if (seq !== requestSeq) return; // una escritura más reciente ya resolvió

    tokensEl.innerHTML = tokens
      .map(
        (t) =>
          `<span class="token"><b>${t.text.replace(/\s/g, "·")}</b>${showIds ? `<small>${t.id}</small>` : ""}</span>`,
      )
      .join("");
    handler?.(tokens, mode);
  }

  EXAMPLE_PHRASES.forEach((phrase) => {
    const chip = document.createElement("button");
    chip.className = "example";
    chip.textContent = phrase;
    chip.addEventListener("click", () => {
      input.value = phrase;
      render();
    });
    examplesEl.appendChild(chip);
  });

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode as TokenizerMode;
      toggleButtons.forEach((b) => b.classList.toggle("active", b === btn));
      render();
    });
  });

  input.addEventListener("input", render);

  return {
    root,
    onChange: (h) => {
      handler = h;
    },
  };
}
