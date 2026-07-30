import * as THREE from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { ContextRole, ContextSnapshot } from "../intermediate/contextController";

/**
 * Cámara de Contexto 3D — DOCs/13-intermedio-3d-journey-implementation.md
 * §6-§9, Phase 2 MVP. Vidrio + agua + gotas instanciadas, "fake fluid"
 * DECLARADO (§7.3: el estado que hay que enseñar es determinista —
 * conteo exacto, turnos exactos — una simulación de fluido real no
 * mejora eso, sólo cuesta más). El nivel/color/eviction que se ve aquí
 * viene DIRECTO de `ContextSnapshot` — ni este módulo ni `vx-context-lab`
 * calculan overflow por su cuenta (doc §5.2 "neither calculates overflow
 * independently").
 *
 * Simplificaciones deliberadas de este primer corte (documentadas, no
 * escondidas):
 * - Sin animación de ingreso/expulsión por gota (`playIngress` etc. del
 *   doc) — el snapshot nuevo se dibuja de una vez. Pulir después.
 * - Superficie con oleaje real (CPU, dos senos) pero las gotas no
 *   flotan por turno — se re-distribuyen (con semilla estable por id,
 *   sin popping visual en la MISMA gota mientras exista).
 * - Cápsula de resumen (Fase 3, compactación) no vive aquí todavía.
 */

export type RenderQuality = "high" | "low";

const VESSEL_RADIUS = 0.5;
const VESSEL_HEIGHT = 1.3;
const MAX_DROPS: Record<RenderQuality, number> = { high: 64, low: 28 };
const SURFACE_SEGMENTS: Record<RenderQuality, number> = { high: 56, low: 24 };
const RIPPLE_MAX_AMPLITUDE = VESSEL_HEIGHT * 0.02; // doc §8.4: <2% de la altura, para no tapar el medidor

const ROLE_COLOR: Record<ContextRole, number> = {
  system: 0x7c8890,
  user: 0xd98a34,
  assistant: 0x4fb8c4,
  tool: 0x9a6fd9,
  retrieval: 0x39ff6a,
  summary: 0xffe066,
};

/** Hash estable [0,1) por id — para que la misma gota no "salte" de lugar entre renders mientras exista. */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

export interface ContextChamber3D {
  group: THREE.Group;
  setSnapshot(snapshot: ContextSnapshot, capacity: number, responseReserve: number): void;
  setQuality(quality: RenderQuality): void;
  /** Doc §10 — escala del vessel (no del fill) por raíz cúbica de la
   * razón de capacidad; 1 = tamaño del lab (500). Deja la silueta
   * fantasma del lab visible como referencia cuando scale !== 1. */
  setCapacityScale(scale: number): void;
  /** D5 · posición MUNDIAL de la gota menos fiable (la del medio) y de
   * la más fiable, para colgarles una etiqueta anclada. null cuando hay
   * menos de 3 turnos: sin medio no hay curva U que señalar. */
  recallAnchors(): { worst: THREE.Vector3; best: THREE.Vector3 } | null;
  update(dt: number): void;
  dispose(): void;
}

/** Doc §10: `linearCapacityScale(capacity) = cbrt(capacity / 500)`. */
export function linearCapacityScale(capacity: number, labCapacity = 500): number {
  return Math.cbrt(capacity / labCapacity);
}

