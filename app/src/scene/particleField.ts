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
import type { Concept } from "../data/concepts";

/** Codificación por capas §04 del plan: un tono por dominio raíz. */
export const DOMAIN_HUES: Record<string, number> = {
  matematicas: 0x4fb8c4,
  fisica: 0x8f7fe0,
  programacion: 0xc94f6d,
  biologia_animal: 0x6fbe8c,
  biologia_vegetal: 0xb7d444,
  materiales: 0xd9c24f,
  geografia: 0xd98a34,
  astronomia: 0x5f7fd9,
  sociedad: 0xd9598a,
};

const FALLBACK_HUE = 0x9aa5ad;

export interface ParticleField {
  mesh: THREE.InstancedMesh;
  group: THREE.Group;
  count: number;
  concepts: Concept[];
  setPointerHighlight: (instanceId: number | null) => void;
  setSearchHighlights: (instanceIds: number[]) => void;
  setSimilarityLines: (
    sourceInstanceId: number | null,
    neighborInstanceIds: number[],
  ) => void;
}

/**
 * Builds the glowing instanced-sphere cloud from real concept data:
 * position = coordenadas reducidas del embedding real (PCA→3D),
 * color = tono categórico del dominio (§04).
 */
export function createParticleField(concepts: Concept[]): ParticleField {
  const count = concepts.length;
  const geometry = new THREE.IcosahedronGeometry(0.032, 1);
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

  concepts.forEach((concept, i) => {
    const hue = DOMAIN_HUES[concept.domain] ?? FALLBACK_HUE;
    tmpColor.setHex(hue);
    tmpColor.toArray(colorAttr, i * 3);
    phaseAttr[i] = Math.random() * Math.PI * 2;

    dummy.position.set(concept.coords[0], concept.coords[1], concept.coords[2]);
    const s = concept.distinctiveTrait ? 1.25 : 0.85;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });

  const highlightAttrArray = new Float32Array(count);
  const highlightAttribute = new THREE.InstancedBufferAttribute(
    highlightAttrArray,
    1,
  );

  geometry.setAttribute(
    "instanceColor",
    new THREE.InstancedBufferAttribute(colorAttr, 3),
  );
  geometry.setAttribute(
    "instancePhase",
    new THREE.InstancedBufferAttribute(phaseAttr, 1),
  );
  geometry.setAttribute("instanceHighlight", highlightAttribute);

  const glowStrength = uniform(0.75);
  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  const instancePhase = attribute<"float">("instancePhase", "float");
  const instanceHighlight = attribute<"float">("instanceHighlight", "float");

  const pulse = float(0.75).add(
    float(0.16).mul(sin(time.mul(1.6).add(instancePhase))),
  );

  const rim = pow(
    float(1.0).sub(dot(normalView, positionViewDirection).abs()),
    float(2.2),
  );

  material.colorNode = Fn(() => {
    const base = color(instanceColor);
    const glow = base.mul(
      float(0.22).add(rim.mul(glowStrength)).add(instanceHighlight),
    );
    return vec3(glow).mul(pulse);
  })();

  mesh.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);

  let pointerId: number | null = null;
  let searchIds: number[] = [];

  function recomputeHighlights() {
    highlightAttrArray.fill(0);
    for (const id of searchIds) highlightAttrArray[id] = 0.55;
    if (pointerId !== null) highlightAttrArray[pointerId] = 1.1;
    highlightAttribute.needsUpdate = true;
  }

  function setPointerHighlight(instanceId: number | null) {
    pointerId = instanceId;
    recomputeHighlights();
  }

  function setSearchHighlights(instanceIds: number[]) {
    searchIds = instanceIds;
    recomputeHighlights();
  }

  let lines: THREE.LineSegments | null = null;
  function setSimilarityLines(
    sourceInstanceId: number | null,
    neighborInstanceIds: number[],
  ) {
    if (lines) {
      group.remove(lines);
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
      lines = null;
    }
    if (sourceInstanceId === null || neighborInstanceIds.length === 0) return;

    const src = concepts[sourceInstanceId].coords;
    const positions: number[] = [];
    for (const neighborId of neighborInstanceIds) {
      const dst = concepts[neighborId].coords;
      positions.push(src[0], src[1], src[2], dst[0], dst[1], dst[2]);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xd98a34,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    lines = new THREE.LineSegments(geom, mat);
    group.add(lines);
  }

  return {
    mesh,
    group,
    count,
    concepts,
    setPointerHighlight,
    setSearchHighlights,
    setSimilarityLines,
  };
}

export function spinField(field: ParticleField, dt: number): void {
  field.group.rotation.y += dt * 0.035;
  field.group.rotation.x = Math.sin(performance.now() * 0.00006) * 0.08;
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
