import { attachShadow } from "./shadow";
import { getStoredLang, t, type Lang } from "../../i18n";
import { fadeOut, reducedMotion } from "../motion";
import css from "./guidedOpening.css?inline";

/**
 * `<vx-guided-opening>` — la apertura guiada de tres tiempos de
 * Principiante (C1–C3 de `DOCs/27`, R-6 de la auditoría pedagógica).
 *
 * ### Por qué existe, y por qué NO es un cubo libre
 * `15` §3.3 es tajante: el insight requiere una interpretación previa
 * que derribar. Quien llega sin modelo de cómo funciona la búsqueda no
 * tiene nada que reinterpretar y *"experimentará el cubo como agradable
 * e infalsable"*. Y Kounios y Beeman (2014) añaden que la atención
 * dirigida internamente PRECEDE al insight — evidencia en contra de
 * abrir con una pantalla de máxima estimulación, y específicamente
 * contra abrir sobre un campo de partículas con bloom.
 *
 * De ahí la estructura de tres tiempos:
 *   1 · PROVOCAR   una predicción, no una explicación. El aprendiz
 *                  apuesta antes de ver nada.
 *   2 · CONTRADECIR el resultado REAL, que desmiente la apuesta léxica.
 *   3 · NOMBRAR    el aprendiz enuncia la regla; Vectron la confirma y
 *                  la nombra UNA vez.
 * Es descubrimiento guiado (Mayer, 2004), no exploración libre.
 *
 * ### Los números son reales y están medidos
 * El par no se eligió a ojo. Se auditaron los vecindarios de los 300
 * conceptos del conjunto de enseñanza (C4, `teaching-set-audit.json`:
 * 294 limpios) y luego se buscó específicamente una semilla cuyo vecino
 * top fuera semántico y NO léxico, más un distractor real que
 * compartiera letras sin compartir significado:
 *
 *   ingeniero ↔ ingenuo       0.473   ← 5 letras compartidas, casi azar
 *   ingeniero ↔ electricista  0.793   ← 0 letras compartidas
 *   suelo de azar del corpus  0.412   (10 000 pares aleatorios)
 *
 * Ambos cosenos vienen de `/api/cosine`, que es el EXACTO — no de la
 * búsqueda ANN aproximada. Que `ingenuo` esté a 0.473, apenas por
 * encima de dos palabras sin relación, es lo que hace que la lección
 * cierre: el parecido de letras no es sólo peor, es casi ruido.
 *
 * ### Saltable a propósito
 * `15` prescribe esta apertura, pero obligar a pasarla convertiría el
 * descubrimiento guiado en un peaje. Se puede saltar, y no vuelve a
 * salir (localStorage).
 */

const SEEN_KEY = "vectron_opening_seen";

/** C6 · sonda de ubicación (R-17). Tres preguntas, no bloqueante, con
 * override — Kalyuga (2007) y Sweller et al. (1998): la autoselección
 * sola deja al novato "silenciosamente sobrecargado".
 *
 * Aquí el problema es el SIMÉTRICO y hay que decirlo: desde que se
 * quitó la pantalla de tres tarjetas, ya nadie autoselecciona — todo el
 * mundo entra en Principiante. Así que la sonda no evita sobrecargar a
 * un novato: evita ABURRIR a quien ya sabe y no se ha enterado de que
 * puede subir. Misma herramienta, riesgo invertido.
 *
 * Sólo sugiere. Nunca cambia de nivel sola: el override no es una
 * concesión, es el requisito de R-17. */
const PROBE = [
  { key: "q1", weight: 1 },
  { key: "q2", weight: 1 },
  { key: "q3", weight: 1 },
] as const;

export function openingAlreadySeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false; // modo privado: se muestra, no se rompe
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* sin persistencia: la apertura volverá a salir, que es preferible a fallar */
  }
}

/** Cifras medidas — ver el bloque de arriba. No se recalculan en vivo a
 * propósito: son el guion de una lección, y una lección cuyo ejemplo
 * cambia solo no se puede revisar ni traducir. */
const LESSON = {
  seed: { es: "ingeniero", en: "engineer" },
  lexical: { es: "ingenuo", en: "naive" },
  semantic: { es: "electricista", en: "electrician" },
  cosLexical: 0.473,
  cosSemantic: 0.793,
  chance: 0.412,
};

export class VxGuidedOpening extends HTMLElement {
  #root!: ShadowRoot;
  #beat = 1;
  #picked: "lexical" | "semantic" | null = null;
  #probeYes = 0;
  #probeIdx = 0;
  /** Nivel sugerido por la sonda, o null si no se completó. */
  suggestedMode: "principiante" | "intermedio" | "avanzado" | null = null;
  #resolve: (() => void) | null = null;

