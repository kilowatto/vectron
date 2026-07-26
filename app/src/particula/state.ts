import * as THREE from "three/webgpu";
import { createHeroParticle, createDrift, nextColor, bodyColorOf, mutateHue, type DriftParams } from "./heroParticle";
import { createInstancedField, INSTANCE_RADIUS, type InstancedField } from "./instancedField";
import { createLiquidField, LIQUID_ANIM, type LiquidField } from "./liquidParticle";
import { BIRTH_VARIANTS } from "./animations/birth";
import { DIVISION_VARIANTS } from "./animations/division";
import { UNION_VARIANTS } from "./animations/union";
import { DEATH_VARIANTS } from "./animations/death";
import { CONNECTOR_STYLES, type Connector } from "./connectorLines";
import { tween, type Animation } from "./effects";
import { easeInOutCubic } from "./easing";
import { DEFAULT_CONFIG, type LiquidConfig } from "./particulaConfig";

/** Sólo necesitamos `target` de OrbitControls aquí — un tipo mínimo
 * evita acoplar state.ts al import del addon completo sólo por
 * tipado. */
interface CameraRig {
  target: THREE.Vector3;
}

/** Factor sobre la SUMA de radios que cuenta como "demasiado cerca" —
 * una sola constante compartida por el reintento al crear
 * (`startDivide`'s retry) y por la relajación continua (`declump`) en
 * vez de dos números afinados por separado, precisamente porque dos
 * copias de la misma idea desincronizándose ya causó bugs reales en
 * esta sesión (ver comentario de DEFAULT_CONFIG.material). >1 deja un
 * margen sobre "apenas tocándose" para que el jitter browniano no
 * las haga rozarse visiblemente. */
const MIN_SEPARATION_FACTOR = 1.15;

/** Deformación sutil hacia una silueta tipo "cerebro" — pedido
 * explícito del usuario ("que esta nube se vaya formando un cerebro,
 * que sea sutil... que se vaya llenando en lugar de la esfera").
 * `BRAIN_RAMP_START` es dónde la fuerza empieza en 0 (la nube sigue
 * viéndose como la esfera/nube de siempre hasta ahí); crece hasta el
 * máximo pasadas `BRAIN_RAMP_RANGE` partículas más, así el cambio es
 * gradual con el crecimiento del lote, no un salto. Ver `declump`. */
const BRAIN_RAMP_START = 500;
const BRAIN_RAMP_RANGE = 700;

/** A partir de este conteo, las partículas NUEVAS (nacer/dividir/unir)
 * dejan de crearse como malla PBR individual y pasan al nivel
 * instanciado (ver instancedField.ts) — pedido explícito del usuario
 * ("quiero ver qué pasa si tenemos 25000"): cada malla PBR individual
 * (SphereGeometry 64×64 + MeshPhysicalMaterial propio) es carísima de
 * verdad, así que a partir de aquí no hay animación de mitosis/fusión.
 * Subido de 500 a 2000 — bug real reportado en vivo ("se perdió el
 * efecto de división de célula"): 500 coincidía con
 * `BRAIN_RAMP_START` por "simetría", pero en la práctica cualquier
 * lote normal (el rango que ya se sabía seguro con mallas
 * individuales desde ANTES de que existiera este nivel instanciado)
 * terminaba saltándose la animación que el usuario específicamente
 * pidió y quería seguir viendo. 2000 es el mismo límite que ya se
 * había probado seguro con mallas individuales — el nivel instanciado
 * ahora sólo entra en juego para la escala de verdad extrema (miles,
 * hasta 25,000) que motivó pedirlo, no para el uso normal. Deliberadamente
 * DESACOPLADO de `BRAIN_RAMP_START` (que se queda en 500, ya validado
 * y confirmado que gustó) — son 2 efectos independientes, no hay
 * razón para que compartan el mismo número. */
const INSTANCE_THRESHOLD = 2000;
/** Tope real del pool de instancias — debe alcanzar
 * `DEFAULT_CONFIG.batch.targetMax` (ver particulaConfig.ts). Un
 * InstancedMesh necesita su capacidad fija desde que se crea. */
const INSTANCE_CAPACITY = 25000;

/** Probabilidad, por hija, de que en vez de mutar el tono del padre
 * (la deriva sutil ya pedida) reciba un color totalmente nuevo de la
 * paleta — bug real reportado en vivo ("no hay muchos colores"): una
 * sola caminata de tono, sin importar cuánto se le suba el grado de
 * mutación, sigue siendo UNA familia de tonos derivando junta; nunca
 * produce la variedad "muchos colores por categoría" del cubo real.
 * Un salto ocasional a un color fresco de la paleta introduce nuevas
 * "ramas" de color dentro de la misma nube, sin que la mayoría de las
 * divisiones deje de verse como una deriva sutil (pedido explícito
 * también, "sutil" — por eso la probabilidad es baja, no cada vez). */
const COLOR_JUMP_PROBABILITY = 0.05;

/** 14 offsets (la propia celda + 13 "hacia adelante" de las 26
 * vecinas), no las 27 completas — bug de rendimiento real medido en
 * vivo con 25,000 partículas: 27 vecinas por partícula visita cada
 * PAR de celdas dos veces (una desde cada lado), duplicando el
 * trabajo. Cada offset distinto de cero tiene un opuesto exacto
 * (`(dx,dy,dz)` y `(-dx,-dy,-dz)`); quedarse sólo con el "positivo" en
 * orden lexicográfico (dz>0, o dz=0&&dy>0, o dz=dy=0&&dx>0) cubre cada
 * PAR de celdas una sola vez sin perder ninguna pareja de partículas
 * — el filtro `b<=a` de siempre sigue haciendo falta sólo para la
 * propia celda (offset 0,0,0, siempre el primero de la lista), donde
 * ambos siguen siendo el mismo array. Aplanado a un solo Int8Array
 * (3 números por offset) en vez de un array de tuplas — desestructurar
 * `[dx,dy,dz]` 25,000×14 veces por cuadro también se notó en vivo. */
const NEIGHBOR_CELL_OFFSETS: Int8Array = (() => {
  const offsets: number[] = [0, 0, 0];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        if (dz > 0 || (dz === 0 && dy > 0) || (dz === 0 && dy === 0 && dx > 0)) {
          offsets.push(dx, dy, dz);
        }
      }
    }
  }
  return new Int8Array(offsets);
})();
const NEIGHBOR_OFFSET_COUNT = NEIGHBOR_CELL_OFFSETS.length / 3;

/** Aplica UNA VEZ (al crear la partícula, nunca cuadro a cuadro — ver
 * el comentario largo en `declump`) la anisotropía que le da su
 * silueta a la nube: aplana un poco verticalmente (más abajo que
 * arriba, como la base/tallo del cerebro), elonga en Z (lóbulos
 * frontal/occipital) y, en la mitad de arriba, hunde una hendidura
 * angosta centrada en x=0 (la fisura entre "hemisferios"). Recibe y
 * devuelve una dirección UNITARIA — la escala real de cada partícula
 * la sigue gobernando sólo la física de anti-encimado. */
function computeBrainDir(dir: THREE.Vector3): THREE.Vector3 {
  let shapeY = dir.y * (dir.y >= 0 ? 0.92 : 0.7);
  const shapeZ = dir.z * 1.18;
  const shapeX = dir.x;
  // Hendidura sagital: una fisura real es un HUNDIMIENTO EN ALTURA a
  // lo largo de la línea media (x≈0), no una falta de partículas en
  // x. Bug real encontrado antes de deployar (verificado contando
  // partículas por bin de x): reducir `shapeX` cerca del centro no
  // aparta nada — para una partícula ya casi centrada, `dirX` es
  // pequeño, así que encogerlo más apenas cambia su objetivo, y el
  // resultado medido fue un PICO de densidad en x=0, lo opuesto a una
  // hendidura. Reducir `shapeY` (la altura) cerca de x≈0 sí hunde esa
  // franja central hacia abajo, dejando dos lomas más altas a los
  // lados — el perfil real de una fisura entre hemisferios.
  if (dir.y > 0) {
    const groove = 1 - 0.35 * Math.exp(-(dir.x * dir.x) / (2 * 0.22 * 0.22));
    shapeY *= groove;
  }
  const shaped = new THREE.Vector3(shapeX, shapeY, shapeZ);
  return shaped.lengthSq() > 1e-12 ? shaped.normalize() : dir.clone();
}

/** `BirthVariant` no recibe un `onDone` explícito en su firma (a
 * diferencia de división/unión/muerte) porque no necesita decidir
 * CUÁNDO remover nada de la escena — sólo revela una malla que ya
 * existe. Este wrapper detecta el momento en que `update()` pasa de
 * `true` a `false` para saber cuándo la animación de verdad terminó,
 * sin llamar a la variante dos veces ni asumir que es una Promise. */
function onFinish(anim: Animation, onDone: () => void): Animation {
  let fired = false;
  return {
    update(dt) {
      const alive = anim.update(dt);
      if (!alive && !fired) {
        fired = true;
        onDone();
      }
      return alive;
    },
  };
}

export interface BatchOptions {
  mode: "dividir" | "unir";
  variantKey: string;
  targetCount: number;
  duration: number;
  maxConcurrent: number;
  staggerSeconds: number;
  autoReframe: boolean;
}

export interface BatchStatus {
  active: boolean;
  mode: "dividir" | "unir";
  count: number;
  target: number;
  inFlight: number;
}

/** Exactamente UNA de `mesh`/`instanceSlot` está poblada — cuál,
 * depende de en qué nivel se creó la partícula (ver
 * `INSTANCE_THRESHOLD`): `mesh` es una malla PBR propia (nivel
 * individual, pocas partículas, la que ya existía toda la sesión);
 * `instanceSlot` es un índice dentro del `InstancedMesh` compartido
 * (nivel instanciado, agregado para soportar miles). Sacar
 * `baseColor`/`baseRadius`/`drift` de `mesh.userData` a campos propios
 * aquí (antes vivían sólo ahí) es lo que permite que ambos niveles
 * comparen la misma metadata sin que el nivel instanciado necesite un
 * `THREE.Object3D` para nada. */
export interface ParticleRecord {
  id: number;
  mesh: THREE.Mesh | null;
  instanceSlot: number | null;
  baseColor: number;
  baseRadius: number;
  drift: DriftParams;
  /** Dirección unitaria fija hacia la silueta de cerebro — ver
   * `computeBrainDir`; se asigna una sola vez, la primera vez que
   * `declump` procesa la partícula (nunca al crearla, porque la
   * posición de reposo definitiva a veces sólo se conoce al terminar
   * una animación). */
  brainDir: THREE.Vector3 | null;
  /** Posición de reposo — el deriva browniano oscila ALREDEDOR de
   * esto, nunca reemplaza la posición "real" de la partícula. Se
   * actualiza sólo cuando una animación termina y la partícula queda
   * quieta en su lugar definitivo (ver `lockedIds` en la clase). */
  home: THREE.Vector3;
  /** Última posición RENDERIZADA (home + deriva browniano de este
   * cuadro) — única fuente de verdad para "dónde está esta partícula
   * ahora mismo" en vez de `mesh.position` (que no existe para
   * partículas instanciadas). Se actualiza una vez por cuadro en
   * `tick()`. */
  renderPos: THREE.Vector3;
}

