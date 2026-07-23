import * as THREE from "three/webgpu";

/** Contrato común de toda animación del playground — el loop en
 * main.ts sólo sabe llamar `update(dt)` y descartar la que devuelva
 * false. Cada variante (nacimiento/división/unión/muerte) y cada
 * efecto transitorio (chispas, anillos, motas) implementan esto. */
export interface Animation {
  update(dt: number): boolean;
}

/** Corre varias animaciones como si fueran una — usado cuando una
 * variante combina, por ejemplo, un tween de escala + una ráfaga de
 * chispas al mismo tiempo. */
export function combine(...anims: Animation[]): Animation {
  return {
    update(dt) {
      let anyAlive = false;
      for (const a of anims) {
        if (a.update(dt)) anyAlive = true;
      }
      return anyAlive;
    },
  };
}

/** Encadena animaciones en secuencia — la siguiente empieza cuando la
 * anterior termina. Usado por variantes con fases (ej. mitosis:
 * estirar, luego separar). */
export function sequence(...anims: Animation[]): Animation {
  let i = 0;
  return {
    update(dt) {
      while (i < anims.length) {
        if (anims[i].update(dt)) return true;
        i++;
      }
      return false;
    },
  };
}

/** Tween genérico de un valor 0-1 a lo largo de `duration` segundos,
 * aplicando `easing` y entregando el resultado a `onUpdate` cada
 * cuadro. `onDone` corre una sola vez al terminar. */
export function tween(
  duration: number,
  easing: (t: number) => number,
  onUpdate: (eased: number, linear: number) => void,
  onDone?: () => void,
): Animation {
  let elapsed = 0;
  let done = false;
  return {
    update(dt) {
      if (done) return false;
      elapsed += dt;
      const linear = Math.min(elapsed / duration, 1);
      onUpdate(easing(linear), linear);
      if (linear >= 1) {
        done = true;
        onDone?.();
        return false;
      }
      return true;
    },
  };
}

/** Espera `seconds` sin hacer nada — para escalonar fases dentro de un
 * `sequence()` sin acoplar el timing al propio tween anterior. */
export function wait(seconds: number, onDone?: () => void): Animation {
  let elapsed = 0;
  return {
    update(dt) {
      elapsed += dt;
      if (elapsed >= seconds) {
        onDone?.();
        return false;
      }
      return true;
    },
  };
}

function disposeMesh(mesh: THREE.Object3D) {
  mesh.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
    }
  });
}

const SPARK_GEOMETRY = new THREE.SphereGeometry(0.028, 8, 8);
const SHATTER_GEOMETRY = new THREE.TetrahedronGeometry(0.05);

/** Ráfaga de chispas saliendo del centro en direcciones aleatorias,
 * encogiéndose y apagándose — usada por variantes de división/muerte
 * con sabor "energético" (fisión, explosión controlada, combustión). */
export function spawnSparkBurst(
  scene: THREE.Object3D,
  position: THREE.Vector3,
  color: number,
  count: number,
  speed: number,
  duration: number,
): Animation {
  const group = new THREE.Group();
  group.position.copy(position);
  const sparks: { mesh: THREE.Mesh; dir: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(SPARK_GEOMETRY, mat);
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    mesh.position.set(0, 0, 0);
    group.add(mesh);
    sparks.push({ mesh, dir });
  }
  scene.add(group);

  return tween(
    duration,
    (t) => t,
    (_eased, linear) => {
      const dist = linear * speed;
      const fade = 1 - linear;
      for (const s of sparks) {
        s.mesh.position.copy(s.dir).multiplyScalar(dist);
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
        s.mesh.scale.setScalar(fade);
      }
    },
    () => {
      scene.remove(group);
      disposeMesh(group);
    },
  );
}

/** Anillo de luz que se expande desde `position` hasta `maxRadius`
 * mientras se apaga — usado por nacimiento (anillo expansivo) y por
 * uniones/divisiones que quieren marcar el punto de contacto. */
