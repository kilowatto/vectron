import * as THREE from "three/webgpu";
import { Fn, attribute, color, float, mix, smoothstep, time, uniform } from "three/tsl";

/** Naranja, amarillo, verde y azul eléctricos — la paleta "sinapsis"
 * pedida explícitamente, no los acentos naranja/cian originales. */
export const ELECTRIC_PALETTE = [0xff7a1a, 0xffe14d, 0x39ff6a, 0x22c7ff];

export interface ElectricLine {
  object: THREE.LineSegments;
  /** Anima la revelación progresiva (0 → dibujada por completo) — se
   * llama una vez al crear la línea, no hay que orquestarla desde
   * afuera. */
  reveal(durationMs?: number): void;
  dispose(): void;
}

/**
 * Línea "sinapsis": brillo base tenue del color asignado + un pulso
 * mucho más brillante que viaja en loop a lo largo de cada polilínea
 * (additive blending, así el bloom que ya existe en el render pipeline
 * la hace brillar de verdad — no es un plano opaco). Se revela
 * progresivamente en vez de aparecer de golpe.
 *
 * `polylines`: cada una es una lista de ≥2 puntos ya conectados en
 * orden — una estrella de vecinos pasa varias polilíneas de 2 puntos
 * (el pulso reinicia en cada rayo); una cadena de frase pasa UNA sola
 * polilínea con todos los puntos (el pulso viaja continuo de punta a
 * punta).
 */
export function createElectricLine(
  polylines: THREE.Vector3[][],
  colorIndex = 0,
): ElectricLine {
  const positions: number[] = [];
  const progress: number[] = [];

  for (const line of polylines) {
    if (line.length < 2) continue;
    const dist = [0];
    for (let i = 1; i < line.length; i++) {
      dist.push(dist[i - 1] + line[i].distanceTo(line[i - 1]));
    }
    const total = dist[dist.length - 1] || 1;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      progress.push(dist[i] / total, dist[i + 1] / total);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("lineProgress", new THREE.Float32BufferAttribute(progress, 1));

  const material = new THREE.LineBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lineColor = uniform(new THREE.Color(ELECTRIC_PALETTE[colorIndex % ELECTRIC_PALETTE.length]));
  const revealUpTo = uniform(0);
  const lineProgress = attribute<"float">("lineProgress", "float");

  material.colorNode = Fn(() => {
    // Banda brillante que viaja en loop por la polilínea — el "pulso
    // de sinapsis". mod2 en vez de fract para que el pulso vaya y
    // vuelva (efecto más orgánico que un solo sentido monótono).
    const phase = lineProgress.mul(2.4).sub(time.mul(0.65)).fract();
    const band = float(1.0).sub(
      smoothstep(float(0.0), float(0.16), phase.sub(0.5).abs().mul(2.0)),
    );
    const glow = mix(float(0.32), float(2.6), band);

    // Revelado progresivo: sólo lo ya "dibujado" (lineProgress <=
    // revealUpTo) se ve, con un borde suave en vez de un corte duro.
    const revealMask = float(1.0).sub(
      smoothstep(revealUpTo, revealUpTo.add(0.06), lineProgress),
    );

    return color(lineColor).mul(glow).mul(revealMask);
  })();

  const object = new THREE.LineSegments(geometry, material);

  function reveal(durationMs = 480) {
    const start = performance.now();
    function tick() {
      const t = Math.min((performance.now() - start) / durationMs, 1);
      revealUpTo.value = t * 1.1; // >1 para que el borde suave termine de barrer el final
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { object, reveal, dispose };
}