/** Estado central del playground — main.ts sólo llama a estos métodos
 * desde los botones y a `tick(dt)` cada cuadro; toda la lógica de
 * "qué partícula, a dónde, con qué variante" vive aquí, no en la UI.
 *
 * Modelo de selección (pedido explícito del usuario, "ambas"): un
 * clic en una partícula la selecciona (`select`); si no hay ninguna
 * seleccionada, las acciones caen sobre la más reciente
 * (`mostRecentId`). `targetId()` resuelve esa prioridad una sola vez. */
export class ParticulaState {
  private particles = new Map<number, ParticleRecord>();
  private nextId = 1;
  private selectedId: number | null = null;
  private mostRecentId: number | null = null;
  private activeAnimations: Animation[] = [];
  private busy = false;
  private connector: Connector | null = null;
  private connectorStyleKey = "sinapsis";
  private connectorEnabled = false;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: CameraRig | null = null;
  private cameraTween: Animation | null = null;
  /** Pool del nivel instanciado (ver INSTANCE_THRESHOLD) — se crea
   * perezosamente, la primera vez que de verdad hace falta (nunca si
   * el usuario se queda siempre por debajo del umbral). `slotOwners`
   * es el mapeo inverso índice→partícula, necesario para el patrón
   * "swap con el último y quitar" al liberar un slot (mantiene el
   * rango activo [0, activeCount) siempre contiguo, sin huecos, para
   * que `InstancedMesh.count` sea suficiente para esconder el resto). */
  private instancedField: InstancedField | null = null;
  private instanceActiveCount = 0;
  private slotOwners: ParticleRecord[] = [];
  /** Estilo de partícula activo — "hero" (los dos niveles de siempre:
   * malla PBR individual / instanciado básico por INSTANCE_THRESHOLD,
   * INTACTOS como referencia) o "liquid" (liquidParticle.ts: UN solo
   * InstancedMesh con shader TSL custom a cualquier N — la partícula
   * F1 de DOCs/21 §4). En modo liquid TODAS las rutas de creación que
   * antes iban al nivel instanciado van al campo líquido (ver
   * isInstancedTier/registerInstanced), así que no hay umbral ni swap
   * de identidad visual en ningún conteo. */
  private particleStyle: "hero" | "liquid" = "hero";
  private liquidField: LiquidField | null = null;
  private liquidActiveCount = 0;
  private liquidSlotOwners: ParticleRecord[] = [];
  private liquidEnv: THREE.Texture | null = null;
  private liquidLook: LiquidConfig = DEFAULT_CONFIG.liquid;
  // Multiplicadores GLOBALES sobre la frecuencia/amplitud propia de
  // cada partícula — pedido explícito del usuario ("pon un slider
  // para configurar la velocidad y la intensidad del movimiento").
  private movementSpeed = DEFAULT_CONFIG.movement.speedDefault;
  private movementIntensity = DEFAULT_CONFIG.movement.intensityDefault;
  // Grados máximos de mutación de tono por división — ver comentario
  // en `startDivide` y en DEFAULT_CONFIG.color.mutationDeg.
  private mutationDeg = DEFAULT_CONFIG.color.mutationDeg;
  private time = 0;
  /** Buffers reutilizados entre cuadros por `declump` — evita
   * reasignar arrays nuevos (y objetos `THREE.Vector3` de empuje) cada
   * cuadro; sólo se reasignan si `n` crece más allá de la capacidad
   * actual. */
  private declumpScratch: {
    capacity: number;
    homeRefs: THREE.Vector3[];
    px: Float64Array;
    py: Float64Array;
    pz: Float64Array;
    r: Float64Array;
    brainDirX: Float64Array;
    brainDirY: Float64Array;
    brainDirZ: Float64Array;
    pushX: Float64Array;
    pushY: Float64Array;
    pushZ: Float64Array;
  } | null = null;
  /** ids cuya posición está siendo manejada por completo por una
   * animación activa (nacer/dividir) — el deriva browniano las salta
   * para no pelearse cuadro a cuadro con el tween que las mueve. No
   * hace falta para unión/muerte: esas partículas ya se desregistran
   * ANTES de arrancar la variante, así que `tick()` nunca las toca. */
  private lockedIds = new Set<number>();

  // Animación masiva ("dividir o unir mil de golpe") — pedido
  // explícito del usuario. `batchInFlight` cuenta cuántas operaciones
  // individuales están animándose AHORA (no cuántas se han lanzado en
  // total); `tick()` sólo lanza una oleada nueva cuando hay cupo
  // (< maxConcurrent) Y ya pasó `staggerSeconds` desde la última.
  private batchActive = false;
  private batchOpts: BatchOptions | null = null;
  private batchInFlight = 0;
  private batchWaveTimer = 0;
  private batchReframeTimer = 0;

  onChange: () => void = () => {};

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** main.ts llama esto una sola vez tras crear el engine — sin esto
   * `reframe()` no tiene nada que mover y se queda callado (no
   * truena, simplemente no hace nada). */
  attachCamera(camera: THREE.PerspectiveCamera, controls: CameraRig) {
    this.camera = camera;
    this.controls = controls;
  }

  /** Pedido explícito del usuario tras probarlo en vivo ("le puse
   * nacer y si nace pero no se mueve la cámara para verlo nacer...
   * debería alejarse un poco y centrar"): cada acción reencuadra la
   * cámara hacia donde van a terminar TODAS las partículas (las que
   * ya estaban + la(s) nueva(s)), no sólo la que cambió — nacer se
   * aleja para que la partícula nueva entre en cuadro, morir se
   * acerca de vuelta conforme quedan menos. Corre en paralelo a la
   * animación de la propia acción (misma duración fija, 0.75s,
   * independiente del slider de duración — el reencuadre es "cámara
   * poniéndose al día", no parte de la animación que se está
   * afinando). */
  private reframe(positions: THREE.Vector3[]) {
    if (!this.camera || !this.controls || positions.length === 0) return;
    const centroid = new THREE.Vector3();
    positions.forEach((p) => centroid.add(p));
    centroid.divideScalar(positions.length);
    let maxDist = 0;
    positions.forEach((p) => {
      maxDist = Math.max(maxDist, p.distanceTo(centroid));
    });
    const boundingRadius = maxDist + 0.45; // radio real de la partícula (0.32) + margen
    const fovRad = (this.camera.fov * Math.PI) / 180;
    // Tope subido de 5.5 a 25, y luego a 130 — bug real reportado en
    // vivo ("no hace zoom out para poder ver todo") con apenas 267
    // partículas: medido con el stepper determinístico, un lote de
    // 267 ya llega a boundingRadius~3.8 (desiredDistance~12), uno de
    // 2000 a ~6.15 (desiredDistance~20). Subido de nuevo para soportar
    // el nivel instanciado (ver INSTANCE_THRESHOLD, pedido explícito
    // "quiero ver qué pasa si tenemos 25000") — deja margen bajo
    // `controlsMaxDistance`/`cameraFar` de SceneOverrides en
    // particula/main.ts (ver scene/engine.ts).
    const desiredDistance = THREE.MathUtils.clamp((boundingRadius / Math.tan(fovRad / 2)) * 1.5, 0.9, 130);

    const startTarget = this.controls.target.clone();
    const startCamPos = this.camera.position.clone();
    const dir = startCamPos.clone().sub(startTarget);
    const dirNorm = dir.lengthSq() > 0.0001 ? dir.normalize() : new THREE.Vector3(0.5, 0.35, 0.8).normalize();
    const endTarget = centroid;
    const endCamPos = endTarget.clone().addScaledVector(dirNorm, desiredDistance);

    this.cameraTween = tween(0.75, easeInOutCubic, (eased) => {
      this.controls!.target.lerpVectors(startTarget, endTarget, eased);
      this.camera!.position.lerpVectors(startCamPos, endCamPos, eased);
    });
  }

  private otherPositions(excludeIds: number[]): THREE.Vector3[] {
    const exclude = new Set(excludeIds);
    return Array.from(this.particles.values())
      .filter((rec) => !exclude.has(rec.id))
      .map((rec) => rec.renderPos.clone());
  }

  targetId(): number | null {
    if (this.selectedId !== null && this.particles.has(this.selectedId)) return this.selectedId;
    if (this.mostRecentId !== null && this.particles.has(this.mostRecentId)) return this.mostRecentId;
    const first = this.particles.keys().next();
    return first.done ? null : first.value;
  }

  select(id: number | null) {
    this.selectedId = id;
    this.onChange();
  }

  getSelectedId(): number | null {
    return this.selectedId;
  }

  count(): number {
    return this.particles.size;
  }

  /** Sólo las partículas del nivel INDIVIDUAL — las del nivel
   * instanciado no son mallas propias (ver ParticleRecord), así que no
   * pueden aparecer en un raycast de selección por clic (main.ts's
   * `raycaster.intersectObjects(state.meshes())`). Es una limitación de
   * alcance aceptada a propósito: la selección/edición de color de UNA
   * partícula sigue siendo del nivel individual (pocas, interactivas);
   * el nivel instanciado es para ver el comportamiento/forma/
   * rendimiento a escala, no para manipular una por una. */
  meshes(): THREE.Mesh[] {
    const result: THREE.Mesh[] = [];
    for (const rec of this.particles.values()) {
      if (rec.mesh) result.push(rec.mesh);
    }
    // En modo líquido la única malla es el InstancedMesh compartido —
    // el raycast sí puede pegarle (las matrices de instancia se
    // escriben en setSlot para esto); el pick resuelve la partícula
    // por instanceId vía `particleIdAtSlot`.
    if (this.liquidField) result.push(this.liquidField.mesh);
    return result;
  }

  /** instanceId del raycast → id de partícula (sólo modo líquido). */
  particleIdAtSlot(slot: number): number | null {
    return this.liquidSlotOwners[slot]?.id ?? null;
  }

