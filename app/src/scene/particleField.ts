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

/* --- G1 · paleta categórica segura para daltonismo (DOCs/27, `15` R-5)
 *
 * DOS problemas medidos sobre el dataset real, no supuestos:
 *
 * 1. `DOMAIN_HUES` define 35 matices, pero los datos traen **245
 *    dominios distintos**. O sea que 5 429 conceptos (el 26.5 %) caen
 *    todos en el MISMO color de reserva. La leyenda dice "colores =
 *    temas" mientras un cuarto del cubo es un tema indistinguible.
 *
 * 2. Aunque estuvieran todos definidos, 35 matices categóricos no son
 *    distinguibles ni con visión normal, y el matiz es hoy el ÚNICO
 *    canal de dominio en la escena. Con ~8 % de los varones afectados
 *    por deficiencia de visión cromática, eso es exposición vigente al
 *    criterio 1.4.1 de WCAG 2.2.
 *
 * La solución que pide R-5 es acotar el matiz categórico a ≤10 cubos y
 * usar un conjunto verificado. Se usa **Okabe–Ito** (Color Universal
 * Design), el estándar comprobado para protanopía, deuteranopía y
 * tritanopía. Se omite su negro (invisible sobre fondo oscuro) y se
 * sustituye por un gris claro para "otros".
 *
 * Los dos cubos léxicos van primero porque son el 35 % del corpus: son
 * categorías GRAMATICALES, no temas, y mezclarlas con los temas sería
 * enseñar que "adjetivo" es un dominio semántico. */
const OKABE_ITO = {
  naranja: 0xe69f00,
  celeste: 0x56b4e9,
  verdeAzulado: 0x009e73,
  amarillo: 0xf0e442,
  azul: 0x0072b2,
  bermellon: 0xd55e00,
  purpuraRojizo: 0xcc79a7,
} as const;

/** Cubos categóricos: 8 con color propio + "otros". Elegidos por conteo
 * REAL de conceptos, no por gusto — ver el censo en el comentario de
 * arriba. Cubren los dos léxicos (35 %) y los 6 temas más poblados. */
export const DOMAIN_BUCKETS: { key: string; hue: number; domains: string[] }[] = [
  { key: "lexicoAdjetival", hue: OKABE_ITO.purpuraRojizo, domains: ["lexico_adjetival"] },
  { key: "lexicoVerbal", hue: OKABE_ITO.azul, domains: ["lexico_verbal"] },
  { key: "geografia", hue: OKABE_ITO.verdeAzulado, domains: ["geografia"] },
  { key: "tecnologia", hue: OKABE_ITO.celeste, domains: ["tecnologia"] },
  { key: "biologia", hue: OKABE_ITO.amarillo, domains: ["biologia_animal", "biologia_vegetal"] },
  { key: "personajes", hue: OKABE_ITO.bermellon, domains: ["personajes"] },
  { key: "arte", hue: OKABE_ITO.naranja, domains: ["arte", "arte_y_cultura", "musica"] },
];

/** Gris claro para todo lo demás. Que "otros" sea NEUTRO y no un color
 * más es deliberado: un matiz vivo prometería una categoría que no
 * existe — son 236 dominios distintos metidos en un cubo. */
export const OTHER_HUE = 0xb9c0c7;

const DOMAIN_TO_BUCKET = new Map<string, number>();
for (const b of DOMAIN_BUCKETS) for (const d of b.domains) DOMAIN_TO_BUCKET.set(d, b.hue);

/** Matiz de un dominio bajo la paleta segura. El modo token conserva su
 * verde propio: no es un dominio del dataset, es una partícula efímera
 * de la frase del usuario, y confundirla con un tema sería peor que
 * gastar un color. */
