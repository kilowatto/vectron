import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  cameraPosition,
  dot,
  equirectUV,
  exp,
  float,
  fract,
  mix,
  mx_noise_vec3,
  normalGeometry,
  normalWorld,
  pmremTexture,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  refract,
  sin,
  smoothstep,
  time,
  uniform,
  varying,
  vec3,
} from "three/tsl";
import type Node from "three/src/nodes/core/Node.js";
import type { Concept, PartOfSpeech } from "../data/concepts";
import { bodyColorOf } from "../particula/heroParticle";
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
  /** Resortes semánticos (F2 §5.1): al fijar un concepto, sus vecinos
   * reales se atraen suavemente hacia él — desplazamiento proporcional
   * al coseno (más similar = más cerca queda), con entrada elástica
   * (overshoot = sensación de resorte). Escribe un atributo vec3 sólo
   * para las ~10-20 instancias afectadas; la animación es UN uniform
   * por cuadro durante ~0.7s, la deformación la hace el vertex shader.
   * Llamar de nuevo reemplaza los resortes anteriores. */
  setSprings: (neighbors: { instanceId: number; score: number }[], pinnedInstanceId: number) => void;
  /** Suelta los resortes (salida suavizada, sin salto). */
  clearSprings: () => void;
  /** Impulso jelly soft-body en UNA instancia (F2 §5.1): oscilación
   * amortiguada de escala no uniforme a lo largo de `axis` — el
   * mecanismo que las transiciones celulares de conteo reutilizarán.
   * Escribe 2 atributos de una sola instancia; la GPU hace el resto. */
  jellyPulse: (instanceId: number, amp: number, axis: THREE.Vector3) => void;
  /** Reloj del campo (jelly/spring-ease) — llamar una vez por cuadro
   * desde el loop del engine. CPU: 1-2 floats de uniform por cuadro,
   * nunca buffers. */
  tick: (dt: number) => void;
}

export interface ParticleFieldOptions {
  /** Se llama cuando cambia si hay "foco" activo (buscar texto o fijar
   * una partícula) — quien llama usa esto para atenuar en sincronía
   * elementos fuera del InstancedMesh (las aristas del cubo). */
  onFocusChange?: (active: boolean) => void;
  /** PMREM del RoomEnvironment horneado UNA vez en main.ts — el
   * material líquido lo muestrea con la normal reflejada/refractada
   * (transmisión falsa). Se pasa por opciones y NO se asigna a
   * scene.environment para no cambiar el look del resto de la escena
   * (contextChamber hornea el suyo propio). */
  envMap: THREE.Texture;
}

/** Look del material líquido en el CUBO (F1.4 — port del ganador del
 * lab /particula, DOCs/21 §4.2/§4.4). Los valores base son los del lab
 * (DEFAULT_CONFIG.liquid), rebalanceados para 15,000-25,000 instancias:
 * el núcleo HDR del lab (2.1) a esta densidad florecería toda la escena
 * en vez de la partícula individual (el bloom del engine de producción
 * es strength 0.27/threshold 0.58, mucho más suave que el del lab) — el
 * wow aquí viene del material (fresnel/env/iridiscencia), no del bloom
 * (anti-meta obligatoria de 17 Fase 2, ver DOCs/21 §4.2). */
