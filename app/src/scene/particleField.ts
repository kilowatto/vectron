import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  color,
  dot,
  float,
  normalView,
  positionViewDirection,
  pow,
  sin,
  time,
  uniform,
  vec3,
} from "three/tsl";
import type { Concept, PartOfSpeech } from "../data/concepts";
import { createElectricLine, type ElectricLine } from "./electricLine";
import { hoverableLines } from "./lineHover";

/** Codificación por capas §04 del plan: un tono por dominio raíz. */
export const DOMAIN_HUES: Record<string, number> = {
  matematicas: 0x4fb8c4,
  fisica: 0x8f7fe0,
  programacion: 0xc94f6d,
  biologia_animal: 0x6fbe8c,
  biologia_vegetal: 0xb7d444,
  materiales: 0xd9c24f,
  geografia: 0xd98a34,
  astronomia: 0x5f7fd9,
  sociedad: 0xd9598a,
  historia: 0xa67c52,
  mitologia: 0x9d4edd,
  quimica: 0x2ee6a8,
  tecnologia: 0x2196f3,
  cualidades_y_acciones: 0xf0e6d2,
  deportes: 0xe63946,
  gastronomia: 0xff6b4a,
  musica: 0xe05fc4,
  arte_y_cultura: 0xffb703,
  medicina_y_salud: 0x06d6a0,
  economia_y_negocios: 0x8ecae6,
  personajes: 0xbc6c25,
  emociones: 0xff4d94,
  hogar: 0xa8dadc,
  transporte: 0x6d7bd9,
  ropa: 0xd98ac4,
  clima: 0x89c2ff,
  herramientas: 0xb08968,
  videojuegos: 0x7209b7,
  festividades: 0xf72585,
  filosofia: 0x8d99ae,
  idiomas: 0xffc857,
  // Palabras función (artículos, preposiciones, conjunciones, pronombres,
  // cópulas) — gris-azulado neutro a propósito: no son un "tema", son la
  // gramática que conecta a los demás dominios.
  gramatica: 0x8a94a6,
  // Modo token (Avanzado): partículas efímeras de tu frase, no dataset.
  token_vivo: 0x39ff6a,
};

const FALLBACK_HUE = 0x9aa5ad;

export interface ParticleField {
  mesh: THREE.InstancedMesh;
  group: THREE.Group;
  count: number;
  concepts: Concept[];
  setPointerHighlight: (instanceId: number | null) => void;
  setSearchHighlights: (instanceIds: number[]) => void;
  /** Fijar (clic) es distinto de sólo pasar el cursor: atenúa el resto
   * del cubo (junto con las aristas, vía onFocusChange) — hover no. */
  setPinnedFocus: (active: boolean) => void;
  /** Igual que setPinnedFocus pero para el modo token (Avanzado):
   * mientras hay tokens vivos de tu frase, el dataset se atenúa. Flag
   * separado para que fijar/soltar partículas y escribir/borrar frases
   * no se pisen entre sí. */
  setTokenFocus: (active: boolean) => void;
  /** Qué instancias siguen "activas" para hover/clic cuando hay foco
   * (búsqueda o partícula fijada) — `null` cuando no hay foco, todas
   * responden normal. Evita atrapar el cursor en una partícula
   * atenuada cuando lo que se quiere tocar es la que sí importa. */
  getFocusedIds: () => Set<number> | null;
  /** Principiante=sustantivos, Intermedio=+adjetivos, Avanzado=+verbos
   * — las instancias fuera del filtro se escalan a 0 (sin geometría
   * visible ni alcanzable por raycasting) en vez de reconstruir el
   * InstancedMesh, que sigue teniendo TODOS los conceptos siempre.
   * Devuelve cuántas quedaron visibles (para el HUD). */
  setPartOfSpeechFilter: (allowed: Set<PartOfSpeech>) => number;
  /** P2: la versión "viva" del filtro anterior — en vez de un corte
   * instantáneo, las partículas que entran nacen por mitosis desde la
   * más cercana (mismo dominio primero) que ya se veía, y las que salen
   * se comen hacia su vecina más cercana antes de desaparecer. Nunca
   * más de 1000ms de punta a punta (ver DOCs/06-mode-morph-cells.md).
   * La primera llamada (sin filtro previo) es instantánea — no hay
   * nada de qué nacer/morir todavía. */
  morphToPartOfSpeechFilter: (
    allowed: Set<PartOfSpeech>,
    opts?: { reducedMotion?: boolean },
  ) => Promise<{ visibleCount: number }>;
  /** Devuelve el objeto de línea creado (o null) para que quien llama
   * le cuelgue `userData.segments` (etiquetas de hover con el coseno
   * real por segmento — ver lineHover.ts). */
  setSimilarityLines: (
    sourceInstanceId: number | null,
    neighborInstanceIds: number[],
  ) => THREE.Object3D | null;
  /** Traza una línea de A a B a C… en el orden dado — usado para mostrar
   * cómo se conectan, en el cubo, las palabras de una frase escrita
   * (distinto de `setSimilarityLines`, que es la estrella de vecinos
   * reales de una partícula fijada). Devuelve el objeto de línea. */
  setChainLines: (instanceIds: number[]) => THREE.Object3D | null;
}

