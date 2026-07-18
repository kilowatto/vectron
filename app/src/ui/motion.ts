/** Pequeñas utilidades de animación (Web Animations API) — deliberadas,
 * no CSS-transition-on-class-toggle, para no depender de que el timing
 * del navegador coincida con el momento en que el contenido ya existe. */

export const reducedMotion =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function fadeIn(
  el: HTMLElement,
  { duration = 500, delay = 0, rise = 10 }: { duration?: number; delay?: number; rise?: number } = {},
): Animation | null {
  if (reducedMotion) {
    el.style.opacity = "1";
    el.style.transform = "none";
    return null;
  }
  el.style.opacity = "0";
  return el.animate(
    [
      { opacity: 0, transform: `translateY(${rise}px)` },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
  );
}

export function fadeOut(
  el: HTMLElement,
  { duration = 350 }: { duration?: number } = {},
): Promise<void> {
  if (reducedMotion) {
    el.style.opacity = "0";
    return Promise.resolve();
  }
  const anim = el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration,
    easing: "ease",
    fill: "forwards",
  });
  // Nunca debe bloquear lógica real esperando indefinidamente: en una
  // pestaña sin foco/en segundo plano el navegador puede no resolver
  // `finished` a tiempo (o nunca) — con un timeout de respaldo el flujo
  // de la app sigue aunque la animación no se vea.
  const safetyTimeout = new Promise<void>((resolve) =>
    setTimeout(resolve, duration + 150),
  );
  return Promise.race([anim.finished.then(() => undefined), safetyTimeout]);
}

/** Anima cada hijo directo de `container` con un pequeño retraso escalonado. */
export function staggerIn(
  container: HTMLElement,
  { step = 55, initialDelay = 0, duration = 480 }: { step?: number; initialDelay?: number; duration?: number } = {},
): void {
  const children = Array.from(container.children) as HTMLElement[];
  children.forEach((child, i) => {
    fadeIn(child, { duration, delay: initialDelay + i * step, rise: 12 });
  });
}

/** "Dibuja" el grafo de tensores: las cajas aparecen con un pop suave y
 * las líneas se trazan como si un lápiz las siguiera (stroke-dashoffset). */
export function drawTensorGraph(svg: SVGSVGElement): void {
  if (reducedMotion) return;
  const nodes = Array.from(svg.querySelectorAll<SVGRectElement>(".node"));
  const labels = Array.from(
    svg.querySelectorAll<SVGTextElement>(".node-label, .node-sub"),
  );
  const edges = Array.from(svg.querySelectorAll<SVGLineElement>(".edge"));

  edges.forEach((edge, i) => {
    const len =
      Math.hypot(
        edge.x2.baseVal.value - edge.x1.baseVal.value,
        edge.y2.baseVal.value - edge.y1.baseVal.value,
      ) + 4;
    edge.style.strokeDasharray = `${len}`;
    edge.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 420, delay: 120 + i * 90, easing: "ease-out", fill: "backwards" },
    );
  });

  nodes.forEach((node, i) => {
    node.style.transformOrigin = "center";
    node.animate(
      [
        { opacity: 0, transform: "scale(0.75)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 380, delay: 60 + i * 90, easing: "cubic-bezier(.34,1.4,.64,1)", fill: "backwards" },
    );
  });

  labels.forEach((label, i) => {
    label.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      delay: 220 + i * 45,
      easing: "ease",
      fill: "backwards",
    });
  });
}