  /** `pendingNet` es el cambio neto en `this.particles.size` que la
   * llamada está a punto de causar cuando se evalúa (ver cada sitio de
   * llamada) — bug real medido en vivo con un lote de exactamente 2000
   * (el mismo número que `INSTANCE_THRESHOLD`): los 3 llamadores
   * comparaban el conteo ANTES de terminar su propia operación contra
   * el umbral, nunca el conteo FINAL resultante. En una división neta
   * (quita 1, agrega 2 = +1) el conteo leído en el momento del chequeo
   * es el de ANTES de quitar al padre — para la división que lleva de
   * 1999 a 2000, ese chequeo ve 1999 (< 2000) y crea las 2 hijas como
   * individuales, así que un lote apuntado exactamente a 2000 terminaba
   * con las 2000 partículas en el nivel INDIVIDUAL (mallas PBR
   * completas) — exactamente el escenario que esta función existe para
   * evitar (ver el comentario de `INSTANCE_THRESHOLD`: "a 2000+ ya se
   * medía en vivo cerca de colgar la pestaña"). Pasando el neto (+1 en
   * los 3 sitios: nacer, dividir, y unir — este último ya resta A/B
   * ANTES de chequear, así que el conteo leído ahí ya es el de después
   * de quitarlas, y sólo falta sumar la resultante) el chequeo compara
   * contra el conteo REAL que va a quedar, no uno transitorio a medio
   * aplicar. */
  private isInstancedTier(pendingNet: number = 0): boolean {
    // Modo líquido: TODO se renderiza en el campo líquido instanciado a
    // cualquier conteo (ver `particleStyle`) — es lo que hace que el
    // look sea IDÉNTICO con 1, 50, 500 o 2000+, sin el acantilado de
    // INSTANCE_THRESHOLD.
    if (this.particleStyle === "liquid") return true;
    // Bug real medido en vivo (ver también `convertAllToInstanced` /
    // `startBatch`): arreglar sólo el conteo transitorio (`pendingNet`,
    // arriba) no bastaba. Un lote de "dividir en masa" apuntado a 2000
    // arranca de 1 partícula y CRECE de a 1 por división — para
    // CUALQUIER división mientras el conteo total siga muy por debajo
    // del umbral (que es la inmensa mayoría de las ~1999 divisiones
    // necesarias), este chequeo sigue dando individual, sin importar
    // que el LOTE ENTERO ya sepa de antemano que va a terminar muy por
    // encima. Verificado en vivo: incluso convirtiendo la población YA
    // existente al arrancar el lote, la PRIMERISIMA división de ahí en
    // adelante volvía a crear hijas individuales (conteo aún bajo),
    // deshaciendo la conversión al toque. Si hay un lote "dividir"
    // activo apuntado a `targetCount >= INSTANCE_THRESHOLD`, TODA
    // división nueva durante ese lote es instanciada sin importar el
    // conteo transitorio — es la única forma de que la población nunca
    // pase, ni de refilón, por el nivel individual caro a esta escala.
    if (this.batchActive && this.batchOpts?.mode === "dividir" && this.batchOpts.targetCount >= INSTANCE_THRESHOLD) {
      return true;
    }
    return this.particles.size + pendingNet >= INSTANCE_THRESHOLD;
  }

  private ensureInstancedField(): InstancedField {
    if (!this.instancedField) {
      this.instancedField = createInstancedField(this.scene, INSTANCE_CAPACITY);
    }
    return this.instancedField;
  }

  /** Env PMREM compartido + bloque `liquid` de la config — main.ts lo
   * llama una sola vez tras crear el engine (misma textura que ya usa
   * la hero vía ensureEnvironment). */
  attachLiquidSupport(envMap: THREE.Texture, look: LiquidConfig) {
    this.liquidEnv = envMap;
    this.liquidLook = look;
    if (this.liquidField) this.liquidField.setLook(look);
  }

  /** Cambia el estilo de partícula convirtiendo TODA la población
   * existente (conserva ids, colores, homes, selección) — la hero
   * clásica nunca se destruye como opción, sólo se cambia cómo se
   * renderiza lo que ya hay. Bloqueado mientras hay animaciones o un
   * lote en curso (convertir a media animación dispondría mallas que
   * una variante sigue usando). */
  setParticleStyle(style: "hero" | "liquid") {
    if (style === this.particleStyle) return;
    if (this.busy || this.batchActive) return;
    this.particleStyle = style;
    this.convertAllForStyle();
    this.onChange();
  }

  getParticleStyle(): "hero" | "liquid" {
    return this.particleStyle;
  }

  applyLiquidLook(look: LiquidConfig) {
    this.liquidLook = look;
    if (this.liquidField) this.liquidField.setLook(look);
  }

  private ensureLiquidField(): LiquidField {
    if (!this.liquidField) {
      this.liquidField = createLiquidField(this.scene, this.liquidEnv!, this.liquidLook, INSTANCE_CAPACITY);
      this.liquidField.setMovement(this.movementSpeed, this.movementIntensity);
    }
    return this.liquidField;
  }

  /** Conversión de una sola vez al cambiar de estilo — misma filosofía
   * que `convertAllToInstanced` (mismos ids, sólo cambia CÓMO se
   * renderiza), pero entre estilos completos: dispone el pool que sale
   * y registra a todas en el que entra. */
  private convertAllForStyle() {
    const records = Array.from(this.particles.values());
    if (this.particleStyle === "liquid") {
      for (const rec of records) {
        if (rec.mesh) {
          this.scene.remove(rec.mesh);
          rec.mesh.geometry.dispose();
          (rec.mesh.material as THREE.Material).dispose();
          rec.mesh = null;
        }
        rec.instanceSlot = null;
      }
      if (this.instancedField) {
        this.scene.remove(this.instancedField.mesh);
        this.instancedField.mesh.geometry.dispose();
        (this.instancedField.mesh.material as THREE.Material).dispose();
        this.instancedField = null;
      }
      this.instanceActiveCount = 0;
      this.slotOwners = [];
      const radius = DEFAULT_CONFIG.liquid.radius;
      for (const rec of records) {
        rec.baseRadius = radius;
        rec.instanceSlot = this.allocateLiquidSlot(rec, rec.renderPos);
      }
    } else {
      for (const rec of records) rec.instanceSlot = null;
      if (this.liquidField) {
        this.liquidField.dispose();
        this.liquidField = null;
      }
      this.liquidActiveCount = 0;
      this.liquidSlotOwners = [];
      // Al volver a "hero" se restauran los dos niveles de siempre —
      // incluso el acantilado de INSTANCE_THRESHOLD, que es parte del
      // comportamiento de referencia que este estilo conserva.
      const useInstanced = this.particles.size >= INSTANCE_THRESHOLD;
      for (const rec of records) {
        if (useInstanced) {
          rec.baseRadius = INSTANCE_RADIUS;
          rec.instanceSlot = this.allocateInstanceSlot(rec, rec.renderPos);
        } else {
          const mesh = createHeroParticle(rec.baseColor);
          mesh.position.copy(rec.renderPos);
          mesh.userData.particleId = rec.id;
          this.scene.add(mesh);
          rec.mesh = mesh;
          rec.baseRadius = (mesh.userData.baseRadius as number) ?? 0.32;
        }
      }
    }
  }

  private allocateLiquidSlot(rec: ParticleRecord, position: THREE.Vector3): number {
    const field = this.ensureLiquidField();
    const slot = this.liquidActiveCount++;
    this.liquidSlotOwners[slot] = rec;
    field.setSlot(slot, position, rec.baseColor, rec.drift);
    field.setActiveCount(this.liquidActiveCount);
    return slot;
  }

  private freeLiquidSlot(rec: ParticleRecord) {
    if (rec.instanceSlot === null || !this.liquidField) return;
    const slot = rec.instanceSlot;
    const lastSlot = this.liquidActiveCount - 1;
    if (slot !== lastSlot) {
      const moved = this.liquidSlotOwners[lastSlot];
      this.liquidSlotOwners[slot] = moved;
      moved.instanceSlot = slot;
      // Aquí SÍ hace falta copiar los buffers: la CPU no reescribe
      // nada por cuadro en el estilo líquido (la deriva va en el vertex
      // shader), así que sin la copia el slot movido quedaría con los
      // datos del slot liberado.
      this.liquidField.copySlot(lastSlot, slot);
    }
    this.liquidSlotOwners.pop();
    this.liquidActiveCount--;
    rec.instanceSlot = null;
    this.liquidField.setActiveCount(this.liquidActiveCount);
  }

  /** Driver de las animaciones celulares líquidas (F1.2): fija
   * tipo/parámetros/eje de cada instancia una sola vez y luego sólo
   * escribe el PROGRESO (aAnim.y) por cuadro — la deformación la hace
   * la GPU en el vertex shader (ver liquidParticle.ts). La CPU por
   * cuadro sigue siendo ~0 salvo durante las animaciones activas, y
   * ahí sólo para las instancias animadas. Los targets se referencian
   * por ParticleRecord (no por slot) porque el swap-with-last de
   * `freeLiquidSlot` puede mover el slot de una instancia animada a
   * media animación (muertes/fusiones concurrentes de un lote).
   * Con `prefers-reduced-motion` la animación se salta: misma
   * transición, instantánea. */
  private animateLiquid(
    duration: number,
    targets: { rec: ParticleRecord; type: number; p1: number; p2: number; axis: THREE.Vector3 }[],
    onDone: () => void,
  ) {
    const field = this.ensureLiquidField();
    for (const t of targets) {
      if (t.rec.instanceSlot !== null) field.setAnim(t.rec.instanceSlot, t.type, t.p1, t.p2, t.axis);
      this.lockedIds.add(t.rec.id);
    }
    const finish = () => {
      for (const t of targets) {
        if (t.rec.instanceSlot !== null) field.clearAnim(t.rec.instanceSlot);
        this.lockedIds.delete(t.rec.id);
      }
      onDone();
    };
    if (duration <= 0 || field.reducedMotion) {
      finish();
      return;
    }
    this.activeAnimations.push(
      tween(
        duration,
        (t) => t,
        (_eased, linear) => {
          for (const t of targets) {
            if (t.rec.instanceSlot !== null) field.setAnimProgress(t.rec.instanceSlot, linear);
          }
        },
        finish,
      ),
    );
  }

  /** Asigna el siguiente slot libre del pool instanciado — siempre al
   * final del rango activo (`instanceActiveCount`), nunca reutiliza un
   * hueco a medias: los huecos se evitan del todo con el patrón
   * "swap con el último" en `freeInstanceSlot`, así el rango activo
   * [0, instanceActiveCount) siempre queda contiguo y `mesh.count`
   * (un solo número) basta para esconder el resto. */
  private allocateInstanceSlot(rec: ParticleRecord, position: THREE.Vector3): number {
    const field = this.ensureInstancedField();
    const slot = this.instanceActiveCount++;
    this.slotOwners[slot] = rec;
    field.setSlot(slot, position, rec.baseColor);
    field.setActiveCount(this.instanceActiveCount);
    return slot;
  }

  private freeInstanceSlot(rec: ParticleRecord) {
    if (rec.instanceSlot === null) return;
    if (this.particleStyle === "liquid") {
      this.freeLiquidSlot(rec);
      return;
    }
    if (!this.instancedField) return;
    const slot = rec.instanceSlot;
    const lastSlot = this.instanceActiveCount - 1;
    if (slot !== lastSlot) {
      const moved = this.slotOwners[lastSlot];
      this.slotOwners[slot] = moved;
      moved.instanceSlot = slot;
      // No hace falta copiar los buffers de posición/color del slot
      // movido aquí — el bloque de deriva browniano en `tick()` vuelve
      // a escribir CADA partícula instanciada, cada cuadro, a partir
      // de `instanceSlot` (que ya quedó actualizado arriba); el
      // siguiente cuadro lo deja correcto solo.
    }
    this.slotOwners.pop();
    this.instanceActiveCount--;
    rec.instanceSlot = null;
    this.instancedField.setActiveCount(this.instanceActiveCount);
  }

  isBusy(): boolean {
    return this.busy;
  }

  // Ninguna acción individual puede correr mientras hay un lote activo
  // ("dividir/unir mil") — mezclar un clic manual con cientos de
  // operaciones en cola generaría estados a medio registrar.
  canBirth(): boolean {
    return !this.busy && !this.batchActive;
  }

  canDivide(): boolean {
    return !this.busy && !this.batchActive && this.particles.size >= 1;
  }

  canUnite(): boolean {
    return !this.busy && !this.batchActive && this.particles.size >= 2;
  }

  canDie(): boolean {
    return !this.busy && !this.batchActive && this.particles.size >= 2;
  }

  /** Registra la primera partícula al cargar la página — ya creada y
   * posicionada por main.ts, sin animación de nacimiento (la variante
   * elegida en el selector es para las que el usuario cree DESPUÉS,
   * no para la semilla inicial). */
  seed(mesh: THREE.Mesh): number {
    const id = this.register(mesh);
    this.mostRecentId = id;
    this.onChange();
    return id;
  }