const CUBE_LIQUID = {
  fresnelPower: 3.0,
  iorFeel: 1.33,
  transmit: 0.35,
  envReflect: 0.55,
  envReflBlur: 0.6,
  envRefrBlur: 2.5,
  iridescenceStrength: 0.45,
  iridescenceSpeed: 0.05,
  coreEmissive: 0.9,
  coreFalloff: 2.2,
  baseGlow: 0.1,
  breathAmp: 0.06,
  breathSpeed: 1.1,
  wobbleAmp: 0.02,
  wobbleFreq: 0.8,
  /** Amplitud OBJETIVO de la deriva de fluido (curl noise, F2 §5.1) —
   * muy por debajo del radio de interacción para que la codificación
   * PCA se lea intacta (17 Fase 2 anti-goal: jamás jitter agresivo que
   * mienta sobre vecindarios). El movimiento es coherente espacialmente
   * (las partículas cercanas derivan juntas, como un fluido — esa es la
   * diferencia real con la deriva Lissajous independiente anterior). */
  driftAmp: 0.008,
  /** Curl noise 3D (2 octavas) en el vertex shader: escala del dominio
   * de ruido sobre las coords PCA (±2 unidades), paso de diferencias
   * finitas para el rotacional, velocidad de animación del campo y
   * ganancia que mapea magnitud de curl → desplazamiento. */
  curlScale: 0.7,
  curlEps: 0.3,
  curlSpeed: 0.05,
  curlGain: 0.5,
  /** Resortes semánticos (F2 §5.1): al fijar un concepto, sus vecinos
   * reales (Vectorize) se atraen hacia él con desplazamiento
   * proporcional al coseno (rest-length ∝ distancia coseno: más
   * similar = más cerca queda). 0.35 = el vecino más similar recorre
   * como mucho ~35% de su distancia al fijado — suficiente para leer
   * "se agrupan", nunca para colapsar la nube. */
  springStrength: 0.35,
  springEaseSeconds: 0.7,
  /** Jelly soft-body (F2 §5.1, base para las transiciones celulares de
   * conteo): oscilación amortiguada de escala NO uniforme a lo largo de
   * un eje — frecuencia y decaimiento del impulso. */
  jellyFreq: 10,
  jellyDecay: 4,
  specularPower: 500,
  specularStrength: 0.7,
  sssStrength: 0.5,
  ambient: 0.22,
  lightDir: [2, 3, 2] as [number, number, number],
  coreDir: [0.45, -0.3, 0.6] as [number, number, number],
};

/**
 * Builds the glowing instanced-sphere cloud from real concept data:
 * position = coordenadas reducidas del embedding real (PCA→3D),
 * color = tono categórico del dominio (§04).
 */
