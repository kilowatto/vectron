import * as THREE from "three/webgpu";
import { createHeroParticle, nextColor } from "./heroParticle";
import { BIRTH_VARIANTS } from "./animations/birth";
import { DIVISION_VARIANTS } from "./animations/division";
import { UNION_VARIANTS } from "./animations/union";
import { DEATH_VARIANTS } from "./animations/death";
import { CONNECTOR_STYLES, type Connector } from "./connectorLines";
import type { Animation } from "./effects";

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

  onChange: () => void = () => {};

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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
    this.particles.set(id, { id, mesh });
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
    this.onChange();
    const anim = variant(this.scene, mesh, pos, color, duration);
    this.activeAnimations.push(
      onFinish(anim, () => {
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

    const angle = Math.random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(angle), (Math.random() - 0.5) * 0.4, Math.sin(angle));
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
    this.busy = true;
    this.onChange();

    let finished = false;
    const anim = variant(this.scene, rec.mesh, childA, childB, posA, posB, duration, () => {
      if (finished) return;
      finished = true;
      this.mostRecentId = idB;
      this.busy = false;
      void idA;
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
    const resultPos = new THREE.Vector3().lerpVectors(recA.mesh.position, recB.mesh.position, 0.5);
    const result = createHeroParticle(blended);
    result.position.copy(resultPos);
    result.scale.setScalar(0.001);

    this.unregister(id);
    this.unregister(neighborId);
    this.busy = true;
    this.onChange();

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

  tick(dt: number) {
    this.activeAnimations = this.activeAnimations.filter((a) => a.update(dt));

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
