import * as THREE from "three/webgpu";
import { createHeroParticle, nextColor, bodyColorOf, mutateHue, type DriftParams } from "./heroParticle";
import { BIRTH_VARIANTS } from "./animations/birth";
import { DIVISION_VARIANTS } from "./animations/division";
import { UNION_VARIANTS } from "./animations/union";
import { DEATH_VARIANTS } from "./animations/death";
import { CONNECTOR_STYLES, type Connector } from "./connectorLines";
import { tween, type Animation } from "./effects";
import { easeInOutCubic } from "./easing";
import { DEFAULT_CONFIG } from "./particulaConfig";

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

export interface ParticleRecord {
  id: number;
  mesh: THREE.Mesh;
  /** Posición de reposo — el deriva browniano oscila ALREDEDOR de
   * esto, nunca reemplaza la posición "real" de la partícula. Se
   * actualiza sólo cuando una animación termina y la partícula queda
   * quieta en su lugar definitivo (ver `lockedIds` en la clase). */
  home: THREE.Vector3;
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
    // Tope subido de 5.5 a 25 — bug real reportado en vivo ("no hace
    // zoom out para poder ver todo") con apenas 267 partículas: medido
    // con el stepper determinístico, un lote de 267 ya llega a
    // boundingRadius~3.8 (desiredDistance~12), y uno de 2000 a ~6.15
    // (desiredDistance~20) — muy por encima del tope anterior, así que
    // la cámara se quedaba pegada mucho más cerca de lo que el lote
    // necesitaba sin importar cuánto creciera la nube. El tope de 25
    // deja margen bajo `controlsMaxDistance`/`cameraFar` de
    // SceneOverrides en particula/main.ts (ver scene/engine.ts).
    const desiredDistance = THREE.MathUtils.clamp((boundingRadius / Math.tan(fovRad / 2)) * 1.5, 0.9, 25);

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
      .map((rec) => rec.mesh.position.clone());
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