export function hueForDomain(domain: string): number {
  if (domain === "token_vivo") return DOMAIN_HUES.token_vivo;
  return DOMAIN_TO_BUCKET.get(domain) ?? OTHER_HUE;
}

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
  /** Picking manual ray-esfera sobre las instancias REALES visibles —
   * reemplaza al raycast de three contra el InstancedMesh, que exigía
   * mantener la instanceMatrix escrita y eran 4 vertex buffers más que
   * ya no caben en el tope de 8 de WebGPU (ver el bloque de atributos
   * empaquetados más abajo). `onlyIds`, si se da (foco activo),
   * restringe los candidatos a las instancias que siguen a brillo
   * normal; las portadoras (slots ≥ concepts.length) nunca se
   * consideran. Devuelve el id de la más cercana al rayo, o null. */
  pickInstanceAtRay: (raycaster: THREE.Raycaster, onlyIds?: Set<number> | null) => number | null;
  /** Principiante=sustantivos, Intermedio=+adjetivos, Avanzado=+verbos
   * — las instancias fuera del filtro se escalan a 0 (sin geometría
   * visible ni alcanzable por raycasting) en vez de reconstruir el
   * InstancedMesh, que sigue teniendo TODOS los conceptos siempre.
   * Devuelve cuántas quedaron visibles (para el HUD). `targetTotal`, si
   * se da, ajusta además la ventana de portadoras al conteo del nivel
   * (F2 §5.2: población visible = 15k/20k/25k células). */
  setPartOfSpeechFilter: (allowed: Set<PartOfSpeech>, targetTotal?: number) => number;
  /** P5 boot splash: revela una fracción (0-1) de las partículas en un
   * orden fijo (mismo shuffle re-usado en cada llamada), el resto a
   * escala 0 — así el cubo se puebla poco a poco mientras carga en vez
   * de aparecer todo de golpe al terminar. Cualquier filtro real
   * posterior (setPartOfSpeechFilter/morphToPartOfSpeechFilter) lo
   * sobreescribe sin conflicto, es puramente cosmético de arranque.
   * `allowedIds`, si se da, restringe el universo revelado a esos ids
   * — para bootear directo al tamaño del modo guardado, sin el
   * "crece y luego se encoge" de revelar todo el dataset primero (ver
   * comentario completo junto a la implementación). `targetTotal` revela
   * también las portadoras al mismo ritmo (F2 §5.2). */
  revealProgressively: (fraction: number, allowedIds?: number[], targetTotal?: number) => void;
  /** F1.3b — boot de CRECIMIENTO CELULAR (pedido explícito del usuario:
   * "primero una célula, luego dos, luego 3, 5, 8… hasta completar la
   * población"). Arranca con UNA célula visible (la más cercana al
   * centro de la nube) y crece en olas Fibonacci 1→2→3→5→8→13 que luego
   * aceleran ×φ hasta el conteo del nivel (con el escalado del governor
   * aplicado). TODA célula nueva nace por mitosis visible (misma
   * deformación peanut aAnim tipo 2 del morph de nivel) de una célula ya
   * visible — padre = la visible más cercana al hogar de la hija (misma
   * lógica que nearestStable, muestreada como pickAnchorNear para que
   * las olas de miles no paguen O(N) por hija). El ritmo lo manda el
   * progreso REAL de carga que main.ts alimenta con
   * setBootGrowthProgress: las olas nunca corren más rápido que la
   * fracción cargada; si la carga termina antes que las olas, las que
   * falten se drenan en ≤2s. Devuelve una promesa que resuelve cuando
   * la población está completa y toda mitosis terminó. Con
   * prefers-reduced-motion: reveal instantáneo (sin olas). */
  growCellularBoot: (allowedIds?: number[], targetTotal?: number) => Promise<void>;
  /** Alimenta el progreso real de carga (0-1) al boot de crecimiento
   * celular — llamar por cuadro mientras dure el arranque. */
  setBootGrowthProgress: (fraction: number) => void;
  /** Centro y radio de lo que está VISIBLE ahora. Es lo que necesita la
   * cámara del boot para encuadrar sobre lo que existe en vez de sobre
   * el cubo entero — la razón de que en el lab la primera célula llene
   * la pantalla y aquí fuera un punto perdido en el vacío. */
  visibleBounds: () => { cx: number; cy: number; cz: number; radius: number } | null;
  /** Fija el conjunto de enseñanza (R-14): sólo estos conceptos serán
   * visibles, además del filtro por categoría. null = sin límite. */
  setTeachingSet: (ids: Set<number> | null) => void;
  /** Cuántas células hay VIVAS en la escena ahora mismo. Es la verdad de
   * lo que el usuario tiene delante, no el objetivo al que se dirige:
   * las olas de mitosis van por detrás de la fracción de carga. El
   * contador del boot lee de aquí para que número y escena no puedan
   * discrepar. */
  visibleCellCount: () => number;
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
    opts?: { reducedMotion?: boolean; targetTotal?: number },
  ) => Promise<{ visibleCount: number }>;
  /** Duración (ms) que va a tardar la ola de partículas para este
   * filtro, calculada sin animar nada — para sincronizar el resto del
   * "chrome" (switcher, fade del composer/tokenStrip) a la misma
   * duración ANTES de arrancar la morph real. 0 si es la primera
   * llamada (instantánea, nada que sincronizar). */
  estimateMorphDuration: (allowed: Set<PartOfSpeech>, targetTotal?: number) => number;
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
  /** Palanca de población del QualityGovernor (F2 §5.4): fracción 0-1
   * del conteo nominal del nivel; el ajuste se hace con la MISMA lógica
   * celular (fusión/división masiva animada, nunca un corte seco). */
  setPopulationScale: (scale: number) => void;
  /** ¿Hay animación en curso (morph celular o ease de resortes)? — el
   * render-on-demand del tier Lite la consulta por cuadro. */
  isAnimating: () => boolean;
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
  /** Células portadoras que hay que poder mostrar ADEMÁS de todos los
   * conceptos reales — lo calcula quien llama, que es el único que
   * conoce la matriz POS y el conteo de cada nivel:
   * `max(nivel.celdas − conceptosVisiblesEnEseNivel)`.
   *
   * Existe porque la capacidad NO puede ser una constante: el dataset
   * crece solo (cron de auto-grow) y ya va en 19 442 conceptos. Con el
   * tope fijo de 25 000 de antes, las portadoras disponibles eran
   * 25 000 − 19 442 = 5 558 cuando Avanzado necesitaba 5 632, así que
   * Avanzado topaba en 24 926 células y nunca alcanzaba las 25 000 que
   * manda R-3 (medido en vivo). Peor: es una bomba de tiempo — cuando
   * el dataset cruce los 25 000 conceptos, el cubo empezaría a NO
   * poder mostrar conceptos que sí existen. */
  carrierHeadroom: number;
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
  transmit: 0.55,
  envReflect: 0.6,
  envReflBlur: 0.6,
  envRefrBlur: 2.5,
  // Iridiscencia a la MITAD que en el lab (0.7): allí el color es
  // decoración y puede teñirse libremente; aquí el hue es el dominio
  // semántico, y un arcoíris fuerte sobre el rim empieza a competir con
  // esa lectura. Al rim le basta este toque para leerse acuoso.
  iridescenceStrength: 0.35,
  iridescenceSpeed: 0.05,
  coreEmissive: 1.5,
  /** NO es el 8.0 del lab, y copiarlo fue un error medido. El falloff
   * dibuja un hotspot: cuanto más alto, más pequeño y concentrado. En
   * el lab la célula tiene radio 0.28 con la cámara encima y ocupa
   * cientos de píxeles, así que un hotspot diminuto se luce. Aquí tiene
   * radio 0.032 y mide 3-6 PÍXELES: con 8.0 el núcleo cae por debajo
   * del píxel y no se ve nada — el emisivo medio se desploma a 0.296
   * contra el 0.441 del look clásico, y eso es exactamente el "las
   * partículas perdieron el brillo" que se reportó. 2.8 devuelve un
   * medio de ~0.60, por encima del clásico, conservando el gradiente
   * del núcleo. Regla que este bloque tuvo que aprender dos veces: las
   * constantes del lab NO se copian, se re-afinan al tamaño aparente. */
  coreFalloff: 2.8,
  /** Sube con el falloff: es el piso que sostiene la célula cuando el
   * núcleo mira para otro lado. */
  baseGlow: 0.20,
  breathAmp: 0.09,
  breathSpeed: 1.1,
  wobbleAmp: 0.032,
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
  specularStrength: 1.0,
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
  /** F2 §5.2 — población celular por nivel (15 000 / 20 000 / 25 000).
   * Los slots [0, realCount) son conceptos REALES en su coordenada PCA
   * (jamás se mueven de ahí — honestidad central); los slots
   * [realCount, CAPACITY) son CÉLULAS PORTADORAS sin concepto asignado
   * (el dataset real hoy tiene ~9 600 conceptos, menos que cualquier
   * nivel): relleno ambiental que nace/muere SOLO por división/fusión
   * visible al cambiar de nivel — nada aparece de la nada ni desaparece
   * sin animación. Heredan el tono de su concepto ancla para que la
   * nube se lea coherente; no son alcanzables por hover/clic (ver
   * pickInstanceAtRay, que sólo itera slots reales). */
  // Capacidad = TODOS los conceptos reales + las portadoras que el
  // nivel más exigente necesite encima. Nunca una constante: el dataset
  // crece por cron (ver `carrierHeadroom` en las opciones).
  const realCount = concepts.length;
  const CAPACITY = realCount + Math.max(0, options.carrierHeadroom);
  const count = realCount;
  const geometry = new THREE.IcosahedronGeometry(0.032, 1);
  // El shader líquido no usa uv — fuera: cada atributo que el pipeline
  // declara cuenta contra el tope de 8 vertex buffers de WebGPU (ver el
  // bloque de atributos empaquetados más abajo).
  geometry.deleteAttribute("uv");
  // F1.4 — material líquido (port del lab /particula): OPACO con
  // escritura de profundidad, NUNCA aditivo — la "sopa aditiva"
  // anterior (17 VIS-01…03) venía de transparent+AdditiveBlending sin
  // depthWrite; las células líquidas se ocluyen entre sí como esferas
  // sólidas y el look (fresnel/env/iridiscencia/núcleo) lo pone el
  // shader, no el blending.
  const material = new THREE.MeshBasicNodeMaterial();

  // ── PRESUPUESTO DE VERTEX BUFFERS (bug producción 2026-07-26) ─────
  // WebGPU garantiza sólo maxVertexBuffers=8 (lo que reporta el adapter
  // de Chrome; pedir más con requiredLimits hace que requestDevice
  // rechace). El pipeline anterior declaraba 15 buffers (position,
  // normal, uv + 12 atributos instanciados) y createRenderPipeline
  // FALLABA — el cubo se renderizaba negro para todos los usuarios.
  // Todo el estado por instancia viaja ahora en 6 atributos vec4
  // empaquetados (+ position/normal de la geometría = 8 totales, el
  // máximo exacto). La instanceMatrix se eliminó por completo (eran 4
  // buffers más): el vertex shader posiciona con aHomeScale y el
  // picking es ray-esfera manual en CPU (ver pickInstanceAtRay).
  const homeScaleAttr = new Float32Array(CAPACITY * 4); // xyz=hogar PCA real, w=escala visible
  // rgb=tono del dominio, w=ganancia foco/highlight pre-multiplicada en
  // CPU (focus·(1+highlight·1.2) — el fragment multiplica una sola vez).
  const colorGainAttr = new Float32Array(CAPACITY * 4).fill(1);
  const bodyPhaseAttr = new Float32Array(CAPACITY * 4); // rgb=cuerpo oscurecido, w=fase de pulso/wobble
  const springAttr = new Float32Array(CAPACITY * 4); // xyz=desplazamiento resorte, w=t0 del impulso jelly
  const jellyAxisAmpAttr = new Float32Array(CAPACITY * 4); // xyz=eje jelly, w=amplitud
  const animAttr = new Float32Array(CAPACITY * 4); // x=tipo, y=progreso, zw=intensidades
  // t0 jelly arranca "hace una eternidad" = impulso jamás disparado.
  for (let i = 0; i < CAPACITY; i++) springAttr[i * 4 + 3] = -1e9;
  const homeScaleAttribute = new THREE.InstancedBufferAttribute(homeScaleAttr, 4);
  const colorGainAttribute = new THREE.InstancedBufferAttribute(colorGainAttr, 4);
  const bodyPhaseAttribute = new THREE.InstancedBufferAttribute(bodyPhaseAttr, 4);
  const springAttribute = new THREE.InstancedBufferAttribute(springAttr, 4);
  const jellyAxisAmpAttribute = new THREE.InstancedBufferAttribute(jellyAxisAmpAttr, 4);
  const animAttribute = new THREE.InstancedBufferAttribute(animAttr, 4);
  const tmpColor = new THREE.Color();

  const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
  mesh.count = CAPACITY; // todos los slots viven siempre; ocultar = aScale 0
  // La instanceMatrix se elimina DEL TODO: NodeMaterial la aplica
  // automáticamente a normalLocal en cuanto existe (InstancedMesh), y
  // a 25k instancias la empaqueta como buffer interleaved que ocupa el
  // 9º vertex buffer — uno más que el tope de 8 de WebGPU y el pipeline
  // vuelve a fallar (verificado instrumentando createRenderPipeline:
  // stride 64 × 4 atributos @8-11). Ni el shader (posiciona con
  // aHomeScale, normales unitarias por instancia) ni el picking
  // (ray-esfera manual, ver pickInstanceAtRay) la necesitan; el backend
  // WebGPU y el fallback WebGL de este renderer tampoco la leen (el
  // conteo de instancias sale de mesh.count). Bonus: libera 1.6MB.
  mesh.instanceMatrix = null as unknown as THREE.InstancedBufferAttribute;

  // Corrección sobre la corrección: bajar tamaño Y brillo A LA VEZ que
  // separar el espacio (CUBE_SCALE ×1.52, ver seed.ts) fue demasiado —
  // el espaciado solo ya resuelve el traslape real; encima achicar y
  // apagar deja el cubo "tenue y sin vida" en vistas ya poco densas
  // (Principiante, con muchas menos partículas visibles que Avanzado —
  // reportado en vivo con captura). Tamaño de vuelta a como estaba.
  const baseScaleOf = (concept: Concept) => (concept.distinctiveTrait ? 1.0 : 0.62);
  const CARRIER_SCALE = 0.62;

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
  const posArray = new Float32Array(CAPACITY * 3);
  const scaleArray = new Float32Array(CAPACITY);

  function writeInstance(id: number, pos: readonly [number, number, number], scale: number): void {
    posArray[id * 3] = pos[0];
    posArray[id * 3 + 1] = pos[1];
    posArray[id * 3 + 2] = pos[2];
    scaleArray[id] = scale;
    homeScaleAttr[id * 4] = pos[0];
    homeScaleAttr[id * 4 + 1] = pos[1];
    homeScaleAttr[id * 4 + 2] = pos[2];
    homeScaleAttr[id * 4 + 3] = scale;
  }

  /** El único buffer que writeInstance toca — subido sólo cuando algo
   * escribe instancias (filtros, reveal, morph), NUNCA por cuadro en
   * reposo (la deriva/wobble van en el vertex shader, CPU ≈ 0). */
  function markInstancesDirty(): void {
    homeScaleAttribute.needsUpdate = true;
  }

  concepts.forEach((concept, i) => {
    const hue = hueForDomain(concept.domain);
    tmpColor.setHex(hue);
    tmpColor.toArray(colorGainAttr, i * 4);
    // Cuerpo oscurecido / brillo con el tono a full — MISMO modelo de
    // color que la partícula del lab (ver heroParticle.ts's
    // bodyColorOf); importado, no copiado, porque dos copias a mano
    // desincronizadas ya causaron "cambia de material" en el lab.
    bodyColorOf(hue).toArray(bodyPhaseAttr, i * 4);
    bodyPhaseAttr[i * 4 + 3] = Math.random() * Math.PI * 2;

    writeInstance(i, concept.coords, baseScaleOf(concept));
  });

  /** Concepto ancla de cada portadora (índice de concepto real) — de
   * aquí heredan tono y "dominio" para la ola de la transición. */
  const carrierAnchor = new Int32Array(CAPACITY).fill(-1);
  // Portadoras: hogar fijo junto a un concepto real al azar (vecindad
  // orgánica). La posición se asigna UNA vez aquí; después sólo cambia
  // su visibilidad (escala) vía división/fusión celular.
  for (let i = realCount; i < CAPACITY; i++) {
    const anchorIdx = Math.floor(Math.random() * realCount);
    carrierAnchor[i] = anchorIdx;
    const anchor = concepts[anchorIdx];
    const hue = hueForDomain(anchor.domain);
    tmpColor.setHex(hue).toArray(colorGainAttr, i * 4);
    bodyColorOf(hue).toArray(bodyPhaseAttr, i * 4);
    bodyPhaseAttr[i * 4 + 3] = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI * 2;
    const z = Math.random() * 2 - 1;
    const r = 0.04 + Math.random() * 0.08;
    const s = Math.sqrt(1 - z * z);
    writeInstance(i, [anchor.coords[0] + Math.cos(theta) * s * r, anchor.coords[1] + Math.sin(theta) * s * r, anchor.coords[2] + z * r], 0);
  }
  /** Dominio de una celda para agrupar la ola de la transición — la del
   * concepto real, o la del ancla de la portadora. */
  function domainOfCell(id: number): string {
    return id < realCount ? concepts[id].domain : concepts[carrierAnchor[id]].domain;
  }
  function baseScaleOfCell(id: number): number {
    return id < realCount ? baseScaleOf(concepts[id]) : CARRIER_SCALE;
  }

  /** Escala de población por tier del QualityGovernor (F2 §5.4): 1 =
   * conteo nominal del nivel; 0.5/0.25 en Medium/Low. Se aplica sobre
   * `targetTotal` en los 3 puntos de entrada de población y se re-ejecuta
   * como transición celular (fusión/división masiva animada, 21 §5.2)
   * cuando cambia el tier. */
  let populationScale = 1;
  let lastRawTargetTotal: number | undefined;
  let morphAnimating = false;

  function scaledTarget(targetTotal: number | undefined): number | undefined {
    return targetTotal !== undefined ? Math.max(0, Math.round(targetTotal * populationScale)) : undefined;
  }

  /** Palanca de población del governor — re-ejecuta la transición al
   * nuevo conteo con la MISMA lógica celular (nunca un corte seco). */
  function setPopulationScale(scale: number): void {
    const clamped = Math.max(0.05, Math.min(1, scale));
    if (clamped === populationScale) return;
    populationScale = clamped;
    if (currentAllowed !== null && lastRawTargetTotal !== undefined) {
      void morphToPartOfSpeechFilter(currentAllowed, { targetTotal: lastRawTargetTotal });
    }
  }

  /** ¿Hay animación en curso (morph celular o ease de resortes)? — el
   * render-on-demand del tier Lite la usa para no saltarse cuadros. */
  function isAnimating(): boolean {
    return morphAnimating || springEaseAnim !== null || bootAnimating;
  }

  /** Cuántas portadoras están visibles ahora — ventana contigua
   * [realCount, realCount + carrierVisibleCount). Ventana (no conjunto
   * disperso): hace O(1) saber cuáles entran/salen al cambiar el
   * objetivo, y como los hogares de las portadoras ya están
   * distribuidos por toda la nube, una ventana de índices se ve
   * igual de orgánica que un subconjunto al azar. */
  let carrierVisibleCount = 0;


  /** Visibilidad instantánea de las portadoras para llegar a
   * `targetTotal` células totales (nivel) — devuelve cuántas quedaron. */
  function setCarrierWindow(targetTotal: number): number {
    const target = Math.max(0, Math.min(CAPACITY - realCount, targetTotal - countRealVisible()));
    for (let i = realCount; i < CAPACITY; i++) {
      const show = i - realCount < target;
      writeInstance(i, [posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]], show ? CARRIER_SCALE : 0);
    }
    carrierVisibleCount = target;
    return target;
  }

  /** Muestreado: con decenas de miles de células recorrerlas todas cada
   * cuadro costaría más que dibujarlas. Un paso fijo de como mucho 1500
   * muestras da un radio estable — sobra para encuadrar. */
  function visibleBounds(): { cx: number; cy: number; cz: number; radius: number } | null {
    let n = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    const step = Math.max(1, Math.floor(realCount / 1500));
    for (let i = 0; i < realCount; i += step) {
      if (scaleArray[i] <= 1e-3) continue;
      cx += posArray[i * 3];
      cy += posArray[i * 3 + 1];
      cz += posArray[i * 3 + 2];
      n++;
    }
    if (n === 0) return null;
    cx /= n;
    cy /= n;
    cz /= n;
    let maxSq = 0;
    for (let i = 0; i < realCount; i += step) {
      if (scaleArray[i] <= 1e-3) continue;
      const dx = posArray[i * 3] - cx;
      const dy = posArray[i * 3 + 1] - cy;
      const dz = posArray[i * 3 + 2] - cz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d > maxSq) maxSq = d;
    }
    return { cx, cy, cz, radius: Math.sqrt(maxSq) };
  }

  function countRealVisible(): number {
    let n = 0;
    for (let i = 0; i < realCount; i++) if (scaleArray[i] > 1e-3) n++;
    return n;
  }

  /** Conjunto de enseñanza (R-14 de la auditoría pedagógica `15` §4):
   * cuando está fijado, SÓLO estos conceptos son visibles, además del
   * filtro por categoría gramatical. Es lo que permite que Principiante
   * muestre ~300 conceptos curados en vez de los 10 000+ que le tocan
   * por categoría — la evidencia (Serrell 1997; Munzner 2014; Sedlmair
   * et al. 2013; principio de coherencia de Mayer, d=0.86) dice que
   * menos elementos producen un compromiso MÁS minucioso, y que la
   * separación de clases se degrada con la densidad. null = sin límite
   * (Intermedio/Avanzado). */
  let teachingSet: Set<number> | null = null;

  function isTeachable(i: number, c: Concept, allowed: Set<PartOfSpeech>): boolean {
    if (!allowed.has(c.partOfSpeech)) return false;
    return teachingSet === null || teachingSet.has(i);
  }

  function setTeachingSet(ids: Set<number> | null): void {
    teachingSet = ids;
  }

  function setPartOfSpeechFilter(allowed: Set<PartOfSpeech>, targetTotal?: number): number {
    let visible = 0;
    concepts.forEach((concept, i) => {
      const show = isTeachable(i, concept, allowed);
      if (show) visible++;
      writeInstance(i, concept.coords, show ? baseScaleOf(concept) : 0);
    });
    const scaled = scaledTarget(targetTotal);
    if (scaled !== undefined) setCarrierWindow(scaled);
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
  function revealProgressively(fraction: number, allowedIds?: number[], targetTotal?: number): void {
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
    // Portadoras al mismo ritmo: la nube crece hacia el conteo del
    // nivel durante el boot, no de golpe al terminar (F2 §5.2).
    const scaledTotal = scaledTarget(targetTotal);
    if (scaledTotal !== undefined) {
      const carrierTarget = Math.max(0, Math.min(CAPACITY - realCount, scaledTotal - pool.length));
      const showCarriers = Math.round(carrierTarget * Math.min(Math.max(fraction, 0), 1));
      for (let i = realCount; i < CAPACITY; i++) {
        const show = i - realCount < showCarriers;
        writeInstance(i, [posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]], show ? CARRIER_SCALE : 0);
      }
      carrierVisibleCount = showCarriers;
    }
    markInstancesDirty();
  }

  // ── F1.3b — boot de crecimiento celular (ver la doc de la interfaz) ──
  // Pacing: las primeras olas Fibonacci duran BOOT_WAVE_DUR_FIRST para
  // que la división se APRECIE (pedido explícito); de ahí la duración
  // decae ×0.78 por ola (aceleración) hasta un piso. Con total=25k el
  // último arranque de ola cae ~6.6s ≈ el objetivo de carga de 8s. El
  // tope poblacional (total × fraction) garantiza que las olas nunca
  // corran más rápido que la carga real; cuando fraction llega a 1
  // quedando olas, sus minStart se reagendan comprimidas en ≤2s (drain).
  const BOOT_WAVE_DUR_FIRST = 750; // ms por ola Fibonacci temprana
  const BOOT_WAVE_DUR_MIN = 70;
  const BOOT_WAVE_DECAY = 0.78;
  const BOOT_DRAIN_MS = 2000;

  let bootFraction = 0;
  let bootAnimating = false;
  let bootSeq = 0;

  function setBootGrowthProgress(fraction: number): void {
    bootFraction = fraction;
  }

  function growCellularBoot(allowedIds?: number[], targetTotal?: number): Promise<void> {
    const seq = ++bootSeq;
    const pool = allowedIds ?? concepts.map((_, i) => i);
    const scaledTotal = scaledTarget(targetTotal);
    const carrierTarget =
      scaledTotal !== undefined
        ? Math.max(0, Math.min(CAPACITY - realCount, scaledTotal - pool.length))
        : 0;
    const total = pool.length + carrierTarget;

    // Reduced motion: reveal instantáneo, sin olas (MUST accesibilidad).
    if (reducedMotion || total <= 1) {
      revealProgressively(1, allowedIds, targetTotal);
      return Promise.resolve();
    }

    // Todo a 0 menos la semilla: la primera célula es el concepto del
    // pool más cercano al centro de la nube.
    let seed = pool[0];
    let seedD = Infinity;
    for (const id of pool) {
      const c = concepts[id].coords;
      const d = c[0] * c[0] + c[1] * c[1] + c[2] * c[2];
      if (d < seedD) {
        seedD = d;
        seed = id;
      }
    }
    // La semilla (y las primeras ~150 células) nace con boost de escala
    // — ver el comentario de launchBirths: sin él las primeras olas son
    // puntos invisibles a esta distancia de cámara.
    const boosted: { id: number; trueScale: number }[] = [];
    concepts.forEach((concept, i) => writeInstance(i, concept.coords, 0));
    for (let i = realCount; i < CAPACITY; i++) {
      writeInstance(i, [posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]], 0);
    }
    writeInstance(seed, concepts[seed].coords, baseScaleOf(concepts[seed]) * 5);
    boosted.push({ id: seed, trueScale: baseScaleOf(concepts[seed]) });
    carrierVisibleCount = carrierTarget;
    markInstancesDirty();

    // Cola de nacimientos: conceptos reales primero (la semilla ya está
    // fuera; el resto en orden fijo barajado, mismo espíritu que
    // revealOrder), portadoras después por la misma vía.
    const queue: number[] = shuffled(pool.filter((id) => id !== seed));
    for (let i = 0; i < carrierTarget; i++) queue.push(realCount + i);

    // Olas: acumulados Fibonacci 1→2→3→5→8→13 y de ahí ×φ hasta total.
    const waves: number[] = [1, 2, 3, 5, 8, 13];
    while (waves[waves.length - 1] < total) {
      waves.push(Math.min(total, Math.max(waves[waves.length - 1] + 1, Math.round(waves[waves.length - 1] * 1.618))));
    }
    // minStart por ola (pacing puro; la fracción puede retrasarlo,
    // nunca adelantarlo).
    const minStart: number[] = [0];
    {
      let acc = 0;
      for (let k = 1; k < waves.length; k++) {
        const dur =
          k <= 5
            ? BOOT_WAVE_DUR_FIRST
            : Math.max(BOOT_WAVE_DUR_MIN, BOOT_WAVE_DUR_FIRST * Math.pow(BOOT_WAVE_DECAY, k - 5));
        acc += dur;
        minStart.push(acc);
      }
    }

    const morphSeqAtBoot = morphSeq;
    // El reloj del pacing arranca con la PRIMERA señal de progreso real
    // (primer setBootGrowthProgress): entre createParticleField y el
    // arranque del render/feed pueden pasar segundos de init (WebGPU,
    // PMREM, UI) en los que nadie vería las primeras olas — sin esto,
    // el 1→2→3→5 se quemaba durante la init en máquinas lentas.
    let t0: number | null = null;
    const visibleCells: number[] = [seed];
    let born = 1; // células ya agendadas (la semilla cuenta)
    let waveIdx = 0;
    let draining = false;
    bootAnimating = true;

    /** Padre de una hija: la visible más cercana a su hogar con
     * preferencia por mismo dominio — la lógica de nearestStable,
     * muestreada como pickAnchorNear (olas de miles: O(N) por hija no
     * cabe en un frame). */
    function pickBootParent(home: readonly [number, number, number], domain: string): number {
      let best = -1;
      let bestD = Infinity;
      let bestDom = -1;
      let bestDomD = Infinity;
      const samples = Math.min(visibleCells.length, 200);
      for (let s = 0; s < samples; s++) {
        const j = visibleCells[(Math.random() * visibleCells.length) | 0];
        const d = distSq(homeOf(j), home);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
        if (domainOfCell(j) === domain && d < bestDomD) {
          bestDomD = d;
          bestDom = j;
        }
      }
      const picked = bestDom !== -1 ? bestDom : best;
      return picked !== -1 ? picked : visibleCells[0];
    }

    interface BootItem {
      id: number;
      startAt: number; // epoch ms — jitter de arranque dentro de la ola
      startEpoch: number; // -1 hasta que arranca la mitosis
      duration: number;
      toScale: number;
    }

    return new Promise<void>((resolve) => {
      const items = new Set<BootItem>();
      let settled = false;
      function resolveOnce(): void {
        if (settled) return;
        settled = true;
        bootAnimating = false;
        clearInterval(watchdog);
        resolve();
      }

      /** Agenda los nacimientos de queue[born-1 .. upTo-1]: cada hija
       * nace por mitosis (aAnim tipo 2) junto a su padre — ordenadas de
       * más cerca a más lejos del padre para que cada ola se vea crecer
       * hacia afuera. Las primeras ~150 nacen con BOOST de escala (hasta
       * ×5 en la segunda célula, decae lineal a ×1) que luego se asienta
       * suavemente al tamaño real en tick(): a tamaño/brillo clásico las
       * primeras olas serían puntos indistinguibles a esta distancia de
       * cámara, y el pedido explícito es VER el 1→2→3→5→8 dividirse. El
       * estado final (escala real) queda intacto. `boosted` vive fuera
       * (la semilla también entra). */
      function launchBirths(upTo: number, now: number): void {
        type Triple = readonly [number, number, number];
        const batch: {
          id: number;
          parent: number;
          parentD: number;
          parentHome: Triple;
          childHome: Triple;
        }[] = [];
        while (born < upTo) {
          const id = queue[born - 1];
          born++;
          const home = homeOf(id);
          const childHome: Triple = [home[0], home[1], home[2]];
          const parent = pickBootParent(home, domainOfCell(id));
          const p = homeOf(parent);
          const parentHome: Triple = [p[0], p[1], p[2]];
          batch.push({ id, parent, parentD: distSq(p, home), parentHome, childHome });
          visibleCells.push(id);
        }
        batch.sort((a, b) => a.parentD - b.parentD);
        for (const { id, parent, parentHome, childHome } of batch) {
          // Eje de la mitosis: de la hija HACIA la madre. El shader lo
          // lee de aJellyAxisAmp.xyz (ver birthAxis en positionNode) y
          // arranca a la hija pegada al cuerpo de la madre, separándola
          // con el estiramiento peanut. Normalizado en CPU: el shader
          // vuelve a normalizar, pero así el caso degenerado (madre e
          // hija con el mismo hogar) cae en un eje estable y no en 0.
          const ax = parentHome[0] - childHome[0];
          const ay = parentHome[1] - childHome[1];
          const az = parentHome[2] - childHome[2];
          const len = Math.hypot(ax, ay, az) || 1;
          const o = id * 4;
          jellyAxisAmpAttr[o] = ax / len;
          jellyAxisAmpAttr[o + 1] = ay / len;
          jellyAxisAmpAttr[o + 2] = az / len;
          // Distancia real a la madre, acotada: pickBootParent elige la
          // visible más cercana, pero en las primeras olas "la más
          // cercana" puede estar al otro lado del cubo, y sin tope la
          // hija cruzaría la escena como un cometa en vez de brotar.
          jellyAxisAmpAttr[o + 3] = Math.min(len, 0.55);
          const trueScale = baseScaleOfCell(id);
          const boost = 1 + 4 * Math.max(0, 1 - born / 150);
          if (boost > 1.001) boosted.push({ id, trueScale });
          // Las PRIMERAS divisiones son las únicas que se pueden seguir
          // una por una — la de 1→2 es la promesa entera del arranque —
          // y a 280 ms pasaban desapercibidas. Se estiran hasta ~900 ms
          // y se acortan a medida que hay más células, donde ya nadie
          // sigue una mitosis concreta. El escalonado de arranque
          // también se abre al principio para que no salgan a la vez.
          const early = Math.max(0, 1 - born / 24);
          const startAt = now + Math.random() * (120 + early * 260);
          const duration = (280 + Math.random() * 140) * (1 + early * 1.6);
          items.add({ id, startAt, startEpoch: -1, duration, toScale: trueScale * boost });

          // LA MADRE TAMBIÉN SE ANIMA. Ésta es la mitad que faltaba y la
          // razón real de que nunca se viera una división: el cubo sólo
          // animaba a la hija, así que la madre se quedaba quieta y lo
          // que se veía era "aparece una bola al lado", jamás "una
          // célula se parte". El lab anima las DOS (state.ts: recA y
          // recB, ambas DIVIDE con eje hacia el origen común).
          //
          // Aquí la madre no puede viajar como en el lab —su posición es
          // una coordenada PCA real, es el dato— así que se le da el
          // estiramiento peanut hacia la hija con desplazamiento CERO
          // (aJellyAxisAmp.w = 0): se alarga hacia donde brota la hija y
          // se relaja. Ese gesto es el que lee como mitosis.
          if (parent !== id) {
            const po = parent * 4;
            jellyAxisAmpAttr[po] = -ax / len;
            jellyAxisAmpAttr[po + 1] = -ay / len;
            jellyAxisAmpAttr[po + 2] = -az / len;
            jellyAxisAmpAttr[po + 3] = 0; // la madre estira, no se mueve
            items.add({
              id: parent,
              startAt,
              startEpoch: -1,
              duration,
              toScale: baseScaleOfCell(parent),
            });
          }
        }
        // Sin esto el eje/distancia de mitosis que acabamos de escribir
        // NUNCA llega a la GPU: markInstancesDirty sólo sube homeScale,
        // así que el shader leía ceros, la amplitud del nacimiento salía
        // 0 y la hija aparecía clavada en su hogar — de la nada.
        jellyAxisAmpAttribute.needsUpdate = true;
      }

      function flushAll(): void {
        // Interrupción (otro boot o un morph): todo a estado final de
        // inmediato — la siguiente clasificación por estado real
        // (scaleArray) parte consistente.
        for (const item of items) {
          writeInstance(item.id, homeOf(item.id), item.toScale);
          clearInstanceAnim(item.id);
        }
        items.clear();
        for (const b of boosted) writeInstance(b.id, homeOf(b.id), b.trueScale);
        boosted.length = 0;
        while (born <= total && born - 1 < queue.length) {
          const id = queue[born - 1];
          born++;
          writeInstance(id, homeOf(id), baseScaleOfCell(id));
        }
        markInstancesDirty();
        animAttribute.needsUpdate = true;
      }

      function tick(): void {
        if (settled) return;
        if (seq !== bootSeq || morphSeq !== morphSeqAtBoot) {
          flushAll();
          resolveOnce();
          return;
        }
        const now = performance.now();
        if (t0 === null) {
          if (bootFraction > 0) {
            t0 = now;
          } else {
            // Aún no hay señal de progreso real (init de GPU/UI en
            // curso): la semilla espera visible, las olas no arrancan.
            requestAnimationFrame(tick);
            return;
          }
        }
        const elapsed = now - t0;

        // Drenado: la carga terminó (fraction=1) y quedan olas — se
        // comprimen en ≤ BOOT_DRAIN_MS.
        if (!draining && bootFraction >= 1 && waveIdx < waves.length - 1) {
          draining = true;
          const remaining = waves.length - 1 - waveIdx;
          const step = Math.min(BOOT_DRAIN_MS / Math.max(remaining, 1), 120);
          for (let k = waveIdx + 1; k < waves.length; k++) {
            minStart[k] = elapsed + step * (k - waveIdx);
          }
        }
        while (waveIdx < waves.length - 1 && elapsed >= minStart[waveIdx + 1]) waveIdx++;
        // Nunca más rápido que el progreso real: tope poblacional por
        // fracción (la semilla siempre cuenta como 1).
        const fracCap = Math.max(1, Math.floor(total * Math.min(Math.max(bootFraction, 0), 1)));
        const cap = Math.min(waves[waveIdx], fracCap);
        if (cap > born) launchBirths(cap, now);

        // Progreso de las mitosis activas — mismo driver que el morph
        // de nivel (parámetros una vez, 1 float de progreso por cuadro).
        for (const item of items) {
          if (item.startEpoch < 0) {
            if (now < item.startAt) continue;
            item.startEpoch = now;
            // La hija nace a tamaño completo junto a su padre (el eje
            // lo deriva el shader por hash) y se separa estirada hacia
            // su hogar real.
            homeScaleAttr[item.id * 4 + 3] = item.toScale;
            setInstanceAnim(item.id, 2, 0.55, 5);
          }
          const localT = Math.min((now - item.startEpoch) / item.duration, 1);
          animAttr[item.id * 4 + 1] = 1 - Math.pow(1 - localT, 3);
          if (localT >= 1) {
            writeInstance(item.id, homeOf(item.id), item.toScale);
            clearInstanceAnim(item.id);
            items.delete(item);
          }
        }
        // Asentado del boost de las primeras células hacia su escala
        // real (ease por frame — la sensación es de "zoom que se
        // estabiliza", nunca un salto).
        for (let i = boosted.length - 1; i >= 0; i--) {
          const b = boosted[i];
          const o = b.id * 4 + 3;
          const nw = b.trueScale + (homeScaleAttr[o] - b.trueScale) * 0.985;
          if (nw - b.trueScale < 0.002) {
            writeInstance(b.id, homeOf(b.id), b.trueScale);
            boosted.splice(i, 1);
          } else {
            homeScaleAttr[o] = nw;
          }
        }
        markInstancesDirty();
        animAttribute.needsUpdate = true;

        if (born >= total && items.size === 0) {
          // Snap final: lo que aún estuviera asentándose queda en su
          // escala real exacta (a esta altura la diferencia es <2%).
          for (const b of boosted) writeInstance(b.id, homeOf(b.id), b.trueScale);
          boosted.length = 0;
          markInstancesDirty();
          resolveOnce();
          return;
        }
        requestAnimationFrame(tick);
      }

      // Watchdog: Chrome pausa rAF en pestañas en segundo plano — el
      // scheduling es por reloj (performance.now), así que un intervalo
      // de refuerzo mantiene el boot avanzando aunque no haya cuadros.
      const watchdog = setInterval(tick, 250);
      requestAnimationFrame(tick);
    });
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
    toScale: number; // escala final: baseScale (mitosis) o 0 (fusión)
  }

  /** Driver de la animación celular por instancia (F2 §5.2 — mismo
   * patrón que aAnim del lab): parámetros una vez al arrancar la celda,
   * progreso por cuadro sólo de las activas. La deformación
   * (estiramiento peanut, separación/encogido, wobble) la hace el
   * vertex shader — la CPU nunca reescribe posiciones por cuadro. El
   * eje de la transición ya NO viaja por instancia (no cabía en el
   * presupuesto de 8 vertex buffers): el shader lo deriva por hash
   * determinista del hogar + tipo (ver positionNode). */
  function setInstanceAnim(id: number, type: number, p1: number, p2: number): void {
    const o = id * 4;
    animAttr[o] = type;
    animAttr[o + 1] = 0;
    animAttr[o + 2] = p1;
    animAttr[o + 3] = p2;
  }

  function clearInstanceAnim(id: number): void {
    animAttr.fill(0, id * 4, id * 4 + 4);
  }

  function homeOf(id: number): readonly [number, number, number] {
    return [posArray[id * 3], posArray[id * 3 + 1], posArray[id * 3 + 2]];
  }

  /** Ancla cercana a `home` muestreando el pool visible (para
   * portadoras — los conceptos reales usan nearestStable, mismo
   * dominio). 200 muestras al azar: suficiente para que la
   * división/fusión se vea local sin un O(N) por celda. */
  function pickAnchorNear(home: readonly [number, number, number], pool: number[]): number | null {
    if (pool.length === 0) return null;
    let best = -1;
    let bestD = Infinity;
    for (let s = 0; s < 200; s++) {
      const j = pool[Math.floor(Math.random() * pool.length)];
      const d = distSq(homeOf(j), home);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
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
  // dentro de ese tiempo — sin techo artificial (el costo real ahora es
  // escribir UN float de progreso por celda activa por frame, aún más
  // barato que la matriz completa de antes).
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
  // semilla" en vez de aparecer salpicada. Funciona igual para
  // portadoras (dominio de su ancla, hogar de posArray).
  function groupedWaveOrder(ids: number[], anchors: Map<number, number>): number[] {
    const byDomain = new Map<string, number[]>();
    for (const id of ids) {
      const domain = domainOfCell(id);
      const group = byDomain.get(domain);
      if (group) group.push(id);
      else byDomain.set(domain, [id]);
    }
    const orderedDomains = shuffled([...byDomain.keys()]);
    const result: number[] = [];
    for (const domain of orderedDomains) {
      const group = byDomain.get(domain)!;
      group.sort((a, b) => {
        const da = distSq(homeOf(a), homeOf(anchors.get(a)!));
        const db = distSq(homeOf(b), homeOf(anchors.get(b)!));
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
  // §4). La TRAYECTORIA ya no va aquí (la hace la GPU vía aAnim); aquí
  // sólo se agenda CUÁNDO arranca cada celda.
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
      const [dMin, dMax] = kind === "mitosis" ? [280, 420] : [260, 380];
      items.push({
        id,
        kind,
        anchor,
        start: t,
        duration: dMin + Math.random() * (dMax - dMin),
        toScale: kind === "mitosis" ? baseScaleOfCell(id) : 0,
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
  function estimateMorphDuration(allowed: Set<PartOfSpeech>, targetTotal?: number): number {
    if (currentAllowed === null) return 0;
    const EPS = 1e-3;
    let changing = 0;
    concepts.forEach((c, i) => {
      const shouldShow = isTeachable(i, c, allowed);
      const target = shouldShow ? baseScaleOf(c) : 0;
      if (Math.abs(scaleArray[i] - target) >= EPS) changing++;
    });
    if (targetTotal !== undefined) {
      const realTarget = concepts.filter((c, i) => isTeachable(i, c, allowed)).length;
      const scaled = scaledTarget(targetTotal)!;
      const carrierTarget = Math.max(0, Math.min(CAPACITY - realCount, scaled - realTarget));
      changing += Math.abs(carrierTarget - carrierVisibleCount);
    }
    return computeMorphPlan(changing).targetDuration;
  }

  async function morphToPartOfSpeechFilter(
    allowed: Set<PartOfSpeech>,
    opts: { reducedMotion?: boolean; targetTotal?: number } = {},
  ): Promise<{ visibleCount: number }> {
    const seq = ++morphSeq;
    const isFirstCall = currentAllowed === null;
    currentAllowed = new Set(allowed);
    if (opts.targetTotal !== undefined) lastRawTargetTotal = opts.targetTotal;

    if (isFirstCall || opts.reducedMotion) {
      return { visibleCount: setPartOfSpeechFilter(allowed, opts.targetTotal) };
    }

    // Clasificación por ESTADO REAL, no por diferencia entre el Set
    // viejo y el nuevo (bug real corregido junto con esto): comparar
    // sets asume que toda partícula ya está exactamente donde su último
    // filtro la dejó — falso si una transición anterior fue interrumpida
    // a medio vuelo por ésta. Comparar contra scaleArray (la escala real
    // actual) en vez de contra el filtro anterior hace que "seguir
    // animando desde donde se quedó" sea el comportamiento NATURAL, no
    // un caso especial.
    const EPS = 1e-3;
    const entering: number[] = [];
    const leaving: number[] = [];
    const stableVisible: number[] = []; // únicas anclas válidas: ya completamente visibles
    concepts.forEach((c, i) => {
      const shouldShow = isTeachable(i, c, allowed);
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

    // Portadoras (F2 §5.2): la ventana [0, targetCarriers) define el
    // OBJETIVO; la clasificación entrante/saliente se hace por ESTADO
    // REAL (scaleArray), igual que los conceptos — una ventana
    // contable se rompe bajo interrupción (un morph nuevo no sabría
    // cuáles portadoras quedaron a medias), la clasificación por estado
    // no: las interrumpidas se re-clasifican solas en la siguiente ola.
    const scaledTotal = scaledTarget(opts.targetTotal);
    const targetCarriers =
      scaledTotal !== undefined
        ? Math.max(0, Math.min(CAPACITY - realCount, scaledTotal - visibleCount))
        : carrierVisibleCount;
    const carrierEntering: number[] = [];
    const carrierLeaving: number[] = [];
    const stableCarriers: number[] = [];
    for (let i = realCount; i < CAPACITY; i++) {
      const shouldShow = i - realCount < targetCarriers;
      const current = scaleArray[i];
      if (shouldShow && current < EPS) carrierEntering.push(i);
      else if (!shouldShow && current > EPS) carrierLeaving.push(i);
      else if (shouldShow) stableCarriers.push(i);
    }
    const anchorPool = [...stableVisible, ...stableCarriers];

    if (entering.length === 0 && leaving.length === 0 && carrierEntering.length === 0 && carrierLeaving.length === 0) {
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
    const carrierParentOf = new Map<number, number>();
    for (const e of carrierEntering) {
      const p = pickAnchorNear(homeOf(e), anchorPool);
      if (p !== null) carrierParentOf.set(e, p);
    }
    const carrierPredatorOf = new Map<number, number>();
    for (const l of carrierLeaving) {
      const p = pickAnchorNear(homeOf(l), anchorPool);
      if (p !== null) carrierPredatorOf.set(l, p);
    }

    // Sin pareja (pool vacío — caso raro): aparecen/desaparecen sin
    // animar en vez de crashear.
    for (const id of entering) {
      if (parentOf.has(id)) continue;
      writeInstance(id, concepts[id].coords, baseScaleOf(concepts[id]));
    }
    for (const id of leaving) {
      if (predatorOf.has(id)) continue;
      writeInstance(id, concepts[id].coords, 0);
    }
    for (const id of carrierEntering) {
      if (carrierParentOf.has(id)) continue;
      writeInstance(id, homeOf(id), baseScaleOfCell(id));
    }
    for (const id of carrierLeaving) {
      if (carrierPredatorOf.has(id)) continue;
      writeInstance(id, homeOf(id), 0);
    }

    const itemCount = parentOf.size + predatorOf.size + carrierParentOf.size + carrierPredatorOf.size;
    const { targetDuration, concurrency } = computeMorphPlan(itemCount);
    const allItems = [
      ...buildSchedule(entering, "mitosis", parentOf, targetDuration),
      ...buildSchedule(leaving, "fusion", predatorOf, targetDuration),
      ...buildSchedule(carrierEntering, "mitosis", carrierParentOf, targetDuration),
      ...buildSchedule(carrierLeaving, "fusion", carrierPredatorOf, targetDuration),
    ];
    markInstancesDirty();
    carrierVisibleCount = targetCarriers;
    if (allItems.length === 0) return { visibleCount };

    morphAnimating = true;
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
      // dejaba el modo colgado para siempre. resolveOnce() es
      // idempotente: lo que llegue primero (rAF o el timer) gana.
      let settled = false;
      function resolveOnce() {
        if (settled) return;
        settled = true;
        morphAnimating = false;
        clearTimeout(safetyTimer);
        resolve({ visibleCount });
      }
      const safetyTimer = setTimeout(() => {
        for (const item of allItems) finalize(item);
        markInstancesDirty();
        animAttribute.needsUpdate = true;
        resolveOnce();
      }, targetDuration + 6000);

      function finalize(item: MorphItem) {
        writeInstance(item.id, homeOf(item.id), item.toScale);
        clearInstanceAnim(item.id);
      }

      function tick() {
        if (seq !== morphSeq) {
          // Otro morph más nuevo lo reemplazó — FLUSH: las celdas
          // activas se completan de inmediato (a lo más `concurrency`
          // de miles) y la nueva clasificación parte de estado final
          // consistente; las no arrancadas nunca recibieron parámetros.
          for (const idx of active) finalize(allItems[idx]);
          markInstancesDirty();
          animAttribute.needsUpdate = true;
          resolveOnce();
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
              if (item.kind === "mitosis") {
                // La hija nace a tamaño completo JUNTO a su ancla (el
                // eje lo deriva el shader por hash — en t=0 se renderiza
                // desplazada hacia atrás sobre ese eje) y se separa
                // estirada hacia su hogar real.
                homeScaleAttr[item.id * 4 + 3] = item.toScale;
                setInstanceAnim(item.id, 2, 0.55, 5);
              } else {
                // La comida viaja hacia su depredador encogiendo a 0.
                setInstanceAnim(item.id, 3, 0.7, 6);
              }
            } else {
              continue;
            }
          }
          if (!active.has(idx)) continue; // ya terminó

          const localT = Math.min((elapsed - startTimes[idx]) / item.duration, 1);
          const eased = 1 - Math.pow(1 - localT, 3);
          animAttr[item.id * 4 + 1] = eased;

          if (localT >= 1) {
            active.delete(idx);
            finalize(item);
          }
        }

        markInstancesDirty();
        animAttribute.needsUpdate = true;

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

  geometry.setAttribute("aHomeScale", homeScaleAttribute);
  geometry.setAttribute("aColorGain", colorGainAttribute);
  geometry.setAttribute("aBodyPhase", bodyPhaseAttribute);
  geometry.setAttribute("aSpring", springAttribute);
  geometry.setAttribute("aJellyAxisAmp", jellyAxisAmpAttribute);
  geometry.setAttribute("aAnim", animAttribute);

  // Las posiciones de render vienen de aHomeScale (atributo), no de la
  // instanceMatrix — la esfera envolvente de la geometría (radio 0.032
  // en el origen) no cubre el cubo y el frustum culling descartaría el
  // campo entero.
  mesh.frustumCulled = false;

  const aHomeScale = attribute<"vec4">("aHomeScale", "vec4");
  const aColorGain = attribute<"vec4">("aColorGain", "vec4");
  const aBodyPhase = attribute<"vec4">("aBodyPhase", "vec4");
  const aSpring = attribute<"vec4">("aSpring", "vec4");
  const aJellyAxisAmp = attribute<"vec4">("aJellyAxisAmp", "vec4");
  const aAnim = attribute<"vec4">("aAnim", "vec4");
  // Alias con los nombres semánticos de siempre — el resto del shader
  // queda igual que cuando cada dato viajaba en su propio atributo.
  const aHome = aHomeScale.xyz;
  const aScale = aHomeScale.w;
  const instanceColor = aColorGain.rgb;
  const aGain = aColorGain.a;
  const instancePhase = aBodyPhase.a;
  /** Albedo oscurecido de la célula (bodyColorOf) — la masa mate bajo el
   * brillo. Ya viajaba en el buffer; el look clásico no lo usaba. */
  const aBody = aBodyPhase.xyz;
  const aSpringVec = aSpring.xyz;
  const aJellyT0 = aSpring.w;

  const L = CUBE_LIQUID;
  // Direcciones fijas del look líquido: luz principal (especular/SSS) y
  // hotspot del núcleo. Uniformes y no constantes para poder afinarlas
  // en vivo sin recompilar el shader.
  const uLightDir = uniform(new THREE.Vector3(...L.lightDir).normalize());
  const uCoreDir = uniform(new THREE.Vector3(...L.coreDir).normalize());

  // prefers-reduced-motion congela deriva y wobble (MUST del plan); el
  // pulse/breath de brillo se conserva (es shimmer de relevancia, no
  // movimiento espacial).
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const uMotionScale = uniform(reducedMotion ? 0 : 1);
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
  // reposo. La instanceMatrix se eliminó del todo (eran 4 vertex
  // buffers que ya no caben en el tope de 8 de WebGPU): el render se
  // posiciona con aHomeScale y el picking de hover/clic es ray-esfera
  // manual en CPU (ver pickInstanceAtRay).
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
    // Animación celular (F2 §5.2 — pesos branch-free como en el lab):
    //   2 división: hogar = aHome + axis·(1−t) (nace junto a la ancla) +
    //     estiramiento peanut sin(πt)·z; w = boost de wobble
    //   3 fusión: hogar = aHome + axis·t (viaja hacia su ancla), escala
    //     1−t, mismo estiramiento; w = boost de wobble
    const animT = aAnim.y;
    const oneAnimT = float(1).sub(animT);
    const sinPiT = sin(animT.mul(Math.PI));
    const w2 = float(1).sub(aAnim.x.sub(2).abs().min(1));
    const w3 = float(1).sub(aAnim.x.sub(3).abs().min(1));
    const animIdle = float(1).sub(w2.add(w3).min(1));
    // La hija CRECE mientras se separa (0.35 → 1). Antes nacía a tamaño
    // completo y sólo se desplazaba: una bola entera que se corre de
    // sitio no se lee como una célula partiéndose. Creciendo desde el
    // cuerpo de la madre sí — es el mismo gesto que la mitosis del lab.
    // Sólo la HIJA crece de 0.35 a 1; la madre se queda a tamaño real y
    // sólo se estira. Se distinguen por la amplitud de desplazamiento:
    // la hija viaja (w > 0), la madre no (w = 0). Sin esta separación la
    // madre encogía al 35% en cada división, que es peor que no animarla.
    const isDaughter = aJellyAxisAmp.w.mul(1000).clamp(0, 1);
    const birthScale = mix(float(1), float(0.35).add(animT.mul(0.65)), isDaughter);
    const animScale = w2.mul(birthScale).add(w3.mul(oneAnimT.max(0))).add(animIdle);
    // El eje de la transición ya no viaja en atributo (aAnimAxis era el
    // vector hogar↔ancla y no cabía en el presupuesto de 8 buffers): se
    // deriva por hash determinista sin/fract del hogar + tipo de
    // animación — cada célula/tipo tiene su eje estable, visualmente
    // equivalente al eje aleatorio por animación anterior. La amplitud
    // fija 0.12 ≈ la distancia típica hogar↔ancla (anclas cercanas por
    // diseño, ver nearestStable/pickAnchorNear).
    const animAxisHash = fract(
      sin(aHome.mul(127.1).add(vec3(aAnim.x.mul(311.7), aAnim.x.add(1).mul(74.7), aAnim.x.mul(269.5).add(19.19)))).mul(43758.5453),
    ).mul(2.0).sub(1.0);
    // En una DIVISIÓN (tipo 2) el eje no puede ser al azar: es la línea
    // madre→hija. Con el eje por hash la hija aparecía a tamaño completo
    // en una dirección arbitraria y se deslizaba a su sitio — se leía
    // como "aparece una bola nueva", no como una célula partiéndose, que
    // es justo lo que se reportó ("no hace la división celular entre la
    // 1 hacia la 2"). El eje real viaja en aJellyAxisAmp.xyz, que está
    // libre durante el nacimiento (el jelly sólo se dispara al cambiar
    // de nivel, y su amplitud .w se deja en 0 para esa célula), así que
    // no cuesta un séptimo buffer instanciado — el presupuesto de
    // WebGPU sigue clavado en 8.
    const birthAxis = aJellyAxisAmp.xyz;
    const animAxisRaw = animAxisHash.mul(w3).add(birthAxis.mul(w2));
    const animAxisN = animAxisRaw.div(animAxisRaw.length().max(0.0001));
    // La amplitud del nacimiento es la DISTANCIA REAL madre→hija, no un
    // 0.12 fijo. Con la amplitud fija la hija arrancaba a 12 centésimas
    // de su propio hogar en dirección a la madre: si la madre estaba más
    // lejos, la hija seguía naciendo en mitad de la nada — el "aparecen
    // de la nada las partículas" que se reportó. Con la distancia real
    // arranca PEGADA a la madre y viaja hasta su sitio. Viaja en
    // aJellyAxisAmp.w, que es seguro porque el jelly está apagado
    // mientras aSpring.w (su t0) siga en -1e9: exp(-decay·enorme) = 0.
    const animAmp = w2.mul(aJellyAxisAmp.w).add(w3.mul(0.12));
    const animAxis = animAxisN.mul(animAmp);
    const homeOffset = animAxis.mul(w2.mul(oneAnimT).add(w3.mul(animT)));
    const animStretch = sinPiT.mul(w2.add(w3)).mul(aAnim.z);
    const animDeform = animAxisN.mul(dot(positionLocal, animAxisN)).mul(animStretch);
    const animWobbleBoost = sinPiT.mul(w2.add(w3)).mul(aAnim.w);
    // Wobble de membrana (soft-body fake) — las frecuencias espaciales
    // (×20/×15) están escaladas al radio del cubo (0.032) para el mismo
    // número de ondas por superficie que en el lab (×4/×3 a radio 0.16).
    const wobble = sin(time.mul(L.wobbleFreq).add(instancePhase.mul(3.7)).add(positionLocal.y.mul(20.0)))
      .add(sin(time.mul(L.wobbleFreq * 1.7).add(instancePhase.mul(2.3)).add(positionLocal.x.mul(15.0))).mul(0.5))
      .mul(L.wobbleAmp * 0.032)
      .mul(uMotionScale)
      .mul(animWobbleBoost.add(1));
    return positionLocal
      .add(normalGeometry.mul(wobble))
      .add(jellyDeform)
      .add(animDeform)
      .mul(aScale.mul(animScale))
      .add(aHome)
      .add(homeOffset)
      .add(drift)
      .add(springOffset);
  })();

  // Fragment: el look CLÁSICO del cubo de luz (restaurado 2026-07-26
  // por decisión del usuario: "estaba mejor lo que tenía antes"). Es el
  // colorNode anterior a F1.4a — color × (piso + rim glow) × pulse —
  // con dos adaptaciones de la arquitectura nueva: la ganancia
  // foco/highlight viaja pre-multiplicada en UN float (aColorGain.a =
  // focus·(1+highlight·1.2), calculado en recomputeHighlights) y el
  // apagado de fusión celular (emissiveAnim) se conserva. El port
  // líquido con PMREM (fresnel/env/iridiscencia) se retira: lavaba los
  // colores de dominio, costaba 2 muestras de textura por fragmento
  // (el costo grande a 25k) y no reflejaba la visión del usuario. El
  // material/vertex (wobble, jelly, resortes, curl noise) NO cambia.
  material.colorNode = Fn(() => {
    const n = normalWorld.normalize();
    const v = cameraPosition.sub(positionWorld).normalize();
    const ndv = dot(n, v).abs().clamp(0, 1);
    const fresnel = pow(float(1.0).sub(ndv), float(L.fresnelPower));

    // Cuerpo: albedo oscurecido + ambiente + wrap backlight (SSS falso).
    const wrap = dot(n, uLightDir).mul(0.5).add(0.5);
    const body = aBody.mul(float(L.ambient).add(wrap.mul(float(L.sssStrength))));

    // Transmisión SIN muestra de textura — y ésta es la diferencia
    // deliberada con el lab. En el lab se muestrea el PMREM por la
    // normal refractada; aquí eso costaba la SEGUNDA muestra por
    // fragmento (la queja de coste a 25k del rechazo anterior) y, peor,
    // metía el blanco brillante del RoomEnvironment justo en el CENTRO
    // de la célula, que es lo que lavaba los tonos de dominio. Aquí el
    // color ES el dato (hue = dominio semántico), no decoración como en
    // el lab, así que la luz que "atraviesa" sale teñida sólo por el
    // color propio: misma lectura de ventana acuosa, cero desaturación,
    // una muestra menos.
    const transmit = instanceColor.mul(float(L.transmit)).mul(pow(ndv, float(1.5)));

    // ÚNICA muestra PMREM, confinada al rim por el fresnel: espejo en el
    // borde, ventana en el centro — como una gota real.
    const reflection = pmremTexture(options.envMap, equirectUV(reflect(v.negate(), n)), float(L.envReflBlur))
      .mul(fresnel)
      .mul(float(L.envReflect));

    // Iridiscencia angular cian→magenta→dorado, confinada al rim para
    // no lavar el núcleo.
    const iridT = fract(float(1.0).sub(ndv).add(time.mul(L.iridescenceSpeed)));
    const iridescence = mix(
      mix(vec3(0.15, 0.85, 0.95), vec3(0.9, 0.25, 0.85), smoothstep(float(0.0), float(0.5), iridT)),
      vec3(1.0, 0.78, 0.28),
      smoothstep(float(0.5), float(1.0), iridT),
    )
      .mul(fresnel)
      .mul(float(L.iridescenceStrength));

    // Especular duro y chico: el punto de luz de una superficie húmeda.
    const halfDir = uLightDir.add(v).normalize();
    const specular = pow(dot(n, halfDir).max(0.0), float(L.specularPower)).mul(float(L.specularStrength));

    // Núcleo bioluminiscente desplazado del centro. coreFalloff 8.0 (no
    // 2.2) es EL arreglo: con 2.2 el núcleo bañaba todo el hemisferio y
    // la célula se leía como un borrón encendido — exactamente el "se
    // ven raro" que hundió el port anterior (git a0194bc). Con 8.0 el
    // hotspot se concentra y vuelve a parecer una gota con un punto de
    // luz dentro.
    const objN = varying(normalGeometry, "vCubeObjN").normalize();
    const coreMask = pow(dot(objN, uCoreDir).mul(0.5).add(0.5).clamp(0, 1), float(L.coreFalloff));
    const breath = sin(time.mul(L.breathSpeed).add(instancePhase)).mul(L.breathAmp).add(1.0);
    const pulse = float(0.75).add(float(0.16).mul(sin(time.mul(1.6).add(instancePhase))));
    // En fusión el brillo se apaga con el progreso (la célula "muere"
    // dentro de la que se la come — no un corte seco).
    const wFuse = float(1).sub(aAnim.x.sub(3).abs().min(1));
    const emissiveAnim = float(1).sub(wFuse.mul(aAnim.y));
    const emissive = instanceColor
      .mul(float(L.baseGlow).add(coreMask.mul(L.coreEmissive)))
      .mul(breath)
      .mul(pulse)
      .mul(emissiveAnim);

    // aGain = focus·(1+highlight·1.2), pre-multiplicada en CPU: la
    // búsqueda y el hover siguen funcionando igual sobre el look nuevo.
    return vec3(body.add(transmit).add(reflection).add(iridescence).add(vec3(specular)).add(emissive)).mul(aGain);
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
    // La ganancia viaja pre-multiplicada en aColorGain.a (ver colorNode):
    // highlight 0 → ganancia = focus (dim o 1); highlight h → focus·(1+h·1.2).
    for (let i = 0; i < CAPACITY; i++) colorGainAttr[i * 4 + 3] = dim;
    const nowFocused = active ? new Set(searchIds) : null;
    for (const id of searchIds) {
      // 0.55 -> 1.05: reportado en vivo ("falta más intensidad") — con
      // el piso 0.18 + rim, 0.55 dejaba una coincidencia apenas por
      // encima de las partículas normales (glow~0.7-1.3x según ángulo,
      // igual de discreto que el resto del cubo). 1.05 la separa con
      // claridad incluso de frente (glow~1.2-1.8x) sin llegar a
      // quemarse contra el pulso (pulse máx ~0.91).
      colorGainAttr[id * 4 + 3] = 1 + 1.05 * 1.2;
    }
    if (pointerId !== null) {
      // focus del cursor es siempre 1 (activo o no — ver el código
      // anterior): ganancia = 1+1.6·1.2 en ambos casos.
      colorGainAttr[pointerId * 4 + 3] = 1 + 1.6 * 1.2;
      if (active) {
        nowFocused?.add(pointerId);
      }
    }
    focusedIds = nowFocused;
    colorGainAttribute.needsUpdate = true;

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
      springAttr[id * 4] = 0;
      springAttr[id * 4 + 1] = 0;
      springAttr[id * 4 + 2] = 0;
    }
    const pinned = concepts[pinnedInstanceId].coords;
    springOwnerIds = [];
    for (const { instanceId, score } of neighbors) {
      const c = concepts[instanceId].coords;
      // rest-length ∝ distancia coseno: el desplazamiento es la
      // fracción `strength·score` del vector hacia el fijado — más
      // similar (score alto) = termina más cerca.
      const k = L.springStrength * Math.max(0, Math.min(1, score));
      springAttr[instanceId * 4] = (pinned[0] - c[0]) * k;
      springAttr[instanceId * 4 + 1] = (pinned[1] - c[1]) * k;
      springAttr[instanceId * 4 + 2] = (pinned[2] - c[2]) * k;
      springOwnerIds.push(instanceId);
    }
    springAttribute.needsUpdate = true;
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
    springAttr[instanceId * 4 + 3] = fieldTime;
    jellyAxisAmpAttribute.needsUpdate = true;
    springAttribute.needsUpdate = true;
  }

  // Picking manual ray-esfera (reemplazo del raycast contra el
  // InstancedMesh — su instanceMatrix eran 4 vertex buffers que ya no
  // caben). Itera sólo slots REALES visibles: 25k tests por evento de
  // pointer son sub-ms. La deriva curl (amp 0.008) se ignora a propósito:
  // es muy por debajo del padding del radio.
  const pickRay = new THREE.Ray();
  const pickInvMatrix = new THREE.Matrix4();

  function pickInstanceAtRay(raycaster: THREE.Raycaster, onlyIds?: Set<number> | null): number | null {
    // El rayo llega en espacio mundo y las posiciones CPU están en
    // espacio local del mesh (dentro de `group`) — se transforma el
    // rayo, no las 25k instancias.
    pickRay.copy(raycaster.ray).applyMatrix4(pickInvMatrix.copy(mesh.matrixWorld).invert());
    const ox = pickRay.origin.x;
    const oy = pickRay.origin.y;
    const oz = pickRay.origin.z;
    const dx = pickRay.direction.x;
    const dy = pickRay.direction.y;
    const dz = pickRay.direction.z;
    const springEase = uSpringEase.value as number;
    let best = -1;
    let bestT = Infinity;
    const consider = (id: number) => {
      const scale = scaleArray[id];
      if (scale <= 1e-3) return; // oculta por filtro/reveal/morph
      // Centro = hogar PCA + resorte activo (si hay) — la misma base
      // sobre la que el vertex shader suma deriva/deformes menores.
      const cx = posArray[id * 3] + springAttr[id * 4] * springEase;
      const cy = posArray[id * 3 + 1] + springAttr[id * 4 + 1] * springEase;
      const cz = posArray[id * 3 + 2] + springAttr[id * 4 + 2] * springEase;
      const r = 0.032 * scale * 1.4; // radio base × escala visible × padding
      const ocx = ox - cx;
      const ocy = oy - cy;
      const ocz = oz - cz;
      const b = ocx * dx + ocy * dy + ocz * dz;
      const c = ocx * ocx + ocy * ocy + ocz * ocz - r * r;
      const disc = b * b - c;
      if (disc < 0) return;
      const sq = Math.sqrt(disc);
      let t = -b - sq;
      if (t < 0) t = -b + sq; // origen del rayo dentro de la esfera
      if (t < 0 || t >= bestT) return;
      bestT = t;
      best = id;
    };
    if (onlyIds) {
      for (const id of onlyIds) if (id < realCount) consider(id);
    } else {
      for (let id = 0; id < realCount; id++) consider(id);
    }
    return best === -1 ? null : best;
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
    pickInstanceAtRay,
    setPartOfSpeechFilter,
    revealProgressively,
    growCellularBoot,
    setBootGrowthProgress,
    visibleCellCount: countRealVisible,
    setTeachingSet,
    visibleBounds,
    morphToPartOfSpeechFilter,
    estimateMorphDuration,
    setSimilarityLines,
    setChainLines,
    setSprings,
    clearSprings,
    jellyPulse,
    tick,
    setPopulationScale,
    isAnimating,
  };
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