export function createContextChamber(
  renderer: THREE.WebGPURenderer,
  initialQuality: RenderQuality = "high",
): ContextChamber3D {
  const group = new THREE.Group();
  group.name = "contextChamber";

  let quality: RenderQuality = initialQuality;
  let envTexture: THREE.Texture | null = null;

  function buildEnv(): THREE.Texture {
    // DOCs/13 §8.1 — textura de entorno SÓLO para los materiales de esta
    // cámara, no para toda la escena semántica (no queremos que el
    // cubo de partículas cambie de iluminación de golpe).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const texture = pmrem.fromScene(room).texture;
    pmrem.dispose();
    return texture;
  }

  function vesselMaterial(q: RenderQuality): THREE.Material {
    if (q === "high") {
      if (!envTexture) envTexture = buildEnv();
      // NOTA (encontrado probando en vivo, Phase 2): `transmission` en
      // MeshPhysicalMaterial depende del paso especial "render lo de
      // detrás a una textura" que renderer.render(scene,camera) hace
      // automático — este engine usa un THREE.RenderPipeline (TSL) a
      // medida (ver engine.ts, por el bloom), que NO dispara ese paso:
      // con transmission>0 el vidrio salía invisible. `opacity` +
      // blending normal sí funciona con este pipeline. Volver a
      // transmission real es trabajo de Phase 6 (pulido), con un nodo
      // TSL de refracción a medida o un pase de render adicional.
      return new THREE.MeshPhysicalMaterial({
        color: 0xd9edf0,
        transparent: true,
        opacity: 0.22,
        roughness: 0.04,
        metalness: 0.05,
        envMap: envTexture,
        envMapIntensity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    }
    // Low/WebGL/móvil (doc §8.2): sin transmission — translucidez plana,
    // barata. Un término de Fresnel real via TSL queda para pulido
    // posterior (§17 presupuestos); esto ya cumple el requisito
    // funcional (sin passthrough de transmisión, instancias reducidas).
    return new THREE.MeshBasicMaterial({
      color: 0xd9edf0,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  function waterMaterial(q: RenderQuality): THREE.Material {
    if (q === "high") {
      if (!envTexture) envTexture = buildEnv();
      // Mismo hallazgo que vesselMaterial: transmission real no
      // renderiza en este RenderPipeline — opacity + color de atenuación
      // aproximado a mano (mezclado en el color base) hace el trabajo.
      return new THREE.MeshPhysicalMaterial({
        color: 0x1f8fa3,
        transparent: true,
        opacity: 0.68,
        roughness: 0.08,
        metalness: 0,
        envMap: envTexture,
        envMapIntensity: 0.4,
        depthWrite: false,
      });
    }
    return new THREE.MeshBasicMaterial({
      color: 0x1f8fa3,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
  }

  // --- Vessel (vidrio) ---
  const vesselGeometry = new THREE.CylinderGeometry(
    VESSEL_RADIUS,
    VESSEL_RADIUS * 0.92,
    VESSEL_HEIGHT,
    32,
    1,
    true,
  );
  const vessel = new THREE.Mesh(vesselGeometry, vesselMaterial(quality));
  vessel.renderOrder = 5; // doc §8.7: vidrio se dibuja AL FINAL de lo transparente
  group.add(vessel);

  // --- Silueta fantasma (doc §10, "wow" de escala) — el vessel de 500
  // tokens de referencia, SIN escalar, visible sólo cuando `group` se
  // escala a un perfil de capacidad más grande (contra-escalada para
  // quedarse en su tamaño original mientras el resto del grupo crece). ---
  const ghostVessel = new THREE.LineSegments(
    new THREE.EdgesGeometry(vesselGeometry),
    new THREE.LineBasicMaterial({ color: 0xd98a34, transparent: true, opacity: 0.35 }),
  );
  ghostVessel.visible = false;
  group.add(ghostVessel);

  // --- Liquid volume (agua) — altura unitaria, escalada en Y según fill ---
  const liquidGeometry = new THREE.CylinderGeometry(VESSEL_RADIUS * 0.9, VESSEL_RADIUS * 0.9, 1, 32);
  liquidGeometry.translate(0, 0.5, 0); // pivote en la base, para escalar hacia arriba desde el fondo
  const liquid = new THREE.Mesh(liquidGeometry, waterMaterial(quality));
  liquid.renderOrder = 2;
  liquid.position.y = -VESSEL_HEIGHT / 2;
  liquid.scale.y = 0.0001;
  group.add(liquid);

  // --- Liquid surface (oleaje CPU, doc §8.4) ---
  const surfaceGeometry = new THREE.CircleGeometry(VESSEL_RADIUS * 0.9, SURFACE_SEGMENTS[quality]);
  surfaceGeometry.rotateX(-Math.PI / 2);
  const surfaceBasePositions = Float32Array.from(surfaceGeometry.attributes.position.array);
  const surface = new THREE.Mesh(surfaceGeometry, waterMaterial(quality));
  surface.renderOrder = 4;
  surface.position.y = -VESSEL_HEIGHT / 2;
  group.add(surface);

  // --- Token drops (doc §8.5 sugiere InstancedMesh; encontrado probando
  // en vivo que InstancedMesh NO se dibuja con el THREE.RenderPipeline
  // TSL a medida de este engine — pass()/bloom no reproducen su camino
  // de render. Un pool de Mesh normales sí funciona y a ≤64 objetos
  // pequeños con geometría COMPARTIDA es barato de sobra para el MVP;
  // volver a instancing real es candidato de pulido para Phase 6 si el
  // presupuesto de draw calls lo pide.)
  /** Piso de la curva U de recuperación (ver el bloque D4 en
   * setSnapshot). 0.35 y no 0: el turno del medio SIGUE en la ventana y
   * apagarlo del todo enseñaría que se borra, que es otra idea
   * equivocada. Lo que pierde es fiabilidad, no existencia. */
  const LOST_MIDDLE_FLOOR = 0.35;

  const dropGeometry = new THREE.IcosahedronGeometry(0.045, 0);
  let dropPool: THREE.Mesh[] = [];

  function buildDropPool(q: RenderQuality) {
    dropPool.forEach((mesh) => {
      group.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    });
    dropPool = Array.from({ length: MAX_DROPS[q] }, () => {
      // Sin luces en esta escena (ver nota abajo) — básico, no PBR.
      const mesh = new THREE.Mesh(dropGeometry, new THREE.MeshBasicMaterial({ toneMapped: false }));
      mesh.visible = false;
      mesh.renderOrder = 3;
      group.add(mesh);
      return mesh;
    });
  }
  buildDropPool(quality);

  let time = 0;
  let fillFraction = 0;

  function setQuality(next: RenderQuality) {
    if (next === quality) return;
    quality = next;
    vessel.material = vesselMaterial(quality);
    liquid.material = waterMaterial(quality);
    surface.material = waterMaterial(quality);
    buildDropPool(quality);
  }

  function setSnapshot(snapshot: ContextSnapshot, capacity: number, responseReserve: number) {
    const budget = Math.max(1, capacity - responseReserve);
    fillFraction = Math.min(1, snapshot.used / budget);
    liquid.scale.y = Math.max(0.0001, fillFraction * VESSEL_HEIGHT);
    surface.position.y = -VESSEL_HEIGHT / 2 + fillFraction * VESSEL_HEIGHT;

    // FIFO ya deja `activeTurns` en orden cronológico (más viejo primero,
    // ver contextController.ts) — mostramos las más RECIENTES si hay más
    // turnos que gotas visibles, mismo criterio que la cinta del DOM.
    const visible = snapshot.activeTurns.slice(-dropPool.length);
    liveDrops = visible.map((_, i) => i);
    const liquidTop = surface.position.y;
    const liquidBottom = -VESSEL_HEIGHT / 2;

    dropPool.forEach((mesh, i) => {
      const turn = visible[i];
      if (!turn) {
        mesh.visible = false;
        return;
      }
      const seed = hash01(turn.id);
      const seed2 = hash01(turn.id + "#");
      const angle = seed * Math.PI * 2;
      const r = Math.sqrt(seed2) * VESSEL_RADIUS * 0.7;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = liquidBottom + hash01(turn.id + "y") * Math.max(0.02, liquidTop - liquidBottom - 0.05) + 0.03;
      const scale = 0.6 + Math.min(1.2, Math.sqrt(turn.tokens.length) / 6);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mesh.visible = true;

      // D4 · LOST IN THE MIDDLE (`16` R-7; Liu et al., TACL 2024).
      // Los modelos recuperan información del MEDIO de un contexto largo
      // de forma medible menos fiable que de los extremos — la curva es
      // una U. Hasta ahora la cámara mostraba todos los turnos igual de
      // brillantes, y eso enseñaba justo lo contrario de lo que dice la
      // literatura: que estar dentro de la ventana basta.
      //
      // La atenuación es por POSICIÓN dentro de la ventana, no por edad
      // ni por tamaño: el primero y el último se ven al 100 %, el del
      // medio cae al mínimo. Con 1 o 2 turnos no se atenúa nada — una U
      // necesita un medio para tenerlo.
      const n = visible.length;
      let recall = 1;
      if (n > 2) {
        const t01 = i / (n - 1); // 0 = más viejo, 1 = más reciente
        // |2t-1| es la U: 1 en los bordes, 0 en el centro.
        const edge = Math.abs(2 * t01 - 1);
        recall = LOST_MIDDLE_FLOOR + (1 - LOST_MIDDLE_FLOOR) * edge;
      }
      const base = new THREE.Color(ROLE_COLOR[turn.role] ?? 0xffffff);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(base).multiplyScalar(recall);
    });
  }

  /** Índices vivos del pool en el último snapshot, en orden cronológico
   * — los necesita recallAnchors para saber cuál es "el del medio". */
  let liveDrops: number[] = [];

  function recallAnchors(): { worst: THREE.Vector3; best: THREE.Vector3 } | null {
    if (liveDrops.length < 3) return null;
    const mid = dropPool[liveDrops[Math.floor(liveDrops.length / 2)]];
    const edge = dropPool[liveDrops[liveDrops.length - 1]];
    if (!mid || !edge) return null;
    // Mundial, no local: el grupo se escala con la capacidad
    // (setCapacityScale), así que la posición local del mesh no sirve
    // para proyectar a pantalla.
    return {
      worst: mid.getWorldPosition(new THREE.Vector3()),
      best: edge.getWorldPosition(new THREE.Vector3()),
    };
  }

  function setCapacityScale(scale: number) {
    group.scale.setScalar(scale);
    const isReference = Math.abs(scale - 1) < 0.01;
    ghostVessel.visible = !isReference;
    ghostVessel.scale.setScalar(1 / scale);
  }

  function update(dt: number) {
    time += dt;
    const pos = surface.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = surfaceBasePositions[i];
      const z = surfaceBasePositions[i + 2];
      const ripple =
        Math.sin(x * 6 + time * 1.6) * 0.5 + Math.sin(z * 5 - time * 1.1) * 0.5;
      arr[i + 1] = ripple * RIPPLE_MAX_AMPLITUDE * Math.max(0.05, fillFraction);
    }
    pos.needsUpdate = true;
  }

  function dispose() {
    vesselGeometry.dispose();
    liquidGeometry.dispose();
    surfaceGeometry.dispose();
    dropGeometry.dispose();
    ghostVessel.geometry.dispose();
    (ghostVessel.material as THREE.Material).dispose();
    vessel.material.dispose();
    (liquid.material as THREE.Material).dispose();
    (surface.material as THREE.Material).dispose();
    dropPool.forEach((mesh) => (mesh.material as THREE.Material).dispose());
    envTexture?.dispose();
  }

  return { group, setSnapshot, setQuality, setCapacityScale, recallAnchors, update, dispose };
}