export interface ParticleFieldOptions {
  /** Se llama cuando cambia si hay "foco" activo (buscar texto o fijar
   * una partícula) — quien llama usa esto para atenuar en sincronía
   * elementos fuera del InstancedMesh (las aristas del cubo). */
  onFocusChange?: (active: boolean) => void;
}

/**
 * Builds the glowing instanced-sphere cloud from real concept data:
 * position = coordenadas reducidas del embedding real (PCA→3D),
 * color = tono categórico del dominio (§04).
 */
export function createParticleField(
  concepts: Concept[],
  options: ParticleFieldOptions = {},
): ParticleField {
  const count = concepts.length;
  const geometry = new THREE.IcosahedronGeometry(0.032, 1);
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const colorAttr = new Float32Array(count * 3);
  const phaseAttr = new Float32Array(count);
  const tmpColor = new THREE.Color();

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();

  // Más chicas que antes: a miles de partículas, el traslape en pantalla
  // de blending aditivo (colores que se SUMAN, no se tapan) empieza a
  // verse blanco/gris en las zonas densas — bajar el tamaño reduce
  // cuántas se traslapan por pixel sin perder el efecto de brillo.
  const baseScaleOf = (concept: Concept) => (concept.distinctiveTrait ? 1.0 : 0.62);

  concepts.forEach((concept, i) => {
    const hue = DOMAIN_HUES[concept.domain] ?? FALLBACK_HUE;
    tmpColor.setHex(hue);
    tmpColor.toArray(colorAttr, i * 3);
    phaseAttr[i] = Math.random() * Math.PI * 2;

    dummy.position.set(concept.coords[0], concept.coords[1], concept.coords[2]);
    dummy.scale.setScalar(baseScaleOf(concept));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });

  function setPartOfSpeechFilter(allowed: Set<PartOfSpeech>): number {
    let visible = 0;
    concepts.forEach((concept, i) => {
      const show = allowed.has(concept.partOfSpeech);
      if (show) visible++;
      dummy.position.set(concept.coords[0], concept.coords[1], concept.coords[2]);
      dummy.scale.setScalar(show ? baseScaleOf(concept) : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return visible;
  }

  // P2 — mode morph (mitosis/fusión). `currentAllowed` es null hasta la
  // primera llamada real: sin un filtro previo no hay "padres" ni
  // "presas" que animar, así que ese primer corte es instantáneo.
  let currentAllowed: Set<PartOfSpeech> | null = null;
  let morphSeq = 0;

  function nearestStable(pool: number[], targetId: number): number | null {
    if (pool.length === 0) return null;
    const t = concepts[targetId].coords;
    const domain = concepts[targetId].domain;
    let best = -1;
    let bestD = Infinity;
    let bestDomain = -1;
    let bestDomainD = Infinity;
    for (const j of pool) {
      const c = concepts[j].coords;
      const dx = c[0] - t[0];
      const dy = c[1] - t[1];
      const dz = c[2] - t[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
      if (concepts[j].domain === domain && d < bestDomainD) {
        bestDomainD = d;
        bestDomain = j;
      }
    }
    return bestDomain !== -1 ? bestDomain : best;
  }

  function shuffled(ids: number[]): number[] {
    const a = ids.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  interface MorphItem {
    id: number;
    kind: "mitosis" | "fusion";
    anchor: number; // padre (mitosis) o depredador (fusión)
    start: number; // ms dentro del presupuesto de 1000ms
    duration: number;
  }

  // Gaps aleatorios entre inicios (no un metrónomo fijo) y, si la
  // cadena cruda se saldría de 1000ms, se comprime proporcionalmente
  // — la aleatoriedad relativa entre gaps se conserva, sólo la escala
  // se achica (ver DOCs/06-mode-morph-cells.md §4).
  function buildSchedule(
    ids: number[],
    kind: "mitosis" | "fusion",
    anchors: Map<number, number>,
  ): MorphItem[] {
    const order = shuffled(ids.filter((id) => anchors.has(id)));
    const items: MorphItem[] = [];
    let t = 0;
    for (const id of order) {
      const [dMin, dMax] = kind === "mitosis" ? [280, 420] : [260, 380];
      items.push({
        id,
        kind,
        anchor: anchors.get(id)!,
        start: t,
        duration: dMin + Math.random() * (dMax - dMin),
      });
      t += 8 + Math.random() * (45 - 8);
    }
    const last = items[items.length - 1];
    if (last) {
      const lastEnd = last.start + last.duration;
      const BUDGET = 1000;
      if (lastEnd > BUDGET) {
        const avgDur = items.reduce((s, it) => s + it.duration, 0) / items.length;
        const scale = Math.max(0, BUDGET - avgDur) / Math.max(last.start, 1);
        for (const it of items) it.start *= scale;
      }
    }
    return items;
  }

  async function morphToPartOfSpeechFilter(
    allowed: Set<PartOfSpeech>,
    opts: { reducedMotion?: boolean } = {},
  ): Promise<{ visibleCount: number }> {
    const seq = ++morphSeq;
    const prevAllowed = currentAllowed;
    currentAllowed = new Set(allowed);

    if (!prevAllowed || opts.reducedMotion) {
      return { visibleCount: setPartOfSpeechFilter(allowed) };
    }

    const entering: number[] = [];
    const leaving: number[] = [];
    const stable: number[] = [];
    concepts.forEach((c, i) => {
      const was = prevAllowed.has(c.partOfSpeech);
      const now = allowed.has(c.partOfSpeech);
      if (!was && now) entering.push(i);
      else if (was && !now) leaving.push(i);
      else if (was && now) stable.push(i);
    });
    const visibleCount = stable.length + entering.length;
    if (entering.length === 0 && leaving.length === 0) {
      return { visibleCount };
    }

    const parentOf = new Map<number, number>();
    for (const e of entering) {
      const p = nearestStable(stable, e);
      if (p !== null) parentOf.set(e, p);
    }
    const predatorOf = new Map<number, number>();
    for (const l of leaving) {
      const p = nearestStable(stable, l);
      if (p !== null) predatorOf.set(l, p);
    }

    // Sin pareja (S vacío — caso raro, ej. primer filtro real con casi
    // nada estable): aparecen/desaparecen sin animar en vez de crashear.
    for (const id of entering) {
      if (parentOf.has(id)) continue;
      const c = concepts[id];
      dummy.position.set(c.coords[0], c.coords[1], c.coords[2]);
      dummy.scale.setScalar(baseScaleOf(c));
      dummy.updateMatrix();
      mesh.setMatrixAt(id, dummy.matrix);
    }
    for (const id of leaving) {
      if (predatorOf.has(id)) continue;
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(id, dummy.matrix);
    }

    const allItems = [
      ...buildSchedule(entering, "mitosis", parentOf),
      ...buildSchedule(leaving, "fusion", predatorOf),
    ];
    mesh.instanceMatrix.needsUpdate = true;
    if (allItems.length === 0) return { visibleCount };

    return new Promise((resolve) => {
      const active = new Set<number>();
      const started = new Array<boolean>(allItems.length).fill(false);
      const startTimes = new Array<number>(allItems.length);
      const t0 = performance.now();
      const CONCURRENCY_CAP = 32;
      // Margen de gracia corto sobre el presupuesto de 1000ms — si por
      // el tope de concurrencia algo se quedó sin arrancar o a medias,
      // salta a su pose final en vez de alargar la espera de verdad.
      const HARD_DEADLINE = 1150;

      function finalize(item: MorphItem) {
        const c = concepts[item.id];
        dummy.position.set(c.coords[0], c.coords[1], c.coords[2]);
        dummy.scale.setScalar(item.kind === "mitosis" ? baseScaleOf(c) : 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(item.id, dummy.matrix);
      }

      function tick() {
        if (seq !== morphSeq) {
          resolve({ visibleCount }); // otro morph más nuevo lo reemplazó
          return;
        }
        const elapsed = performance.now() - t0;

        if (elapsed >= HARD_DEADLINE) {
          for (const item of allItems) finalize(item);
          mesh.instanceMatrix.needsUpdate = true;
          resolve({ visibleCount });
          return;
        }

        for (let idx = 0; idx < allItems.length; idx++) {
          const item = allItems[idx];
          if (!started[idx]) {
            if (elapsed >= item.start && active.size < CONCURRENCY_CAP) {
              started[idx] = true;
              startTimes[idx] = elapsed;
              active.add(idx);
            } else {
              continue;
            }
          }
          if (!active.has(idx)) continue; // ya terminó

          const localT = Math.min((elapsed - startTimes[idx]) / item.duration, 1);
          const eased = 1 - Math.pow(1 - localT, 3);
          const c = concepts[item.id];
          const a = concepts[item.anchor].coords;

          if (item.kind === "mitosis") {
            dummy.position.set(
              a[0] + (c.coords[0] - a[0]) * eased,
              a[1] + (c.coords[1] - a[1]) * eased,
              a[2] + (c.coords[2] - a[2]) * eased,
            );
            dummy.scale.setScalar(baseScaleOf(c) * eased);
          } else {
            dummy.position.set(
              c.coords[0] + (a[0] - c.coords[0]) * eased,
              c.coords[1] + (a[1] - c.coords[1]) * eased,
              c.coords[2] + (a[2] - c.coords[2]) * eased,
            );
            dummy.scale.setScalar(baseScaleOf(c) * (1 - eased));
          }
          dummy.updateMatrix();
          mesh.setMatrixAt(item.id, dummy.matrix);

          if (localT >= 1) {
            active.delete(idx);
            finalize(item);
          }
        }

        mesh.instanceMatrix.needsUpdate = true;

        const pending = active.size > 0 || started.some((s) => !s);
        if (pending) {
          requestAnimationFrame(tick);
        } else {
          resolve({ visibleCount });
        }
      }
      requestAnimationFrame(tick);
    });
  }

  const highlightAttrArray = new Float32Array(count);
  const highlightAttribute = new THREE.InstancedBufferAttribute(highlightAttrArray, 1);
  // 1 = brillo normal, ~0.05 = casi invisible — apaga todo lo que NO
  // coincide con la búsqueda/partícula fijada para que lo que sí
  // coincide se sienta protagonista absoluto del cubo.
  const focusAttrArray = new Float32Array(count).fill(1);
  const focusAttribute = new THREE.InstancedBufferAttribute(focusAttrArray, 1);

  geometry.setAttribute(
    "instanceColor",
    new THREE.InstancedBufferAttribute(colorAttr, 3),
  );
  geometry.setAttribute(
    "instancePhase",
    new THREE.InstancedBufferAttribute(phaseAttr, 1),
  );
  geometry.setAttribute("instanceHighlight", highlightAttribute);
  geometry.setAttribute("instanceFocus", focusAttribute);

  // Bajado de 0.75 — con miles de partículas el brillo de borde de cada
  // una se acumula con las vecinas (blending aditivo) y termina
  // "quemando" a blanco zonas densas del cubo.
  const glowStrength = uniform(0.5);
  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  const instancePhase = attribute<"float">("instancePhase", "float");
  const instanceHighlight = attribute<"float">("instanceHighlight", "float");
  const instanceFocus = attribute<"float">("instanceFocus", "float");

  const pulse = float(0.75).add(
    float(0.16).mul(sin(time.mul(1.6).add(instancePhase))),
  );

  const rim = pow(
    float(1.0).sub(dot(normalView, positionViewDirection).abs()),
    float(2.2),
  );

  material.colorNode = Fn(() => {
    const base = color(instanceColor);
    // 0.22 -> 0.14: el "piso" de brillo ambiente de cada partícula es lo
    // que más se acumula en zonas densas (siempre está encendido, a
    // diferencia del rim/highlight que son condicionales) — bajarlo es
    // lo que más ayuda contra el blanqueo por traslape.
    const glow = base.mul(
      float(0.14).add(rim.mul(glowStrength)).add(instanceHighlight),
    );
    return vec3(glow).mul(pulse).mul(instanceFocus);
  })();

  mesh.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);

  let pointerId: number | null = null;
  let searchIds: number[] = [];
  let pinnedFocus = false;
  let focusActive = false;
  let tokenFocus = false;
  let focusedIds: Set<number> | null = null;

  function recomputeHighlights() {
    const active = searchIds.length > 0 || pinnedFocus || tokenFocus;
    // Atenuado real pero no "casi invisible" — se veía demasiado
    // agresivo en la práctica, hay que poder seguir ubicando el resto
    // del cubo como contexto.
    const dim = active ? 0.16 : 1;
    highlightAttrArray.fill(0);
    focusAttrArray.fill(dim);
    const nowFocused = active ? new Set(searchIds) : null;
    for (const id of searchIds) {
      highlightAttrArray[id] = 0.55;
      focusAttrArray[id] = 1;
    }
    if (pointerId !== null) {
      highlightAttrArray[pointerId] = 1.1;
      if (active) {
        focusAttrArray[pointerId] = 1;
        nowFocused?.add(pointerId);
      }
    }
    focusedIds = nowFocused;
    highlightAttribute.needsUpdate = true;
    focusAttribute.needsUpdate = true;

    if (active !== focusActive) {
      focusActive = active;
      options.onFocusChange?.(active);
    }
  }

  function setPointerHighlight(instanceId: number | null) {
    pointerId = instanceId;
    recomputeHighlights();
  }

  function getFocusedIds(): Set<number> | null {
    return focusedIds;
  }

  function setSearchHighlights(instanceIds: number[]) {
    searchIds = instanceIds;
    recomputeHighlights();
  }

  function setPinnedFocus(active: boolean) {
    pinnedFocus = active;
    recomputeHighlights();
  }

  function setTokenFocus(active: boolean) {
    tokenFocus = active;
    recomputeHighlights();
  }

  let similarityLine: ElectricLine | null = null;
  function setSimilarityLines(
    sourceInstanceId: number | null,
    neighborInstanceIds: number[],
  ): THREE.Object3D | null {
    if (similarityLine) {
      hoverableLines.delete(similarityLine.object);
      group.remove(similarityLine.object);
      similarityLine.dispose();
    }
    similarityLine = null;
    if (sourceInstanceId === null || neighborInstanceIds.length === 0) return null;

    const src = concepts[sourceInstanceId].coords;
    const srcVec = new THREE.Vector3(src[0], src[1], src[2]);
    const polylines = neighborInstanceIds.map((neighborId) => {
      const dst = concepts[neighborId].coords;
      return [srcVec, new THREE.Vector3(dst[0], dst[1], dst[2])];
    });
    similarityLine = createElectricLine(polylines, 0);
    group.add(similarityLine.object);
    hoverableLines.add(similarityLine.object);
    similarityLine.reveal();
    return similarityLine.object;
  }

  let chainLine: ElectricLine | null = null;
  let chainColorCounter = 0;
  function setChainLines(instanceIds: number[]): THREE.Object3D | null {
    if (chainLine) {
      hoverableLines.delete(chainLine.object);
      group.remove(chainLine.object);
      chainLine.dispose();
    }
    chainLine = null;
    if (instanceIds.length < 2) return null;

    const points = instanceIds.map((id) => {
      const c = concepts[id].coords;
      return new THREE.Vector3(c[0], c[1], c[2]);
    });
    chainLine = createElectricLine([points], chainColorCounter++ % 4);
    group.add(chainLine.object);
    hoverableLines.add(chainLine.object);
    chainLine.reveal();
    return chainLine.object;
  }

  return {
    mesh,
    group,
    count,
    concepts,
    setPointerHighlight,
    setSearchHighlights,
    setPinnedFocus,
    setTokenFocus,
    getFocusedIds,
    setPartOfSpeechFilter,
    morphToPartOfSpeechFilter,
    setSimilarityLines,
    setChainLines,
  };
}

export function spinField(field: ParticleField, dt: number): void {
  field.group.rotation.y += dt * 0.035;
  field.group.rotation.x = Math.sin(performance.now() * 0.00006) * 0.08;
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