  meshes(): THREE.Mesh[] {
    return Array.from(this.particles.values(), (p) => p.mesh);
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

  private register(mesh: THREE.Mesh): number {
    const id = this.nextId++;
    mesh.userData.particleId = id;
    this.particles.set(id, { id, mesh, home: mesh.position.clone() });
    return id;
  }

  private unregister(id: number) {
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
      const d = origin.mesh.position.distanceTo(rec.mesh.position);
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
      if (rec.mesh.position.distanceTo(pos) < minDist) return true;
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
      const radius = (rec.mesh.userData.baseRadius as number) ?? 0.32;
      s.r[i] = radius;
      if (radius > maxRadius) maxRadius = radius;
      // Partículas creadas antes de que existiera esta forma (ej. la
      // semilla inicial, sembrada directo en main.ts) no tienen
      // `brainDir` asignado — se calcula una vez aquí, a partir de su
      // dirección actual desde el origen, y se cachea en userData para
      // no repetir el cálculo cada cuadro.
      let brainDir = rec.mesh.userData.brainDir as THREE.Vector3 | undefined;
      if (!brainDir) {
        const fallbackDir = rec.home.lengthSq() > 1e-6 ? rec.home.clone().normalize() : this.randomIsotropicAxis();
        brainDir = computeBrainDir(fallbackDir);
        rec.mesh.userData.brainDir = brainDir;
      }
      s.brainDirX[i] = brainDir.x;
      s.brainDirY[i] = brainDir.y;
      s.brainDirZ[i] = brainDir.z;
      s.pushX[i] = 0;
      s.pushY[i] = 0;
      s.pushZ[i] = 0;
      i++;
    }

    const cellSize = maxRadius * 2 * 1.1;
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
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const arr = cells.get(keyOf(cx[a] + dx, cy[a] + dy, cz[a] + dz));
            if (!arr) continue;
            for (const b of arr) {
              if (b <= a) continue;
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
      let cxSum = 0;
      let cySum = 0;
      let czSum = 0;
      for (let k = 0; k < n; k++) {
        cxSum += s.px[k];
        cySum += s.py[k];
        czSum += s.pz[k];
      }
      const centroidX = cxSum / n;
      const centroidY = cySum / n;
      const centroidZ = czSum / n;
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
        // una vez y jalando sólo hacia `centroid + brainDir*dist`
        // (dist = distancia ACTUAL, no escalada), cada partícula sólo
        // rota angularmente hacia su propio destino fijo — estable,
        // sin realimentación.
        const dx = s.brainDirX[k];
        const dy = s.brainDirY[k];
        const dz = s.brainDirZ[k];
        const ox = s.px[k] - centroidX;
        const oy = s.py[k] - centroidY;
        const oz = s.pz[k] - centroidZ;
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const targetX = centroidX + dx * dist;
        const targetY = centroidY + dy * dist;
        const targetZ = centroidZ + dz * dist;
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
    const variant = BIRTH_VARIANTS[variantKey]?.run ?? BIRTH_VARIANTS.fundido.run;
    const color = nextColor();
    const mesh = createHeroParticle(color);
    const pos = this.randomSpawnPosition();
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
  private startDivide(id: number, variantKey: string, duration: number, onComplete: (idA: number, idB: number) => void, opts: { reframe?: boolean } = {}): boolean {
    const rec = this.particles.get(id);
    if (!rec) return false;
    const variant = DIVISION_VARIANTS[variantKey]?.run ?? DIVISION_VARIANTS.espontanea.run;
    const origin = rec.mesh.position.clone();
    const parentColor = (rec.mesh.userData.baseColor as number) ?? nextColor();

    const parentRadius = (rec.mesh.userData.baseRadius as number) ?? 0.32;
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

    // Pedido explícito del usuario: "cada partícula al dividirse tenga
    // otro color pero muy sutil, otro tono en camino a cambiar de
    // color" — cada hija muta el tono del padre por su cuenta (ver
    // mutateHue en heroParticle.ts), así A y B también divergen entre
    // sí, no sólo del padre. `this.mutationDeg` (ver DEFAULT_CONFIG.
    // color.mutationDeg).
    // Signo FIJO por hija (A:+1, B:-1), no al azar cada una — bug real
    // reportado en vivo con un lote de 267 ("no pasa a colores
    // cálidos, le faltan muchos colores"): con signo random
    // independiente por hija, la mitad de las divisiones mandan A y B
    // para el MISMO lado, cancelando el avance — la caminata de la
    // población entera no tiene sesgo neto y difunde muy lento
    // (sqrt(generaciones)), nunca garantizado a llegar lejos del
    // semilla. Con signo fijo, la rama que siempre hereda "+" (o
    // siempre "-") acumula magnitud SIEMPRE en la misma dirección
    // (lineal en generaciones) — ver el comentario de `mutateHue`.
    const colorA = mutateHue(parentColor, this.mutationDeg, 1);
    const colorB = mutateHue(parentColor, this.mutationDeg, -1);
    const childA = createHeroParticle(colorA);
    const childB = createHeroParticle(colorB);
    childA.position.copy(origin);
    childB.position.copy(origin);
    childA.scale.setScalar(0.001);
    childB.scale.setScalar(0.001);
    this.scene.add(childA, childB);

    this.unregister(id);
    const idA = this.register(childA);
    const idB = this.register(childB);
    this.lockedIds.add(idA);
    this.lockedIds.add(idB);
    if (opts.reframe ?? true) {
      this.reframe([...this.otherPositions([idA, idB]), posA, posB]);
    }

    let finished = false;
    const anim = variant(this.scene, rec.mesh, childA, childB, posA, posB, duration, () => {
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
    const variant = UNION_VARIANTS[variantKey]?.run ?? UNION_VARIANTS.gravitacional.run;

    const colorA = (recA.mesh.userData.baseColor as number) ?? 0xffffff;
    const colorB = (recB.mesh.userData.baseColor as number) ?? 0xffffff;
    const blended = new THREE.Color(colorA).lerp(new THREE.Color(colorB), 0.5).getHex();
    const posA = recA.mesh.position.clone();
    const posB = recB.mesh.position.clone();
    const resultPos = new THREE.Vector3().lerpVectors(posA, posB, 0.5);
    const result = createHeroParticle(blended);
    result.position.copy(resultPos);
    result.scale.setScalar(0.001);

    this.unregister(idA);
    this.unregister(idB);
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

    let finished = false;
    const anim = variant(this.scene, recA.mesh, recB.mesh, result, resultPos, duration, () => {
      if (finished) return;
      finished = true;
      const resultId = this.register(result);
      onComplete(resultId);
    });
    this.activeAnimations.push(anim);
    return true;
  }

  die(variantKey: string, duration: number) {
    if (!this.canDie()) return;
    const id = this.targetId();
    if (id === null) return;
    const rec = this.particles.get(id)!;
    const variant = DEATH_VARIANTS[variantKey]?.run ?? DEATH_VARIANTS.burbuja.run;
    const color = (rec.mesh.userData.baseColor as number) ?? 0xffffff;

    this.unregister(id);
    this.busy = true;
    this.onChange();
    this.reframe(this.otherPositions([]));

    let finished = false;
    const anim = variant(this.scene, rec.mesh, color, duration, () => {
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
    if (!rec) return null;
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
    rec.mesh.userData.baseColor = color.getHex();
  }

  setSelectedEmissiveIntensity(value: number) {
    if (this.selectedId === null) return;
    const rec = this.particles.get(this.selectedId);
    if (!rec) return;
    (rec.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = value;
  }

  /** Multiplicador global sobre la frecuencia del deriva de TODAS las
   * partículas — 0 las congela, >1 las acelera. No reemplaza la
   * frecuencia propia de cada una (ver DriftParams), sólo la escala. */
  setMovementSpeed(value: number) {
    this.movementSpeed = value;
  }

  /** Multiplicador global sobre la amplitud del deriva — 0 las deja
   * quietas en su `home` exacto, >1 las hace vibrar más lejos. */
  setMovementIntensity(value: number) {
    this.movementIntensity = value;
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
      const posA = this.particles.get(idA)!.mesh.position;
      let bestId: number | null = null;
      let bestDist = Infinity;
      for (const otherId of eligible) {
        const d = posA.distanceTo(this.particles.get(otherId)!.mesh.position);
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
    for (const rec of this.particles.values()) {
      if (this.lockedIds.has(rec.id)) continue;
      const drift = rec.mesh.userData.drift as DriftParams | undefined;
      if (!drift) continue;
      const v = DEFAULT_CONFIG.movement.verticalDamping;
      const s = this.movementSpeed;
      const amp = drift.amp * this.movementIntensity;
      rec.mesh.position.set(
        rec.home.x + Math.sin(this.time * drift.freq.x * s + drift.phase.x) * amp,
        rec.home.y + Math.sin(this.time * drift.freq.y * s + drift.phase.y) * amp * v,
        rec.home.z + Math.sin(this.time * drift.freq.z * s + drift.phase.z) * amp,
      );
    }

    if (this.connectorEnabled && this.particles.size >= 2) {
      const id = this.targetId();
      const neighborId = id !== null ? this.nearestTo(id) : null;
      if (id !== null && neighborId !== null) {
        if (!this.connector) {
          const rec = this.particles.get(id)!;
          const color = (rec.mesh.userData.baseColor as number) ?? 0xffffff;
          this.connector = CONNECTOR_STYLES[this.connectorStyleKey].create(this.scene, color);
        }
        const a = this.particles.get(id)!.mesh.position;
        const b = this.particles.get(neighborId)!.mesh.position;
        this.connector.update(dt, a, b);
      }
    } else if (this.connector) {
      this.connector.dispose(this.scene);
      this.connector = null;
    }
  }
}