export function spawnExpandingRing(
  scene: THREE.Object3D,
  position: THREE.Vector3,
  color: number,
  maxRadius: number,
  duration: number,
  normal?: THREE.Vector3,
): Animation {
  const geometry = new THREE.RingGeometry(0.001, 0.02, 32);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  if (normal) mesh.lookAt(position.clone().add(normal));
  scene.add(mesh);

  return tween(
    duration,
    (t) => t,
    (_eased, linear) => {
      const r = 0.02 + linear * maxRadius;
      mesh.scale.setScalar(r / 0.02);
      material.opacity = 0.85 * (1 - linear);
    },
    () => {
      scene.remove(mesh);
      disposeMesh(mesh);
    },
  );
}

/** Motas pequeñas que convergen desde un radio de partida hacia
 * `target` (nacimiento: condensación/enjambre) o divergen desde
 * `target` hacia afuera si `direction==="out"` (división: enjambre).
 * `onArrive` corre cuando cada mota individual llega/sale, no al
 * final del conjunto. */
export function spawnMotes(
  scene: THREE.Object3D,
  target: THREE.Vector3,
  color: number,
  count: number,
  radius: number,
  duration: number,
  direction: "in" | "out" = "in",
): Animation {
  const group = new THREE.Group();
  scene.add(group);
  const motes: { mesh: THREE.Mesh; start: THREE.Vector3; end: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const offset = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(radius * (0.6 + Math.random() * 0.4));
    const scattered = target.clone().add(offset);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(SPARK_GEOMETRY, mat);
    scene.add(mesh);
    if (direction === "in") {
      mesh.position.copy(scattered);
      motes.push({ mesh, start: scattered, end: target });
    } else {
      mesh.position.copy(target);
      motes.push({ mesh, start: target, end: scattered });
    }
  }

  return tween(
    duration,
    (t) => t,
    (eased) => {
      for (const m of motes) {
        m.mesh.position.lerpVectors(m.start, m.end, eased);
        const opacity = direction === "in" ? Math.min(eased * 2, 1) * (1 - eased) + eased : 1 - eased * 0.3;
        (m.mesh.material as THREE.MeshBasicMaterial).opacity = direction === "in" ? Math.sin(eased * Math.PI) : 1 - eased;
        void opacity;
      }
    },
    () => {
      for (const m of motes) {
        scene.remove(m.mesh);
        disposeMesh(m.mesh);
      }
      scene.remove(group);
    },
  );
}

/** Destello puntual breve y brillante (pico de bloom) — usado por
 * nacimiento (estallido de energía), muerte (combustión) y como
 * acento en el punto de ruptura/contacto de divisiones/uniones. */
export function spawnFlash(scene: THREE.Object3D, position: THREE.Vector3, color: number, duration: number, maxScale = 0.5): Animation {
  const geometry = new THREE.SphereGeometry(0.08, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);

  return tween(
    duration,
    (t) => t,
    (_eased, linear) => {
      const growPhase = Math.min(linear * 4, 1);
      const scale = growPhase * maxScale;
      mesh.scale.setScalar(Math.max(scale, 0.001));
      material.opacity = 1 - linear;
    },
    () => {
      scene.remove(mesh);
      disposeMesh(mesh);
    },
  );
}

/** Fragmentos angulares despedidos con rotación — muerte
 * (fragmentación/cristal). */
export function spawnShatter(scene: THREE.Object3D, position: THREE.Vector3, color: number, count: number, speed: number, duration: number): Animation {
  const group = new THREE.Group();
  const pieces: { mesh: THREE.Mesh; dir: THREE.Vector3; spin: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(SHATTER_GEOMETRY, mat);
    mesh.position.copy(position);
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(6);
    group.add(mesh);
    pieces.push({ mesh, dir, spin });
  }
  scene.add(group);

  return tween(
    duration,
    (t) => t,
    (_eased, linear) => {
      const dist = linear * speed;
      for (const p of pieces) {
        p.mesh.position.copy(position).addScaledVector(p.dir, dist);
        p.mesh.rotation.x += p.spin.x * 0.016;
        p.mesh.rotation.y += p.spin.y * 0.016;
        p.mesh.rotation.z += p.spin.z * 0.016;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - linear);
      }
    },
    () => {
      scene.remove(group);
      disposeMesh(group);
    },
  );
}
