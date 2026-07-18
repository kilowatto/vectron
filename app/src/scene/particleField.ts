import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  color,
  dot,
  float,
  normalView,
  positionViewDirection,
  pow,
  sin,
  time,
  uniform,
  vec3,
} from "three/tsl";

/**
 * Placeholder categorical domains — stand-ins for the real taxonomy
 * (§04 of the plan) until real embeddings land in Fase 2.
 */
const DOMAINS = [
  { name: "matemáticas", hue: 0x4fb8c4 },
  { name: "biología", hue: 0x6fbe8c },
  { name: "geografía", hue: 0xd98a34 },
  { name: "programación", hue: 0xc94f6d },
  { name: "astronomía", hue: 0x8f7fe0 },
  { name: "materiales", hue: 0xd9c24f },
] as const;

export interface ParticleField {
  mesh: THREE.InstancedMesh;
  group: THREE.Group;
  count: number;
}

/**
 * Builds a placeholder cloud of glowing instanced spheres inside the
 * "cubo oscuro flotante" volume, colored by a stand-in categorical domain.
 * Real word/embedding data replaces this generator in Fase 1.
 */
export function createParticleField(count: number): ParticleField {
  const geometry = new THREE.IcosahedronGeometry(0.03, 1);
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const colorAttr = new Float32Array(count * 3);
  const phaseAttr = new Float32Array(count);
  const tmpColor = new THREE.Color();

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const half = 1.3;

  for (let i = 0; i < count; i++) {
    const domain = DOMAINS[i % DOMAINS.length];
    tmpColor.setHex(domain.hue);
    tmpColor.toArray(colorAttr, i * 3);
    phaseAttr[i] = Math.random() * Math.PI * 2;

    dummy.position.set(
      (Math.random() * 2 - 1) * half,
      (Math.random() * 2 - 1) * half,
      (Math.random() * 2 - 1) * half,
    );
    const s = 0.6 + Math.random() * 0.9;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  geometry.setAttribute(
    "instanceColor",
    new THREE.InstancedBufferAttribute(colorAttr, 3),
  );
  geometry.setAttribute(
    "instancePhase",
    new THREE.InstancedBufferAttribute(phaseAttr, 1),
  );

  const glowStrength = uniform(0.75);
  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  const instancePhase = attribute<"float">("instancePhase", "float");

  const pulse = float(0.75).add(
    float(0.16).mul(sin(time.mul(1.6).add(instancePhase))),
  );

  const rim = pow(
    float(1.0).sub(dot(normalView, positionViewDirection).abs()),
    float(2.2),
  );

  material.colorNode = Fn(() => {
    const base = color(instanceColor);
    const glow = base.mul(float(0.22).add(rim.mul(glowStrength)));
    return vec3(glow).mul(pulse);
  })();

  mesh.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);

  return { mesh, group, count };
}

export function spinField(field: ParticleField, dt: number): void {
  field.group.rotation.y += dt * 0.035;
  field.group.rotation.x = Math.sin(performance.now() * 0.00006) * 0.08;
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
