import * as THREE from "three/webgpu";

/**
 * Etiquetas ancladas a objetos de la escena — D5 de `DOCs/27`
 * (`15` R-16, `13` §11.1).
 *
 * ### Por qué
 * Contigüidad espacial de Mayer, *d* = 1.10 — el efecto más grande de
 * todo el corpus de multimedia. Cuando un texto NOMBRA algo que está en
 * pantalla y se imprime lejos de ello, el aprendiz paga el coste de
 * buscarlo, y ese coste sale del mismo presupuesto que necesita para
 * entender. `15` R-16 pide anclar el texto del dock a los objetos que
 * menciona; esto es la primitiva que faltaba: no existía NADA de
 * anclaje en el repo.
 *
 * ### Cómo
 * Se proyecta la posición 3D a coordenadas de pantalla cada cuadro y se
 * posiciona un elemento del DOM encima. Se oculta solo cuando el punto
 * queda detrás de la cámara o fuera del viewport — un anclaje que se
 * queda pegado al borde apuntando a algo invisible miente sobre dónde
 * está la cosa.
 */

export interface AnchoredLabel {
  /** Mueve el ancla. */
  setPosition(world: THREE.Vector3): void;
  setText(text: string): void;
  setVisible(visible: boolean): void;
  /** Llamar por cuadro con la cámara viva. */
  update(camera: THREE.Camera, canvas: HTMLCanvasElement): void;
  dispose(): void;
}

export function createAnchoredLabel(
  host: HTMLElement,
  opts: { className?: string; text?: string } = {},
): AnchoredLabel {
  const el = document.createElement("div");
  el.className = `vx-anchored ${opts.className ?? ""}`.trim();
  // aria-hidden: el texto ya vive en el dock, que es donde un lector de
  // pantalla lo encuentra en orden. Duplicarlo aquí lo leería dos veces
  // y sin el contexto que lo hace entendible.
  el.setAttribute("aria-hidden", "true");
  if (opts.text) el.textContent = opts.text;
  host.appendChild(el);

  const world = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let visible = true;

  return {
    setPosition(p) {
      world.copy(p);
    },
    setText(text) {
      el.textContent = text;
    },
    setVisible(v) {
      visible = v;
      if (!v) el.style.opacity = "0";
    },
    update(camera, canvas) {
      if (!visible) return;
      projected.copy(world).project(camera);
      // z fuera de [-1,1] = detrás de la cámara o pasado el far plane.
      const onScreen =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) <= 1.05 &&
        Math.abs(projected.y) <= 1.05;
      if (!onScreen) {
        el.style.opacity = "0";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + ((projected.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - projected.y) / 2) * rect.height;
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      el.style.opacity = "1";
    },
    dispose() {
      el.remove();
    },
  };
}