  /** Se resuelve cuando el aprendiz termina o salta. */
  run(): Promise<void> {
    return new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  connectedCallback() {
    if (this.shadowRoot) return;
    this.#root = attachShadow(this, css);
    this.#render();
  }

  #finish(): void {
    markSeen();
    const done = () => {
      this.remove();
      this.#resolve?.();
      this.#resolve = null;
    };
    if (reducedMotion) done();
    else void fadeOut(this, { duration: 260 }).then(done);
  }

  #render(): void {
    const lang: Lang = getStoredLang();
    const L = (k: { es: string; en: string }) => k[lang];
    const seed = L(LESSON.seed);
    const lex = L(LESSON.lexical);
    const sem = L(LESSON.semantic);

    let body = "";
    if (this.#beat === 1) {
      // TIEMPO 1 · provocar. Una predicción, no una explicación: sin
      // apuesta previa no hay nada que contradecir en el tiempo 2.
      body = `
        <p class="kicker">${t("openingBeat1Kicker", lang)}</p>
        <h2 class="ask">${t("openingBeat1Ask", lang).replace("{seed}", `<b>${seed}</b>`)}</h2>
        <div class="options">
          <button class="opt" data-pick="lexical">
            <span class="opt-word">${lex}</span>
            <span class="opt-why">${t("openingOptLexical", lang)}</span>
          </button>
          <button class="opt" data-pick="semantic">
            <span class="opt-word">${sem}</span>
            <span class="opt-why">${t("openingOptSemantic", lang)}</span>
          </button>
        </div>`;
    } else if (this.#beat === 2) {
      // TIEMPO 2 · contradecir con el resultado REAL. El acierto y el
      // fallo reciben marcos distintos: acertar no debe sentirse como
      // que la lección sobraba, y fallar no debe sentirse como castigo
      // — es fracaso productivo (Kapur, 2008), la parte que enseña.
      const right = this.#picked === "semantic";
      const barLex = Math.round(((LESSON.cosLexical - LESSON.chance) / (1 - LESSON.chance)) * 100);
      const barSem = Math.round(((LESSON.cosSemantic - LESSON.chance) / (1 - LESSON.chance)) * 100);
      body = `
        <p class="kicker">${t("openingBeat2Kicker", lang)}</p>
        <div class="result">
          <div class="res-row ${right ? "" : "res-loser"}">
            <span class="res-word">${lex}</span>
            <div class="res-bar"><div class="res-fill" style="width:${Math.max(barLex, 2)}%"></div></div>
            <span class="res-score">${LESSON.cosLexical.toFixed(2)}</span>
          </div>
          <div class="res-row res-winner">
            <span class="res-word">${sem}</span>
            <div class="res-bar"><div class="res-fill" style="width:${barSem}%"></div></div>
            <span class="res-score">${LESSON.cosSemantic.toFixed(2)}</span>
          </div>
        </div>
        <p class="verdict">${t(right ? "openingBeat2Right" : "openingBeat2Wrong", lang)
          .replace("{lex}", `<b>${lex}</b>`)
          .replace("{sem}", `<b>${sem}</b>`)}</p>
        <p class="chance">${t("openingBeat2Chance", lang).replace("{chance}", LESSON.chance.toFixed(2))}</p>
        <div class="options">
          <button class="opt opt-next" data-next="3">${t("openingContinue", lang)}</button>
        </div>`;
    } else if (this.#beat === 4) {
      // C6 · sonda de ubicación. Va DESPUÉS de la lección, no antes:
      // preguntarle a alguien "¿cuánto sabes?" antes de enseñarle nada
      // mide su confianza, no su nivel — y la confianza es justo lo que
      // la lección acaba de mover.
      const q = PROBE[this.#probeIdx];
      body = `
        <p class="kicker">${t("probeKicker", lang)} · ${this.#probeIdx + 1}/${PROBE.length}</p>
        <h2 class="ask">${t(("probe_" + q.key) as never, lang)}</h2>
        <div class="options">
          <button class="opt" data-probe="1">${t("probeYes", lang)}</button>
          <button class="opt" data-probe="0">${t("probeNo", lang)}</button>
        </div>`;
    } else if (this.#beat === 5) {
      // Resultado: SUGERENCIA, nunca cambio automático.
      const sugg = this.suggestedMode!;
      body = `
        <p class="kicker">${t("probeKicker", lang)}</p>
        <p class="verdict">${t(
          sugg === "principiante" ? "probeStay" : "probeSuggest",
          lang,
        ).replace("{mode}", `<b>${t(("mode" + sugg[0].toUpperCase() + sugg.slice(1) + "Title") as never, lang)}</b>`)}</p>
        <div class="options">
          ${
            sugg === "principiante"
              ? ""
              : `<button class="opt opt-next" data-accept="${sugg}">${t("probeAccept", lang)}</button>`
          }
          <button class="opt" data-done="1">${t(sugg === "principiante" ? "openingEnter" : "probeDecline", lang)}</button>
        </div>`;
    } else {
      // TIEMPO 3 · que lo enuncie el aprendiz. Elegir la formulación es
      // recuperación activa, no lectura; y sólo DESPUÉS Vectron nombra
      // el concepto, una vez.
      body = `
        <p class="kicker">${t("openingBeat3Kicker", lang)}</p>
        <h2 class="ask">${t("openingBeat3Ask", lang)}</h2>
        <div class="options">
          <button class="opt" data-rule="letters">${t("openingRuleLetters", lang)}</button>
          <button class="opt" data-rule="meaning">${t("openingRuleMeaning", lang)}</button>
        </div>
        <p class="named" hidden>${t("openingNamed", lang)}</p>
        <div class="options options-end" hidden>
          <button class="opt opt-next" data-probe-start="1">${t("openingContinue", lang)}</button>
        </div>`;
    }

    this.#root.innerHTML = `
      <div class="panel" role="dialog" aria-modal="true" aria-label="${t("openingAria", lang)}">
        <div class="steps" aria-hidden="true">
          ${[1, 2, 3].map((n) => `<span class="step ${n <= this.#beat ? "on" : ""}"></span>`).join("")}
        </div>
        ${body}
        <button class="skip" type="button">${t("openingSkip", lang)}</button>
      </div>`;

    this.#root.querySelector<HTMLButtonElement>(".skip")!.addEventListener("click", () => this.#finish());

    this.#root.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => {
        this.#picked = b.dataset.pick as "lexical" | "semantic";
        this.#beat = 2;
        this.#render();
      }),
    );
    this.#root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => {
      this.#beat = 3;
      this.#render();
    });
    this.#root.querySelectorAll<HTMLButtonElement>("[data-rule]").forEach((b) =>
      b.addEventListener("click", () => {
        // Se nombra el concepto SÓLO después de que el aprendiz eligió.
        // Da igual cuál eligió: la corrección ya la hizo el dato en el
        // tiempo 2, así que aquí nombrar sin regañar es lo correcto.
        this.#root.querySelectorAll<HTMLButtonElement>("[data-rule]").forEach((o) => {
          o.disabled = true;
          o.classList.toggle("chosen", o === b);
        });
        this.#root.querySelector<HTMLElement>(".named")!.hidden = false;
        this.#root.querySelector<HTMLElement>(".options-end")!.hidden = false;
        // El botón del tiempo 3 pasó a ser [data-probe-start] al añadir
        // la sonda; enfocar [data-done] aquí no encontraba nada y dejaba
        // sin foco a quien navega por teclado.
        this.#root.querySelector<HTMLButtonElement>("[data-probe-start]")?.focus();
      }),
    );
    this.#root.querySelector<HTMLButtonElement>("[data-probe-start]")?.addEventListener("click", () => {
      this.#beat = 4;
      this.#render();
    });
    this.#root.querySelectorAll<HTMLButtonElement>("[data-probe]").forEach((b) =>
      b.addEventListener("click", () => {
        this.#probeYes += Number(b.dataset.probe);
        this.#probeIdx++;
        if (this.#probeIdx >= PROBE.length) {
          // 0-1 sí → Principiante · 2 → Intermedio · 3 → Avanzado.
          this.suggestedMode =
            this.#probeYes >= 3 ? "avanzado" : this.#probeYes === 2 ? "intermedio" : "principiante";
          this.#beat = 5;
        }
        this.#render();
      }),
    );
    this.#root.querySelector<HTMLButtonElement>("[data-accept]")?.addEventListener("click", (e) => {
      const mode = (e.currentTarget as HTMLElement).dataset.accept!;
      this.dispatchEvent(
        new CustomEvent("vx-probe-accept", { detail: { mode }, bubbles: true, composed: true }),
      );
      this.#finish();
    });
    this.#root.querySelector<HTMLButtonElement>("[data-done]")?.addEventListener("click", () => this.#finish());

    // Foco al primer control: quien navega por teclado entra en la
    // lección, no en el final del documento.
    this.#root.querySelector<HTMLButtonElement>(".opt")?.focus();
  }
}

customElements.define("vx-guided-opening", VxGuidedOpening);