  /** Semilla inicial en modo líquido — sin malla hero de por medio
   * (main.ts decide según el estilo guardado en la config). */
  seedLiquid(color: number, position: THREE.Vector3): number {
    const id = this.registerLiquid(color, position);
    this.mostRecentId = id;
    this.onChange();
    return id;
  }

  /** Nivel INDIVIDUAL — `mesh` ya viene creada por `createHeroParticle`
   * (con `baseColor`/`baseRadius`/`drift` puestos en su `userData`);
   * se copian a la propia `ParticleRecord` aquí para que el resto del
   * código nunca necesite tocar `mesh.userData` directamente. */
  private register(mesh: THREE.Mesh): number {
    const id = this.nextId++;
    mesh.userData.particleId = id;
    const baseColor = (mesh.userData.baseColor as number) ?? 0xffffff;
    const baseRadius = (mesh.userData.baseRadius as number) ?? 0.32;
    const drift = (mesh.userData.drift as DriftParams) ?? createDrift(baseRadius);
    this.particles.set(id, {
      id,
      mesh,
      instanceSlot: null,
      baseColor,
      baseRadius,
      drift,
      brainDir: null,
      home: mesh.position.clone(),
      renderPos: mesh.position.clone(),
    });
    return id;
  }

  /** Nivel INSTANCIADO (ver INSTANCE_THRESHOLD) — no hay `THREE.Mesh`
   * propia; la posición/color viven como un slot dentro del
   * `InstancedMesh` compartido (ver instancedField.ts). En modo
   * líquido TODA creación pasa por aquí (isInstancedTier siempre da
   * true) y se desvía al campo líquido — así las 3 rutas de creación
   * (nacer/dividir/unir) y el lote masivo quedan cubiertos sin tocar
   * su lógica. */
  private registerInstanced(color: number, radius: number, position: THREE.Vector3): number {
    if (this.particleStyle === "liquid") {
      return this.registerLiquid(color, position);
    }
    const id = this.nextId++;
    const rec: ParticleRecord = {
      id,
      mesh: null,
      instanceSlot: null,
      baseColor: color,
      baseRadius: radius,
      drift: createDrift(radius),
      brainDir: null,
      home: position.clone(),
      renderPos: position.clone(),
    };
    rec.instanceSlot = this.allocateInstanceSlot(rec, position);
    this.particles.set(id, rec);
    return id;
  }

  /** Registro en el campo líquido — radio único de la config a
   * cualquier N (la identidad visual nunca cambia con el conteo). */
  private registerLiquid(color: number, position: THREE.Vector3): number {
    const id = this.nextId++;
    const radius = DEFAULT_CONFIG.liquid.radius;
    const rec: ParticleRecord = {
      id,
      mesh: null,
      instanceSlot: null,
      baseColor: color,
      baseRadius: radius,
      drift: createDrift(radius),
      brainDir: null,
      home: position.clone(),
      renderPos: position.clone(),
    };
    rec.instanceSlot = this.allocateLiquidSlot(rec, position);
    this.particles.set(id, rec);
    return id;
  }

  /** Convierte de una sola vez TODA la población individual actual al
   * nivel instanciado — ver el comentario largo en `startBatch` sobre
   * por qué un lote que crece gradualmente de a 1 (dividir en masa)
   * nunca llega a esto por su cuenta. Conserva el mismo `id` (nunca
   * borra/recrea el registro) para que selección, `mostRecentId` y el
   * `brainDir` ya asignado sigan intactos — sólo cambia CÓMO se
   * renderiza la partícula, no cuál es. */
  private convertAllToInstanced() {
    for (const rec of this.particles.values()) {
      if (!rec.mesh || this.lockedIds.has(rec.id)) continue;
      this.scene.remove(rec.mesh);
      rec.mesh.geometry.dispose();
      (rec.mesh.material as THREE.Material).dispose();
      rec.mesh = null;
      rec.baseRadius = INSTANCE_RADIUS;
      rec.instanceSlot = this.allocateInstanceSlot(rec, rec.renderPos);
    }
  }

  private unregister(id: number) {
    const rec = this.particles.get(id);
    if (rec) this.freeInstanceSlot(rec);
    this.particles.delete(id);
    if (this.selectedId === id) this.selectedId = null;
    if (this.mostRecentId === id) this.mostRecentId = null;
  }

  private nearestTo(id: number): number | null {
    const origin = this.particles.get(id);
    if (!origin) return null;
    let bestId: number | null = null;
    let bestDist = Infinity;
    for (const [otherId, rec] of this.particles) {
      if (otherId === id) continue;
      const d = origin.renderPos.distanceTo(rec.renderPos);
      if (d < bestDist) {
        bestDist = d;
        bestId = otherId;
      }
    }
    return bestId;
  }

