import * as THREE from "three/webgpu";
import { type Animation, combine, sequence, tween, spawnFlash, spawnMotes, spawnShatter } from "../effects";
import { easeInCubic, easeOutCubic, pulse } from "../easing";

export type DeathVariant = (scene: THREE.Object3D, mesh: THREE.Mesh, color: number, duration: number, onDone: () => void) => Animation;

function removeMesh(scene: THREE.Object3D, mesh: THREE.Mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
}

/** Se infla un poco y "revienta": el material gana iridiscencia hacia
 * el final (guiño a la pompa de jabón real) mientras se expande y se
 * desvanece de golpe. */
function burbuja(scene: THREE.Object3D, mesh: THREE.Mesh, _color: number, duration: number, onDone: () => void): Animation {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.transparent = true;
  return sequence(
    tween(duration * 0.35, easeOutCubic, (eased) => mesh.scale.setScalar(1 + eased * 0.25)),
    tween(
      duration * 0.65,
      easeOutCubic,
      (eased) => {
        mesh.scale.setScalar(1.25 + eased * 2.5);
        mat.opacity = 1 - eased;
        mat.iridescence = Math.min(1, 0.55 + eased * 0.6);
      },
      () => {
        removeMesh(scene, mesh);
        onDone();
      },
    ),
  );
}

/** Se desintegra en motas que se dispersan lento y se desvanecen —
 * sin golpe brusco, más melancólico que la burbuja. */
function disolucion(scene: THREE.Object3D, mesh: THREE.Mesh, color: number, duration: number, onDone: () => void): Animation {
  const pos = mesh.position.clone();
  removeMesh(scene, mesh);
  return spawnMotesUntilDone(scene, pos, color, 16, 1.1, duration, "out", onDone);
}

/** Se contrae hacia su propio centro hasta desaparecer en un punto —
 * lo opuesto visual a la burbuja. */
function colapso(scene: THREE.Object3D, mesh: THREE.Mesh, _color: number, duration: number, onDone: () => void): Animation {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.transparent = true;
  return tween(
    duration,
    easeInCubic,
    (eased) => {
      mesh.scale.setScalar(Math.max(1 - eased, 0.001));
      mat.opacity = 1 - eased * 0.4;
    },
    () => {
      removeMesh(scene, mesh);
      onDone();
    },
  );
}

/** Brilla intensamente (pico de emisivo/bloom) como sobrecalentándose,
 * y luego se apaga hasta desaparecer. */
function combustion(scene: THREE.Object3D, mesh: THREE.Mesh, color: number, duration: number, onDone: () => void): Animation {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.transparent = true;
  const flash = spawnFlash(scene, mesh.position.clone(), color, duration * 0.4, 0.6);
  const burn = sequence(
    tween(duration * 0.3, easeOutCubic, (eased) => {
      mat.emissiveIntensity = 0.22 + eased * 3;
    }),
    tween(
      duration * 0.7,
      easeInCubic,
      (eased) => {
        mat.emissiveIntensity = Math.max(3.22 * (1 - eased), 0);
        mat.opacity = 1 - eased;
        mesh.scale.setScalar(1 - eased * 0.3);
      },
      () => {
        removeMesh(scene, mesh);
        onDone();
      },
    ),
  );
  return combine(flash, burn);
}

/** Se rompe en fragmentos angulares tipo cristal, despedidos con
 * rotación — más violento/frágil que la burbuja. */
function fragmentacion(scene: THREE.Object3D, mesh: THREE.Mesh, color: number, duration: number, onDone: () => void): Animation {
  const pos = mesh.position.clone();
  removeMesh(scene, mesh);
  return spawnShatterUntilDone(scene, pos, color, 10, 1.8, duration, onDone);
}

/** Simplemente se desvanece en el lugar — la más minimalista/silenciosa. */
function desvanecimientoEspectral(scene: THREE.Object3D, mesh: THREE.Mesh, _color: number, duration: number, onDone: () => void): Animation {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.transparent = true;
  return tween(
    duration,
    (t) => t,
    (_eased, linear) => {
      mat.opacity = 1 - linear;
      mesh.scale.setScalar(1 - linear * 0.15);
    },
    () => {
      removeMesh(scene, mesh);
      onDone();
    },
  );
}

/** Pulsa 2-3 veces cada vez más débil, como un latido que se apaga,
 * antes de desaparecer en el último pulso. */
function ultimaPulsacion(scene: THREE.Object3D, mesh: THREE.Mesh, _color: number, duration: number, onDone: () => void): Animation {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.transparent = true;
  const pulseCount = 3;
  return tween(
    duration,
    (t) => t,
    (_eased, linear) => {
      const decay = 1 - linear;
      const wobble = pulse((linear * pulseCount) % 1) * decay;
      mesh.scale.setScalar(1 + wobble * 0.35);
      mat.opacity = decay;
    },
    () => {
      removeMesh(scene, mesh);
      onDone();
    },
  );
}

function spawnMotesUntilDone(
  scene: THREE.Object3D,
  pos: THREE.Vector3,
  color: number,
  count: number,
  radius: number,
  duration: number,
  direction: "in" | "out",
  onDone: () => void,
): Animation {
  const inner = spawnMotes(scene, pos, color, count, radius, duration, direction);
  let fired = false;
  return {
    update(dt) {
      const alive = inner.update(dt);
      if (!alive && !fired) {
        fired = true;
        onDone();
      }
      return alive;
    },
  };
}

function spawnShatterUntilDone(
  scene: THREE.Object3D,
  pos: THREE.Vector3,
  color: number,
  count: number,
  speed: number,
  duration: number,
  onDone: () => void,
): Animation {
  const inner = spawnShatter(scene, pos, color, count, speed, duration);
  let fired = false;
  return {
    update(dt) {
      const alive = inner.update(dt);
      if (!alive && !fired) {
        fired = true;
        onDone();
      }
      return alive;
    },
  };
}

export const DEATH_VARIANTS: Record<string, { label: string; run: DeathVariant }> = {
  burbuja: { label: "Burbuja", run: burbuja },
  disolucion: { label: "Disolución", run: disolucion },
  colapso: { label: "Colapso (implosión)", run: colapso },
  combustion: { label: "Combustión", run: combustion },
  fragmentacion: { label: "Fragmentación", run: fragmentacion },
  espectral: { label: "Desvanecimiento espectral", run: desvanecimientoEspectral },
  pulsacion: { label: "Última pulsación", run: ultimaPulsacion },
};
