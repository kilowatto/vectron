import * as THREE from "three/webgpu";

/** A diferencia de los efectos transitorios de effects.ts, un
 * conector vive mientras el usuario lo tenga activado — se conecta a
 * 2 partículas y se redibuja cada cuadro siguiendo su posición actual
 * (las partículas pueden estar animándose). */
export interface Connector {
  update(dt: number, a: THREE.Vector3, b: THREE.Vector3): void;
  dispose(scene: THREE.Object3D): void;
}

const SEGMENTS = 24;

function makeLineGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3));
  return geometry;
}

function setPositions(geometry: THREE.BufferGeometry, points: THREE.Vector3[]) {
  const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < points.length; i++) {
    attr.setXYZ(i, points[i].x, points[i].y, points[i].z);
  }
  attr.needsUpdate = true;
  geometry.setDrawRange(0, points.length);
}

/** Rayo: recta con quiebres aleatorios tipo relámpago, regenerados
 * cada ~80ms, brillo pulsante. */
function createRayo(scene: THREE.Object3D, color: number): Connector {
  const geometry = makeLineGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  let regenTimer = 0;
  let t = 0;
  return {
    update(dt, a, b) {
      t += dt;
      regenTimer -= dt;
      if (regenTimer <= 0) {
        regenTimer = 0.08;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
          const f = i / SEGMENTS;
          const p = new THREE.Vector3().lerpVectors(a, b, f);
          if (i > 0 && i < SEGMENTS) {
            const jitter = (Math.random() - 0.5) * 0.06;
            p.x += jitter;
            p.y += jitter * 0.7;
          }
          pts.push(p);
        }
        setPositions(geometry, pts);
      }
      material.opacity = 0.6 + Math.sin(t * 18) * 0.35;
    },
    dispose(s) {
      s.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Sinapsis: línea tenue base + un pulso brillante que viaja de A a B
 * en bucle, como un impulso nervioso. */
function createSinapsis(scene: THREE.Object3D, color: number): Connector {
  const geometry = makeLineGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 });
  const line = new THREE.Line(geometry, material);
  const pulseGeo = new THREE.SphereGeometry(0.05, 12, 12);
  const pulseMat = new THREE.MeshBasicMaterial({ color });
  const pulse = new THREE.Mesh(pulseGeo, pulseMat);
  scene.add(line, pulse);
  let t = 0;
  return {
    update(dt, a, b) {
      t += dt;
      setPositions(geometry, [a, b]);
      const f = (t * 0.8) % 1;
      pulse.position.lerpVectors(a, b, f);
      pulse.scale.setScalar(0.6 + Math.sin(f * Math.PI) * 0.6);
    },
    dispose(s) {
      s.remove(line, pulse);
      geometry.dispose();
      material.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
    },
  };
}

/** Hilo colgante: curva catenaria (como cuerda con gravedad) en vez de
 * recta, con leve balanceo sinusoidal. */
function createHiloColgante(scene: THREE.Object3D, color: number): Connector {
  const geometry = makeLineGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  let t = 0;
  return {
    update(dt, a, b) {
      t += dt;
      const dist = a.distanceTo(b);
      const sag = Math.min(dist * 0.25, 0.4) + Math.sin(t * 1.3) * 0.02;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const f = i / SEGMENTS;
        const p = new THREE.Vector3().lerpVectors(a, b, f);
        p.y -= Math.sin(f * Math.PI) * sag;
        pts.push(p);
      }
      setPositions(geometry, pts);
    },
    dispose(s) {
      s.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Arco eléctrico/plasma: varios filamentos delgados parpadeando
 * erráticamente entre los 2 puntos, tipo escalera de Jacob. */
function createArcoElectrico(scene: THREE.Object3D, color: number): Connector {
  const strandCount = 3;
  const strands: { geometry: THREE.BufferGeometry; line: THREE.Line }[] = [];
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
  for (let i = 0; i < strandCount; i++) {
    const geometry = makeLineGeometry();
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    strands.push({ geometry, line });
  }
  let regenTimer = 0;
  return {
    update(dt, a, b) {
      regenTimer -= dt;
      if (regenTimer > 0) return;
      regenTimer = 0.045;
      for (const strand of strands) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
          const f = i / SEGMENTS;
          const p = new THREE.Vector3().lerpVectors(a, b, f);
          if (i > 0 && i < SEGMENTS) {
            p.x += (Math.random() - 0.5) * 0.1;
            p.y += (Math.random() - 0.5) * 0.1;
            p.z += (Math.random() - 0.5) * 0.1;
          }
          pts.push(p);
        }
        setPositions(strand.geometry, pts);
      }
    },
    dispose(s) {
      for (const strand of strands) {
        s.remove(strand.line);
        strand.geometry.dispose();
      }
      material.dispose();
    },
  };
}

/** Filamento de luz: tubo/línea suave y constante, sin pulso — más
 * "fibra óptica elegante" que las demás. */
function createFilamento(scene: THREE.Object3D, color: number): Connector {
  const geometry = makeLineGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75, linewidth: 2 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  let t = 0;
  return {
    update(dt, a, b) {
      t += dt;
      setPositions(geometry, [a, b]);
      material.opacity = 0.65 + Math.sin(t * 1.5) * 0.1;
    },
    dispose(s) {
      s.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Cadena de partículas: puntitos de luz viajando en fila por el
 * trayecto, en vez de una línea continua. */
function createCadenaDePuntos(scene: THREE.Object3D, color: number): Connector {
  const dotCount = 8;
  const geometry = new THREE.SphereGeometry(0.025, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true });
  const dots = Array.from({ length: dotCount }, () => {
    const mesh = new THREE.Mesh(geometry, material.clone());
    scene.add(mesh);
    return mesh;
  });
  let t = 0;
  return {
    update(dt, a, b) {
      t += dt;
      dots.forEach((dot, i) => {
        const f = (t * 0.6 + i / dotCount) % 1;
        dot.position.lerpVectors(a, b, f);
        (dot.material as THREE.MeshBasicMaterial).opacity = Math.sin(f * Math.PI);
      });
    },
    dispose(s) {
      dots.forEach((d) => {
        s.remove(d);
        (d.material as THREE.Material).dispose();
      });
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Cinta ondulante: línea delgada que ondula suavemente perpendicular
 * a su trayecto, como flotando en una corriente. */
function createCintaOndulante(scene: THREE.Object3D, color: number): Connector {
  const geometry = makeLineGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  let t = 0;
  return {
    update(dt, a, b) {
      t += dt;
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, dir.z).normalize();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const f = i / SEGMENTS;
        const p = new THREE.Vector3().lerpVectors(a, b, f);
        const wave = Math.sin(f * Math.PI * 3 + t * 2.5) * 0.05 * Math.sin(f * Math.PI);
        p.addScaledVector(perp, wave);
        pts.push(p);
      }
      setPositions(geometry, pts);
    },
    dispose(s) {
      s.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}

export const CONNECTOR_STYLES: Record<string, { label: string; create: (scene: THREE.Object3D, color: number) => Connector }> = {
  rayo: { label: "Rayo", create: createRayo },
  sinapsis: { label: "Sinapsis", create: createSinapsis },
  hilo: { label: "Hilo colgante", create: createHiloColgante },
  electrico: { label: "Arco eléctrico", create: createArcoElectrico },
  filamento: { label: "Filamento de luz", create: createFilamento },
  cadena: { label: "Cadena de partículas", create: createCadenaDePuntos },
  cinta: { label: "Cinta ondulante", create: createCintaOndulante },
};