export function createParticleField(
  concepts: Concept[],
  options: ParticleFieldOptions,
): ParticleField {
  const count = concepts.length;
  const geometry = new THREE.IcosahedronGeometry(0.032, 1);
  // F1.4 — material líquido (port del lab /particula): OPACO con
  // escritura de profundidad, NUNCA aditivo — la "sopa aditiva"
  // anterior (17 VIS-01…03) venía de transparent+AdditiveBlending sin
  // depthWrite; las células líquidas se ocluyen entre sí como esferas
  // sólidas y el look (fresnel/env/iridiscencia/núcleo) lo pone el
  // shader, no el blending.
  const material = new THREE.MeshBasicNodeMaterial();

  const colorAttr = new Float32Array(count * 3);
  const phaseAttr = new Float32Array(count);
  // F1.4 — atributos del patrón líquido (ver particula/liquidParticle.ts):
  // la posición de render NO sale de la instanceMatrix sino de aHome
  // (coordenada PCA real, jamás deformada) y la escala visible de
  // aScale; la instanceMatrix se sigue escribiendo igual en
  // writeInstance porque el raycast de hover/clic la usa.
  const bodyAttr = new Float32Array(count * 3);
  const homeAttr = new Float32Array(count * 3);
  const freqAttr = new Float32Array(count * 3);
  const scaleAttr = new Float32Array(count);
  const bodyAttribute = new THREE.InstancedBufferAttribute(bodyAttr, 3);
  const homeAttribute = new THREE.InstancedBufferAttribute(homeAttr, 3);
  const freqAttribute = new THREE.InstancedBufferAttribute(freqAttr, 3);
  const scaleAttribute = new THREE.InstancedBufferAttribute(scaleAttr, 1);
  // F2 §5.1 — resortes semánticos (vec3: desplazamiento objetivo de la
  // atracción al concepto fijado, 0 = sin resorte) y jelly soft-body
  // (vec4: eje xyz + amplitud w; float: tiempo de inicio del impulso,
  // en el reloj del campo — ver tick/uTime). Sólo se escriben por
  // EVENTO (pin/jelly), nunca por cuadro para todo el campo.
  const springVecAttr = new Float32Array(count * 3);
  const jellyAxisAmpAttr = new Float32Array(count * 4);
  const jellyT0Attr = new Float32Array(count).fill(-1e9);
  const springVecAttribute = new THREE.InstancedBufferAttribute(springVecAttr, 3);
  const jellyAxisAmpAttribute = new THREE.InstancedBufferAttribute(jellyAxisAmpAttr, 4);
  const jellyT0Attribute = new THREE.InstancedBufferAttribute(jellyT0Attr, 1);
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
    homeAttr[id * 3] = pos[0];
    homeAttr[id * 3 + 1] = pos[1];
    homeAttr[id * 3 + 2] = pos[2];
    scaleAttr[id] = scale;
  }

  /** Los 3 buffers que writeInstance toca — subidos sólo cuando algo
   * escribe instancias (filtros, reveal, morph), NUNCA por cuadro en
   * reposo (la deriva/wobble van en el vertex shader, CPU ≈ 0). */
  function markInstancesDirty(): void {
    mesh.instanceMatrix.needsUpdate = true;
    homeAttribute.needsUpdate = true;
    scaleAttribute.needsUpdate = true;
  }

  concepts.forEach((concept, i) => {
    const hue = DOMAIN_HUES[concept.domain] ?? FALLBACK_HUE;
    tmpColor.setHex(hue);
    tmpColor.toArray(colorAttr, i * 3);
    // Cuerpo oscurecido / brillo con el tono a full — MISMO modelo de
    // color que la partícula del lab (ver heroParticle.ts's
    // bodyColorOf); importado, no copiado, porque dos copias a mano
    // desincronizadas ya causaron "cambia de material" en el lab.
    bodyColorOf(hue).toArray(bodyAttr, i * 3);
    phaseAttr[i] = Math.random() * Math.PI * 2;
    // Frecuencias de deriva por instancia (rango del lab: 0.4-0.9
    // rad/s por eje) — cada célula tiene su propio ritmo.
    freqAttr[i * 3] = 0.4 + Math.random() * 0.5;
    freqAttr[i * 3 + 1] = 0.4 + Math.random() * 0.5;
    freqAttr[i * 3 + 2] = 0.4 + Math.random() * 0.5;

    writeInstance(i, concept.coords, baseScaleOf(concept));
  });

  function setPartOfSpeechFilter(allowed: Set<PartOfSpeech>): number {
    let visible = 0;
    concepts.forEach((concept, i) => {
      const show = allowed.has(concept.partOfSpeech);
      if (show) visible++;
      writeInstance(i, concept.coords, show ? baseScaleOf(concept) : 0);
    });
    markInstancesDirty();
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
    markInstancesDirty();
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
    markInstancesDirty();
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
        markInstancesDirty();
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

        markInstancesDirty();

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
  geometry.setAttribute("aBody", bodyAttribute);
  geometry.setAttribute("aHome", homeAttribute);
  geometry.setAttribute("aFreq", freqAttribute);
  geometry.setAttribute("aScale", scaleAttribute);
  geometry.setAttribute("aSpringVec", springVecAttribute);
  geometry.setAttribute("aJellyAxisAmp", jellyAxisAmpAttribute);
  geometry.setAttribute("aJellyT0", jellyT0Attribute);

  // Las posiciones de render vienen de aHome (atributo), no de la
  // instanceMatrix — la esfera envolvente de la geometría (radio 0.032
  // en el origen) no cubre el cubo y el frustum culling descartaría el
  // campo entero.
  mesh.frustumCulled = false;

  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  const instancePhase = attribute<"float">("instancePhase", "float");
  const instanceHighlight = attribute<"float">("instanceHighlight", "float");
  const instanceFocus = attribute<"float">("instanceFocus", "float");
  const aBody = attribute<"vec3">("aBody", "vec3");
  const aHome = attribute<"vec3">("aHome", "vec3");
  const aScale = attribute<"float">("aScale", "float");
  const aSpringVec = attribute<"vec3">("aSpringVec", "vec3");
  const aJellyAxisAmp = attribute<"vec4">("aJellyAxisAmp", "vec4");
  const aJellyT0 = attribute<"float">("aJellyT0", "float");
  // aFreq queda escrito en el buffer (lo usa la tabla §4.2 para las
  // transiciones celulares F2 posteriores) pero ya no alimenta la
  // deriva — el curl noise la reemplazó (F2 §5.1).

  const L = CUBE_LIQUID;
  // prefers-reduced-motion congela deriva y wobble (MUST del plan); el
  // pulse/breath de brillo se conserva (es shimmer de relevancia, no
  // movimiento espacial).
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const uMotionScale = uniform(reducedMotion ? 0 : 1);
  const uLightDir = uniform(new THREE.Vector3(...L.lightDir).normalize());
  const uCoreDir = uniform(new THREE.Vector3(...L.coreDir).normalize());
  // F2 §5.1 — reloj propio del campo (lo alimenta tick() una vez por
  // cuadro: 1 float) para el jelly, y ease global de los resortes
  // semánticos (0=sin atracción, 1=resorte a su rest-length).
  const uTime = uniform(0);
  const uSpringEase = uniform(0);

  // Curl noise 3D, 2 octavas — potencial vectorial ψ cuyo ROTACIONAL
  // (por diferencias finitas) es la velocidad de deriva: campo sin
  // divergencia, las partículas cercanas derivan juntas como un fluido
  // y nada se sincroniza jamás (F2 §5.1). 4 muestras de ψ por vértice
  // (centro + 3 ejes), cada una con 2 octavas de mx_noise_vec3.
  const curlPotential = (p: Node<"vec3">) => {
    const t1 = time.mul(L.curlSpeed);
    return mx_noise_vec3(p.mul(L.curlScale).add(t1)).add(mx_noise_vec3(p.mul(L.curlScale * 2.3).add(t1.mul(1.6)).add(vec3(11.3, 7.7, 5.1))).mul(0.5));
  };

  // Vertex: geometría × escala visible (filtro/morph) + wobble de
  // membrana + jelly + hogar PCA real + deriva curl + resorte
  // semántico — todo en GPU, la CPU no escribe buffers por cuadro en
  // reposo. La instanceMatrix NO se usa para render (positionNode la
  // reemplaza) pero sigue escrita para el raycast de hover/clic (ver
  // writeInstance).
  material.positionNode = Fn(() => {
    const e = L.curlEps;
    const psi0 = curlPotential(aHome);
    const dX = curlPotential(aHome.add(vec3(e, 0, 0))).sub(psi0).div(e);
    const dY = curlPotential(aHome.add(vec3(0, e, 0))).sub(psi0).div(e);
    const dZ = curlPotential(aHome.add(vec3(0, 0, e))).sub(psi0).div(e);
    const curl = vec3(dY.z.sub(dZ.y), dZ.x.sub(dX.z), dX.y.sub(dY.y));
    const drift = curl.mul(L.driftAmp * L.curlGain).mul(uMotionScale);
    // Resorte semántico: offset pre-computado por instancia (ver
    // setSprings) × ease global con overshoot — la sensación de resorte
    // la da el easing, el vector es estático durante la atracción.
    const springOffset = aSpringVec.mul(uSpringEase);
    // Jelly soft-body: estiramiento no uniforme a lo largo del eje del
    // impulso, oscilación amortiguada desde aJellyT0 (reloj del campo).
    const jellyT = uTime.sub(aJellyT0).max(0.0);
    const jelly = sin(jellyT.mul(L.jellyFreq)).mul(exp(jellyT.mul(-L.jellyDecay))).mul(aJellyAxisAmp.w).mul(uMotionScale);
    const jellyDeform = aJellyAxisAmp.xyz.mul(dot(positionLocal, aJellyAxisAmp.xyz)).mul(jelly);
    // Wobble de membrana (soft-body fake) — las frecuencias espaciales
    // (×20/×15) están escaladas al radio del cubo (0.032) para el mismo
    // número de ondas por superficie que en el lab (×4/×3 a radio 0.16).
    const wobble = sin(time.mul(L.wobbleFreq).add(instancePhase.mul(3.7)).add(positionLocal.y.mul(20.0)))
      .add(sin(time.mul(L.wobbleFreq * 1.7).add(instancePhase.mul(2.3)).add(positionLocal.x.mul(15.0))).mul(0.5))
      .mul(L.wobbleAmp * 0.032)
      .mul(uMotionScale);
    return positionLocal.add(normalGeometry.mul(wobble)).add(jellyDeform).mul(aScale).add(aHome).add(drift).add(springOffset);
  })();

  // Fragment: el look líquido ganador del lab (gota + bioluminiscencia
  // + burbuja) rebalanceado para la densidad del cubo (ver CUBE_LIQUID).
  // El sistema de foco/búsqueda se conserva con la MISMA semántica:
  // instanceFocus atenúa lo que no coincide (0.34) e instanceHighlight
  // empuja lo que sí (hover 1.6 / búsqueda 1.05).
  material.colorNode = Fn(() => {
    const n = normalWorld.normalize();
    const v = cameraPosition.sub(positionWorld).normalize();
    const incident = v.negate();
    const ndv = dot(n, v).abs().clamp(0, 1);
    const fresnel = pow(float(1.0).sub(ndv), float(L.fresnelPower));

    const wrap = dot(n, uLightDir).mul(0.5).add(0.5);
    const body = aBody.mul(float(L.ambient).add(wrap.mul(L.sssStrength)));

    const transmit = pmremTexture(options.envMap, equirectUV(refract(incident, n, float(1).div(L.iorFeel))), float(L.envRefrBlur))
      .mul(mix(vec3(1, 1, 1), instanceColor, float(0.45)))
      .mul(L.transmit)
      .mul(pow(ndv, float(1.5)));

    const reflection = pmremTexture(options.envMap, equirectUV(reflect(incident, n)), float(L.envReflBlur)).mul(fresnel).mul(L.envReflect);

    const iridT = fract(float(1.0).sub(ndv).add(time.mul(L.iridescenceSpeed)));
    const cian = vec3(0.15, 0.85, 0.95);
    const magenta = vec3(0.9, 0.25, 0.85);
    const dorado = vec3(1.0, 0.78, 0.28);
    const iridescence = mix(mix(cian, magenta, smoothstep(float(0.0), float(0.5), iridT)), dorado, smoothstep(float(0.5), float(1.0), iridT))
      .mul(fresnel)
      .mul(L.iridescenceStrength);

    const halfDir = uLightDir.add(v).normalize();
    const specular = pow(dot(n, halfDir).max(0.0), float(L.specularPower)).mul(L.specularStrength);

    // Núcleo + pulse: el shimmer de relevancia del cubo anterior
    // (0.75+0.16·sin) se conserva multiplicando al término emisivo
    // líquido — es la "vida" por partícula que el pulse ya daba.
    const objN = varying(normalGeometry, "vCubeLiquidObjN").normalize();
    const coreMask = pow(dot(objN, uCoreDir).mul(0.5).add(0.5).clamp(0, 1), float(L.coreFalloff));
    const breath = sin(time.mul(L.breathSpeed).add(instancePhase)).mul(L.breathAmp).add(1.0);
    const pulse = float(0.75).add(float(0.16).mul(sin(time.mul(1.6).add(instancePhase))));
    const emissive = instanceColor.mul(float(L.baseGlow).add(coreMask.mul(L.coreEmissive))).mul(breath).mul(pulse);

    const highlightBoost = float(1).add(instanceHighlight.mul(1.2));
    return vec3(body.add(transmit).add(reflection).add(iridescence).add(vec3(specular)).add(emissive)).mul(instanceFocus).mul(highlightBoost);
  })();

  markInstancesDirty();

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

  // F2 §5.1 — estado CPU de los resortes semánticos: qué instancias
  // tienen resorte escrito ahora mismo (para limpiarlas al re-fijar o
  // soltar) y la animación del ease global (1 uniform por cuadro
  // durante ~0.7s; nada más). Con reduced-motion el ease salta directo
  // a su valor final — la atracción semántica se conserva, sin vaivén.
  let springOwnerIds: number[] = [];
  let springEaseAnim: { from: number; to: number; elapsed: number; duration: number; elastic: boolean } | null = null;

  function elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  }

  function startSpringEase(to: number, elastic: boolean) {
    const from = uSpringEase.value as number;
    if (reducedMotion) {
      uSpringEase.value = to;
      springEaseAnim = null;
      return;
    }
    springEaseAnim = { from, to, elapsed: 0, duration: L.springEaseSeconds, elastic };
  }

  function setSprings(neighbors: { instanceId: number; score: number }[], pinnedInstanceId: number): void {
    for (const id of springOwnerIds) {
      springVecAttr[id * 3] = 0;
      springVecAttr[id * 3 + 1] = 0;
      springVecAttr[id * 3 + 2] = 0;
    }
    const pinned = concepts[pinnedInstanceId].coords;
    springOwnerIds = [];
    for (const { instanceId, score } of neighbors) {
      const c = concepts[instanceId].coords;
      // rest-length ∝ distancia coseno: el desplazamiento es la
      // fracción `strength·score` del vector hacia el fijado — más
      // similar (score alto) = termina más cerca.
      const k = L.springStrength * Math.max(0, Math.min(1, score));
      springVecAttr[instanceId * 3] = (pinned[0] - c[0]) * k;
      springVecAttr[instanceId * 3 + 1] = (pinned[1] - c[1]) * k;
      springVecAttr[instanceId * 3 + 2] = (pinned[2] - c[2]) * k;
      springOwnerIds.push(instanceId);
    }
    springVecAttribute.needsUpdate = true;
    startSpringEase(1, true);
  }

  function clearSprings(): void {
    startSpringEase(0, false);
  }

  let fieldTime = 0;
  function tick(dt: number): void {
    fieldTime += dt;
    uTime.value = fieldTime;
    if (springEaseAnim) {
      springEaseAnim.elapsed += dt;
      const t = Math.min(springEaseAnim.elapsed / springEaseAnim.duration, 1);
      const eased = springEaseAnim.elastic ? elasticOut(t) : 1 - Math.pow(1 - t, 3);
      uSpringEase.value = springEaseAnim.from + (springEaseAnim.to - springEaseAnim.from) * eased;
      if (t >= 1) springEaseAnim = null;
    }
  }

  function jellyPulse(instanceId: number, amp: number, axis: THREE.Vector3): void {
    const a = axis.lengthSq() > 1e-8 ? axis : new THREE.Vector3(0, 1, 0);
    a.normalize().toArray(jellyAxisAmpAttr, instanceId * 4);
    jellyAxisAmpAttr[instanceId * 4 + 3] = amp;
    jellyT0Attr[instanceId] = fieldTime;
    jellyAxisAmpAttribute.needsUpdate = true;
    jellyT0Attribute.needsUpdate = true;
  }
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
    setSprings,
    clearSprings,
    jellyPulse,
    tick,
  };
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
