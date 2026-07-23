import * as THREE from "three/webgpu";
import { createHeroParticle, nextColor, bodyColorOf, type DriftParams } from "./heroParticle";
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
  private time = 0;
  /** ids cuya posición está siendo manejada por completo por una
   * animación activa (nacer/dividir) — el deriva browniano las salta
   * para no pelearse cuadro a cuadro con el tween que las mueve. No
   * hace falta para unión/muerte: esas partículas ya se desregistran
   * ANTES de arrancar la variante, así que `tick()` nunca las toca. */
  private lockedIds = new Set<number>();

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
    const desiredDistance = THREE.MathUtils.clamp((boundingRadius / Math.tan(fovRad / 2)) * 1.5, 0.9, 5.5);

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

  canBirth(): boolean {
    return !this.busy;
  }

  canDivide(): boolean {
    return !this.busy && this.particles.size >= 1;
  }

  canUnite(): boolean {
    return !this.busy && this.particles.size >= 2;
  }

  canDie(): boolean {
    return !this.busy && this.particles.size >= 2;
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

  /** Bug real visto en vivo (grabación de pantalla): el eje de división
   * se elegía con un ángulo totalmente al azar en 3D, sin ninguna
   * relación con hacia dónde mira la cámara. Cuando ese eje caía casi
   * paralelo a la línea de vista, las 2 mitades se separaban en
   * profundidad (una detrás de otra desde la cámara) — en pantalla se
   * proyectan una encima de la otra y TODO el proceso (mitosis o su
   * reverso, la fusión) se ve como una sola esfera que no hace nada,
   * aunque en 3D la separación sea perfectamente real. Restringir el
   * eje al plano PERPENDICULAR a la vista de la cámara (aleatorio sólo
   * en ese plano) garantiza que la separación siempre se lea como
   * movimiento lateral en pantalla, nunca como "hacia adentro/afuera". */
  private randomLateralAxis(): THREE.Vector3 {
    if (!this.camera || !this.controls) {
      const angle = Math.random() * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle), (Math.random() - 0.5) * 0.4, Math.sin(angle));
    }
    const viewDir = this.camera.position.clone().sub(this.controls.target).normalize();
    const arbitrary = Math.abs(viewDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(viewDir, arbitrary).normalize();
    const up = new THREE.Vector3().crossVectors(right, viewDir).normalize();
    const angle = Math.random() * Math.PI * 2;
    return right.multiplyScalar(Math.cos(angle)).add(up.multiplyScalar(Math.sin(angle))).normalize();
  }

  private randomSpawnPosition(): THREE.Vector3 {
    if (this.particles.size === 0) return new THREE.Vector3(0, 0, 0);
    const angle = Math.random() * Math.PI * 2;
    const tilt = (Math.random() - 0.5) * 0.6;
    const radius = 0.9 + Math.random() * 0.4;
    return new THREE.Vector3(Math.cos(angle) * radius, tilt, Math.sin(angle) * radius);
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
    const rec = this.particles.get(id)!;
    const variant = DIVISION_VARIANTS[variantKey]?.run ?? DIVISION_VARIANTS.espontanea.run;
    const origin = rec.mesh.position.clone();
    const color = (rec.mesh.userData.baseColor as number) ?? nextColor();

    const dir = this.randomLateralAxis();
    const separation = 0.55;
    const posA = origin.clone().addScaledVector(dir, separation);
    const posB = origin.clone().addScaledVector(dir, -separation);

    const childA = createHeroParticle(color);
    const childB = createHeroParticle(color);
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
    this.busy = true;
    this.onChange();
    this.reframe([...this.otherPositions([idA, idB]), posA, posB]);

    let finished = false;
    const anim = variant(this.scene, rec.mesh, childA, childB, posA, posB, duration, () => {
      if (finished) return;
      finished = true;
      this.mostRecentId = idB;
      this.busy = false;
      const recA = this.particles.get(idA);
      if (recA) recA.home.copy(posA);
      const recB = this.particles.get(idB);
      if (recB) recB.home.copy(posB);
      this.lockedIds.delete(idA);
      this.lockedIds.delete(idB);
      this.onChange();
    });
    this.activeAnimations.push(anim);
  }

  unite(variantKey: string, duration: number) {
    if (!this.canUnite()) return;
    const id = this.targetId();
    if (id === null) return;
    const neighborId = this.nearestTo(id);
    if (neighborId === null) return;
    const recA = this.particles.get(id)!;
    const recB = this.particles.get(neighborId)!;
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

    this.unregister(id);
    this.unregister(neighborId);
    this.busy = true;
    this.onChange();
    // Bug real visto en vivo ("parpadea" al unir): unregister ya quitó
    // A y B del mapa, así que otherPositions([]) ya NO los incluye —
    // reencuadrar sólo con resultPos (un punto) le da al cálculo de
    // radio un boundingRadius casi nulo, y la cámara SALTA a un zoom
    // extremo de golpe mientras A y B siguen viéndose separados en su
    // posición real. Pasando también sus posiciones actuales, el
    // reencuadre parte de un radio que sí las cubre y se cierra
    // gradualmente conforme de verdad se acercan, sin brinco.
    this.reframe([...this.otherPositions([]), posA, posB, resultPos]);

    let finished = false;
    const anim = variant(this.scene, recA.mesh, recB.mesh, result, resultPos, duration, () => {
      if (finished) return;
      finished = true;
      const resultId = this.register(result);
      this.mostRecentId = resultId;
      this.busy = false;
      this.onChange();
    });
    this.activeAnimations.push(anim);
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

  tick(dt: number) {
    this.time += dt;
    this.activeAnimations = this.activeAnimations.filter((a) => a.update(dt));

    if (this.cameraTween && !this.cameraTween.update(dt)) {
      this.cameraTween = null;
    }

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
      rec.mesh.position.set(
        rec.home.x + Math.sin(this.time * drift.freq.x + drift.phase.x) * drift.amp,
        rec.home.y + Math.sin(this.time * drift.freq.y + drift.phase.y) * drift.amp * v,
        rec.home.z + Math.sin(this.time * drift.freq.z + drift.phase.z) * drift.amp,
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
