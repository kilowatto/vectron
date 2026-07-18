import * as THREE from "three/webgpu";

/**
 * Hover sobre líneas: muestra el valor real que la línea representa
 * (similitud de coseno entre los dos embeddings que conecta).
 *
 * Cada línea que quiera ser "hovereable" se registra en
 * `hoverableLines` y lleva en `userData.segments` un arreglo de
 * etiquetas pre-formateadas, una por segmento, en el MISMO orden en
 * que sus segmentos existen en la geometría (pares de vértices de
 * LineSegments). Quien crea la línea es responsable de ambas cosas —
 * ver particleField.setSimilarityLines / setChainLines / tokenMode.
 */
export const hoverableLines = new Set<THREE.Object3D>();

export class LineHoverTooltip {
  #el: HTMLDivElement;

  constructor(stage: HTMLElement) {
    this.#el = document.createElement("div");
    this.#el.style.cssText = [
      "position:absolute",
      "z-index:30",
      "pointer-events:none",
      "display:none",
      "padding:4px 8px",
      "border-radius:5px",
      "background:rgba(10,13,17,0.92)",
      "border:1px solid rgba(231,226,214,0.25)",
      "font-family:var(--font-mono)",
      "font-size:11px",
      "color:var(--ink)",
      "white-space:nowrap",
    ].join(";");
    stage.appendChild(this.#el);
  }

  /** Raycastea las líneas registradas; si el cursor está sobre un
   * segmento con etiqueta, muestra el tooltip. Devuelve si se mostró. */
  tryShow(raycaster: THREE.Raycaster, clientX: number, clientY: number): boolean {
    if (hoverableLines.size === 0) {
      this.hide();
      return false;
    }
    const prevThreshold = raycaster.params.Line.threshold;
    raycaster.params.Line.threshold = 0.025;
    const hits = raycaster.intersectObjects([...hoverableLines], false);
    raycaster.params.Line.threshold = prevThreshold;

    for (const hit of hits) {
      const segments = hit.object.userData.segments as string[] | undefined;
      if (!segments || hit.index === undefined) continue;
      // LineSegments: cada segmento son 2 vértices; `index` es el primero.
      const label = segments[Math.floor(hit.index / 2)];
      if (!label) continue;
      const stageRect = this.#el.parentElement!.getBoundingClientRect();
      this.#el.textContent = label;
      this.#el.style.left = `${clientX - stageRect.left + 14}px`;
      this.#el.style.top = `${clientY - stageRect.top + 14}px`;
      this.#el.style.display = "block";
      return true;
    }
    this.hide();
    return false;
  }

  hide(): void {
    this.#el.style.display = "none";
  }
}
