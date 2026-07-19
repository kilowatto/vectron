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
  // P3 — léxico de clase abierta sin tema (ver DOCs/08 §5.0). Bug real
  // corregido 2026-07-19: los tonos originales (0xe0a458/0xf0e6d2) eran
  // cremas casi blancos — inofensivo cuando estos dos dominios eran
  // ~160 conceptos legacy, pero tras el crecimiento paralelo pasaron a
  // ser, juntos, ~2/3 de TODO el dataset (4 372 de 6 722) — el cubo se
  // veía "lavado a blanco" de verdad (no por traslape aditivo, colores
  // planos incluso en partículas aisladas, visto en capturas reales).
  // Mismo criterio de saturación que el resto de la paleta de abajo,
  // no cremas pastel: verbos = acción cálida, adjetivos = cualidad fría.
  lexico_verbal: 0xc1502e,
  lexico_adjetival: 0x6b5b95,
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
  /** P5 boot splash: revela una fracción (0-1) de las partículas en un
   * orden fijo (mismo shuffle re-usado en cada llamada), el resto a
   * escala 0 — así el cubo se puebla poco a poco mientras carga en vez
   * de aparecer todo de golpe al terminar. Cualquier filtro real
   * posterior (setPartOfSpeechFilter/morphToPartOfSpeechFilter) lo
   * sobreescribe sin conflicto, es puramente cosmético de arranque.
   * `allowedIds`, si se da, restringe el universo revelado a esos ids
   * — para bootear directo al tamaño del modo guardado, sin el
   * "crece y luego se encoge" de revelar todo el dataset primero (ver
   * comentario completo junto a la implementación). */
  revealProgressively: (fraction: number, allowedIds?: number[]) => void;
  /** P2: la versión "viva" del filtro anterior — en vez de un corte
   * instantáneo, las partículas que entran nacen por mitosis desde la
   * más cercana (mismo dominio primero) que ya se veía, y las que salen
   * se comen hacia su vecina más cercana antes de desaparecer. Duración
   * dinámica según cuántas partículas hay que animar — 1 a 10 segundos,
   * nunca más (ajustado 2026-07-19 con feedback directo viéndolo en
   * producción: el tope fijo de 1000ms original hacía que transiciones
   * grandes como Principiante->Avanzado terminaran de golpe en vez de
   * una ola pareja; ver DOCs/06-mode-morph-cells.md). La primera
   * llamada (sin filtro previo) es instantánea — no hay nada de qué
   * nacer/morir todavía. */
  morphToPartOfSpeechFilter: (
    allowed: Set<PartOfSpeech>,
    opts?: { reducedMotion?: boolean },
  ) => Promise<{ visibleCount: number }>;
  /** Duración (ms) que va a tardar la ola de partículas para este
   * filtro, calculada sin animar nada — para sincronizar el resto del
   * "chrome" (switcher, fade del composer/tokenStrip) a la misma
   * duración ANTES de arrancar la morph real. 0 si es la primera
   * llamada (instantánea, nada que sincronizar). */
  estimateMorphDuration: (allowed: Set<PartOfSpeech>) => number;
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

  // Corrección sobre la corrección: bajar tamaño Y brillo A LA VEZ que
  // separar el espacio (CUBE_SCALE ×1.52, ver seed.ts) fue demasiado —
  // el espaciado solo ya resuelve el traslape real; encima achicar y
  // apagar deja el cubo "tenue y sin vida" en vistas ya poco densas
  // (Principiante, con muchas menos partículas visibles que Avanzado —
  // reportado en vivo con captura). Tamaño de vuelta a como estaba.
  const baseScaleOf = (concept: Concept) => (concept.distinctiveTrait ? 1.0 : 0.62);

  // Fuente de verdad de "dónde está cada partícula AHORA MISMO" — no lo
  // que un Set de filtro dice que debería ser, sino lo último que de
  // verdad se escribió en el InstancedMesh. Bug real corregido junto con
  // esto (2026-07-19, ver morphToPartOfSpeechFilter): sin esto, una
  // partícula interrumpida a medio vuelo (mitosis/fusión cancelada por
  // un cambio de modo más nuevo) no tenía forma de saber en qué punto
  // exacto se quedó — cualquier animación nueva que la tocara asumía
  // que partía de 0% o 100%, causando un salto visible. Con este par de
  // arrays, CUALQUIER función que escriba una instancia pasa por
  // writeInstance() y el estado real queda disponible para la siguiente
  // decisión, sin importar si la anterior terminó o la cortaron a medias.
  const posArray = new Float32Array(count * 3);
  const scaleArray = new Float32Array(count);

  function writeInstance(id: number, pos: readonly [number, number, number], scale: number): void {
    dummy.position.set(pos[0], pos[1], pos[2]);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(id, dummy.matrix);
    posArray[id * 3] = pos[0];
    posArray[id * 3 + 1] = pos[1];
    posArray[id * 3 + 2] = pos[2];
    scaleArray[id] = scale;
  }

  concepts.forEach((concept, i) => {
    const hue = DOMAIN_HUES[concept.domain] ?? FALLBACK_HUE;
    tmpColor.setHex(hue);
    tmpColor.toArray(colorAttr, i * 3);
    phaseAttr[i] = Math.random() * Math.PI * 2;

    writeInstance(i, concept.coords, baseScaleOf(concept));
  });

  function setPartOfSpeechFilter(allowed: Set<PartOfSpeech>): number {
    let visible = 0;
    concepts.forEach((concept, i) => {
      const show = allowed.has(concept.partOfSpeech);
      if (show) visible++;
      writeInstance(i, concept.coords, show ? baseScaleOf(concept) : 0);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return visible;
  }

  let revealOrder: number[] | null = null;
  let revealPool: number[] | null = null;
  /**
   * Bug de UX real reportado en vivo con grabaciones de pantalla: el
   * boot revelaba SIEMPRE el dataset completo (8 053) sin importar el
   * modo guardado, y apenas terminaba el splash, applyMode lo achicaba
   * de golpe al subconjunto real del modo (~2 188 en Principiante) —
   * un "crece mucho y luego se encoge" que se sentía como que algo se
   * rompía, aunque técnicamente nunca hubo ningún error. Avanzado casi
   * no lo notaba porque su subconjunto ya es casi todo el dataset.
   * `allowedIds`, si se da, restringe el universo de la revelación a
   * exactamente lo que el modo guardado va a mostrar — el boot crece
   * derecho hacia su tamaño final, sin sobrepasar y encogerse.
   */
  function revealProgressively(fraction: number, allowedIds?: number[]): void {
    const pool = allowedIds ?? concepts.map((_, i) => i);
    if (!revealOrder || revealPool !== allowedIds) {
      revealPool = allowedIds ?? null;
      revealOrder = shuffled(pool);
    }
    const showCount = Math.round(pool.length * Math.min(Math.max(fraction, 0), 1));
    const shown = new Set(revealOrder.slice(0, showCount));
    concepts.forEach((concept, i) => {
      writeInstance(i, concept.coords, shown.has(i) ? baseScaleOf(concept) : 0);
    });
    mesh.instanceMatrix.needsUpdate = true;
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

  function shuffled<T>(items: T[]): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function distSq(a: readonly [number, number, number], b: readonly [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
  }

  interface MorphItem {
    id: number;
    kind: "mitosis" | "fusion";
    anchor: number; // padre (mitosis) o depredador (fusión), sólo para el "nace de..." visual
    start: number; // ms dentro de la duración objetivo (ver computeMorphPlan)
    duration: number;
    fromPos: readonly [number, number, number];
    fromScale: number;
    toPos: readonly [number, number, number];
    toScale: number;
  }

  // Modelo de "pipeline" (pedido explícito 2026-07-19, ver DOCs/06): con
  // cuántos workers concurrentes (CONCURRENCY_CAP fijo) y un presupuesto
  // de tiempo TOPADO a un valor fijo independiente de N, cualquier
  // transición con más partículas de las que el pipeline alcanza a
  // procesar en ese tope terminaba con TODAS las que sobraban
  // tele-transportadas de golpe cuando se acababa el reloj (el bug real
  // reportado: "se hace de golpe, no se ve la progresión"). La cuenta:
  // con 48 concurrentes y ~300ms por partícula, el throughput es de
  // ~160 partículas/segundo — en 4s sólo alcanzan ~640, el resto de una
  // transición de miles nunca llegaba a animar.
  //
  // La corrección real es resolver la ecuación al revés: fijar cuánto
  // debe durar la ola completa (T_target, crece con N pero satura —
  // "más rápida cuanta menos partículas cambian" para N chico, "~2.5-4s"
  // para N grande, sin techo duro que fuerce un salto) y despejar CUÁNTA
  // concurrencia hace falta para que el pipeline de verdad vacíe la cola
  // dentro de ese tiempo — sin techo artificial (el costo real es
  // escribir una matriz de instancia por frame, trivial hasta varios
  // cientos a la vez, ver writeInstance).
  const D_AVG = 330; // ms — punto medio de los rangos de duración individual (280-420 mitosis, 260-380 fusión)
  const T_MIN = 700; // ms — transición chica (pocas partículas cambian), rápida pero visible
  const T_MAX = 3400; // ms — transición grande (miles de partículas), calmada sin sentirse eterna
  const N_REF = 900; // partículas a las que T_target ya casi saturó en T_MAX (curva 1-e^-x, no lineal)
  const CONCURRENCY_MIN = 8;
  const CONCURRENCY_MAX = 400; // tope de seguridad, no de diseño

  function computeMorphPlan(itemCount: number): { targetDuration: number; concurrency: number } {
    if (itemCount === 0) return { targetDuration: 0, concurrency: 0 };
    const targetDuration = T_MIN + (T_MAX - T_MIN) * (1 - Math.exp(-itemCount / N_REF));
    const raw = Math.ceil((itemCount * D_AVG) / Math.max(targetDuration - D_AVG, D_AVG));
    const concurrency = Math.min(CONCURRENCY_MAX, Math.max(CONCURRENCY_MIN, raw));
    return { targetDuration, concurrency };
  }

  // Orden de la ola (pedido explícito: no destellos aleatorios por todo
  // el cubo, sino que se vea como una mancha que crece/encoge de forma
  // orgánica). Se agrupa por dominio (qué "tema" entra o sale primero
  // se sortea en cada llamada, no es siempre el mismo orden) y, DENTRO
  // de cada dominio, las partículas más cercanas a su ancla ya visible
  // van primero — así cada mancha se ve "crecer hacia afuera desde una
  // semilla" en vez de aparecer salpicada.
  function groupedWaveOrder(ids: number[], anchors: Map<number, number>): number[] {
    const byDomain = new Map<string, number[]>();
    for (const id of ids) {
      const domain = concepts[id].domain;
      const group = byDomain.get(domain);
      if (group) group.push(id);
      else byDomain.set(domain, [id]);
    }
    const orderedDomains = shuffled([...byDomain.keys()]);
    const result: number[] = [];
    for (const domain of orderedDomains) {
      const group = byDomain.get(domain)!;
      group.sort((a, b) => {
        const da = distSq(concepts[a].coords, concepts[anchors.get(a)!].coords);
        const db = distSq(concepts[b].coords, concepts[anchors.get(b)!].coords);
        return da - db;
      });
      result.push(...group);
    }
    return result;
  }

  // Gaps aleatorios entre inicios (no un metrónomo fijo) y, si la
  // cadena cruda se saldría de la duración objetivo, se comprime
  // proporcionalmente — la aleatoriedad relativa entre gaps se
  // conserva, sólo la escala se achica (ver DOCs/06-mode-morph-cells.md
  // §4). `fromPos`/`fromScale` se leen de posArray/scaleArray en este
  // instante — si la partícula viene de una transición anterior
  // cortada a medias, continúa desde ahí en vez de reiniciar desde 0%
  // o 100% (bug real corregido junto con esto, ver writeInstance).
  function buildSchedule(
    ids: number[],
    kind: "mitosis" | "fusion",
    anchors: Map<number, number>,
    targetDuration: number,
  ): MorphItem[] {
    const filtered = ids.filter((id) => anchors.has(id));
    const order = groupedWaveOrder(filtered, anchors);
    const items: MorphItem[] = [];
    let t = 0;
    for (const id of order) {
      const anchor = anchors.get(id)!;
      const c = concepts[id];
      const anchorCoords = concepts[anchor].coords;
      const [dMin, dMax] = kind === "mitosis" ? [280, 420] : [260, 380];
      let fromPos: readonly [number, number, number];
      let fromScale: number;
      let toPos: readonly [number, number, number];
      let toScale: number;
      if (kind === "mitosis") {
        // Recién nace (0%): parte visualmente de su ancla, como siempre.
        // Ya venía creciendo a medias (interrupción previa): continúa
        // desde donde de verdad está, sin regresar de golpe al ancla.
        const alreadyGrowing = scaleArray[id] > 1e-3;
        fromPos = alreadyGrowing
          ? [posArray[id * 3], posArray[id * 3 + 1], posArray[id * 3 + 2]]
          : anchorCoords;
        fromScale = scaleArray[id];
        toPos = c.coords;
        toScale = baseScaleOf(c);
      } else {
        // Fusión: su posición real actual ya es la correcta como origen
        // en ambos casos (recién visible = sus propias coords; a medio
        // encoger = donde de verdad esté) — nunca hace falta ramificar.
        fromPos = [posArray[id * 3], posArray[id * 3 + 1], posArray[id * 3 + 2]];
        fromScale = scaleArray[id];
        toPos = anchorCoords;
        toScale = 0;
      }
      items.push({
        id,
        kind,
        anchor,
        start: t,
        duration: dMin + Math.random() * (dMax - dMin),
        fromPos,
        fromScale,
        toPos,
        toScale,
      });
      t += 8 + Math.random() * (45 - 8);
    }
    const last = items[items.length - 1];
    if (last) {
      const lastEnd = last.start + last.duration;
      if (lastEnd > targetDuration) {
        const avgDur = items.reduce((s, it) => s + it.duration, 0) / items.length;
        const scale = Math.max(0, targetDuration - avgDur) / Math.max(last.start, 1);
        for (const it of items) it.start *= scale;
      }
    }
    return items;
  }

  /**
   * Cuánto va a tardar la ola de partículas para este cambio de filtro,
   * SIN animar nada — mismo cálculo (misma clasificación por estado
   * real vía scaleArray, mismo computeMorphPlan) que usa
   * morphToPartOfSpeechFilter internamente, expuesto por separado para
   * que quien llame (main.ts) pueda sincronizar el resto del "chrome"
   * (switcher, fade del composer/tokenStrip) a la MISMA duración antes
   * de arrancar la morph real — pedido explícito 2026-07-19: el
   * switcher deslizaba su pastilla en 0.32s fijos mientras la ola de
   * partículas real tardaba hasta 3.4s, así que el switcher "terminaba"
   * mucho antes de que el cubo terminara de verdad.
   */
  function estimateMorphDuration(allowed: Set<PartOfSpeech>): number {
    if (currentAllowed === null) return 0;
    const EPS = 1e-3;
    let changing = 0;
    concepts.forEach((c, i) => {
      const shouldShow = allowed.has(c.partOfSpeech);
      const target = shouldShow ? baseScaleOf(c) : 0;
      if (Math.abs(scaleArray[i] - target) >= EPS) changing++;
    });
    return computeMorphPlan(changing).targetDuration;
  }

  async function morphToPartOfSpeechFilter(
    allowed: Set<PartOfSpeech>,
    opts: { reducedMotion?: boolean } = {},
  ): Promise<{ visibleCount: number }> {
    const seq = ++morphSeq;
    const isFirstCall = currentAllowed === null;
    currentAllowed = new Set(allowed);

    if (isFirstCall || opts.reducedMotion) {
      return { visibleCount: setPartOfSpeechFilter(allowed) };
    }

    // Clasificación por ESTADO REAL, no por diferencia entre el Set
    // viejo y el nuevo (bug real corregido junto con esto): comparar
    // sets asume que toda partícula ya está exactamente donde su último
    // filtro la dejó — falso si una transición anterior fue interrumpida
    // a medio vuelo por ésta. Comparar contra scaleArray (la escala real
    // actual) en vez de contra el filtro anterior hace que "seguir
    // animando desde donde se quedó" sea el comportamiento NATURAL, no
    // un caso especial: si ya está en su escala objetivo no hay nada que
    // hacer (stable/stableHidden), si no, entra o sale sin importar de
    // dónde partió.
    const EPS = 1e-3;
    const entering: number[] = [];
    const leaving: number[] = [];
    const stableVisible: number[] = []; // únicas anclas válidas: ya completamente visibles
    concepts.forEach((c, i) => {
      const shouldShow = allowed.has(c.partOfSpeech);
      const target = shouldShow ? baseScaleOf(c) : 0;
      const current = scaleArray[i];
      if (Math.abs(current - target) < EPS) {
        if (shouldShow) stableVisible.push(i);
        // si no debe mostrarse y ya está en 0, no hay nada que hacer
      } else if (target > current) {
        entering.push(i);
      } else {
        leaving.push(i);
      }
    });
    const visibleCount = stableVisible.length + entering.length;
    if (entering.length === 0 && leaving.length === 0) {
      return { visibleCount };
    }

    const parentOf = new Map<number, number>();
    for (const e of entering) {
      const p = nearestStable(stableVisible, e);
      if (p !== null) parentOf.set(e, p);
    }
    const predatorOf = new Map<number, number>();
    for (const l of leaving) {
      const p = nearestStable(stableVisible, l);
      if (p !== null) predatorOf.set(l, p);
    }

    // Sin pareja (S vacío — caso raro, ej. primer filtro real con casi
    // nada estable): aparecen/desaparecen sin animar en vez de crashear.
    for (const id of entering) {
      if (parentOf.has(id)) continue;
      writeInstance(id, concepts[id].coords, baseScaleOf(concepts[id]));
    }
    for (const id of leaving) {
      if (predatorOf.has(id)) continue;
      writeInstance(id, concepts[id].coords, 0);
    }

    const { targetDuration, concurrency } = computeMorphPlan(entering.length + leaving.length);
    const allItems = [
      ...buildSchedule(entering, "mitosis", parentOf, targetDuration),
      ...buildSchedule(leaving, "fusion", predatorOf, targetDuration),
    ];
    mesh.instanceMatrix.needsUpdate = true;
    if (allItems.length === 0) return { visibleCount };

    return new Promise((resolve) => {
      const active = new Set<number>();
      const started = new Array<boolean>(allItems.length).fill(false);
      const startTimes = new Array<number>(allItems.length);
      const t0 = performance.now();

      // Red de seguridad real (bug encontrado en producción 2026-07-19):
      // este bucle depende de requestAnimationFrame, que Chrome PAUSA
      // por completo en una pestaña en segundo plano/sin foco — a
      // diferencia de setTimeout, que sigue disparando (aunque
      // limitado). Sin esto, cambiar de pestaña a media transición
      // dejaba el modo colgado para siempre. A diferencia de antes, este
      // temporizador YA NO es parte del camino normal — con la
      // concurrencia calculada en computeMorphPlan el pipeline de verdad
      // vacía la cola dentro de targetDuration, así que esto sólo debe
      // disparar en el caso patológico real (pestaña oculta, dispositivo
      // atascado), nunca en una transición normal en primer plano.
      // resolveOnce() es idempotente: lo que llegue primero (rAF o el
      // timer) gana, lo demás es no-op.
      let settled = false;
      function resolveOnce() {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        resolve({ visibleCount });
      }
      const safetyTimer = setTimeout(() => {
        for (const item of allItems) finalize(item);
        mesh.instanceMatrix.needsUpdate = true;
        resolveOnce();
      }, targetDuration + 6000);

      function finalize(item: MorphItem) {
        writeInstance(item.id, item.toPos, item.toScale);
      }

      function tick() {
        if (seq !== morphSeq) {
          resolveOnce(); // otro morph más nuevo lo reemplazó — se queda donde esté, sin saltar
          return;
        }
        const elapsed = performance.now() - t0;

        for (let idx = 0; idx < allItems.length; idx++) {
          const item = allItems[idx];
          if (!started[idx]) {
            if (elapsed >= item.start && active.size < concurrency) {
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
          const pos: [number, number, number] = [
            item.fromPos[0] + (item.toPos[0] - item.fromPos[0]) * eased,
            item.fromPos[1] + (item.toPos[1] - item.fromPos[1]) * eased,
            item.fromPos[2] + (item.toPos[2] - item.fromPos[2]) * eased,
          ];
          const scale = item.fromScale + (item.toScale - item.fromScale) * eased;
          writeInstance(item.id, pos, scale);

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
          resolveOnce();
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

  // Restaurado (ver baseScaleOf arriba): el espaciado ya hace el
  // trabajo pesado contra el traslape, no hace falta apagar el rim
  // tanto — de vuelta cerca del valor original.
  const glowStrength = uniform(0.58);
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
    // 0.22 -> 0.14 -> 0.10 -> 0.18: bajarlo tanto dejó el cubo apagado
    // en vistas ya poco densas (Principiante) sin que hiciera falta —
    // el espaciado (CUBE_SCALE, ver seed.ts) es lo que de verdad
    // resuelve el traslape ahora; este piso vuelve casi a su valor
    // original para que el cubo se sienta vivo otra vez.
    const glow = base.mul(
      float(0.18).add(rim.mul(glowStrength)).add(instanceHighlight),
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
    // 0.16 -> 0.34: reportado en vivo con capturas ("las partículas
    // están muy oscuras") — con el piso base en 0.18 (ver colorNode),
    // 0.16 dejaba el resto del cubo en ~2-10% del color real, casi
    // negro puro en pantalla. 0.34 sigue de-enfatizando claramente lo
    // que no coincide sin que desaparezca como contexto.
    const dim = active ? 0.34 : 1;
    highlightAttrArray.fill(0);
    focusAttrArray.fill(dim);
    const nowFocused = active ? new Set(searchIds) : null;
    for (const id of searchIds) {
      // 0.55 -> 1.05: reportado en vivo ("falta más intensidad") — con
      // el piso 0.18 + rim, 0.55 dejaba una coincidencia apenas por
      // encima de las partículas normales (glow~0.7-1.3x según ángulo,
      // igual de discreto que el resto del cubo). 1.05 la separa con
      // claridad incluso de frente (glow~1.2-1.8x) sin llegar a
      // quemarse contra el pulso (pulse máx ~0.91).
      highlightAttrArray[id] = 1.05;
      focusAttrArray[id] = 1;
    }
    if (pointerId !== null) {
      highlightAttrArray[pointerId] = 1.6;
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
    revealProgressively,
    morphToPartOfSpeechFilter,
    estimateMorphDuration,
    setSimilarityLines,
    setChainLines,
  };
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