  /** Bug real visto en vivo, en un lote masivo de cientos de
   * divisiones ("puso todo en un plano, no en una nube... y se
   * encima entre ellas"): la versión anterior restringía el eje de
   * división al plano PERPENDICULAR a la vista de la cámara — pensado
   * para que una división SUELTA nunca se viera "de frente" (el eje
   * alineado con la cámara hace que las 2 mitades se proyecten una
   * encima de otra en pantalla). Eso funciona para una sola prueba,
   * pero el modo masivo no rota la cámara — así que TODAS las
   * divisiones de la corrida entera usaban el mismo plano fijo, y
   * cientos de generaciones subdividiendo ese mismo plano terminan
   * literalmente aplanadas, no en una nube 3D como el cubo real
   * (ver worker/scripts/pca.ts — production distribuye en volumen,
   * no en un plano). Isotrópico en 3D de verdad (método de rechazo de
   * Marsaglia: un punto uniforme dentro de la esfera unitaria,
   * normalizado — a diferencia de usar ángulos esféricos directos,
   * esto NO se acumula en los polos) es lo correcto para que la nube
   * crezca en volumen real. */
  private randomIsotropicAxis(): THREE.Vector3 {
    let x = 0;
    let y = 0;
    let z = 0;
    let lenSq = 0;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      lenSq = x * x + y * y + z * z;
    } while (lenSq > 1 || lenSq < 1e-6);
    const invLen = 1 / Math.sqrt(lenSq);
    return new THREE.Vector3(x * invLen, y * invLen, z * invLen);
  }

  /** ¿`pos` cae demasiado cerca de alguna partícula EXISTENTE que no
   * sea parte de la operación que la está creando? No es la
   * relajación completa que usa production (worker/scripts/pca.ts's
   * `declumpPoints`, una pasada global de cientos de iteraciones —
   * carísima para correr en vivo cuadro a cuadro); aquí basta
   * rechazar/reintentar el eje al azar unas pocas veces hasta que no
   * choque, barato porque sólo se hace al CREAR una posición nueva,
   * no todos los cuadros. */
  private isTooClose(pos: THREE.Vector3, excludeIds: Set<number>, minDist: number): boolean {
    for (const [id, rec] of this.particles) {
      if (excludeIds.has(id)) continue;
      if (rec.renderPos.distanceTo(pos) < minDist) return true;
    }
    return false;
  }

  private randomSpawnPosition(): THREE.Vector3 {
    if (this.particles.size === 0) return new THREE.Vector3(0, 0, 0);
    const radius = 0.9 + Math.random() * 0.4;
    return this.randomIsotropicAxis().multiplyScalar(radius);
  }

  /** Anti-encimado CONTINUO, corrido cada cuadro — bug real reportado
   * en vivo con un lote de ~850 ("se encima entre ellas"): el reintento
   * de `isTooClose` al CREAR una división ayuda, pero en zonas ya
   * densas puede agotar sus intentos y colocar una partícula
   * encimada de todos modos (origen y separación fijos por intento,
   * sólo cambia la dirección — si ninguna dirección libre existe
   * cerca del origen, ningún reintento la va a encontrar). Esto es el
   * equivalente en vivo/barato de la relajación real de production
   * (worker/scripts/pca.ts's `declumpPoints`, 300 iteraciones en una
   * sola pasada — carísimo correr así cuadro a cuadro): un hash
   * espacial (celdas del tamaño de la distancia mínima, así sólo hace
   * falta mirar la propia celda + vecinas, nunca las N² parejas) que
   * empuja cada par encimado una fracción pequeña de la superposición
   * por cuadro. Se acumula sobre `home` (no `mesh.position` — la
   * deriva browniana ya lee `home` cada cuadro, ver el bloque de abajo
   * en `tick`), así el ajuste persiste y converge en un par de
   * segundos en vez de ser una corrección de un solo instante. */
  private declump(dt: number) {
    // Claves de celda ENTERAS empaquetadas en un solo número (bit
    // shifting), no strings tipo `${cx},${cy},${cz}` — a cientos de
    // partículas, un Map<string,...> reconstruido cada cuadro con
    // template literals resultó medible en vivo (~11ms/cuadro con 900
    // partículas, la mitad del presupuesto de un cuadro a 60fps).
    // Buffers planos (Float64Array) para posición/radio/empuje en vez
    // de un array de objetos `THREE.Vector3` — evita esa misma
    // cantidad de asignaciones nuevas cada cuadro (presión de GC).
    let n = 0;
    for (const [id] of this.particles) {
      if (!this.lockedIds.has(id)) n++;
    }
    if (n < 2) return;
    if (!this.declumpScratch || this.declumpScratch.capacity < n) {
      const capacity = Math.max(n, 64);
      this.declumpScratch = {
        capacity,
        homeRefs: new Array(capacity),
        px: new Float64Array(capacity),
        py: new Float64Array(capacity),
        pz: new Float64Array(capacity),
        r: new Float64Array(capacity),
        brainDirX: new Float64Array(capacity),
        brainDirY: new Float64Array(capacity),
        brainDirZ: new Float64Array(capacity),
        pushX: new Float64Array(capacity),
        pushY: new Float64Array(capacity),
        pushZ: new Float64Array(capacity),
      };
    }
    const s = this.declumpScratch;
    let i = 0;
    let maxRadius = 0;
    for (const [id, rec] of this.particles) {
      if (this.lockedIds.has(id)) continue;
      s.homeRefs[i] = rec.home;
      s.px[i] = rec.home.x;
      s.py[i] = rec.home.y;
      s.pz[i] = rec.home.z;
      const radius = rec.baseRadius;
      s.r[i] = radius;
      if (radius > maxRadius) maxRadius = radius;
      // Partículas creadas antes de que existiera esta forma (ej. la
      // semilla inicial, sembrada directo en main.ts) no tienen
      // `brainDir` asignado — se calcula una vez aquí, a partir de su
      // dirección actual desde el origen, y se cachea en el propio
      // ParticleRecord para no repetir el cálculo cada cuadro.
      let brainDir = rec.brainDir;
      if (!brainDir) {
        const fallbackDir = rec.home.lengthSq() > 1e-6 ? rec.home.clone().normalize() : this.randomIsotropicAxis();
        brainDir = computeBrainDir(fallbackDir);
        rec.brainDir = brainDir;
      }
      s.brainDirX[i] = brainDir.x;
      s.brainDirY[i] = brainDir.y;
      s.brainDirZ[i] = brainDir.z;
      s.pushX[i] = 0;
      s.pushY[i] = 0;
      s.pushZ[i] = 0;
      i++;
    }

    // El radio del nivel INSTANCIADO (más chico) para el tamaño de
    // celda cuando hay instancias en juego, no el máximo global — bug
    // de rendimiento real medido en vivo: unas pocas partículas
    // individuales (radio 0.32) mezcladas entre miles de instanciadas
    // (radio 0.12) hacían que TODA la cuadrícula usara celdas basadas
    // en 0.32, ~4.5x más grandes en volumen que las que en realidad
    // necesita la inmensa mayoría — cada celda terminaba con muchos
    // más vecinos que revisar. Con el radio correcto, ~75ms/cuadro con
    // 25,000 partículas bajó a algo manejable. El riesgo aceptado: una
    // partícula individual (rara, ≤500 como mucho) podría no detectar
    // una instanciada vecina si cae más allá de la cuadrícula de 3×3×3
    // celdas — un caso de borde raro entre los dos niveles, no un
    // problema sistemático.
    const instancedActive = this.particleStyle === "liquid" ? this.liquidActiveCount : this.instanceActiveCount;
    const instancedRadius = this.particleStyle === "liquid" ? DEFAULT_CONFIG.liquid.radius : INSTANCE_RADIUS;
    const cellRadius = instancedActive > 0 ? instancedRadius : maxRadius;
    const cellSize = cellRadius * 2 * 1.1;
    const invCellSize = 1 / cellSize;
    // Offset/máscara de 10 bits por eje: soporta celdas en
    // [-512, 511] por eje (miles de unidades de mundo a este tamaño de
    // celda) antes de que dos celdas distintas puedan colisionar en la
    // misma clave.
    const CELL_BITS = 10;
    const CELL_OFFSET = 1 << (CELL_BITS - 1);
    const CELL_MASK = (1 << CELL_BITS) - 1;
    const keyOf = (cx: number, cy: number, cz: number) =>
      (((cx + CELL_OFFSET) & CELL_MASK) << (2 * CELL_BITS)) | (((cy + CELL_OFFSET) & CELL_MASK) << CELL_BITS) | ((cz + CELL_OFFSET) & CELL_MASK);

    const cells = new Map<number, number[]>();
    const cx = new Int32Array(n);
    const cy = new Int32Array(n);
    const cz = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      cx[k] = Math.floor(s.px[k] * invCellSize);
      cy[k] = Math.floor(s.py[k] * invCellSize);
      cz[k] = Math.floor(s.pz[k] * invCellSize);
      const key = keyOf(cx[k], cy[k], cz[k]);
      const arr = cells.get(key);
      if (arr) arr.push(k);
      else cells.set(key, [k]);
    }

    const correctionRate = 6; // fracción de la superposición corregida por segundo
    for (let a = 0; a < n; a++) {
      const acx = cx[a];
      const acy = cy[a];
      const acz = cz[a];
      for (let oi = 0; oi < NEIGHBOR_OFFSET_COUNT; oi++) {
        const o3 = oi * 3;
        // Clave inlinead (no una llamada a `keyOf`) — 25,000×14 veces
        // por cuadro, la indirección de la función también se notó.
        const key =
          (((acx + NEIGHBOR_CELL_OFFSETS[o3] + CELL_OFFSET) & CELL_MASK) << (2 * CELL_BITS)) |
          (((acy + NEIGHBOR_CELL_OFFSETS[o3 + 1] + CELL_OFFSET) & CELL_MASK) << CELL_BITS) |
          ((acz + NEIGHBOR_CELL_OFFSETS[o3 + 2] + CELL_OFFSET) & CELL_MASK);
        const arr = cells.get(key);
        if (!arr) continue;
        // El filtro `b<=a` sólo aplica a la propia celda (offset
        // 0,0,0, siempre `oi===0`) — para cualquier otro offset, `arr`
        // es la lista de OTRA celda distinta, así que cada partícula
        // ahí ya es una pareja nueva sin importar el índice.
        const isSelfCell = oi === 0;
        for (const b of arr) {
          if (isSelfCell && b <= a) continue;
          const diffX = s.px[a] - s.px[b];
          const diffY = s.py[a] - s.py[b];
          const diffZ = s.pz[a] - s.pz[b];
          const d = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ);
          const minDist = (s.r[a] + s.r[b]) * MIN_SEPARATION_FACTOR;
          if (d > 1e-6 && d < minDist) {
            const overlap = minDist - d;
            const mag = overlap * 0.5 * correctionRate * dt;
            const invD = mag / d;
            s.pushX[a] += diffX * invD;
            s.pushY[a] += diffY * invD;
            s.pushZ[a] += diffZ * invD;
            s.pushX[b] -= diffX * invD;
            s.pushY[b] -= diffY * invD;
            s.pushZ[b] -= diffZ * invD;
          }
        }
      }
    }
    // Empuje ADICIONAL hacia la silueta de cerebro — se SUMA al empuje
    // de anti-encimado de arriba en los mismos `pushX/Y/Z`, nunca lo
    // reemplaza: el anti-encimado sigue garantizando que no se toquen,
    // esto sólo influye hacia dónde tira el "centro de gravedad" de
    // cada partícula. `this.particles.size` (el conteo REAL, no sólo
    // `n` que excluye a las bloqueadas por una animación) es lo que ve
    // el usuario en el HUD — es la referencia correcta para "después
    // de 500 partículas".
    const brainStrength = THREE.MathUtils.clamp((this.particles.size - BRAIN_RAMP_START) / BRAIN_RAMP_RANGE, 0, 1);
    if (brainStrength > 0) {
      // Bug real medido en vivo con un lote de 2000 ("ya no se ve el
      // cerebro", la nube entera terminaba lejísimos del origen — un
      // centroide de hasta y≈+85 tras ~160s de simulación): esto SÍ
      // recalculaba un centroide de las posiciones ACTUALES cada
      // cuadro y jalaba hacia `centroid + brainDir*dist` — el
      // comentario original asumía que fijar `brainDir` por partícula
      // (ver abajo) bastaba para eliminar toda realimentación, pero
      // `computeBrainDir` NO tiene media cero a propósito (shapeY se
      // encoge menos para dy>=0 que para dy<0, así el cerebro queda
      // más lleno arriba que abajo) — medido con 2M muestras, el
      // sesgo es ~+0.02 en Y. Como el centroide se recalculaba de las
      // posiciones que el propio jalón acababa de mover, ese sesgo se
      // realimentaba sobre el centroide mismo, cuadro a cuadro, sin
      // ningún punto fijo que lo frenara — un random walk CON deriva,
      // no sólo difusión. Anclar en el origen del mundo (0,0,0) — que
      // es donde nace la semilla (`main.ts`) y cualquier partícula
      // aislada (`randomSpawnPosition`) — da exactamente la misma
      // forma relativa sin nada que pueda arrastrar la nube entera.
      const pullMag = brainStrength * 1.1 * dt;
      for (let k = 0; k < n; k++) {
        // `brainDirX/Y/Z` es FIJO por partícula (asignado una sola vez
        // al crearla, ver `assignBrainDir` en birth/startDivide/
        // startUnite) — nunca se re-deriva de la posición actual cada
        // cuadro. Bug real encontrado antes de deployar: la primera
        // versión SÍ recalculaba la dirección de cada partícula a
        // partir de su offset actual y jalaba hacia una versión
        // re-escalada de ESA MISMA dirección — como el resultado de un
        // cuadro es la entrada del siguiente, cada cuadro volvía a
        // amplificar el eje Z sobre lo YA amplificado, sin ningún punto
        // de referencia fijo — converge al autovector dominante de la
        // transformación (el eje Z puro), no a un elipsoide estable
        // (medido en vivo: tras ~3500 cuadros, stdZ creciendo sin freno
        // y stdX/stdY colapsando hacia 0). Con una dirección ASIGNADA
        // una vez y jalando sólo hacia `brainDir*dist` desde el ORIGEN
        // (dist = distancia actual al origen, no escalada), cada
        // partícula sólo rota angularmente hacia su propio destino
        // fijo — sin realimentación, ni por partícula ni agregada.
        const dx = s.brainDirX[k];
        const dy = s.brainDirY[k];
        const dz = s.brainDirZ[k];
        const ox = s.px[k];
        const oy = s.py[k];
        const oz = s.pz[k];
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const targetX = dx * dist;
        const targetY = dy * dist;
        const targetZ = dz * dist;
        s.pushX[k] += (targetX - s.px[k]) * pullMag;
        s.pushY[k] += (targetY - s.py[k]) * pullMag;
        s.pushZ[k] += (targetZ - s.pz[k]) * pullMag;
      }
    }

    for (let k = 0; k < n; k++) {
      if (s.pushX[k] !== 0 || s.pushY[k] !== 0 || s.pushZ[k] !== 0) {
        (s.homeRefs[k] as THREE.Vector3).set(s.px[k] + s.pushX[k], s.py[k] + s.pushY[k], s.pz[k] + s.pushZ[k]);
      }
    }
  }

  birth(variantKey: string, duration: number) {
    if (!this.canBirth()) return;
    const color = nextColor();
    const pos = this.randomSpawnPosition();

    // Modo líquido (F1.2): la célula emerge con escala easeOutBack +
    // wobble amplificado que se calma — todo en el vertex shader (ver
    // animateLiquid/LIQUID_ANIM.BIRTH).
    if (this.particleStyle === "liquid") {
      const id = this.registerLiquid(color, pos);
      this.mostRecentId = id;
      const rec = this.particles.get(id)!;
      this.busy = true;
      this.onChange();
      this.reframe([...this.otherPositions([id]), pos]);
      this.animateLiquid(duration, [{ rec, type: LIQUID_ANIM.BIRTH, p1: DEFAULT_CONFIG.liquidAnim.birthWobbleBoost, p2: 0, axis: new THREE.Vector3() }], () => {
        this.busy = false;
        this.onChange();
      });
      return;
    }

    // Nivel instanciado (ver INSTANCE_THRESHOLD) — mismo motivo que
    // `startDivide`/`startUnite`: sin malla PBR individual no hay nada
    // que animar con `BIRTH_VARIANTS`, aparece directo. `+1`: esta
    // partícula nueva aún no está en `this.particles` (ver el
    // comentario de `isInstancedTier`) — el conteo final va a incluirla.
    if (this.isInstancedTier(1)) {
      const id = this.registerInstanced(color, INSTANCE_RADIUS, pos);
      this.mostRecentId = id;
      this.onChange();
      this.reframe([...this.otherPositions([id]), pos]);
      return;
    }

    const variant = BIRTH_VARIANTS[variantKey]?.run ?? BIRTH_VARIANTS.fundido.run;
    const mesh = createHeroParticle(color);
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.001);
    this.scene.add(mesh);
    const id = this.register(mesh);
    this.mostRecentId = id;
    this.busy = true;
    // Bloqueada mientras nace: algunos estilos de nacimiento mueven la
    // posición durante la animación (no sólo escala) — el deriva no
    // debe pelearse con eso.
    this.lockedIds.add(id);
    this.onChange();
    this.reframe([...this.otherPositions([id]), pos]);
    const anim = variant(this.scene, mesh, pos, color, duration);
    this.activeAnimations.push(
      onFinish(anim, () => {
        const rec = this.particles.get(id);
        if (rec) rec.home.copy(pos);
        this.lockedIds.delete(id);
        this.busy = false;
        this.onChange();
      }),
    );
  }

  divide(variantKey: string, duration: number) {
    if (!this.canDivide()) return;
    const id = this.targetId();
    if (id === null) return;
    this.busy = true;
    this.onChange();
    const started = this.startDivide(id, variantKey, duration, (idA, idB) => {
      void idA;
      this.mostRecentId = idB;
      this.busy = false;
      this.onChange();
    });
    if (!started) {
      this.busy = false;
      this.onChange();
    }
  }

  /** Núcleo real de una división — sin gate de `busy`/`canDivide`, para
   * que tanto el botón individual (`divide`) como el lote masivo
   * (`tick`'s batch) compartan exactamente la misma lógica en vez de
   * dos copias que se puedan desincronizar. `reframe=false` lo usa el
   * lote: con decenas lanzándose por segundo, reencuadrar la cámara en
   * CADA una sería un mareo — el lote reencuadra una sola vez, aparte
   * (ver `tick`). */
  /** Pedido explícito del usuario: "cada partícula al dividirse tenga
   * otro color pero muy sutil, otro tono en camino a cambiar de
   * color" — cada hija muta el tono del padre por su cuenta (ver
   * mutateHue en heroParticle.ts), así A y B también divergen entre sí,
   * no sólo del padre. Signo FIJO por hija (no al azar cada una) — bug
   * real reportado en vivo con un lote de 267 ("no pasa a colores
   * cálidos"): con signo random independiente, la mitad de las
   * divisiones mandan A y B para el MISMO lado, cancelando el avance.
   * Con signo fijo, la rama que siempre hereda el mismo signo acumula
   * magnitud SIEMPRE en la misma dirección (lineal en generaciones, no
   * sqrt). Aparte, `COLOR_JUMP_PROBABILITY` (bug real reportado en
   * vivo, "no hay muchos colores"): una sola caminata de tono nunca
   * produce la variedad "muchos colores por categoría" del cubo real,
   * sin importar cuánto se suba el grado de mutación — un salto
   * ocasional a un color fresco de la paleta abre nuevas ramas. */
  private childColor(parentColor: number, sign: 1 | -1): number {
    if (Math.random() < COLOR_JUMP_PROBABILITY) return nextColor();
    return mutateHue(parentColor, this.mutationDeg, sign);
  }

  private startDivide(id: number, variantKey: string, duration: number, onComplete: (idA: number, idB: number) => void, opts: { reframe?: boolean } = {}): boolean {
    const rec = this.particles.get(id);
    if (!rec) return false;
    const origin = rec.renderPos.clone();
    const parentColor = rec.baseColor;
    const parentRadius = rec.baseRadius;
    const separation = 0.55;
    const excludeSelf = new Set([id]);
    // Reintenta el eje al azar unas pocas veces si cualquiera de las 2
    // posiciones nuevas cae encima de OTRA partícula (no relacionada,
    // ya existente) — ver `isTooClose`. Con un eje isotrópico de
    // verdad esto casi nunca hace falta más de 1-2 intentos salvo en
    // zonas ya muy densas.
    const minDist = parentRadius * 2 * MIN_SEPARATION_FACTOR;
    let dir = this.randomIsotropicAxis();
    let posA = origin.clone().addScaledVector(dir, separation);
    let posB = origin.clone().addScaledVector(dir, -separation);
    for (let attempt = 0; attempt < 8 && (this.isTooClose(posA, excludeSelf, minDist) || this.isTooClose(posB, excludeSelf, minDist)); attempt++) {
      dir = this.randomIsotropicAxis();
      posA = origin.clone().addScaledVector(dir, separation);
      posB = origin.clone().addScaledVector(dir, -separation);
    }

    const colorA = this.childColor(parentColor, 1);
    const colorB = this.childColor(parentColor, -1);

    // Nivel INSTANCIADO (ver INSTANCE_THRESHOLD) — pedido explícito del
    // usuario ("quiero ver qué pasa si tenemos 25000"): a esta escala
    // no hay animación de mitosis (el blob raymarcheado de
    // metaballBlob.ts asume mallas PBR individuales, carísimo repetir
    // miles de veces) — las 2 hijas aparecen directo en su posición
    // final, igual que el cubo real no anima la aparición de cada
    // concepto uno por uno.
    // `canAnimate` (¿el padre tiene malla real?) y `useInstanced` (¿en
    // qué nivel deben nacer las hijas, según el conteo) son
    // DECISIONES DISTINTAS — bug real encontrado antes de deployar:
    // unir la misma condición ("sin malla" ⇒ "instanciado") hacía que
    // una nube ya instanciada nunca pudiera volver al nivel individual
    // al encogerse de vuelta por debajo del umbral (verificado en
    // vivo: de 10,000 a 100 con unión masiva, las 100 seguían
    // instanciadas). Aquí el padre puede carecer de malla (ya era
    // instanciado) y aun así las hijas deben nacer individuales si el
    // conteo ya volvió a estar por debajo del umbral.
    const canAnimate = rec.mesh !== null;
    // `+1`: el padre TODAVÍA está en `this.particles` en este punto
    // (se quita más abajo); una división neta agrega 1 (quita 1, agrega
    // 2) — ver el comentario de `isInstancedTier`.
    const useInstanced = this.isInstancedTier(1);

    // Modo líquido (F1.2): mitosis animada — el padre se retira y las 2
    // hijas nacen ya registradas en su posición final, pero el vertex
    // shader las arranca EN la posición del padre (aAnimAxis = origen −
    // hogar final), las estira tipo peanut a lo largo del eje de
    // división y las separa con wobble que decae (LIQUID_ANIM.DIVIDE).
    // Mismo ritmo que la rama hero (el tween dura `duration`), así el
    // lote masivo queda paceado igual que con la rama instantánea.
    if (this.particleStyle === "liquid") {
      this.unregister(id);
      const idA = this.registerLiquid(colorA, posA);
      const idB = this.registerLiquid(colorB, posB);
      if (opts.reframe ?? true) {
        this.reframe([...this.otherPositions([idA, idB]), posA, posB]);
      }
      const recA = this.particles.get(idA)!;
      const recB = this.particles.get(idB)!;
      const animCfg = DEFAULT_CONFIG.liquidAnim;
      this.animateLiquid(
        duration,
        [
          { rec: recA, type: LIQUID_ANIM.DIVIDE, p1: animCfg.divideStretch, p2: animCfg.divideWobbleBoost, axis: origin.clone().sub(posA) },
          { rec: recB, type: LIQUID_ANIM.DIVIDE, p1: animCfg.divideStretch, p2: animCfg.divideWobbleBoost, axis: origin.clone().sub(posB) },
        ],
        () => onComplete(idA, idB),
      );
      return true;
    }

    if (!canAnimate || useInstanced) {
      if (rec.mesh) {
        this.scene.remove(rec.mesh);
        rec.mesh.geometry.dispose();
        (rec.mesh.material as THREE.Material).dispose();
      }
      this.unregister(id);
      let idA: number;
      let idB: number;
      if (useInstanced) {
        idA = this.registerInstanced(colorA, INSTANCE_RADIUS, posA);
        idB = this.registerInstanced(colorB, INSTANCE_RADIUS, posB);
      } else {
        const childA = createHeroParticle(colorA);
        const childB = createHeroParticle(colorB);
        childA.position.copy(posA);
        childB.position.copy(posB);
        this.scene.add(childA, childB);
        idA = this.register(childA);
        idB = this.register(childB);
      }
      this.particles.get(idA)!.home.copy(posA);
      this.particles.get(idB)!.home.copy(posB);
      if (opts.reframe ?? true) {
        this.reframe([...this.otherPositions([idA, idB]), posA, posB]);
      }
      // Bug real reportado en vivo ("se rompe" — pantalla negra/
      // sobreexpuesta apenas arranca un lote apuntado a 2000): sin
      // malla que animar, antes se llamaba `onComplete` de inmediato,
      // en el MISMO tick — eso libera el cupo de `batchInFlight` al
      // instante, así que con `staggerSeconds` en 0 (valor que el
      // usuario sí puso) cada oleada relanzaba de inmediato con el
      // cupo lleno de nuevo, DUPLICANDO la población cada cuadro
      // (1→2→4→8→...→2000 en ~11 cuadros, un parpadeo de ~0.2s a
      // 60fps). Ni `reframe` (cada 0.6s) ni `declump`/el jalón de
      // cerebro (que necesitan varios cuadros para separar/acomodar)
      // alcanzan a hacer NADA en ese tiempo — la cámara se queda en el
      // encuadre original de 1 partícula mientras 2000 ya existen
      // amontonadas ahí mismo, literalmente dentro de ellas (de ahí lo
      // negro/sobreexpuesto). Retrasar `onComplete` por `duration` — lo
      // mismo que ya tarda la rama ANIMADA de abajo — bloquea el cupo
      // el mismo tiempo en los dos casos: instanciado o no, el ritmo
      // real de crecimiento queda gobernado por
      // `maxConcurrent/duration`, nunca por cuántas veces se pueda
      // relanzar una oleada en un solo cuadro.
      this.lockedIds.add(idA);
      this.lockedIds.add(idB);
      this.activeAnimations.push(
        tween(
          duration,
          (t) => t,
          () => {},
          () => {
            this.lockedIds.delete(idA);
            this.lockedIds.delete(idB);
            onComplete(idA, idB);
          },
        ),
      );
      return true;
    }

    const variant = DIVISION_VARIANTS[variantKey]?.run ?? DIVISION_VARIANTS.espontanea.run;
    const childA = createHeroParticle(colorA);
    const childB = createHeroParticle(colorB);
    childA.position.copy(origin);
    childB.position.copy(origin);
    childA.scale.setScalar(0.001);
    childB.scale.setScalar(0.001);
    this.scene.add(childA, childB);

    const parentMesh = rec.mesh!;
    this.unregister(id);
    const idA = this.register(childA);
    const idB = this.register(childB);
    this.lockedIds.add(idA);
    this.lockedIds.add(idB);
    if (opts.reframe ?? true) {
      this.reframe([...this.otherPositions([idA, idB]), posA, posB]);
    }

    let finished = false;
    const anim = variant(this.scene, parentMesh, childA, childB, posA, posB, duration, () => {
      if (finished) return;
      finished = true;
      const recA = this.particles.get(idA);
      if (recA) recA.home.copy(posA);
      const recB = this.particles.get(idB);
      if (recB) recB.home.copy(posB);
      this.lockedIds.delete(idA);
      this.lockedIds.delete(idB);
      onComplete(idA, idB);
    });
    this.activeAnimations.push(anim);
    return true;
  }

  unite(variantKey: string, duration: number) {
    if (!this.canUnite()) return;
    const id = this.targetId();
    if (id === null) return;
    const neighborId = this.nearestTo(id);
    if (neighborId === null) return;
    this.busy = true;
    this.onChange();
    const started = this.startUnite(id, neighborId, variantKey, duration, (resultId) => {
      this.mostRecentId = resultId;
      this.busy = false;
      this.onChange();
    });
    if (!started) {
      this.busy = false;
      this.onChange();
    }
  }

  /** Núcleo real de una unión — ver el comentario de `startDivide`,
   * misma razón: una sola implementación para el botón individual y
   * para el lote masivo. */
  private startUnite(idA: number, idB: number, variantKey: string, duration: number, onComplete: (resultId: number) => void, opts: { reframe?: boolean } = {}): boolean {
    const recA = this.particles.get(idA);
    const recB = this.particles.get(idB);
    if (!recA || !recB) return false;

    const colorA = recA.baseColor;
    const colorB = recB.baseColor;
    const blended = new THREE.Color(colorA).lerp(new THREE.Color(colorB), 0.5).getHex();
    const posA = recA.renderPos.clone();
    const posB = recB.renderPos.clone();
    const resultPos = new THREE.Vector3().lerpVectors(posA, posB, 0.5);

    const meshA = recA.mesh;
    const meshB = recB.mesh;
    // Si a CUALQUIERA le falta malla no hay 2 mallas reales que animar
    // juntas — pero eso es sólo sobre la ANIMACIÓN, no sobre en qué
    // nivel debe nacer el resultado (bug real encontrado antes de
    // deployar: la primera versión usaba "falta malla" para forzar
    // TAMBIÉN el nivel instanciado, así que una vez que la nube entera
    // pasaba a instanciada, unir nunca la devolvía al nivel individual
    // sin importar cuánto se achicara después — verificado en vivo,
    // de 10,000 a 100 quedaban las 100 instanciadas igual). El nivel sí
    // depende sólo del conteo, decidido DESPUÉS de quitar A y B (la
    // unión ACHICA la población, así que puede cruzar el umbral hacia
    // abajo).
    const canAnimate = meshA !== null && meshB !== null;

    // Modo líquido (F1.2): fusión animada — A y B NO se desregistran
    // todavía: el vertex shader las desplaza de su hogar hacia la
    // resultante (aAnimAxis = resultPos − hogar) estirándolas mientras
    // las "absorbe" y encogiéndolas a 0 (LIQUID_ANIM.UNION_ABSORBED);
    // la resultante nace ya registrada y hace overshoot de escala que
    // se calma (LIQUID_ANIM.UNION_RESULT). Al terminar el tween se
    // desregistran A y B — hasta entonces quedan locked, así que el
    // lote masivo no las puede emparejar con otra unión a media
    // animación.
    if (this.particleStyle === "liquid") {
      if (opts.reframe ?? true) {
        // A y B siguen registradas aquí — otherPositions([]) ya las
        // incluye; sólo falta sumar el punto de la resultante.
        this.reframe([...this.otherPositions([]), resultPos]);
      }
      const resultId = this.registerLiquid(blended, resultPos);
      const resultRec = this.particles.get(resultId)!;
      const animCfg = DEFAULT_CONFIG.liquidAnim;
      this.animateLiquid(
        duration,
        [
          { rec: recA, type: LIQUID_ANIM.UNION_ABSORBED, p1: animCfg.unionStretch, p2: animCfg.unionWobbleBoost, axis: resultPos.clone().sub(recA.home) },
          { rec: recB, type: LIQUID_ANIM.UNION_ABSORBED, p1: animCfg.unionStretch, p2: animCfg.unionWobbleBoost, axis: resultPos.clone().sub(recB.home) },
          { rec: resultRec, type: LIQUID_ANIM.UNION_RESULT, p1: animCfg.unionOvershoot, p2: animCfg.unionResultWobbleBoost, axis: new THREE.Vector3() },
        ],
        () => {
          this.unregister(idA);
          this.unregister(idB);
          onComplete(resultId);
        },
      );
      return true;
    }

    this.unregister(idA);
    this.unregister(idB);
    // `+1`: A y B ya se quitaron arriba, así que `this.particles.size`
    // ya es el conteo DESPUÉS de la resta — sólo falta sumar la
    // resultante que se registra más abajo (ver el comentario de
    // `isInstancedTier`).
    const useInstanced = this.isInstancedTier(1);

    if (opts.reframe ?? true) {
      // Bug real visto en vivo ("parpadea" al unir): unregister ya
      // quitó A y B del mapa, así que otherPositions([]) ya NO los
      // incluye — reencuadrar sólo con resultPos (un punto) le da al
      // cálculo de radio un boundingRadius casi nulo, y la cámara
      // SALTA a un zoom extremo de golpe mientras A y B siguen
      // viéndose separados en su posición real. Pasando también sus
      // posiciones actuales, el reencuadre parte de un radio que sí
      // las cubre y se cierra gradualmente conforme de verdad se
      // acercan, sin brinco.
      this.reframe([...this.otherPositions([]), posA, posB, resultPos]);
    }

    if (canAnimate && !useInstanced) {
      const variant = UNION_VARIANTS[variantKey]?.run ?? UNION_VARIANTS.gravitacional.run;
      const result = createHeroParticle(blended);
      result.position.copy(resultPos);
      result.scale.setScalar(0.001);

      let finished = false;
      const anim = variant(this.scene, meshA!, meshB!, result, resultPos, duration, () => {
        if (finished) return;
        finished = true;
        const resultId = this.register(result);
        onComplete(resultId);
      });
      this.activeAnimations.push(anim);
      return true;
    }

    // Sin animación (nivel instanciado, o alguno de los 2 ya lo era) —
    // el resultado nace directo, en el nivel que le toque por conteo.
    if (meshA) {
      this.scene.remove(meshA);
      meshA.geometry.dispose();
      (meshA.material as THREE.Material).dispose();
    }
    if (meshB) {
      this.scene.remove(meshB);
      meshB.geometry.dispose();
      (meshB.material as THREE.Material).dispose();
    }
    let resultId: number;
    if (useInstanced) {
      resultId = this.registerInstanced(blended, INSTANCE_RADIUS, resultPos);
    } else {
      const result = createHeroParticle(blended);
      result.position.copy(resultPos);
      this.scene.add(result);
      resultId = this.register(result);
    }
    // Mismo retraso que la rama instantánea de `startDivide` (ver ese
    // comentario largo) y por la misma razón: sin esto, un lote "unir
    // en masa" con `staggerSeconds` en 0 podría desplomar la población
    // varios órdenes de magnitud en un puñado de cuadros, sin que la
    // cámara (que reencuadra cada 0.6s) tenga ninguna oportunidad de
    // seguirle el paso.
    this.lockedIds.add(resultId);
    this.activeAnimations.push(
      tween(
        duration,
        (t) => t,
        () => {},
        () => {
          this.lockedIds.delete(resultId);
          onComplete(resultId);
        },
      ),
    );
    return true;
  }

  die(variantKey: string, duration: number) {
    if (!this.canDie()) return;
    const id = this.targetId();
    if (id === null) return;
    const rec = this.particles.get(id)!;
    const mesh = rec.mesh;

    // Modo líquido (F1.2): muerte animada — la célula se desinfla con
    // encogimiento asimétrico (el eje al azar encoge al cuadrado),
    // wobble amplificado y el núcleo emisivo apagándose con el
    // progreso (LIQUID_ANIM.DEATH); NO se desregistra hasta que
    // termina el tween, para que se vea el desinflado completo.
    if (this.particleStyle === "liquid") {
      this.busy = true;
      this.onChange();
      this.reframe(this.otherPositions([id]));
      this.animateLiquid(duration, [{ rec, type: LIQUID_ANIM.DEATH, p1: DEFAULT_CONFIG.liquidAnim.deathWobbleBoost, p2: 0, axis: this.randomIsotropicAxis() }], () => {
        this.unregister(id);
        this.busy = false;
        this.onChange();
      });
      return;
    }

    this.unregister(id);
    this.busy = true;
    this.onChange();
    this.reframe(this.otherPositions([]));

    // Sin malla (partícula del nivel instanciado, ver
    // INSTANCE_THRESHOLD) no hay nada que animar — desaparece directo.
    if (!mesh) {
      this.busy = false;
      this.onChange();
      return;
    }

    const variant = DEATH_VARIANTS[variantKey]?.run ?? DEATH_VARIANTS.burbuja.run;
    const color = rec.baseColor;
    let finished = false;
    const anim = variant(this.scene, mesh, color, duration, () => {
      if (finished) return;
      finished = true;
      this.busy = false;
      this.onChange();
    });
    this.activeAnimations.push(anim);
  }

  setConnectorEnabled(enabled: boolean) {
    this.connectorEnabled = enabled;
    if (!enabled && this.connector) {
      this.connector.dispose(this.scene);
      this.connector = null;
    }
  }

  setConnectorStyle(key: string) {
    this.connectorStyleKey = key;
    if (this.connector) {
      this.connector.dispose(this.scene);
      this.connector = null;
    }
  }

  /** Color/"vida" de la partícula seleccionada — pedido explícito del
   * usuario ("si le selecciono una me sale un slider para moverme por
   * toda la gama de colores"). Sólo actúa sobre `selectedId` (no
   * `targetId()`): el slider debe aparecer/actuar sobre una selección
   * explícita, no caer en la "más reciente" por defecto. */
  getSelectedColor(): { hue: number; intensity: number } | null {
    if (this.selectedId === null) return null;
    const rec = this.particles.get(this.selectedId);
    // Modo líquido: el tono vive en `baseColor` y la "vida" en el
    // atributo aGlow del slot (escala del núcleo emisivo por instancia).
    if (rec && !rec.mesh && this.liquidField && rec.instanceSlot !== null) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(rec.baseColor).getHSL(hsl, THREE.SRGBColorSpace);
      return { hue: hsl.h * 360, intensity: this.liquidField.getGlow(rec.instanceSlot) };
    }
    // `rec.mesh` sólo puede ser null para partículas del nivel
    // instanciado (ver INSTANCE_THRESHOLD) — y esas nunca pueden estar
    // seleccionadas (no aparecen en el raycast de `meshes()`), así que
    // esto en la práctica nunca debería disparar; se deja como guardia
    // defensiva en vez de asumirlo.
    if (!rec || !rec.mesh) return null;
    const mat = rec.mesh.material as THREE.MeshPhysicalMaterial;
    const hsl = { h: 0, s: 0, l: 0 };
    // `emissive` (el color BRILLANTE, sin oscurecer) en vez de `color`
    // (el cuerpo oscurecido) — es el que refleja de verdad el tono que
    // el usuario eligió. `getHSL` sin colorSpace explícito lee en
    // espacio lineal, no sRGB — el mismo bug que bodyColorOf, aquí sólo
    // afectaría el matiz leído de vuelta al slider al reseleccionar.
    mat.emissive.getHSL(hsl, THREE.SRGBColorSpace);
    return { hue: hsl.h * 360, intensity: mat.emissiveIntensity };
  }

  setSelectedHue(hueDeg: number) {
    if (this.selectedId === null) return;
    const rec = this.particles.get(this.selectedId);
    if (!rec) return;
    const c = DEFAULT_CONFIG.color;
    const normalized = ((hueDeg % 360) + 360) % 360;
    // Ver bodyColorOf en heroParticle.ts para el porqué de
    // SRGBColorSpace explícito — sin él, `lightness`/`saturation` no
    // significan lo que se espera perceptualmente.
    const color = new THREE.Color().setHSL(normalized / 360, c.saturation, c.lightness, THREE.SRGBColorSpace);
    if (!rec.mesh) {
      // Modo líquido — misma semántica (tono elegido a full, cuerpo
      // oscurecido vía bodyColorOf dentro de liquidParticle.setColor).
      if (this.liquidField && rec.instanceSlot !== null) {
        rec.baseColor = color.getHex();
        this.liquidField.setColor(rec.instanceSlot, rec.baseColor);
      }
      return;
    }
    const mat = rec.mesh.material as THREE.MeshPhysicalMaterial;
    // Cuerpo oscurecido / brillo con el tono elegido a full — mismo
    // contraste que createHeroParticle (ver heroParticle.ts's
    // bodyColorOf), si no el slider se ve "cambia de color" pero
    // sigue sin verse eléctrico.
    mat.color.copy(bodyColorOf(color.getHex()));
    mat.emissive.copy(color);
    // Se guarda como el color "base" de la partícula: así dividir/unir
    // (que leen `baseColor` para heredar/promediar) recogen el tono
    // elegido sin código adicional — ya funcionaba así antes de esto.
    rec.baseColor = color.getHex();
    rec.mesh.userData.baseColor = color.getHex();
  }

  setSelectedEmissiveIntensity(value: number) {
    if (this.selectedId === null) return;
    const rec = this.particles.get(this.selectedId);
    if (!rec) return;
    if (!rec.mesh) {
      if (this.liquidField && rec.instanceSlot !== null) {
        this.liquidField.setGlow(rec.instanceSlot, value);
      }
      return;
    }
    (rec.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = value;
  }

  /** Multiplicador global sobre la frecuencia del deriva de TODAS las
   * partículas — 0 las congela, >1 las acelera. No reemplaza la
   * frecuencia propia de cada una (ver DriftParams), sólo la escala. */
  setMovementSpeed(value: number) {
    this.movementSpeed = value;
    this.liquidField?.setMovement(value, this.movementIntensity);
  }

  /** Multiplicador global sobre la amplitud del deriva — 0 las deja
   * quietas en su `home` exacto, >1 las hace vibrar más lejos. */
  setMovementIntensity(value: number) {
    this.movementIntensity = value;
    this.liquidField?.setMovement(this.movementSpeed, value);
  }

  isBatchActive(): boolean {
    return this.batchActive;
  }

  /** Estado del lote para que la UI muestre progreso ("342 / 1000") —
   * null cuando no hay lote corriendo. */
  getBatchStatus(): BatchStatus | null {
    if (!this.batchActive || !this.batchOpts) return null;
    return {
      active: true,
      mode: this.batchOpts.mode,
      count: this.particles.size,
      target: this.batchOpts.targetCount,
      inFlight: this.batchInFlight,
    };
  }

  /** Arranca el lote — pedido explícito del usuario ("dividir o unir
   * mil en una animación"). No dispara nada synchronously: `tick()` va
   * lanzando oleadas de hasta `maxConcurrent` operaciones cada
   * `staggerSeconds`, hasta llegar a `targetCount` (o quedarse sin
   * partículas elegibles). */
  startBatch(opts: BatchOptions): boolean {
    if (this.busy || this.batchActive) return false;
    if (opts.mode === "dividir" && this.particles.size < 1) return false;
    if (opts.mode === "unir" && this.particles.size < 2) return false;
    // Bug real medido en vivo con un lote de "dividir en masa" hasta
    // 2000 (ver el comentario largo de `isInstancedTier`): una
    // población que CRECE gradualmente de a 1 por división nunca
    // "alcanza" el nivel instanciado por su cuenta — sólo la partícula
    // creada justo al cruzar el umbral queda instanciada; las miles de
    // ANTES (la inmensa mayoría) se quedan para siempre como mallas
    // PBR completas, exactamente el costo caro que este nivel existe
    // para evitar (verificado: un lote apuntado a 2000 terminaba con
    // 1998 individuales y sólo 2 instanciadas). Si ya se sabe de
    // antemano que el lote va a terminar en o sobre el umbral,
    // convertir TODA la población actual de una sola vez antes de la
    // primera oleada — así cada división nueva parte de un padre YA
    // instanciado, nunca de uno que habría que crear como individual
    // primero para no volver a tocarlo jamás.
    if (opts.mode === "dividir" && opts.targetCount >= INSTANCE_THRESHOLD) {
      this.convertAllToInstanced();
    }
    this.batchActive = true;
    this.batchOpts = opts;
    this.batchInFlight = 0;
    this.batchWaveTimer = opts.staggerSeconds; // lanza la primera oleada de inmediato
    this.batchReframeTimer = 0;
    this.onChange();
    return true;
  }

  /** Pide detener el lote — termina las operaciones YA lanzadas (no
   * las corta a medias) pero no lanza oleadas nuevas. */
  stopBatch() {
    this.batchActive = false;
    this.batchOpts = null;
    this.onChange();
  }

  /** Una oleada de división: toma hasta `slots` partículas SIN
   * bloquear (ninguna animación propia en curso) y lanza una división
   * en cada una. Parar exactamente en `targetCount` es posible porque
   * `startDivide` registra las 2 hijas SÍNCRONAMENTE al lanzar (no al
   * terminar la animación) — `this.particles.size` ya refleja el
   * conteo real en cada oleada, nunca hay que adivinar cuántas están
   * "en camino". */
  private runDivideWave(opts: BatchOptions) {
    const needed = opts.targetCount - this.particles.size;
    if (needed <= 0) return;
    const slots = Math.max(0, opts.maxConcurrent - this.batchInFlight);
    const eligible: number[] = [];
    for (const id of this.particles.keys()) {
      if (!this.lockedIds.has(id)) eligible.push(id);
      if (eligible.length >= slots) break;
    }
    const toLaunch = Math.min(slots, needed, eligible.length);
    for (let i = 0; i < toLaunch; i++) {
      this.batchInFlight++;
      this.startDivide(eligible[i], opts.variantKey, opts.duration, () => {
        this.batchInFlight--;
      }, { reframe: false });
    }
    if (toLaunch > 0) this.onChange();
  }

  /** Una oleada de unión: empareja partículas SIN bloquear con su
   * vecina más cercana TAMBIÉN sin bloquear (nunca la misma partícula
   * en 2 pares de la misma oleada) y lanza una unión por par. */
  private runUniteWave(opts: BatchOptions) {
    if (this.particles.size <= opts.targetCount || this.particles.size < 2) return;
    const slots = Math.max(0, opts.maxConcurrent - this.batchInFlight);
    if (slots <= 0) return;
    const eligible = new Set<number>();
    for (const id of this.particles.keys()) {
      if (!this.lockedIds.has(id)) eligible.add(id);
    }
    let launched = 0;
    while (launched < slots && eligible.size >= 2 && this.particles.size - launched > opts.targetCount) {
      const idA = eligible.values().next().value as number;
      eligible.delete(idA);
      const posA = this.particles.get(idA)!.renderPos;
      let bestId: number | null = null;
      let bestDist = Infinity;
      for (const otherId of eligible) {
        const d = posA.distanceTo(this.particles.get(otherId)!.renderPos);
        if (d < bestDist) {
          bestDist = d;
          bestId = otherId;
        }
      }
      if (bestId === null) break;
      eligible.delete(bestId);
      this.batchInFlight++;
      launched++;
      this.startUnite(idA, bestId, opts.variantKey, opts.duration, () => {
        this.batchInFlight--;
      }, { reframe: false });
    }
    if (launched > 0) this.onChange();
  }

  tick(dt: number) {
    this.time += dt;
    this.activeAnimations = this.activeAnimations.filter((a) => a.update(dt));

    if (this.cameraTween && !this.cameraTween.update(dt)) {
      this.cameraTween = null;
    }

    // Animación masiva — pedido explícito del usuario ("dividir o
    // unir mil"). Lanza oleadas de a lo más `maxConcurrent` cada
    // `staggerSeconds`; se detiene sola al llegar a `targetCount` (o
    // al quedarse sin partículas elegibles: `runDivideWave`/
    // `runUniteWave` simplemente no lanzan nada si no hay cupo).
    if (this.batchActive && this.batchOpts) {
      const opts = this.batchOpts;
      this.batchWaveTimer += dt;
      if (this.batchWaveTimer >= opts.staggerSeconds) {
        this.batchWaveTimer = 0;
        if (opts.mode === "dividir") this.runDivideWave(opts);
        else this.runUniteWave(opts);
      }
      const reached = opts.mode === "dividir" ? this.particles.size >= opts.targetCount : this.particles.size <= opts.targetCount || this.particles.size < 2;
      if (reached && this.batchInFlight === 0) {
        this.batchActive = false;
        this.batchOpts = null;
        this.onChange();
      } else if (opts.autoReframe) {
        this.batchReframeTimer += dt;
        if (this.batchReframeTimer >= 0.6) {
          this.batchReframeTimer = 0;
          this.reframe(this.otherPositions([]));
        }
      }
    }

    this.declump(dt);

    // Movimiento tipo browniano — pedido explícito del usuario ("cada
    // partícula tiene su ritmo y dirección, no todas sincronizadas").
    // Oscila alrededor de `home`, nunca lo reemplaza, y con amplitud
    // acotada a una fracción del radio (ver DEFAULT_CONFIG.movement):
    // a cualquier escala (incluidas las ~25,000 partículas del cubo
    // real) cada una se queda dentro de su propio espacio, así que
    // nunca hace falta comparar contra las demás para evitar choques.
    // `rec.renderPos` es la única fuente de verdad de "dónde está esta
    // partícula ahora" — se escribe siempre, sin importar el nivel; la
    // malla individual copia de ahí, la instanciada escribe su matriz
    // (una sola llamada a `markMatrixDirty()` al final, no una por
    // partícula — con miles de instancias eso sí se nota en vivo).
    let anyInstancedMoved = false;
    for (const rec of this.particles.values()) {
      if (this.lockedIds.has(rec.id)) continue;
      const drift = rec.drift;
      const v = DEFAULT_CONFIG.movement.verticalDamping;
      const s = this.movementSpeed;
      const amp = drift.amp * this.movementIntensity;
      rec.renderPos.set(
        rec.home.x + Math.sin(this.time * drift.freq.x * s + drift.phase.x) * amp,
        rec.home.y + Math.sin(this.time * drift.freq.y * s + drift.phase.y) * amp * v,
        rec.home.z + Math.sin(this.time * drift.freq.z * s + drift.phase.z) * amp,
      );
      if (rec.mesh) {
        rec.mesh.position.copy(rec.renderPos);
      } else if (rec.instanceSlot !== null && this.particleStyle !== "liquid" && this.instancedField) {
        // En modo líquido la CPU NO escribe matrices por cuadro — la
        // deriva va en el vertex shader del material (ver
        // liquidParticle.ts); sólo `setTime` al final del tick.
        this.instancedField.setPosition(rec.instanceSlot, rec.renderPos);
        anyInstancedMoved = true;
      }
    }
    if (anyInstancedMoved && this.instancedField) {
      this.instancedField.markMatrixDirty();
    }
    if (this.liquidField) {
      this.liquidField.setTime(this.time);
    }

    if (this.connectorEnabled && this.particles.size >= 2) {
      const id = this.targetId();
      const neighborId = id !== null ? this.nearestTo(id) : null;
      if (id !== null && neighborId !== null) {
        if (!this.connector) {
          const rec = this.particles.get(id)!;
          this.connector = CONNECTOR_STYLES[this.connectorStyleKey].create(this.scene, rec.baseColor);
        }
        const a = this.particles.get(id)!.renderPos;
        const b = this.particles.get(neighborId)!.renderPos;
        this.connector.update(dt, a, b);
      }
    } else if (this.connector) {
      this.connector.dispose(this.scene);
      this.connector = null;
    }
  }
}
