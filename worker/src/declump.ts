/** Separación de UNA SOLA DIRECCIÓN: los puntos nuevos se apartan, los
 * que ya existen NUNCA se mueven.
 *
 * Por qué existe. `declumpPoints` (worker/scripts/pca.ts) es una
 * relajación global: cada punto empuja y es empujado. Sirve para la
 * siembra, donde todo nace a la vez, pero el cron añade ~200 conceptos
 * por tanda sobre 20 000 ya publicados, y una relajación global movería
 * partículas que el usuario ya vio. Por eso el camino del cron se quedó
 * SIN separar — y eso es un bug medido, no una decisión: los conceptos
 * que añade el cron acaban 2.73× más apiñados que los de la siembra
 * (mediana al vecino más cercano 0.0366 contra 0.0999) con 20 pares
 * prácticamente superpuestos, o sea dos palabras distintas ocupando la
 * misma coordenada. Confirma `DOCs/16` §3d.
 *
 * Esta variante resuelve la tensión en vez de elegir un lado: los
 * existentes son paredes fijas, los nuevos se acomodan entre ellos. No
 * queda una nube perfectamente uniforme —eso exigiría mover todo— pero
 * elimina las superposiciones sin invalidar ninguna coordenada ya
 * servida ni nada cacheado.
 *
 * Determinista a propósito: cuando dos embeddings son casi idénticos no
 * hay dirección real que seguir y hay que inventar una. `Math.random()`
 * haría que dos corridas del mismo lote dieran coordenadas distintas, y
 * con eso no se puede reproducir un diagnóstico ni depurar un reporte.
 */

export type Point3 = [number, number, number];

/** Dirección pseudoaleatoria estable a partir de un entero. */
function jitterDir(seed: number): Point3 {
  const h = (n: number) => {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  };
  const v: Point3 = [h(seed), h(seed + 101), h(seed + 202)];
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export interface DeclumpResult {
  points: Point3[];
  /** Pares por debajo de `minDist` al terminar. 0 = resuelto. */
  remainingOverlaps: number;
  iterationsUsed: number;
}

/**
 * @param newPoints   puntos a acomodar (se devuelven movidos)
 * @param fixedPoints puntos intocables (los ya publicados)
 * @param minDist     separación mínima deseada (0.1 en la siembra)
 * @param iterations  tope de pasadas
 * @param bound       semiarista del cubo; el recorte va DENTRO del bucle
 */
export function declumpAgainstFixed(
  newPoints: readonly Point3[],
  fixedPoints: readonly Point3[],
  minDist: number,
  iterations = 120,
  bound?: number,
): DeclumpResult {
  const n = newPoints.length;
  const pts: Point3[] = newPoints.map((p) => [p[0], p[1], p[2]]);
  if (n === 0) return { points: pts, remainingOverlaps: 0, iterationsUsed: 0 };

  // Rejilla de los FIJOS: se construye una vez, nunca cambia.
  const cell = (v: number) => Math.floor(v / minDist);
  const key = (a: number, b: number, c: number) => `${a},${b},${c}`;
  const fixedGrid = new Map<string, number[]>();
  fixedPoints.forEach((p, i) => {
    const k = key(cell(p[0]), cell(p[1]), cell(p[2]));
    const b = fixedGrid.get(k);
    if (b) b.push(i);
    else fixedGrid.set(k, [i]);
  });

  let overlaps = 0;
  let iter = 0;
  for (; iter < iterations; iter++) {
    // Rejilla de los nuevos: se rehace cada pasada porque se mueven.
    const newGrid = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const k = key(cell(pts[i][0]), cell(pts[i][1]), cell(pts[i][2]));
      const b = newGrid.get(k);
      if (b) b.push(i);
      else newGrid.set(k, [i]);
    }

    const disp: Point3[] = Array.from({ length: n }, () => [0, 0, 0]);
    overlaps = 0;

    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const cx = cell(p[0]);
      const cy = cell(p[1]);
      const cz = cell(p[2]);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const k = key(cx + dx, cy + dy, cz + dz);

            // --- nuevo contra nuevo: los dos ceden, mitad cada uno ---
            const nb = newGrid.get(k);
            if (nb) {
              for (const j of nb) {
                if (j <= i) continue; // cada par una vez
                const q = pts[j];
                const ex = p[0] - q[0];
                const ey = p[1] - q[1];
                const ez = p[2] - q[2];
                const d = Math.hypot(ex, ey, ez);
                if (d >= minDist) continue;
                overlaps++;
                const dir: Point3 =
                  d > 1e-6 ? [ex / d, ey / d, ez / d] : jitterDir(i * 7919 + j);
                const push = (minDist - d) * 0.5;
                disp[i][0] += dir[0] * push;
                disp[i][1] += dir[1] * push;
                disp[i][2] += dir[2] * push;
                disp[j][0] -= dir[0] * push;
                disp[j][1] -= dir[1] * push;
                disp[j][2] -= dir[2] * push;
              }
            }

            // --- nuevo contra fijo: cede SÓLO el nuevo, empuje entero ---
            const fb = fixedGrid.get(k);
            if (fb) {
              for (const j of fb) {
                const q = fixedPoints[j];
                const ex = p[0] - q[0];
                const ey = p[1] - q[1];
                const ez = p[2] - q[2];
                const d = Math.hypot(ex, ey, ez);
                if (d >= minDist) continue;
                overlaps++;
                const dir: Point3 =
                  d > 1e-6 ? [ex / d, ey / d, ez / d] : jitterDir(i * 104729 + j);
                // Empuje COMPLETO, no la mitad: el otro no va a moverse,
                // así que si sólo cediera la mitad harían falta el doble
                // de pasadas para el mismo resultado.
                const push = minDist - d;
                disp[i][0] += dir[0] * push;
                disp[i][1] += dir[1] * push;
                disp[i][2] += dir[2] * push;
              }
            }
          }
        }
      }
    }

    if (overlaps === 0) break;
    for (let i = 0; i < n; i++) {
      pts[i][0] += disp[i][0];
      pts[i][1] += disp[i][1];
      pts[i][2] += disp[i][2];
      // El recorte va DENTRO de la pasada, no al final. Es el mismo bug
      // que ya se corrigió en declumpPoints: recortar después podía
      // volver a juntar dos puntos que la separación ya había resuelto,
      // si ambos quedaban fuera del borde en el mismo eje — el clip los
      // aplastaba al MISMO valor exacto. Aquí el borde actúa como una
      // pared más contra la que rebotar.
      if (bound !== undefined) {
        pts[i][0] = Math.max(-bound, Math.min(bound, pts[i][0]));
        pts[i][1] = Math.max(-bound, Math.min(bound, pts[i][1]));
        pts[i][2] = Math.max(-bound, Math.min(bound, pts[i][2]));
      }
    }
  }

  return { points: pts, remainingOverlaps: overlaps, iterationsUsed: iter };
}
