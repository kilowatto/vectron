import * as THREE from "three/webgpu";
import { type Animation, combine, sequence, tween, spawnFlash, spawnExpandingRing, spawnMotes, wait } from "../effects";
import { easeOutBack, easeOutCubic, easeInOutCubic } from "../easing";

/** Cada variante recibe la malla YA creada (escala 0, ya en `scene`,
 * ya posicionada) y decide cómo revelarla en `duration` segundos. No
 * crea ni destruye la malla principal — sólo la anima y puede sumar
 * efectos transitorios alrededor. */
export type BirthVariant = (scene: THREE.Object3D, mesh: THREE.Mesh, position: THREE.Vector3, color: number, duration: number) => Animation;

function fundido(_scene: THREE.Object3D, mesh: THREE.Mesh, _pos: THREE.Vector3, _color: number, duration: number): Animation {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.transparent = true;
  return tween(duration, easeOutCubic, (eased) => {
    mesh.scale.setScalar(eased);
    mat.opacity = eased;
  });
}

function estallidoDeEnergia(scene: THREE.Object3D, mesh: THREE.Mesh, pos: THREE.Vector3, color: number, duration: number): Animation {
  const flash = spawnFlash(scene, pos, color, duration * 0.7, 0.9);
  const grow = tween(duration, easeOutCubic, (eased) => mesh.scale.setScalar(eased));
  return combine(flash, grow);
}

function condensacion(scene: THREE.Object3D, mesh: THREE.Mesh, pos: THREE.Vector3, color: number, duration: number): Animation {
  const motes = spawnMotes(scene, pos, color, 14, 0.9, duration * 0.75, "in");
  const grow = sequence(
    wait(duration * 0.35),
    tween(duration * 0.65, easeOutCubic, (eased) => mesh.scale.setScalar(eased)),
  );
  return combine(motes, grow);
}

function germinacion(_scene: THREE.Object3D, mesh: THREE.Mesh, _pos: THREE.Vector3, _color: number, duration: number): Animation {
  return tween(duration, easeOutBack, (eased) => mesh.scale.setScalar(Math.max(eased, 0)));
}

function parpadeoCuantico(_scene: THREE.Object3D, mesh: THREE.Mesh, _pos: THREE.Vector3, _color: number, duration: number): Animation {
  const flickerPhase = duration * 0.6;
  return tween(duration, (t) => t, (_eased, linear) => {
    if (linear < flickerPhase / duration) {
      const flicker = Math.sin(linear * 40) > 0 ? 1 : 0.15;
      mesh.scale.setScalar(flicker);
    } else {
      const settleT = (linear - flickerPhase / duration) / (1 - flickerPhase / duration);
      mesh.scale.setScalar(0.15 + easeOutCubic(settleT) * 0.85);
    }
  });
}

function anilloExpansivo(scene: THREE.Object3D, mesh: THREE.Mesh, pos: THREE.Vector3, color: number, duration: number): Animation {
  const ring = spawnExpandingRing(scene, pos, color, 1.6, duration);
  const grow = tween(duration, easeOutCubic, (eased) => mesh.scale.setScalar(eased));
  return combine(ring, grow);
}

function ascenso(_scene: THREE.Object3D, mesh: THREE.Mesh, pos: THREE.Vector3, _color: number, duration: number): Animation {
  const startY = pos.y - 0.5;
  return tween(duration, easeInOutCubic, (eased) => {
    mesh.scale.setScalar(eased);
    mesh.position.y = startY + (pos.y - startY) * Math.min(eased * 1.15, 1);
  });
}

export const BIRTH_VARIANTS: Record<string, { label: string; run: BirthVariant }> = {
  fundido: { label: "Fundido", run: fundido },
  estallido: { label: "Estallido de energía", run: estallidoDeEnergia },
  condensacion: { label: "Condensación", run: condensacion },
  germinacion: { label: "Germinación", run: germinacion },
  parpadeo: { label: "Parpadeo cuántico", run: parpadeoCuantico },
  anillo: { label: "Anillo expansivo", run: anilloExpansivo },
  ascenso: { label: "Ascenso", run: ascenso },
};
